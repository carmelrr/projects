import { z } from 'zod';

export const createMetricDefinitionSchema = z.object({
  name: z.string().min(1).max(200),
  unit: z.string().min(1).max(50),
  targetType: z.enum(['HIGHER_IS_BETTER', 'LOWER_IS_BETTER', 'TARGET_VALUE']).default('HIGHER_IS_BETTER'),
  frequency: z.string().max(50).optional(),
});

export const logMetricEntrySchema = z.object({
  metricId: z.string(),
  value: z.number(),
  notes: z.string().max(1000).optional(),
  capturedAt: z.string().datetime().optional(),
});

export type CreateMetricDefinitionInput = z.infer<typeof createMetricDefinitionSchema>;
export type LogMetricEntryInput = z.infer<typeof logMetricEntrySchema>;
