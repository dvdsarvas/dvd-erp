-- ============================================================
-- MIGRACIJA 007: Popravke RLS politika
-- Sve tablice koje su imale probleme s INSERT/UPDATE
-- ============================================================

-- ── revizijski_trag (trigger tablica — mora dozvoliti INSERT) ──
ALTER TABLE revizijski_trag ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "revizijski_trag_insert" ON revizijski_trag;
DROP POLICY IF EXISTS "revizijski_trag_select" ON revizijski_trag;
CREATE POLICY "revizijski_trag_insert" ON revizijski_trag FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "revizijski_trag_select" ON revizijski_trag FOR SELECT TO authenticated USING (true);

-- ── racuni ──
DROP POLICY IF EXISTS "racuni_open" ON racuni;
DROP POLICY IF EXISTS "racuni: financijska uloga" ON racuni;
DROP POLICY IF EXISTS "racuni: financijska uloga čita" ON racuni;
DROP POLICY IF EXISTS "racuni: financijska uloga upisuje" ON racuni;
DROP POLICY IF EXISTS "racuni: financijska uloga ažurira" ON racuni;
DROP POLICY IF EXISTS "racuni: financijska uloga briše" ON racuni;
DROP POLICY IF EXISTS "racuni_select" ON racuni;
DROP POLICY IF EXISTS "racuni_insert" ON racuni;
DROP POLICY IF EXISTS "racuni_update" ON racuni;
DROP POLICY IF EXISTS "racuni_delete" ON racuni;

ALTER TABLE racuni ENABLE ROW LEVEL SECURITY;
CREATE POLICY "racuni_select" ON racuni FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND korisnici.aktivan = true));
CREATE POLICY "racuni_insert" ON racuni FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND korisnici.aktivan = true));
CREATE POLICY "racuni_update" ON racuni FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND korisnici.aktivan = true))
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND korisnici.aktivan = true));
CREATE POLICY "racuni_delete" ON racuni FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND korisnici.aktivan = true));

-- ── financijski_planovi ──
ALTER TABLE financijski_planovi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Svi čitaju fin planove" ON financijski_planovi;
DROP POLICY IF EXISTS "Uprava uređuje fin planove" ON financijski_planovi;
CREATE POLICY "finplan_select" ON financijski_planovi FOR SELECT TO authenticated USING (true);
CREATE POLICY "finplan_insert" ON financijski_planovi FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND korisnici.aktivan = true));
CREATE POLICY "finplan_update" ON financijski_planovi FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND korisnici.aktivan = true))
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND korisnici.aktivan = true));

-- ── financijski_plan_stavke ──
ALTER TABLE financijski_plan_stavke ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Svi čitaju fin stavke" ON financijski_plan_stavke;
DROP POLICY IF EXISTS "Uprava uređuje fin stavke" ON financijski_plan_stavke;
CREATE POLICY "finstav_select" ON financijski_plan_stavke FOR SELECT TO authenticated USING (true);
CREATE POLICY "finstav_insert" ON financijski_plan_stavke FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND korisnici.aktivan = true));
CREATE POLICY "finstav_update" ON financijski_plan_stavke FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND korisnici.aktivan = true))
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND korisnici.aktivan = true));

-- ── aktivnosti_plan_rada ──
ALTER TABLE aktivnosti_plan_rada ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "planrada_select" ON aktivnosti_plan_rada FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "planrada_insert" ON aktivnosti_plan_rada FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik') AND korisnici.aktivan = true));
CREATE POLICY IF NOT EXISTS "planrada_update" ON aktivnosti_plan_rada FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik') AND korisnici.aktivan = true))
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik') AND korisnici.aktivan = true));
CREATE POLICY IF NOT EXISTS "planrada_delete" ON aktivnosti_plan_rada FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik') AND korisnici.aktivan = true));

-- ── nabave ──
ALTER TABLE nabave ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "nabave_select" ON nabave FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik','zapovjednik') AND korisnici.aktivan = true));
CREATE POLICY IF NOT EXISTS "nabave_insert" ON nabave FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik','zapovjednik') AND korisnici.aktivan = true));
CREATE POLICY IF NOT EXISTS "nabave_update" ON nabave FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND korisnici.aktivan = true))
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND korisnici.aktivan = true));

-- ── imovina ──
ALTER TABLE imovina ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "imovina_select" ON imovina FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "imovina_insert" ON imovina FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','zapovjednik') AND korisnici.aktivan = true));
CREATE POLICY IF NOT EXISTS "imovina_update" ON imovina FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','zapovjednik') AND korisnici.aktivan = true))
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','zapovjednik') AND korisnici.aktivan = true));

-- ── intervencije ──
ALTER TABLE intervencije ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "intervencije_select" ON intervencije FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "intervencije_insert" ON intervencije FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','zapovjednik','zamjenik_zapovjednika') AND korisnici.aktivan = true));

-- ── vjezbe ──
ALTER TABLE vjezbe ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "vjezbe_select" ON vjezbe FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "vjezbe_insert" ON vjezbe FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','zapovjednik','zamjenik_zapovjednika') AND korisnici.aktivan = true));

-- ── servisni_zapisi ──
ALTER TABLE servisni_zapisi ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "servis_select" ON servisni_zapisi FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "servis_insert" ON servisni_zapisi FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','zapovjednik') AND korisnici.aktivan = true));
