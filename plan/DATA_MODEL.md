# Database Schema (Prisma / PostgreSQL)

Full Prisma schema. Tables are organized by domain.

---

## Prisma Schema

```prisma
// packages/database/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─────────────────────────────────────────────
// IDENTITY & MULTI-TENANT
// ─────────────────────────────────────────────

model Organization {
  id             String    @id @default(cuid())
  name           String
  slug           String    @unique
  timezone       String    @default("UTC")
  logoUrl        String?
  brandingTheme  Json?     // { primaryColor, accentColor }
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  users          UserOrganization[]
  clients        ClientProfile[]
  programs       ProgramTemplate[]
  workoutTemplates WorkoutTemplate[]
  exercises      Exercise[]          // org-specific exercises
  metricDefs     MetricDefinition[]
  habitDefs      HabitDefinition[]
  messageThreads MessageThread[]
  assessmentTemplates AssessmentTemplate[]
  mediaAssets    MediaAsset[]
  auditLogs      AuditLog[]
  notifications  Notification[]
  forms          Form[]

  @@map("organizations")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  phone         String?
  passwordHash  String?
  oidcSub       String?   @unique  // For OAuth (Google, Apple)
  avatarUrl     String?
  firstName     String
  lastName      String
  status        UserStatus @default(ACTIVE)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  orgs           UserOrganization[]
  coachProfile   CoachProfile?
  clientProfile  ClientProfile?
  sessions       Session[]
  sentMessages   Message[]         @relation("MessageSender")
  notifications  Notification[]
  pushTokens     PushToken[]
  auditActions   AuditLog[]        @relation("AuditActor")

  @@map("users")
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  refreshToken String   @unique
  deviceName   String?
  ipAddress    String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model UserOrganization {
  userId    String
  orgId     String
  role      OrgRole  @default(COACH)
  invitedAt DateTime @default(now())
  joinedAt  DateTime?

  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@id([userId, orgId])
  @@map("user_organizations")
}

enum OrgRole {
  OWNER
  ADMIN_COACH
  COACH
  CLIENT
}

model PushToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  platform  String   // ios | android
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("push_tokens")
}

// ─────────────────────────────────────────────
// PROFILES
// ─────────────────────────────────────────────

model CoachProfile {
  id           String   @id @default(cuid())
  userId       String   @unique
  orgId        String
  bio          String?
  specialties  String[]
  capacity     Int?     // max active clients
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  assignments  ClientAssignment[]

  @@map("coach_profiles")
}

model ClientProfile {
  id              String    @id @default(cuid())
  userId          String    @unique
  orgId           String
  status          ClientStatus @default(ACTIVE)
  dob             DateTime?
  heightCm        Float?
  goals           String?
  medicalNotes    String?   // visible to coach only
  intakeFormData  Json?
  archivedAt      DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  org             Organization      @relation(fields: [orgId], references: [id])
  assignments     ClientAssignment[]
  workoutInstances WorkoutInstance[]
  workoutLogs     WorkoutLog[]
  metricEntries   MetricEntry[]
  habitEntries    HabitEntry[]
  nutritionGoals  NutritionGoal[]
  nutritionEntries NutritionEntry[]
  assessments     Assessment[]
  formResponses   FormResponse[]
  complianceSummaries ComplianceSummary[]

  @@map("client_profiles")
}

enum ClientStatus {
  ACTIVE
  PAUSED
  ARCHIVED
}

model ClientAssignment {
  id          String    @id @default(cuid())
  clientId    String
  coachId     String
  startAt     DateTime  @default(now())
  endAt       DateTime?
  status      AssignmentStatus @default(ACTIVE)
  notes       String?
  createdAt   DateTime  @default(now())

  client      ClientProfile @relation(fields: [clientId], references: [id])
  coach       CoachProfile  @relation(fields: [coachId], references: [id])

  @@map("client_assignments")
}

enum AssignmentStatus {
  ACTIVE
  ENDED
}

// ─────────────────────────────────────────────
// EXERCISE LIBRARY
// ─────────────────────────────────────────────

model Exercise {
  id           String    @id @default(cuid())
  orgId        String?   // null = system exercise, string = org-custom
  name         String
  description  String?
  category     String    // e.g. "Strength", "Cardio", "Mobility"
  equipment    String[]
  muscleGroups String[]
  defaultUnits ExerciseUnit @default(REPS_WEIGHT)
  isSystem     Boolean   @default(false)
  tags         String[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  media        ExerciseMedia[]
  workoutItems WorkoutItem[]

  @@map("exercises")
}

enum ExerciseUnit {
  REPS_WEIGHT
  REPS_ONLY
  TIME
  DISTANCE
  CALORIES
}

model ExerciseMedia {
  id          String     @id @default(cuid())
  exerciseId  String
  assetId     String
  mediaType   MediaType  @default(VIDEO)
  isPrimary   Boolean    @default(false)
  createdAt   DateTime   @default(now())

  exercise    Exercise   @relation(fields: [exerciseId], references: [id])
  asset       MediaAsset @relation(fields: [assetId], references: [id])

  @@map("exercise_media")
}

// ─────────────────────────────────────────────
// PROGRAMS
// ─────────────────────────────────────────────

model ProgramTemplate {
  id          String    @id @default(cuid())
  orgId       String
  title       String
  description String?
  isPrivate   Boolean   @default(false)
  tags        String[]
  createdBy   String    // userId
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  org         Organization @relation(fields: [orgId], references: [id])
  weeks       ProgramWeek[]
  assignments ProgramAssignment[]

  @@map("program_templates")
}

model ProgramWeek {
  id          String   @id @default(cuid())
  programId   String
  weekIndex   Int      // 0-based
  title       String?
  notes       String?

  program     ProgramTemplate   @relation(fields: [programId], references: [id], onDelete: Cascade)
  workouts    WorkoutTemplate[] @relation("ProgramWeekWorkouts")

  @@unique([programId, weekIndex])
  @@map("program_weeks")
}

model ProgramAssignment {
  id          String   @id @default(cuid())
  programId   String
  clientId    String
  startDate   DateTime
  status      ProgramAssignmentStatus @default(ACTIVE)
  assignedBy  String   // coachId
  createdAt   DateTime @default(now())

  program     ProgramTemplate @relation(fields: [programId], references: [id])

  @@map("program_assignments")
}

enum ProgramAssignmentStatus {
  ACTIVE
  COMPLETED
  CANCELLED
}

// ─────────────────────────────────────────────
// WORKOUTS
// ─────────────────────────────────────────────

model WorkoutTemplate {
  id                String    @id @default(cuid())
  orgId             String
  title             String
  description       String?
  type              WorkoutType @default(STRENGTH)
  estimatedDuration Int?      // minutes
  instructions      String?
  isTemplate        Boolean   @default(true)
  tags              String[]
  createdBy         String
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  org               Organization @relation(fields: [orgId], references: [id])
  items             WorkoutItem[]
  instances         WorkoutInstance[]
  programWeeks      ProgramWeek[] @relation("ProgramWeekWorkouts")

  @@map("workout_templates")
}

enum WorkoutType {
  STRENGTH
  HIIT
  AMRAP
  EMOM
  FOR_TIME
  CARDIO
  MOBILITY
  ASSESSMENT
  CUSTOM
}

model WorkoutItem {
  id               String   @id @default(cuid())
  workoutId        String
  exerciseId       String
  orderIndex       Int
  groupLabel       String?  // e.g. "A1", "B2" for supersets/circuits
  prescription     Json     // { sets, reps, weight, tempo, rest, notes, intervals }
  coachNotes       String?

  workout          WorkoutTemplate @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  exercise         Exercise        @relation(fields: [exerciseId], references: [id])
  setLogs          SetLog[]

  @@map("workout_items")
}

model WorkoutInstance {
  id             String    @id @default(cuid())
  clientId       String
  templateId     String?
  scheduledDate  DateTime
  movedFromDate  DateTime?
  title          String?
  notes          String?
  status         WorkoutInstanceStatus @default(SCHEDULED)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  client         ClientProfile    @relation(fields: [clientId], references: [id])
  template       WorkoutTemplate? @relation(fields: [templateId], references: [id])
  log            WorkoutLog?
  comments       WorkoutComment[]

  @@map("workout_instances")
}

enum WorkoutInstanceStatus {
  SCHEDULED
  COMPLETED
  SKIPPED
  MOVED
}

// ─────────────────────────────────────────────
// LOGGING
// ─────────────────────────────────────────────

model WorkoutLog {
  id                 String    @id @default(cuid())
  clientId           String
  workoutInstanceId  String    @unique
  startedAt          DateTime
  finishedAt         DateTime?
  perceivedExertion  Int?      // RPE 1-10
  clientNotes        String?
  coachFeedback      String?
  coachFeedbackAt    DateTime?
  createdAt          DateTime  @default(now())

  client             ClientProfile   @relation(fields: [clientId], references: [id])
  workoutInstance    WorkoutInstance @relation(fields: [workoutInstanceId], references: [id])
  setLogs            SetLog[]
  attachments        LogAttachment[]

  @@map("workout_logs")
}

model SetLog {
  id           String    @id @default(cuid())
  workoutLogId String
  itemId       String
  setNumber    Int
  reps         Float?
  weight       Float?    // kg
  time         Float?    // seconds
  distance     Float?    // meters
  calories     Float?
  rpe          Float?
  notes        String?
  createdAt    DateTime  @default(now())

  workoutLog   WorkoutLog  @relation(fields: [workoutLogId], references: [id], onDelete: Cascade)
  item         WorkoutItem @relation(fields: [itemId], references: [id])

  @@map("set_logs")
}

model LogAttachment {
  id           String    @id @default(cuid())
  workoutLogId String
  assetId      String
  caption      String?
  createdAt    DateTime  @default(now())

  workoutLog   WorkoutLog @relation(fields: [workoutLogId], references: [id])
  asset        MediaAsset @relation(fields: [assetId], references: [id])

  @@map("log_attachments")
}

model WorkoutComment {
  id                String    @id @default(cuid())
  workoutInstanceId String
  authorId          String    // userId
  body              String?
  voiceNoteAssetId  String?
  createdAt         DateTime  @default(now())

  workoutInstance   WorkoutInstance @relation(fields: [workoutInstanceId], references: [id])
  voiceAsset        MediaAsset?     @relation("VoiceNoteAsset", fields: [voiceNoteAssetId], references: [id])

  @@map("workout_comments")
}

// ─────────────────────────────────────────────
// MESSAGING
// ─────────────────────────────────────────────

model MessageThread {
  id          String      @id @default(cuid())
  orgId       String
  type        ThreadType  @default(DIRECT)
  title       String?     // For group threads
  createdBy   String
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  org          Organization       @relation(fields: [orgId], references: [id])
  participants ThreadParticipant[]
  messages     Message[]

  @@map("message_threads")
}

enum ThreadType {
  DIRECT
  GROUP
  BROADCAST
}

model ThreadParticipant {
  threadId    String
  userId      String
  role        String    @default("member") // "member" | "admin"
  joinedAt    DateTime  @default(now())
  lastReadAt  DateTime?

  thread      MessageThread @relation(fields: [threadId], references: [id], onDelete: Cascade)

  @@id([threadId, userId])
  @@map("thread_participants")
}

model Message {
  id           String    @id @default(cuid())
  threadId     String
  senderId     String
  body         String?
  messageType  MessageType @default(TEXT)
  assetId      String?   // For media/voice note
  replyToId    String?
  editedAt     DateTime?
  deletedAt    DateTime?
  createdAt    DateTime  @default(now())

  thread       MessageThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  sender       User          @relation("MessageSender", fields: [senderId], references: [id])
  asset        MediaAsset?   @relation("MessageAsset", fields: [assetId], references: [id])
  replyTo      Message?      @relation("MessageReplies", fields: [replyToId], references: [id])
  replies      Message[]     @relation("MessageReplies")

  @@map("messages")
}

enum MessageType {
  TEXT
  IMAGE
  VIDEO
  VOICE_NOTE
  GIF
  DOCUMENT
  SYSTEM
}

// ─────────────────────────────────────────────
// METRICS & COMPLIANCE
// ─────────────────────────────────────────────

model MetricDefinition {
  id          String      @id @default(cuid())
  orgId       String
  name        String      // e.g. "Body Weight", "Back Squat 1RM"
  unit        String      // kg, lbs, cm, %, bpm
  targetType  TargetType  @default(HIGHER_IS_BETTER)
  frequency   String?     // "daily", "weekly", "as-needed"
  isSystem    Boolean     @default(false)
  createdAt   DateTime    @default(now())

  org         Organization  @relation(fields: [orgId], references: [id])
  entries     MetricEntry[]

  @@map("metric_definitions")
}

enum TargetType {
  HIGHER_IS_BETTER
  LOWER_IS_BETTER
  TARGET_VALUE
}

model MetricEntry {
  id         String   @id @default(cuid())
  metricId   String
  clientId   String
  value      Float
  notes      String?
  source     String   @default("manual") // manual | wearable | myfitpal
  capturedAt DateTime @default(now())

  metric     MetricDefinition @relation(fields: [metricId], references: [id])
  client     ClientProfile    @relation(fields: [clientId], references: [id])

  @@map("metric_entries")
}

model ComplianceSummary {
  id              String   @id @default(cuid())
  clientId        String
  period          CompliancePeriod
  periodStart     DateTime
  totalScheduled  Int
  totalCompleted  Int
  complianceRate  Float    // 0.0 - 1.0
  needsAttention  Boolean  @default(false)
  calculatedAt    DateTime @default(now())

  client          ClientProfile @relation(fields: [clientId], references: [id])

  @@unique([clientId, period, periodStart])
  @@map("compliance_summaries")
}

enum CompliancePeriod {
  SEVEN_DAY
  THIRTY_DAY
  NINETY_DAY
}

// ─────────────────────────────────────────────
// HABITS & NUTRITION
// ─────────────────────────────────────────────

model HabitDefinition {
  id                  String   @id @default(cuid())
  orgId               String
  name                String
  description         String?
  scheduleRule        String   // "daily" | "weekdays" | specific days JSON
  countsForCompliance Boolean  @default(false)
  createdAt           DateTime @default(now())

  org     Organization @relation(fields: [orgId], references: [id])
  entries HabitEntry[]

  @@map("habit_definitions")
}

model HabitEntry {
  id         String   @id @default(cuid())
  habitId    String
  clientId   String
  date       DateTime @db.Date
  completed  Boolean  @default(false)
  value      Float?   // For quantitative habits
  notes      String?
  createdAt  DateTime @default(now())

  habit      HabitDefinition @relation(fields: [habitId], references: [id])
  client     ClientProfile   @relation(fields: [clientId], references: [id])

  @@unique([habitId, clientId, date])
  @@map("habit_entries")
}

model NutritionGoal {
  id          String   @id @default(cuid())
  clientId    String
  calories    Float?
  protein     Float?   // grams
  carbs       Float?   // grams
  fat         Float?   // grams
  fiber       Float?   // grams
  water       Float?   // ml
  setBy       String   // coachId or clientId
  activeFrom  DateTime @default(now())
  activeTo    DateTime?

  client      ClientProfile @relation(fields: [clientId], references: [id])

  @@map("nutrition_goals")
}

model NutritionEntry {
  id          String   @id @default(cuid())
  clientId    String
  date        DateTime @db.Date
  calories    Float?
  protein     Float?
  carbs       Float?
  fat         Float?
  fiber       Float?
  water       Float?
  weight      Float?   // body weight that day
  sleep       Float?   // hours
  steps       Int?
  energy      Int?     // 1-5 subjective
  stress      Int?     // 1-5 subjective
  hunger      Int?     // 1-5 subjective
  notes       String?
  source      String   @default("manual")
  createdAt   DateTime @default(now())

  client      ClientProfile @relation(fields: [clientId], references: [id])

  @@unique([clientId, date])
  @@map("nutrition_entries")
}

// ─────────────────────────────────────────────
// ASSESSMENTS
// ─────────────────────────────────────────────

model AssessmentTemplate {
  id          String   @id @default(cuid())
  orgId       String
  title       String
  description String?
  type        String   // "initial", "check-in", "progress", "movement"
  createdAt   DateTime @default(now())

  org         Organization      @relation(fields: [orgId], references: [id])
  assessments Assessment[]

  @@map("assessment_templates")
}

model Assessment {
  id          String    @id @default(cuid())
  clientId    String
  templateId  String?
  title       String
  status      AssessmentStatus @default(PENDING)
  coachNotes  String?
  scheduledAt DateTime?
  completedAt DateTime?
  createdAt   DateTime  @default(now())

  client      ClientProfile       @relation(fields: [clientId], references: [id])
  template    AssessmentTemplate? @relation(fields: [templateId], references: [id])
  items       AssessmentItem[]

  @@map("assessments")
}

enum AssessmentStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  REVIEWED
}

model AssessmentItem {
  id           String   @id @default(cuid())
  assessmentId String
  exerciseId   String?
  label        String
  score        Float?
  coachNotes   String?
  assetId      String?  // Video/photo of movement
  createdAt    DateTime @default(now())

  assessment   Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  asset        MediaAsset? @relation(fields: [assetId], references: [id])

  @@map("assessment_items")
}

// ─────────────────────────────────────────────
// FORMS
// ─────────────────────────────────────────────

model Form {
  id        String   @id @default(cuid())
  orgId     String
  title     String
  type      String   // "intake", "waiver", "check-in", "custom"
  schema    Json     // JSON Schema for fields
  version   Int      @default(1)
  createdAt DateTime @default(now())

  org       Organization   @relation(fields: [orgId], references: [id])
  responses FormResponse[]

  @@map("forms")
}

model FormResponse {
  id        String   @id @default(cuid())
  formId    String
  clientId  String
  answers   Json
  assetId   String?  // Signed waiver document
  createdAt DateTime @default(now())

  form      Form          @relation(fields: [formId], references: [id])
  client    ClientProfile @relation(fields: [clientId], references: [id])
  asset     MediaAsset?   @relation(fields: [assetId], references: [id])

  @@map("form_responses")
}

// ─────────────────────────────────────────────
// MEDIA
// ─────────────────────────────────────────────

model MediaAsset {
  id           String    @id @default(cuid())
  orgId        String?
  storageKey   String    @unique  // R2 object key
  mimeType     String
  fileSize     Int?      // bytes
  duration     Float?    // seconds (for video/audio)
  width        Int?
  height       Int?
  checksum     String?
  status       AssetStatus @default(PROCESSING)
  cfStreamId   String?   // Cloudflare Stream video ID
  deletedAt    DateTime?
  createdAt    DateTime  @default(now())

  org          Organization? @relation(fields: [orgId], references: [id])
  exerciseMedia ExerciseMedia[]
  logAttachments LogAttachment[]
  workoutComments WorkoutComment[] @relation("VoiceNoteAsset")
  messages     Message[]   @relation("MessageAsset")
  assessmentItems AssessmentItem[]
  formResponses FormResponse[]

  @@map("media_assets")
}

enum AssetStatus {
  PROCESSING
  READY
  FAILED
  DELETED
}

enum MediaType {
  VIDEO
  IMAGE
  AUDIO
  DOCUMENT
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

model Notification {
  id        String           @id @default(cuid())
  orgId     String
  userId    String
  type      NotificationType
  title     String
  body      String?
  data      Json?            // Deep-link payload { screen, params }
  channel   NotificationChannel @default(IN_APP)
  sentAt    DateTime?
  readAt    DateTime?
  createdAt DateTime         @default(now())

  org       Organization @relation(fields: [orgId], references: [id])
  user      User         @relation(fields: [userId], references: [id])

  @@map("notifications")
}

enum NotificationType {
  WORKOUT_ASSIGNED
  WORKOUT_REMINDER
  LOG_SUBMITTED          // Coach receives
  COACH_FEEDBACK         // Client receives
  NEW_MESSAGE
  COMPLIANCE_DROP
  HABIT_REMINDER
  ASSESSMENT_ASSIGNED
  SYSTEM
}

enum NotificationChannel {
  IN_APP
  PUSH
  EMAIL
}

// ─────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────

model AuditLog {
  id          String   @id @default(cuid())
  orgId       String
  actorId     String   // userId
  action      String   // e.g. "client.archive", "workout.assign"
  targetType  String?  // e.g. "ClientProfile"
  targetId    String?
  metadata    Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  org         Organization @relation(fields: [orgId], references: [id])
  actor       User         @relation("AuditActor", fields: [actorId], references: [id])

  @@map("audit_logs")
}

// ─────────────────────────────────────────────
// INTEGRATIONS (Growth/Scale phase)
// ─────────────────────────────────────────────

model IntegrationConnection {
  id           String   @id @default(cuid())
  orgId        String?
  userId       String?  // Per-user connections (e.g. wearables)
  provider     String   // "apple_health" | "garmin" | "whoop" | "myfitnessPal"
  scopes       String[]
  accessToken  String?  // Encrypted
  refreshToken String?  // Encrypted
  expiresAt    DateTime?
  status       IntegrationStatus @default(ACTIVE)
  lastSyncAt   DateTime?
  createdAt    DateTime @default(now())

  @@map("integration_connections")
}

enum IntegrationStatus {
  ACTIVE
  EXPIRED
  REVOKED
  ERROR
}

model WebhookEvent {
  id          String   @id @default(cuid())
  provider    String
  eventType   String
  payloadHash String?
  payload     Json
  processedAt DateTime?
  error       String?
  receivedAt  DateTime @default(now())

  @@map("webhook_events")
}
```

