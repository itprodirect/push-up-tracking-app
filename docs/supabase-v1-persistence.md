# Supabase v1 Persistence

_Last updated: April 2026_

Canonical reference for the shipped Supabase-backed persistence path now live in production.

## What Shipped

- The app runtime remains a Vite + React SPA deployed on Vercel.
- Supabase Auth v0 now gates the app UI behind approved-user email magic-link sign-in.
- Session restore and sign-out are live.
- Cloud persistence now flows through the Vercel serverless endpoint at `/api/persistence`.
- `/api/persistence` now requires a valid Supabase bearer token.
- Supabase v1 schema and tables are in place for push-up and workout persistence.
- Writes were changed from broad owner-level replacement toward day-scoped persistence behavior at the API boundary.

## Runtime Flow

1. The client loads local state from `src/storage.ts`.
2. `src/cloudPersistence.ts` reads the current Supabase access token only when cloud persistence is actually used.
3. `src/cloudPersistence.ts` requests a remote snapshot from `/api/persistence` with `Authorization: Bearer <token>`.
4. The serverless boundary validates the bearer token before reading or writing persistence data.
5. The client merges remote data into local state on boot.
6. If both local and remote contain the same day key, local data currently wins.
7. User edits save locally first and then asynchronously post updates back to `/api/persistence`.

## Current Cloud Boundary

- Serverless handler: `api/persistence.js`
- Client integration: `src/cloudPersistence.ts`
- Schema definition: `supabase/migrations/20260415172206_init_workout_persistence.sql`

`/api/persistence` is the only cloud persistence boundary for application data. The browser does not call Supabase tables directly.

## Current Schema

Supabase v1 currently defines:

- `user_settings`
- `pushup_days`
- `workout_days`
- `workout_exercises`
- `workout_sets`

Current runtime behavior:

- Workout data persists in normalized day / exercise / set tables.
- Push-up persistence uses per-day rows in `pushup_days`.
- The API also reads and writes `user_settings.pushup_settings` to preserve compatibility with the current push-up snapshot shape.

## Important Current Behaviors

- `app.tab` remains local-only in `localStorage`.
- Push-up daily goal settings still remain local-only.
- localStorage fallback remains enabled during rollout.
- Auth v0 is live and closes public UI access.
- Ownership is still hard-coded to `owner_key = 'solo'`.
- Auth protects the persistence API, but persisted data is not yet partitioned per authenticated user.
- Same-day local-over-remote conflict behavior still exists on initial merge.

## Follow-Up That Still Remains

- Add clearer error handling and loading states for cloud save/load.
- Replace the current hard-coded solo owner model with user-scoped persistence tied to the authenticated user.
- Add SMTP/custom email provider setup and auth rate-limit hardening when moving beyond the current minimal auth gate.
- Decide whether and when to remove localStorage fallback.
- Revisit same-day local-over-remote conflict behavior.
- Decide whether push-up goal settings should stay local-only or move into the cloud path.

## Historical Reference

- Use [`docs/db-v1-discovery.md`](./db-v1-discovery.md) for the original discovery and planning note.
- Treat this document as the canonical shipped-state reference for Supabase v1.
