# Push-Up Tracking App

Vite + React workout tracker with push-up logging and machine/free-weight exercise logging. Currently deployed on Vercel with localStorage persistence.

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
| [Architecture](./docs/02-architecture.md) | Current and target system architecture |
| [Roadmap](./docs/03-roadmap.md) | Now / next / later priorities |
| [Agent Workflow](./docs/04-agent-workflow.md) | How coding agents should work in this repo |
| [Decision Log](./docs/05-decision-log.md) | Important product and architecture decisions |
| [Session Log Template](./docs/06-session-log-template.md) | Template for post-session documentation |
| [Quality Gates](./docs/07-quality-gates.md) | What "done enough to merge" means |
| [Heartbeat](./docs/08-heartbeat.md) | Current priorities and repo momentum |
| [Memory](./docs/09-memory.md) | Durable constraints and repo knowledge |
| [Backlog](./docs/backlog.md) | Issue execution plan with GitHub links |

**Agents:** Start with `08-heartbeat.md` for rapid orientation, then `04-agent-workflow.md` for how to work.

## Current State

- Frontend deployed on Vercel as a standard web app.
- Persistence is browser-local via `localStorage`. No cloud backend yet.
- Solo alpha phase — one user dogfooding before gradual beta rollout.
- Cloud persistence (DynamoDB + S3) is the primary infrastructure goal.

See [docs/01-current-state.md](./docs/01-current-state.md) for full details.

## Exercise Catalog

The exercise catalog provides canonical names, aliases, and category auto-fill for workout logging. Key files:

- `src/exerciseCatalog.ts` — canonical list, alias map, helpers
- `src/Workouts.tsx` — workout form, datalist suggestions, quick-add
- `src/workoutLog.helpers.ts` — summary and aggregation helpers
- `src/storage.ts` — localStorage persistence and backward-compatible loading
