# DB v1 Discovery (Historical)

This document is the pre-implementation discovery note used during Supabase v1 planning.

- It is kept as historical reference for original data-shape analysis and open questions from planning.
- It is **not** the canonical shipped-state reference for the live app.
- For the current production implementation, use [`docs/supabase-v1-persistence.md`](./supabase-v1-persistence.md).

## A. Current persisted entities

### Persisted in `localStorage`

1. `app.tab`
   - UI preference only.
   - Values observed in code: `'pushups' | 'workouts'`.
   - Source: `src/App.tsx:5-16`.

2. `pushup.settings.v1`
   - Global push-up settings object.
   - Currently only stores `dailyGoal`.
   - Source: `src/storage.ts:12-18`, `src/storage.ts:44-60`.

3. `pushup.entries.v1`
   - Root object keyed by local-date string (`YYYY-MM-DD`).
   - Each value is one push-up day entry.
   - Source: `src/storage.ts:7-18`, `src/storage.ts:19-42`.

4. `workouts.entries.v1`
   - Root object keyed by local-date string (`YYYY-MM-DD`).
   - Each value is one workout day object containing nested exercises and nested sets.
   - Source: `src/storage.ts:70-121`.

### `sessionStorage`

- No `sessionStorage` usage found in `src/`.
- Search basis: `rg -n "sessionStorage" src` returned no matches.

### Derived only, not persisted

These are computed from persisted base data and do not have their own storage key:

- Push-up stats: `total`, `weekAvg`, `streak` in `src/PushUps.tsx:242-270`
- Push-up trend/history points: `{ date, value }[]` in `src/PushUps.tsx:272-305`
- Recent days list: `{ date, total }[]` in `src/PushUps.tsx:307-316`
- Workout volume trend points: `{ date, value }[]` in `src/Workouts.tsx:401-435`
- Recent exercise suggestions in `src/Workouts.tsx:370-399`
- Workout log range filtering and summaries in `src/workoutLog.helpers.ts:38-94`

## B. Field-by-field shape for each entity

### 1. `app.tab`

Type:

```ts
type Tab = 'pushups' | 'workouts';
```

Field shape:

| Field | Type | Required | Notes |
|------|------|----------|------|
| value | string | yes | Stored as the raw string `'pushups'` or `'workouts'` |

Source:
- `src/App.tsx:5-16`

Short excerpt:

```ts
const saved = localStorage.getItem('app.tab');
return saved === 'workouts' ? 'workouts' : 'pushups';
localStorage.setItem('app.tab', t);
```

### 2. Push-up settings (`pushup.settings.v1`)

Type:

```ts
export type Settings = {
  dailyGoal: number;
};
```

Field shape:

| Field | Type | Required | Nullable | Notes |
|------|------|----------|----------|------|
| dailyGoal | number | yes | no | Loader only accepts finite numbers `> 0`; default fallback is `50` |

Source:
- `src/storage.ts:12-18`
- `src/storage.ts:44-60`

Loader behavior:
- Missing or invalid payload falls back to `{ dailyGoal: 50 }`
- `dailyGoal: 0` is treated as invalid

### 3. Push-up day entry (`pushup.entries.v1`)

Type:

```ts
export type DayEntry = {
  date: string; // YYYY-MM-DD, local timezone
  sets: number[];
};
```

Persisted root shape:

```ts
Record<string, DayEntry>
```

Field shape:

| Field | Type | Required | Nullable | Notes |
|------|------|----------|----------|------|
| root key | string | yes | no | Date key in `YYYY-MM-DD` local time |
| date | string | yes | no | Loader falls back to the root key if `value.date` is invalid |
| sets | number[] | yes | no | Loader filters to finite numbers only |

Source:
- `src/storage.ts:7-10`
- `src/storage.ts:19-42`
- `src/PushUps.tsx:28-48`

Behavior notes:
- The app writes the entire `Record<string, DayEntry>` back on every state change.
- Push-up day rows are deleted when the last set is removed (`src/PushUps.tsx:38-48`).
- In normal UI usage, persisted push-up days have at least one set.
- On load, malformed persisted days can normalize into `{ date, sets: [] }` and still remain in memory (`src/storage.test.ts:128-142`).

