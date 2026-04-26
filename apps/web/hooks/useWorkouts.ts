import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

export type WorkoutBlockKind = 'EXERCISE' | 'INTERVAL_TIMER' | 'NOTE';

export interface IntervalTimerConfig {
  title: string;
  preset?: 'CLASSIC_TABATA' | 'CUSTOM';
  prepareSec: number;
  workSec: number;
  restSec: number;
  rounds: number;
  sets: number;
  restBetweenSetsSec: number;
  intervals?: Array<{ name?: string; description?: string }>;
}

export interface NoteConfig {
  title?: string | null;
  body: string;
}

export interface WorkoutItem {
  id: string;
  /** Required for EXERCISE blocks; absent on INTERVAL_TIMER / NOTE. */
  exerciseId?: string;
  orderIndex: number;
  groupLabel?: string;
  coachNotes?: string;
  prescription: {
    sets?: number;
    reps?: string;
    duration?: string;
    distance?: string;
    weight?: string;
    rest?: string | number;
    restBetweenReps?: string | number;
    timeMode?: 'STOPWATCH' | 'COUNTDOWN';
    weightUnit?: 'kg' | 'lbs';
    [key: string]: unknown;
  };
  exercise?: {
    id: string;
    name: string;
    category?: string;
    muscleGroups?: string[];
    equipment?: string[];
    videoUrl?: string;
  };
  /** Block discriminator. Defaults to 'EXERCISE' when absent. */
  kind?: WorkoutBlockKind;
  intervalTimer?: IntervalTimerConfig;
  note?: NoteConfig;
}

export interface Workout {
  id: string;
  title: string;
  description?: string;
  type?: string;
  estimatedDuration?: number;
  instructions?: string;
  tags?: string[];
  items: WorkoutItem[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutInstance {
  id: string;
  templateId?: string;
  clientUserId: string;
  scheduledDate: string;
  dayOrder?: number;
  movedFromDate?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'SKIPPED' | 'MISSED' | 'MOVED';
  title?: string;
  notes?: string;
  completedAt?: string;
  programAssignmentId?: string;
  template?: Workout;
  log?: WorkoutLog;
}

export interface WorkoutLog {
  id: string;
  instanceId: string;
  clientUserId: string;
  completedAt: string;
  durationMinutes?: number;
  notes?: string;
  items: {
    exerciseId: string;
    sets: Array<{
      setIndex: number;
      reps?: number;
      weight?: number;
      duration?: number;
      restSeconds?: number;
      completed: boolean;
    }>;
  }[];
}

export interface CalendarDay {
  date: string;
  instances: WorkoutInstance[];
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useWorkouts(query?: { search?: string; type?: string }) {
  return useQuery({
    queryKey: ['workouts', query],
    queryFn: () => {
      const params = new URLSearchParams();
      if (query?.search) params.set('search', query.search);
      if (query?.type) params.set('type', query.type);
      const qs = params.toString();
      return api.get<{ items: Workout[]; total: number }>(`/workouts${qs ? `?${qs}` : ''}`);
    },
  });
}

export function useWorkout(id: string) {
  return useQuery({
    queryKey: ['workout', id],
    queryFn: () => api.get<Workout>(`/workouts/${id}`),
    enabled: !!id,
  });
}

export function useClientCalendar(clientId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['calendar', clientId, startDate, endDate],
    queryFn: () =>
      api.get<WorkoutInstance[]>(
        `/workouts/calendar/${clientId}?startDate=${startDate}&endDate=${endDate}`,
      ),
    enabled: !!clientId,
  });
}

export function useScheduleWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      templateId: string;
      clientId: string;
      scheduledDate: string;
      title?: string;
      notes?: string;
    }) => api.post<WorkoutInstance>('/workouts/schedule', body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['calendar', vars.clientId] });
    },
  });
}

export function useMoveInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; scheduledDate: string }) =>
      api.patch(`/workouts/instances/${id}/move`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

export function useReorderDayInstances() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      clientId,
      date,
      orderedInstanceIds,
    }: {
      clientId: string;
      date: string;
      orderedInstanceIds: string[];
    }) =>
      api.patch(`/workouts/calendar/${clientId}/${date}/reorder`, {
        orderedInstanceIds,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

export function useSkipInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.patch(`/workouts/instances/${id}/skip`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

export function useDeleteInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workouts/instances/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

export function useCreateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Workout> & { title: string }) =>
      api.post<Workout>('/workouts', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export function useUpdateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Workout> & { id: string }) =>
      api.patch<Workout>(`/workouts/${id}`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['workouts'] });
      qc.invalidateQueries({ queryKey: ['workout', vars.id] });
    },
  });
}

export function useDeleteWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workouts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export function useWorkoutInstance(instanceId: string) {
  return useQuery({
    queryKey: ['workout-instance', instanceId],
    queryFn: () => api.get<WorkoutInstance>(`/workouts/instances/${instanceId}`),
    enabled: !!instanceId,
  });
}

export function useOverrideInstanceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      instanceId,
      exerciseId,
      prescription,
    }: {
      instanceId: string;
      exerciseId: string;
      prescription: Record<string, unknown>;
    }) =>
      api.patch(`/workouts/instances/${instanceId}/override`, {
        exerciseId,
        prescription,
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['workout-instance', vars.instanceId] });
      qc.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}
