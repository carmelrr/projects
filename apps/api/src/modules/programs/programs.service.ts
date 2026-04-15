import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { parsePagination, paginatedResponse } from '../../common/utils/pagination';

interface CreateProgramInput {
  title: string;
  description?: string;
  isPrivate?: boolean;
  tags?: string[];
  weeks?: { title?: string; notes?: string; workoutIds?: string[] }[];
}

interface AssignProgramInput {
  clientId: string;
  startDate: string;
}

@Injectable()
export class ProgramsService {
  constructor(private firebase: FirebaseService) {}

  async listPrograms(orgId: string, query: { page?: string; limit?: string; search?: string }) {
    const pagination = parsePagination(query);

    const snap = await this.firebase.programs(orgId).orderBy('updatedAt', 'desc').get();

    let programs: Array<Record<string, unknown>> = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (query.search) {
      const s = query.search.toLowerCase();
      programs = programs.filter(p => ((p.title as string) || '').toLowerCase().includes(s));
    }

    const total = programs.length;
    const paged = programs.slice(pagination.skip, pagination.skip + pagination.limit);

    return paginatedResponse(paged, total, pagination);
  }

  async getProgram(id: string, orgId: string) {
    const doc = await this.firebase.programs(orgId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Program not found');
    return { id: doc.id, ...doc.data() };
  }

  async createProgram(orgId: string, createdBy: string, input: CreateProgramInput) {
    const id = this.firebase.generateId();
    const now = new Date().toISOString();

    const weeks = (input.weeks || []).map((week, index) => ({
      id: this.firebase.generateId(),
      weekIndex: index,
      title: week.title || null,
      notes: week.notes || null,
      workoutIds: week.workoutIds || [],
    }));

    const data = {
      orgId,
      title: input.title,
      description: input.description || null,
      isPrivate: input.isPrivate ?? false,
      tags: input.tags ?? [],
      createdBy,
      weeks,
      createdAt: now,
      updatedAt: now,
    };

    await this.firebase.programs(orgId).doc(id).set(data);
    return { id, ...data };
  }

  async updateProgram(id: string, orgId: string, data: Partial<Pick<CreateProgramInput, 'title' | 'description' | 'isPrivate' | 'tags'>>) {
    const doc = await this.firebase.programs(orgId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Program not found');

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (data.title !== undefined) update.title = data.title;
    if (data.description !== undefined) update.description = data.description;
    if (data.isPrivate !== undefined) update.isPrivate = data.isPrivate;
    if (data.tags !== undefined) update.tags = data.tags;

    await this.firebase.programs(orgId).doc(id).update(update);
    return { id, ...doc.data(), ...update };
  }

  async addWeek(programId: string, orgId: string, input: { title?: string; notes?: string }) {
    const doc = await this.firebase.programs(orgId).doc(programId).get();
    if (!doc.exists) throw new NotFoundException('Program not found');

    const program = doc.data()!;
    const weeks = (program.weeks as Array<Record<string, unknown>>) || [];
    const nextIndex = weeks.length > 0 ? Math.max(...weeks.map(w => (w.weekIndex as number) || 0)) + 1 : 0;

    const newWeek = {
      id: this.firebase.generateId(),
      weekIndex: nextIndex,
      title: input.title || null,
      notes: input.notes || null,
      workoutIds: [],
    };

    weeks.push(newWeek);
    await this.firebase.programs(orgId).doc(programId).update({
      weeks,
      updatedAt: new Date().toISOString(),
    });

    return newWeek;
  }

  async assignProgram(programId: string, orgId: string, assignedBy: string, input: AssignProgramInput) {
    const doc = await this.firebase.programs(orgId).doc(programId).get();
    if (!doc.exists) throw new NotFoundException('Program not found');
    const program = doc.data()!;

    // Verify client exists in org
    const clientDoc = await this.firebase.users().doc(input.clientId).get();
    if (!clientDoc.exists) throw new BadRequestException('Client not found in organization');
    const clientData = clientDoc.data()!;
    const inOrg = (clientData.orgs || []).some((o: { orgId: string }) => o.orgId === orgId);
    if (!inOrg || !clientData.clientProfile) throw new BadRequestException('Client not found in organization');

    const startDate = new Date(input.startDate);
    const batch = this.firebase.batch();

    // Create assignment
    const assignId = this.firebase.generateId();
    const assignRef = this.firebase.clientAssignments(orgId).doc(assignId);
    batch.set(assignRef, {
      type: 'PROGRAM',
      programId,
      clientUserId: input.clientId,
      startDate: startDate.toISOString(),
      assignedBy,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    });

    // Create workout instances for each week/workout
    const weeks = (program.weeks as Array<Record<string, unknown>>) || [];
    for (const week of weeks) {
      const workoutIds = (week.workoutIds as string[]) || [];
      for (const workoutId of workoutIds) {
        const instanceId = this.firebase.generateId();
        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(scheduledDate.getDate() + ((week.weekIndex as number) || 0) * 7);

        const instanceRef = this.firebase.workoutInstances(orgId).doc(instanceId);
        batch.set(instanceRef, {
          clientUserId: input.clientId,
          templateId: workoutId,
          scheduledDate: scheduledDate.toISOString(),
          title: '',
          status: 'SCHEDULED',
          programAssignmentId: assignId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await batch.commit();
    return { id: assignId, programId, clientUserId: input.clientId, startDate: startDate.toISOString() };
  }

  async duplicateProgram(id: string, orgId: string, userId: string) {
    const doc = await this.firebase.programs(orgId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Program not found');
    const program = doc.data()!;

    const newId = this.firebase.generateId();
    const now = new Date().toISOString();

    const newWeeks = ((program.weeks as Array<Record<string, unknown>>) || []).map(week => ({
      ...week,
      id: this.firebase.generateId(),
    }));

    const newData = {
      orgId,
      title: `Copy of ${program.title}`,
      description: program.description,
      isPrivate: program.isPrivate,
      tags: program.tags,
      createdBy: userId,
      weeks: newWeeks,
      createdAt: now,
      updatedAt: now,
    };

    await this.firebase.programs(orgId).doc(newId).set(newData);
    return { id: newId, ...newData };
  }

  async deleteProgram(id: string, orgId: string): Promise<void> {
    const doc = await this.firebase.programs(orgId).doc(id).get();
    if (!doc.exists) throw new NotFoundException('Program not found');
    await this.firebase.programs(orgId).doc(id).delete();
  }
}