### 4. Workout day entry (`workouts.entries.v1`)

Types:

```ts
export type WorkoutSet = {
  weight: number;
  reps: number;
};

export type WorkoutExercise = {
  id: string;
  name: string;
  category?:
    | 'Chest / Push'
    | 'Back / Pull'
    | 'Arms'
    | 'Shoulders'
    | 'Legs'
    | 'Cardio'
    | 'core'
    | 'other';
  sets: WorkoutSet[];
  notes?: string;
};

export type WorkoutDay = {
  date: string;
  exercises: WorkoutExercise[];
};
```

Persisted root shape:

```ts
Record<string, WorkoutDay>
```

Field shape:

| Field | Type | Required | Nullable | Notes |
|------|------|----------|----------|------|
| root key | string | yes | no | Date key in `YYYY-MM-DD` local time |
| date | string | yes | no | Loader falls back to root key if invalid |
| exercises | WorkoutExercise[] | yes | no | Loader normalizes invalid entries out |
| exercises[].id | string | yes | no | Client-generated UUID-like string |
| exercises[].name | string | yes | no | Normalized through exercise catalog when added from UI |
| exercises[].category | string union | no | yes | Optional; legacy `'push'/'pull'/'legs'` are mapped on load |
| exercises[].notes | string | no | yes | Loader accepts it; current UI does not create or edit it |
| exercises[].sets | WorkoutSet[] | yes | no | May be empty |
| exercises[].sets[].weight | number | yes | no | Must be finite; UI allows `0` and decimals |
| exercises[].sets[].reps | number | yes | no | Must be finite in loader; UI only creates positive integers |

Source:
- `src/storage.ts:70-121`
- `src/storage.ts:148-191`
- `src/Workouts.tsx:42-135`

Behavior notes:
- The app persists empty exercise shells immediately after `Add exercise`, before any sets are logged (`src/Workouts.tsx:42-56`).
- Workout days with only empty exercises are persisted, but excluded from most derived views:
  - log filtering: `src/workoutLog.helpers.ts:38-54`
  - volume trend "all" range start detection: `src/Workouts.tsx:406-417`
  - recent exercise suggestions: `src/Workouts.tsx:381-393`
- Removing the last set from the last exercise deletes the entire day (`src/Workouts.tsx:107-121`).

### 5. Derived stats/history/trends shapes

These are not persisted today, but they matter for Supabase query design.

Push-up stats:

```ts
{ total: number; weekAvg: number; streak: number }
```

Push-up trend/history points:

```ts
{ date: string; value: number }[]
```

Workout volume trend points:

```ts
{ date: string; value: number }[]
```

Workout log summary:

```ts
type RangeSummary = {
  workoutCount: number;
  totalVolume: number;
  totalSets: number;
  topExercises: { name: string; count: number; volume: number }[];
};
```

Source:
- `src/PushUps.tsx:242-316`
- `src/TrendChart.tsx:13-28`
- `src/Workouts.tsx:401-435`
- `src/workoutLog.helpers.ts:56-94`

## C. Source files and storage keys

### Storage keys

| Storage key | Kind | Source file(s) | Purpose |
|------|------|------|------|
| `app.tab` | `localStorage` | `src/App.tsx:5-16` | Selected primary tab |
| `pushup.settings.v1` | `localStorage` | `src/storage.ts:17`, `src/storage.ts:44-60`, `src/PushUps.tsx:15,21` | Push-up settings |
| `pushup.entries.v1` | `localStorage` | `src/storage.ts:16`, `src/storage.ts:19-42`, `src/PushUps.tsx:14,20` | Push-up day entries |
| `workouts.entries.v1` | `localStorage` | `src/storage.ts:96`, `src/storage.ts:98-121`, `src/Workouts.tsx:25,34` | Workout days with nested exercises/sets |

### Files responsible for saving data

