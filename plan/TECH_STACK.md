# Technology Stack

Every choice below is justified by quality, ecosystem maturity, TypeScript-first support, and long-term maintainability for a personal full-stack project.

---

## Overview

```
Mobile App      → React Native (Expo) — iOS & Android
Web Dashboard   → Next.js 14+ (App Router) — Coach + Admin web
Backend API     → NestJS (Node.js, TypeScript) — REST + WebSocket
Database        → PostgreSQL 16 + Prisma ORM
Cache/Queue     → Redis 7 + BullMQ
Object Storage  → Cloudflare R2 (S3-compatible, no egress fees)
Media CDN       → Cloudflare CDN
Video Transcode → Cloudflare Stream (or AWS Lambda + FFmpeg)
Auth            → Better Auth (self-hosted, TypeScript-native)
Real-time       → Socket.io (via NestJS Gateway)
Push Notify     → Expo Push Notifications (wraps APNs + FCM)
Email           → Resend (transactional)
Monitoring      → Sentry (errors) + Grafana + Prometheus (metrics)
Containerization → Docker + Docker Compose (dev) / Fly.io or Railway (prod)
Monorepo        → Turborepo + pnpm workspaces
```

---

## Layer-by-Layer Decisions

### Mobile — React Native (Expo)

**Why Expo over bare React Native:**
- Managed workflow handles native build complexity
- Expo Router (file-based routing, similar to Next.js)
- Built-in offline support via `expo-sqlite` and `@tanstack/query` persistence
- Expo EAS Build for CI/CD without a Mac
- Expo Notifications wraps APNs + FCM under a single API

**Key libraries:**
| Library | Purpose |
|---|---|
| `expo-router` | File-based navigation |
| `@tanstack/react-query` | Server state, caching, background sync |
| `expo-sqlite` | Local SQLite for offline-first logging |
| `zustand` | Lightweight global UI state |
| `react-hook-form` + `zod` | Form handling + schema validation |
| `expo-av` | Video playback (exercise demos) |
| `expo-image-picker` | Upload workout photos/videos |
| `expo-notifications` | Push notification handling |
| `@shopify/flash-list` | Performant large lists |
| `nativewind` | Tailwind CSS for React Native |
| `react-native-reanimated` | Smooth animations/gestures |
| `date-fns` | Date manipulation |

---

### Web Dashboard — Next.js 14+ (App Router)

Used for the **Coach Web Dashboard** and **Admin Panel**.

**Why Next.js:**
- App Router with React Server Components = fast initial loads
- Built-in API routes for lightweight BFF layer
- Incremental Static Regeneration for public pages
- Great TypeScript support out of the box

**Key libraries:**
| Library | Purpose |
|---|---|
| `@tanstack/react-query` | Data fetching + cache |
| `zustand` | Client UI state |
| `react-hook-form` + `zod` | Forms + validation |
| `@radix-ui/*` | Headless accessible UI primitives |
| `shadcn/ui` | Pre-built components on top of Radix |
| `tailwindcss` | Styling |
| `recharts` | Charts/graphs for metrics |
| `@dnd-kit/core` | Drag-and-drop workout builder calendar |
| `tiptap` | Rich text editor (workout notes/instructions) |
| `date-fns` + `react-day-picker` | Calendar interactions |
| `@tanstack/react-table` | Data tables |
| `sonner` | Toast notifications |
| `next-themes` | Dark mode |
| `lucide-react` | Icons |

---

### Backend API — NestJS

**Why NestJS:**
- Opinionated structure keeps large codebases organized (modules, controllers, services, guards)
- Built-in support for WebSockets (Socket.io gateway)
- Excellent Prisma integration
- Interceptors and pipes for consistent request/response handling
- Swagger auto-generation for API docs

**Structure:** Modular Monolith — one NestJS app with clearly separated feature modules. Each module is independently testable and can be extracted to a microservice if scaling requires it.

**Key libraries:**
| Library | Purpose |
|---|---|
| `@nestjs/core` | Framework |
| `@nestjs/passport` | Auth guards |
| `@nestjs/jwt` | JWT handling |
| `@nestjs/websockets` + `socket.io` | Real-time messaging |
| `@nestjs/bull` | Job queues (BullMQ) |
| `@nestjs/swagger` | Auto API docs |
| `@nestjs/throttler` | Rate limiting |
| `@nestjs/config` | Config/env management |
| `@nestjs/schedule` | Cron jobs (compliance checks, notification digests) |
| `prisma` | ORM |
| `zod` | Validation schemas (mirrored from shared package) |
| `sharp` | Image processing (thumbnails) |
| `multer` | File upload handling |
| `ioredis` | Redis client |
| `bullmq` | Job queue workers |
| `nodemailer` / `resend` | Email sending |
| `pino` | Structured logging |

