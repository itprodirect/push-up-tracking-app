-- One-time admin backfill preparation for legacy owner_key = 'solo' data.
-- Do not run automatically.
-- Replace __TARGET_USER_ID__ before any real execution.
-- Intended to be executed manually after PR1 validation in a single transaction.

begin;

create temporary table backfill_params (
  source_owner_key text not null,
  target_owner_key text not null
) on commit drop;

insert into backfill_params (source_owner_key, target_owner_key)
values ('solo', '__TARGET_USER_ID__');

do $$
declare
  v_source_owner_key text;
  v_target_owner_key text;
begin
  select source_owner_key, target_owner_key
  into v_source_owner_key, v_target_owner_key
  from backfill_params;

  if v_target_owner_key = '__TARGET_USER_ID__' then
    raise exception 'Replace __TARGET_USER_ID__ before running this script.';
  end if;

  if btrim(v_target_owner_key) = '' then
    raise exception 'Target owner key must not be empty.';
  end if;

  if v_source_owner_key = v_target_owner_key then
    raise exception 'Source and target owner keys must differ.';
  end if;
end $$;

create temporary table backfill_day_map (
  source_day_id bigint primary key,
  target_day_id bigint not null,
  day date not null
) on commit drop;

create temporary table backfill_exercise_map (
  source_exercise_id bigint primary key,
  target_exercise_id bigint not null
) on commit drop;

-- Pre-check snapshot for operator review inside the same transaction.
select 'user_settings' as table_name, owner_key, count(*) as row_count
from public.user_settings
where owner_key in (
  (select source_owner_key from backfill_params),
  (select target_owner_key from backfill_params)
)
group by table_name, owner_key

union all

select 'pushup_days' as table_name, owner_key, count(*) as row_count
from public.pushup_days
where owner_key in (
  (select source_owner_key from backfill_params),
  (select target_owner_key from backfill_params)
)
group by table_name, owner_key

union all

select 'workout_days' as table_name, owner_key, count(*) as row_count
from public.workout_days
where owner_key in (
  (select source_owner_key from backfill_params),
  (select target_owner_key from backfill_params)
)
group by table_name, owner_key
order by table_name, owner_key;

-- Merge pushup_settings with target-user precedence.
-- Top-level target keys win on conflict.
-- Nested entries merge by day key with target entries winning on conflict.
insert into public.user_settings (owner_key, pushup_settings, created_at, updated_at)
select
  p.target_owner_key,
  case
    when t.owner_key is null then coalesce(s.pushup_settings, '{}'::jsonb)
    else jsonb_set(
      (coalesce(s.pushup_settings, '{}'::jsonb) - 'entries')
      || (coalesce(t.pushup_settings, '{}'::jsonb) - 'entries'),
      '{entries}',
      coalesce(
        case
          when jsonb_typeof(s.pushup_settings -> 'entries') = 'object' then s.pushup_settings -> 'entries'
          else '{}'::jsonb
        end,
        '{}'::jsonb
      )
      || coalesce(
        case
          when jsonb_typeof(t.pushup_settings -> 'entries') = 'object' then t.pushup_settings -> 'entries'
          else '{}'::jsonb
        end,
        '{}'::jsonb
      ),
      true
    )
  end as merged_pushup_settings,
  coalesce(t.created_at, s.created_at, now()) as created_at,
  coalesce(t.updated_at, s.updated_at, now()) as updated_at
from backfill_params p
join public.user_settings s
  on s.owner_key = p.source_owner_key
left join public.user_settings t
  on t.owner_key = p.target_owner_key
on conflict (owner_key) do update
set
  pushup_settings = excluded.pushup_settings,
  updated_at = excluded.updated_at;

-- Copy pushup_days only when the target does not already own that day.
insert into public.pushup_days (owner_key, day, reps, created_at, updated_at)
select
  p.target_owner_key,
  s.day,
  s.reps,
  s.created_at,
  s.updated_at
from public.pushup_days s
join backfill_params p
  on s.owner_key = p.source_owner_key
left join public.pushup_days t
  on t.owner_key = p.target_owner_key
 and t.day = s.day
where t.owner_key is null
on conflict (owner_key, day) do nothing;

-- Copy workout_days only when the target does not already own that day.
with candidate_days as (
  select
    s.id as source_day_id,
    s.day,
    s.created_at,
    s.updated_at,
    p.target_owner_key
  from public.workout_days s
  join backfill_params p
    on s.owner_key = p.source_owner_key
  left join public.workout_days t
    on t.owner_key = p.target_owner_key
   and t.day = s.day
  where t.id is null
),
inserted_days as (
  insert into public.workout_days (owner_key, day, created_at, updated_at)
  select target_owner_key, day, created_at, updated_at
  from candidate_days
  returning id, day
)
insert into backfill_day_map (source_day_id, target_day_id, day)
select
  c.source_day_id,
  i.id as target_day_id,
  c.day
from candidate_days c
join inserted_days i
  on i.day = c.day;

-- Copy workout_exercises for only the newly inserted workout days.
with candidate_exercises as (
  select
    e.id as source_exercise_id,
    m.target_day_id,
    e.sort_order,
    e.exercise_name,
    e.category,
    e.created_at
  from public.workout_exercises e
  join backfill_day_map m
    on m.source_day_id = e.workout_day_id
),
inserted_exercises as (
  insert into public.workout_exercises (
    workout_day_id,
    sort_order,
    exercise_name,
    category,
    created_at
  )
  select
    target_day_id,
    sort_order,
    exercise_name,
    category,
    created_at
  from candidate_exercises
  returning id, workout_day_id, sort_order
)
insert into backfill_exercise_map (source_exercise_id, target_exercise_id)
select
  c.source_exercise_id,
  i.id as target_exercise_id
from candidate_exercises c
join inserted_exercises i
  on i.workout_day_id = c.target_day_id
 and i.sort_order = c.sort_order;

-- Copy workout_sets for only the newly inserted exercises.
insert into public.workout_sets (
  workout_exercise_id,
  sort_order,
  reps,
  weight,
  created_at
)
select
  m.target_exercise_id,
  s.sort_order,
  s.reps,
  s.weight,
  s.created_at
from public.workout_sets s
join backfill_exercise_map m
  on m.source_exercise_id = s.workout_exercise_id
on conflict (workout_exercise_id, sort_order) do nothing;

-- Summary for operator review before deciding whether to COMMIT or ROLLBACK.
select
  (select target_owner_key from backfill_params) as target_owner_key,
  (select count(*) from public.pushup_days where owner_key = (select target_owner_key from backfill_params)) as target_pushup_day_count,
  (select count(*) from public.workout_days where owner_key = (select target_owner_key from backfill_params)) as target_workout_day_count,
  (select count(*) from backfill_day_map) as inserted_workout_day_count,
  (select count(*) from backfill_exercise_map) as inserted_workout_exercise_count,
  (
    select count(*)
    from public.workout_sets ws
    join backfill_exercise_map em
      on em.target_exercise_id = ws.workout_exercise_id
  ) as inserted_workout_set_count;

-- Review results now.
-- If everything is correct, COMMIT manually.
-- If anything is off, ROLLBACK manually.
-- commit;
-- rollback;
