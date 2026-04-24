import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { enqueueWorkoutLog } from '@/lib/offline-queue';

export interface ExerciseRef {
  id: string;
  name: string;
  category?: string;
  muscleGroups?: string[];
  videoUrl?: string;
  isPrBased?: boolean;
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
    rest?: string | number;
    timeMode?: 'STOPWATCH' | 'COUNTDOWN';
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
  dayOrder?: number;
  movedFromDate?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'SKIPPED' | 'MISSED' | 'MOVED';
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
  restSeconds?: number;
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

/**
 * Scheduled workouts for the current user from today through `days` ahead
 * (inclusive). Useful for "Today / Tomorrow / Upcoming" sections.
 */
export function useUpcomingWorkouts(days = 7) {
  const { user } = useAuthStore();
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  const startDate = today.toISOString().split('T')[0];
  const endDate = end.toISOString().split('T')[0];

  return useQuery<WorkoutInstance[]>({
    queryKey: ['upcoming-workouts', user?.id, startDate, endDate],
    queryFn: () =>
      api.get<WorkoutInstance[]>(
        `/workouts/calendar/${user!.id}?startDate=${startDate}&endDate=${endDate}`,
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
  notes?: string;
  items: LogItem[];
}

export interface SubmitLogResult {
  queued: boolean;
  log?: WorkoutLog;
}

export function useSubmitLog(instanceId: string) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const today = new Date().toISOString().split('T')[0];

  return useMutation<SubmitLogResult, Error, SubmitLogPayload>({
    mutationFn: async (payload: SubmitLogPayload) => {
      const net = await NetInfo.fetch();
      if (net.isConnected === false) {
        await enqueueWorkoutLog(instanceId, payload);
        return { queued: true };
      }
      try {
        const log = await api.post<WorkoutLog>(
          `/workouts/instances/${instanceId}/log`,
          payload,
        );
        return { queued: false, log };
      } catch (err) {
        // If it was a network error, fall back to the queue
        const msg = (err as Error).message || '';
        if (/network|timeout|failed to fetch/i.test(msg)) {
          await enqueueWorkoutLog(instanceId, payload);
          return { queued: true };
        }
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['today-workouts', user?.id, today] });
      qc.invalidateQueries({ queryKey: ['upcoming-workouts', user?.id] });
      qc.invalidateQueries({ queryKey: ['workout-instance', instanceId] });
    },
  });
}

// ── Personal Records ───────────────────────────────────────────────────────

export interface PersonalRecord {
  id: string;
  clientUserId: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  unit: string;
  reps?: number;
  recordedAt: string;
  source: 'manual' | 'logged';
  notes?: string;
}

export function usePersonalRecords() {
  const { user } = useAuthStore();
  return useQuery<PersonalRecord[]>({
    queryKey: ['personal-records', user?.id],
    queryFn: () => api.get<PersonalRecord[]>(`/clients/${user!.id}/personal-records`),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

export function useUpsertPersonalRecord() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: (body: {
      exerciseId: string;
      exerciseName: string;
      weight: number;
      unit?: string;
      reps?: number;
      notes?: string;
    }) => api.post<PersonalRecord>(`/clients/${user!.id}/personal-records`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal-records', user?.id] });
    },
  });
}
