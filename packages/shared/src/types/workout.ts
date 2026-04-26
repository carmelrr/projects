export interface WorkoutPrescription {
  sets?: number;
  reps?: string; // "8-10" or "12"
  weight?: { type: 'absolute' | 'percentage_1rm' | 'rpe_target'; value: number };
  tempo?: string; // "3-1-1-0"
  rest?: number; // seconds — rest between sets
  /**
   * Rest between individual reps (seconds).
   * Only meaningful when both `reps` and `duration` are set, in which case
   * the trainee runs each rep as a Tabata-style segment with this rest in
   * between. Ignored otherwise.
   */
  restBetweenReps?: number;
  /**
   * Seconds of work. When `reps` is also set, this is interpreted as the
   * hold/work time PER REP (e.g. reps=10 + duration=3 → 10×3s holds).
   * When `reps` is not set, this is the duration of the whole set.
   */
  duration?: number;
  timeMode?: 'STOPWATCH' | 'COUNTDOWN';
  /**
   * The weight unit the coach was using when they entered the `weight` value.
   * Defaults to 'kg'. Used by the trainee's app to auto-convert to their
   * preferred unit.
   */
  weightUnit?: 'kg' | 'lbs';
  notes?: string;
  intervals?: { work: number; rest: number; rounds: number };
}

export interface WorkoutTemplateDTO {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  type: string;
  estimatedDuration?: number;
  items: WorkoutItemDTO[];
}

export interface WorkoutItemDTO {
  id: string;
  exerciseId: string;
  orderIndex: number;
  groupLabel?: string;
  prescription: WorkoutPrescription;
  coachNotes?: string;
}

// ── Workout scheduling (calendar) ──────────────────────────────────────────

/**
 * Lifecycle of a scheduled workout for a client.
 *  SCHEDULED  — planned, not yet started.
 *  COMPLETED  — logged by the client.
 *  SKIPPED    — explicitly skipped.
 *  MISSED     — past-date & unlogged (derived/auto).
 *  MOVED      — legacy marker for an instance whose date was changed.
 */
export type WorkoutInstanceStatus =
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'MISSED'
  | 'MOVED';

export interface WorkoutInstanceDTO {
  id: string;
  clientUserId: string;
  templateId?: string;
  /** ISO date (YYYY-MM-DD) or full ISO datetime. */
  scheduledDate: string;
  /** Previous scheduled date if the instance was moved. */
  movedFromDate?: string;
  status: WorkoutInstanceStatus;
  title?: string;
  notes?: string;
  completedAt?: string;
  programAssignmentId?: string;
}
