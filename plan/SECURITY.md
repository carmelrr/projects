# Security & Privacy Guidelines

---

## Authentication

**Token Strategy:**
- Access token: JWT, short-lived (15 minutes), signed with `JWT_ACCESS_SECRET`
- Refresh token: opaque random string (256-bit), stored in `sessions` table, 30-day expiry
- Refresh tokens are rotated on every use (sliding window)
- On logout: delete session record (invalidates refresh token immediately)

**Password storage:**
- bcrypt with minimum cost factor 12
- Never store plaintext; never log passwords

**MFA:**
- TOTP (RFC 6238) via `otplib`
- Required for OWNER and ADMIN_COACH roles (enforced on login)
- Recovery codes: 10 single-use codes, hashed in DB

**Session security:**
- Each device gets its own session record with device name + IP
- Users can view and revoke individual sessions
- Suspicious login detection: alert if login from new country/device

---

## API Security

**Rate Limiting (NestJS ThrottlerGuard):**

| Endpoint | Limit |
|---|---|
| POST /auth/login | 10 req / 15 min per IP |
| POST /auth/forgot-password | 3 req / hour per email |
| POST /auth/register | 5 req / hour per IP |
| All other endpoints | 100 req / min per user |

**Input Validation:**
- All request bodies validated through Zod schemas (shared package)
- `ValidationPipe` applied globally — rejects unknown fields
- File uploads: validate MIME type server-side (not just extension)

**Authorization:**
- `AuthGuard` on every protected route (JWT verification)
- `RolesGuard` checks role from JWT claim
- Resource-level ownership checks in service layer (not just guards)
- No reliance on client-supplied `orgId` — always taken from JWT

**SQL Injection:**
- Prisma uses parameterized queries by default — no raw SQL without explicit `$queryRaw` and tagged template literals

**CORS:**
- Restrict origins to known app URLs (`WEB_URL`, `MOBILE_URL`)
- No wildcard `*` in production

**HTTPS:**
- TLS 1.2+ enforced at the CDN/load balancer layer
- HSTS header set

---

## Media Security

**Presigned upload URLs:**
- Generated with a short TTL (15 minutes)
- URL includes content-type restriction and max file size
- Client uploads directly to R2 — API server never handles file bytes

**Presigned view URLs:**
- All media stored as private in R2
- View URLs are signed, 1-hour expiry for videos, 15-minute for documents
- The API verifies the requesting user has permission to view before issuing a URL
- Never expose the raw R2 storage key to clients

**Video transcoding:**
- Videos uploaded to Cloudflare Stream via server-side API (not exposed to client)
- Signed URLs for Stream viewing

**File type allowlist:**
```
Images:   image/jpeg, image/png, image/webp, image/gif
Video:    video/mp4, video/quicktime, video/webm
Audio:    audio/mpeg, audio/mp4, audio/webm (voice notes)
Document: application/pdf
```

---

## Data Privacy

**Data minimization:**
- Only collect data needed for the product
- `dob` and `medicalNotes` on ClientProfile are optional
- Health data (metrics, nutrition, wearables) stored per-org, access scoped

**Soft deletes and retention:**
- MediaAsset uses `deletedAt` — files not immediately deleted from R2
- Retention policy: purge from R2 after 30 days of soft delete
- Workout logs, messages retained per user request or org policy

**Data export (GDPR-style, even for personal use):**
- `GET /admin/export/client/:clientId` → generates ZIP with all client data
- Includes: profile, workout logs, messages, metrics, nutrition, assessments

**Audit logging:**
All sensitive actions are written to `audit_logs`:
- `client.archive`, `client.delete`
- `user.role_change`
- `data.export`
- `session.revoke`
- `admin.setting_change`
- `media.delete`

---

## Secrets Management

**Never commit secrets to git.**

Use `.env` files locally (gitignored) and environment variables in production.

```
# .gitignore must include:
.env
.env.local
.env.*.local
```

Rotate secrets:
- JWT secrets: rotate every 90 days
- R2 access keys: rotate every 180 days
- Any compromised secret: rotate immediately and invalidate all active sessions

---

## Dependencies

- Pin dependency versions in `package.json` (use `=` not `^` for production)
- Run `pnpm audit` in CI pipeline — fail on high/critical vulnerabilities
- `dependabot` or `renovate` for automated dependency updates

---

## OWASP Top 10 Coverage

| Risk | Mitigation |
|---|---|
| A01 Broken Access Control | RolesGuard + resource ownership checks in service layer |
| A02 Cryptographic Failures | bcrypt passwords, HTTPS everywhere, signed media URLs |
| A03 Injection | Prisma parameterized queries, Zod validation |
| A04 Insecure Design | RBAC from design, audit logs, minimal data collection |
| A05 Security Misconfiguration | CORS whitelist, no debug in prod, env var management |
| A06 Vulnerable Components | `pnpm audit` in CI, Dependabot |
| A07 Auth Failures | Short-lived JWTs, refresh rotation, MFA for admins |
| A08 Software & Data Integrity | Checksums on media assets, signed upload URLs |
| A09 Logging & Monitoring | Pino structured logs, Sentry, audit_logs table |
| A10 SSRF | No user-controlled URL fetching in API |

---

## Mobile-Specific Security (OWASP MASVS)

**Local Storage:**
- Sensitive data (tokens) stored in SecureStore (Expo), not AsyncStorage
- Workout logs cached in SQLite (non-sensitive, no auth tokens)

**Certificate Pinning:**
- Optional for high-security environments
- Expo supports via custom `fetch` or `axios` adapter

**Root/Jailbreak Detection:**
- Not required for personal use, but can add `expo-device` checks as an advisory warning

**Code obfuscation:**
- Expo EAS Build with `metro` minification in production
- Business logic stays server-side
