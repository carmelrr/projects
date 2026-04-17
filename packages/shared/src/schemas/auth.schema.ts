import { z } from 'zod';

// POST /auth/sync â€” called after Firebase login/register
export const syncUserSchema = z.object({
  firebaseUid: z.string().min(1),
  email: z.string().email(),
});

// POST /auth/register â€” called after Firebase createUser, creates org + profile
export const registerSchema = z.object({
  firebaseUid: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  orgName: z.string().min(1).max(200),
});

// POST /auth/accept-invite â€” called after Firebase createUser on invite flow
export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  firebaseUid: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});

// POST /auth/invite-coach
export const inviteCoachSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['COACH', 'ADMIN_COACH']).default('COACH'),
});

export type SyncUserInput = z.infer<typeof syncUserSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type InviteCoachInput = z.infer<typeof inviteCoachSchema>;