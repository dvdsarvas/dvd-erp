-- ============================================================
-- MIGRACIJA 014: pg_cron job za automatski sync e-racuna
-- Svaki sat poziva Edge Function sync-eracuni koja provjerava
-- inbox na mojeRacun/ePoslovanje i preuzima nove dokumente.
-- ============================================================

-- Ukloni stari ako postoji (idempotentno)
SELECT cron.unschedule('dvd-erp-sync-eracuni')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dvd-erp-sync-eracuni');

-- Svaki sat u :00
SELECT cron.schedule(
  'dvd-erp-sync-eracuni',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/sync-eracuni',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ============================================================
-- Provjera: SELECT jobname, schedule, active FROM cron.job;
-- Ocekivani jobovi:
--   dvd-erp-daily-reminder    '0 7 * * *'
--   dvd-erp-weekly-cleanup    '0 3 * * 0'
--   dvd-erp-nova-godina-...   '30 0 1 1 *'
--   dvd-erp-sync-eracuni      '0 * * * *'
-- ============================================================
