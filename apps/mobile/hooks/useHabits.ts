import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export interface HabitDefinition {
  id: string;
  name: string;
  description?: string | null;
  frequency: 'DAILY' | 'WEEKLY';
  target: number;
  unit?: string | null;
  clientId?: string | null;
  archived?: boolean;
}

export interface HabitLog {
  id: string;
  habitId: string;
  clientId: string;
  date: string;
  value: number;
  completed: boolean;
  notes?: string | null;
}

export function useHabitDefinitions() {
  return useQuery<HabitDefinition[]>({
    queryKey: ['habits', 'definitions'],
    queryFn: () => api.get<HabitDefinition[]>('/habits/definitions'),
  });
}

export function useHabitLogs(date: string) {
  const { user } = useAuthStore();
  return useQuery<HabitLog[]>({
    queryKey: ['habits', 'logs', user?.id, date],
    queryFn: () =>
      api.get<HabitLog[]>(`/habits/clients/${user!.id}/logs?date=${date}`),
    enabled: !!user?.id && !!date,
  });
}

export function useLogHabit() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: (body: {
      habitId: string;
      date: string;
      value?: number;
      completed?: boolean;
      notes?: string;
    }) => api.post<HabitLog>(`/habits/clients/${user!.id}/log`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits', 'logs'] });
    },
  });
}
