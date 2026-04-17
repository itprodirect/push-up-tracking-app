# Backlog

This backlog tracks the next practical follow-up after the merged Supabase v1 persistence rollout and auth v0 gate. The cloud foundation and minimal auth protection are already shipped; this file is for what remains.

## P0 Immediate Next Work

1. Replace temporary `owner_key = 'solo'` with user-scoped persistence keyed to the authenticated user

## P1 Near-Term Follow-Up

2. Add SMTP/custom email provider setup and auth rate-limit hardening
3. [#16 Add historical workout views and aggregation validation against cloud data](https://github.com/itprodirect/push-up-tracking-app/issues/16)
4. [#15 Add data export and backup flow](https://github.com/itprodirect/push-up-tracking-app/issues/15)

## P2 Later Or Optional

5. [#19 Evaluate attachments/media support backed by cloud storage](https://github.com/itprodirect/push-up-tracking-app/issues/19)
6. [#20 Evaluate AI-assisted workout or notes workflows using stored cloud data](https://github.com/itprodirect/push-up-tracking-app/issues/20)
7. [#21 Evaluate richer user/account management beyond limited beta access](https://github.com/itprodirect/push-up-tracking-app/issues/21)

## Sequencing Notes

- Treat Supabase v1 and `/api/persistence` as the live baseline.
- Treat auth-gated UI access and auth-protected persistence as the live baseline.
- Keep day-scoped persistence behavior intact when extending the cloud path.
- Preserve `app.tab` as local-only state unless a future issue changes that intentionally.
- Keep localStorage fallback until removal is planned and validated explicitly.
- Revisit same-day local-over-remote conflict behavior before broader rollout.
- The next primary lane is replacing the temporary single-owner `solo` model with user-scoped persistence.
- SMTP/custom email provider work and auth hardening remain intentionally deferred follow-up work.

## Issue Template Standard

Each implementation issue in this backlog should include:

- problem statement
- why it matters
- proposed scope
- out-of-scope
- acceptance criteria
- dependencies or sequencing notes
