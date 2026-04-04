-- ============================================================
-- MIGRACIJA 013: e-Račun integracija
-- Proširenje tablice racuni + konfiguracija e-Račun servisa
-- ============================================================

-- Dodaj e-Račun kolumne na tablicu racuni
ALTER TABLE racuni
  ADD COLUMN IF NOT EXISTS eracun_document_id  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS eracun_posrednik    TEXT,
  ADD COLUMN IF NOT EXISTS eracun_xml          TEXT,
  ADD COLUMN IF NOT EXISTS izvor               TEXT NOT NULL DEFAULT 'rucno'
                            CHECK (izvor IN ('rucno', 'xml_upload', 'eracun_api', 'csv_bank')),
  ADD COLUMN IF NOT EXISTS oib_stranke         TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS iznos_bez_pdv       DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS pdv_iznos           DECIMAL(12,2);

-- ============================================================
-- Konfiguracija e-Račun servisa
-- Svaki DVD unosi svoje kredencijale za ePoslovanje/mojeRačun
-- ============================================================

CREATE TABLE IF NOT EXISTS eracun_konfiguracija (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posrednik       TEXT NOT NULL DEFAULT 'eposlovanje'
                  CHECK (posrednik IN ('eposlovanje', 'moj_eracun', 'fina')),
  api_username    TEXT NOT NULL DEFAULT '',
  api_password    TEXT NOT NULL DEFAULT '',
  api_key         TEXT DEFAULT '',
  company_id      TEXT NOT NULL DEFAULT '',
  aktivan         BOOLEAN DEFAULT false,
  zadnji_sync     TIMESTAMPTZ,
  zadnji_sync_br  INT DEFAULT 0,
  greska_zadnja   TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE eracun_konfiguracija ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eracun_kfg_select" ON eracun_konfiguracija
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik','zamjenik','tajnik') AND aktivan = true));

CREATE POLICY "eracun_kfg_write" ON eracun_konfiguracija
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik') AND aktivan = true))
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik') AND aktivan = true));

-- Seed: prazna konfiguracija za DVD Sarvaš
INSERT INTO eracun_konfiguracija (posrednik, company_id, aktivan)
VALUES ('eposlovanje', '48874677674', false)
ON CONFLICT DO NOTHING;
