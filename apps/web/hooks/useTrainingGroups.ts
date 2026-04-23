import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface TrainingGroupListItem {
  id: string;
  orgId: string;
  name: string;
  description?: string | null;
  coachId: string;
  coachUserId: string;
  coachName: string;
  memberClientUserIds: string[];
  memberCount: number;
  activeProgramId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingGroupMember {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  status: string;
}

export interface TrainingGroupCoach {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

export interface TrainingGroupDetail extends TrainingGroupListItem {
  coach: TrainingGroupCoach;
  members: TrainingGroupMember[];
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface TrainingGroupsQuery {
  page?: number;
  limit?: number;
  search?: string;
  coachId?: string;
}

export function useTrainingGroups(query: TrainingGroupsQuery = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.coachId) params.set('coachId', query.coachId);

  const qs = params.toString();
  return useQuery<PaginatedResponse<TrainingGroupListItem>>({
    queryKey: ['training-groups', query],
    queryFn: () => api.get(`/training-groups${qs ? `?${qs}` : ''}`),
  });
}

export function useTrainingGroup(groupId: string | null) {
  return useQuery<TrainingGroupDetail>({
    queryKey: ['training-group', groupId],
    queryFn: () => api.get(`/training-groups/${groupId}`),
    enabled: !!groupId,
  });
}

export function useCreateTrainingGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      description?: string;
      coachId: string;
      memberClientUserIds?: string[];
    }) => api.post<TrainingGroupDetail>('/training-groups', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-groups'] });
    },
  });
}

export function useAddTrainingGroupMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientUserIds }: { id: string; clientUserIds: string[] }) =>
      api.post<TrainingGroupDetail>(`/training-groups/${id}/members`, { clientUserIds }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['training-groups'] });
      qc.invalidateQueries({ queryKey: ['training-group', vars.id] });
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useRemoveTrainingGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientUserId }: { id: string; clientUserId: string }) =>
      api.delete(`/training-groups/${id}/members/${clientUserId}`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['training-groups'] });
      qc.invalidateQueries({ queryKey: ['training-group', vars.id] });
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useAssignTrainingGroupProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      programId,
      startDate,
    }: {
      id: string;
      programId: string;
      startDate: string;
    }) => api.post(`/training-groups/${id}/assign-program`, { programId, startDate }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['training-groups'] });
      qc.invalidateQueries({ queryKey: ['training-group', vars.id] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

export function useDeleteTrainingGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/training-groups/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-groups'] });
    },
  });
}