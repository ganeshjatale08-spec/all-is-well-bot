-- PROGRESS.md Phase 4 — pg_cron overnight batch for Pro+ users.
--
-- Decision (resolves PROGRESS.md decisions-log "Daily AI batch time / quiet
-- hours default"): the product targets the Indian market for MVP and
-- `profiles` has no per-user timezone column, so "yesterday" is anchored to
-- IST (Asia/Kolkata) rather than solving per-user timezones. The batch runs
-- at 19:30 UTC = 01:00 IST, after IST midnight, computing the day that just
-- ended in IST.
--
-- Secrets: this migration never hardcodes the project URL or service-role
-- key. It reads them from Supabase Vault (`vault.decrypted_secrets`) at
-- call-time. Before this job can do anything, an operator must run, once,
-- against the project (not checked in, since it contains the secret):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service-role-key>', 'service_role_key');
-- Until those two secrets exist, run_daily_analysis_batch() safely no-ops
-- (logs a notice) instead of failing.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create or replace function run_daily_analysis_batch()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_date date;
  project_url text;
  service_role_key text;
  qualifying_user record;
begin
  target_date := ((now() at time zone 'Asia/Kolkata')::date - 1);

  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'project_url';

  select decrypted_secret into service_role_key
  from vault.decrypted_secrets
  where name = 'service_role_key';

  if project_url is null or service_role_key is null then
    raise notice 'run_daily_analysis_batch: project_url/service_role_key not set in Vault yet, skipping (% )', target_date;
    return;
  end if;

  for qualifying_user in
    select distinct dl.user_id
    from daily_logs dl
    join subscriptions s on s.user_id = dl.user_id
    where dl.log_date = target_date
      and s.plan in ('pro', 'family', 'advanced')
      and s.status in ('active', 'trialing', 'grace')
  loop
    perform net.http_post(
      url := project_url || '/functions/v1/daily-analysis',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || service_role_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'user_id', qualifying_user.user_id,
        'log_date', target_date
      )
    );
  end loop;
end;
$$;

-- 19:30 UTC = 01:00 IST.
select cron.schedule(
  'daily-analysis-overnight-batch',
  '30 19 * * *',
  $$select run_daily_analysis_batch();$$
);
