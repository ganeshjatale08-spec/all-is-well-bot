-- PROGRESS.md Phase 5 / TRD §6 ("Sunday night -> weekly-report") — pg_cron
-- batch for Pro+ users with at least one log in the week just ending.
--
-- Same IST-anchoring and Vault-secret pattern as
-- 20260630000007_daily_analysis_cron.sql: the batch fires at 21:00 IST
-- Sunday (15:30 UTC), well inside "Sunday night," and reads project_url /
-- service_role_key from Supabase Vault rather than hardcoding them. It
-- safely no-ops (logs a notice) until those secrets exist.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create or replace function run_weekly_report_batch()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $
declare
  target_sunday date;
  week_start date;
  project_url text;
  service_role_key text;
  qualifying_user record;
begin
  target_sunday := (now() at time zone 'Asia/Kolkata')::date;
  week_start := target_sunday - 6;

  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'project_url';

  select decrypted_secret into service_role_key
  from vault.decrypted_secrets
  where name = 'service_role_key';

  if project_url is null or service_role_key is null then
    raise notice 'run_weekly_report_batch: project_url/service_role_key not set in Vault yet, skipping (week ending %)', target_sunday;
    return;
  end if;

  for qualifying_user in
    select distinct dl.user_id
    from daily_logs dl
    join subscriptions s on s.user_id = dl.user_id
    where dl.log_date between week_start and target_sunday
      and s.plan in ('pro', 'family', 'advanced')
      and s.status in ('active', 'trialing', 'grace')
  loop
    perform net.http_post(
      url := project_url || '/functions/v1/weekly-report',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || service_role_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'user_id', qualifying_user.user_id,
        'period_end', target_sunday
      )
    );
  end loop;
end;
$;

-- 15:30 UTC Sunday = 21:00 IST Sunday.
select cron.schedule(
  'weekly-report-sunday-batch',
  '30 15 * * 0',
  $select run_weekly_report_batch();$
);
