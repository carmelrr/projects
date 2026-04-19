# Development Roadmap

Effort estimates are in **person-weeks** (net development + basic testing). Assumes a single developer working full-time.

---

## Phase 1 — MVP (Weeks 1–18)

Target: A fully functional coach + client experience. One coach, multiple clients.

### Week 1–2: Project Setup & Foundations
- Monorepo scaffold (Turborepo + pnpm)
- Docker Compose (Postgres + Redis)
- NestJS app bootstrap with config, logging (pino), Swagger
- Next.js app scaffold (App Router, Tailwind, shadcn)
- Expo app scaffold (Expo Router, NativeWind)
- `packages/shared` with base types and Zod schemas
- `packages/database` with Prisma schema (auth tables, orgs, users)
- CI pipeline (GitHub Actions: lint, type-check, test)
- `.env.example` with all variables documented

**Deliverable:** All three apps boot, connect to DB, return health check.

### Week 3–4: Auth Module
- User registration + email/password login
- JWT access + refresh token flow
- Session management (list, revoke)
- Password reset email flow (Resend)
- TOTP MFA (enable, verify)
- Push token registration
- Auth screens in mobile + web login page

**Deliverable:** Full auth flow working end-to-end on web and mobile.

### Week 5–6: Organizations, Users, Clients
- Org creation + settings
- Coach profile
- Client profile creation + email invite flow
- Client list with basic filters
- Client detail page
- `ClientAssignment` — assign coach to client
- RBAC guards + role-scoped service queries

**Deliverable:** Coach can invite clients, view client list with role scoping.

### Week 7–10: Exercise Library + Program/Workout Builder
- System exercise catalog seed data (name, category, equipment, muscle groups)
- Exercise search API + web UI
- Custom exercise creation + video upload (R2 presigned URL flow)
- Video playback in library (Cloudflare Stream or signed R2 URL)
- Program template CRUD (weeks structure)
- Workout template CRUD (items, prescription JSONB)
- Drag-and-drop calendar builder in web (dnd-kit)
- Assign program / schedule individual workouts to clients

**Deliverable:** Coach can build a full multi-week program and assign it to a client.

### Week 11–13: Client Mobile App (Workout Logging)
- Calendar view (week strip + month)
- Workout detail screen (exercises, video demos, instructions)
- Set logger (tap to log reps/weight/time, RPE)
- Finish workout → create WorkoutLog + SetLogs
- Offline queue (SQLite → sync on reconnect)
- Progress shown (previous log values as reference)

**Deliverable:** Client can log a full workout offline and it syncs to the server.

### Week 14–15: Messaging
- 1:1 thread creation
- Message list (cursor-based pagination)
- Send text, images
- Socket.io real-time delivery (web + mobile)
- Unread count badge
- Push notification on new message

**Deliverable:** Real-time chat between coach and client on web + mobile.

### Week 16–17: Basic Metrics + Notifications
- Metric definition CRUD
- Metric entry logging (coach + client)
- Line chart visualization in web (Recharts)
- In-app notification center
- Push notifications: workout assigned, log submitted, message received
- Notification preferences settings

**Deliverable:** Metrics tracked, push notifications working end-to-end.

### Week 18: MVP Polish
- Coach dashboard "one-screen" overview
- Error handling and validation polish
- Loading states, empty states, offline UX
- Basic onboarding flow for new client (profile + goals)
- Internal testing + bug fixes

**Deliverable: MVP complete. Personal use starts here.**

---

## Phase 2 — Growth (Weeks 19–30)

Target: Deeper retention, engagement, and feedback tools.

### Week 19–20: Compliance & Needs Attention
- Compliance calculation job (BullMQ + nightly cron)
- 7/30/90-day compliance percentage API
- "Needs Attention" flag (20% drop threshold)
- Compliance bar charts on client cards
- "Needs Attention" section on coach dashboard
- Alert history

### Week 21–22: Voice Notes
- Audio recording in web (MediaRecorder API)
- Audio recording in mobile (expo-av)
- Upload voice note to R2
- Attach to messages and workout log comments
- Voice note player (waveform display optional)

### Week 23–24: Check-ins & Assessments
- Assessment template builder
- Create assessment for client
- Client fills in items (text/number/video)
- Coach scores and reviews
- Assessment history timeline

### Week 25–26: Habit Tracking
- Habit definition manager (coach)
- Client daily habit check-in screen (mobile)
- Habit streak visualization
- Habit completion included in compliance score

### Week 27–28: Nutrition Logging
- Nutrition goal setter (coach → client)
- Daily nutrition entry (mobile: macro log + subjective markers)
- Goal vs actual view with progress bars
- Weekly average chart

### Week 29–30: Progress Photos + Group Messaging
- Progress photo upload (mobile camera roll)
- Date-stamped photo gallery per client
- Side-by-side comparison UI
- Group thread creation
- Broadcast message to selected clients

---

## Phase 3 — Scale (Weeks 31–50)

Target: Multi-coach org management, third-party integrations, advanced analytics.

### Week 31–33: Team Accounts
- Org invite flow for additional coaches
- ADMIN_COACH role with full client visibility
- Coach load view (clients per coach)
- Client reassignment between coaches
- Org-wide shared library

### Week 34–36: Wearable Integrations (optional)
- Apple HealthKit (iOS) — steps, heart rate, sleep, HRV
- Garmin Health API — activity, sleep
- WHOOP — recovery, strain, sleep
- Auto-populate MetricEntries from wearable sync
- "Last synced" freshness indicator

### Week 37–38: Webhook Automation
- Outbound webhooks on key events (log submitted, compliance drop, etc.)
- Webhook management UI (endpoint URL + secret)
- Event delivery log + retry on failure
- Zapier integration endpoint

### Week 39–40: Advanced Analytics
- Coach retention dashboard (churn, WAU trends)
- Per-client analytics deep dive (activity heatmap, 1RM trend)
- Org-level KPI summary
- Export to CSV

### Week 41–42: Public Coach Profile (optional)
- Public URL for coach profile
- Leads can submit "application" form
- Auto-creates pending client profile

### Week 43–50: Performance, Reliability, UX Refinement
- Load testing (k6)
- DB query optimization (indexes, N+1 audits)
- Video CDN optimization
- Accessibility audit (WCAG 2.1 AA)
- Dark mode
- Push notification reliability improvements

---

## Priority Matrix

| Feature | Phase | Value | Effort | Priority |
|---|---|---|---|---|
| Auth + RBAC | MVP | Critical | Medium | P0 |
| Client management | MVP | Critical | Medium | P0 |
| Workout builder | MVP | Critical | High | P0 |
| Client app + logging | MVP | Critical | High | P0 |
| Exercise library + media | MVP | High | High | P0 |
| Messaging | MVP | High | Medium | P0 |
| Basic metrics | MVP | Medium | Medium | P1 |
| Push notifications | MVP | High | Medium | P1 |
| Compliance alerts | Growth | High | Medium | P1 |
| Voice notes | Growth | High | Medium | P1 |
| Assessments | Growth | High | High | P1 |
| Habit tracking | Growth | Medium | Medium | P2 |
| Nutrition logging | Growth | Medium | Medium | P2 |
| Progress photos | Growth | Medium | Low | P2 |
| Group messaging | Growth | Medium | Medium | P2 |
| Team accounts | Scale | High | High | P3 |
| Wearables | Scale | Medium | Very High | P4 |
| Webhooks/Zapier | Scale | Medium | Medium | P3 |
| Analytics dashboard | Scale | Medium | High | P4 |
