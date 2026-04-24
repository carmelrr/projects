import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  category?: string;
  muscleGroups?: string[];
  equipment?: string[];
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  videoUrl?: string;
  thumbnailUrl?: string;
  isSystem: boolean;
  orgId?: string;
  createdAt: string;
  isPrBased?: boolean;
}

export interface ExercisesResponse {
  items: Exercise[];
  total: number;
}

export function useExercises(query?: {
  search?: string;
  category?: string;
  muscleGroup?: string;
  equipment?: string;
  isSystem?: boolean;
}) {
  return useQuery({
    queryKey: ['exercises', query],
    queryFn: () => {
      const params = new URLSearchParams();
      if (query?.search) params.set('search', query.search);
      if (query?.category) params.set('category', query.category);
      if (query?.muscleGroup) params.set('muscleGroup', query.muscleGroup);
      if (query?.equipment) params.set('equipment', query.equipment);
      if (query?.isSystem !== undefined) params.set('isSystem', String(query.isSystem));
      const qs = params.toString();
      return api.get<ExercisesResponse>(`/exercises${qs ? `?${qs}` : ''}`);
    },
  });
}

export function useExercise(id: string) {
  return useQuery({
    queryKey: ['exercise', id],
    queryFn: () => api.get<Exercise>(`/exercises/${id}`),
    enabled: !!id,
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Exercise> & { name: string }) =>
      api.post<Exercise>('/exercises', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Exercise> & { id: string }) =>
      api.patch<Exercise>(`/exercises/${id}`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      qc.invalidateQueries({ queryKey: ['exercise', vars.id] });
    },
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/exercises/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
}

export function useExerciseCategories() {
  return useQuery({
    queryKey: ['exercise-categories'],
    queryFn: () => api.get<string[]>('/exercises/categories'),
    staleTime: 60_000,
  });
}

export function useCreateExerciseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post<{ name: string }>('/exercises/categories', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercise-categories'] });
    },
  });
}

export function useExerciseMuscleGroups() {
  return useQuery({
    queryKey: ['exercise-muscle-groups'],
    queryFn: () => api.get<string[]>('/exercises/muscle-groups'),
    staleTime: 60_000,
  });
}

export function useCreateExerciseMuscleGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post<{ name: string }>('/exercises/muscle-groups', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercise-muscle-groups'] });
    },
  });
}