---

## Key Design Decisions

**1. org_id on almost every table**
Enables clean multi-tenancy. For personal use (single org), this is invisible but future-proof.

**2. JSONB for flexible fields**
`prescription` on WorkoutItem stores structured training data (sets, reps, tempo, rest, intervals) without requiring a rigid column-per-attribute schema. `schema` on Form stores a JSON Schema for dynamic form fields.

**3. Soft deletes**
`deletedAt` on MediaAsset (and can be added to others) enables retention policies and GDPR-compliant erasure workflows.

**4. ComplianceSummary as a materialized table**
Rather than re-computing compliance on every request, background jobs update this table. Indexed by `(clientId, period, periodStart)`.

**5. Separate MediaAsset table**
Decouples storage keys from entity-specific tables. Multiple entities (logs, messages, assessments) can reference the same asset. Deletion is managed centrally.

**6. WorkoutItem.prescription as JSONB**
```json
{
  "sets": 4,
  "reps": "8-10",
  "weight": { "type": "percentage_1rm", "value": 75 },
  "tempo": "3-1-1-0",
  "rest": 90,
  "notes": "Focus on controlled eccentric"
}
```

**7. NutritionEntry combines multiple daily trackers**
Weight, sleep, steps, and subjective metrics (energy/stress/hunger) are in the same daily row to reduce joins. JSONB alternative is possible if fields grow.
