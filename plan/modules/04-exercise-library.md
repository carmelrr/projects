# Module: Exercise Library

**Phase:** MVP
**Effort estimate:** 4–6 person-weeks (includes media pipeline)

---

## Responsibility

Manages the catalog of exercises (system + org-custom), their associated demo videos/images, and the media upload/transcode pipeline.

---

## Key Files

```
apps/api/src/modules/
├── exercises/
│   ├── exercises.module.ts
│   ├── exercises.controller.ts
│   ├── exercises.service.ts
│   └── dto/
└── media/
    ├── media.module.ts
    ├── media.controller.ts
    ├── media.service.ts        # Presigned URL generation
    └── dto/

apps/api/src/jobs/
└── video-transcode.job.ts      # BullMQ worker
```

---

## Exercise Model

```typescript
interface Exercise {
  id: string;
  orgId: string | null;     // null = system exercise
  name: string;
  description?: string;
  category: string;         // "Strength" | "Cardio" | "Mobility" | "Olympic" | ...
  equipment: string[];      // ["Barbell", "Rack"] or []
  muscleGroups: string[];   // ["Quads", "Glutes", "Core"]
  defaultUnits: ExerciseUnit;
  isSystem: boolean;
  tags: string[];
  media: ExerciseMedia[];   // sorted by isPrimary desc
}
```

---

## System Exercises

Seeded via `packages/database/prisma/seed.ts`.

Minimum seed dataset categories:
- Upper Body Push (bench press, overhead press, dips, push-up variations)
- Upper Body Pull (pull-ups, rows, face pulls)
- Lower Body (squat, deadlift, lunge, leg press, hip hinge variations)
- Olympic (clean, snatch, jerk)
- Core (plank, ab wheel, cable crunch)
- Cardio (running, rowing, cycling, assault bike)
- Mobility (hip flexor stretch, thoracic rotation, foam rolling)
- Conditioning (box jump, kettlebell swing, sled push)

For MVP: ~200 system exercises with category/muscle/equipment metadata.
Video demos: link to YouTube embeds or Cloudflare Stream IDs in seed data.

---

## Custom Exercise Creation

```
POST /exercises
{ name, description, category, equipment, muscleGroups, defaultUnits }

→ Creates Exercise with orgId set (not a system exercise)
→ Returns exercise id
→ Coach then uploads video via media upload flow
```

---

## Media Upload Pipeline

### Step 1 — Request upload URL
```
POST /media/upload-url
{
  fileType: "video/mp4",
  context: "exercise",
  contextId: "exercise_abc123",
  fileSize: 52428800   // 50MB
}

Validations:
- MIME type in allowlist
- fileSize < 500MB

Returns:
{
  uploadUrl: "https://r2.cloudflare.com/bucket/key?X-Amz-Signature=...",
  storageKey: "exercises/org_xyz/exercise_abc123/video_1716300000.mp4"
}
```

### Step 2 — Client uploads directly to R2
```
PUT {uploadUrl}
Content-Type: video/mp4
[binary file data]
```

### Step 3 — Confirm upload
```
POST /media/confirm
{ storageKey, mimeType, fileSize }

→ Creates MediaAsset record (status: PROCESSING)
→ Enqueues VideoTranscodeJob
→ Returns { assetId }
```

### Step 4 — Attach to exercise
```
POST /exercises/:exerciseId/media
{ assetId, isPrimary: true }

→ Creates ExerciseMedia record
```

### Step 5 — Transcode worker
```
VideoTranscodeJob:
1. Download from R2 to temp file
2. Upload to Cloudflare Stream via API
3. Wait for Stream ready status (webhook or polling)
4. Update MediaAsset { status: READY, cfStreamId }
5. Clean up temp file
```

---

## Exercise Search

```
GET /exercises?q=squat&category=Strength&equipment=Barbell&muscle=Quads&page=1&limit=20

SQL (Prisma):
WHERE (
  name ILIKE '%squat%'
  OR description ILIKE '%squat%'
)
AND category = 'Strength'
AND equipment @> ARRAY['Barbell']  -- contains
AND muscleGroups @> ARRAY['Quads']
AND (orgId = :orgId OR isSystem = true)
ORDER BY isSystem ASC, name ASC  -- org exercises first
```

---

## Web UI: Exercise Library Page

Three tabs:
1. **All exercises** (system + org)
2. **My exercises** (org-custom only)
3. **Recently used** (based on WorkoutItem history)

Each exercise card shows:
- Name + category badge
- Primary video thumbnail (if available)
- Equipment chips
- Muscle group chips

Click: opens exercise detail panel with full video player + edit option.

---

## Web UI: Exercise Search in Workout Builder

Inline search (not full page navigation):
1. Type exercise name → dropdown shows matches
2. Hover: video thumbnail preview appears on the right
3. Click: adds exercise to workout items list with default prescription

---

## Mobile: Video Playback

Uses `expo-av` Video component:
- Loads from Cloudflare Stream signed URL (or direct R2 for images)
- Auto-play on mute when exercise card is visible
- Tap → fullscreen with controls

For system exercises without Stream: YouTube embed in WebView as fallback.

---

## Viewing URLs

```
GET /media/:assetId/view-url

Server:
1. Check user has permission to view this asset (via exercise org or log attachment)
2. Generate R2 presigned URL (1-hour expiry)
3. Or if cfStreamId: generate Cloudflare Stream signed token

Returns: { url, expiresAt }
```

---

## Notes on Video Storage Costs

- Cloudflare R2: ~$0.015/GB storage, $0 egress
- Cloudflare Stream: ~$5/1000 min storage, $1/1000 min delivery
- For a personal app with ~200 system exercises + custom uploads, costs are minimal
- Alternative: store all videos in R2, serve with signed URLs directly (no transcoding = more bandwidth, less compatibility)
