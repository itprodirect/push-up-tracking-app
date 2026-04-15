# Roadmap

## Shipped

_Supabase v1 persistence is live in production._

- ~~Define cloud persistence architecture~~ → shipped as Vite + React on Vercel + Supabase behind `/api/persistence`
- ~~Migrate frontend from localStorage-only to API-backed persistence~~ → day-scoped cloud writes live for push-ups and workouts
- ~~Add Vercel API routes for workout CRUD and history reads~~ → `api/persistence.js` handles read/write

Related issues: [#9](https://github.com/itprodirect/push-up-tracking-app/issues/9), [#10](https://github.com/itprodirect/push-up-tracking-app/issues/10), [#11](https://github.com/itprodirect/push-up-tracking-app/issues/11), [#13](https://github.com/itprodirect/push-up-tracking-app/issues/13)

## Now

_Auth foundation and rollout hardening._

- Define and implement auth path for external beta → [#14](https://github.com/itprodirect/push-up-tracking-app/issues/14)
  - Preferred direction: Supabase Auth (see decision log)
  - Clerk deferred unless future product requirements justify it
- Add error handling and loading states for cloud save/load → [#18](https://github.com/itprodirect/push-up-tracking-app/issues/18)
- Clean up environment and deployment documentation → [#17](https://github.com/itprodirect/push-up-tracking-app/issues/17)

## Next

_Beta readiness and supporting features._

- Add historical workout views and cloud aggregation validation → [#16](https://github.com/itprodirect/push-up-tracking-app/issues/16)
- Add data export and backup flow → [#15](https://github.com/itprodirect/push-up-tracking-app/issues/15)
- Add environment variable and deployment documentation → [#17](https://github.com/itprodirect/push-up-tracking-app/issues/17)

## Later

_Evaluate after beta is stable._

- Define S3 storage plan for exports, backups, AI artifacts → [#12](https://github.com/itprodirect/push-up-tracking-app/issues/12)
- Evaluate attachments/media support via S3 → [#19](https://github.com/itprodirect/push-up-tracking-app/issues/19)
- Evaluate AI-assisted workflows using cloud data → [#20](https://github.com/itprodirect/push-up-tracking-app/issues/20)
- Evaluate broader user/account management → [#21](https://github.com/itprodirect/push-up-tracking-app/issues/21)

## Exit Criteria

### Solo Alpha → Limited Beta

- Auth is selected and implemented (replaces hard-coded `owner_key = 'solo'`).
- Cloud persistence is stable with acceptable error handling.
- Deployment and environment docs are complete.
- Backup/export paths exist or are explicitly scheduled.

### Limited Beta → Broader Rollout

- At least 1–3 beta users are actively logging.
- Conflict handling beyond same-day local-over-remote is addressed.
- localStorage fallback removal is planned or completed.

## Deferred On Purpose

- Direct browser access to AWS or Supabase
- Set-level notes in the first cloud version
- Rich attachment workflows
- AI features dependent on cloud-stored history
- Broader user and account management beyond limited beta
