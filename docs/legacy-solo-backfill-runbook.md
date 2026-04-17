# Legacy `solo` Backfill Runbook

This runbook prepares a one-time admin backfill from legacy cloud data stored under `owner_key = 'solo'` into a real authenticated Supabase user id after PR1 user-scoped persistence.

This document is preparation only. It does not authorize execution.

## Scope

Backfill only the persistence tables currently used by [`api/persistence.js`](/C:/Users/user/push-up-tracking-app/api/persistence.js):

- `public.user_settings`
- `public.pushup_days`
- `public.workout_days`
- `public.workout_exercises`
- `public.workout_sets`

Current shipped write behavior:

- Push-up saves are day-scoped and write both `user_settings.pushup_settings.entries` and `pushup_days`.
- Workout saves replace one full workout day at a time for the authenticated owner and rebuild that day's exercise/set tree.
- Ownership is now derived from the validated Supabase bearer token on the server.

## What Needs Backfill

Legacy data to consider:

- The `public.user_settings` row where `owner_key = 'solo'`
- All `public.pushup_days` rows where `owner_key = 'solo'`
- All `public.workout_days` rows where `owner_key = 'solo'`
- All descendant `public.workout_exercises` and `public.workout_sets` rows reachable from those solo workout days

Data that does **not** need a separate ownership rewrite:

- `workout_exercises` does not store `owner_key`; it follows `workout_day_id`
- `workout_sets` does not store `owner_key`; it follows `workout_exercise_id`

## Backfill Rules

The one-time backfill should be idempotent and conservative.

- The source owner is always `solo`.
- The target owner is a validated authenticated user id supplied manually at execution time.
- Existing target-owned data wins over legacy `solo` data.
- The backfill only fills target gaps; it must not overwrite newer target-owned rows.

Collision policy:

- `pushup_days`: copy only solo days that do not already exist for the target owner.
- `workout_days`: treat each workout day as atomic. If the target owner already has a row for the same `day`, skip that entire workout day and its descendants.
- `user_settings.pushup_settings`: merge JSON with target precedence.

`pushup_settings` merge policy:

- Top-level keys outside `entries`: copy solo-only keys, but keep target values on conflicts.
- Nested `entries` object: merge by day key, with target entry values winning on conflicts.
- Do not delete target keys during backfill.

## Preconditions

Run later only after these checks pass:

1. PR1 user-scoped persistence is deployed and has passed smoke testing and manual validation.
2. The target authenticated user id is confirmed from Supabase Auth, not guessed.
3. The operator has service-role level access to query and write the persistence tables.
4. A quiet window is chosen so the target user is not actively writing data during the backfill.
5. A manual export or snapshot of the current `solo` rowset and target rowset is taken before execution.

## Pre-Check Queries

Replace `__TARGET_USER_ID__` before running any query.

### Validate the target user exists

```sql
select id, email, created_at
from auth.users
where id = '__TARGET_USER_ID__'::uuid;
```

### Count current source and target rows

```sql
select 'user_settings' as table_name, owner_key, count(*) as row_count
from public.user_settings
where owner_key in ('solo', '__TARGET_USER_ID__')
group by table_name, owner_key

union all

select 'pushup_days' as table_name, owner_key, count(*) as row_count
from public.pushup_days
where owner_key in ('solo', '__TARGET_USER_ID__')
group by table_name, owner_key

union all

select 'workout_days' as table_name, owner_key, count(*) as row_count
from public.workout_days
where owner_key in ('solo', '__TARGET_USER_ID__')
group by table_name, owner_key
order by table_name, owner_key;
```

### Inspect push-up day collisions

```sql
select s.day
from public.pushup_days s
join public.pushup_days t
  on t.owner_key = '__TARGET_USER_ID__'
 and t.day = s.day
where s.owner_key = 'solo'
order by s.day;
```

### Inspect workout day collisions

```sql
select s.day
from public.workout_days s
join public.workout_days t
  on t.owner_key = '__TARGET_USER_ID__'
 and t.day = s.day
where s.owner_key = 'solo'
order by s.day;
```

### Inspect `pushup_settings.entries` day collisions