| Responsibility | Source |
|------|------|
| Save selected tab | `src/App.tsx:13-16` |
| Save push-up entries | `src/PushUps.tsx:20`, `src/storage.ts:40-42` |
| Save push-up settings | `src/PushUps.tsx:21`, `src/storage.ts:59-61` |
| Save workouts | `src/Workouts.tsx:34`, `src/storage.ts:119-121` |

### Files responsible for loading data

| Responsibility | Source |
|------|------|
| Load selected tab | `src/App.tsx:8-11` |
| Load push-up entries | `src/PushUps.tsx:14`, `src/storage.ts:19-38` |
| Load push-up settings | `src/PushUps.tsx:15`, `src/storage.ts:44-57` |
| Load workouts | `src/Workouts.tsx:25`, `src/storage.ts:98-117` |

### Files responsible for transforming/normalizing data

| Responsibility | Source |
|------|------|
| Normalize push-up entries on load | `src/storage.ts:26-32`, `src/storage.ts:178-180` |
| Normalize workout exercises/sets/categories on load | `src/storage.ts:148-191` |
| Normalize exercise names and aliases | `src/exerciseCatalog.ts:114-137` |
| Build recent exercise suggestions | `src/Workouts.tsx:370-399` |
| Filter workouts by date range | `src/workoutLog.helpers.ts:38-54` |
| Aggregate workout summaries/top exercises | `src/workoutLog.helpers.ts:63-94` |

### Files responsible for computing stats/trends/history

| Responsibility | Source |
|------|------|
| Push-up totals/streak/week average | `src/PushUps.tsx:242-270` |
| Push-up chart history | `src/PushUps.tsx:272-305` |
| Push-up recent days | `src/PushUps.tsx:307-316` |
| Workout day volume | `src/storage.ts:123-130` |
| Workout chart history | `src/Workouts.tsx:401-435` |
| Workout log range labels | `src/workoutLog.helpers.ts:96-110` |
| Workout log summary/top exercises | `src/workoutLog.helpers.ts:63-94` |

## D. Example JSON payloads

### 1. `app.tab`

```json
"workouts"
```

### 2. `pushup.settings.v1`

```json
{
  "dailyGoal": 75
}
```

### 3. `pushup.entries.v1`

Current persisted root object:

```json
{
  "2026-04-13": {
    "date": "2026-04-13",
    "sets": [10, 20]
  },
  "2026-04-14": {
    "date": "2026-04-14",
    "sets": [10, 10, 20, 10]
  }
}
```

Source-backed by:
- `src/storage.test.ts:108-142`

### 4. `workouts.entries.v1`

Current persisted root object:

```json
{
  "2026-04-13": {
    "date": "2026-04-13",
    "exercises": [
      {
        "id": "a",
        "name": "Bench Press",
        "category": "Chest / Push",
        "sets": [
          { "weight": 100, "reps": 10 },
          { "weight": 100, "reps": 10 }
        ]
      },
      {
        "id": "b",
        "name": "Lat Pull",
        "sets": [
          { "weight": 90, "reps": 10 }
        ]
      }
    ]
  }
}
```

Source-backed by:
- `src/storage.test.ts:155-171`
- `src/storage.test.ts:227-252`

### 5. Valid-but-important workout payload variants

Empty exercise shell that the current UI can persist:

```json
{
  "2026-04-15": {
    "date": "2026-04-15",
    "exercises": [
      {
        "id": "7cc205fc-9f49-47bb-b0eb-f4f0efae2f7d",
        "name": "Bench Press",
        "category": "Chest / Push",
        "sets": []
      }
    ]
  }
}
```

Why this matters:
- `addExercise()` creates and saves the exercise before any sets exist (`src/Workouts.tsx:42-56`).
- Derived workout history/log views usually ignore these rows until sets exist.

Legacy category payload accepted on load:

```json
{
  "2026-04-13": {
    "date": "2026-04-13",
    "exercises": [
      { "id": "a", "name": "Bench", "category": "push", "sets": [{ "weight": 100, "reps": 10 }] },
      { "id": "b", "name": "Row", "category": "pull", "sets": [{ "weight": 90, "reps": 10 }] },
      { "id": "c", "name": "Leg Press", "category": "legs", "sets": [{ "weight": 300, "reps": 10 }] }
    ]
  }
}
```

