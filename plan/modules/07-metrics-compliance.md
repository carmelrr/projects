# Module: Metrics & Compliance

**Phase:** MVP (basic metrics), Growth (compliance alerts)
**Effort estimate:** 4–6 person-weeks

---

## Responsibility

Tracks any quantifiable measurement for a client over time (body weight, 1RM, resting heart rate, measurements, etc.). Calculates workout compliance percentages and surfaces "Needs Attention" alerts.

---

## Key Files

```
apps/api/src/modules/metrics/
├── metrics.module.ts
├── metrics.controller.ts
├── metrics.service.ts
└── dto/

apps/api/src/modules/logging/
└── compliance.service.ts     # Compliance calculations
```

---

## Metric Definitions

Metrics are defined at the org level and apply to all clients in that org.

**System metric definitions (seeded):**
| Name | Unit | Target Type |
|---|---|---|
| Body Weight | kg | LOWER_IS_BETTER or TARGET_VALUE |
| Body Fat % | % | LOWER_IS_BETTER |
| Resting Heart Rate | bpm | LOWER_IS_BETTER |
| Sleep Duration | hours | HIGHER_IS_BETTER |
| Steps | steps | HIGHER_IS_BETTER |

**Common custom metrics coaches create:**
- Back Squat 1RM (kg, HIGHER_IS_BETTER)
- Deadlift 1RM (kg, HIGHER_IS_BETTER)
- Pull-ups Max Reps (reps, HIGHER_IS_BETTER)
- Chest Measurement (cm, flexible)
- Waist Measurement (cm, LOWER_IS_BETTER)
- Vertical Jump (cm, HIGHER_IS_BETTER)

---

## Metric Entry Logging

**Coach logs on behalf of client:**
```
POST /clients/:clientId/metrics
{
  metricId: "metric_bodyweight",
  value: 78.5,
  notes: "Morning weight, fasted",
  capturedAt: "2026-05-01T07:30:00Z"
}
```

**Client self-logs (mobile):**
Same endpoint — `clientId` validated against the authenticated user's `clientProfileId`.

**From wearables (Scale phase):**
`source` field = "garmin" | "apple_health" | "whoop"

---

## Metric History / Graph Data

```
GET /clients/:clientId/metrics/:metricId/history
  ?from=2026-01-01&to=2026-05-01&granularity=week

Returns:
[
  { date: "2026-01-06", value: 82.0, source: "manual" },
  { date: "2026-01-13", value: 81.5, source: "manual" },
  ...
]
```

For weekly granularity: average of entries within each week.

---

## Web UI: Metric Graph

Uses `Recharts` `LineChart`:
- X-axis: dates
- Y-axis: metric values (unit labeled)
- Tooltip: date + value + source
- Goal line if target value set
- Date range picker (1M / 3M / 6M / 1Y / All)
- Multiple metrics can be overlaid on the same chart

---

## Mobile UI: Metric Entry

On the "Progress" tab:
```
Metrics screen
├── Body Weight ── [+] button → sheet modal
│   └── "82.0 kg · 3 days ago"
├── Back Squat 1RM ── [+]
│   └── "100 kg · 1 week ago"
└── [+ Add metric] → pick from org definitions
```

---

## Compliance System

### What counts toward compliance?

By default: `WorkoutInstance` completions.
If habit tracking is enabled: habit entries with `countsForCompliance = true` also count.

### Calculation logic

See `modules/05-workout-logging.md` for the full algorithm.

Summary:
- Run after every WorkoutLog submission (BullMQ job)
- Calculates 7-day, 30-day, 90-day windows
- Detects ≥20% drop vs previous equivalent period → sets `needsAttention = true`
- Results stored in `compliance_summaries` table

### Compliance Display (Coach)

**Client card (list view):**
```
[████████░░] 78%  ← 7-day compliance bar
⚠️ Needs attention
```

**Client detail → Compliance tab:**
```
7-day:   78%  ████████░░
30-day:  85%  █████████░
90-day:  91%  █████████▉

History graph: compliance % over time
Alert history: "Dropped from 95% to 71% on May 3"
```

**Coach dashboard "Needs Attention" list:**
```
⚠️ Sarah Chen — 45% last 7 days (was 88%)
⚠️ Mike Johnson — 30% last 7 days (was 90%)
```

---

## Needs Attention Alert

When `needsAttention` is set to true:
1. Create `Notification` record for the coach (type: `COMPLIANCE_DROP`)
2. Push notification to coach: "Sarah Chen's compliance dropped to 45%"
3. Show badge on client card in coach list
4. Show in "Needs Attention" section on dashboard

Resolving: cleared automatically when compliance recovers above threshold on next calculation. Or manually dismissed by coach.

---

## Progress Photos

Stored as `MetricEntry` with `source = "photo"` OR as a separate system metric "Progress Photo":

```
POST /clients/:clientId/metrics
{
  metricId: "metric_progress_photo",
  value: 0,            // not a numeric metric
  assetId: "asset_...",
  capturedAt: "2026-05-01"
}
```

Coach view: grid of progress photos sorted by date. Side-by-side comparison picker (select 2 dates).
