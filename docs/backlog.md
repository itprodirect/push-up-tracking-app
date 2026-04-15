# Backlog

This backlog is the execution plan for moving from browser-only persistence to a Vercel + AWS architecture without implementing the backend in this pass.

## P0 Immediate Next Work

1. [#9 Define cloud persistence architecture for Vercel + AWS](https://github.com/itprodirect/push-up-tracking-app/issues/9)
2. [#10 Add DynamoDB data model for workouts, push-ups, notes, and settings](https://github.com/itprodirect/push-up-tracking-app/issues/10)
3. [#11 Add Vercel API routes for workout CRUD and history reads](https://github.com/itprodirect/push-up-tracking-app/issues/11)
4. [#12 Add S3 support plan for exports, backups, and AI artifacts](https://github.com/itprodirect/push-up-tracking-app/issues/12)
5. [#13 Migrate persistence from localStorage-only to API-backed storage](https://github.com/itprodirect/push-up-tracking-app/issues/13)
6. [#14 Define minimal auth path required before external beta](https://github.com/itprodirect/push-up-tracking-app/issues/14)

## P1 Near-Term Follow-Up

7. [#15 Add data export and backup flow using S3](https://github.com/itprodirect/push-up-tracking-app/issues/15)
8. [#16 Add historical workout views and aggregation validation against cloud data](https://github.com/itprodirect/push-up-tracking-app/issues/16)
9. [#17 Add environment variable and deployment documentation for Vercel + AWS](https://github.com/itprodirect/push-up-tracking-app/issues/17)
10. [#18 Add error handling/loading states for cloud save/load](https://github.com/itprodirect/push-up-tracking-app/issues/18)

## P2 Later Or Optional

11. [#19 Evaluate attachments/media support backed by S3](https://github.com/itprodirect/push-up-tracking-app/issues/19)
12. [#20 Evaluate AI-assisted workout or notes workflows using stored cloud data](https://github.com/itprodirect/push-up-tracking-app/issues/20)
13. [#21 Evaluate richer user/account management beyond limited beta access](https://github.com/itprodirect/push-up-tracking-app/issues/21)

## Sequencing Notes

- Start with architecture and data model before building the API.
- Keep DynamoDB as the source of truth for app records.
- Introduce S3 early for file-oriented concerns, but do not let it become the main application database.
- Keep notes at workout-day and exercise scope in the first cloud version.
- Treat auth as deferred for solo alpha only; it becomes mandatory before external beta.

## Issue Template Standard

Each implementation issue in this backlog should include:

- problem statement
- why it matters
- proposed scope
- out-of-scope
- acceptance criteria
- dependencies or sequencing notes
