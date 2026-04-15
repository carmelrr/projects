import { z } from 'zod';

export const createThreadSchema = z.object({
  participantIds: z.array(z.string()).min(1),
  type: z.enum(['DIRECT', 'GROUP']).default('DIRECT'),
  title: z.string().max(200).optional(),
});

export const sendMessageSchema = z.object({
  body: z.string().max(10000).optional(),
  messageType: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'VOICE_NOTE', 'GIF', 'DOCUMENT']).default('TEXT'),
  assetId: z.string().optional(),
  replyToId: z.string().optional(),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
