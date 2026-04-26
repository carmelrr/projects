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
    timeMode?: 'STOPWATCH' | 'COUNTDOWN';
    [key: string]: unknown;
  };
  exercise?: ExerciseRef;
  /** Block discriminator. Defaults to 'EXERCISE' when absent. */
  kind?: WorkoutBlockKind;
  intervalTimer?: IntervalTimerConfig;
  note?: NoteConfig;
}

export interface WorkoutInstanceSummary {
  title?: string | null;
  type?: string | null;
  estimatedDuration?: number | null;
  itemCount: number;
  blockKinds: WorkoutBlockKind[];
  primaryMuscleGroups?: string[];
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
  /**
   * Lightweight summary attached by the calendar endpoint so list cards can
   * render without a full template fetch. Detail endpoint returns `template`
   * instead.
   */
  summary?: WorkoutInstanceSummary;
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
  blockCompletions?: Record<
    string,
    { kind: 'INTERVAL_TIMER' | 'NOTE'; totalWorkSec?: number }
  >;
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

// ── Coach hooks ─────────────────────────────────────────────────────────────

export function useWorkouts(query?: { search?: string; type?: string }) {
  return useQuery({
    queryKey: ['workouts', query],
    queryFn: () => {
      const params = new URLSearchParams();
      if (query?.search) params.set('search', query.search);
      if (query?.type) params.set('type', query.type);
      const qs = params.toString();
      return api.get<{ items: WorkoutTemplate[]; total: number }>(
        `/workouts${qs ? `?${qs}` : ''}`,
      );
    },
  });
}

export function useWorkout(id: string) {
  return useQuery({
    queryKey: ['workout', id],
    queryFn: () => api.get<WorkoutTemplate>(`/workouts/${id}`),
    enabled: !!id,
  });
}

export function useCreateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<WorkoutTemplate> & { title: string }) =>
      api.post<WorkoutTemplate>('/workouts', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export function useUpdateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<WorkoutTemplate> & { id: string }) =>
      api.patch<WorkoutTemplate>(`/workouts/${id}`, body),
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

export function useClientCalendar(
  clientId: string,
  startDate: string,
  endDate: string,
) {
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

