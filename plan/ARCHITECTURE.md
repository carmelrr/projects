# System Architecture

## High-Level Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Mobile App  │  │ Web Dashboard│  │     Admin Panel        │ │
│  │ (Expo RN)    │  │  (Next.js)   │  │     (Next.js)          │ │
│  │ iOS/Android  │  │ Coach + Web  │  │   Org mgmt, audit      │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────────┘ │
└─────────┼─────────────────┼────────────────────-┼───────────────┘
          │                 │                      │
          └─────────────────┼──────────────────────┘
                            │ HTTPS / WSS
                    ┌───────▼────────┐
                    │  Cloudflare    │
                    │  CDN + WAF     │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │   NestJS API   │
                    │  (REST + WS)   │
                    │   Port 3001    │
                    └───┬────────┬───┘
                        │        │
             ┌──────────┘        └──────────┐
             │                              │
    ┌────────▼─────────┐        ┌───────────▼──────────┐
    │   PostgreSQL 16  │        │      Redis 7          │
    │   (Primary DB)   │        │ (Cache + Pub/Sub      │
    │   Prisma ORM     │        │  + BullMQ queues)     │
    └──────────────────┘        └──────────────────────┘

                     BACKGROUND WORKERS
                    ┌──────────────────┐
                    │  BullMQ Workers  │
                    │ - Video transcode│
                    │ - Push notifs    │
                    │ - Compliance jobs│
                    │ - Email queue    │
                    │ - Cleanup jobs   │
                    └───────┬──────────┘
                            │
              ┌─────────────┼──────────────┐
              │             │              │
    ┌─────────▼──┐  ┌───────▼───┐  ┌──────▼───────┐
    │ Cloudflare │  │  Resend   │  │ Expo Push    │
    │  R2 + CDN  │  │  (Email)  │  │ (APNs/FCM)   │
    │  + Stream  │  └───────────┘  └──────────────┘
    └────────────┘
```

---

## Application Boundaries

### 1. Mobile App (Expo React Native)

**Primary users:** Clients (athletes) + Coaches (when away from desk)

**Responsibilities:**
- View today's workout and full calendar
- Log sets/reps/weight/time/RPE
- Watch exercise demo videos
- Chat with coach, receive voice notes
- Track habits and nutrition
- View progress metrics and graphs
- Upload workout photos/videos
- Receive push notifications
- Offline-first workout logging (sync when reconnected)

**Offline strategy:** SQLite (via expo-sqlite) stores pending logs locally. TanStack Query handles background sync. Conflict resolution: last-write-wins with timestamp metadata.

---

### 2. Web Dashboard (Next.js)

**Primary users:** Coaches

**Responsibilities:**
- Full program/workout builder (calendar drag-and-drop)
- Exercise library management
- Client list with compliance overview
- View client logs, metrics, progress photos
- Chat and voice note review
- Assessments and check-ins
- Habit and nutrition review
- "Needs Attention" dashboard alerts

---

### 3. Admin Panel (Next.js — same app, different route group)

**Primary users:** App owner/admin

**Responsibilities:**
- User and org management
- Role assignments
- System settings
- Audit log viewer
- Integration status
- Data export / privacy requests

---

### 4. NestJS API (Modular Monolith)

Each feature domain is a self-contained NestJS module:

```
src/
  modules/
    auth/           → JWT, sessions, MFA, OAuth
    users/          → User profiles, roles
    organizations/  → Org settings, multi-tenant
    clients/        → Client profiles, assignments, onboarding
    programs/       → Programs, program weeks
    workouts/       → Workout templates, instances, items
    exercises/      → Exercise catalog, media
    logging/        → Workout logs, set logs
    messaging/      → Threads, messages, voice notes
    metrics/        → Metric definitions, entries, compliance
    habits/         → Habit definitions, entries
    nutrition/      → Nutrition goals, entries
    assessments/    → Assessment templates, sessions, items
    notifications/  → Push, email, in-app delivery
    media/          → Upload URLs, storage, CDN
    admin/          → Audit logs, system config
    health/         → Health check endpoint
