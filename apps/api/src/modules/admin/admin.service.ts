import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { RedisService } from '../redis/redis.service';
import { parsePagination, paginatedResponse } from '../../common/utils/pagination';
import { AuditService } from './audit.service';

const VALID_ROLES = ['OWNER', 'ADMIN_COACH', 'COACH', 'CLIENT'] as const;
type AdminRole = (typeof VALID_ROLES)[number];

@Injectable()
export class AdminService {
  constructor(
    private firebase: FirebaseService,
    private redis: RedisService,
    private audit: AuditService,
  ) {}

  // ── Stats ────────────────────────────────────────────────────────────

  async getStats(orgId: string) {
    const usersSnap = await this.firebase
      .users()
      .where('orgs', 'array-contains-any', [
        { orgId, role: 'OWNER' },
        { orgId, role: 'ADMIN_COACH' },
        { orgId, role: 'COACH' },
        { orgId, role: 'CLIENT' },
      ])
      .get()
      .catch(() => null);

    // Fallback: scan users and filter in-memory (Firestore can't do nested array-contains efficiently)
    const allUsers = usersSnap
      ? usersSnap.docs
      : (await this.firebase.users().get()).docs.filter((d) => {
          const orgs = (d.data().orgs as Array<{ orgId: string }> | undefined) || [];
          return orgs.some((o) => o.orgId === orgId);
        });

    const orgUsers = allUsers.filter((d) => {
      const orgs = (d.data().orgs as Array<{ orgId: string }> | undefined) || [];
      return orgs.some((o) => o.orgId === orgId);
    });

    const activeUsers = orgUsers.filter((d) => (d.data().status ?? 'ACTIVE') === 'ACTIVE').length;
    const totalClients = orgUsers.filter((d) => {
      const orgs = (d.data().orgs as Array<{ orgId: string; role: string }> | undefined) || [];
      return orgs.some((o) => o.orgId === orgId && o.role === 'CLIENT');
    }).length;

    // Workouts logged in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const logsSnap = await this.firebase
      .workoutLogs(orgId)
      .where('submittedAt', '>=', thirtyDaysAgo)
      .get();
    const workoutsLast30d = logsSnap.size;

    return {
      activeUsers,
      totalClients,
      totalUsers: orgUsers.length,
      workoutsLast30d,
      storageUsedMB: 0, // placeholder; Storage bucket stats require admin SDK aggregation
    };
  }

  // ── Users ────────────────────────────────────────────────────────────

  async listUsers(
    orgId: string,
    query: { page?: string; limit?: string; role?: string; status?: string; search?: string },
  ) {
    const pagination = parsePagination(query);

    const snap = await this.firebase.users().get();
    const matched = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown>)
      .filter((u) => {
        const orgs = (u.orgs as Array<{ orgId: string; role: string }> | undefined) || [];
        const membership = orgs.find((o) => o.orgId === orgId);
        if (!membership) return false;
        if (query.role && membership.role !== query.role) return false;
        if (query.status && (u.status ?? 'ACTIVE') !== query.status) return false;
        if (query.search) {
          const s = query.search.toLowerCase();
          const name = `${u.firstName ?? ''} ${u.lastName ?? ''} ${u.email ?? ''}`.toLowerCase();
          if (!name.includes(s)) return false;
        }
        return true;
      })
      .map((u) => {
        const orgs = (u.orgs as Array<{ orgId: string; role: string }> | undefined) || [];
        const membership = orgs.find((o) => o.orgId === orgId);
        return {
          id: u.id,
          email: u.email ?? null,
          firstName: u.firstName ?? null,
          lastName: u.lastName ?? null,
          avatarUrl: u.avatarUrl ?? null,
          role: membership?.role ?? null,
          status: u.status ?? 'ACTIVE',
          lastLoginAt: u.lastLoginAt ?? null,
          createdAt: u.createdAt ?? null,
        };
      });

