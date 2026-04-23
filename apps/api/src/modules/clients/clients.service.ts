import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
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

interface WorkoutInstanceDoc {
  clientUserId: string;
  scheduledDate: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'SKIPPED' | 'MISSED';
}

type CompliancePeriod = 'SEVEN_DAY' | 'THIRTY_DAY' | 'NINETY_DAY';

interface ComplianceSummary {
  period: CompliancePeriod;
  complianceRate: number;
  totalScheduled: number;
  totalCompleted: number;
  needsAttention: boolean;
}

const PERIOD_DAYS: Record<CompliancePeriod, number> = {
  SEVEN_DAY: 7,
  THIRTY_DAY: 30,
  NINETY_DAY: 90,
};

function computeCompliance(
  instances: WorkoutInstanceDoc[],
  now = new Date(),
): ComplianceSummary[] {
  const nowIso = now.toISOString();
  return (Object.keys(PERIOD_DAYS) as CompliancePeriod[]).map((period) => {
    const cutoff = new Date(now.getTime() - PERIOD_DAYS[period] * 86400000).toISOString();
    // Only count instances scheduled in [cutoff, now] — i.e., past-due instances.
    const inWindow = instances.filter(
      (i) => i.scheduledDate >= cutoff && i.scheduledDate <= nowIso,
    );
    const totalScheduled = inWindow.length;
    const totalCompleted = inWindow.filter((i) => i.status === 'COMPLETED').length;
    const complianceRate = totalScheduled === 0 ? 0 : totalCompleted / totalScheduled;
    const needsAttention =
      totalScheduled > 0 &&
      ((period === 'SEVEN_DAY' && complianceRate < 0.5) ||
        (period === 'THIRTY_DAY' && complianceRate < 0.6));
    return { period, complianceRate, totalScheduled, totalCompleted, needsAttention };
  });
}

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(private firebase: FirebaseService) {}

  private async fetchComplianceByClient(
    orgId: string,
    clientUserIds: string[],
    now = new Date(),
  ): Promise<Map<string, ComplianceSummary[]>> {
    if (clientUserIds.length === 0) return new Map();
    const cutoff = new Date(now.getTime() - PERIOD_DAYS.NINETY_DAY * 86400000).toISOString();

    // Firestore `in` supports max 30 values; chunk clientUserIds.
    // NOTE: we do NOT combine `in` with another range filter here because
    // that requires a composite index (clientUserId + scheduledDate).
    // Instead, we filter scheduledDate in-memory — the dataset per coach
    // over 90 days is small.
    const instancesByClient = new Map<string, WorkoutInstanceDoc[]>();
    for (let i = 0; i < clientUserIds.length; i += 30) {
      const chunk = clientUserIds.slice(i, i + 30);
      const snap = await this.firebase
        .workoutInstances(orgId)
        .where('clientUserId', 'in', chunk)
        .get();
      for (const doc of snap.docs) {
        const data = doc.data() as WorkoutInstanceDoc;
        if (!data.clientUserId) continue;
        if (!data.scheduledDate || data.scheduledDate < cutoff) continue;
        const list = instancesByClient.get(data.clientUserId) ?? [];
        list.push(data);
        instancesByClient.set(data.clientUserId, list);
      }
    }

    const result = new Map<string, ComplianceSummary[]>();
    for (const userId of clientUserIds) {
      result.set(userId, computeCompliance(instancesByClient.get(userId) ?? [], now));
    }
    return result;
  }

  async listClients(orgId: string, query: ListClientsQuery, requestingCoachId?: string) {
    if (!orgId) {
      throw new BadRequestException('Missing organization context');
    }

    try {
      return await this.listClientsInner(orgId, query, requestingCoachId);
    } catch (err) {
      // Surface the real cause in server logs — the global filter masks
      // non-HttpException errors as a generic 500.
      this.logger.error(
        `listClients failed for org=${orgId} coach=${requestingCoachId ?? 'ALL'}: ${
          err instanceof Error ? err.message : String(err)
        }`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  private async listClientsInner(
    orgId: string,
    query: ListClientsQuery,
    requestingCoachId?: string,
  ) {
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

    // Compute compliance only for the paged clients (limits reads)
    const pagedUserIds = paged.map((c) => (c.user as Record<string, unknown>).id as string);
    const complianceMap = await this.fetchComplianceByClient(orgId, pagedUserIds);
    for (const client of paged) {
      const uid = (client.user as Record<string, unknown>).id as string;
      client.complianceSummaries = complianceMap.get(uid) ?? [];
    }

    // Optional filter: needsAttention — applied after compliance is computed.
    // Note: this runs after slicing, so needsAttention filtering is best-effort per page.
    let finalItems = paged;
    if (query.needsAttention === 'true') {
      finalItems = paged.filter((c) =>
        ((c.complianceSummaries as ComplianceSummary[]) || []).some((s) => s.needsAttention),
      );
    }

    return paginatedResponse(finalItems, total, { page, limit, skip });
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

    const complianceMap = await this.fetchComplianceByClient(orgId, [clientId]);
    const complianceSummaries = complianceMap.get(clientId) ?? [];

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
      complianceSummaries,
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

  // ─────────── Coach assignments ───────────

  async listAssignments(clientUserId: string, orgId: string) {
    // Verify client belongs to this org
    const clientDoc = await this.firebase.users().doc(clientUserId).get();
    if (!clientDoc.exists) throw new NotFoundException('Client not found');
    const u = clientDoc.data()!;
    if (!u.clientProfile) throw new NotFoundException('Client not found');
    const inOrg = (u.orgs || []).some((o: { orgId: string }) => o.orgId === orgId);
    if (!inOrg) throw new NotFoundException('Client not found');

    const snap = await this.firebase
      .clientAssignments(orgId)
      .where('clientUserId', '==', clientUserId)
      .get();

    // Filter out non-coach assignments (e.g. type: 'PROGRAM')
    const coachAssignDocs = snap.docs.filter((d) => {
      const data = d.data();
      return !data.type || data.type === 'COACH';
    });

    const coachProfileIds = [
      ...new Set(coachAssignDocs.map((d) => d.data().coachId as string).filter(Boolean)),
    ];

    // Resolve coach user info
    const coachMap = new Map<string, { id: string; userId: string; firstName: string; lastName: string; email: string; avatarUrl: string | null }>();
    if (coachProfileIds.length > 0) {
      const coachSnap = await this.firebase
        .users()
        .where('coachProfile.orgId', '==', orgId)
        .get();
      for (const cDoc of coachSnap.docs) {
        const cu = cDoc.data();
        const cp = cu.coachProfile;
        if (!cp) continue;
        const cpId = cp.id || cDoc.id;
        if (coachProfileIds.includes(cpId)) {
          coachMap.set(cpId, {
            id: cpId,
            userId: cDoc.id,
            firstName: cu.firstName ?? '',
            lastName: cu.lastName ?? '',
            email: cu.email ?? '',
            avatarUrl: cu.avatarUrl ?? null,
          });
        }
      }
    }

    return coachAssignDocs
      .map((d) => {
        const data = d.data();
        const coach = coachMap.get(data.coachId);
        return {
          id: d.id,
          coachId: data.coachId,
          status: data.status,
          startAt: data.startAt,
          endAt: data.endAt ?? null,
          notes: data.notes ?? null,
          createdAt: data.createdAt,
          coach: coach
            ? {
                id: coach.id,
                user: {
                  id: coach.userId,
                  firstName: coach.firstName,
                  lastName: coach.lastName,
                  email: coach.email,
                  avatarUrl: coach.avatarUrl,
                },
              }
            : null,
        };
      })
      .sort((a, b) => {
        // Active first, then by startAt desc
        if (a.status !== b.status) {
          return a.status === 'ACTIVE' ? -1 : 1;
        }
        return (b.startAt || '').localeCompare(a.startAt || '');
      });
  }

  // ─────────── Program assignments ───────────

  async listProgramAssignments(clientUserId: string, orgId: string) {
    // Verify client belongs to this org
    const clientDoc = await this.firebase.users().doc(clientUserId).get();
    if (!clientDoc.exists) throw new NotFoundException('Client not found');
    const u = clientDoc.data()!;
    if (!u.clientProfile) throw new NotFoundException('Client not found');
    const inOrg = (u.orgs || []).some((o: { orgId: string }) => o.orgId === orgId);
    if (!inOrg) throw new NotFoundException('Client not found');

    const snap = await this.firebase
      .clientAssignments(orgId)
      .where('clientUserId', '==', clientUserId)
      .where('type', '==', 'PROGRAM')
      .get();

    const rows = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        programId: data.programId as string,
        startDate: (data.startDate ?? data.startAt ?? null) as string | null,
        endDate: (data.endDate ?? data.endAt ?? null) as string | null,
        status: (data.status ?? 'ACTIVE') as string,
        assignedBy: (data.assignedBy ?? null) as string | null,
        createdAt: (data.createdAt ?? null) as string | null,
      };
    });

    // Enrich with program meta
    const programIds = [...new Set(rows.map((r) => r.programId).filter(Boolean))];
    const programMap = new Map<string, { title: string; description?: string; weekCount: number }>();
    await Promise.all(
      programIds.map(async (pid) => {
        try {
          const pd = await this.firebase.programs(orgId).doc(pid).get();
          if (pd.exists) {
            const p = pd.data()!;
            programMap.set(pid, {
              title: p.title ?? 'Untitled program',
              description: p.description,
              weekCount: (p.weeks ?? []).length,
            });
          }
        } catch {
          /* ignore */
        }
      }),
    );

    return rows
      .map((r) => ({
        ...r,
        program: programMap.get(r.programId) ?? null,
      }))
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'ACTIVE' ? -1 : 1;
        return (b.startDate ?? '').localeCompare(a.startDate ?? '');
      });
  }

  async addAssignment(
    clientUserId: string,
    orgId: string,
    actorUserId: string,
    input: { coachId: string; notes?: string },
  ) {
    // Verify client
    const clientDoc = await this.firebase.users().doc(clientUserId).get();
    if (!clientDoc.exists) throw new NotFoundException('Client not found');
    const u = clientDoc.data()!;
    const cp = u.clientProfile;
    if (!cp) throw new NotFoundException('Client not found');
    const inOrg = (u.orgs || []).some((o: { orgId: string }) => o.orgId === orgId);
    if (!inOrg) throw new NotFoundException('Client not found');

    // Verify coach belongs to this org
    const coachSnap = await this.firebase
      .users()
      .where('coachProfile.orgId', '==', orgId)
      .get();
    const coachDoc = coachSnap.docs.find((d) => {
      const cp2 = d.data().coachProfile;
      return cp2 && (cp2.id === input.coachId || d.id === input.coachId);
    });
    if (!coachDoc) throw new BadRequestException('Coach not found in organization');
    const coachData = coachDoc.data();
    const coachProfileId = coachData.coachProfile.id || coachDoc.id;

    // Check for existing active assignment with same coach
    const existingSnap = await this.firebase
      .clientAssignments(orgId)
      .where('clientUserId', '==', clientUserId)
      .where('coachId', '==', coachProfileId)
      .where('status', '==', 'ACTIVE')
      .get();
    if (!existingSnap.empty) {
      throw new BadRequestException('Coach is already assigned to this client');
    }

    const now = new Date().toISOString();
    const ref = this.firebase.clientAssignments(orgId).doc();
    await ref.set({
      type: 'COACH',
      clientId: cp.id || clientUserId,
      clientUserId,
      coachId: coachProfileId,
      coachName: `${coachData.firstName ?? ''} ${coachData.lastName ?? ''}`.trim(),
      status: 'ACTIVE',
      startAt: now,
      endAt: null,
      notes: input.notes ?? null,
      createdAt: now,
      createdBy: actorUserId,
    });

    await this.firebase.auditLogs(orgId).add({
      actorId: actorUserId,
      action: 'client.assignment.add',
      targetType: 'ClientAssignment',
      targetId: ref.id,
      metadata: { clientUserId, coachId: coachProfileId },
      createdAt: now,
    });

    return {
      id: ref.id,
      coachId: coachProfileId,
      status: 'ACTIVE',
      startAt: now,
      endAt: null,
      notes: input.notes ?? null,
    };
  }

  async endAssignment(
    clientUserId: string,
    orgId: string,
    assignmentId: string,
    actorUserId: string,
  ) {
    const ref = this.firebase.clientAssignments(orgId).doc(assignmentId);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('Assignment not found');
    const data = doc.data()!;
    if (data.clientUserId !== clientUserId) {
      throw new NotFoundException('Assignment not found');
    }
    if (data.status === 'ENDED') {
      throw new BadRequestException('Assignment already ended');
    }

    const now = new Date().toISOString();
    await ref.update({
      status: 'ENDED',
      endAt: now,
      endedBy: actorUserId,
    });

    await this.firebase.auditLogs(orgId).add({
      actorId: actorUserId,
      action: 'client.assignment.end',
      targetType: 'ClientAssignment',
      targetId: assignmentId,
      metadata: { clientUserId, coachId: data.coachId },
      createdAt: now,
    });
  }

  // ── Personal Records ─────────────────────────────────────────────────

  async listPersonalRecords(clientUserId: string, orgId: string) {
    const snap = await this.firebase
      .personalRecords(orgId)
      .where('clientUserId', '==', clientUserId)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async upsertPersonalRecord(
    clientUserId: string,
    orgId: string,
    input: {
      exerciseId: string;
      exerciseName: string;
      weight: number;
      unit?: string;
      reps?: number;
      notes?: string;
      source?: string;
    },
  ) {
    const docId = `${clientUserId}_${input.exerciseId}`;
    const now = new Date().toISOString();
    const existing = await this.firebase.personalRecords(orgId).doc(docId).get();
    const data = {
      clientUserId,
      exerciseId: input.exerciseId,
      exerciseName: input.exerciseName,
      weight: input.weight,
      unit: input.unit ?? 'kg',
      reps: input.reps ?? 1,
      recordedAt: now,
      source: input.source ?? 'manual',
      notes: input.notes ?? null,
      updatedAt: now,
      ...(existing.exists ? {} : { createdAt: now }),
    };
    await this.firebase.personalRecords(orgId).doc(docId).set(data, { merge: true });
    return { id: docId, ...data };
  }
}
