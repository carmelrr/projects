import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ClientUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
}

export interface ClientProfile {
  goals?: string | null;
  dob?: string | null;
  heightCm?: number | null;
  medicalNotes?: string | null;
}

export interface ComplianceSummary {
  period: 'SEVEN_DAY' | 'THIRTY_DAY' | 'NINETY_DAY';
  complianceRate: number;
  needsAttention: boolean;
  totalScheduled: number;
  totalCompleted: number;
}

export interface CoachAssignment {
  id: string;
  startDate: string;
  endDate?: string | null;
  coach: {
    id: string;
    user: { id: string; firstName: string; lastName: string; avatarUrl?: string | null };
  };
}

export interface Client {
  id: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  /** Top-level for list view */
  goals?: string | null;
  createdAt: string;
  user: ClientUser;
  /** Nested profile with full detail — present in detail responses */
  clientProfile?: ClientProfile | null;
  assignments: CoachAssignment[];
  complianceSummaries: ComplianceSummary[];
}

interface ClientsResponse {
  items: Client[];
  total: number;
  page: number;
  limit: number;
}

interface ClientsQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  needsAttention?: boolean;
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useClients(query: ClientsQuery = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  if (query.needsAttention) params.set('needsAttention', 'true');

  const qs = params.toString();
  return useQuery<ClientsResponse>({
    queryKey: ['clients', query],
    queryFn: () => api.get(`/clients${qs ? `?${qs}` : ''}`),
  });
}

export function useClient(clientId: string) {
  return useQuery<Client>({
    queryKey: ['client', clientId],
    queryFn: () => api.get(`/clients/${clientId}`),
    enabled: !!clientId,
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      status?: string;
      goals?: string;
      dob?: string;
      heightCm?: number;
      medicalNotes?: string;
    }) => api.patch(`/clients/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['client', vars.id] });
    },
  });
}

export interface InviteClientResponse {
  inviteToken: string;
  inviteUrl: string;
}

export function useInviteClient() {
  const qc = useQueryClient();
  return useMutation<InviteClientResponse, Error, { email: string }>({
    mutationFn: ({ email }) => api.post('/clients/invite', { email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

// ── Coach assignments ───────────────────────────────────────────────────────

export interface ClientAssignment {
  id: string;
  coachId: string;
  status: 'ACTIVE' | 'ENDED';
  startAt: string;
  endAt: string | null;
  notes: string | null;
  createdAt: string;
  coach: {
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      avatarUrl: string | null;
    };
  } | null;
}

export function useClientAssignments(clientUserId: string) {
  return useQuery<ClientAssignment[]>({
    queryKey: ['client-assignments', clientUserId],
    queryFn: () => api.get(`/clients/${clientUserId}/assignments`),
    enabled: !!clientUserId,
  });
}

export function useAddClientAssignment() {
  const qc = useQueryClient();
  return useMutation<
    { id: string; coachId: string; status: string; startAt: string },
    Error,
    { clientUserId: string; coachId: string; notes?: string }
  >({
    mutationFn: ({ clientUserId, coachId, notes }) =>
      api.post(`/clients/${clientUserId}/assignments`, { coachId, notes }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client-assignments', vars.clientUserId] });
      qc.invalidateQueries({ queryKey: ['client', vars.clientUserId] });
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useEndClientAssignment() {
  const qc = useQueryClient();
  return useMutation<void, Error, { clientUserId: string; assignmentId: string }>({
    mutationFn: ({ clientUserId, assignmentId }) =>
      api.delete(`/clients/${clientUserId}/assignments/${assignmentId}`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client-assignments', vars.clientUserId] });
      qc.invalidateQueries({ queryKey: ['client', vars.clientUserId] });
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

// ── Program assignments (for client detail) ─────────────────────────────────

export interface ClientProgramAssignment {
  id: string;
  programId: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  assignedBy: string | null;
  createdAt: string | null;
  program: { title: string; description?: string; weekCount: number } | null;
}

export function useClientPrograms(clientUserId: string) {
  return useQuery<ClientProgramAssignment[]>({
    queryKey: ['client-programs', clientUserId],
    queryFn: () => api.get(`/clients/${clientUserId}/program-assignments`),
    enabled: !!clientUserId,
  });
}
