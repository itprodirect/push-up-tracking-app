# Supabase v1 Persistence

_Last updated: April 2026_

Canonical reference for the shipped Supabase-backed persistence path now live in production.

## What Shipped

- The app runtime remains a Vite + React SPA deployed on Vercel.
- Supabase Auth v0 now gates the app UI behind approved-user email magic-link sign-in.
- Session restore and sign-out are live.
- Cloud persistence now flows through the Vercel serverless endpoint at `/api/persistence`.
- `/api/persistence` now requires a valid Supabase bearer token.
- `/api/persistence` scopes reads and writes to the authenticated Supabase user id from that bearer token.
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

## Required Configuration

### Browser / Build Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

These power the browser-side Supabase Auth client used for magic-link sign-in, session restore, and sign-out.

### Server / Vercel Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

`api/persistence.js` currently reads those exact server-side names. `SUPABASE_SECRET_KEY` is the only secret in the current setup and belongs only in Vercel server context.

### Supabase Project Setup

- Use the same Supabase project for both the browser auth client and the Vercel serverless function.
- Allow redirect URLs for the local dev origin and the Vercel deployment origins you actually use.
- Pre-create or invite approved users in Supabase Auth. The current magic-link flow uses `shouldCreateUser: false`, so unknown emails cannot self-register.
- Treat older AWS / DynamoDB planning notes as historical only. The shipped runtime is Vercel + Supabase.

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
- Browser-local fallback for push-up and workout data is now scoped per authenticated user.
- Authenticated screens now show a compact sync indicator for cloud load, save, save success, and cloud-sync failures.
- Auth v0 is live and closes public UI access.
- The live ownership key is the authenticated Supabase user id (`auth.users.id`) extracted from the verified bearer token.
- Legacy rows that still exist under `owner_key = 'solo'` are not auto-backfilled by the app. Use the manual admin backfill path if that historical data still matters.
- The admin dry-run/apply workflow for that legacy backfill lives in [`docs/legacy-solo-backfill-runbook.md`](/C:/Users/user/push-up-tracking-app/docs/legacy-solo-backfill-runbook.md).
- Same-day local-over-remote conflict behavior still exists on initial merge.

## Local Dev and Deployment

- `npm run dev` runs the Vite SPA, not the Vercel serverless function.
- Browser auth can still be exercised locally with the `VITE_` variables and a matching Supabase redirect URL.
- Full `/api/persistence` verification should happen on a Vercel preview or production deployment with all four environment variables configured.
- Vercel deployment is the current source of truth for shipped behavior: static SPA build plus `api/persistence.js` from the same repo.

## Troubleshooting

- Browser startup throws a missing Supabase env error: check `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `/api/persistence` returns `503`: Vercel is missing `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SECRET_KEY`.
- Magic-link sign-in does not complete after opening the email: the origin is missing from Supabase redirect URLs, or the email is not an approved Auth user.
- `/api/persistence` returns `401` after sign-in: the browser and server are pointed at different Supabase projects, or the bearer token is stale.
- Local edits seem to work in `npm run dev` but do not show up elsewhere: expected when only `localStorage` fallback is active because the Vercel route is not running locally.

## Follow-Up That Still Remains

- Add SMTP/custom email provider setup and auth rate-limit hardening when moving beyond the current minimal auth gate.
- Decide whether and when to remove localStorage fallback.
- Revisit same-day local-over-remote conflict behavior.
- Decide whether push-up goal settings should stay local-only or move into the cloud path.

## Historical Reference

- Use [`docs/db-v1-discovery.md`](./db-v1-discovery.md) for the original discovery and planning note.
- Treat this document as the canonical shipped-state reference for Supabase v1.
