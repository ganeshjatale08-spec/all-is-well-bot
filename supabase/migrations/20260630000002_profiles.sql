-- BACKEND_SCHEMA.md §2, §9, §10 — profiles + health_profiles, owner-only RLS,
-- updated_at triggers.

create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  age             int check (age between 13 and 120),
  sex             sex_t,
  height_cm       numeric(5,1) check (height_cm > 0),
  weight_kg       numeric(5,1) check (weight_kg > 0),
  target_weight_kg numeric(5,1),
  country         text default 'India',
  state           text,
  city            text,
  occupation      text,
  diet_type       diet_t,
  activity_level  activity_t,
  work_type       work_t,
  primary_goal    goal_t,
  smoking         boolean default false,
  alcohol         boolean default false,
  avg_sleep_hours numeric(3,1),
  avg_water_l     numeric(3,1),
  onboarding_complete boolean default false,
  consent_dpdp_at timestamptz,
  locale          text default 'en',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table health_profiles (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  medical_conditions text[] default '{}',
  family_history     text[] default '{}',
  food_allergies     text[] default '{}',
  current_medications text,
  daily_screen_time_hours numeric(3,1),
  avg_stress_level   int check (avg_stress_level between 1 and 10),
  digestion_issues   boolean,
  chronic_pain       boolean,
  previous_injuries  text,
  daily_energy_level int check (daily_energy_level between 1 and 10),
  updated_at         timestamptz default now()
);

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger trg_health_profiles_updated before update on health_profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;

create policy "own row - select" on profiles
  for select using (auth.uid() = id);
create policy "own row - insert" on profiles
  for insert with check (auth.uid() = id);
create policy "own row - update" on profiles
  for update using (auth.uid() = id);

alter table health_profiles enable row level security;

create policy "own row - select" on health_profiles
  for select using (auth.uid() = user_id);
create policy "own row - insert" on health_profiles
  for insert with check (auth.uid() = user_id);
create policy "own row - update" on health_profiles
  for update using (auth.uid() = user_id);
