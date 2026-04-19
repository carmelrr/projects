# Module: Nutrition & Habits

**Phase:** Growth
**Effort estimate:** 4–6 person-weeks

---

## Responsibility

Tracks daily habits and nutrition (macros, calories, subjective markers). Coach sets goals; client logs daily. Data feeds into compliance score and coach review.

---

## Key Files

```
apps/api/src/modules/
├── habits/
│   ├── habits.module.ts
│   ├── habits.controller.ts
│   ├── habits.service.ts
│   └── dto/
└── nutrition/
    ├── nutrition.module.ts
    ├── nutrition.controller.ts
    ├── nutrition.service.ts
    └── dto/
```

---

## Habit Tracking

### Habit Definitions

Coach creates habits for their org:

```
POST /habits/definitions
{
  name: "Morning Protein Shake",
  description: "Take within 30 min of waking",
  scheduleRule: "daily",
  countsForCompliance: true
}
```

`scheduleRule` options:
- `"daily"` — every day
- `"weekdays"` — Mon–Fri
- `"custom": [1, 3, 5]` — specific days of week (0=Sun)

### Client Daily Check-in

```
POST /clients/:clientId/habits/check-in
{
  date: "2026-05-01",
  entries: [
    { habitId: "habit_1", completed: true, notes: "Done at 6:30am" },
    { habitId: "habit_2", completed: false }
  ]
}
```

Upserts `HabitEntry` records for the given date.
One check-in per day (subsequent calls for same date update existing entries).

### Habit History

```
GET /clients/:clientId/habits?from=2026-04-01&to=2026-05-01

Returns calendar grid:
[{
  habitId, habitName, scheduleRule,
  entries: [
    { date: "2026-04-01", completed: true },
    { date: "2026-04-02", completed: false },
    ...
  ],
  completionRate: 0.82  // 30-day
}]
```

### Habit Reminder Push Notification

`HabitReminderJob` runs daily at a configurable time (default 8pm):
- Finds clients with incomplete habits for today
- Sends push notification: "Don't forget to log your habits today!"

---

## Habit UI (Mobile)

```
Habits Screen (daily)
├── Date header: "Today · Wednesday May 1"
├── Habit list:
│   ├── [✓] Morning Protein Shake
│   ├── [ ] 8 Hours Sleep
│   └── [ ] 10,000 Steps
└── [Submit Check-in] button
```

Streak display:
```
Morning Protein Shake
🔥 12-day streak
```

---

## Habit UI (Coach Web)

Client detail → Habits tab:
```
┌─────────┬────────────────────────────────────────────┐
│ Habit   │ Apr 1  2  3  4  5  6  7  8  9  10 ...     │
├─────────┼────────────────────────────────────────────┤
│ Protein │  ✓  ✓  ✓  ✗  ✓  ✓  ✓  ✓  ✓  ✓  ...  82% │
│ Sleep   │  ✗  ✓  ✓  ✓  ✓  ✗  ✓  ✓  ✗  ✓  ...  74% │
│ Steps   │  ✓  ✓  ✓  ✓  ✓  ✓  ✓  ✓  ✓  ✓  ...  96% │
└─────────┴────────────────────────────────────────────┘
```

---

## Nutrition Tracking

### Setting a Nutrition Goal (Coach)

```
POST /clients/:clientId/nutrition/goals
{
  calories: 2400,
  protein: 180,   // grams
  carbs: 250,
  fat: 80,
  fiber: 30
}
```

Goal is active from `activeFrom` until a new goal is set (`activeTo` on previous).

### Daily Nutrition Log (Client)

```
POST /clients/:clientId/nutrition
{
  date: "2026-05-01",
  calories: 2250,
  protein: 165,
  carbs: 230,
  fat: 78,
  water: 2500,    // ml
  weight: 81.5,   // kg (optional daily weigh-in)
  sleep: 7.5,     // hours
  steps: 9200,
  energy: 4,      // 1-5
  stress: 2,
  hunger: 3,
  notes: "Had a cheat meal at dinner"
}
```

One entry per day (upsert on date + clientId).

### Weekly Nutrition View (Web)

```
Week of May 1–7:
         | Cal  | Protein | Carbs | Fat
Goal     | 2400 |   180g  |  250g | 80g
Mon May 1| 2250 |   165g  |  230g | 78g  ✓
Tue May 2| 2600 |   190g  |  270g | 90g  ⚠
Wed May 3| —    |    —    |    —  |  —   ✗
...
Avg      | 2350 |   175g  |  245g | 82g
```

Subjective markers shown as sparkline below the table (energy/stress/hunger trends).

---

## Nutrition UI (Mobile)

Quick log screen:
```
Nutrition · Today
━━━━━━━━━━━━━━━━━━━━━━
Calories: [___] / 2400 kcal
Protein:  [___] / 180g
Carbs:    [___] / 250g
Fat:      [___] / 80g

─ Extras ─
💧 Water:  [___] ml
⚖️ Weight: [___] kg

─ How are you feeling? ─
Energy:  ○ ○ ● ○ ○  (1-5)
Stress:  ○ ● ○ ○ ○
Hunger:  ○ ○ ● ○ ○

[Save]
```

Goal vs actual bars shown at top (fill animation for satisfaction).

---

## Compliance Integration

When habit `countsForCompliance = true`:
- Include habit completion in compliance calculation
- `ComplianceUpdateJob` extended to count expected habits vs completed

Extended compliance formula:
```
total_scheduled = workouts_scheduled + expected_habits_for_period
total_completed = workouts_completed + habits_completed
compliance_rate = total_completed / total_scheduled
```
