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

## Current Production Target

For the current production issue #39 lane, the verified target account is:

- email: `nick@itprodirect.com`
- `auth.users.id`: `4666c980-df61-4285-8007-0c065ab32e70`

For production use of this runbook, stop and re-verify with a fresh read-only `auth.users` query if that target changes.

## Scope

Owner-scoped parent tables affected by the backfill:

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

`user_settings` is handled differently from the day tables:

- `pushup_days` and `workout_days` still use direct `owner_key` reassignment
- `user_settings` now uses a conservative merge into the existing target row, followed by removal of the `solo` row

## Repo Assets

- Dry-run SQL: [`supabase/admin/backfill_legacy_solo_to_user_dry_run.sql`](/C:/Users/user/push-up-tracking-app/supabase/admin/backfill_legacy_solo_to_user_dry_run.sql)
- Manual apply SQL: [`supabase/admin/backfill_legacy_solo_to_user.sql`](/C:/Users/user/push-up-tracking-app/supabase/admin/backfill_legacy_solo_to_user.sql)

## Safety Rules

- No production mutation should happen until the dry-run output is reviewed by a human.
- The target user id must be supplied explicitly.
- Do not infer the target user id from email text pasted into SQL.
- Do not run the apply script if the dry-run shows conflicts or a missing target user.
- Do not run both scripts in the same tab by accident; the dry-run uses session-local temp objects only, while the apply script starts a transaction and mutates permanent app tables.

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

The dry-run uses session-local temp objects and reports:

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
- `user_settings` structure checks for source and target rows
- unexpected top-level `pushup_settings` keys outside `entries`
- source and target `pushup_settings.entries` day keys
- explicit `user_settings` entry-date overlap detection
- descendant counts reachable from the `solo` workout days
- projected post-apply owner-scoped counts and a final `apply_ready` signal

## Dry-Run Validation Checklist

Before any apply step, confirm all of the following:

1. The target user id and email are the intended account.
2. The source counts match expectations closely enough to explain any drift from the issue #39 audit.
3. `source_user_settings_count` is `1`.
4. `target_user_settings_count` is `1`.
5. `pushup_day_conflict_count` is `0`.
6. `workout_day_conflict_count` is `0`.
7. `user_settings_invalid_shape_count` is `0`.
8. `user_settings_unexpected_top_level_key_count` is `0`.
9. `user_settings_entry_overlap_count` is `0`.
10. `apply_ready` is `true`.
11. `blocking_issue_count` is `0`.
12. The listed rows to be reassigned match the intended historical date range.

If any of those checks fail, stop. Review the conflicting rows manually rather than forcing a write.

## `user_settings` Merge Rule

The `user_settings` path is intentionally conservative.

Preconditions:

- for the current production lane, the verified target user id must be `4666c980-df61-4285-8007-0c065ab32e70`
- `pushup_day_conflict_count` must be `0`
- `workout_day_conflict_count` must be `0`
- `source_user_settings_count` must be `1`
- `target_user_settings_count` must be `1`
- source and target `pushup_settings` must be `null` or JSON objects
- source and target `pushup_settings.entries` must be missing, `null`, or JSON objects
- no unexpected top-level `pushup_settings` keys may exist outside `entries`
- source and target `entries` day keys must be disjoint
- any overlapping `entries` day key aborts the apply path

Merge behavior:

- preserve the existing target `user_settings` row
- preserve existing target `entries`
- merge in the `solo` `entries`
- final target `pushup_settings` contains the union of source and target entry-date keys under `entries`
- do not auto-resolve overlap; abort instead
- after a successful apply there must be exactly one target `user_settings` row and no remaining `solo` `user_settings` row

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
- validates that the supplied target id is a non-empty, non-`solo`, valid `auth.users.id`
- requires exactly one `solo` `user_settings` row and exactly one target `user_settings` row
- fails if `user_settings` shape is not limited to the understood `entries` object
- fails if any top-level `pushup_settings` key exists outside `entries`
- fails if any `user_settings.entries` day key overlaps between source and target
- merges `solo` `user_settings.entries` into the existing target `user_settings` row
- deletes the `solo` `user_settings` row only after the merge update succeeds
- fails if `pushup_days` contains any day collisions for the target user
- fails if `workout_days` contains any day collisions for the target user
- directly reassigns `owner_key` only on:
  - `public.pushup_days`
  - `public.workout_days`
- does not update `workout_exercises` or `workout_sets`
- validates that descendant exercise/set counts still match the moved workout day ids

## Post-Apply Verification

Run the post-check queries printed by the apply script before committing.

Expected outcomes:

- no remaining `owner_key = 'solo'` rows in `user_settings`, `pushup_days`, or `workout_days`
- the target owner now holds the moved parent rows
- the target `user_settings` row contains the union of source and target `entries` day keys
- there is exactly one target `user_settings` row
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
