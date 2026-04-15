export interface WorkoutPrescription {
  sets?: number;
  reps?: string; // "8-10" or "12"
  weight?: { type: 'absolute' | 'percentage_1rm' | 'rpe_target'; value: number };
  tempo?: string; // "3-1-1-0"
  rest?: number; // seconds
  rpe?: number;
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
