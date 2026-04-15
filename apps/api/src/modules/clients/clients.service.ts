import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { parsePagination, paginatedResponse } from '../../common/utils/pagination';

interface ListClientsQuery {
  page?: string;
  limit?: string;
  status?: string;
  coachId?: string;
  search?: string;
  needsAttention?: string;
  sort?: string;
  order?: string;
}

@Injectable()
export class ClientsService {
  constructor(private firebase: FirebaseService) {}

  async listClients(orgId: string, query: ListClientsQuery, requestingCoachId?: string) {
    const { page, limit, skip } = parsePagination(query);

    // Get client assignments for this org
    let assignQuery = this.firebase.clientAssignments(orgId).where('status', '==', 'ACTIVE');

    // Filter by coach if specified or if requesting coach
    const coachFilter = query.coachId || requestingCoachId;
    if (coachFilter) {
      assignQuery = assignQuery.where('coachId', '==', coachFilter);
    }

    const assignSnap = await assignQuery.get();
    const clientUserIds = [...new Set(assignSnap.docs.map(d => d.data().clientUserId as string))];

    if (clientUserIds.length === 0) {
      return paginatedResponse([], 0, { page, limit, skip });
    }

    // Fetch user docs for these clients (Firestore 'in' supports max 30)
    const allClients: Array<Record<string, unknown>> = [];
    const chunks = [];
    for (let i = 0; i < clientUserIds.length; i += 30) {
      chunks.push(clientUserIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const snap = await this.firebase.users().where('__name__', 'in', chunk).get();
      for (const doc of snap.docs) {
        const u = doc.data();
        const cp = u.clientProfile;
        if (!cp) continue;

        // Status filter
        if (query.status && cp.status !== query.status) continue;

        // Search filter (case-insensitive)
        if (query.search) {
          const s = query.search.toLowerCase();
          const match =
            (u.firstName || '').toLowerCase().includes(s) ||
            (u.lastName || '').toLowerCase().includes(s) ||
            (u.email || '').toLowerCase().includes(s);
          if (!match) continue;
        }

        // Build assignment info for this client
        const clientAssigns = assignSnap.docs
          .filter(a => a.data().clientUserId === doc.id)
          .map(a => {
            const ad = a.data();
            return { coachId: ad.coachId, coachName: ad.coachName || '' };
          });

        allClients.push({
          id: cp.id || doc.id,
          status: cp.status,
          createdAt: cp.createdAt || u.createdAt,
          user: {
            id: doc.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            avatarUrl: u.avatarUrl,
            lastLoginAt: u.lastLoginAt,
          },
          assignments: clientAssigns.map(a => ({
            coach: { id: a.coachId, user: { firstName: a.coachName.split(' ')[0] || '', lastName: a.coachName.split(' ')[1] || '' } },
          })),
          complianceSummaries: [],
        });
      }
    }

    // Sort
    allClients.sort((a, b) => {
      if (query.sort === 'name') {
        const na = ((a.user as Record<string, unknown>).firstName as string) || '';
        const nb = ((b.user as Record<string, unknown>).firstName as string) || '';
        return query.order === 'desc' ? nb.localeCompare(na) : na.localeCompare(nb);
      }
      const da = (a.createdAt as string) || '';
      const db = (b.createdAt as string) || '';
      return query.order === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
    });

    const total = allClients.length;
    const paged = allClients.slice(skip, skip + limit);

    return paginatedResponse(paged, total, { page, limit, skip });
  }

  async getClient(clientId: string, orgId: string) {
    // clientId here is the user ID
    const doc = await this.firebase.users().doc(clientId).get();
    if (!doc.exists) throw new NotFoundException('Client not found');

    const u = doc.data()!;
    const cp = u.clientProfile;
    if (!cp) throw new NotFoundException('Client not found');

    // Verify org membership
    const inOrg = (u.orgs || []).some((o: { orgId: string }) => o.orgId === orgId);
    if (!inOrg) throw new NotFoundException('Client not found');

    // Get assignments
    const assignSnap = await this.firebase
      .clientAssignments(orgId)
      .where('clientUserId', '==', clientId)
      .where('status', '==', 'ACTIVE')
      .get();

    const assignments = assignSnap.docs.map(a => {
      const ad = a.data();
      return {
        id: a.id,
        coach: { id: ad.coachId, user: { firstName: ad.coachName?.split(' ')[0] || '', lastName: ad.coachName?.split(' ')[1] || '' } },
      };
    });

    return {
      id: cp.id || clientId,
      status: cp.status,
      dob: cp.dob,
      heightCm: cp.heightCm,
      goals: cp.goals,
      medicalNotes: cp.medicalNotes,
      createdAt: cp.createdAt || u.createdAt,
      user: {
        id: doc.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarUrl: u.avatarUrl,
        phone: u.phone,
        lastLoginAt: u.lastLoginAt,
      },
      assignments,
      complianceSummaries: [],
    };
  }

  async updateClient(
    clientId: string,
    orgId: string,
    data: {
      status?: string;
      goals?: string;
      dob?: string;
      heightCm?: number;
      medicalNotes?: string;
    },
  ) {
    const doc = await this.firebase.users().doc(clientId).get();
    if (!doc.exists) throw new NotFoundException('Client not found');

    const u = doc.data()!;
    const cp = u.clientProfile;
    if (!cp) throw new NotFoundException('Client not found');

    const inOrg = (u.orgs || []).some((o: { orgId: string }) => o.orgId === orgId);
    if (!inOrg) throw new NotFoundException('Client not found');

    // Validate status transitions
    if (data.status) {
      const validTransitions: Record<string, string[]> = {
        ACTIVE: ['PAUSED', 'ARCHIVED'],
        PAUSED: ['ACTIVE', 'ARCHIVED'],
        ARCHIVED: ['ACTIVE'],
      };
      if (!validTransitions[cp.status]?.includes(data.status)) {
        throw new BadRequestException(
          `Cannot transition from ${cp.status} to ${data.status}`,
        );
      }
    }

    const updatedProfile = {
      ...cp,
      ...(data.status && { status: data.status }),
      ...(data.goals !== undefined && { goals: data.goals }),
      ...(data.dob && { dob: data.dob }),
      ...(data.heightCm !== undefined && { heightCm: data.heightCm }),
      ...(data.medicalNotes !== undefined && { medicalNotes: data.medicalNotes }),
      ...(data.status === 'ARCHIVED' && { archivedAt: new Date().toISOString() }),
      updatedAt: new Date().toISOString(),
    };

    await this.firebase.users().doc(clientId).update({ clientProfile: updatedProfile });

    return {
      id: cp.id || clientId,
      status: updatedProfile.status,
      goals: updatedProfile.goals,
      dob: updatedProfile.dob,
      heightCm: updatedProfile.heightCm,
    };
  }

  async deleteClient(clientId: string, orgId: string) {
    const doc = await this.firebase.users().doc(clientId).get();
    if (!doc.exists) throw new NotFoundException('Client not found');

    const u = doc.data()!;
    const cp = u.clientProfile;
    if (!cp) throw new NotFoundException('Client not found');

    const inOrg = (u.orgs || []).some((o: { orgId: string }) => o.orgId === orgId);
    if (!inOrg) throw new NotFoundException('Client not found');

    const batch = this.firebase.batch();

    // Archive the client profile
    batch.update(this.firebase.users().doc(clientId), {
      'clientProfile.status': 'ARCHIVED',
      'clientProfile.archivedAt': new Date().toISOString(),
    });

    // End all active assignments
    const assignSnap = await this.firebase
      .clientAssignments(orgId)
      .where('clientUserId', '==', clientId)
      .where('status', '==', 'ACTIVE')
      .get();

    for (const aDoc of assignSnap.docs) {
      batch.update(aDoc.ref, {
        status: 'ENDED',
        endAt: new Date().toISOString(),
      });
    }

    await batch.commit();
  }
}
