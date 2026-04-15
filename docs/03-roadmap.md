# Roadmap

## Now

_Architecture and data contracts — no backend code yet._

- Define cloud persistence architecture (Vercel + DynamoDB + S3) → [#9](https://github.com/itprodirect/push-up-tracking-app/issues/9)
- Define DynamoDB data model for workouts, push-ups, notes, settings → [#10](https://github.com/itprodirect/push-up-tracking-app/issues/10)
- Define S3 storage plan for exports, backups, AI artifacts → [#12](https://github.com/itprodirect/push-up-tracking-app/issues/12)

## Next

_Server boundary and persistence migration._

- Add Vercel API routes for workout CRUD and history reads → [#11](https://github.com/itprodirect/push-up-tracking-app/issues/11)
- Migrate frontend from localStorage-only to API-backed persistence → [#13](https://github.com/itprodirect/push-up-tracking-app/issues/13)
- Add error handling and loading states for cloud save/load → [#18](https://github.com/itprodirect/push-up-tracking-app/issues/18)

## Later

_Beta readiness and supporting features._

- Define minimal auth path for external beta → [#14](https://github.com/itprodirect/push-up-tracking-app/issues/14)
- Add data export and backup flow via S3 → [#15](https://github.com/itprodirect/push-up-tracking-app/issues/15)
- Add historical workout views and cloud aggregation validation → [#16](https://github.com/itprodirect/push-up-tracking-app/issues/16)
- Add environment variable and deployment documentation → [#17](https://github.com/itprodirect/push-up-tracking-app/issues/17)
- Evaluate attachments/media support via S3 → [#19](https://github.com/itprodirect/push-up-tracking-app/issues/19)
- Evaluate AI-assisted workflows using cloud data → [#20](https://github.com/itprodirect/push-up-tracking-app/issues/20)
- Evaluate broader user/account management → [#21](https://github.com/itprodirect/push-up-tracking-app/issues/21)

## Exit Criteria

### Solo Alpha → Cloud Persistence

- Cloud read/write path exists behind Vercel API routes.
- DynamoDB is the source of truth for core entities.
- S3 plan is documented and export work is queued.
- Frontend behavior is preserved from the user's perspective.

### Cloud Persistence → Limited Beta

- Auth approach is selected and implemented.
- Deployment and environment docs are complete.
- Error handling and loading states are acceptable for real users.
- Backup/export paths exist or are explicitly scheduled.

## Deferred On Purpose

- Direct browser access to AWS
- Set-level notes in the first cloud version
- Rich attachment workflows
- AI features dependent on cloud-stored history
- Broader user and account management beyond limited beta
