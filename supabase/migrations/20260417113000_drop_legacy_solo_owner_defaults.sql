alter table public.user_settings
  alter column owner_key drop default;

alter table public.pushup_days
  alter column owner_key drop default;

alter table public.workout_days
  alter column owner_key drop default;
