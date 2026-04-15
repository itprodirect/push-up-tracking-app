# Memory

Durable constraints, patterns, and assumptions that any agent working in this repo should know. This file changes rarely.

## Facts

- The app is live on Vercel at a production URL.
- The app is a Vite + React SPA. No SSR, no framework router.
- The runtime cloud path is `api/persistence.js` at `/api/persistence`, backed by Supabase.
- `localStorage` is still part of the runtime for local-first loading, rollout fallback, and local-only state.
- localStorage keys are versioned (`.v1` suffix) to support future migration.
- The exercise catalog normalizes aliases to canonical names at save time, not through batch migration.
- Legacy stored data (old category labels, unnormalized exercise names) is handled at read and display boundaries.
- Tests use Vitest with React Testing Library. Run with `npm test`.
- Build with `npm run build` (includes TypeScript compilation).

## Architecture Constraints

- Supabase is the current v1 persistence backend for the live app.
- The browser must never call Supabase directly. All cloud persistence goes through `/api/persistence`.
- Supabase credentials live in Vercel environment variables, never in client code.
- Auth is required before any external beta user. Solo alpha can operate without auth temporarily.
- The current owner model is hard-coded to `owner_key = 'solo'`.
- Current same-day merge behavior favors local data over remote data when both exist.

## Development Constraints

- Keep changes scoped to the issue being worked. Don't combine unrelated changes.
- Don't add dependencies without explicit approval.
- Don't introduce new architectural patterns that are not documented in `02-architecture.md`.
- Don't assume auth, multi-user, or cloud features exist beyond what `01-current-state.md` documents.
- Normalization happens at save and read boundaries, not through batch storage migrations.

## Rollout Rules

- Dogfood first. Every feature gets real use by the builder before reaching anyone else.
- Beta users are added one at a time, deliberately.
- No external beta without auth.
- Keep the user count low until persistence, error handling, and backups are solid.

## Patterns to Preserve

- Exercise catalog is the single source of truth for canonical names, aliases, and categories (`src/exerciseCatalog.ts`).
- Storage module (`src/storage.ts`) owns localStorage reads and writes plus backward-compatible loading.
- Cloud persistence client (`src/cloudPersistence.ts`) owns remote load/save calls and rollout merge behavior.
- Serverless persistence boundary (`api/persistence.js`) owns the Supabase translation layer.
- `app.tab` remains local-only until explicitly changed.
