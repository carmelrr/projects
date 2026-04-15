import { z } from 'zod';

export const createWorkoutSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum([
    'STRENGTH', 'HIIT', 'AMRAP', 'EMOM', 'FOR_TIME', 'CARDIO', 'MOBILITY', 'ASSESSMENT', 'CUSTOM',
  ]),
  estimatedDuration: z.number().int().min(1).max(480).optional(),
  instructions: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  items: z.array(z.object({
    exerciseId: z.string(),
    orderIndex: z.number().int().min(0),
    groupLabel: z.string().max(10).optional(),
    prescription: z.record(z.unknown()),
    coachNotes: z.string().max(2000).optional(),
  })).optional(),
});

export const scheduleWorkoutSchema = z.object({
  clientId: z.string(),
  templateId: z.string(),
  scheduledDate: z.string().datetime(),
  notes: z.string().max(2000).optional(),
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type ScheduleWorkoutInput = z.infer<typeof scheduleWorkoutSchema>;
