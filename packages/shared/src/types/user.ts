export interface JwtPayload {
  sub: string; // userId
  email: string;
  orgId: string;
  role: string;
  coachProfileId?: string;
  clientProfileId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// RegisterInput and LoginInput are exported from schemas/auth.schema.ts (Zod-inferred)