Normalized in memory to:

```json
{
  "2026-04-13": {
    "date": "2026-04-13",
    "exercises": [
      { "id": "a", "name": "Bench", "category": "Chest / Push", "sets": [{ "weight": 100, "reps": 10 }] },
      { "id": "b", "name": "Row", "category": "Back / Pull", "sets": [{ "weight": 90, "reps": 10 }] },
      { "id": "c", "name": "Leg Press", "category": "Legs", "sets": [{ "weight": 300, "reps": 10 }] }
    ]
  }
}
```

Source-backed by:
- `src/storage.test.ts:227-252`

## E. Originally proposed Supabase tables

### Recommendation

Use normalized base tables for v1, but keep them very close to the current app model:

- `pushup_days`
- `user_settings`
- `workout_days`
- `workout_exercises`
- `workout_sets`

Do not create separate tables for history, trends, or stats in v1. The current app derives all of those from base data.

### 1. `pushup_days`

| Column | Type | Null | Notes |
|------|------|------|------|
| `id` | `uuid` | no | PK, default `gen_random_uuid()` |
| `user_id` | `uuid` | yes | Nullable now; future `auth.users(id)` FK |
| `entry_date` | `date` | no | Represents current `YYYY-MM-DD` local key |
| `sets` | `integer[]` | no | Closest match to current `number[]` push-up sets |
| `created_at` | `timestamptz` | no | Default `now()` |
| `updated_at` | `timestamptz` | no | Default `now()` |

Why:
- Preserves ordered push-up set arrays exactly.
- Supports current UI without inventing a lower-level row model.

### 2. `user_settings`

| Column | Type | Null | Notes |
|------|------|------|------|
| `id` | `uuid` | no | PK, default `gen_random_uuid()` |
| `user_id` | `uuid` | yes | Nullable now; future `auth.users(id)` FK |
| `daily_goal` | `integer` | no | Default `50`; mirrors current loader fallback |
| `created_at` | `timestamptz` | no | Default `now()` |
| `updated_at` | `timestamptz` | no | Default `now()` |

Why:
- Matches current persisted settings exactly.
- Keep this per-user later; singleton-like in the current no-auth phase.

### 3. `workout_days`

| Column | Type | Null | Notes |
|------|------|------|------|
| `id` | `uuid` | no | PK, default `gen_random_uuid()` |
| `user_id` | `uuid` | yes | Nullable now; future `auth.users(id)` FK |
| `entry_date` | `date` | no | Represents current `YYYY-MM-DD` local key |
| `created_at` | `timestamptz` | no | Default `now()` |
| `updated_at` | `timestamptz` | no | Default `now()` |

Why:
- One row per current `WorkoutDay`.
- Keeps date-scoped workout grouping intact.

### 4. `workout_exercises`

| Column | Type | Null | Notes |
|------|------|------|------|
| `id` | `text` | no | Preserve current client-generated string ID |
| `workout_day_id` | `uuid` | no | FK to `workout_days(id)` |
| `position` | `integer` | no | Preserve array order |
| `name` | `text` | no | Current persisted exercise name |
| `category` | `text` | yes | Nullable because current model allows missing category |
| `notes` | `text` | yes | Nullable because current model allows missing notes |
| `created_at` | `timestamptz` | no | Default `now()` |

Why:
- Keeps exact nested exercise structure, but relational.
- `category` should be free text in v1, not a strict enum, because stored data and loader already accept legacy/current mismatches.

### 5. `workout_sets`

| Column | Type | Null | Notes |
|------|------|------|------|
| `id` | `bigint` | no | Identity PK |
| `workout_exercise_id` | `text` | no | FK to `workout_exercises(id)` |
| `position` | `integer` | no | Preserve set order for grouping and undo semantics |
| `weight` | `numeric` | no | Current UI supports decimals |
| `reps` | `integer` | no | Current UI writes positive integers only |

Why:
- Current UI behavior depends on set order for grouped display and undo-last-set.
- A separate sets table makes volume/history/top-exercise queries much easier than nested JSON.

