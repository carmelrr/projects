# Module: Assessments & Check-ins

**Phase:** Growth
**Effort estimate:** 4–6 person-weeks

---

## Responsibility

Structured evaluation sessions (movement screens, initial assessments, periodic check-ins) where coach assigns tasks, client completes items with video/photos, and coach scores and reviews.

---

## Key Files

```
apps/api/src/modules/assessments/
├── assessments.module.ts
├── assessments.controller.ts
├── assessments.service.ts
└── dto/
    ├── create-assessment.dto.ts
    └── score-item.dto.ts
```

---

## Assessment Types

| Type | Description |
|---|---|
| `initial` | First-time movement and fitness baseline |
| `check-in` | Periodic (monthly/quarterly) progress review |
| `movement` | Specific movement quality screen (FMS-style) |
| `progress` | Comparison to previous assessment |
| `custom` | Freeform coach-defined |

---

## Assessment Templates

Coach creates reusable templates:
```
POST /assessments/templates
{
  title: "Movement Screen Baseline",
  type: "movement",
  description: "7-movement fundamental screen",
  items: [
    { label: "Deep Squat", exerciseId: "ex_deep_squat", maxScore: 3 },
    { label: "Hurdle Step (L)", maxScore: 3 },
    { label: "Hurdle Step (R)", maxScore: 3 },
    { label: "Inline Lunge (L)", maxScore: 3 },
    { label: "Inline Lunge (R)", maxScore: 3 },
    { label: "Shoulder Mobility", maxScore: 3 },
    { label: "Active Straight Leg Raise", maxScore: 3 }
  ]
}
```

---

## Assessment Lifecycle

```
1. PENDING   → Coach creates assessment for client
2. IN_PROGRESS → Client starts completing items
3. COMPLETED → Client marks all items done (or coach triggers)
4. REVIEWED  → Coach has scored and added notes
```

---

## Client Experience (Mobile)

```
Assessment screen: "Movement Screen Baseline"
Status: In Progress

Items:
├── ✓ Deep Squat
│    ├── Coach instructions: "Stand with feet shoulder-width..."
│    ├── Video demo: [ExerciseDemo component]
│    └── [📹 Upload your video]
│         ↳ Attached: "deep_squat_video.mp4" ✓
│
├── ○ Hurdle Step (Left)
│    └── [📹 Upload your video]
│
└── ○ ...

[Submit Assessment]
```

For each item, client can:
- Watch the demo video (if exercise attached)
- Read coach instructions
- Upload a video/photo of their attempt
- Add text notes

---

## Coach Review (Web)

Assessment detail view:
```
Client: Sarah Chen
Assessment: Movement Screen Baseline
Completed: May 1, 2026

Items:
┌─────────────────────────────┬───────┬─────────────┐
│ Deep Squat                  │ [2/3] │ "Knee cave L" │
│ [▶ Watch video]            │       │              │
├─────────────────────────────┼───────┼─────────────┤
│ Hurdle Step (L)             │ [3/3] │ "Perfect"     │
│ [▶ Watch video]            │       │              │
└─────────────────────────────┴───────┴─────────────┘

Total Score: 18/21

Coach overall notes: [rich text area]
[Mark as Reviewed] [Send feedback to client]
```

---

## Assessment History Timeline

```
GET /clients/:clientId/assessments

Timeline:
May 1, 2026  — Movement Screen Baseline    Score: 18/21   [Reviewed]
Feb 1, 2026  — Movement Screen Baseline    Score: 15/21   [Reviewed]
Jan 5, 2026  — Initial Assessment          —              [Reviewed]
```

Trend: show score progression over time as a line graph.

---

## Check-in Forms (Simplified Assessment)

A check-in is a lightweight assessment without video:

```
POST /clients/:clientId/assessments
{
  title: "Weekly Check-in",
  type: "check-in",
  items: [
    { label: "Sleep quality (1-10)" },
    { label: "Energy levels (1-10)" },
    { label: "Soreness (1-10)" },
    { label: "Biggest win this week?" },
    { label: "Biggest challenge?" }
  ]
}
```

Client fills in via mobile; coach reviews on web.

---

## Notes

- Video uploads use the standard media upload flow (presigned R2 URL)
- Assessment videos do not go through Cloudflare Stream (they are private, one-time-view)
- Signed view URLs are generated per-request with 2-hour TTL
- Videos are stored under `r2://user-media/{orgId}/{clientId}/assessments/{assessmentId}/`
