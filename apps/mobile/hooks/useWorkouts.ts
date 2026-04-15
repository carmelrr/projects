import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export interface ExerciseRef {
  id: string;
  name: string;
  category?: string;
  muscleGroups?: string[];
  videoUrl?: string;
}

export interface WorkoutItem {
  id: string;
  exerciseId: string;
  orderIndex: number;
  groupLabel?: string;
  coachNotes?: string;
  prescription: {
    sets?: number;
    reps?: string;
    duration?: string;
    distance?: string;
    weight?: string;
    rpe?: number;
    rest?: string;
    [key: string]: unknown;
  };
  exercise?: ExerciseRef;
}

export interface WorkoutTemplate {
  id: string;
  title: string;
  description?: string;
  type?: string;
  estimatedDuration?: number;
  instructions?: string;
  items: WorkoutItem[];
}

export interface WorkoutInstance {
  id: string;
  clientUserId: string;
  templateId?: string;
  scheduledDate: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'SKIPPED' | 'MISSED';
  completedAt?: string;
  title?: string;
  notes?: string;
  template?: WorkoutTemplate;
  log?: WorkoutLog;
}

export interface WorkoutLog {
  id: string;
  instanceId: string;
  clientUserId: string;
  completedAt: string;
  durationMinutes?: number;
  overallRpe?: number;
  notes?: string;
  items: LogItem[];
}

export interface LogItem {
  exerciseId: string;
  sets: LogSet[];
}

export interface LogSet {
  setIndex: number;
  reps?: number;
  weight?: number;
  duration?: number;
  rpe?: number;
  completed: boolean;
}

// Today's workouts for the logged-in client
export function useTodayWorkouts() {
  const { user } = useAuthStore();
  const today = new Date().toISOString().split('T')[0];

  return useQuery<WorkoutInstance[]>({
    queryKey: ['today-workouts', user?.id, today],
    queryFn: () =>
      api.get<WorkoutInstance[]>(
        `/workouts/calendar/${user!.id}?startDate=${today}&endDate=${today}`,
      ),
    enabled: !!user?.id,
  });
}

export function useWorkoutInstance(instanceId: string) {
  return useQuery<WorkoutInstance>({
    queryKey: ['workout-instance', instanceId],
    queryFn: () => api.get<WorkoutInstance>(`/workouts/instances/${instanceId}`),
    enabled: !!instanceId,
  });
}

export interface SubmitLogPayload {
  durationMinutes?: number;
  overallRpe?: number;
  notes?: string;
  items: LogItem[];
}

export function useSubmitLog(instanceId: string) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const today = new Date().toISOString().split('T')[0];

  return useMutation({
    mutationFn: (payload: SubmitLogPayload) =>
      api.post<WorkoutLog>(`/workouts/instances/${instanceId}/log`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['today-workouts', user?.id, today] });
      qc.invalidateQueries({ queryKey: ['workout-instance', instanceId] });
    },
  });
}
