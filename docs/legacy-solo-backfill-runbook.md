# Legacy `solo` Backfill Runbook

This runbook prepares a one-time, admin-reviewed backfill for historical cloud rows that still use `owner_key = 'solo'`.

This is an operations document only. It does not authorize execution, and nothing in this repo runs the backfill automatically.

## Goal

Reassign legacy `solo` ownership to one explicit authenticated Supabase user id after the app's move to bearer-token verified, user-scoped persistence.

Current live behavior:

- `/api/persistence` verifies the Supabase bearer token.
- `/api/persistence` reads and writes `owner_key` as the authenticated `auth.users.id`.
- The app does not auto-backfill older `solo` rows.

## Current Expected Legacy Scope

Issue #39 was opened after a manual audit found this legacy `solo` footprint:

- `user_settings`: 1 row
- `pushup_days`: 3 rows
- `workout_days`: 3 rows
- descendant `workout_exercises`: 7 rows
- descendant `workout_sets`: 22 rows
- workout day range: `2026-03-31` through `2026-04-16`

Treat those numbers as an operator expectation check, not a hard-coded script invariant. If the dry-run output differs materially, stop and re-audit before any apply step.

## Scope

Owner-scoped tables that require direct reassignment:

- `public.user_settings`
- `public.pushup_days`
- `public.workout_days`

Descendant tables that do not require direct ownership mutation:

- `public.workout_exercises`
- `public.workout_sets`

Why descendants are validation-only:

- `workout_exercises` does not store `owner_key`; it follows `workout_day_id`
- `workout_sets` does not store `owner_key`; it follows `workout_exercise_id`
- Reassigning `public.workout_days.owner_key` preserves the descendant tree because the day ids stay the same

## Repo Assets

- Dry-run SQL: [`supabase/admin/backfill_legacy_solo_to_user_dry_run.sql`](/C:/Users/user/push-up-tracking-app/supabase/admin/backfill_legacy_solo_to_user_dry_run.sql)
- Manual apply SQL: [`supabase/admin/backfill_legacy_solo_to_user.sql`](/C:/Users/user/push-up-tracking-app/supabase/admin/backfill_legacy_solo_to_user.sql)

## Safety Rules

- No production mutation should happen until the dry-run output is reviewed by a human.
- The target user id must be supplied explicitly.
- Do not infer the target user id from email text pasted into SQL.
- Do not run the apply script if the dry-run shows conflicts or a missing target user.
- Do not run both scripts in the same tab by accident; the dry-run is read-only, the apply script starts a transaction.

## Prerequisites

1. User-scoped persistence is already deployed and smoke checked.
2. The operator has admin/service-role access to query `auth.users` and the persistence tables.
3. A quiet window is chosen so the target user is not actively writing data during review and apply.
4. A manual export or snapshot of the relevant `solo` rows and any target-owned rows is taken before the apply step.
5. The operator knows which authenticated Supabase account should receive the legacy data.

## Confirm The Correct Target User Id

Look up the target user in `auth.users` first. Do not guess the uuid.

Example lookup:

```sql
select id, email, created_at
from auth.users
where email = 'target@example.com';
```

The dry-run and apply scripts both fail if the supplied target id is not a valid `auth.users.id`.

## Dry-Run First

1. Open [`supabase/admin/backfill_legacy_solo_to_user_dry_run.sql`](/C:/Users/user/push-up-tracking-app/supabase/admin/backfill_legacy_solo_to_user_dry_run.sql).
2. Replace `__TARGET_USER_ID__` with the confirmed `auth.users.id`.
3. Run the script in Supabase SQL Editor or another manual SQL session.

Example `psql` usage after replacing the placeholder in the file:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/admin/backfill_legacy_solo_to_user_dry_run.sql
```

## What The Dry-Run Shows

The dry-run is read-only and reports:

- the explicit target user id and matching `auth.users` row
- source and target counts for:
  - `user_settings`
  - `pushup_days`
  - `workout_days`
  - descendant `workout_exercises`
  - descendant `workout_sets`
- the exact `solo` rows that would be reassigned in owner-scoped tables
- push-up day conflicts already present for the target owner
- workout day conflicts already present for the target owner
- whether a target `user_settings` row already exists
- descendant counts reachable from the `solo` workout days
- projected post-apply owner-scoped counts and a final `apply_ready` signal

## Dry-Run Validation Checklist

Before any apply step, confirm all of the following:

1. The target user id and email are the intended account.
2. The source counts match expectations closely enough to explain any drift from the issue #39 audit.
3. `apply_ready` is `true`.
4. `blocking_issue_count` is `0`.
5. There is no existing target `user_settings` row if a `solo` `user_settings` row still exists.
6. There are no conflicting `pushup_days.day` values already owned by the target user.
7. There are no conflicting `workout_days.day` values already owned by the target user.
8. The listed rows to be reassigned match the intended historical date range.

If any of those checks fail, stop. Review the conflicting rows manually rather than forcing a write.

## Manual Apply Flow

Only run this after the dry-run is clean and the operator has fresh exports or snapshots.

1. Open [`supabase/admin/backfill_legacy_solo_to_user.sql`](/C:/Users/user/push-up-tracking-app/supabase/admin/backfill_legacy_solo_to_user.sql).
2. Replace `__TARGET_USER_ID__` with the same confirmed `auth.users.id` used in the dry-run.
3. Run the script manually in a SQL session with write access.
4. Review the summary output and post-check queries before deciding whether to commit.

Example `psql` usage after replacing the placeholder in the file:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/admin/backfill_legacy_solo_to_user.sql
```

## Apply Script Behavior

The apply script is manual/admin-only and includes guardrails:

- starts a transaction with `begin`
- validates that `__TARGET_USER_ID__` was replaced
- validates that the supplied target id is a real `auth.users.id`
- fails if the target user already has a conflicting `user_settings` row
- fails if `pushup_days` contains any day collisions for the target user
- fails if `workout_days` contains any day collisions for the target user
- updates only:
  - `public.user_settings.owner_key`
  - `public.pushup_days.owner_key`
  - `public.workout_days.owner_key`
- does not update `workout_exercises` or `workout_sets`
- validates that descendant exercise/set counts still match the moved workout day ids

## Post-Apply Verification

Run the post-check queries printed by the apply script before committing.

Expected outcomes:

- no remaining `owner_key = 'solo'` rows in `user_settings`, `pushup_days`, or `workout_days`
- the target owner now holds the moved parent rows
- descendant `workout_exercises` and `workout_sets` counts reachable from the moved workout days are unchanged
- the moved workout day ids are still the same ids that own the descendant rows

If anything looks wrong, use `rollback;` in the same session instead of committing.

## Rollback Guidance

The safest rollback path is still transaction-first:

1. Run the apply script.
2. Review the emitted validation output.
3. Run the post-check queries in the same transaction.
4. `rollback;` if anything is unexpected.
5. `commit;` only after review.

Important limitation:

- This repo intentionally does not ship an automated post-commit undo script.
- After commit, recovery depends on the manual exports or snapshots taken before execution.
- That is safer than bundling destructive cleanup logic into a one-off operational script.

## Recommendation

This remains a docs-plus-admin-SQL workflow, not a migration workflow.

Why:

- It is a one-time operational reassignment.
- Automatic execution would be riskier than needed.
- The backfill should stay explicit, reviewable, and human-approved.
