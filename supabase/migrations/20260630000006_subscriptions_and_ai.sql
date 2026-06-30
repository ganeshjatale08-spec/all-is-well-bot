-- BACKEND_SCHEMA.md §5, §7 — subscriptions (pulled forward from Phase 6:
-- schema only, no RevenueCat webhook/UI yet) + ai_analyses + ai_usage.
--
-- RLS deviation from §10's generic "owner all" template, documented here per
-- CLAUDE.md ("ask on data-model ambiguity" — judged not ambiguous, just an
-- imprecise doc grouping that would otherwise let a client write fake AI
-- content or billing rows): ai_analyses and subscriptions are populated only
-- by Edge Functions (service role), so authenticated users get SELECT-only,
-- no insert/update/delete. ai_usage is internal cost tracking with no
-- authenticated-role policies at all (service-role-only), mirroring the
-- read-only-reference-table precedent already used for foods/badges.

create table subscriptions (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  plan           plan_t not null default 'free',
  status         sub_status_t not null default 'active',
  rc_app_user_id text,
  current_period_end timestamptz,
  is_annual      boolean default false,
  updated_at     timestamptz default now()
);

alter table subscriptions enable row level security;
create policy "own row - select" on subscriptions
  for select using (auth.uid() = user_id);

create trigger trg_subscriptions_updated before update on subscriptions
  for each row execute function set_updated_at();

create table ai_analyses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  log_date      date not null,
  health_score  int,
  headline      text,
  insight       text,
  recommendation text,
  tomorrow_focus text,
  model         text,
  created_at    timestamptz default now(),
  unique (user_id, log_date)
);

alter table ai_analyses enable row level security;
create policy "own row - select" on ai_analyses
  for select using (auth.uid() = user_id);

-- Cost monitoring (TRD §4). Store counts/cost, not raw PII prompts.
-- No authenticated-role policies: service role only.
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

alter table ai_usage enable row level security;
