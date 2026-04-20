export interface ProgramTemplateDTO {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  tags: string[];
  weeks: ProgramWeekDTO[];
}

export interface ProgramWeekDTO {
  id: string;
  weekIndex: number;
  title?: string;
  notes?: string;
  /** Ordered list of workout template IDs that belong to this week. */
  workoutIds: string[];
  /**
   * Parallel array with `workoutIds`: preferred day-of-week for each workout
   * when the program is assigned (0 = Sunday … 6 = Saturday). `null` means
   * "no preferred day" and falls back to sequential placement starting from
   * the assignment's start date.
   */
  workoutDays?: (DayOfWeek | null)[];
}

/** 0 = Sunday, 1 = Monday … 6 = Saturday. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ProgramAssignmentStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PAUSED';

export interface ProgramAssignmentDTO {
  id: string;
  programId: string;
  clientUserId: string;
  /** ISO date (YYYY-MM-DD). */
  startDate: string;
  status: ProgramAssignmentStatus;
  assignedBy?: string;
  createdAt?: string;
}
