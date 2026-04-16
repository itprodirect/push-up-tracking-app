# Roadmap

## Shipped

_Supabase v1 persistence and Supabase Auth v0 are live in production._

- Cloud persistence architecture is shipped as Vite + React on Vercel + Supabase behind `/api/persistence`
- Frontend persistence moved from localStorage-only to API-backed day-scoped writes for push-ups and workouts
- `api/persistence.js` handles persistence reads and writes
- The app UI is now gated behind approved-user email magic-link sign-in
- Session restore and sign-out are live
- `/api/persistence` now requires a valid Supabase bearer token

Related issues: [#9](https://github.com/itprodirect/push-up-tracking-app/issues/9), [#10](https://github.com/itprodirect/push-up-tracking-app/issues/10), [#11](https://github.com/itprodirect/push-up-tracking-app/issues/11), [#13](https://github.com/itprodirect/push-up-tracking-app/issues/13)

## Now

_Post-auth-v0 hardening and user-scoped persistence._

- Replace temporary `owner_key = 'solo'` persistence with data scoped to the authenticated user
- Add error handling and loading states for cloud save/load -> [#18](https://github.com/itprodirect/push-up-tracking-app/issues/18)
- Clean up environment and deployment documentation -> [#17](https://github.com/itprodirect/push-up-tracking-app/issues/17)

## Next

_Beta-readiness follow-up after user-scoped persistence._

- Add SMTP/custom email provider setup and auth rate-limit hardening
- Add historical workout views and cloud aggregation validation -> [#16](https://github.com/itprodirect/push-up-tracking-app/issues/16)
- Add data export and backup flow -> [#15](https://github.com/itprodirect/push-up-tracking-app/issues/15)

## Later

_Evaluate after beta is stable._

- Define S3 storage plan for exports, backups, AI artifacts -> [#12](https://github.com/itprodirect/push-up-tracking-app/issues/12)
- Evaluate attachments/media support via S3 -> [#19](https://github.com/itprodirect/push-up-tracking-app/issues/19)
- Evaluate AI-assisted workflows using cloud data -> [#20](https://github.com/itprodirect/push-up-tracking-app/issues/20)
- Evaluate broader user/account management -> [#21](https://github.com/itprodirect/push-up-tracking-app/issues/21)

## Exit Criteria

### Solo Alpha -> Limited Beta

- Auth path is selected and implemented
- Hard-coded `owner_key = 'solo'` is replaced by user-scoped persistence
- Cloud persistence is stable with acceptable error handling
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
