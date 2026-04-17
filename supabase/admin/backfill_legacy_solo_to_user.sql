-- Manual admin-only apply script for legacy owner_key = 'solo' backfill.
-- Do not run automatically.
-- Replace __TARGET_USER_ID__ before any real execution.
-- Run only after the dry-run script reports apply_ready = true.
-- For the current production issue #39 lane, verify the target auth.users.id is:
-- 4666c980-df61-4285-8007-0c065ab32e70

begin;

create temporary table backfill_params (
  source_owner_key text not null,
  target_owner_key text not null
) on commit drop;

insert into backfill_params (source_owner_key, target_owner_key)
values ('solo', '__TARGET_USER_ID__');

do $$
declare
  v_target_owner_key text;
begin
  select target_owner_key
  into v_target_owner_key
  from backfill_params;

  if btrim(v_target_owner_key) = '' then
    raise exception 'Target owner key must not be empty.';
  end if;

  if v_target_owner_key = 'solo' then
    raise exception 'Target owner key must not be solo.';
  end if;

  begin
    perform v_target_owner_key::uuid;
  exception
    when invalid_text_representation then
      raise exception 'Replace __TARGET_USER_ID__ with a valid auth.users uuid before running this script.';
  end;

  if not exists (
    select 1
    from auth.users
    where id = v_target_owner_key::uuid
  ) then
    raise exception 'Target user % was not found in auth.users.', v_target_owner_key;
  end if;
end $$;

create temporary table source_user_settings on commit drop as
select
  us.owner_key,
  us.created_at,
  us.updated_at,
  us.pushup_settings,
  coalesce(jsonb_typeof(us.pushup_settings), 'null') as pushup_settings_type,
  case
    when us.pushup_settings is null then 'missing'
    when jsonb_typeof(us.pushup_settings) <> 'object' then jsonb_typeof(us.pushup_settings)
    when not (us.pushup_settings ? 'entries') then 'missing'
    else coalesce(jsonb_typeof(us.pushup_settings -> 'entries'), 'null')
  end as entries_type,
  case
    when us.pushup_settings is null then true
    when jsonb_typeof(us.pushup_settings) = 'object' then true
    else false
  end as pushup_settings_is_object,
  case
    when us.pushup_settings is null then true
    when jsonb_typeof(us.pushup_settings) <> 'object' then false
    when not (us.pushup_settings ? 'entries') then true
    when coalesce(jsonb_typeof(us.pushup_settings -> 'entries'), 'null') = 'null' then true
    when jsonb_typeof(us.pushup_settings -> 'entries') = 'object' then true
    else false
  end as entries_is_object,
  case
    when us.pushup_settings is null then '{}'::jsonb
    when jsonb_typeof(us.pushup_settings) <> 'object' then '{}'::jsonb
    when not (us.pushup_settings ? 'entries') then '{}'::jsonb
    when coalesce(jsonb_typeof(us.pushup_settings -> 'entries'), 'null') = 'null' then '{}'::jsonb
    when jsonb_typeof(us.pushup_settings -> 'entries') <> 'object' then '{}'::jsonb
    else us.pushup_settings -> 'entries'
  end as entries_json
from public.user_settings us
where us.owner_key = (select source_owner_key from backfill_params);

create temporary table target_user_settings on commit drop as
select
  us.owner_key,
  us.created_at,
  us.updated_at,
  us.pushup_settings,
  coalesce(jsonb_typeof(us.pushup_settings), 'null') as pushup_settings_type,
  case
    when us.pushup_settings is null then 'missing'
    when jsonb_typeof(us.pushup_settings) <> 'object' then jsonb_typeof(us.pushup_settings)
    when not (us.pushup_settings ? 'entries') then 'missing'
    else coalesce(jsonb_typeof(us.pushup_settings -> 'entries'), 'null')
  end as entries_type,
  case
    when us.pushup_settings is null then true
    when jsonb_typeof(us.pushup_settings) = 'object' then true
    else false
  end as pushup_settings_is_object,
  case
    when us.pushup_settings is null then true
    when jsonb_typeof(us.pushup_settings) <> 'object' then false
    when not (us.pushup_settings ? 'entries') then true
    when coalesce(jsonb_typeof(us.pushup_settings -> 'entries'), 'null') = 'null' then true
    when jsonb_typeof(us.pushup_settings -> 'entries') = 'object' then true
    else false
  end as entries_is_object,
  case
    when us.pushup_settings is null then '{}'::jsonb
    when jsonb_typeof(us.pushup_settings) <> 'object' then '{}'::jsonb
    when not (us.pushup_settings ? 'entries') then '{}'::jsonb
    when coalesce(jsonb_typeof(us.pushup_settings -> 'entries'), 'null') = 'null' then '{}'::jsonb
    when jsonb_typeof(us.pushup_settings -> 'entries') <> 'object' then '{}'::jsonb
    else us.pushup_settings -> 'entries'
  end as entries_json
