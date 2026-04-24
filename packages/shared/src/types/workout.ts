export interface WorkoutPrescription {
  sets?: number;
  reps?: string; // "8-10" or "12"
  weight?: { type: 'absolute' | 'percentage_1rm' | 'rpe_target'; value: number };
  tempo?: string; // "3-1-1-0"
  rest?: number; // seconds
  duration?: number; // seconds
  timeMode?: 'STOPWATCH' | 'COUNTDOWN';
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
