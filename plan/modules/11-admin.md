# Module: Admin Panel

**Phase:** MVP (basic), Growth (data export), Scale (advanced RBAC)
**Effort estimate:** 2–3 person-weeks

---

## Responsibility

System administration: user management, role assignments, org settings, audit log viewer, and data export. For personal use this is primarily the "backstage" panel for managing the app.

---

## Key Files

```
apps/api/src/modules/admin/
├── admin.module.ts
├── admin.controller.ts
├── admin.service.ts

apps/web/app/(admin)/
├── layout.tsx           # Admin-only sidebar layout
├── admin/
│   ├── page.tsx         # Overview / stats
│   ├── users/
│   │   └── page.tsx     # User list + management
│   ├── audit-logs/
│   │   └── page.tsx     # Audit log viewer
│   └── settings/
│       └── page.tsx     # Org settings
```

---

## Access Control

All admin routes require:
- Valid JWT
- `role === OrgRole.OWNER` (for destructive actions)
- `role === OrgRole.ADMIN_COACH` (for read-only admin views)

NestJS guard:
```typescript
@Roles(OrgRole.OWNER)
@Get('/admin/audit-logs')
```

---

## User Management

```
GET /admin/users
→ All users in org, with role, status, lastLoginAt, clientCount (for coaches)

PATCH /admin/users/:userId/status
{ status: "SUSPENDED" | "ACTIVE" }
→ Suspends user (they cannot log in)
→ Written to audit_log

DELETE /admin/users/:userId
→ Soft delete (anonymize PII, keep training data)
→ Requires OWNER role
```

---

## Audit Log Viewer

```
GET /admin/audit-logs
  ?actor=userId
  &action=client.archive
  &from=2026-01-01
  &to=2026-05-01
  &page=1
  &limit=50

Returns:
[{
  id, action, actorName, targetType, targetId,
  metadata, ipAddress, createdAt
}]
```

UI: Table with filters. Sortable by date. Action filter as dropdown with all known action types.

---

## Org Settings

```
PATCH /orgs/:orgId
{
  name: "My Coaching App",
  timezone: "Asia/Jerusalem",
  brandingTheme: {
    primaryColor: "#2563EB",
    accentColor: "#16A34A"
  }
}
```

Settings page sections:
1. **General** — org name, timezone
2. **Branding** — logo upload, color theme
3. **Security** — force MFA for all coaches, session timeout
4. **Integrations** — view connected integrations (Growth/Scale)

---

## Data Export (Growth Phase)

```
POST /admin/export/client/:clientId
→ Enqueues export job
→ Returns { jobId }

GET /admin/export/:jobId/status
→ { status: "processing" | "ready", downloadUrl? }
```

Export contains (ZIP file):
```
client_export_SarahChen_2026-05-01.zip
├── profile.json          # Client profile data
├── workout_logs.json     # All workout logs + set data
├── metrics.json          # All metric entries
├── nutrition.json        # Nutrition entries
├── habits.json           # Habit entries
├── messages.json         # Message history (text only)
├── assessments.json      # Assessment data
└── README.txt            # Format explanation
```

Media files (videos/photos) are referenced by URL in the JSON but not included in the ZIP by default (too large). A separate export with media links can be generated on request.

---

## System Health

```
GET /health

Returns:
{
  status: "ok",
  db: "ok",
  redis: "ok",
  queue: "ok",
  storage: "ok",
  timestamp: "2026-05-01T10:00:00Z"
}
```

Used for monitoring/uptime checks.

---

## Audit Actions Reference

All actions written to `audit_logs`:

| Action | Description |
|---|---|
| `user.login` | Successful login |
| `user.login_failed` | Failed login attempt |
| `user.password_change` | Password changed |
| `user.mfa_enabled` | MFA turned on |
| `user.status_change` | User suspended/activated |
| `client.create` | New client added |
| `client.archive` | Client archived |
| `client.delete` | Client deleted |
| `coach.assign` | Coach assigned to client |
| `program.assign` | Program assigned to client |
| `role.change` | User role changed |
| `data.export` | Client data exported |
| `org.settings_change` | Org settings updated |
| `media.delete` | Media asset deleted |
| `session.revoke` | Session revoked |
