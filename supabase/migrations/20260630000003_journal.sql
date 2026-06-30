-- BACKEND_SCHEMA.md §3, §4, §9, §10, §12 — nutrition database (foods),
-- daily journal (daily_logs + entry tables), pg_trgm, updated_at trigger,
-- owner-all / read-only RLS.

create extension if not exists pg_trgm;

create table foods (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  name_hi       text,
  category      text,
  is_indian     boolean default true,
  serving_label text not null,
  serving_grams numeric(6,1),
  kcal          numeric(6,1) not null,
  protein_g     numeric(5,1) not null,
  carbs_g       numeric(5,1) not null,
  fat_g         numeric(5,1) not null,
  fiber_g       numeric(5,1),
  sugar_g       numeric(5,1),
  source        text default 'IFCT',
  created_at    timestamptz default now()
);
create index foods_name_trgm on foods using gin (name gin_trgm_ops);
create index foods_name_hi_trgm on foods using gin (name_hi gin_trgm_ops);

create table daily_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  log_date      date not null,
  steps         int default 0 check (steps >= 0),
  distance_km   numeric(5,2) default 0,
  sleep_hours   numeric(3,1),
  sleep_quality int check (sleep_quality between 1 and 10),
  mood          mood_t,
  energy_level  int check (energy_level between 1 and 10),
  stress_level  int check (stress_level between 1 and 10),
  water_l       numeric(4,2) default 0,
  metrics_snapshot jsonb,
  deterministic_score int,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (user_id, log_date)
);
create index daily_logs_user_date on daily_logs(user_id, log_date desc);

create table food_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  daily_log_id uuid not null references daily_logs(id) on delete cascade,
  meal         meal_t not null,
  food_id      uuid references foods(id),
  custom_name  text,
  servings     numeric(5,2) not null default 1,
  kcal         numeric(6,1) not null,
  protein_g    numeric(5,1) not null,
  carbs_g      numeric(5,1) not null,
  fat_g        numeric(5,1) not null,
  source       text default 'db',
  created_at   timestamptz default now()
);
create index food_entries_log on food_entries(daily_log_id);

create table water_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  daily_log_id uuid not null references daily_logs(id) on delete cascade,
  amount_l     numeric(4,2) not null,
  logged_at    timestamptz default now()
);
create index water_entries_log on water_entries(daily_log_id);

create table supplement_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  daily_log_id uuid not null references daily_logs(id) on delete cascade,
  name         text not null,
  created_at   timestamptz default now()
);
create index supplement_entries_log on supplement_entries(daily_log_id);

create table workout_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  daily_log_id  uuid not null references daily_logs(id) on delete cascade,
  workout_type  workout_t not null,
  duration_min  int not null check (duration_min > 0),
  calories_burned int,
  created_at    timestamptz default now()
);
create index workout_entries_log on workout_entries(daily_log_id);

create table symptom_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  daily_log_id uuid not null references daily_logs(id) on delete cascade,
  symptom      text not null,
  severity     int check (severity between 1 and 10),
  created_at   timestamptz default now()
);
create index symptom_entries_log on symptom_entries(daily_log_id);

create trigger trg_daily_logs_updated before update on daily_logs
  for each row execute function set_updated_at();

alter table foods enable row level security;
create policy "read foods" on foods for select to authenticated using (true);

alter table daily_logs enable row level security;
create policy "owner all" on daily_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table food_entries enable row level security;
create policy "owner all" on food_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table water_entries enable row level security;
create policy "owner all" on water_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table supplement_entries enable row level security;
create policy "owner all" on supplement_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table workout_entries enable row level security;
create policy "owner all" on workout_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table symptom_entries enable row level security;
create policy "owner all" on symptom_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
