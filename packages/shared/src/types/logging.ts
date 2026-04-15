export interface WorkoutLogDTO {
  id: string;
  clientId: string;
  workoutInstanceId: string;
  startedAt: string;
  finishedAt?: string;
  perceivedExertion?: number;
  clientNotes?: string;
  coachFeedback?: string;
  sets: SetLogDTO[];
}

export interface SetLogDTO {
  id: string;
  itemId: string;
  setNumber: number;
  reps?: number;
  weight?: number;
  time?: number;
  distance?: number;
  calories?: number;
  rpe?: number;
  notes?: string;
}
