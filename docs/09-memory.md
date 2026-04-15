# Memory

Durable constraints, patterns, and assumptions that any agent working in this repo should know. This file changes rarely.

## Facts

- The app is live on Vercel at a production URL.
- The app is a Vite + React SPA. No SSR, no framework router.
- All persistence is currently browser localStorage. There is no backend yet.
- localStorage keys are versioned (`.v1` suffix) to support future migration.
- The exercise catalog normalizes aliases to canonical names at save time, not through batch migration.
- Legacy stored data (old category labels, unnormalized exercise names) is handled at read/display boundaries.
- Tests use Vitest with React Testing Library. Run with `npm test`.
- Build with `npm run build` (includes TypeScript compilation).

## Architecture Constraints

- DynamoDB is the planned primary persistence layer. Not Postgres, not Firebase, not Supabase.
- S3 is for file-oriented storage (exports, backups, artifacts). It is not the app database.
- The browser must never call AWS directly. All AWS access goes through Vercel API routes.
- AWS credentials live in Vercel environment variables, never in client code.
- Auth is required before any external beta user. Solo alpha can operate without auth temporarily.

## Development Constraints

- Keep changes scoped to the issue being worked. Don't combine unrelated changes.
- Don't add dependencies without explicit approval.
- Don't introduce new architectural patterns that aren't documented in `02-architecture.md`.
- Don't assume auth, multi-user, or cloud features exist — check `01-current-state.md`.
- Normalization happens at save and read boundaries, not through batch storage migrations.

## Rollout Rules

- Dogfood first. Every feature gets real use by the builder before reaching anyone else.
- Beta users are added one at a time, deliberately.
- No external beta without auth.
- Keep the user count low until persistence, error handling, and backups are solid.

## Patterns to Preserve

- Exercise catalog is the single source of truth for canonical names, aliases, and categories (`src/exerciseCatalog.ts`).
- Storage module (`src/storage.ts`) owns all localStorage reads/writes and handles backward-compatible loading.
- The `pk=userId, sk=date` key design in storage.ts comments previews the DynamoDB model.
