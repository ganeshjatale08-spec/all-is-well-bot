-- BACKEND_SCHEMA.md §5 — reports (weekly + monthly) + goals (monthly
-- generated targets), plus the private `report-pdfs` storage bucket (§11).
--
-- RLS follows the same deviation as ai_analyses/subscriptions
-- (...0006_subscriptions_and_ai.sql): both tables are populated only by
-- Edge Functions (service role), so authenticated users get SELECT-only,
-- no insert/update/delete — including `reports.pdf_url`/`share_token`,
-- which are written by the `report-share` Edge Function after the client
-- uploads its client-rendered PDF, not by a direct client UPDATE. This
-- keeps "AI/report content is always server-authored" consistent across
-- every AI-bearing table rather than carving out a one-off writable column.
--
-- Family RLS deviation (documented, not escalated — judged a doc
-- precision issue, not a real ambiguity): BACKEND_SCHEMA §10 also shows a
-- "family admin reads member reports" policy on `reports`. It's omitted
-- here because `family_groups`/`family_members` are explicitly out of the
-- MVP build list (BACKEND_SCHEMA.md line 6: "Family tables... are
-- schema-ready but UI is v1.1") — a policy referencing tables that don't
-- exist yet would fail to create. Add it in the Phase 6+ family migration
-- once those tables land.

create table reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  period        report_period_t not null,
  period_start  date not null,
  period_end    date not null,
  score         int,
  summary       jsonb not null,
  pdf_url       text,
  share_token   text unique,
  model         text,
  created_at    timestamptz default now(),
  unique (user_id, period, period_start)
);

alter table reports enable row level security;
create policy "own row - select" on reports
  for select using (auth.uid() = user_id);

create table goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  month         date not null,
  target_weight_kg numeric(5,1),
  daily_step_goal int,
  sleep_goal_hours numeric(3,1),
  water_goal_l    numeric(3,1),
  protein_goal_g  int,
  workout_goal_per_week int,
  sugar_reduction_note text,
  rationale     jsonb,
  created_at    timestamptz default now(),
  unique (user_id, month)
);

alter table goals enable row level security;
create policy "own row - select" on goals
  for select using (auth.uid() = user_id);

-- Private bucket for client-rendered monthly PDFs (expo-print). Per-user
-- folder convention: object path is `${user_id}/${report_id}.pdf`, so a
-- single policy scopes both read and write to the owner via the first
-- path segment — the standard Supabase storage RLS pattern.
insert into storage.buckets (id, name, public)
values ('report-pdfs', 'report-pdfs', false)
on conflict (id) do nothing;

create policy "owner manages own report pdfs" on storage.objects
  for all
  using (bucket_id = 'report-pdfs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'report-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
