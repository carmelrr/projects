# Module: Clients

**Phase:** MVP
**Effort estimate:** 3–4 person-weeks

---

## Responsibility

Manages client profiles, onboarding invites, coach-client assignments, status management (active/paused/archived), and the "client list" view for coaches.

---

## Key Files

```
apps/api/src/modules/clients/
├── clients.module.ts
├── clients.controller.ts
├── clients.service.ts
├── assignments.service.ts
└── dto/
    ├── create-client.dto.ts
    ├── update-client.dto.ts
    └── assign-coach.dto.ts
```

---

## Core Logic

### Client Creation + Invite Flow

```
POST /clients
{ email, firstName, lastName, coachId?, programId? }

1. Create User record (status: PENDING)
2. Create ClientProfile record (status: ACTIVE, orgId)
3. Create ClientAssignment (coachId)
4. Generate invite token (JWT, 7-day expiry, purpose: "client_invite")
5. Send invite email with link: {WEB_URL}/accept-invite?token=...
6. Optionally: assign program immediately

Client accepts invite:
GET /auth/accept-invite?token=...
→ Redirects to onboarding flow (set password, complete profile)
```

### Client Status Transitions

```
ACTIVE → PAUSED      POST /clients/:id/pause
ACTIVE → ARCHIVED    POST /clients/:id/archive
PAUSED → ACTIVE      POST /clients/:id/restore
ARCHIVED → ACTIVE    POST /clients/:id/restore
```

On archive:
- Sets `archivedAt` timestamp
- Removes client from active workout scheduling
- Messages history preserved

### Coach Scoping (RBAC)

```typescript
// In ClientsService.findAll()
if (user.role === OrgRole.COACH) {
  where.assignments = {
    some: {
      coachId: user.coachProfileId,
      status: AssignmentStatus.ACTIVE,
    }
  };
}
```

---

## Client List Filters

| Filter | Implementation |
|---|---|
| `status` | `ClientProfile.status` enum filter |
| `coachId` | Assignment filter |
| `needsAttention` | `ComplianceSummary.needsAttention = true` |
| `search` | Full-text on firstName + lastName (Postgres `ILIKE`) |
| `sort` | `lastName`, `lastActivity`, `complianceRate` |

---

## Web UI: Client List

Each card shows:
- Avatar + name
- Assigned coach
- Last workout date
- 7-day compliance %
- "Needs attention" badge
- Status badge (Active/Paused/Archived)

Filters: status dropdown, coach filter, search bar.

---

## Web UI: Client Detail Tabs

1. **Overview** — goals, notes, coach assignment, next workout
2. **Calendar** — workout schedule + log history
3. **Metrics** — graphs for custom metrics
4. **Compliance** — 7/30/90 trend chart
5. **Habits** — habit completion calendar
6. **Nutrition** — daily macro log
7. **Assessments** — assessment history
8. **Messages** — embedded chat thread
9. **Documents** — intake forms, waivers

---

## Mobile: Client Onboarding Flow

```
Screen 1: Welcome + accept invite
Screen 2: Set password
Screen 3: Profile photo + date of birth (optional)
Screen 4: Goals (free text)
Screen 5: "You're all set" → redirect to Today tab
```

---

## Compliance Summary Integration

When a client's workout log is submitted, a `ComplianceUpdateJob` is queued:
1. Count scheduled workouts in last 7/30/90 days
2. Count completed workouts in same period
3. Calculate rate = completed / scheduled
4. If rate dropped ≥20% from previous period → set `needsAttention = true`
5. Upsert `ComplianceSummary` record

---

## Notes on Multi-Coach Assignment

- A client can have only ONE active coach assignment at a time
- Reassigning: end current assignment (`endAt = now()`), create new one
- History of all assignments is preserved for audit