---

### Database — PostgreSQL 16 + Prisma

**Why PostgreSQL:**
- Best relational DB for complex queries (compliance aggregates, metrics timeseries)
- Native JSONB for flexible fields (prescription_json, schema_json)
- Row-level security (RLS) for multi-tenant isolation (future)
- Full-text search built in (exercise search)
- pgvector extension available for future AI features

**Why Prisma:**
- TypeScript-first ORM with auto-generated types
- Schema-as-code with migrations
- Prisma Studio for data browsing (dev)
- Works seamlessly with NestJS

**Connection pooling:** PgBouncer or Prisma Accelerate for production.

---

### Cache & Queue — Redis 7 + BullMQ

**Redis use cases:**
- Session store / refresh token cache
- Rate limiting counters
- Real-time pub/sub for messaging
- Short-lived data (OTP codes, invite tokens)

**BullMQ use cases (background jobs):**
- Video transcoding triggers
- Push notification batching
- Compliance calculation jobs (nightly cron)
- Webhook event processing
- Email sending queue
- Media cleanup jobs

---

### Object Storage — Cloudflare R2

**Why Cloudflare R2 over AWS S3:**
- Zero egress fees (huge cost saving for video-heavy app)
- S3-compatible API (drop-in replacement if needed)
- Cloudflare CDN is automatic

**Usage pattern:**
1. Client requests a pre-signed upload URL from the API
2. Client uploads directly to R2 (never through the API server)
3. API server records the storage key in the database
4. Media served via Cloudflare CDN with signed URLs (time-limited, permission-checked)

**Bucket structure:**
```
r2-bucket/
├── exercises/         # System exercise demo videos/images
├── user-media/        # Client uploaded videos/photos
│   └── {org_id}/{client_id}/{workout_log_id}/
├── voice-notes/       # Coach voice note audio files
├── documents/         # Waivers, PDFs, intake forms
└── avatars/           # Profile photos
```

---

### Video — Cloudflare Stream

Handles video transcoding, adaptive bitrate streaming (HLS), and CDN delivery. Eliminates the need to run FFmpeg workers yourself.

Alternative: AWS Lambda + FFmpeg if Cloudflare Stream is too expensive at scale.

---

### Authentication — Better Auth

**Why Better Auth:**
- Fully self-hosted, TypeScript-native
- Supports email/password, OAuth (Google, Apple), magic links
- Built-in session management, MFA (TOTP), and device tracking
- Works with NestJS and Next.js
- No vendor lock-in (unlike Clerk or Auth0)

---

### Real-time — Socket.io via NestJS Gateway

Used for:
- Live chat message delivery
- Read receipts
- Coach notification "new log submitted"
- Typing indicators

Fallback: HTTP polling for clients that can't maintain WebSocket (very rare).

---

### Monorepo — Turborepo + pnpm

```
turbo.json           # Build pipeline config
pnpm-workspace.yaml  # Workspace definition
packages/
  shared/            # Shared TS types, zod schemas, utils
  ui/                # Shared React components (web + mobile-adapted)
  database/          # Prisma schema + migration scripts
apps/
  api/               # NestJS backend
  web/               # Next.js web dashboard
  mobile/            # Expo React Native app
```

**Benefits:**
- Single TypeScript types shared between backend, web, and mobile
- `turbo build` only rebuilds what changed
- `pnpm` is faster and more disk-efficient than npm/yarn

---

### Infrastructure & Deployment

| Component | Dev | Production |
|---|---|---|
| API | Docker Compose | Fly.io (auto-scaling) or Railway |
| Web | `next dev` | Vercel (zero-config Next.js) |
| Mobile | Expo Go / Dev client | Expo EAS Build → App Store + Play Store |
| Database | Docker Compose (Postgres) | Supabase or Neon (managed Postgres) |
| Redis | Docker Compose | Upstash Redis (serverless) or Fly.io Redis |
| Media | Cloudflare R2 (same in all envs) | Cloudflare R2 |
| Video | Cloudflare Stream (same) | Cloudflare Stream |

---

### Environment Variables (top-level .env)

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...  # For migrations

# Redis
REDIS_URL=redis://...

# Auth
AUTH_SECRET=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=...

# Cloudflare Stream
CF_STREAM_TOKEN=...
CF_STREAM_ACCOUNT_ID=...

# Resend (email)
RESEND_API_KEY=...
FROM_EMAIL=noreply@yourapp.com

# Expo Push
EXPO_ACCESS_TOKEN=...

# App URLs
API_URL=http://localhost:3001
WEB_URL=http://localhost:3000
```
