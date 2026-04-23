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
- **Visual polish:** Decorative app imagery is live from `public/images/app`, with reusable page heroes and subtle analytics/empty-state accents.

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
- Cloud reads and writes are scoped to the authenticated Supabase user id.
- Browser-local fallback for push-up and workout data is scoped to the authenticated user, so sign-out or account switching does not silently show another user's cached cloud-backed data.
- Supabase v1 schema exists for `user_settings`, `pushup_days`, `workout_days`, `workout_exercises`, and `workout_sets`.
- Day-scoped persistence behavior is in place at the API boundary for the current rollout path.
- Legacy category labels (`push`, `pull`, `legs`) load correctly into current labels.
- Push-Ups and Workouts both show subtle branded hero imagery via `PageHero`.
- Workout empty state now includes the generated empty-state illustration.
- Push-up and workout trend cards include a low-opacity analytics background accent.

## What Is Limited or Intentionally Incomplete

- **Local-over-remote same-day conflicts still favor local data.** Initial merge behavior keeps local values when the same day exists in both places.
- **localStorage fallback is still part of the rollout.** Cloud saves are not yet the only active persistence path.
- **Some state is still local-only.** `app.tab` and push-up goal settings are not cloud-backed today.
- **Cloud sync UX is still intentionally small.** The app now surfaces compact load/save/failure state, but it still does not attempt richer retry flows or conflict-resolution UX.
- **Legacy solo cloud data is not auto-migrated.** Existing rows that were previously stored under `owner_key = 'solo'` still require the separate admin backfill runbook if they need to move to a real user id.
- **Legacy solo backfill is still not applied in production.** Read-only production validation verified the target auth user, confirmed no `pushup_days` or `workout_days` conflicts, and found that `user_settings` requires a conservative merge path. The repo-side dry-run/apply SQL and runbook were updated for that case, but the revised production dry-run still needs to be rerun before any manual apply is considered.
- **SMTP/custom email provider setup is not done.** Auth still uses the minimal current Supabase email path.
- **Auth hardening is not done.** Broader SMTP, rate-limit, and production polish work was intentionally deferred from auth v0.
- **No exports or backups.** No file-level export or backup path is live yet.

## Current Phase

**Solo alpha / dogfooding with auth-gated UI, auth-protected persistence, authenticated-user cloud ownership, and the first visual polish pass live.** The immediate operational next step is rerunning the revised legacy `solo` backfill dry-run in production from the checked-in SQL, then reviewing the new `user_settings` merge checks before any manual apply decision. SMTP/custom email provider setup plus auth hardening remain the next broader product-facing slice.

## Key Files

| Area | Files |
|------|-------|
| Push-up logging | `src/PushUps.tsx` |
| Workout logging | `src/Workouts.tsx` |
| Page hero imagery | `src/PageHero.tsx`, `public/images/app/heroes/` |
| Decorative app assets | `public/images/app/` |
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
