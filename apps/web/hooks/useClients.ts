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
