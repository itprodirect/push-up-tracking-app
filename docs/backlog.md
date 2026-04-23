# Backlog

This backlog tracks the next practical follow-up after the merged Supabase v1 persistence rollout and auth v0 gate. The cloud foundation and minimal auth protection are already shipped; this file is for what remains.

## P0 Immediate Next Work

1. Re-run the revised legacy `solo` backfill dry-run in production and review the new `user_settings` merge checks before any manual apply decision
2. Add SMTP/custom email provider setup and auth rate-limit hardening

## P1 Near-Term Follow-Up

3. [#16 Add historical workout views and aggregation validation against cloud data](https://github.com/itprodirect/push-up-tracking-app/issues/16)
4. [#15 Add data export and backup flow](https://github.com/itprodirect/push-up-tracking-app/issues/15)

## P2 Later Or Optional

5. [#19 Evaluate attachments/media support backed by cloud storage](https://github.com/itprodirect/push-up-tracking-app/issues/19)
6. [#20 Evaluate AI-assisted workout or notes workflows using stored cloud data](https://github.com/itprodirect/push-up-tracking-app/issues/20)
7. [#21 Evaluate richer user/account management beyond limited beta access](https://github.com/itprodirect/push-up-tracking-app/issues/21)
- Optional visual polish only if dogfooding reveals a real issue: tiny crop, opacity, or spacing refinements for the new hero, analytics, or empty-state imagery.

## Sequencing Notes

- Treat Supabase v1 and `/api/persistence` as the live baseline.
- Treat auth-gated UI access and auth-protected persistence as the live baseline.
- Keep day-scoped persistence behavior intact when extending the cloud path.
- Preserve `app.tab` as local-only state unless a future issue changes that intentionally.
- Keep localStorage fallback until removal is planned and validated explicitly.
- Revisit same-day local-over-remote conflict behavior before broader rollout.
- Authenticated-user cloud ownership is now the live persistence model.
- Decorative app imagery and the follow-up visual polish lane are live and complete; avoid inventing more visual work unless real usage reveals a concrete tweak worth making.
- Legacy cloud rows that still exist under `owner_key = 'solo'` require a separate manual admin backfill if they need to move.
- Read-only production validation already confirmed the target auth user id `4666c980-df61-4285-8007-0c065ab32e70`, found no `pushup_days` or `workout_days` conflicts, and showed that `user_settings` needs the revised conservative merge path now documented in the checked-in SQL/runbook.
- The next session should use the revised checked-in dry-run SQL exactly as committed, run it manually in the production SQL editor, inspect the updated summary fields, and only consider apply if that revised dry-run returns fully clean.
- SMTP/custom email provider work and auth hardening remain the next intentionally deferred follow-up work.

## Issue Template Standard

Each implementation issue in this backlog should include:

- problem statement
- why it matters
- proposed scope
- out-of-scope
- acceptance criteria
- dependencies or sequencing notes
