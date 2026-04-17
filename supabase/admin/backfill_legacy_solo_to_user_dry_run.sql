-- Manual admin-only DRY RUN for legacy owner_key = 'solo' backfill.
-- Read-only: this script does not mutate data.
-- Replace __TARGET_USER_ID__ before running.

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
select
  owner_key,
  created_at,
  updated_at,
  jsonb_object_length(coalesce(pushup_settings, '{}'::jsonb)) as pushup_settings_top_level_key_count,
  case
    when jsonb_typeof(pushup_settings -> 'entries') = 'object'
      then jsonb_object_length(pushup_settings -> 'entries')
    else 0
  end as pushup_settings_entry_day_count
from public.user_settings
where owner_key = (select source_owner_key from backfill_params);

create temporary table target_user_settings on commit drop as
select
  owner_key,
  created_at,
  updated_at,
  jsonb_object_length(coalesce(pushup_settings, '{}'::jsonb)) as pushup_settings_top_level_key_count,
  case
    when jsonb_typeof(pushup_settings -> 'entries') = 'object'
      then jsonb_object_length(pushup_settings -> 'entries')
    else 0
  end as pushup_settings_entry_day_count
from public.user_settings
where owner_key = (select target_owner_key from backfill_params);

create temporary table source_pushup_days on commit drop as
select owner_key, day, reps, created_at, updated_at
from public.pushup_days
where owner_key = (select source_owner_key from backfill_params)
order by day;

create temporary table target_pushup_days on commit drop as
select owner_key, day, reps, created_at, updated_at
from public.pushup_days
where owner_key = (select target_owner_key from backfill_params)
order by day;

create temporary table pushup_day_conflicts on commit drop as
select
  s.day,
  s.reps as solo_reps,
  t.reps as target_reps,
  s.created_at as solo_created_at,
  t.created_at as target_created_at
from source_pushup_days s
join target_pushup_days t using (day)
order by s.day;

create temporary table source_workout_days on commit drop as
select id, owner_key, day, created_at, updated_at
from public.workout_days
where owner_key = (select source_owner_key from backfill_params)
order by day, id;

create temporary table target_workout_days on commit drop as
select id, owner_key, day, created_at, updated_at
from public.workout_days
where owner_key = (select target_owner_key from backfill_params)
order by day, id;

create temporary table workout_day_conflicts on commit drop as
select
  s.day,
  s.id as solo_workout_day_id,
  t.id as target_workout_day_id,
  s.created_at as solo_created_at,
  t.created_at as target_created_at
from source_workout_days s
join target_workout_days t using (day)
order by s.day, s.id;

create temporary table source_workout_descendants on commit drop as
select
  wd.id as workout_day_id,
  wd.day,
  count(distinct we.id) as workout_exercise_count,
  count(distinct ws.id) as workout_set_count
from source_workout_days wd
left join public.workout_exercises we
  on we.workout_day_id = wd.id
left join public.workout_sets ws
  on ws.workout_exercise_id = we.id
group by wd.id, wd.day
order by wd.day, wd.id;

create temporary table target_workout_descendants on commit drop as
select
  wd.id as workout_day_id,
  wd.day,
  count(distinct we.id) as workout_exercise_count,
  count(distinct ws.id) as workout_set_count
from target_workout_days wd
left join public.workout_exercises we
  on we.workout_day_id = wd.id
left join public.workout_sets ws
  on ws.workout_exercise_id = we.id
group by wd.id, wd.day
order by wd.day, wd.id;

select
  p.source_owner_key,
  p.target_owner_key,
  u.id as target_user_id,
  u.email as target_user_email,
  u.created_at as target_user_created_at
from backfill_params p
join auth.users u
  on u.id = p.target_owner_key::uuid;

select
  table_name,
  source_row_count,
  target_row_count,
  expected_target_row_count_after_apply
from (
  select
    'user_settings' as table_name,
    (select count(*) from source_user_settings) as source_row_count,
    (select count(*) from target_user_settings) as target_row_count,
    (select count(*) from source_user_settings) + (select count(*) from target_user_settings) as expected_target_row_count_after_apply

  union all

  select
    'pushup_days' as table_name,
    (select count(*) from source_pushup_days),
    (select count(*) from target_pushup_days),
    (select count(*) from source_pushup_days) + (select count(*) from target_pushup_days)

  union all

  select
    'workout_days' as table_name,
    (select count(*) from source_workout_days),
    (select count(*) from target_workout_days),
    (select count(*) from source_workout_days) + (select count(*) from target_workout_days)

  union all

  select
    'workout_exercises (validation only)' as table_name,
    coalesce((select sum(workout_exercise_count) from source_workout_descendants), 0),
    coalesce((select sum(workout_exercise_count) from target_workout_descendants), 0),
    coalesce((select sum(workout_exercise_count) from source_workout_descendants), 0)
      + coalesce((select sum(workout_exercise_count) from target_workout_descendants), 0)

  union all

  select
    'workout_sets (validation only)' as table_name,
    coalesce((select sum(workout_set_count) from source_workout_descendants), 0),
    coalesce((select sum(workout_set_count) from target_workout_descendants), 0),
    coalesce((select sum(workout_set_count) from source_workout_descendants), 0)
      + coalesce((select sum(workout_set_count) from target_workout_descendants), 0)
) counts
order by table_name;

select
  (select target_owner_key from backfill_params) as candidate_target_user_id,
  (select count(*) from source_user_settings) as solo_user_settings_count,
  (select count(*) from target_user_settings) as target_user_settings_count,
  (select count(*) from pushup_day_conflicts) as pushup_day_conflict_count,
  (select count(*) from workout_day_conflicts) as workout_day_conflict_count,
  (
    case
      when (select count(*) from source_user_settings) > 0
        and (select count(*) from target_user_settings) > 0
        then 1
      else 0
    end
  ) as user_settings_conflict_count,
  (
    case
      when (
        (
          case
            when (select count(*) from source_user_settings) > 0
              and (select count(*) from target_user_settings) > 0
              then 1
            else 0
          end
        )
        + (select count(*) from pushup_day_conflicts)
        + (select count(*) from workout_day_conflicts)
      ) = 0
      then true
      else false
    end
  ) as apply_ready,
  (
    (
      case
        when (select count(*) from source_user_settings) > 0
          and (select count(*) from target_user_settings) > 0
          then 1
        else 0
      end
    )
    + (select count(*) from pushup_day_conflicts)
    + (select count(*) from workout_day_conflicts)
  ) as blocking_issue_count;

select
  owner_key,
  created_at,
  updated_at,
  pushup_settings_top_level_key_count,
  pushup_settings_entry_day_count
from source_user_settings;

select
  owner_key,
  created_at,
  updated_at,
  pushup_settings_top_level_key_count,
  pushup_settings_entry_day_count
from target_user_settings;

select
  day,
  reps,
  created_at,
  updated_at
from source_pushup_days;

select
  day,
  reps,
  created_at,
  updated_at
from pushup_day_conflicts;

select
  wd.id as workout_day_id,
  wd.day,
  wd.created_at,
  wd.updated_at,
  d.workout_exercise_count,
  d.workout_set_count
from source_workout_days wd
left join source_workout_descendants d
  on d.workout_day_id = wd.id
order by wd.day, wd.id;

select
  day,
  solo_workout_day_id,
  target_workout_day_id,
  solo_created_at,
  target_created_at
from workout_day_conflicts;

select
  workout_day_id,
  day,
  workout_exercise_count,
  workout_set_count
from source_workout_descendants
order by day, workout_day_id;
