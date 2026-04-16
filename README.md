# Push-Up Tracking App

Vite + React workout tracker with push-up logging and machine/free-weight exercise logging. Deployed on Vercel with Supabase-backed persistence through a Vercel serverless endpoint, Supabase Auth v0 for sign-in gating, and a localStorage rollout fallback.

## Run Locally

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

## Docs

| Doc | Purpose |
|-----|---------|
| [North Star](./docs/00-north-star.md) | Product vision and rollout philosophy |
| [Current State](./docs/01-current-state.md) | What is live and working today |
| [Architecture](./docs/02-architecture.md) | Current runtime structure and persistence boundary |
| [Supabase v1 Persistence](./docs/supabase-v1-persistence.md) | Canonical shipped-state reference for cloud persistence |
| [Roadmap](./docs/03-roadmap.md) | Now / next / later priorities |
| [Agent Workflow](./docs/04-agent-workflow.md) | How coding agents should work in this repo |
| [Decision Log](./docs/05-decision-log.md) | Important product and architecture decisions |
| [Session Log Template](./docs/06-session-log-template.md) | Template for post-session documentation |
| [Quality Gates](./docs/07-quality-gates.md) | What "done enough to merge" means |
| [Heartbeat](./docs/08-heartbeat.md) | Current priorities and repo momentum |
| [Memory](./docs/09-memory.md) | Durable constraints and repo knowledge |
| [Backlog](./docs/backlog.md) | Remaining issue execution plan |

**Agents:** Start with `08-heartbeat.md` for rapid orientation, then `04-agent-workflow.md` for how to work.

## Current State

- Frontend runtime is a Vite + React SPA deployed on Vercel.
- Supabase Auth v0 gates the app UI behind approved-user email magic-link sign-in.
- Session restore and sign-out are live.
- Cloud persistence flows through `api/persistence.js` at `/api/persistence`, uses day-scoped writes, and now requires a valid Supabase bearer token.
- Supabase v1 schema and tables are in place for push-up and workout persistence.
- `app.tab` remains local-only, and localStorage fallback remains enabled during rollout.
- Persistence is still temporarily single-owner via `owner_key = 'solo'`; data is not yet partitioned per authenticated user.
- SMTP/custom email provider setup and auth rate-limit hardening are intentionally deferred.

See [docs/01-current-state.md](./docs/01-current-state.md) and [docs/supabase-v1-persistence.md](./docs/supabase-v1-persistence.md) for details.

## Exercise Catalog

The exercise catalog provides canonical names, aliases, and category auto-fill for workout logging. Key files:

- `src/exerciseCatalog.ts` - canonical list, alias map, helpers
- `src/Workouts.tsx` - workout form, datalist suggestions, quick-add
- `src/workoutLog.helpers.ts` - summary and aggregation helpers
- `src/storage.ts` - localStorage persistence and backward-compatible loading
- `src/cloudPersistence.ts` - client-side cloud load/save and rollout merge behavior
- `api/persistence.js` - Vercel serverless persistence boundary for Supabase