### Fields that should be nullable now for future auth/user support

Auth-related:

- `pushup_days.user_id`
- `user_settings.user_id`
- `workout_days.user_id`

Existing shape-related:

- `workout_exercises.category`
- `workout_exercises.notes`

What I would not make nullable:

- All date fields
- All exercise/set identifiers
- `sets` array / set rows
- `daily_goal`

### What not to move to Supabase in v1

- `app.tab`
  - It is a local UI preference, not workout data.
  - Keeping it in `localStorage` avoids creating backend state for a view-only toggle.

## F. Original migration/cutover plan

1. Freeze the v1 source-of-truth mapping.
   - Keep the current localStorage keys as the canonical input model for import.
   - Treat `history`, `trends`, and `stats` as derived only.

2. Implement a one-time local import path.
   - Read `pushup.settings.v1`, `pushup.entries.v1`, and `workouts.entries.v1`.
   - Reuse current normalization rules from `src/storage.ts` before inserting anything.
   - This matters because the current app already tolerates malformed or legacy payloads.

3. Insert push-ups first.
   - For each `pushup.entries.v1` date key:
     - insert one `pushup_days` row with `entry_date`
     - write `sets` as the ordered integer array

4. Insert workouts second.
   - For each workout date key:
     - insert one `workout_days` row
     - insert one `workout_exercises` row per exercise, preserving array order as `position`
     - insert one `workout_sets` row per set, preserving array order as `position`

5. Insert settings once.
   - If `pushup.settings.v1` is missing or invalid, seed `daily_goal = 50`.

6. Keep localStorage read support during rollout.
   - On first successful cloud sync, write a small migration marker or imported-at flag locally.
   - Continue reading localStorage as fallback for one release window.
   - Do not delete localStorage immediately.

7. Preserve current date semantics.
   - Current keys are local-day strings, not UTC timestamps.
   - Store them as `date` in Postgres, not `timestamp`, or you risk day-boundary drift.

8. Delay strict constraints until after backfill.
   - Import first.
   - After real data is clean, decide on stricter uniqueness and RLS.
   - Do not start with a strict enum on `category`.

9. After cutover, recompute all derived views from base tables.
   - Push-up stats/trends
   - Workout volume trends
   - Workout log summaries/top exercises

10. Leave `app.tab` local-only.
    - It does not need migration.

## G. Original questions/ambiguities

1. `notes` exists in the persisted workout shape, but there is no current UI path that creates or edits it.
   - Source: loader supports `notes` in `src/storage.ts:155-160`
   - Write path never sets it in `src/Workouts.tsx:42-72`
   - Decision needed: keep the field in v1 anyway, or drop it deliberately.

2. Workout categories are inconsistent across the codebase.
   - `WorkoutExercise['category']` accepts `'core'` and `'other'` in `src/storage.ts:78-86`
   - The current exercise catalog UI only exposes `Chest / Push`, `Back / Pull`, `Arms`, `Shoulders`, `Legs`, `Cardio` in `src/exerciseCatalog.ts:31-38`
   - Decision needed: preserve free-text categories in DB, or define a stricter canonical enum and migrate old values.

3. The current app persists empty workout exercises before any sets are logged.
   - Source: `src/Workouts.tsx:42-56`
   - Downstream summaries/logs usually ignore them.
   - Decision needed: should Supabase mirror this exactly, or only persist workouts once the first set is logged.

4. There is no current identity or device concept.
   - The app is effectively single-user and browser-local today.
   - Nullable `user_id` works for a transition, but real multi-user behavior will need a future identity strategy.

5. Push-up data stores set arrays, not individual set rows.
   - That is fine for v1 if you keep `integer[]`.
   - If you later want per-set timestamps or more granular analytics, push-ups may need a second normalization step.

6. Existing loader logic silently sanitizes malformed payloads.
   - Source: `src/storage.ts:19-38`, `src/storage.ts:98-117`, `src/storage.test.ts:128-252`
   - Decision needed: should import mimic that exact sanitization, or should malformed rows be rejected and surfaced.
