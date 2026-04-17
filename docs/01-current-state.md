# Current State

_Last updated: April 2026_

## What Is Live

- **Frontend:** Vite + React single-page app deployed on Vercel.
- **Auth:** Supabase Auth v0 gates the UI behind approved-user email magic-link sign-in.
- **Session lifecycle:** Session restore on reload and sign-out both work.
- **Persistence:** Vercel serverless endpoint at `/api/persistence` backed by Supabase v1 tables and protected by Supabase bearer-token verification.
- **Rollout fallback:** Browser `localStorage` remains active for local-first loading and cloud fallback during rollout.
- **Local-only state:** `app.tab` remains browser-local. Push-up daily goal still loads and saves locally.
- **Deployment:** Standard Vercel web app build. Not a PWA.

## What Works Today

- Log push-up sets by day, track daily totals vs. a configurable goal.
- Log machine and free-weight exercises with sets, weight, and reps.
- Exercise catalog with canonical names, aliases, category auto-fill.
- Recent exercise suggestions with dedup and normalization.
- Trend chart for push-up history (Recharts).
- Workout summary and aggregation helpers.
- Approved-user sign-in gate via email magic link.
- Session restore after refresh and explicit sign-out.
- Authenticated screens show a compact cloud sync status for initial load, save progress, save success, and cloud-sync failures.
- Push-up day changes and workout day changes save through `/api/persistence`.
- `/api/persistence` returns `401` for missing, malformed, expired, or invalid bearer tokens.
- Supabase v1 schema exists for `user_settings`, `pushup_days`, `workout_days`, `workout_exercises`, and `workout_sets`.
- Day-scoped persistence behavior is in place at the API boundary for the current rollout path.
- Legacy category labels (`push`, `pull`, `legs`) load correctly into current labels.

## What Is Limited or Intentionally Incomplete

- **Ownership is still single-owner.** Persistence remains hard-coded to `owner_key = 'solo'`.
- **Data is not yet partitioned per authenticated user.** Auth protects access, but it does not yet drive per-user storage.
- **Local-over-remote same-day conflicts still favor local data.** Initial merge behavior keeps local values when the same day exists in both places.
- **localStorage fallback is still part of the rollout.** Cloud saves are not yet the only active persistence path.
- **Some state is still local-only.** `app.tab` and push-up goal settings are not cloud-backed today.
- **Cloud sync UX is still intentionally small.** The app now surfaces compact load/save/failure state, but it still does not attempt richer retry flows or conflict-resolution UX.
- **SMTP/custom email provider setup is not done.** Auth still uses the minimal current Supabase email path.
- **Auth hardening is not done.** Broader SMTP, rate-limit, and production polish work was intentionally deferred from auth v0.
- **No exports or backups.** No file-level export or backup path is live yet.

## Current Phase

**Solo alpha / dogfooding with auth-gated UI and auth-protected persistence live.** The next likely slice is replacing the temporary `owner_key = 'solo'` model with user-scoped persistence tied to the authenticated user.

## Key Files

| Area | Files |
|------|-------|
| Push-up logging | `src/PushUps.tsx` |
| Workout logging | `src/Workouts.tsx` |
| Exercise catalog | `src/exerciseCatalog.ts` |
| Auth gate | `src/Root.tsx` |
| Supabase browser client | `src/supabaseClient.ts` |
| Local storage layer | `src/storage.ts` |
| Cloud persistence client | `src/cloudPersistence.ts` |
| Serverless persistence boundary | `api/persistence.js` |
| Supabase schema | `supabase/migrations/20260415172206_init_workout_persistence.sql` |
| Trend chart | `src/TrendChart.tsx` |
| Workout helpers | `src/workoutLog.helpers.ts` |
| Tests | `*.test.ts`, `*.test.tsx` |