from public.user_settings us
where us.owner_key = (select target_owner_key from backfill_params);

create temporary table user_settings_invalid_shape_rows on commit drop as
select
  owner_scope,
  owner_key,
  pushup_settings_type,
  entries_type
from (
  select
    'source' as owner_scope,
    owner_key,
    pushup_settings_type,
    entries_type,
    pushup_settings_is_object,
    entries_is_object
  from source_user_settings

  union all

  select
    'target' as owner_scope,
    owner_key,
    pushup_settings_type,
    entries_type,
    pushup_settings_is_object,
    entries_is_object
  from target_user_settings
) shapes
where not pushup_settings_is_object
   or not entries_is_object;

create temporary table user_settings_unexpected_top_level_keys on commit drop as
select
  'source' as owner_scope,
  s.owner_key,
  k.key as top_level_key
from source_user_settings s
cross join lateral jsonb_object_keys(
  case
    when s.pushup_settings_type = 'object' then coalesce(s.pushup_settings, '{}'::jsonb) - 'entries'
    else '{}'::jsonb
  end
) as k(key)

union all

select
  'target' as owner_scope,
  t.owner_key,
  k.key as top_level_key
from target_user_settings t
cross join lateral jsonb_object_keys(
  case
    when t.pushup_settings_type = 'object' then coalesce(t.pushup_settings, '{}'::jsonb) - 'entries'
    else '{}'::jsonb
  end
) as k(key);

create temporary table source_user_settings_entry_days on commit drop as
select
  s.owner_key,
  d.entry_day
from source_user_settings s
cross join lateral jsonb_object_keys(s.entries_json) as d(entry_day);

create temporary table target_user_settings_entry_days on commit drop as
select
  t.owner_key,
  d.entry_day
from target_user_settings t
cross join lateral jsonb_object_keys(t.entries_json) as d(entry_day);

create temporary table user_settings_entry_overlap on commit drop as
select
  s.entry_day
from source_user_settings_entry_days s
join target_user_settings_entry_days t
  on t.entry_day = s.entry_day
order by s.entry_day;

create temporary table merged_user_settings on commit drop as
select
  t.owner_key as target_owner_key,
  t.created_at as target_created_at,
  greatest(t.updated_at, s.updated_at, now()) as merged_updated_at,
  jsonb_build_object(
    'entries',
    t.entries_json || s.entries_json
  ) as merged_pushup_settings,
  (
    select count(*)
    from jsonb_object_keys(t.entries_json || s.entries_json)
  ) as merged_entry_day_count
from source_user_settings s
cross join target_user_settings t;

create temporary table source_pushup_days on commit drop as
select day, reps, created_at, updated_at
from public.pushup_days
where owner_key = (select source_owner_key from backfill_params)
order by day;

create temporary table source_workout_days on commit drop as
select id, day, created_at, updated_at
from public.workout_days
where owner_key = (select source_owner_key from backfill_params)
order by day, id;

create temporary table pushup_day_conflicts on commit drop as
select
  s.day,
  s.reps as solo_reps,
  t.reps as target_reps
from source_pushup_days s
join public.pushup_days t
  on t.owner_key = (select target_owner_key from backfill_params)
 and t.day = s.day
order by s.day;

create temporary table workout_day_conflicts on commit drop as
select
  s.day,
  s.id as solo_workout_day_id,
  t.id as target_workout_day_id
from source_workout_days s
join public.workout_days t
  on t.owner_key = (select target_owner_key from backfill_params)
 and t.day = s.day
order by s.day, s.id;

create temporary table source_workout_descendant_totals on commit drop as
select
  count(distinct we.id) as workout_exercise_count,
  count(distinct ws.id) as workout_set_count
