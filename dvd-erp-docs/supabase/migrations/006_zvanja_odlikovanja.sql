-- ============================================================
-- MIGRACIJA 006: Vatrogasna zvanja i odlikovanja
-- Prema Pravilniku NN 89/2024 i Pravilniku HVZ o odlikovanjima
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- REFERENTNA TABLICA: Vatrogasna zvanja
-- 12 zvanja za dobrovoljne vatrogasce prema Pravilniku NN 89/2024
-- ────────────────────────────────────────────────────────────

CREATE TABLE vatrogasna_zvanja (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv       TEXT NOT NULL UNIQUE,
  kategorija  TEXT NOT NULL CHECK (kategorija IN ('osnovno', 'docasnik', 'casnik', 'visi_casnik', 'pocasno')),
  razina      SMALLINT NOT NULL,  -- 1-12, redoslijed napredovanja
  uvjeti_staz_mjeseci  SMALLINT,  -- minimalni staž u prethodnom zvanju (u mjesecima)
  uvjeti_obrazovanje   TEXT,      -- minimalna razina obrazovanja
  uvjeti_ispit         BOOLEAN DEFAULT true,
  uvjeti_opis          TEXT,      -- detaljni opis uvjeta
  oznaka_url           TEXT,      -- URL slike oznake zvanja (opcionalno)
  aktivan              BOOLEAN DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vatrogasna_zvanja ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Svi čitaju zvanja" ON vatrogasna_zvanja FOR SELECT TO authenticated USING (true);

-- SEED: 12 zvanja za dobrovoljne vatrogasce
INSERT INTO vatrogasna_zvanja (naziv, kategorija, razina, uvjeti_staz_mjeseci, uvjeti_obrazovanje, uvjeti_ispit, uvjeti_opis) VALUES
('Vatrogasac', 'osnovno', 1, 6, NULL, false, '6+ mjeseci članstva, završeno osposobljavanje za dobrovoljnog vatrogasca'),
('Vatrogasac I. reda', 'osnovno', 2, 12, NULL, true, '1+ godina kao vatrogasac, položen ispit za zvanje'),
('Vatrogasni dočasnik', 'docasnik', 3, 12, NULL, true, '1+ godina kao vatrogasac I. reda, završeno osposobljavanje'),
('Vatrogasni dočasnik I. reda', 'docasnik', 4, 24, NULL, true, '2+ godine kao vatrogasni dočasnik, položen ispit'),
('Vatrogasni časnik', 'casnik', 5, 24, 'SSS', true, 'SSS + 2+ godine kao dočasnik I. reda + ispit; ILI VŠS + 2+ god. kao vatrogasac + osposobljavanje'),
('Vatrogasni časnik I. reda', 'casnik', 6, 24, 'SSS', true, '2+ godine kao vatrogasni časnik, položen ispit'),
('Viši vatrogasni časnik', 'visi_casnik', 7, 48, 'SSS', true, 'SSS + 4+ godine kao časnik I. reda, položen ispit'),
('Viši vatrogasni časnik I. reda', 'visi_casnik', 8, 48, 'SSS', true, '4+ godine kao viši vatrogasni časnik, položen ispit'),
('Visoki vatrogasni časnik', 'visi_casnik', 9, 48, 'VŠS', true, 'VŠS (6. ili 7.1. razina HKO) + 4+ godine kao časnik, ispit'),
('Visoki vatrogasni časnik I. reda', 'visi_casnik', 10, 48, 'VŠS', true, '4+ godine kao visoki vatrogasni časnik, položen ispit'),
('Počasni vatrogasni časnik', 'pocasno', 11, NULL, NULL, false, '5+ godina aktivnog rada u dobrovoljnom vatrogastvu, odluka županijske VZ'),
('Počasni viši vatrogasni časnik', 'pocasno', 12, NULL, NULL, false, '5+ godina aktivnog rada, doprinos vatrogastvu, odluka glavnog zapovjednika');

-- ────────────────────────────────────────────────────────────
-- TABLICA: Odlikovanja i priznanja članova
-- ────────────────────────────────────────────────────────────

CREATE TABLE odlikovanja (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         UUID NOT NULL REFERENCES clanovi(id) ON DELETE CASCADE,
  vrsta           TEXT NOT NULL CHECK (vrsta IN (
    'odlikovanje_posebne_zasluge',
    'zlatna_medalja',
    'zlatni_znak',
    'spomen_medalja_50',
    'spomen_medalja_60',
    'spomen_medalja_70',
    'plaketa_dezelic',
    'plaketa_kolaric',
    'plaketa_hrabrost_zlatna',
    'plaketa_hrabrost_srebrna',
    'plaketa_hrabrost_broncana',
    'povelja',
    'pisano_priznanje',
    'zahvalnica',
    'ostalo'
  )),
  naziv           TEXT NOT NULL,
  datum_dodjele   DATE NOT NULL,
  dodijelio       TEXT,            -- tko je dodijelio (DVD, VZ, HVZ, JLS...)
  broj_odluke     TEXT,            -- broj odluke o dodjeli
  napomena        TEXT,
  dokument_url    TEXT,            -- sken diplome/priznanja
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_odlikovanja_clan ON odlikovanja(clan_id);

ALTER TABLE odlikovanja ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Svi čitaju odlikovanja" ON odlikovanja FOR SELECT TO authenticated USING (true);
CREATE POLICY "Uprava uređuje odlikovanja" ON odlikovanja FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid()
    AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik')
    AND korisnici.aktivan = true));

-- ────────────────────────────────────────────────────────────
-- TABLICA: Povijest zvanja članova (napredovanje)
-- Prati kad je član dobio koje zvanje
-- ────────────────────────────────────────────────────────────

CREATE TABLE povijest_zvanja (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         UUID NOT NULL REFERENCES clanovi(id) ON DELETE CASCADE,
  zvanje_id       UUID NOT NULL REFERENCES vatrogasna_zvanja(id),
  datum_stjecanja DATE NOT NULL,
  datum_ispita    DATE,
  rezultat_ispita TEXT,             -- 'položen', 'nije_položen'
  broj_certifikata TEXT,
  certifikat_url  TEXT,             -- sken certifikata
  napomena        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_povijest_zvanja_clan ON povijest_zvanja(clan_id);

ALTER TABLE povijest_zvanja ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Svi čitaju povijest zvanja" ON povijest_zvanja FOR SELECT TO authenticated USING (true);
CREATE POLICY "Uprava uređuje povijest zvanja" ON povijest_zvanja FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid()
    AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','zapovjednik')
    AND korisnici.aktivan = true));
