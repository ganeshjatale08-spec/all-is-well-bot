-- BACKEND_SCHEMA.md §6, §9, §10 — streaks + badges + user_badges.
-- Streak counters are recomputed client-side from daily_logs/workout_entries
-- (domain/streaks.ts, same "client computes, server stores" pattern as the
-- deterministic score — TRD §6) and persisted here via an owner-RLS upsert
-- so checkin_best survives beyond whatever history window the client reads.

create table streaks (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  checkin_current int default 0,
  checkin_best    int default 0,
  workout_current int default 0,
  sleep_current   int default 0,
  last_checkin_date date,
  updated_at      timestamptz default now()
);

create table badges (
  id          text primary key,
  name        text not null,
  description text,
  icon        text
);

create table user_badges (
  user_id   uuid references auth.users(id) on delete cascade,
  badge_id  text references badges(id),
  earned_at timestamptz default now(),
  primary key (user_id, badge_id)
);

create trigger trg_streaks_updated before update on streaks
  for each row execute function set_updated_at();

alter table streaks enable row level security;
create policy "owner all" on streaks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table badges enable row level security;
create policy "read badges" on badges for select to authenticated using (true);

alter table user_badges enable row level security;
create policy "owner all" on user_badges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Basic badge set (BACKEND_SCHEMA.md §6 comment). Criteria are evaluated
-- client-side in domain/streaks.ts: fitness_warrior/sleep_hero from the
-- 7-day workout/sleep streaks above; water_master/protein_champion the
-- first day water/protein hits its personalized target.
insert into badges (id, name, description, icon) values
  ('water_master', 'Water Master', 'Hit your water target for the day.', 'droplet'),
  ('protein_champion', 'Protein Champion', 'Hit your protein target for the day.', 'drumstick'),
  ('sleep_hero', 'Sleep Hero', '7 nights of logged sleep in a row.', 'moon'),
  ('fitness_warrior', 'Fitness Warrior', '7 days of logged workouts in a row.', 'dumbbell');
