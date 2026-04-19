# Fitness Coaching App — Planning Documentation

A personal TrueCoach-style remote coaching platform. No payment processing required (personal use only).

---

## Document Index

| File | Description |
|---|---|
| [TECH_STACK.md](./TECH_STACK.md) | Technology choices and justification for every layer |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, diagrams, service boundaries |
| [FILE_STRUCTURE.md](./FILE_STRUCTURE.md) | Full monorepo folder/file structure |
| [DATA_MODEL.md](./DATA_MODEL.md) | Complete relational database schema (PostgreSQL) |
| [API_DESIGN.md](./API_DESIGN.md) | REST API endpoints per domain module |
| [FEATURES.md](./FEATURES.md) | Feature list by role and development phase |
| [PERMISSIONS.md](./PERMISSIONS.md) | RBAC roles and permission matrix |
| [SECURITY.md](./SECURITY.md) | Auth, security, and privacy guidelines |
| [ROADMAP.md](./ROADMAP.md) | Development phases, priorities, effort estimates |

### Module Planning Files

| File | Domain |
|---|---|
| [modules/01-auth.md](./modules/01-auth.md) | Authentication, sessions, MFA |
| [modules/02-clients.md](./modules/02-clients.md) | Client profiles, onboarding, assignments |
| [modules/03-programs-workouts.md](./modules/03-programs-workouts.md) | Program builder, workout builder, calendar |
| [modules/04-exercise-library.md](./modules/04-exercise-library.md) | Exercise catalog, video library, media upload |
| [modules/05-workout-logging.md](./modules/05-workout-logging.md) | Client workout logging, offline sync |
| [modules/06-messaging.md](./modules/06-messaging.md) | In-app chat, voice notes, group messages |
| [modules/07-metrics-compliance.md](./modules/07-metrics-compliance.md) | Custom metrics, compliance tracking, graphs |
| [modules/08-nutrition-habits.md](./modules/08-nutrition-habits.md) | Habit tracking, nutrition goals, macros |
| [modules/09-notifications.md](./modules/09-notifications.md) | Push, in-app, and email notifications |
| [modules/10-assessments.md](./modules/10-assessments.md) | Check-ins, assessments, video feedback |
| [modules/11-admin.md](./modules/11-admin.md) | Admin panel, org management, audit logs |

---

## Product Summary

A full end-to-end remote coaching platform inspired by TrueCoach. The system serves four primary actors:

- **Coach** — builds programs, assigns workouts, reviews logs, gives feedback
- **Client/Athlete** — views schedule, logs workouts, tracks progress, chats with coach
- **Admin** — manages users, roles, org settings, audit
- **System** — compliance alerts, notifications, media processing, background jobs

### Core Principles

1. **Speed for the coach** — minimum friction to build and assign workouts
2. **Library-first** — reusable exercises, programs, metrics, and documents
3. **Feedback in context** — messages, voice notes, and reactions attached to specific workouts/logs
4. **Offline resilience** — no lost workout logs due to poor connectivity
5. **Privacy by design** — scoped data access, encrypted media, audit trails

### Phases

| Phase | Scope |
|---|---|
| **MVP** | Auth, clients, program/workout builder, client app logging, exercise library, messaging, notifications, basic metrics |
| **Growth** | Compliance alerts, check-ins/assessments, habit tracking, nutrition, group messaging, voice notes |
| **Scale** | Team accounts, wearables, automation/webhooks, advanced analytics, public coach profile |
