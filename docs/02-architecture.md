# Architecture

## Current Architecture

```text
Browser (Vite + React SPA on Vercel)
  -> React component state
  -> localStorage (UI-local state + rollout fallback)
  -> Supabase Auth (approved-user magic link, session restore, sign-out)
  -> /api/persistence (Vercel serverless function, bearer token required)
  -> Supabase v1 tables
```

- Runtime remains a Vite + React SPA on Vercel, not a Next.js app.
- The browser never calls Supabase data tables directly.
- Cloud persistence is mediated through `api/persistence.js` at `/api/persistence`.
- Data domains currently handled by the cloud path: push-up day entries and workout day data.

### Frontend Boundary

- `src/Root.tsx` owns the auth gate, session restore, and sign-out flow.
- The frontend boots from local data first via `src/storage.ts`.
- `src/cloudPersistence.ts` requests a remote snapshot from `/api/persistence` and merges it into local state on load.
- `src/cloudPersistence.ts` only loads the Supabase client when it actually needs an access token.
- Current same-day conflict behavior favors local data over remote when both exist for the same key.
- `app.tab` remains local-only in `localStorage`.
- Push-up goal settings still load and save locally today.

### Backend / API Boundary

- `api/persistence.js` is a Vercel serverless function, not a Next.js route handler.
- `GET /api/persistence` returns the current push-up and workout snapshot.
- `POST /api/persistence` accepts `{ kind, day, ... }` payloads and persists the targeted day.
- The endpoint owns normalization, day-scoped persistence behavior, and Supabase translation.
- The endpoint requires `Authorization: Bearer <jwt>` and returns `401` for missing or invalid tokens.
- The endpoint verifies the bearer token with Supabase Auth and derives the persistence owner from the verified `auth.users.id`.
- Supabase credentials live in Vercel environment variables, never in the browser.

### Runtime Configuration

- The browser auth client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- The serverless persistence boundary currently reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
- `SUPABASE_SECRET_KEY` is server-only and must never be exposed through `VITE_` variables or client code.
- The project URL is configured twice today because the browser bundle and the Vercel serverless function read different env variable names.
- `npm run dev` starts the Vite SPA only; it does not provide full local parity for `/api/persistence`.
- End-to-end auth plus cloud persistence verification should happen on a deployed Vercel environment.

### Supabase Role

Supabase v1 is the current cloud persistence backend. Schema lives in:

- `supabase/migrations/20260415172206_init_workout_persistence.sql`

Current tables:

- `user_settings`
- `pushup_days`
- `workout_days`
- `workout_exercises`
- `workout_sets`

Current practical usage:

- Workout data persists in normalized day / exercise / set tables.
- Push-up persistence uses per-day rows in `pushup_days`.
- The API also reads and writes `user_settings.pushup_settings` to preserve compatibility with the current push-up snapshot shape.

### Auth and Ownership Status

- Supabase Auth v0 is live.
- The UI is closed behind approved-user email magic-link sign-in.
- Session restore and sign-out are part of the shipped runtime.
- Persistence is auth-protected and authenticated-user scoped.
- `/api/persistence` reads and writes `owner_key` as the authenticated Supabase user id from the verified bearer token.
- The legacy `owner_key = 'solo'` model is no longer the desired runtime ownership model.
- Any remaining `solo` rows are legacy cloud data only. They are not auto-backfilled by the app and must be handled through the manual admin runbook when needed.
- The legacy `solo` backfill is still a separate operational step; do not assume it has already been applied.

### localStorage During Rollout

- localStorage remains part of the runtime today.
- It still stores browser-local state and acts as fallback during rollout.
- The client loads local data first, then merges the remote snapshot from `/api/persistence`.
- Writes remain local-first and then asynchronously post updates to the serverless endpoint.
- This fallback means plain local SPA development can still appear healthy even when the serverless route is unavailable.

## Intentionally Deferred

- Any return to the earlier AWS / DynamoDB planning path. Those notes are historical only, not the live runtime.
- Direct browser -> Supabase table access
- Legacy `solo` data migration outside the manual admin backfill runbook
- Broader multi-user account management beyond authenticated-user-scoped persistence
- Rich sync or conflict handling beyond current local-over-remote merge behavior
- Removing localStorage fallback entirely
- SMTP/custom email provider setup and auth rate-limit hardening
- Rich attachment or media workflows
- AI features that depend on cloud-stored history
- PWA or offline-first architecture
