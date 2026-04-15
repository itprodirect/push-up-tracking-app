# Current State

_Last updated: April 2026_

## What Is Live

- **Frontend:** Vite + React single-page app deployed on Vercel.
- **Persistence:** Browser `localStorage` only. No cloud backend.
- **Deployment:** Standard Vercel web app build. Not a PWA.
- **Testing:** Vitest test suite with coverage support.

## What Works Today

- Log push-up sets by day, track daily totals vs. a configurable goal.
- Log machine and free-weight exercises with sets, weight, and reps.
- Exercise catalog with canonical names, aliases, category auto-fill.
- Recent exercise suggestions with dedup and normalization.
- Trend chart for push-up history (Recharts).
- Workout summary and aggregation helpers.
- All data stored in versioned localStorage keys (`pushup.entries.v1`, etc.).
- Legacy category labels (`push`, `pull`, `legs`) load correctly into current labels.

## What Is Limited or Intentionally Incomplete

- **No cloud persistence.** Data lives only in the browser. Clearing storage = data loss.
- **No cross-device sync.** A different browser or device has no access to existing data.
- **No auth.** The app has no user identity concept.
- **No exports or backups.** No way to save data outside the browser.
- **No error handling for storage failures.** localStorage writes are fire-and-forget.
- **No API routes.** There is no `/api` directory or Vercel serverless function yet.

## Current Phase

**Solo alpha / dogfooding.** One user (Nick) is actively using the app to log workouts. The goal is to stabilize the frontend experience and build cloud persistence infrastructure.

## Key Files

| Area | Files |
|------|-------|
| Push-up logging | `src/PushUps.tsx` |
| Workout logging | `src/Workouts.tsx` |
| Exercise catalog | `src/exerciseCatalog.ts` |
| Storage layer | `src/storage.ts` |
| Trend chart | `src/TrendChart.tsx` |
| Workout helpers | `src/workoutLog.helpers.ts` |
| Tests | `*.test.ts`, `*.test.tsx` |
