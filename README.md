# Push-Up Tracking App

Vite + React workout tracker with push-up logging and machine/free-weight exercise logging. Deployed on Vercel with Supabase-backed persistence through a Vercel serverless endpoint, Supabase Auth v0 for sign-in gating, and a localStorage rollout fallback.

## Run Locally

Create `.env.local` with the current runtime keys:

| Variable | Used by | Required for | Notes |
|----------|---------|--------------|-------|
| `VITE_SUPABASE_URL` | Vite browser bundle | local dev and Vercel build | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Vite browser bundle | local dev and Vercel build | Supabase publishable key for browser auth |
| `NEXT_PUBLIC_SUPABASE_URL` | `api/persistence.js` | Vercel deploys; optional for SPA-only `npm run dev` | Current server code reads this exact name |
| `SUPABASE_SECRET_KEY` | `api/persistence.js` | Vercel deploys; optional for SPA-only `npm run dev` | Server-only secret key; never expose through `VITE_` vars |

The current runtime does not read `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, so it is not required.

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

### Local Dev Flow

- `npm run dev` starts the Vite SPA only.
- Supabase sign-in in local dev depends on `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and a Supabase Auth redirect URL for `http://localhost:5173`.
- The cloud persistence route lives at Vercel `api/persistence.js`. Plain Vite dev does not emulate that serverless route, so cloud save/load should be verified on a deployed Vercel preview or production environment.
- Because rollout fallback is still enabled, missing local API access falls back quietly to `localStorage` instead of breaking the UI.

## Deploy on Vercel

### Supabase Values You Need

- Project URL
- Publishable key for browser auth
- Secret key for server-side token verification and REST access
- Approved user emails already created or invited in Supabase Auth, because the app sends magic links with `shouldCreateUser: false`
- Auth redirect URLs that include the local dev origin such as `http://localhost:5173`, the Vercel production URL, and any Vercel preview domains you expect to use for sign-in testing

### Vercel Environment Variables

Set these in Vercel for both Preview and Production:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

`SUPABASE_SECRET_KEY` belongs only in Vercel server context. Do not place it in client code, do not rename it to a `VITE_` variable, and do not treat it as safe to expose in the browser.

### Deployment Flow

1. Create or link the Vercel project to this repo.
2. Add the four environment variables above to Preview and Production.
3. Confirm Supabase Auth redirect URLs and approved users are set up for the target Vercel domains.
4. Deploy the branch to Vercel. The SPA build and `api/persistence.js` deploy together from the same repo.
5. Smoke check the deployed app: sign in with an approved email, reload to confirm session restore, then save one push-up day and one workout day through `/api/persistence`.

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
- Authenticated screens now show a compact sync status for cloud load, save progress, save success, and sync failures.
- Supabase v1 schema and tables are in place for push-up and workout persistence.
- `app.tab` remains local-only, and localStorage fallback remains enabled during rollout.
- Cloud persistence is now scoped to the authenticated Supabase user id at `/api/persistence`.
- Browser local fallback for push-up and workout data is also scoped per authenticated user to avoid cross-user leakage on a shared device.
- SMTP/custom email provider setup and auth rate-limit hardening are intentionally deferred.

See [docs/01-current-state.md](./docs/01-current-state.md) and [docs/supabase-v1-persistence.md](./docs/supabase-v1-persistence.md) for details.

## Setup Constraints and Troubleshooting

What is intentionally not done yet:

- `localStorage` fallback remains enabled during rollout.
- `app.tab` and push-up goal settings remain local-only.
- Legacy cloud rows previously stored under `owner_key = 'solo'` are not auto-backfilled by the app. Use the manual admin backfill runbook if that data still needs to move to a real user id.
- SMTP/custom email provider setup and auth hardening are deferred.

Most likely setup mistakes:

- Missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY`: the browser client fails fast because `src/supabaseClient.ts` requires them at startup.
- Missing `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SECRET_KEY` in Vercel: `/api/persistence` returns `503 Supabase persistence is not configured.`
- Magic link email arrives but sign-in does not complete: the current origin is probably missing from Supabase Auth redirect URLs, or the email was not pre-created in Supabase Auth.
- Deployed app signs in but `/api/persistence` returns `401`: the browser and server are likely pointed at different Supabase projects, or the session token is stale.
- Local `npm run dev` appears to save but other devices do not see the change: expected for SPA-only local dev, because Vite does not run the Vercel serverless route.

## Exercise Catalog

The exercise catalog provides canonical names, aliases, and category auto-fill for workout logging. Key files:

- `src/exerciseCatalog.ts` - canonical list, alias map, helpers
- `src/Workouts.tsx` - workout form, datalist suggestions, quick-add
- `src/workoutLog.helpers.ts` - summary and aggregation helpers
- `src/storage.ts` - localStorage persistence and backward-compatible loading
- `src/cloudPersistence.ts` - client-side cloud load/save and rollout merge behavior
- `api/persistence.js` - Vercel serverless persistence boundary for Supabase
