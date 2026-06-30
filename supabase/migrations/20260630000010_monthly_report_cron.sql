-- PROGRESS.md Phase 5 / TRD §6 ("month-end -> monthly-report + goal-generator")
-- — pg_cron batch for Pro+ users with at least one log in the month just
-- ending. Both functions fire for the same qualifying set: monthly-report
-- narrates the month that just ended, goal-generator uses that same month's
-- pace to set next month's targets.
--
-- pg_cron's 5-field syntax has no native "last day of month" expression, so
-- this fires every night (21:00 IST, same slot as the weekly batch but on
-- the days the weekly batch doesn't own) and the function itself no-ops
-- unless today is the last calendar day of the IST month. Same Vault-secret
-- pattern as 20260630000007/20260630000009: reads project_url /
-- service_role_key from Supabase Vault and safely no-ops until those exist.

create or replace function run_monthly_report_batch()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $
declare
  target_date date;
  month_start date;
  project_url text;
  service_role_key text;
  qualifying_user record;
begin
  target_date := (now() at time zone 'Asia/Kolkata')::date;

  -- Only the last calendar day of the month qualifies as a period_end.
  if target_date <> (date_trunc('month', target_date) + interval '1 month' - interval '1 day')::date then
    return;
  end if;

  month_start := date_trunc('month', target_date)::date;

  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'project_url';

  select decrypted_secret into service_role_key
  from vault.decrypted_secrets
  where name = 'service_role_key';

  if project_url is null or service_role_key is null then
    raise notice 'run_monthly_report_batch: project_url/service_role_key not set in Vault yet, skipping (month ending %)', target_date;
    return;
  end if;

  for qualifying_user in
    select distinct dl.user_id
    from daily_logs dl
    join subscriptions s on s.user_id = dl.user_id
    where dl.log_date between month_start and target_date
      and s.plan in ('pro', 'family', 'advanced')
      and s.status in ('active', 'trialing', 'grace')
  loop
    perform net.http_post(
      url := project_url || '/functions/v1/monthly-report',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || service_role_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'user_id', qualifying_user.user_id,
        'period_end', target_date
      )
    );

    perform net.http_post(
      url := project_url || '/functions/v1/goal-generator',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || service_role_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'user_id', qualifying_user.user_id,
        'period_end', target_date
      )
    );
  end loop;
end;
$;

-- 15:30 UTC daily = 21:00 IST daily; the function itself no-ops on all but
-- the last day of the month.
select cron.schedule(
  'monthly-report-month-end-batch',
  '30 15 * * *',
  $select run_monthly_report_batch();$
);
