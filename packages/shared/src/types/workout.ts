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
  /** Required for EXERCISE blocks; absent on INTERVAL_TIMER / NOTE blocks. */
  exerciseId?: string;
  orderIndex: number;
  groupLabel?: string;
  prescription: WorkoutPrescription;
  coachNotes?: string;
  /**
   * Block discriminator. When omitted, treat as 'EXERCISE' (legacy rows).
   */
  kind?: WorkoutBlockKind;
  intervalTimer?: IntervalTimerConfig;
  note?: NoteConfig;
}

// ── Block kinds (Interval Timer / Note) ────────────────────────────────────

export type WorkoutBlockKind = 'EXERCISE' | 'INTERVAL_TIMER' | 'NOTE';

export interface IntervalTimerConfig {
  /** Display title shown to the trainee, e.g. "Tabata Push Day". */
  title: string;
  /** 'CLASSIC_TABATA' marks the one-click preset; 'CUSTOM' is anything else. */
  preset?: 'CLASSIC_TABATA' | 'CUSTOM';
  /** Pre-roll countdown before the first work interval. 0 to skip. */
  prepareSec: number;
  /** Length of one work interval. */
  workSec: number;
  /** Length of one rest interval (between rounds within a set). */
  restSec: number;
  /** Number of work/rest cycles within a single set. */
  rounds: number;
  /** Number of times the rounds-loop repeats. 1 disables the outer loop. */
  sets: number;
  /** Rest between sets. Ignored when sets <= 1. */
  restBetweenSetsSec: number;
  /**
   * Optional per-round metadata. Length should equal `rounds` (or be empty).
   * If shorter, the runner falls back to "Round N" for missing entries.
   */
  intervals?: Array<{ name?: string; description?: string }>;
}

export interface NoteConfig {
  title?: string;
  body: string;
}

/**
 * Coach preset: 20s work / 10s rest × 8 rounds, 1 set, 60s set rest, 10s prep.
 * Matches the classic Tabata protocol.
 */
export const CLASSIC_TABATA_PRESET: IntervalTimerConfig = {
  title: 'Classic Tabata',
  preset: 'CLASSIC_TABATA',
  prepareSec: 10,
  workSec: 20,
  restSec: 10,
  rounds: 8,
  sets: 1,
  restBetweenSetsSec: 60,
  intervals: [],
};

/**
 * Lightweight summary attached to each entry returned by the calendar list
 * endpoint, so clients can render "Today" cards without a full template fetch.
 */
export interface WorkoutInstanceSummary {
  title: string;
  type?: string;
  estimatedDuration?: number;
  itemCount: number;
  blockKinds: WorkoutBlockKind[];
  primaryMuscleGroups?: string[];
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
  /** Lightweight template summary attached by the calendar endpoint. */
  summary?: WorkoutInstanceSummary;
}