from source_workout_days wd
left join public.workout_exercises we
  on we.workout_day_id = wd.id
left join public.workout_sets ws
  on ws.workout_exercise_id = we.id;

do $$
declare
  v_source_owner_scoped_rows integer;
begin
  select
    (select count(*) from source_user_settings)
    + (select count(*) from source_pushup_days)
    + (select count(*) from source_workout_days)
  into v_source_owner_scoped_rows;

  if v_source_owner_scoped_rows = 0 then
    raise exception 'No owner-scoped solo rows were found to backfill.';
  end if;

  if (select count(*) from source_user_settings) <> 1 then
    raise exception 'Expected exactly 1 solo user_settings row, found %.', (select count(*) from source_user_settings);
  end if;

  if (select count(*) from target_user_settings) <> 1 then
    raise exception 'Expected exactly 1 target user_settings row, found %.', (select count(*) from target_user_settings);
  end if;

  if (select count(*) from user_settings_invalid_shape_rows) > 0 then
    raise exception 'user_settings shape is not limited to null/object pushup_settings with null/missing/object entries.';
  end if;

  if (select count(*) from user_settings_unexpected_top_level_keys) > 0 then
    raise exception 'Unexpected top-level pushup_settings keys exist outside entries. Abort conservatively.';
  end if;

  if (select count(*) from user_settings_entry_overlap) > 0 then
    raise exception 'Source and target user_settings.entries overlap on one or more entry-date keys.';
  end if;

  if (select count(*) from pushup_day_conflicts) > 0 then
    raise exception 'Push-up day collisions exist for the target owner. Resolve them before backfill.';
  end if;

  if (select count(*) from workout_day_conflicts) > 0 then
    raise exception 'Workout day collisions exist for the target owner. Resolve them before backfill.';
  end if;
end $$;

create temporary table updated_target_user_settings on commit drop as
with updated as (
  update public.user_settings u
  set
    pushup_settings = m.merged_pushup_settings,
    updated_at = m.merged_updated_at
  from merged_user_settings m
  where u.owner_key = m.target_owner_key
  returning u.owner_key, u.created_at, u.updated_at, u.pushup_settings
)
select * from updated;

create temporary table deleted_source_user_settings on commit drop as
with deleted as (
  delete from public.user_settings u
  using backfill_params p
  where u.owner_key = p.source_owner_key
  returning u.owner_key, u.created_at, u.updated_at
)
select * from deleted;

create temporary table moved_pushup_days on commit drop as
with updated as (
  update public.pushup_days pd
  set owner_key = p.target_owner_key
  from backfill_params p
  where pd.owner_key = p.source_owner_key
  returning pd.day, pd.reps, pd.created_at, pd.updated_at
)
select * from updated;

create temporary table moved_workout_days on commit drop as
with updated as (
  update public.workout_days wd
  set owner_key = p.target_owner_key
  from backfill_params p
  where wd.owner_key = p.source_owner_key
  returning wd.id, wd.day, wd.created_at, wd.updated_at
)
select * from updated;

create temporary table moved_workout_descendant_totals on commit drop as
select
  count(distinct we.id) as workout_exercise_count,
  count(distinct ws.id) as workout_set_count
from moved_workout_days wd
left join public.workout_exercises we
  on we.workout_day_id = wd.id
left join public.workout_sets ws
  on ws.workout_exercise_id = we.id;

create temporary table target_user_settings_entry_days_after_apply on commit drop as
select
  u.owner_key,
  d.entry_day
from public.user_settings u
cross join lateral jsonb_object_keys(
  case
    when u.pushup_settings is null then '{}'::jsonb
    when jsonb_typeof(u.pushup_settings) <> 'object' then '{}'::jsonb
    when not (u.pushup_settings ? 'entries') then '{}'::jsonb
    when jsonb_typeof(u.pushup_settings -> 'entries') <> 'object' then '{}'::jsonb
    else u.pushup_settings -> 'entries'
  end
) as d(entry_day)
where u.owner_key = (select target_owner_key from backfill_params);

