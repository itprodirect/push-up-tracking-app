-- Manual admin-only apply script for legacy owner_key = 'solo' backfill.
-- Do not run automatically.
-- Replace __TARGET_USER_ID__ before any real execution.
-- Run only after the dry-run script reports apply_ready = true.

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

  if v_target_owner_key = '__TARGET_USER_ID__' then
    raise exception 'Replace __TARGET_USER_ID__ before running this script.';
  end if;

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
      raise exception 'Target owner key must be a valid auth.users uuid.';
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
select owner_key, created_at, updated_at
from public.user_settings
where owner_key = (select source_owner_key from backfill_params);

create temporary table target_user_settings on commit drop as
select owner_key, created_at, updated_at
from public.user_settings
where owner_key = (select target_owner_key from backfill_params);

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

  if (select count(*) from source_user_settings) > 0
    and (select count(*) from target_user_settings) > 0 then
    raise exception 'Target owner already has user_settings. Resolve that manually before backfill.';
  end if;

  if (select count(*) from pushup_day_conflicts) > 0 then
    raise exception 'Push-up day collisions exist for the target owner. Resolve them before backfill.';
  end if;

  if (select count(*) from workout_day_conflicts) > 0 then
    raise exception 'Workout day collisions exist for the target owner. Resolve them before backfill.';
  end if;
end $$;

create temporary table moved_user_settings on commit drop as
with updated as (
  update public.user_settings u
  set owner_key = p.target_owner_key
  from backfill_params p
  where u.owner_key = p.source_owner_key
  returning u.owner_key, u.created_at, u.updated_at
)
select * from updated;

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

do $$
begin
  if (select count(*) from public.user_settings where owner_key = (select source_owner_key from backfill_params)) <> 0 then
    raise exception 'Source owner still has user_settings rows after update.';
  end if;

  if (select count(*) from public.pushup_days where owner_key = (select source_owner_key from backfill_params)) <> 0 then
    raise exception 'Source owner still has pushup_days rows after update.';
  end if;

  if (select count(*) from public.workout_days where owner_key = (select source_owner_key from backfill_params)) <> 0 then
    raise exception 'Source owner still has workout_days rows after update.';
  end if;

  if (select count(*) from moved_user_settings) <> (select count(*) from source_user_settings) then
    raise exception 'Moved user_settings count did not match source count.';
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
  (select count(*) from moved_user_settings) as moved_user_settings_count,
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
