-- ============================================================
-- MIGRACIJA 012: Import bankovnih izvadaka
-- ============================================================

CREATE TABLE bank_transakcije (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum            DATE NOT NULL,
  iznos            DECIMAL(12,2) NOT NULL,
  tip              TEXT NOT NULL CHECK (tip IN ('prihod', 'rashod')),
  opis             TEXT DEFAULT '',
  referenca        TEXT DEFAULT '',
  racun_id         UUID REFERENCES racuni(id),
  status           TEXT NOT NULL DEFAULT 'nespojeno'
                   CHECK (status IN ('nespojeno', 'spojeno', 'ignorano')),
  izvor            TEXT DEFAULT 'csv_upload'
                   CHECK (izvor IN ('csv_upload', 'n8n_auto', 'rucno')),
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bank_tranz_datum ON bank_transakcije(datum);
CREATE INDEX idx_bank_tranz_status ON bank_transakcije(status);

ALTER TABLE bank_transakcije ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_select" ON bank_transakcije FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true));

CREATE POLICY "bank_write" ON bank_transakcije FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true))
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true));