do $$
begin
  if (select count(*) from public.user_settings where owner_key = (select source_owner_key from backfill_params)) <> 0 then
    raise exception 'Source owner still has user_settings rows after merge/delete.';
  end if;

  if (select count(*) from public.user_settings where owner_key = (select target_owner_key from backfill_params)) <> 1 then
    raise exception 'Target owner does not have exactly one user_settings row after merge.';
  end if;

  if (select count(*) from updated_target_user_settings) <> 1 then
    raise exception 'Expected exactly one target user_settings row to be updated.';
  end if;

  if (select count(*) from deleted_source_user_settings) <> 1 then
    raise exception 'Expected exactly one solo user_settings row to be deleted after merge.';
  end if;

  if (select count(*) from target_user_settings_entry_days_after_apply)
    <> (select merged_entry_day_count from merged_user_settings) then
    raise exception 'Merged target user_settings entry-day count did not match expectation.';
  end if;

  if (select count(*) from public.pushup_days where owner_key = (select source_owner_key from backfill_params)) <> 0 then
    raise exception 'Source owner still has pushup_days rows after update.';
  end if;

  if (select count(*) from public.workout_days where owner_key = (select source_owner_key from backfill_params)) <> 0 then
    raise exception 'Source owner still has workout_days rows after update.';
  end if;

  if (select count(*) from moved_pushup_days) <> (select count(*) from source_pushup_days) then
    raise exception 'Moved pushup_days count did not match source count.';
  end if;

  if (select count(*) from moved_workout_days) <> (select count(*) from source_workout_days) then
    raise exception 'Moved workout_days count did not match source count.';
  end if;

  if coalesce((select workout_exercise_count from source_workout_descendant_totals), 0)
    <> coalesce((select workout_exercise_count from moved_workout_descendant_totals), 0) then
    raise exception 'Workout exercise descendant count changed unexpectedly during owner reassignment.';
  end if;

  if coalesce((select workout_set_count from source_workout_descendant_totals), 0)
    <> coalesce((select workout_set_count from moved_workout_descendant_totals), 0) then
    raise exception 'Workout set descendant count changed unexpectedly during owner reassignment.';
  end if;
end $$;

select
  p.target_owner_key as target_owner_key,
  u.email as target_user_email,
  (select merged_entry_day_count from merged_user_settings) as merged_user_settings_entry_day_count,
  (select count(*) from moved_pushup_days) as moved_pushup_day_count,
  (select count(*) from moved_workout_days) as moved_workout_day_count,
  coalesce((select workout_exercise_count from moved_workout_descendant_totals), 0) as validated_workout_exercise_count,
  coalesce((select workout_set_count from moved_workout_descendant_totals), 0) as validated_workout_set_count
from backfill_params p
join auth.users u
  on u.id = p.target_owner_key::uuid;

select
  'user_settings' as table_name,
  count(*) as remaining_solo_rows
from public.user_settings
where owner_key = (select source_owner_key from backfill_params)

union all

select
  'pushup_days' as table_name,
  count(*) as remaining_solo_rows
from public.pushup_days
where owner_key = (select source_owner_key from backfill_params)

union all

select
  'workout_days' as table_name,
  count(*) as remaining_solo_rows
from public.workout_days
where owner_key = (select source_owner_key from backfill_params)
order by table_name;

select
  'user_settings' as table_name,
  count(*) as target_rows_after_apply
from public.user_settings
where owner_key = (select target_owner_key from backfill_params)

union all

select
  'pushup_days' as table_name,
  count(*) as target_rows_after_apply
from public.pushup_days
where owner_key = (select target_owner_key from backfill_params)

union all

select
  'workout_days' as table_name,
  count(*) as target_rows_after_apply
from public.workout_days
where owner_key = (select target_owner_key from backfill_params)
order by table_name;

select
  owner_key,
  entry_day
from target_user_settings_entry_days_after_apply
order by entry_day;

select
  wd.id as moved_workout_day_id,
  wd.day,
  count(distinct we.id) as workout_exercise_count,
  count(distinct ws.id) as workout_set_count
from moved_workout_days wd
left join public.workout_exercises we
  on we.workout_day_id = wd.id
left join public.workout_sets ws
  on ws.workout_exercise_id = we.id
group by wd.id, wd.day
order by wd.day, wd.id;

-- Review the output above.
-- Run post-check queries if needed in the same transaction.
-- COMMIT manually only after review.
-- Use ROLLBACK if anything is unexpected.
-- commit;
-- rollback;
