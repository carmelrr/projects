# Module: Workout Logging

**Phase:** MVP
**Effort estimate:** 5–7 person-weeks (includes offline sync)

---

## Responsibility

Handles the client's workout execution experience and the submission of logs (sets, reps, weight, RPE, media). Includes the offline-first sync system and coach feedback flow.

---

## Key Files

```
apps/api/src/modules/logging/
├── logging.module.ts
├── logging.controller.ts
├── logging.service.ts
├── compliance.service.ts
└── dto/
    └── create-workout-log.dto.ts

apps/mobile/src/
├── hooks/
│   ├── useWorkoutLogger.ts     # Active workout session state
│   └── useOfflineQueue.ts      # SQLite queue management
├── stores/
│   ├── active-workout.store.ts # Real-time set tracking during workout
│   └── offline-queue.store.ts
└── lib/
    ├── db.ts                   # expo-sqlite setup
    └── offline.ts              # Sync logic
```

---

## Log Submission

```
POST /logging/workout-logs
{
  workoutInstanceId: "inst_abc",
  startedAt: "2026-05-01T09:00:00Z",
  finishedAt: "2026-05-01T10:15:00Z",
  perceivedExertion: 7,
  clientNotes: "Felt strong today",
  sets: [
    {
      itemId: "item_1",
      setNumber: 1,
      reps: 5,
      weight: 100,
      rpe: 8
    },
    {
      itemId: "item_1",
      setNumber: 2,
      reps: 5,
      weight: 102.5
    }
    // ... more sets
  ]
}
```

Server actions:
1. Validate workoutInstanceId belongs to the requesting client
2. Check instance not already logged (idempotency)
3. Create `WorkoutLog` + all `SetLog` records in a transaction
4. Update `WorkoutInstance.status = COMPLETED`
5. Queue `ComplianceUpdateJob` for this client
6. Queue `NotifyCoachJob`

---

## Idempotency

Log submission should be safe to retry (network failure mid-request):
- Use `workoutInstanceId` as idempotency key
- If a `WorkoutLog` already exists for this instance: return 200 with the existing log (don't error)

---

## Offline-First Architecture (Mobile)

### During workout (no sync needed)
All set data is stored in `zustand` in-memory:
```typescript
// active-workout.store.ts
interface ActiveWorkoutStore {
  instanceId: string;
  startedAt: Date;
  sets: Record<string, SetEntry[]>;  // keyed by itemId
  addSet: (itemId, data) => void;
  updateSet: (itemId, setNumber, data) => void;
}
```

### On "Finish Workout" tap
1. Serialize the full log payload
2. If online: `POST /logging/workout-logs` immediately
3. If offline: write to SQLite `offline_queue` table → show "Saved offline" toast

### Sync worker (background)
```typescript
// hooks/useOfflineQueue.ts
useEffect(() => {
  const subscription = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      flushOfflineQueue();
    }
  });
  return () => subscription();
}, []);

async function flushOfflineQueue() {
  const pending = await db.getAllAsync(
    "SELECT * FROM offline_queue WHERE status = 'PENDING'"
  );
  for (const item of pending) {
    try {
      await api.post(item.endpoint, JSON.parse(item.payload));
      await db.runAsync(
        "UPDATE offline_queue SET status = 'SYNCED', synced_at = ? WHERE id = ?",
        [new Date().toISOString(), item.id]
      );
    } catch (err) {
      if (err.status === 409) {
        // Already submitted (duplicate)
        await db.runAsync(
          "UPDATE offline_queue SET status = 'DUPLICATE' WHERE id = ?",
          [item.id]
        );
      }
      // Other errors: leave as PENDING for next retry
    }
  }
}
```

---

## Active Workout Screen State Machine

```
States:
  IDLE → ACTIVE (tap "Start Workout")
  ACTIVE → PAUSED (lock screen / background)
  PAUSED → ACTIVE (return to app)
  ACTIVE → SUBMITTING (tap "Finish Workout")
  SUBMITTING → COMPLETE (success)
  SUBMITTING → OFFLINE_SAVED (no connection)
```

---

## Coach Feedback Flow

```
GET /logging/workout-logs/:logId
→ Returns log with sets, attachments, current coachFeedback

POST /logging/workout-logs/:logId/feedback
{ feedback: "Great effort on the squats! Try pausing at the bottom next time." }

→ Updates WorkoutLog.coachFeedback + coachFeedbackAt
→ Queues PushNotificationJob for client
```

Feedback is displayed in the client's workout detail view, contextually attached to the log.

---

## Log History View (Coach)

```
GET /clients/:clientId/logs?page=1&limit=20

Returns:
[
  {
    logId: "log_abc",
    workoutTitle: "Upper Body Day A",
    scheduledDate: "2026-05-01",
    completedAt: "2026-05-01T10:15:00Z",
    perceivedExertion: 7,
    coachFeedback: "...",
    setCount: 24,
    thumbnailUrl: "..."  // if video attached
  }
]
```

---

## Log Detail View (Coach)

Shows:
- Workout title + date
- Total duration + RPE
- Client notes
- Per-exercise section:
  - Exercise name
  - Sets logged (reps × weight / time)
  - vs prescription (target)
  - Video/photo thumbnails if attached
- Coach feedback input
- Voice note attachment option

---

## Volume & Progress Tracking

For each exercise in a log, the API computes:
```typescript
// In SetLog aggregation
totalVolume = sum(reps * weight) per exercise
```

The `GET /clients/:clientId/metrics/:metricId/history` endpoint can be used to plot volume trends over time using logged data.

---

## Compliance Calculation

Triggered by `ComplianceUpdateJob` (BullMQ):

```typescript
async function calculateCompliance(clientId: string) {
  const now = new Date();
  
  for (const period of [7, 30, 90]) {
    const startDate = subDays(now, period);
    
    const scheduled = await prisma.workoutInstance.count({
      where: { clientId, scheduledDate: { gte: startDate, lte: now } }
    });
    
    const completed = await prisma.workoutInstance.count({
      where: {
        clientId,
        scheduledDate: { gte: startDate, lte: now },
        status: 'COMPLETED'
      }
    });
    
    const rate = scheduled > 0 ? completed / scheduled : 1.0;
    
    // Get previous period for comparison
    const previous = await prisma.complianceSummary.findUnique({
      where: { clientId_period_periodStart: { clientId, period: ..., periodStart: ... } }
    });
    
    const needsAttention = previous && (previous.complianceRate - rate) >= 0.20;
    
    await prisma.complianceSummary.upsert({ ... });
    
    if (needsAttention) {
      await notificationsService.sendCoachAlert(clientId, 'COMPLIANCE_DROP');
    }
  }
}
```
