# Backlog

This backlog tracks the next practical follow-up after the merged Supabase v1 persistence rollout and auth v0 gate. The cloud foundation and minimal auth protection are already shipped; this file is for what remains.

## P0 Immediate Next Work

1. Create a docs-only persistence v2 design plan covering canonical push-up source of truth, exact set preservation, atomic day-write/RPC strategy, read/write migration, testing, and rollback
2. Create issue-backed implementation tickets from that design
3. Re-run the revised legacy `solo` backfill dry-run in production and review the new `user_settings` merge checks before any manual apply decision

## P1 Near-Term Follow-Up

4. Implement the canonical push-up persistence source of truth
5. Implement atomic day writes after the source-of-truth decision
6. Add deployed auth/persistence smoke validation with a disposable account or operator checklist automation
7. Add SMTP/custom email provider setup and auth rate-limit hardening

## P2 Later Or Optional

8. Address the existing Vite dynamic/static import chunking warning in `src/supabaseClient.ts`
9. Address the existing Vite large bundle/chunk-size warning
10. [#16 Add historical workout views and aggregation validation against cloud data](https://github.com/itprodirect/push-up-tracking-app/issues/16)
11. [#15 Add data export and backup flow](https://github.com/itprodirect/push-up-tracking-app/issues/15)
12. [#19 Evaluate attachments/media support backed by cloud storage](https://github.com/itprodirect/push-up-tracking-app/issues/19)
13. [#20 Evaluate AI-assisted workout or notes workflows using stored cloud data](https://github.com/itprodirect/push-up-tracking-app/issues/20)
14. [#21 Evaluate richer user/account management beyond limited beta access](https://github.com/itprodirect/push-up-tracking-app/issues/21)
- Optional visual polish only if dogfooding reveals a real issue: tiny crop, opacity, or spacing refinements for the new hero, analytics, or empty-state imagery.

## Sequencing Notes

- Treat Supabase v1 and `/api/persistence` as the live baseline.
- Treat auth-gated UI access and auth-protected persistence as the live baseline.
- Keep day-scoped persistence behavior intact when extending the cloud path.
- Do not implement persistence v2 before the design plan decides the canonical push-up source of truth.
- Preserve exact push-up set data when resolving the `user_settings.pushup_settings.entries` versus `pushup_days` model.
- Implement atomic day writes only after the source-of-truth decision is made.
- Preserve `app.tab` as local-only state unless a future issue changes that intentionally.
- Keep localStorage fallback until removal is planned and validated explicitly.
- Keep localStorage fallback until cloud persistence, conflict handling, import UX, and backfill safety are improved.
- Revisit same-day local-over-remote conflict behavior before broader rollout.
- Authenticated-user cloud ownership is now the live persistence model.
- Decorative app imagery and the follow-up visual polish lane are live and complete; avoid inventing more visual work unless real usage reveals a concrete tweak worth making.
- Legacy cloud rows that still exist under `owner_key = 'solo'` require a separate manual admin backfill if they need to move.
- Read-only production validation already confirmed the target auth user id `4666c980-df61-4285-8007-0c065ab32e70`, found no `pushup_days` or `workout_days` conflicts, and showed that `user_settings` needs the revised conservative merge path now documented in the checked-in SQL/runbook.
- The next session should use the revised checked-in dry-run SQL exactly as committed, run it manually in the production SQL editor, inspect the updated summary fields, and only consider apply if that revised dry-run returns fully clean.
- SMTP/custom email provider work and auth hardening remain intentionally deferred behind persistence source-of-truth design work.

## Issue Template Standard

Each implementation issue in this backlog should include:

- problem statement
- why it matters
- proposed scope
- out-of-scope
- acceptance criteria
- dependencies or sequencing notes
