-- ============================================================
-- MIGRACIJA 004: Tijela DVD-a
-- Evidencija članova Upravnog odbora i Zapovjedništva
-- Skupština nema posebnu tablicu — svi aktivni članovi
-- ============================================================

CREATE TABLE tijela_dvd (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vrsta       TEXT NOT NULL CHECK (vrsta IN ('upravni_odbor', 'zapovjednistvo')),
  clan_id     UUID NOT NULL REFERENCES clanovi(id),
  funkcija    TEXT NOT NULL DEFAULT 'član',
  datum_od    DATE NOT NULL DEFAULT CURRENT_DATE,
  datum_do    DATE,
  aktivan     BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (vrsta, clan_id, datum_od)
);

CREATE INDEX idx_tijela_vrsta_aktivan ON tijela_dvd(vrsta) WHERE aktivan = true;

-- RLS
ALTER TABLE tijela_dvd ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Svi prijavljeni mogu čitati tijela"
  ON tijela_dvd FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Upravačke uloge mogu uređivati tijela"
  ON tijela_dvd FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM korisnici
      WHERE korisnici.id = auth.uid()
      AND korisnici.uloga IN ('admin', 'predsjednik', 'zamjenik', 'tajnik')
      AND korisnici.aktivan = true
    )
  );

-- ============================================================
-- SEED: Trenutni sastav tijela iz Matičnog lista (28.03.2026.)
-- Članovi se referenciraju po prezime+ime jer nemamo UUID-ove
-- Pokrenuti NAKON seed_clanovi.sql i seed_clanovi_update.sql
-- ============================================================

-- Upravni odbor (9 članova prema Statutu čl. 42)
INSERT INTO tijela_dvd (vrsta, clan_id, funkcija, datum_od) VALUES
('upravni_odbor', (SELECT id FROM clanovi WHERE prezime='Vadoci' AND ime='Atila' LIMIT 1), 'predsjednik', '2026-02-20'),
('upravni_odbor', (SELECT id FROM clanovi WHERE prezime='Davidović' AND ime='Saša' LIMIT 1), 'zapovjednik', '2026-02-20'),
('upravni_odbor', (SELECT id FROM clanovi WHERE prezime='Korica' AND ime='Milenko' LIMIT 1), 'predsjednik', '2026-02-20'),
('upravni_odbor', (SELECT id FROM clanovi WHERE prezime='Ahmeti' AND ime='Borna' LIMIT 1), 'zapovjednik', '2026-02-20'),
('upravni_odbor', (SELECT id FROM clanovi WHERE prezime='Davidović' AND ime='Ivana' LIMIT 1), 'zamjenik predsjednika', '2026-02-20'),
('upravni_odbor', (SELECT id FROM clanovi WHERE prezime='Kozarević' AND ime='Tatjana' LIMIT 1), 'blagajnik', '2026-02-20'),
('upravni_odbor', (SELECT id FROM clanovi WHERE prezime='Golić' AND ime='Andrija' LIMIT 1), 'član', '2026-02-20'),
('upravni_odbor', (SELECT id FROM clanovi WHERE prezime='Pic' AND ime='Josip' LIMIT 1), 'član', '2026-02-20'),
('upravni_odbor', (SELECT id FROM clanovi WHERE prezime='Jeger' AND ime='Zlatko' LIMIT 1), 'član', '2026-02-20');

-- Zapovjedništvo (8 članova + predsjednik po čl. 44 uvijek pozvan)
INSERT INTO tijela_dvd (vrsta, clan_id, funkcija, datum_od) VALUES
('zapovjednistvo', (SELECT id FROM clanovi WHERE prezime='Davidović' AND ime='Saša' LIMIT 1), 'zapovjednik', '2026-02-20'),
('zapovjednistvo', (SELECT id FROM clanovi WHERE prezime='Ahmeti' AND ime='Borna' LIMIT 1), 'zapovjednik', '2026-02-20'),
('zapovjednistvo', (SELECT id FROM clanovi WHERE prezime='Jurkin' AND ime='Sandra' LIMIT 1), 'član', '2026-02-20'),
('zapovjednistvo', (SELECT id FROM clanovi WHERE prezime='Lončarić' AND ime='Martina' LIMIT 1), 'član', '2026-02-20'),
('zapovjednistvo', (SELECT id FROM clanovi WHERE prezime='Ahmeti' AND ime='Igor' LIMIT 1), 'član', '2026-02-20'),
('zapovjednistvo', (SELECT id FROM clanovi WHERE prezime='Paripović' AND ime='Darko' LIMIT 1), 'član', '2026-02-20'),
('zapovjednistvo', (SELECT id FROM clanovi WHERE prezime='Živković' AND ime='Mihael' LIMIT 1), 'član', '2026-02-20'),
('zapovjednistvo', (SELECT id FROM clanovi WHERE prezime='Samardžić' AND ime='Ratko' LIMIT 1), 'član', '2026-02-20');
