# Full Codebase File Structure

Monorepo managed with **Turborepo + pnpm workspaces**.

---

## Root

```
/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint, type-check, test on PR
│       └── deploy.yml          # Deploy on merge to main
├── apps/
│   ├── api/                    # NestJS backend
│   ├── web/                    # Next.js web dashboard (coach + admin)
│   └── mobile/                 # Expo React Native app
├── packages/
│   ├── shared/                 # Shared TypeScript types + Zod schemas
│   ├── ui/                     # Shared React component library
│   └── database/               # Prisma schema + seed + migrations
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml  # Local dev: postgres, redis
│   │   └── Dockerfile.api      # API production image
│   └── scripts/
│       ├── seed.ts             # DB seed script
│       └── reset-db.ts         # Dev DB reset
├── .env.example                # All env vars documented
├── .eslintrc.js                # Root ESLint config
├── .prettierrc                 # Prettier config
├── tsconfig.base.json          # Base TypeScript config
├── turbo.json                  # Turborepo pipeline
├── pnpm-workspace.yaml         # pnpm workspace definition
└── package.json                # Root scripts
```

---

## packages/shared

Shared TypeScript types and Zod validation schemas. Used by `api`, `web`, and `mobile`.

```
packages/shared/
├── src/
│   ├── types/
│   │   ├── user.ts             # User, CoachProfile, ClientProfile
│   │   ├── org.ts              # Organization, Role, Permission
│   │   ├── workout.ts          # WorkoutTemplate, WorkoutInstance, WorkoutItem
│   │   ├── program.ts          # ProgramTemplate, ProgramWeek
│   │   ├── exercise.ts         # Exercise, ExerciseMedia
│   │   ├── logging.ts          # WorkoutLog, SetLog
│   │   ├── messaging.ts        # MessageThread, Message
│   │   ├── metrics.ts          # MetricDefinition, MetricEntry, ComplianceSummary
│   │   ├── habits.ts           # HabitDefinition, HabitEntry
│   │   ├── nutrition.ts        # NutritionGoal, NutritionEntry
│   │   ├── assessment.ts       # Assessment, AssessmentItem
│   │   ├── notification.ts     # Notification, NotificationType
│   │   ├── media.ts            # MediaAsset, UploadUrlRequest
│   │   └── index.ts
│   ├── schemas/                # Zod schemas for request validation
│   │   ├── auth.schema.ts
│   │   ├── workout.schema.ts
│   │   ├── logging.schema.ts
│   │   ├── messaging.schema.ts
│   │   ├── metrics.schema.ts
│   │   └── index.ts
│   ├── constants/
│   │   ├── roles.ts            # Role enum: OWNER, ADMIN_COACH, COACH, CLIENT
│   │   ├── permissions.ts      # Permission keys enum
│   │   ├── workout-types.ts    # STRENGTH, HIIT, AMRAP, EMOM, etc.
│   │   └── index.ts
│   └── utils/
│       ├── compliance.ts       # Compliance % calculation logic
│       ├── dates.ts            # Date helpers
│       └── index.ts
├── package.json
└── tsconfig.json
```

---

## packages/database

Prisma schema and migrations.

```
packages/database/
├── prisma/
│   ├── schema.prisma           # Full DB schema (see DATA_MODEL.md)
│   ├── migrations/             # Auto-generated migration files
│   └── seed.ts                 # Seed: system exercises, default roles
├── src/
│   └── index.ts                # PrismaClient singleton export
├── package.json
└── tsconfig.json
```

---

## packages/ui

Shared headless component library. Used by `web` (Next.js). Mobile uses its own NativeWind components.

```
packages/ui/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   └── index.ts
│   │   ├── Card/
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── Modal/
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   ├── Calendar/
│   │   │   └── WeekCalendar.tsx  # Workout calendar grid
│   │   ├── Charts/
│   │   │   ├── MetricLineChart.tsx
│   │   │   └── ComplianceBar.tsx
│   │   ├── VideoPlayer/
│   │   └── index.ts
│   └── styles/
│       └── globals.css
├── package.json
└── tsconfig.json
```

---

## apps/api (NestJS)