```

**Cross-cutting concerns (implemented as NestJS interceptors/guards/pipes):**
- `AuthGuard` — validates JWT on every protected route
- `RolesGuard` — checks RBAC permissions
- `OrgScopeInterceptor` — injects org_id into all queries (multi-tenant isolation)
- `ValidationPipe` — Zod/class-validator input validation
- `LoggingInterceptor` — request/response logging (pino)
- `SentryInterceptor` — error reporting
- `ThrottlerGuard` — rate limiting

---

## Data Flow: Workout Log (Critical Path)

```
1. Client opens workout in mobile app
   └── GET /workouts/instances/:id (REST)
       └── Prisma: workout_instances + workout_items + exercises + exercise_media

2. Client logs sets offline (SQLite queue)
   └── Creates pending WorkoutLog record locally

3. App reconnects → flushes offline queue
   └── POST /logging/workout-logs (REST)
       ├── Prisma: create workout_log + set_logs
       ├── BullMQ: enqueue ComplianceUpdateJob
       └── BullMQ: enqueue NotifyCoachJob

4. ComplianceUpdateJob (worker)
   └── Recalculates client compliance % (7/30/90 day)
   └── If drop > 20% → create "Needs Attention" alert

5. NotifyCoachJob (worker)
   └── Expo Push API → coach mobile notification
   └── Socket.io emit → if coach has web dashboard open

6. Coach responds with voice note
   └── POST /media/upload-url → presigned R2 URL
   └── Coach uploads audio to R2 directly
   └── POST /messaging/messages { attachment: voice_note_key }
       └── Socket.io: emit to client's room
       └── BullMQ: enqueue PushNotificationJob for client
```

---

## Real-time Architecture (Socket.io)

```
Namespaces:
  /messaging   → Chat threads, message delivery, read receipts
  /activity    → Live "client submitted log" events for coach dashboard

Rooms:
  user:{user_id}         → Personal notifications
  thread:{thread_id}     → Chat room for a specific thread
  org:{org_id}:dashboard → Coach dashboard live updates
```

Authentication: JWT token passed as Socket.io handshake auth parameter.

---

## Media Upload Flow

```
Client/Coach App
     │
     ├── 1. POST /media/upload-url
     │        { file_type, content_type, context }
     │        → Returns { upload_url, storage_key }
     │
     ├── 2. PUT {upload_url} (direct to Cloudflare R2)
     │        ← Bypasses API server entirely
     │
     └── 3. POST /media/confirm
              { storage_key }
              → Creates media_asset record in DB
              → Enqueues TranscodeJob (for video)
```

**Signed viewing URLs:** All media is private by default. When the app requests a resource, the API generates a time-limited signed URL (1 hour expiry for videos, 15 min for sensitive docs).

---

## Multi-tenant Strategy

Every database table has an `org_id` foreign key (except system-level tables like `exercises`).

The `OrgScopeInterceptor` extracts `org_id` from the authenticated user's JWT claim and injects it into every Prisma query's `where` clause, ensuring coaches cannot read data from other organizations.

For personal use (single org), this is transparent — the system simply operates with one org_id throughout.

---

## Background Jobs (BullMQ Queues)

| Queue | Triggers | Worker Action |
|---|---|---|
| `video-transcode` | media confirmed | Send to Cloudflare Stream, update media_asset |
| `push-notifications` | log submitted, message received, compliance drop | Expo Push API call |
| `email-notifications` | invite sent, daily digest, compliance alert | Resend API call |
| `compliance-update` | workout log created/updated | Recalculate 7/30/90 compliance, set needs_attention flag |
| `media-cleanup` | soft-deleted assets after retention period | Delete from R2 |
| `habit-reminder` | daily cron | Check habit completion, push reminder |
| `weekly-digest` | weekly cron | Aggregate compliance + metrics summary → push/email |

---

## Error Handling Strategy

1. **Validation errors (400)** — Zod schemas at API boundary, consistent `{ errors: [...] }` shape
2. **Auth errors (401/403)** — AuthGuard + RolesGuard throw standard NestJS exceptions
3. **Not found (404)** — Service layer throws `NotFoundException`
4. **Rate limits (429)** — ThrottlerGuard with per-user limits
5. **Server errors (500)** — Sentry captures + structured pino log with request context
6. **Offline queue errors** — BullMQ retries with exponential backoff (max 3 attempts), then moves to dead-letter queue with alerting
