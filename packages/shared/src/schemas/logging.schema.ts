import { z } from 'zod';

const setLogSchema = z.object({
  itemId: z.string(),
  setNumber: z.number().int().min(1),
  reps: z.number().min(0).optional(),
  weight: z.number().min(0).optional(),
  time: z.number().min(0).optional(),
  distance: z.number().min(0).optional(),
  calories: z.number().min(0).optional(),
  restSeconds: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const createWorkoutLogSchema = z.object({
  workoutInstanceId: z.string(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional(),
  perceivedExertion: z.number().int().min(1).max(10).optional(),
  clientNotes: z.string().max(2000).optional(),
  sets: z.array(setLogSchema).min(1),
});

export const addCoachFeedbackSchema = z.object({
  coachFeedback: z.string().min(1).max(5000),
});

export type CreateWorkoutLogInput = z.infer<typeof createWorkoutLogSchema>;
export type AddCoachFeedbackInput = z.infer<typeof addCoachFeedbackSchema>;
