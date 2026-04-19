# Module: Auth & Sessions

**Phase:** MVP
**Effort estimate:** 3–4 person-weeks

---

## Responsibility

Handles user identity, authentication, session lifecycle, and MFA. No business domain logic — purely identity infrastructure.

---

## Key Files

```
apps/api/src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── jwt.strategy.ts          # Validates Bearer token, sets req.user
│   └── local.strategy.ts        # Validates email + password
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts
│   └── reset-password.dto.ts
└── auth.types.ts                # AuthUser interface used across app
```

---

## Flows

### Registration
```
POST /auth/register
{ email, password, firstName, lastName, inviteToken? }

1. Validate invite token if present (links to org + role)
2. Check email not already in use
3. Hash password (bcrypt, cost=12)
4. Create User record
5. If inviteToken: create UserOrganization + CoachProfile or ClientProfile
6. Generate access token + refresh token
7. Create Session record
8. Return { accessToken, refreshToken, user }
```

### Login
```
POST /auth/login
{ email, password }

1. LocalStrategy: find user by email, compare bcrypt hash
2. If MFA enabled: return { mfaRequired: true, mfaToken: <short-lived JWT> }
3. If no MFA (or MFA verified): generate access + refresh tokens
4. Create/update Session record (deviceName from User-Agent)
5. Return { accessToken, refreshToken, user }
```

### Token Refresh
```
POST /auth/refresh
{ refreshToken }

1. Look up Session by refreshToken
2. Check not expired
3. Rotate: delete old refresh token, create new one
4. Issue new access token
5. Return { accessToken, refreshToken }
```

### MFA (TOTP)
```
POST /auth/mfa/enable
→ Returns { secret, qrCodeUrl } for authenticator app setup

POST /auth/mfa/verify
{ code, secret } (during setup)  or  { code, mfaToken } (during login)
→ Verifies TOTP code via otplib
→ On setup: saves encrypted secret to user record, returns recovery codes
→ On login: issues full access + refresh tokens
```

---

## JWT Payload

```typescript
interface JwtPayload {
  sub: string;           // userId
  email: string;
  orgId: string;
  role: OrgRole;
  coachProfileId?: string;
  clientProfileId?: string;
}
```

Access token TTL: 15 minutes
Refresh token TTL: 30 days

---

## Guards

### JwtAuthGuard
Applied globally (with `@Public()` decorator for exceptions).
Verifies `Authorization: Bearer <token>`.
Sets `req.user` from JWT payload.

### WsJwtGuard
For Socket.io connections: reads token from `socket.handshake.auth.token`.

---

## Email Templates (via Resend)

| Trigger | Template |
|---|---|
| Registration | Welcome + email verification link |
| Password reset | Reset link (expires 1 hour) |
| New device login | "Login from new device" alert |
| MFA disabled | Security alert |

---

## Security Considerations

- bcrypt cost 12 minimum
- Refresh tokens never returned in URL params — always in JSON body
- Refresh tokens stored hashed in DB (SHA-256 of the opaque value)
- Login attempts rate-limited: 10 per 15 min per IP
- Password reset tokens: 256-bit random, 1-hour expiry, single-use
- TOTP secret stored encrypted at rest (AES-256, key from `AUTH_SECRET`)
