# Supabase v1 Persistence

_Last updated: April 2026_

Canonical reference for the shipped Supabase-backed persistence path now live in production.

## What Shipped

- The app runtime remains a Vite + React SPA deployed on Vercel.
- Cloud persistence now flows through the Vercel serverless endpoint at `/api/persistence`.
- Supabase v1 schema and tables are in place for push-up and workout persistence.
- Writes were changed from broad owner-level replacement toward day-scoped persistence behavior at the API boundary.
- Preview validation passed, including cross-browser and incognito verification.
- Production deployment succeeded after the feature PR merged to `main`.

## Runtime Flow

1. The client loads local state from `src/storage.ts`.
2. `src/cloudPersistence.ts` requests a remote snapshot from `/api/persistence`.
3. The client merges remote data into local state on boot.
4. If both local and remote contain the same day key, local data currently wins.
5. User edits save locally first and then asynchronously post updates back to `/api/persistence`.

## Current Cloud Boundary

- Serverless handler: `api/persistence.js`
- Client integration: `src/cloudPersistence.ts`
- Schema definition: `supabase/migrations/20260415172206_init_workout_persistence.sql`

`/api/persistence` is the only cloud persistence boundary. The browser does not call Supabase directly.

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
- No auth exists yet.
- Ownership is still hard-coded to `owner_key = 'solo'`.
- Same-day local-over-remote conflict behavior still exists on initial merge.

## What Was Validated

- Preview environment worked end to end.
- Cross-browser verification passed.
- Incognito verification passed.
- Production deployment succeeded after merge.

## Follow-Up That Still Remains

- Add clearer error handling and loading states for cloud save/load.
- Replace the current hard-coded solo owner model with a real auth path before any external beta.
- Decide whether and when to remove localStorage fallback.
- Revisit same-day local-over-remote conflict behavior.
- Decide whether push-up goal settings should stay local-only or move into the cloud path.

## Historical Reference

- Use [`docs/db-v1-discovery.md`](./db-v1-discovery.md) for the original discovery and planning note.
- Treat this document as the canonical shipped-state reference for Supabase v1.