```sql
with solo_entry_days as (
  select jsonb_object_keys(
    case
      when jsonb_typeof(pushup_settings -> 'entries') = 'object' then pushup_settings -> 'entries'
      else '{}'::jsonb
    end
  ) as day
  from public.user_settings
  where owner_key = 'solo'
),
target_entry_days as (
  select jsonb_object_keys(
    case
      when jsonb_typeof(pushup_settings -> 'entries') = 'object' then pushup_settings -> 'entries'
      else '{}'::jsonb
    end
  ) as day
  from public.user_settings
  where owner_key = '__TARGET_USER_ID__'
)
select s.day
from solo_entry_days s
join target_entry_days t using (day)
order by s.day;
```

### Review top-level `pushup_settings` key overlap outside `entries`

```sql
with solo_keys as (
  select jsonb_object_keys(coalesce(pushup_settings, '{}'::jsonb) - 'entries') as key
  from public.user_settings
  where owner_key = 'solo'
),
target_keys as (
  select jsonb_object_keys(coalesce(pushup_settings, '{}'::jsonb) - 'entries') as key
  from public.user_settings
  where owner_key = '__TARGET_USER_ID__'
)
select s.key
from solo_keys s
join target_keys t using (key)
order by s.key;
```

## Execution

Planned execution artifact:

- [`supabase/admin/backfill_legacy_solo_to_user.sql`](/C:/Users/user/push-up-tracking-app/supabase/admin/backfill_legacy_solo_to_user.sql)

Execution guidance:

1. Open a SQL session with write access.
2. Replace `__TARGET_USER_ID__` in the script with the real authenticated user id.
3. Review the pre-check queries and take manual exports before making any writes.
4. Run the script inside a single transaction.
5. Review the script's summary output before deciding whether to `COMMIT` or `ROLLBACK`.

## Post-Check Queries

These queries confirm the expected state after a successful backfill.

### Confirm target ownership now contains the expected rows

```sql
select 'user_settings' as table_name, owner_key, count(*) as row_count
from public.user_settings
where owner_key = '__TARGET_USER_ID__'
group by table_name, owner_key

union all

select 'pushup_days' as table_name, owner_key, count(*) as row_count
from public.pushup_days
where owner_key = '__TARGET_USER_ID__'
group by table_name, owner_key

union all

select 'workout_days' as table_name, owner_key, count(*) as row_count
from public.workout_days
where owner_key = '__TARGET_USER_ID__'
group by table_name, owner_key;
```

### Confirm copied workout descendants exist for target-owned workout days

```sql
select
  count(distinct wd.id) as workout_day_count,
  count(distinct we.id) as workout_exercise_count,
  count(distinct ws.id) as workout_set_count
from public.workout_days wd
left join public.workout_exercises we
  on we.workout_day_id = wd.id
left join public.workout_sets ws
  on ws.workout_exercise_id = we.id
where wd.owner_key = '__TARGET_USER_ID__';
```

### Confirm collision days still belong to the target owner unchanged at the ownership level

```sql
select day
from public.pushup_days
where owner_key = '__TARGET_USER_ID__'
intersect
select day
from public.pushup_days
where owner_key = 'solo'
order by day;
```

```sql
select day
from public.workout_days
where owner_key = '__TARGET_USER_ID__'
intersect
select day
from public.workout_days
where owner_key = 'solo'
order by day;
```

The intersecting days above are expected if legacy `solo` data is intentionally left untouched after the copy.

## Rollback

Recommended rollback strategy:

1. Do **not** commit immediately after the script runs.
2. Review the summary output and post-check queries in the same session.
3. If anything is off, issue `ROLLBACK` before commit.

Important limitation:

- This prep lane does not add persistent backup tables or an automated post-commit undo script.
- After commit, a clean rollback depends on the manual pre-execution exports or snapshots taken before running the backfill.
- That is intentional: the safest prep artifact is a reviewable one-time admin script plus a manual rollback gate before commit, not destructive automated cleanup.

## Recommendation

This should be a docs/script PR, not a migration PR.

Why:

- The work is a one-time operational backfill, not an application schema change.
- A migration would imply automatic or environment-coupled execution, which is riskier than needed here.
- A runbook plus parameterized admin SQL keeps review focused on data movement, operator checks, and rollback discipline without changing runtime behavior.
