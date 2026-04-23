import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type AssignTrainingGroupProgramInput,
  type CreateTrainingGroupInput,
  type UpdateTrainingGroupInput,
} from '@coaching/shared';
import { FirebaseService } from '../firebase/firebase.service';
import { ProgramsService } from '../programs/programs.service';
import { parsePagination, paginatedResponse } from '../../common/utils/pagination';

interface CoachSummary {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

interface MemberSummary {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  status: string;
}

interface TrainingGroupDoc {
  orgId: string;
  name: string;
  description?: string | null;
  coachId: string;
  coachUserId: string;
  coachName: string;
  memberClientUserIds: string[];
  activeProgramId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class TrainingGroupsService {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly programs: ProgramsService,
  ) {}

  async listGroups(
    orgId: string,
    query: { page?: string; limit?: string; search?: string; coachId?: string },
    role: string,
    coachProfileId?: string,
  ) {
    const pagination = parsePagination(query);
    const snap = await this.firebase.trainingGroups(orgId).get();

    let groups = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as TrainingGroupDoc) }));
    if (role === 'COACH') {
      groups = groups.filter((group) => group.coachId === coachProfileId);
    }
    if (query.coachId) {
      groups = groups.filter((group) => group.coachId === query.coachId);
    }
    if (query.search) {
      const search = query.search.toLowerCase();
      groups = groups.filter((group) => {
        return (
          group.name.toLowerCase().includes(search) ||
          (group.description ?? '').toLowerCase().includes(search) ||
          group.coachName.toLowerCase().includes(search)
        );
      });
    }

    groups.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));

    const total = groups.length;
    const items = groups.slice(pagination.skip, pagination.skip + pagination.limit).map((group) => ({
      ...group,
      memberCount: group.memberClientUserIds.length,
    }));

    return paginatedResponse(items, total, pagination);
  }

  async getGroup(id: string, orgId: string, role: string, coachProfileId?: string) {
    const doc = await this.firebase.trainingGroups(orgId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Training group not found');

    const group = doc.data() as TrainingGroupDoc;
    if (role === 'COACH' && group.coachId !== coachProfileId) {
      throw new ForbiddenException('You do not have access to this training group');
    }

    const coach = await this.resolveCoach(orgId, group.coachId);
    const members = await this.resolveMembers(orgId, group.memberClientUserIds);

    return {
      id: doc.id,
      ...group,
      coach,
      members,
      memberCount: members.length,
    };
  }

  async createGroup(orgId: string, actorUserId: string, input: CreateTrainingGroupInput) {
    const coach = await this.resolveCoach(orgId, input.coachId);
    const memberClientUserIds = [...new Set(input.memberClientUserIds ?? [])];
    await this.assertClientsBelongToOrg(orgId, memberClientUserIds);

    const id = this.firebase.generateId();
    const now = new Date().toISOString();
    const data: TrainingGroupDoc = {
      orgId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      coachId: coach.id,
      coachUserId: coach.userId,
      coachName: `${coach.firstName} ${coach.lastName}`.trim(),
      memberClientUserIds,
      activeProgramId: null,
      createdBy: actorUserId,
      createdAt: now,
      updatedAt: now,
    };

    await this.firebase.trainingGroups(orgId).doc(id).set(data);
    await this.ensureCoachAssignments(orgId, actorUserId, coach, memberClientUserIds);

    return this.getGroup(id, orgId, 'OWNER');
  }

  async updateGroup(
    id: string,
    orgId: string,
    actorUserId: string,
    input: UpdateTrainingGroupInput,
  ) {
    const ref = this.firebase.trainingGroups(orgId).doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('Training group not found');

    const current = doc.data() as TrainingGroupDoc;
    const update: Partial<TrainingGroupDoc> = {
      updatedAt: new Date().toISOString(),
    };

    let nextCoach: CoachSummary | null = null;
    if (input.name !== undefined) update.name = input.name.trim();
    if (input.description !== undefined) update.description = input.description?.trim() || null;
    if (input.coachId) {
      nextCoach = await this.resolveCoach(orgId, input.coachId);
      update.coachId = nextCoach.id;
      update.coachUserId = nextCoach.userId;
      update.coachName = `${nextCoach.firstName} ${nextCoach.lastName}`.trim();
    }

    await ref.update(update);
    if (nextCoach) {
      await this.ensureCoachAssignments(orgId, actorUserId, nextCoach, current.memberClientUserIds);
    }

    return this.getGroup(id, orgId, 'OWNER');
  }

  async addMembers(id: string, orgId: string, actorUserId: string, clientUserIds: string[]) {
    const ref = this.firebase.trainingGroups(orgId).doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('Training group not found');

    const current = doc.data() as TrainingGroupDoc;
    const additions = [...new Set(clientUserIds.filter(Boolean))];
    await this.assertClientsBelongToOrg(orgId, additions);

    const memberClientUserIds = [...new Set([...current.memberClientUserIds, ...additions])];
    await ref.update({
      memberClientUserIds,
      updatedAt: new Date().toISOString(),
    });

    const coach = await this.resolveCoach(orgId, current.coachId);
    await this.ensureCoachAssignments(orgId, actorUserId, coach, additions);

    return this.getGroup(id, orgId, 'OWNER');
  }

  async removeMember(id: string, orgId: string, actorUserId: string, clientUserId: string) {
    const ref = this.firebase.trainingGroups(orgId).doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('Training group not found');

    const current = doc.data() as TrainingGroupDoc;
    const memberClientUserIds = current.memberClientUserIds.filter((memberId) => memberId !== clientUserId);
    if (memberClientUserIds.length === current.memberClientUserIds.length) {
      throw new NotFoundException('Client is not a member of this training group');
    }

    await ref.update({
      memberClientUserIds,
      updatedAt: new Date().toISOString(),
      lastMemberRemovedBy: actorUserId,
    });

    return this.getGroup(id, orgId, 'OWNER');
  }

  async assignProgram(
    id: string,
    orgId: string,
    actorUserId: string,
    role: string,
    coachProfileId: string | undefined,
    input: AssignTrainingGroupProgramInput,
  ) {
    const ref = this.firebase.trainingGroups(orgId).doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('Training group not found');

    const group = doc.data() as TrainingGroupDoc;
    if (role === 'COACH' && group.coachId !== coachProfileId) {
      throw new ForbiddenException('You do not have access to assign this group');
    }
    if (group.memberClientUserIds.length === 0) {
      throw new BadRequestException('Training group has no members');
    }

    const result = await this.programs.assignProgramToClients(
      input.programId,
      orgId,
      actorUserId,
      {
        clientIds: group.memberClientUserIds,
        startDate: input.startDate,
      },
    );

    await ref.update({
      activeProgramId: input.programId,
      updatedAt: new Date().toISOString(),
    });

    return {
      groupId: id,
      ...result,
    };
  }

  async deleteGroup(id: string, orgId: string) {
    const ref = this.firebase.trainingGroups(orgId).doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('Training group not found');
    await ref.delete();
  }

  private async resolveCoach(orgId: string, coachIdOrUserId: string): Promise<CoachSummary> {
    const coachSnap = await this.firebase.users().where('coachProfile.orgId', '==', orgId).get();
    const coachDoc = coachSnap.docs.find((doc) => {
      const coachProfile = doc.data().coachProfile;
      return coachProfile && (coachProfile.id === coachIdOrUserId || doc.id === coachIdOrUserId);
    });

    if (!coachDoc) throw new BadRequestException('Coach not found in organization');

    const data = coachDoc.data();
    const coachProfile = data.coachProfile;
    const membership = ((data.orgs as Array<{ orgId: string; role: string }>) || []).find(
      (entry) => entry.orgId === orgId,
    );

    return {
      id: coachProfile.id || coachDoc.id,
      userId: coachDoc.id,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      email: data.email ?? '',
      avatarUrl: data.avatarUrl ?? null,
      role: membership?.role ?? 'COACH',
    };
  }

  private async resolveMembers(orgId: string, clientUserIds: string[]): Promise<MemberSummary[]> {
    if (clientUserIds.length === 0) return [];

    const members: MemberSummary[] = [];
    for (let index = 0; index < clientUserIds.length; index += 30) {
      const chunk = clientUserIds.slice(index, index + 30);
      const snap = await this.firebase.users().where('__name__', 'in', chunk).get();
      for (const doc of snap.docs) {
        const data = doc.data();
        if (!data.clientProfile) continue;
        const inOrg = ((data.orgs as Array<{ orgId: string }>) || []).some((entry) => entry.orgId === orgId);
        if (!inOrg) continue;
        members.push({
          userId: doc.id,
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          email: data.email ?? '',
          avatarUrl: data.avatarUrl ?? null,
          status: data.clientProfile.status ?? 'ACTIVE',
        });
      }
    }

    const order = new Map(clientUserIds.map((clientUserId, index) => [clientUserId, index]));
    members.sort((a, b) => (order.get(a.userId) ?? 0) - (order.get(b.userId) ?? 0));
    return members;
  }

  private async assertClientsBelongToOrg(orgId: string, clientUserIds: string[]) {
    if (clientUserIds.length === 0) return;

    const resolved = await this.resolveMembers(orgId, clientUserIds);
    const resolvedIds = new Set(resolved.map((member) => member.userId));
    const missing = clientUserIds.filter((clientUserId) => !resolvedIds.has(clientUserId));
    if (missing.length > 0) {
      throw new BadRequestException(`Clients not found in organization: ${missing.join(', ')}`);
    }
  }

  private async ensureCoachAssignments(
    orgId: string,
    actorUserId: string,
    coach: CoachSummary,
    clientUserIds: string[],
  ) {
    if (clientUserIds.length === 0) return;

    for (const clientUserId of clientUserIds) {
      const existingSnap = await this.firebase
        .clientAssignments(orgId)
        .where('clientUserId', '==', clientUserId)
        .where('coachId', '==', coach.id)
        .where('status', '==', 'ACTIVE')
        .get();
      if (!existingSnap.empty) continue;

      const clientDoc = await this.firebase.users().doc(clientUserId).get();
      if (!clientDoc.exists) continue;
      const clientProfile = clientDoc.data()?.clientProfile;
      if (!clientProfile) continue;

      const now = new Date().toISOString();
      await this.firebase.clientAssignments(orgId).doc().set({
        type: 'COACH',
        clientId: clientProfile.id || clientUserId,
        clientUserId,
        coachId: coach.id,
        coachName: `${coach.firstName} ${coach.lastName}`.trim(),
        status: 'ACTIVE',
        startAt: now,
        endAt: null,
        notes: 'Auto-linked from training group membership',
        createdAt: now,
        createdBy: actorUserId,
      });
    }
  }
}