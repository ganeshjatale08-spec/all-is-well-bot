# Backend Schema — Saathi (Supabase / PostgreSQL)

**Companion docs:** TRD.md, PRD.md
Conventions: snake_case; UUID PKs; every user-owned table has `user_id uuid references auth.users`; `created_at`/`updated_at timestamptz default now()`; **RLS enabled on every table**. Apply as ordered migrations in `supabase/migrations`.

> MVP builds: `profiles`, `health_profiles`, `foods`, `daily_logs` + entry tables, `ai_analyses`, `weekly_reports`, `monthly_reports`, `goals`, `streaks`, `badges`/`user_badges`, `subscriptions`, `device_tokens`, `ai_usage`. Family tables (`family_groups`, `family_members`) are schema-ready but UI is v1.1.

---

## 1. Enums

```sql
create type sex_t              as enum ('male','female','other');
create type diet_t             as enum ('vegetarian','non_vegetarian','eggetarian','vegan','jain');
create type activity_t         as enum ('sedentary','lightly_active','moderately_active','very_active');
create type work_t             as enum ('desk_job','field_work','shift_worker','student','business_owner');
create type goal_t             as enum ('weight_loss','weight_gain','muscle_gain','improve_sleep',
                                        'stress_reduction','diabetes_management','general_fitness');
create type meal_t             as enum ('breakfast','lunch','dinner','snack');
create type workout_t          as enum ('gym','running','walking','yoga','cycling','home_workout');
create type mood_t             as enum ('happy','normal','stressed','sad','angry');
create type plan_t             as enum ('free','pro','family','advanced');
create type sub_status_t       as enum ('active','trialing','grace','expired','cancelled');
create type family_role_t      as enum ('admin','member');
create type report_period_t    as enum ('weekly','monthly');
```

---

## 2. Core profile

```sql
-- 1:1 with auth.users
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
  consent_dpdp_at timestamptz,            -- DPDP consent timestamp
  locale          text default 'en',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- optional/sensitive health detail (filled progressively)
create table health_profiles (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  medical_conditions text[] default '{}',   -- diabetes, hypertension, thyroid, ...
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
```

Computed metrics (BMI/BMR/TDEE/targets) are **not stored as source of truth** — they're derived. Optionally cache a daily snapshot in `daily_logs.metrics_snapshot` (jsonb) for historical accuracy when weight changes.

---

## 3. Nutrition database (shared, read-only to users)

```sql
create table foods (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  name_hi       text,                      -- Hindi name
  category      text,                       -- grain, dal, sabzi, dairy, snack...
  is_indian     boolean default true,
  serving_label text not null,              -- "1 roti", "1 katori", "100 g"
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
create index foods_name_trgm on foods using gin (name gin_trgm_ops);  -- requires pg_trgm
create index foods_name_hi_trgm on foods using gin (name_hi gin_trgm_ops);
-- Seed via migration with a curated ~1,500 Indian + common foods.
```

---

## 4. Daily journal

```sql
-- one row per user per calendar day (the day's container)
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
  water_l       numeric(4,2) default 0,         -- denormalized running total
  metrics_snapshot jsonb,                        -- BMI/BMR/TDEE/targets at that date
  deterministic_score int,                       -- 0..100, computed client/server
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
  food_id      uuid references foods(id),       -- null if free-text/photo
  custom_name  text,
  servings     numeric(5,2) not null default 1,
  -- macros snapshotted so history is stable even if foods row changes
  kcal         numeric(6,1) not null,
  protein_g    numeric(5,1) not null,
  carbs_g      numeric(5,1) not null,
  fat_g        numeric(5,1) not null,
  source       text default 'db',               -- db | custom | photo
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

create table supplement_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  daily_log_id uuid not null references daily_logs(id) on delete cascade,
  name         text not null,                   -- vitamin_d, omega_3, multivitamin, protein_powder, custom
  created_at   timestamptz default now()
);

create table workout_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  daily_log_id  uuid not null references daily_logs(id) on delete cascade,
  workout_type  workout_t not null,
  duration_min  int not null check (duration_min > 0),
  calories_burned int,
  created_at    timestamptz default now()
);

create table symptom_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  daily_log_id uuid not null references daily_logs(id) on delete cascade,
  symptom      text not null,                   -- headache, acidity, constipation, body_pain, fever, fatigue
  severity     int check (severity between 1 and 10),
  created_at   timestamptz default now()
);
```

---

## 5. AI outputs

