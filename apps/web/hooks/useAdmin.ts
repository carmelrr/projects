import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────

export interface AdminStats {
  activeUsers: number;
  totalClients: number;
  totalUsers: number;
  workoutsLast30d: number;
  storageUsedMB: number;
}

export interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN_COACH' | 'COACH' | 'CLIENT' | null;
  status: 'ACTIVE' | 'SUSPENDED';
  lastLoginAt: string | null;
  createdAt: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SystemHealth {
  uptime: number;
  timestamp: string;
  checkDurationMs: number;
  firestore: { ok: boolean; latencyMs: number | null };
  redis: { ok: boolean; latencyMs: number | null };
  memory: { rss: number; heapUsed: number };
  nodeVersion: string;
}

// ── Hooks ────────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get<AdminStats>('/admin/stats'),
    refetchInterval: 60_000,
  });
}

export function useAdminUsers(params: {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.role) qs.set('role', params.role);
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);

  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => api.get<PaginatedResponse<AdminUser>>(`/admin/users?${qs.toString()}`),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      api.patch(`/admin/users/${userId}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'ADMIN_COACH' | 'COACH' | 'CLIENT' }) =>
      api.patch(`/admin/users/${userId}/role`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useAuditLogs(params: {
  page?: number;
  limit?: number;
  action?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.action) qs.set('action', params.action);
  if (params.actorUserId) qs.set('actorUserId', params.actorUserId);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);

  return useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: () => api.get<PaginatedResponse<AuditLogEntry>>(`/admin/audit-logs?${qs.toString()}`),
    placeholderData: keepPreviousData,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['admin', 'system-health'],
    queryFn: () => api.get<SystemHealth>('/admin/system/health'),
    refetchInterval: 15_000,
  });
}