```
apps/api/
├── src/
│   ├── main.ts                         # Bootstrap + Swagger setup
│   ├── app.module.ts                   # Root module, imports all feature modules
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── storage.config.ts
│   │   └── index.ts
│   ├── common/
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── ws-jwt.guard.ts         # WebSocket auth guard
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── org-scope.decorator.ts
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── sentry.interceptor.ts
│   │   │   └── transform.interceptor.ts  # Wrap responses in { data, meta }
│   │   ├── filters/
│   │   │   └── all-exceptions.filter.ts
│   │   ├── pipes/
│   │   │   └── zod-validation.pipe.ts
│   │   └── utils/
│   │       ├── pagination.ts
│   │       └── signed-url.ts           # Generate R2 signed URLs
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts      # POST /auth/login, register, refresh, logout
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── local.strategy.ts
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── register.dto.ts
│   │   │   └── auth.types.ts
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts     # GET /users/me, PATCH /users/me
│   │   │   ├── users.service.ts
│   │   │   └── dto/
│   │   │       └── update-user.dto.ts
│   │   ├── organizations/
│   │   │   ├── organizations.module.ts
│   │   │   ├── organizations.controller.ts
│   │   │   ├── organizations.service.ts
│   │   │   └── dto/
│   │   ├── clients/
│   │   │   ├── clients.module.ts
│   │   │   ├── clients.controller.ts   # CRUD + archive + assignments
│   │   │   ├── clients.service.ts
│   │   │   ├── assignments.service.ts
│   │   │   └── dto/
│   │   │       ├── create-client.dto.ts
│   │   │       ├── update-client.dto.ts
│   │   │       └── assign-coach.dto.ts
│   │   ├── programs/
│   │   │   ├── programs.module.ts
│   │   │   ├── programs.controller.ts  # CRUD programs + weeks
│   │   │   ├── programs.service.ts
│   │   │   └── dto/
│   │   ├── workouts/
│   │   │   ├── workouts.module.ts
│   │   │   ├── workouts.controller.ts  # Templates + instances + calendar
│   │   │   ├── workouts.service.ts
│   │   │   ├── workout-instances.service.ts
│   │   │   └── dto/
│   │   │       ├── create-workout.dto.ts
│   │   │       ├── schedule-workout.dto.ts
│   │   │       └── move-workout.dto.ts
│   │   ├── exercises/
│   │   │   ├── exercises.module.ts
│   │   │   ├── exercises.controller.ts # CRUD + search + media
│   │   │   ├── exercises.service.ts
│   │   │   └── dto/
│   │   ├── logging/
│   │   │   ├── logging.module.ts
│   │   │   ├── logging.controller.ts   # POST log, GET history
│   │   │   ├── logging.service.ts
│   │   │   ├── compliance.service.ts   # Compliance % calculations
│   │   │   └── dto/
│   │   │       └── create-workout-log.dto.ts
│   │   ├── messaging/
│   │   │   ├── messaging.module.ts
│   │   │   ├── messaging.controller.ts # Threads + messages REST
│   │   │   ├── messaging.service.ts
│   │   │   ├── messaging.gateway.ts    # Socket.io gateway
│   │   │   └── dto/
│   │   │       ├── create-thread.dto.ts
│   │   │       └── send-message.dto.ts
│   │   ├── metrics/
│   │   │   ├── metrics.module.ts
│   │   │   ├── metrics.controller.ts
│   │   │   ├── metrics.service.ts
│   │   │   └── dto/
│   │   ├── habits/
│   │   │   ├── habits.module.ts
│   │   │   ├── habits.controller.ts
│   │   │   ├── habits.service.ts
│   │   │   └── dto/
│   │   ├── nutrition/
│   │   │   ├── nutrition.module.ts
│   │   │   ├── nutrition.controller.ts
│   │   │   ├── nutrition.service.ts
│   │   │   └── dto/
│   │   ├── assessments/
│   │   │   ├── assessments.module.ts
│   │   │   ├── assessments.controller.ts
│   │   │   ├── assessments.service.ts
│   │   │   └── dto/
│   │   ├── notifications/
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.controller.ts # GET /notifications (in-app list)
│   │   │   ├── notifications.service.ts    # Orchestrator
│   │   │   ├── push.service.ts             # Expo push API calls
│   │   │   └── email.service.ts            # Resend calls
│   │   ├── media/
│   │   │   ├── media.module.ts
│   │   │   ├── media.controller.ts     # POST /media/upload-url, /media/confirm
│   │   │   ├── media.service.ts        # R2 presigned URL generation
│   │   │   └── dto/
│   │   └── admin/
│   │       ├── admin.module.ts
│   │       ├── admin.controller.ts     # Audit logs, system config
│   │       └── admin.service.ts
│   └── jobs/                           # BullMQ workers
│       ├── jobs.module.ts
│       ├── video-transcode.job.ts
│       ├── push-notification.job.ts
│       ├── email-notification.job.ts
│       ├── compliance-update.job.ts
│       ├── habit-reminder.job.ts
│       ├── weekly-digest.job.ts
│       └── media-cleanup.job.ts
├── test/
│   ├── auth.e2e-spec.ts
│   ├── workouts.e2e-spec.ts
│   └── logging.e2e-spec.ts
├── .env                                # Local env (gitignored)
├── nest-cli.json
├── package.json
└── tsconfig.json
```