```sql
create table ai_analyses (          -- daily
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  log_date      date not null,
  health_score  int,                            -- reconciled with deterministic
  headline      text,
  insight       text,
  recommendation text,
  tomorrow_focus text,
  model         text,                           -- gemini-2.5-flash-lite ...
  created_at    timestamptz default now(),
  unique (user_id, log_date)                    -- idempotent / no re-spend
);

create table reports (              -- weekly + monthly
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  period        report_period_t not null,
  period_start  date not null,
  period_end    date not null,
  score         int,
  summary       jsonb not null,                 -- totals, achievements[], improvement_areas[], trends, narrative
  pdf_url       text,                           -- storage signed path (monthly)
  share_token   text unique,                    -- for shareable link
  model         text,
  created_at    timestamptz default now(),
  unique (user_id, period, period_start)
);

create table goals (                -- monthly generated targets
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  month         date not null,                  -- first day of month
  target_weight_kg numeric(5,1),
  daily_step_goal int,
  sleep_goal_hours numeric(3,1),
  water_goal_l    numeric(3,1),
  protein_goal_g  int,
  workout_goal_per_week int,
  sugar_reduction_note text,
  rationale     jsonb,                           -- one-line reason per goal
  created_at    timestamptz default now(),
  unique (user_id, month)
);
```

---

## 6. Gamification

```sql
create table streaks (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  checkin_current int default 0,
  checkin_best    int default 0,
  workout_current int default 0,
  sleep_current   int default 0,
  last_checkin_date date,
  updated_at      timestamptz default now()
);

create table badges (
  id   text primary key,                         -- water_master, protein_champion, sleep_hero, fitness_warrior
  name text not null,
  description text,
  icon text
);

create table user_badges (
  user_id   uuid references auth.users(id) on delete cascade,
  badge_id  text references badges(id),
  earned_at timestamptz default now(),
  primary key (user_id, badge_id)
);
```

---

## 7. Subscriptions & devices

```sql
-- Source of truth is RevenueCat; this mirrors entitlement for fast gating + webhooks.
create table subscriptions (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  plan           plan_t not null default 'free',
  status         sub_status_t not null default 'active',
  rc_app_user_id text,                           -- RevenueCat app user id
  current_period_end timestamptz,
  is_annual      boolean default false,
  updated_at     timestamptz default now()
);

create table device_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  expo_token  text not null,
  platform    text,                              -- ios | android
  created_at  timestamptz default now(),
  unique (user_id, expo_token)
);

-- Cost monitoring (TRD §4). Store counts/cost, not raw PII prompts.
create table ai_usage (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  function_name text not null,
  model         text,
  input_tokens  int,
  output_tokens int,
  cost_usd      numeric(10,6),
  created_at    timestamptz default now()
);
create index ai_usage_user_time on ai_usage(user_id, created_at desc);
```

---

## 8. Family (schema-ready; UI in v1.1)

```sql
create table family_groups (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid not null references auth.users(id) on delete cascade,
  name       text,
  created_at timestamptz default now()
);

create table family_members (
  group_id   uuid references family_groups(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  role       family_role_t default 'member',
  relation   text,                               -- father, mother, spouse, child
  joined_at  timestamptz default now(),
  primary key (group_id, user_id)
);
```

---

## 9. updated_at trigger

```sql
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

-- attach to each table with updated_at, e.g.:
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
-- repeat for health_profiles, daily_logs, subscriptions, streaks ...
```

---

## 10. Row Level Security (apply to ALL tables)

Enable + owner policy pattern (repeat per user-owned table):

```sql
alter table profiles enable row level security;

create policy "own row - select" on profiles
  for select using (auth.uid() = id);
create policy "own row - upsert" on profiles
  for insert with check (auth.uid() = id);
create policy "own row - update" on profiles
  for update using (auth.uid() = id);
```

For tables keyed by `user_id` (daily_logs, *_entries, ai_analyses, reports, goals, streaks, user_badges, device_tokens, subscriptions, ai_usage):

```sql
alter table daily_logs enable row level security;
create policy "owner all" on daily_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Reference data (`foods`, `badges`): read-only to authenticated users, writes only via service role:

```sql
alter table foods enable row level security;
create policy "read foods" on foods for select to authenticated using (true);
```

Family read access (v1.1) — a member can read another member's *summary* rows only within a shared group:

```sql
alter table reports enable row level security;
create policy "owner reads own reports" on reports
  for select using (auth.uid() = user_id);
create policy "family admin reads member reports" on reports
  for select using (
    exists (
      select 1 from family_members fm_self
      join family_members fm_target on fm_self.group_id = fm_target.group_id
      where fm_self.user_id = auth.uid()
        and fm_self.role = 'admin'
        and fm_target.user_id = reports.user_id
    )
  );
```

> **Edge Functions** use the service-role key and bypass RLS — they must enforce ownership/entitlement in code (TRD §5).

---

## 11. Storage buckets

- `food-photos` (private) — Advanced food analysis uploads; signed URLs; auto-expire/delete.
- `blood-reports` (private) — sensitive; signed URLs; delete-on-request.
- `report-pdfs` (private) — monthly PDFs; share via short-lived signed URL + `reports.share_token`.

---

## 12. Extensions

```sql
create extension if not exists pg_trgm;     -- food search
create extension if not exists pg_cron;     -- scheduled batch reports/notifications
```