    const total = matched.length;
    const paged = matched.slice(pagination.skip, pagination.skip + pagination.limit);
    return paginatedResponse(paged, total, pagination);
  }

  async updateUserStatus(
    orgId: string,
    targetUserId: string,
    status: 'ACTIVE' | 'SUSPENDED',
    actorUserId: string,
    actorRole: string,
  ) {
    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      throw new BadRequestException('Invalid status');
    }
    if (targetUserId === actorUserId) {
      throw new ForbiddenException('Cannot change your own status');
    }

    const ref = this.firebase.users().doc(targetUserId);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('User not found');

    const orgs = (doc.data()?.orgs as Array<{ orgId: string; role: string }> | undefined) || [];
    const membership = orgs.find((o) => o.orgId === orgId);
    if (!membership) throw new NotFoundException('User is not a member of this organization');

    // Protect OWNER role
    if (membership.role === 'OWNER') {
      throw new ForbiddenException('Cannot change status of an OWNER');
    }

    await ref.update({ status, updatedAt: new Date().toISOString() });

    // Disable Firebase Auth user on suspend
    try {
      await this.firebase.auth.updateUser(targetUserId, { disabled: status === 'SUSPENDED' });
    } catch {
      // Best-effort; user record may be managed externally
    }

    await this.audit.log({
      orgId,
      actorUserId,
      actorRole,
      action: status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
      targetType: 'USER',
      targetId: targetUserId,
    });

    return { id: targetUserId, status };
  }

  async updateUserRole(
    orgId: string,
    targetUserId: string,
    newRole: AdminRole,
    actorUserId: string,
    actorRole: string,
  ) {
    if (!VALID_ROLES.includes(newRole)) {
      throw new BadRequestException('Invalid role');
    }
    if (newRole === 'OWNER') {
      throw new ForbiddenException('OWNER role cannot be assigned via this endpoint');
    }
    if (targetUserId === actorUserId) {
      throw new ForbiddenException('Cannot change your own role');
    }

    const ref = this.firebase.users().doc(targetUserId);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('User not found');

    const orgs = (doc.data()?.orgs as Array<{ orgId: string; role: string }> | undefined) || [];
    const idx = orgs.findIndex((o) => o.orgId === orgId);
    if (idx === -1) throw new NotFoundException('User is not a member of this organization');

    if (orgs[idx].role === 'OWNER') {
      throw new ForbiddenException('Cannot change OWNER role');
    }

    const previousRole = orgs[idx].role;
    orgs[idx] = { ...orgs[idx], role: newRole };

    await ref.update({ orgs, updatedAt: new Date().toISOString() });

    await this.audit.log({
      orgId,
      actorUserId,
      actorRole,
      action: 'USER_ROLE_CHANGED',
      targetType: 'USER',
      targetId: targetUserId,
      metadata: { previousRole, newRole },
    });

    return { id: targetUserId, role: newRole };
  }

  // ── Audit Logs ───────────────────────────────────────────────────────

  async listAuditLogs(
    orgId: string,
    query: {
      page?: string;
      limit?: string;
      action?: string;
      actorUserId?: string;
      from?: string;
      to?: string;
    },
  ) {
    const pagination = parsePagination(query);
    // Avoid composite index: query by equality filters only, sort in memory.
    let q = this.firebase.auditLogs(orgId).limit(500) as FirebaseFirestore.Query;
    if (query.action) q = q.where('action', '==', query.action);
    if (query.actorUserId) q = q.where('actorUserId', '==', query.actorUserId);

    const snap = await q.get();
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown>);
    items.sort((a, b) => ((b.createdAt as string | undefined) || '').localeCompare((a.createdAt as string | undefined) || ''));

    if (query.from) {
      items = items.filter((i) => (i.createdAt as string) >= query.from!);
    }
    if (query.to) {
      items = items.filter((i) => (i.createdAt as string) <= query.to!);
    }

    const total = items.length;
    const paged = items.slice(pagination.skip, pagination.skip + pagination.limit);
    return paginatedResponse(paged, total, pagination);
  }

  // ── System Health ────────────────────────────────────────────────────

  async getSystemHealth() {
    const startedAt = Date.now();

    // Firestore latency probe
    let firestoreLatencyMs: number | null = null;
    let firestoreOk = false;
    try {
      const t0 = Date.now();
      await this.firebase.db.collection('_health').doc('_probe').get();
      firestoreLatencyMs = Date.now() - t0;
      firestoreOk = true;
    } catch {
      firestoreOk = false;
    }

    // Redis ping
    let redisLatencyMs: number | null = null;
    let redisOk = false;
    try {
      const t0 = Date.now();
      await this.redis.ping();
      redisLatencyMs = Date.now() - t0;
      redisOk = true;
    } catch {
      redisOk = false;
    }

    return {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checkDurationMs: Date.now() - startedAt,
      firestore: { ok: firestoreOk, latencyMs: firestoreLatencyMs },
      redis: { ok: redisOk, latencyMs: redisLatencyMs },
      memory: {
        rss: process.memoryUsage().rss,
        heapUsed: process.memoryUsage().heapUsed,
      },
      nodeVersion: process.version,
    };
  }
}
