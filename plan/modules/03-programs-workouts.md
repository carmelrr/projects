# Module: Programs & Workout Builder

**Phase:** MVP
**Effort estimate:** 6–10 person-weeks (largest MVP module)

---

## Responsibility

Creates and manages multi-week program templates, individual workout templates, and the scheduling system that places workout instances on client calendars. This is the core "coach tool" of the product.

---

## Key Files

```
apps/api/src/modules/
├── programs/
│   ├── programs.module.ts
│   ├── programs.controller.ts
│   ├── programs.service.ts
│   └── dto/
│       ├── create-program.dto.ts
│       ├── assign-program.dto.ts
│       └── update-week.dto.ts
└── workouts/
    ├── workouts.module.ts
    ├── workouts.controller.ts
    ├── workouts.service.ts
    ├── workout-instances.service.ts
    └── dto/
        ├── create-workout.dto.ts
        ├── schedule-workout.dto.ts
        └── move-workout.dto.ts
```

---

## Program Model

```
ProgramTemplate
└── ProgramWeek (week 1, 2, 3...)
    └── WorkoutTemplate[] (Monday: Upper Body, Wednesday: Lower Body...)
```

Programs are **templates** — they are not bound to any specific client until `ProgramAssignment` is created with a `startDate`.

When a program is assigned:
- System calculates concrete dates starting from `startDate`
- Creates `WorkoutInstance` records for each `WorkoutTemplate` in each `ProgramWeek`

---

## Workout Item Prescription Format

The `prescription` field on `WorkoutItem` is a flexible JSONB object:

```typescript
interface Prescription {
  sets?: number;
  reps?: string | number;       // "8-10" or 10
  weight?: {
    type: "absolute" | "percentage_1rm" | "rpe" | "bodyweight";
    value?: number;
    unit?: "kg" | "lbs";
  };
  time?: number;                // seconds (for timed sets)
  distance?: number;            // meters
  tempo?: string;               // "3-1-1-0" (eccentric-pause-concentric-pause)
  rest?: number;                // seconds
  intervals?: {
    work: number;               // seconds on
    rest: number;               // seconds off
    rounds: number;
  };
  notes?: string;
}
```

---

## Web UI: Workout Builder

The builder is a drag-and-drop interface:

```
WorkoutBuilder
├── WorkoutHeader (title, type, duration, notes)
├── ExerciseSearch (search + video preview inline)
└── ExerciseList (drag-to-reorder)
    └── ExerciseRow
        ├── Exercise name + category
        ├── Video thumbnail (click to preview)
        ├── SetSchemeEditor
        │   ├── Sets input
        │   ├── Reps input (e.g. "8-10")
        │   ├── Weight input (type + value)
        │   ├── Rest input
        │   └── Notes input
        └── GroupLabel input (A1, B2...)
```

**Superset grouping:** Exercises sharing the same `groupLabel` are visually grouped and displayed as a circuit to the client.

---

## Web UI: Program Builder Calendar

Displays a multi-week grid:
```
         Mon     Tue     Wed     Thu     Fri     Sat     Sun
Week 1  [Drag]  [Drag]  [Drag]  [Drag]  [Drag]  [Drag]  [Drag]
Week 2  ...
```

Drag behavior:
- Drag a workout from the library into a cell → creates reference
- Drag between cells → reorders
- Click workout card → opens editor panel (right sidebar)
- "+ Add workout" in any cell → opens library picker

---

## Workout Scheduling

### Assign program to client
```
POST /programs/:programId/assign
{ clientId, startDate }

1. Validate program exists in org
2. For each ProgramWeek (index i):
   For each WorkoutTemplate in that week:
     Calculate scheduledDate = startDate + (i * 7) + dayOffset
     Create WorkoutInstance { clientId, templateId, scheduledDate }
3. Create ProgramAssignment record
4. Send push notification to client: "New program assigned"
```

### Schedule ad-hoc workout
```
POST /workouts/schedule
{ clientId, templateId, scheduledDate }

Creates single WorkoutInstance without program context.
```

### Move workout instance
```
PATCH /workouts/instances/:instanceId
{ scheduledDate: newDate }

Sets movedFromDate = original date, updates scheduledDate.
Client can move their own workouts (within constraints).
Coach can move any client's workout.
```

---

## Calendar Query

```
GET /clients/:clientId/calendar?startDate=2026-05-01&endDate=2026-05-31

Returns WorkoutInstances with:
- status (SCHEDULED / COMPLETED / SKIPPED)
- workout title + type
- log id (if completed)
- day of month
```

Used for both the coach's client calendar view and the client mobile calendar.

---

## Workout Duplication

```
POST /workouts/:workoutId/duplicate

Creates a deep copy of WorkoutTemplate + all WorkoutItems + prescriptions.
Returns new workout with title "Copy of [original title]".
```

Same pattern for programs: `POST /programs/:programId/duplicate` copies all weeks and their workout references.

---

## Client Mobile: Workout Execution Screen

```
WorkoutScreen (instanceId)
├── Header: workout title, day/date, duration timer
├── ScrollView:
│   └── ExerciseCard (per WorkoutItem)
│       ├── Exercise name
│       ├── VideoDemo (tap to expand fullscreen)
│       ├── Coach prescription (sets × reps @ weight)
│       ├── Previous performance (from last log)
│       └── SetLogger
│           └── SetRow (set 1, 2, 3...)
│               ├── Reps input
│               ├── Weight input
│               └── ✓ Complete button
└── Footer: "Finish Workout" button
```

**Previous performance:** When loading the workout, fetch the most recent `WorkoutLog` for the same `WorkoutItem.exerciseId` and show it as reference values.

---

## Offline Handling

When client submits a log while offline:
1. `useOfflineQueue` stores the log in SQLite with status `PENDING`
2. App polls for connectivity
3. When connected: flush queue → `POST /logging/workout-logs`
4. On success: mark local record as `SYNCED`
5. On conflict (already submitted): mark as `DUPLICATE`, skip

SQLite table:
```sql
CREATE TABLE offline_queue (
  id TEXT PRIMARY KEY,
  endpoint TEXT,
  payload TEXT,    -- JSON stringified body
  status TEXT DEFAULT 'PENDING',  -- PENDING | SYNCED | FAILED | DUPLICATE
  created_at TEXT,
  synced_at TEXT
);
```
