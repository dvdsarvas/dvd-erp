-- ============================================================
-- MIGRACIJA 009: Podaci organizacije (DVD)
-- Jednoredna tablica — jedan DVD, jedan zapis.
-- Funkcioneri se automatski sinkroniziraju iz tijela_dvd.
-- ============================================================

CREATE TABLE dvd_organizacija (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifikacija (statično — rijetko se mijenja)
  naziv                 TEXT NOT NULL DEFAULT '',
  naziv_kratki          TEXT NOT NULL DEFAULT '',
  oib                   TEXT NOT NULL DEFAULT '',
  maticni_broj          TEXT DEFAULT '',
  rbr_rno               TEXT DEFAULT '',     -- Registar neprofitnih organizacija

  -- Kontakt i sjedište
  adresa                TEXT DEFAULT '',
  mjesto                TEXT DEFAULT '',
  postanski_broj        TEXT DEFAULT '',
  email                 TEXT DEFAULT '',
  web                   TEXT DEFAULT '',
  telefon               TEXT DEFAULT '',

  -- Financijski podaci
  iban                  TEXT DEFAULT '',
  banka                 TEXT DEFAULT '',     -- Naziv banke (za zaglavlja dokumenata)
  knjig_prag            TEXT NOT NULL DEFAULT 'jednostavno'
                        CHECK (knjig_prag IN ('jednostavno', 'dvojno')),

  -- Hijerarhija
  vatrogasna_zajednica  TEXT DEFAULT '',     -- npr. "VZ Grada Osijeka"
  zupanijska_zajednica  TEXT DEFAULT '',     -- npr. "VZ OBŽ"
  hvz_region            TEXT DEFAULT '',

  -- Vizualni identitet
  logo_url              TEXT DEFAULT '/logo-dvd.jpg',
  boja_akcentna         TEXT DEFAULT '#dc2626',

  -- Meta
  datum_osnivanja       DATE,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_dvd_org_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dvd_organizacija_updated_at
  BEFORE UPDATE ON dvd_organizacija
  FOR EACH ROW EXECUTE FUNCTION update_dvd_org_updated_at();

-- ============================================================
-- VIEW: Trenutni funkcioneri (automatski iz tijela_dvd)
-- ============================================================

CREATE OR REPLACE VIEW trenutni_funkcioneri AS
SELECT
  o.id AS organizacija_id,
  o.naziv_kratki,
  MAX(CASE WHEN t.funkcija = 'predsjednik'
    THEN c.ime || ' ' || c.prezime END) AS predsjednik,
  MAX(CASE WHEN t.funkcija ILIKE '%zamjenik predsjednika%'
    THEN c.ime || ' ' || c.prezime END) AS zamjenik_predsjednika,
  MAX(CASE WHEN t.funkcija = 'zapovjednik'
    THEN c.ime || ' ' || c.prezime END) AS zapovjednik,
  MAX(CASE WHEN t.funkcija ILIKE '%zamjenik zapovjednika%'
    THEN c.ime || ' ' || c.prezime END) AS zamjenik_zapovjednika,
  MAX(CASE WHEN t.funkcija ILIKE '%tajnik%'
    THEN c.ime || ' ' || c.prezime END) AS tajnik,
  MAX(CASE WHEN t.funkcija = 'blagajnik'
    THEN c.ime || ' ' || c.prezime END) AS blagajnik,
  -- Kontakti funkcionera
  MAX(CASE WHEN t.funkcija = 'predsjednik'
    THEN c.mobitel END) AS predsjednik_mobitel,
  MAX(CASE WHEN t.funkcija = 'predsjednik'
    THEN c.email END) AS predsjednik_email,
  MAX(CASE WHEN t.funkcija = 'zapovjednik'
    THEN c.mobitel END) AS zapovjednik_mobitel,
  MAX(CASE WHEN t.funkcija ILIKE '%tajnik%'
    THEN c.email END) AS tajnik_email
FROM dvd_organizacija o
CROSS JOIN tijela_dvd t
JOIN clanovi c ON c.id = t.clan_id
WHERE t.vrsta = 'upravni_odbor'
  AND t.aktivan = true
GROUP BY o.id, o.naziv_kratki;

-- ============================================================
-- RLS: dvd_organizacija
-- ============================================================

ALTER TABLE dvd_organizacija ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dvd_org_select" ON dvd_organizacija
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dvd_org_insert" ON dvd_organizacija
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM korisnici
      WHERE korisnici.id = auth.uid()
        AND korisnici.uloga IN ('admin', 'predsjednik')
        AND korisnici.aktivan = true
    )
  );

CREATE POLICY "dvd_org_update" ON dvd_organizacija
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM korisnici
      WHERE korisnici.id = auth.uid()
        AND korisnici.uloga IN ('admin', 'predsjednik')
        AND korisnici.aktivan = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM korisnici
      WHERE korisnici.id = auth.uid()
        AND korisnici.uloga IN ('admin', 'predsjednik')
        AND korisnici.aktivan = true
    )
  );

-- ============================================================
-- SEED: Podaci DVD Sarvaš
-- ============================================================

INSERT INTO dvd_organizacija (
  naziv, naziv_kratki, oib, maticni_broj, rbr_rno,
  adresa, mjesto, postanski_broj, email, web, telefon,
  iban, banka, knjig_prag,
  vatrogasna_zajednica, zupanijska_zajednica, hvz_region,
  datum_osnivanja
) VALUES (
  'Dobrovoljno vatrogasno društvo Sarvaš',
  'DVD Sarvaš',
  '48874677674',
  '02794586',
  '',
  'Ivana Mažuranića 31',
  'Sarvaš',
  '31000',
  'dvdsarvas@gmail.com',
  'www.dvdsarvas.hr',
  '',
  'HR2023600001102233720',
  'Erste banka',
  'jednostavno',
  'Vatrogasna zajednica Grada Osijeka',
  'Vatrogasna zajednica Osječko-baranjske županije',
  'HVZ — Regija Istok',
  '2011-07-16'
);
