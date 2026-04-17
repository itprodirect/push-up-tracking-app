-- Manual admin-only DRY RUN for legacy owner_key = 'solo' backfill.
-- Uses session-local temp objects only.
-- Does not mutate permanent app tables.
-- For the current production issue #39 lane, verify the target auth.users.id is:
-- 4666c980-df61-4285-8007-0c065ab32e70
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
  end as entries_json,
  case
    when us.pushup_settings is null then 0
    when jsonb_typeof(us.pushup_settings) <> 'object' then 0
    else (
      select count(*)
      from jsonb_object_keys(us.pushup_settings)
    )
  end as pushup_settings_top_level_key_count,
  case
    when us.pushup_settings is null then 0
    when jsonb_typeof(us.pushup_settings) <> 'object' then 0
    else (
      select count(*)
      from jsonb_object_keys(us.pushup_settings - 'entries')
    )
  end as unexpected_top_level_key_count,
  case
    when us.pushup_settings is null then 0
    when jsonb_typeof(us.pushup_settings) <> 'object' then 0
    when not (us.pushup_settings ? 'entries') then 0
    when jsonb_typeof(us.pushup_settings -> 'entries') <> 'object' then 0
    else (
      select count(*)
      from jsonb_object_keys(us.pushup_settings -> 'entries')
    )
  end as pushup_settings_entry_day_count
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
  end as entries_json,
  case
    when us.pushup_settings is null then 0
    when jsonb_typeof(us.pushup_settings) <> 'object' then 0
    else (
      select count(*)
      from jsonb_object_keys(us.pushup_settings)
    )
  end as pushup_settings_top_level_key_count,
  case
    when us.pushup_settings is null then 0
    when jsonb_typeof(us.pushup_settings) <> 'object' then 0
    else (
      select count(*)
      from jsonb_object_keys(us.pushup_settings - 'entries')
    )
  end as unexpected_top_level_key_count,
  case
    when us.pushup_settings is null then 0
    when jsonb_typeof(us.pushup_settings) <> 'object' then 0
    when not (us.pushup_settings ? 'entries') then 0
    when jsonb_typeof(us.pushup_settings -> 'entries') <> 'object' then 0
    else (
      select count(*)
      from jsonb_object_keys(us.pushup_settings -> 'entries')
    )
  end as pushup_settings_entry_day_count
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
    case
      when (select count(*) from source_user_settings) = 1
       and (select count(*) from target_user_settings) = 1
       and (select count(*) from user_settings_invalid_shape_rows) = 0
       and (select count(*) from user_settings_unexpected_top_level_keys) = 0
       and (select count(*) from user_settings_entry_overlap) = 0
        then 1
      else null
    end as expected_target_row_count_after_apply

  union all

  select
    'pushup_days' as table_name,
    (select count(*) from source_pushup_days),
    (select count(*) from target_pushup_days),
    case
      when (select count(*) from pushup_day_conflicts) = 0
        then (select count(*) from source_pushup_days) + (select count(*) from target_pushup_days)
      else null
    end

  union all

  select
    'workout_days' as table_name,
    (select count(*) from source_workout_days),
    (select count(*) from target_workout_days),
    case
      when (select count(*) from workout_day_conflicts) = 0
        then (select count(*) from source_workout_days) + (select count(*) from target_workout_days)
      else null
    end

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
  (select count(*) from source_user_settings) as source_user_settings_count,
  (select count(*) from target_user_settings) as target_user_settings_count,
  coalesce((select sum(pushup_settings_entry_day_count) from source_user_settings), 0) as source_user_settings_entry_day_count,
  coalesce((select sum(pushup_settings_entry_day_count) from target_user_settings), 0) as target_user_settings_entry_day_count,
  (select count(*) from pushup_day_conflicts) as pushup_day_conflict_count,
  (select count(*) from workout_day_conflicts) as workout_day_conflict_count,
  (select count(*) from user_settings_invalid_shape_rows) as user_settings_invalid_shape_count,
  (select count(*) from user_settings_unexpected_top_level_keys) as user_settings_unexpected_top_level_key_count,
  (select count(*) from user_settings_entry_overlap) as user_settings_entry_overlap_count,
  case
    when (select count(*) from source_user_settings) = 1
     and (select count(*) from target_user_settings) = 1
     and (select count(*) from pushup_day_conflicts) = 0
     and (select count(*) from workout_day_conflicts) = 0
     and (select count(*) from user_settings_invalid_shape_rows) = 0
     and (select count(*) from user_settings_unexpected_top_level_keys) = 0
     and (select count(*) from user_settings_entry_overlap) = 0
      then true
    else false
  end as apply_ready,
  (
    case when (select count(*) from source_user_settings) = 1 then 0 else 1 end
    + case when (select count(*) from target_user_settings) = 1 then 0 else 1 end
    + case when (select count(*) from pushup_day_conflicts) = 0 then 0 else 1 end
    + case when (select count(*) from workout_day_conflicts) = 0 then 0 else 1 end
    + case when (select count(*) from user_settings_invalid_shape_rows) = 0 then 0 else 1 end
    + case when (select count(*) from user_settings_unexpected_top_level_keys) = 0 then 0 else 1 end
    + case when (select count(*) from user_settings_entry_overlap) = 0 then 0 else 1 end
  ) as blocking_issue_count;

select
  owner_key,
  created_at,
  updated_at,
  pushup_settings_type,
  entries_type,
  pushup_settings_top_level_key_count,
  unexpected_top_level_key_count,
  pushup_settings_entry_day_count
from source_user_settings;

select
  owner_key,
  created_at,
  updated_at,
  pushup_settings_type,
  entries_type,
  pushup_settings_top_level_key_count,
  unexpected_top_level_key_count,
  pushup_settings_entry_day_count
from target_user_settings;

select
  owner_scope,
  owner_key,
  pushup_settings_type,
  entries_type
from user_settings_invalid_shape_rows
order by owner_scope, owner_key;

select
  owner_scope,
  owner_key,
  top_level_key
from user_settings_unexpected_top_level_keys
order by owner_scope, owner_key, top_level_key;

select
  owner_key,
  entry_day
from source_user_settings_entry_days
order by entry_day;

select
  owner_key,
  entry_day
from target_user_settings_entry_days
order by entry_day;

select
  entry_day
from user_settings_entry_overlap
order by entry_day;

select
  day,
  reps,
  created_at,
  updated_at
from source_pushup_days
order by day;

select
  day,
  solo_reps,
  target_reps,
  solo_created_at,
  target_created_at
from pushup_day_conflicts
order by day;

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
from workout_day_conflicts
order by day, solo_workout_day_id;

select
  workout_day_id,
  day,
  workout_exercise_count,
  workout_set_count
from source_workout_descendants
order by day, workout_day_id;