---

## apps/web (Next.js)

```
apps/web/
├── app/
│   ├── layout.tsx                      # Root layout (providers, fonts)
│   ├── page.tsx                        # Redirect to /dashboard or /login
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── accept-invite/
│   │       └── page.tsx                # Coach accepts org invite
│   ├── (coach)/                        # Coach-facing pages
│   │   ├── layout.tsx                  # Sidebar nav layout
│   │   ├── dashboard/
│   │   │   └── page.tsx                # "One-screen" overview: compliance, needs attention
│   │   ├── clients/
│   │   │   ├── page.tsx                # Client list + filters
│   │   │   └── [clientId]/
│   │   │       ├── page.tsx            # Client overview
│   │   │       ├── calendar/
│   │   │       │   └── page.tsx        # Client workout calendar
│   │   │       ├── metrics/
│   │   │       │   └── page.tsx
│   │   │       ├── habits/
│   │   │       │   └── page.tsx
│   │   │       ├── nutrition/
│   │   │       │   └── page.tsx
│   │   │       ├── assessments/
│   │   │       │   └── page.tsx
│   │   │       └── messages/
│   │   │           └── page.tsx
│   │   ├── programs/
│   │   │   ├── page.tsx                # Program library
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # Create program
│   │   │   └── [programId]/
│   │   │       └── page.tsx            # Edit program (drag-drop builder)
│   │   ├── workouts/
│   │   │   ├── page.tsx                # Workout template library
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [workoutId]/
│   │   │       └── page.tsx
│   │   ├── exercises/
│   │   │   ├── page.tsx                # Exercise library
│   │   │   └── [exerciseId]/
│   │   │       └── page.tsx
│   │   ├── messages/
│   │   │   └── page.tsx                # All message threads
│   │   └── settings/
│   │       └── page.tsx
│   └── (admin)/                        # Admin-only pages
│       ├── layout.tsx
│       ├── admin/
│       │   ├── page.tsx
│       │   ├── users/
│       │   │   └── page.tsx
│       │   ├── audit-logs/
│       │   │   └── page.tsx
│       │   └── settings/
│       │       └── page.tsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MobileNav.tsx
│   ├── dashboard/
│   │   ├── ComplianceOverview.tsx
│   │   ├── NeedsAttentionList.tsx
│   │   └── RecentActivityFeed.tsx
│   ├── clients/
│   │   ├── ClientCard.tsx
│   │   ├── ClientList.tsx
│   │   └── ClientFilters.tsx
│   ├── calendar/
│   │   ├── WorkoutCalendar.tsx         # Full drag-drop calendar
│   │   ├── WorkoutCard.tsx             # Calendar cell content
│   │   └── DayColumn.tsx
│   ├── workout-builder/
│   │   ├── WorkoutBuilder.tsx          # Main builder component
│   │   ├── ExerciseRow.tsx
│   │   ├── SetSchemeEditor.tsx
│   │   └── ExerciseSearch.tsx          # Search + video preview
│   ├── metrics/
│   │   ├── MetricGraph.tsx
│   │   └── ComplianceBar.tsx
│   ├── messaging/
│   │   ├── ThreadList.tsx
│   │   ├── MessageThread.tsx
│   │   ├── VoiceNotePlayer.tsx
│   │   └── VoiceNoteRecorder.tsx
│   └── ui/                             # Local shadcn components
├── hooks/
│   ├── useClients.ts
│   ├── useWorkouts.ts
│   ├── useMessaging.ts
│   ├── useMetrics.ts
│   └── useSocket.ts                    # Socket.io connection hook
├── lib/
│   ├── api.ts                          # Axios/fetch wrapper with auth headers
│   ├── auth.ts                         # Client-side auth helpers
│   └── utils.ts
├── stores/
│   ├── auth.store.ts                   # User session zustand store
│   └── ui.store.ts                     # Sidebar open/close, etc.
├── public/
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

---

## apps/mobile (Expo React Native)

```
apps/mobile/
├── app/                                # Expo Router file-based navigation
│   ├── _layout.tsx                     # Root layout (auth check, providers)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── onboarding/
│   │       ├── _layout.tsx
│   │       ├── profile.tsx             # Fill in profile
│   │       ├── goals.tsx
│   │       └── integrations.tsx        # Optional: wearables
│   ├── (client)/                       # Client/athlete screens
│   │   ├── _layout.tsx                 # Bottom tab navigator
│   │   ├── today.tsx                   # Today's workout + calendar strip
│   │   ├── calendar.tsx                # Full month calendar view
│   │   ├── workout/
│   │   │   ├── [instanceId].tsx        # Active workout screen
│   │   │   └── complete.tsx            # Post-workout summary
│   │   ├── progress/
│   │   │   ├── index.tsx               # Progress hub (metrics, photos)
│   │   │   ├── metrics.tsx
│   │   │   └── photos.tsx
│   │   ├── habits.tsx                  # Daily habits check-in
│   │   ├── nutrition.tsx               # Macro/nutrition log
│   │   ├── messages/
│   │   │   ├── index.tsx               # Thread list
│   │   │   └── [threadId].tsx          # Chat screen
│   │   └── profile.tsx
│   └── (coach)/                        # Coach mobile screens (simplified)
│       ├── _layout.tsx
│       ├── clients.tsx                 # Client list
│       ├── client/
│       │   └── [clientId].tsx          # Client overview
│       └── messages/
│           ├── index.tsx
│           └── [threadId].tsx
├── components/
│   ├── workout/
│   │   ├── ExerciseCard.tsx            # Exercise name + video + sets
│   │   ├── SetLogger.tsx               # Tap to log reps/weight
│   │   ├── RestTimer.tsx               # Countdown timer
│   │   ├── WorkoutHeader.tsx
│   │   └── VideoDemo.tsx               # expo-av video player
│   ├── calendar/
│   │   ├── WeekStrip.tsx               # Horizontal week scroll
│   │   └── WorkoutDot.tsx              # Status indicator
│   ├── metrics/
│   │   ├── MetricChart.tsx
│   │   └── MetricEntryModal.tsx
│   ├── messaging/
│   │   ├── MessageBubble.tsx
│   │   ├── VoiceNotePlayer.tsx
│   │   └── AttachmentPicker.tsx
│   ├── habits/
│   │   ├── HabitCheckbox.tsx
│   │   └── HabitStreak.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Screen.tsx                  # Safe-area wrapper
├── hooks/
│   ├── useWorkoutLogger.ts             # Offline-first log management
│   ├── useOfflineQueue.ts              # SQLite queue for pending logs
│   ├── useAuth.ts
│   └── useNotifications.ts
├── stores/
│   ├── auth.store.ts
│   ├── offline-queue.store.ts          # Pending sync items
│   └── active-workout.store.ts         # Current workout session state
├── lib/
│   ├── api.ts                          # API client
│   ├── db.ts                           # expo-sqlite setup
│   ├── offline.ts                      # Offline queue logic
│   └── notifications.ts               # Expo notifications setup
├── assets/
│   ├── images/
│   └── fonts/
├── app.json                            # Expo config
├── eas.json                            # EAS Build config
├── package.json
└── tsconfig.json
```

---

## infrastructure/docker/docker-compose.yml (Dev)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: password
      POSTGRES_DB: coachapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```
