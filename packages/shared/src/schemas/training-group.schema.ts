import { z } from 'zod';

export const createTrainingGroupSchema = z.object({
  name: z.string().min(1).max(120),
  coachId: z.string().min(1),
  memberClientUserIds: z.array(z.string().min(1)).max(200).optional().default([]),
  description: z.string().max(1000).optional(),
});

export const updateTrainingGroupSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  coachId: z.string().min(1).optional(),
  description: z.string().max(1000).nullable().optional(),
});

export const addTrainingGroupMembersSchema = z.object({
  clientUserIds: z.array(z.string().min(1)).min(1).max(200),
});

export const assignTrainingGroupProgramSchema = z.object({
  programId: z.string().min(1),
  startDate: z.string().datetime(),
});

export type CreateTrainingGroupInput = z.infer<typeof createTrainingGroupSchema>;
export type UpdateTrainingGroupInput = z.infer<typeof updateTrainingGroupSchema>;
export type AddTrainingGroupMembersInput = z.infer<typeof addTrainingGroupMembersSchema>;
export type AssignTrainingGroupProgramInput = z.infer<typeof assignTrainingGroupProgramSchema>;