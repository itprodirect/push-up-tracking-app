# Roadmap

## Shipped

_Supabase v1 persistence and Supabase Auth v0 are live in production._

- Cloud persistence architecture is shipped as Vite + React on Vercel + Supabase behind `/api/persistence`
- Frontend persistence moved from localStorage-only to API-backed day-scoped writes for push-ups and workouts
- `api/persistence.js` handles persistence reads and writes
- The app UI is now gated behind approved-user email magic-link sign-in
- Session restore and sign-out are live
- `/api/persistence` now requires a valid Supabase bearer token
- Cloud reads and writes are now scoped to the authenticated Supabase user id

Related issues: [#9](https://github.com/itprodirect/push-up-tracking-app/issues/9), [#10](https://github.com/itprodirect/push-up-tracking-app/issues/10), [#11](https://github.com/itprodirect/push-up-tracking-app/issues/11), [#13](https://github.com/itprodirect/push-up-tracking-app/issues/13)

## Now

_Post-deep-review persistence stabilization planning._

1. Create a docs-only persistence v2 design plan covering:
   - canonical push-up source of truth
   - exact set preservation
   - atomic day-write/RPC strategy
   - read/write migration strategy
   - testing and rollback plan
2. Create issue-backed implementation tickets from that design.
3. Run and review the legacy `owner_key = 'solo'` production dry-run manually before any apply step.

## Next

_Implement the persistence design once reviewed._

1. Implement the canonical push-up persistence source of truth.
2. Implement atomic day writes after the source-of-truth decision.
3. Add deployed auth/persistence smoke validation with a disposable account or operator checklist automation.
4. Add SMTP/custom email provider setup and auth rate-limit hardening.

## Later

_Evaluate after beta is stable._

- Address the existing Vite dynamic/static import chunking warning in `src/supabaseClient.ts`.
- Address the existing Vite large bundle/chunk-size warning.
- Add historical workout views and cloud aggregation validation -> [#16](https://github.com/itprodirect/push-up-tracking-app/issues/16)
- Add data export and backup flow -> [#15](https://github.com/itprodirect/push-up-tracking-app/issues/15)
- Define S3 storage plan for exports, backups, AI artifacts -> [#12](https://github.com/itprodirect/push-up-tracking-app/issues/12)
- Evaluate attachments/media support via S3 -> [#19](https://github.com/itprodirect/push-up-tracking-app/issues/19)
- Evaluate AI-assisted workflows using cloud data -> [#20](https://github.com/itprodirect/push-up-tracking-app/issues/20)
- Evaluate broader user/account management -> [#21](https://github.com/itprodirect/push-up-tracking-app/issues/21)

## Exit Criteria

### Solo Alpha -> Limited Beta

- Auth path is selected and implemented
- Cloud persistence is scoped to the authenticated user
- Cloud persistence is stable with acceptable error handling
- Push-up persistence has one documented canonical source of truth
- Day writes are atomic or have an explicitly accepted rollback/error-handling model
- Deployment and environment docs are complete
- Backup/export paths exist or are explicitly scheduled

### Limited Beta -> Broader Rollout

- At least 1-3 beta users are actively logging
- Conflict handling beyond same-day local-over-remote is addressed
- localStorage fallback removal is planned or completed

## Deferred On Purpose

- Direct browser access to AWS or Supabase tables
- Set-level notes in the first cloud version
- SMTP/custom email provider and auth rate-limit hardening in auth v0
- Rich attachment workflows
- AI features dependent on cloud-stored history
- Broader user and account management beyond limited beta
