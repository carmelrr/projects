import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ProgramWeek {
  id: string;
  weekIndex: number;
  title?: string;
  notes?: string;
  workoutIds: string[];
  workoutDays?: (DayOfWeek | null)[];
}

export interface Program {
  id: string;
  title: string;
  description?: string;
  isPrivate: boolean;
  tags?: string[];
  weeks: ProgramWeek[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramsResponse {
  items: Program[];
  total: number;
}

export function usePrograms(query?: { search?: string }) {
  return useQuery({
    queryKey: ['programs', query],
    queryFn: () => {
      const params = new URLSearchParams();
      if (query?.search) params.set('search', query.search);
      const qs = params.toString();
      return api.get<ProgramsResponse>(`/programs${qs ? `?${qs}` : ''}`);
    },
  });
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: ['program', id],
    queryFn: () => api.get<Program>(`/programs/${id}`),
    enabled: !!id,
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      description?: string;
      isPrivate?: boolean;
      tags?: string[];
    }) => api.post<Program>('/programs', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      title?: string;
      description?: string;
      isPrivate?: boolean;
      tags?: string[];
    }) => api.patch<Program>(`/programs/${id}`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['programs'] });
      qc.invalidateQueries({ queryKey: ['program', vars.id] });
    },
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/programs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

export function useDuplicateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Program>(`/programs/${id}/duplicate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

export function useAssignProgram() {
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      clientId: string;
      startDate: string;
    }) => api.post(`/programs/${id}/assign`, body),
  });
}

export function useAddProgramWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      programId,
      ...body
    }: {
      programId: string;
      title?: string;
      notes?: string;
    }) => api.post(`/programs/${programId}/weeks`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['program', vars.programId] });
    },
  });
}

export function useUpdateProgramWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      programId,
      weekId,
      ...body
    }: {
      programId: string;
      weekId: string;
      title?: string;
      notes?: string;
      workoutIds?: string[];
      workoutDays?: (DayOfWeek | null)[];
    }) => api.patch(`/programs/${programId}/weeks/${weekId}`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['program', vars.programId] });
    },
  });
}

export function useDeleteProgramWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, weekId }: { programId: string; weekId: string }) =>
      api.delete(`/programs/${programId}/weeks/${weekId}`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['program', vars.programId] });
    },
  });
}
