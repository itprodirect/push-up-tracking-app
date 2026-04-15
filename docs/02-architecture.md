# Architecture

## Current Architecture

```text
Browser (Vite + React SPA on Vercel)
  -> React component state
  -> localStorage (UI-local state + rollout fallback)
  -> /api/persistence (Vercel serverless function)
  -> Supabase v1 tables
```

- Runtime remains a Vite + React SPA on Vercel, not a Next.js app.
- The browser never calls Supabase directly.
- Cloud persistence is mediated through `api/persistence.js` at `/api/persistence`.
- Data domains currently handled by the cloud path: push-up day entries and workout day data.

### Frontend Boundary

- The frontend boots from local data first via `src/storage.ts`.
- `src/cloudPersistence.ts` requests a remote snapshot from `/api/persistence` and merges it into local state on load.
- Current same-day conflict behavior favors local data over remote when both exist for the same key.
- `app.tab` remains local-only in `localStorage`.
- Push-up goal settings still load and save locally today.

### Backend / API Boundary

- `api/persistence.js` is a Vercel serverless function, not a Next.js route handler.
- `GET /api/persistence` returns the current push-up and workout snapshot.
- `POST /api/persistence` accepts `{ kind, day, ... }` payloads and persists the targeted day.
- The endpoint owns normalization, day-scoped persistence behavior, and Supabase translation.
- Supabase credentials live in Vercel environment variables, never in the browser.

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

### Auth Status

- No auth exists today.
- The current runtime is single-owner only with `owner_key = 'solo'`.
- Auth is still required before any external beta user.
- Removing the hard-coded owner model is a follow-up, not part of Supabase v1.

### localStorage During Rollout

- localStorage remains part of the runtime today.
- It still stores browser-local state and acts as fallback during rollout.
- The client loads local data first, then merges the remote snapshot from `/api/persistence`.
- Writes remain local-first and then asynchronously post updates to the serverless endpoint.

## Intentionally Deferred

- Direct browser -> Supabase access
- Auth and multi-user ownership
- Rich sync or conflict handling beyond current local-over-remote merge behavior
- Removing localStorage fallback entirely
- Rich attachment or media workflows
- AI features that depend on cloud-stored history
- PWA or offline-first architecture
