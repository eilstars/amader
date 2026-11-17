-- Runs the cleanup function once a day. Paste into the Supabase SQL editor once,
-- AFTER deploying the function (see README, "Automatic deletion").
--
-- Replace the two values in angle brackets first:
--   <PROJECT_REF>     the id in your project's address, https://<PROJECT_REF>.supabase.co
--   <CLEANUP_SECRET>  the same long random string you set with `npx supabase secrets set CLEANUP_SECRET=...`
-- The secret is stored in Supabase Vault, not in this file. Do not commit the filled-in version.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('https://<PROJECT_REF>.supabase.co', 'amader_project_url');
select vault.create_secret('<CLEANUP_SECRET>', 'amader_cleanup_secret');

-- Every day at 09:15 UTC (early morning in the US).
select cron.schedule(
  'amader-daily-cleanup',
  '15 9 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'amader_project_url') || '/functions/v1/cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'amader_cleanup_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- To check it ran:   select * from cron.job_run_details order by start_time desc limit 5;
-- To see the answer: select status_code, content from net._http_response order by created desc limit 5;
-- To stop it:        select cron.unschedule('amader-daily-cleanup');
