-- ============================================================
-- DVD ERP — Migracija 003: pg_cron i scheduled jobs
-- ============================================================
-- Preduvjet: pg_cron i pg_net extenzije (kreirane u 001)
-- ============================================================

-- ============================================================
-- DAILY REMINDER JOB
-- Svaki dan u 07:00 UTC (09:00 HR ljeto / 08:00 HR zima)
-- Poziva Edge Function send-reminder
-- ============================================================
SELECT cron.schedule(
  'dvd-erp-daily-reminder',
  '0 7 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/send-reminder',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ============================================================
-- WEEKLY CLEANUP JOB (nedjeljom u 03:00)
-- Čisti stare email logove (starije od 90 dana)
-- ============================================================
SELECT cron.schedule(
  'dvd-erp-weekly-cleanup',
  '0 3 * * 0',
  $$
    DELETE FROM email_logovi
    WHERE created_at < now() - INTERVAL '90 days';
  $$
);

-- ============================================================
-- GODIŠNJI JOB: kreiranje zakonskih izvješća za novu godinu
-- 1. siječnja u 00:30
-- ============================================================
SELECT cron.schedule(
  'dvd-erp-nova-godina-izvjesca',
  '30 0 1 1 *',
  $$
    DO $$
    DECLARE
      nova_godina SMALLINT := EXTRACT(YEAR FROM now())::SMALLINT;
    BEGIN
      -- Q1
      INSERT INTO zakonska_izvjesca (naziv, vrsta, godina, kvartal, primatelj, rok)
      VALUES (
        'Financijsko izvješće FINA Q1 ' || nova_godina,
        'fina_kvartal', nova_godina, 1, 'FINA',
        make_date(nova_godina, 4, 30)
      ) ON CONFLICT DO NOTHING;

      -- Q2
      INSERT INTO zakonska_izvjesca (naziv, vrsta, godina, kvartal, primatelj, rok)
      VALUES (
        'Financijsko izvješće FINA Q2 ' || nova_godina,
        'fina_kvartal', nova_godina, 2, 'FINA',
        make_date(nova_godina, 7, 31)
      ) ON CONFLICT DO NOTHING;

      -- Q3
      INSERT INTO zakonska_izvjesca (naziv, vrsta, godina, kvartal, primatelj, rok)
      VALUES (
        'Financijsko izvješće FINA Q3 ' || nova_godina,
        'fina_kvartal', nova_godina, 3, 'FINA',
        make_date(nova_godina, 10, 31)
      ) ON CONFLICT DO NOTHING;

      -- Q4 (rok je 31.1. sljedeće godine)
      INSERT INTO zakonska_izvjesca (naziv, vrsta, godina, kvartal, primatelj, rok)
      VALUES (
        'Financijsko izvješće FINA Q4 ' || nova_godina,
        'fina_kvartal', nova_godina, 4, 'FINA',
        make_date(nova_godina + 1, 1, 31)
      ) ON CONFLICT DO NOTHING;

      -- Godišnje (rok je 28.2. sljedeće godine)
      INSERT INTO zakonska_izvjesca (naziv, vrsta, godina, primatelj, rok)
      VALUES (
        'Godišnje financijsko izvješće ' || nova_godina,
        'fina_godisnje', nova_godina, 'FINA',
        make_date(nova_godina + 1, 2, 28)
      ) ON CONFLICT DO NOTHING;

      -- Samoprocjena FUK
      INSERT INTO zakonska_izvjesca (naziv, vrsta, godina, primatelj, rok)
      VALUES (
        'Samoprocjena financijskog upravljanja i kontrola ' || nova_godina,
        'ostalo', nova_godina, 'Predsjednik (interno)',
        make_date(nova_godina + 1, 2, 28)
      ) ON CONFLICT DO NOTHING;

      -- Skupštinska izvješća (rok 30.6.)
      INSERT INTO zakonska_izvjesca (naziv, vrsta, godina, primatelj, rok)
      VALUES (
        'Izvješće o radu skupštini ' || nova_godina,
        'skupstina_izvjesce', nova_godina, 'Skupština DVD-a',
        make_date(nova_godina, 6, 30)
      ) ON CONFLICT DO NOTHING;

      INSERT INTO zakonska_izvjesca (naziv, vrsta, godina, primatelj, rok)
      VALUES (
        'Financijsko izvješće skupštini ' || nova_godina,
        'skupstina_izvjesce', nova_godina, 'Skupština DVD-a',
        make_date(nova_godina, 6, 30)
      ) ON CONFLICT DO NOTHING;

      -- Plan za sljedeću godinu (rok 31.12. tekuće)
      INSERT INTO zakonska_izvjesca (naziv, vrsta, godina, primatelj, rok)
      VALUES (
        'Plan rada ' || (nova_godina + 1) || '. (skupština)',
        'skupstina_plan', nova_godina, 'Skupština DVD-a',
        make_date(nova_godina, 12, 31)
      ) ON CONFLICT DO NOTHING;

      INSERT INTO zakonska_izvjesca (naziv, vrsta, godina, primatelj, rok)
      VALUES (
        'Financijski plan ' || (nova_godina + 1) || '. (skupština)',
        'skupstina_plan', nova_godina, 'Skupština DVD-a',
        make_date(nova_godina, 12, 31)
      ) ON CONFLICT DO NOTHING;

      RAISE NOTICE 'Kreirana zakonska izvješća za godinu %', nova_godina;
    END;
    $$ LANGUAGE plpgsql;
  $$
);

-- ============================================================
-- Provjera kreiranh cron jobova
-- ============================================================
-- SELECT * FROM cron.job;
