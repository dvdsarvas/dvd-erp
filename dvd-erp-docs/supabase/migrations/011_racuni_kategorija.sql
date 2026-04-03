-- ============================================================
-- MIGRACIJA 011: Kategorizacija računa i AOP kontni plan
-- ============================================================

-- Dodaj kategoriju na račun (veza na stavku financijskog plana)
ALTER TABLE racuni
  ADD COLUMN IF NOT EXISTS plan_stavka_id  UUID REFERENCES financijski_plan_stavke(id),
  ADD COLUMN IF NOT EXISTS aop_konto       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS poslano_knjigov_datum  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS poslano_knjigov_id     UUID REFERENCES korisnici(id),
  ADD COLUMN IF NOT EXISTS dobavljac_id    UUID REFERENCES clanovi(id),
  ADD COLUMN IF NOT EXISTS dobavljac_naziv TEXT DEFAULT '';

-- Tablica za pamćenje zadnje kategorije po dobavljaču
CREATE TABLE IF NOT EXISTS dobavljaci_kategorije (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv_stranke    TEXT NOT NULL UNIQUE,
  plan_stavka_id   UUID REFERENCES financijski_plan_stavke(id),
  aop_konto        TEXT DEFAULT '',
  zadnji_racun_id  UUID REFERENCES racuni(id),
  zadnji_put       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dobavljaci_naziv ON dobavljaci_kategorije(naziv_stranke);

ALTER TABLE dobavljaci_kategorije ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dobavljaci_select" ON dobavljaci_kategorije
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dobavljaci_write" ON dobavljaci_kategorije
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
      AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
      AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true)
  );

-- ============================================================
-- TRIGGER: Kad se račun označi kao plaćen →
-- automatski ažuriraj iznos_ostvareno u financijskom planu
-- ============================================================

CREATE OR REPLACE FUNCTION sync_ostvareno_na_placanje()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'placeno'
     AND OLD.status != 'placeno'
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

  IF NEW.plan_stavka_id IS NOT NULL
     AND NEW.naziv_stranke IS NOT NULL
     AND NEW.naziv_stranke != ''
  THEN
    INSERT INTO dobavljaci_kategorije (naziv_stranke, plan_stavka_id, aop_konto, zadnji_racun_id)
    VALUES (lower(trim(NEW.naziv_stranke)), NEW.plan_stavka_id, COALESCE(NEW.aop_konto,''), NEW.id)
    ON CONFLICT (naziv_stranke) DO UPDATE
      SET plan_stavka_id  = EXCLUDED.plan_stavka_id,
          aop_konto       = EXCLUDED.aop_konto,
          zadnji_racun_id = EXCLUDED.zadnji_racun_id,
          zadnji_put      = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS racun_placanje_sync ON racuni;
CREATE TRIGGER racun_placanje_sync
  AFTER UPDATE ON racuni
  FOR EACH ROW EXECUTE FUNCTION sync_ostvareno_na_placanje();

-- ============================================================
-- VIEW: Knjiga ulaznih računa (zakonski dokument)
-- ============================================================

CREATE OR REPLACE VIEW knjiga_ulaznih_racuna AS
SELECT
  ROW_NUMBER() OVER (
    PARTITION BY EXTRACT(YEAR FROM datum_racuna)
    ORDER BY datum_racuna, created_at
  )                             AS redni_broj,
  EXTRACT(YEAR FROM datum_racuna)::int AS godina,
  interni_broj,
  datum_racuna,
  naziv_stranke,
  opis,
  iznos_ukupno,
  status,
  aop_konto,
  ps.naziv_stavke               AS kategorija_plana,
  datum_placanja,
  likvidirao.ime || ' ' || likvidirao.prezime AS likvidirao_ime,
  datum_odobravanja             AS datum_likvidacije,
  created_at
FROM racuni r
LEFT JOIN financijski_plan_stavke ps ON ps.id = r.plan_stavka_id
LEFT JOIN korisnici likvidirao ON likvidirao.id = r.odobrio_id
WHERE r.vrsta = 'ulazni'
ORDER BY r.datum_racuna, r.created_at;
