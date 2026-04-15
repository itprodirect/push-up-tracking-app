# Current State

_Last updated: April 2026_

## What Is Live

- **Frontend:** Vite + React single-page app deployed on Vercel.
- **Persistence:** Vercel serverless endpoint at `/api/persistence` backed by Supabase v1 tables.
- **Rollout fallback:** Browser `localStorage` remains active for local-first loading and cloud fallback during rollout.
- **Local-only state:** `app.tab` remains browser-local. Push-up daily goal still loads and saves locally.
- **Deployment:** Standard Vercel web app build. Not a PWA.
- **Validation:** Manual Preview validation passed, including cross-browser and incognito checks. Production deployment succeeded after merge.

## What Works Today

- Log push-up sets by day, track daily totals vs. a configurable goal.
- Log machine and free-weight exercises with sets, weight, and reps.
- Exercise catalog with canonical names, aliases, category auto-fill.
- Recent exercise suggestions with dedup and normalization.
- Trend chart for push-up history (Recharts).
- Workout summary and aggregation helpers.
- Push-up day changes and workout day changes save through `/api/persistence`.
- Supabase v1 schema exists for `user_settings`, `pushup_days`, `workout_days`, `workout_exercises`, and `workout_sets`.
- Day-scoped persistence behavior is in place at the API boundary for the current rollout path.
- Legacy category labels (`push`, `pull`, `legs`) load correctly into current labels.

## What Is Limited or Intentionally Incomplete

- **No auth.** The app is still in single-owner mode with `owner_key = 'solo'`.
- **Local-over-remote same-day conflicts still favor local data.** Initial merge behavior keeps local values when the same day exists in both places.
- **localStorage fallback is still part of the rollout.** Cloud saves are not yet the only active persistence path.
- **Some state is still local-only.** `app.tab` and push-up goal settings are not cloud-backed today.
- **Cloud save failure visibility is limited.** The app still prioritizes quiet fallback over explicit error UX.
- **No exports or backups.** No file-level export or backup path is live yet.

## Current Phase

**Solo alpha / dogfooding with Supabase v1 live.** One user (Nick) is actively using the app to log workouts. The next goal is to stabilize the cloud rollout, document the shipped behavior cleanly, and address remaining auth and sync follow-up.

## Key Files

| Area | Files |
|------|-------|
| Push-up logging | `src/PushUps.tsx` |
| Workout logging | `src/Workouts.tsx` |
| Exercise catalog | `src/exerciseCatalog.ts` |
| Local storage layer | `src/storage.ts` |
| Cloud persistence client | `src/cloudPersistence.ts` |
| Serverless persistence boundary | `api/persistence.js` |
| Supabase schema | `supabase/migrations/20260415172206_init_workout_persistence.sql` |
| Trend chart | `src/TrendChart.tsx` |
| Workout helpers | `src/workoutLog.helpers.ts` |
| Tests | `*.test.ts`, `*.test.tsx` |
