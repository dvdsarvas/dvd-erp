-- ============================================================
-- PATCH: Preimenovanje aop_konto → racunski_konto
-- AOP i konto su dvije različite stvari.
-- aop_konto je bio pogrešno ime za konto iz računskog plana.
-- ============================================================

-- Tablica racuni
ALTER TABLE racuni
  RENAME COLUMN aop_konto TO racunski_konto;

COMMENT ON COLUMN racuni.racunski_konto IS
  'Konto iz Računskog plana za NP organizacije (npr. 4231, 3311).
   Automatski se kopira sa stavke financijskog plana.
   AOP sifre (FINA izvještaj) su zasebna stvar — ne miješati.';

-- Tablica dobavljaci_kategorije
ALTER TABLE dobavljaci_kategorije
  RENAME COLUMN aop_konto TO racunski_konto;

-- ============================================================
-- Seed: Konto vrijednosti na standardnim stavkama fin. plana
-- ============================================================

-- PRIHODI (razred 3)
UPDATE financijski_plan_stavke SET racunski_plan_konto = '3211'
  WHERE lower(naziv_stavke) LIKE '%članarin%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '3311'
  WHERE lower(naziv_stavke) LIKE '%dotacij%'
     OR lower(naziv_stavke) LIKE '%vatrogasna zajednica%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '3531'
  WHERE lower(naziv_stavke) LIKE '%donacij%'
     AND lower(naziv_stavke) NOT LIKE '%proračun%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '3631'
  WHERE lower(naziv_stavke) LIKE '%priredba%'
     OR lower(naziv_stavke) LIKE '%zabav%'
     OR lower(naziv_stavke) LIKE '%vlastit%prihod%';

-- RASHODI (razred 4)
UPDATE financijski_plan_stavke SET racunski_plan_konto = '4221'
  WHERE lower(naziv_stavke) LIKE '%uredski%'
     OR lower(naziv_stavke) LIKE '%kancelarij%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4223'
  WHERE lower(naziv_stavke) LIKE '%energij%'
     OR lower(naziv_stavke) LIKE '%struja%'
     OR lower(naziv_stavke) LIKE '%plin%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4225'
  WHERE lower(naziv_stavke) LIKE '%gorivo%'
     OR lower(naziv_stavke) LIKE '%mazivo%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4232'
  WHERE lower(naziv_stavke) LIKE '%telefon%'
     OR lower(naziv_stavke) LIKE '%internet%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4237'
  WHERE lower(naziv_stavke) LIKE '%računovodstv%'
     OR lower(naziv_stavke) LIKE '%knjigovod%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4262'
  WHERE lower(naziv_stavke) LIKE '%osiguranj%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4293'
  WHERE lower(naziv_stavke) LIKE '%reprezentacij%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4211'
  WHERE lower(naziv_stavke) LIKE '%putni%'
     OR lower(naziv_stavke) LIKE '%dnevnica%';

-- ============================================================
-- Ažuriraj trigger: propagacija konta sa stavke plana
-- ============================================================

CREATE OR REPLACE FUNCTION sync_ostvareno_na_placanje()
RETURNS TRIGGER AS $$
BEGIN
  -- Kopiraj konto s plan stavke ako nije već postavljen
  IF NEW.plan_stavka_id IS NOT NULL AND (NEW.racunski_konto IS NULL OR NEW.racunski_konto = '') THEN
    NEW.racunski_konto := (
      SELECT racunski_plan_konto FROM financijski_plan_stavke WHERE id = NEW.plan_stavka_id
    );
  END IF;

  -- Kad se status mijenja NA 'placeno' — ažuriraj ostvareno u fin. planu
  IF NEW.status = 'placeno'
     AND (OLD.status IS NULL OR OLD.status != 'placeno')
     AND NEW.plan_stavka_id IS NOT NULL
  THEN
    UPDATE financijski_plan_stavke
    SET iznos_ostvareno = (
      SELECT COALESCE(SUM(r.iznos_ukupno), 0)
      FROM racuni r
      WHERE r.plan_stavka_id = NEW.plan_stavka_id
        AND r.status = 'placeno'
    )
    WHERE id = NEW.plan_stavka_id;
  END IF;

  -- Zapamti kategoriju dobavljača
  IF NEW.plan_stavka_id IS NOT NULL
     AND NEW.naziv_stranke IS NOT NULL
     AND NEW.naziv_stranke != ''
  THEN
    INSERT INTO dobavljaci_kategorije (naziv_stranke, plan_stavka_id, racunski_konto, zadnji_racun_id)
    VALUES (lower(trim(NEW.naziv_stranke)), NEW.plan_stavka_id, COALESCE(NEW.racunski_konto,''), NEW.id)
    ON CONFLICT (naziv_stranke) DO UPDATE
      SET plan_stavka_id  = EXCLUDED.plan_stavka_id,
          racunski_konto  = EXCLUDED.racunski_konto,
          zadnji_racun_id = EXCLUDED.zadnji_racun_id,
          zadnji_put      = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Promijeni na BEFORE trigger da može modificirati NEW
DROP TRIGGER IF EXISTS racun_placanje_sync ON racuni;
DROP TRIGGER IF EXISTS racun_sync_trigger ON racuni;
CREATE TRIGGER racun_sync_trigger
  BEFORE INSERT OR UPDATE ON racuni
  FOR EACH ROW EXECUTE FUNCTION sync_ostvareno_na_placanje();

-- ============================================================
-- Ažuriraj VIEW knjiga_ulaznih_racuna
-- DROP jer se mijenja tip kolumne redni_broj (bigint → int)
-- ============================================================
DROP VIEW IF EXISTS knjiga_ulaznih_racuna;
CREATE VIEW knjiga_ulaznih_racuna AS
SELECT
  ROW_NUMBER() OVER (
    PARTITION BY EXTRACT(YEAR FROM r.datum_racuna)
    ORDER BY r.datum_racuna, r.created_at
  )::int                               AS redni_broj,
  EXTRACT(YEAR FROM r.datum_racuna)::int AS godina,
  r.interni_broj,
  r.datum_racuna,
  r.naziv_stranke,
  r.opis,
  r.iznos_ukupno,
  r.status,
  r.racunski_konto,
  ps.naziv_stavke                      AS kategorija_plana,
  r.datum_placanja,
  lik.ime || ' ' || lik.prezime        AS likvidirao_ime,
  r.datum_odobravanja                  AS datum_likvidacije,
  r.created_at
FROM racuni r
LEFT JOIN financijski_plan_stavke ps ON ps.id = r.plan_stavka_id
LEFT JOIN korisnici lik ON lik.id = r.odobrio_id
WHERE r.vrsta = 'ulazni'
ORDER BY r.datum_racuna, r.created_at;
