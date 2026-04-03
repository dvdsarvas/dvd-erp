-- ============================================================
-- DVD ERP — Migracija 002: Row Level Security
-- ============================================================
-- PRAVILO: RLS je jedini sigurnosni sloj.
-- Anon ključ je javan — zaštita je isključivo u ovim policy-ima.
-- Testirati izolaciju explicitno (vidjeti TODO.md Faza 4).
-- ============================================================

-- Uključi RLS na svim tablicama
ALTER TABLE korisnici              ENABLE ROW LEVEL SECURITY;
ALTER TABLE clanovi                ENABLE ROW LEVEL SECURITY;
ALTER TABLE clanarine              ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifikati_osposobljavanje ENABLE ROW LEVEL SECURITY;
ALTER TABLE zdravstveni_pregledi   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sjednice               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tocke_dnevnog_reda     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sjednice_prisutni      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dokumenti              ENABLE ROW LEVEL SECURITY;
ALTER TABLE financijski_planovi    ENABLE ROW LEVEL SECURITY;
ALTER TABLE financijski_plan_stavke ENABLE ROW LEVEL SECURITY;
ALTER TABLE racuni                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE nabave                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponude                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE imovina                ENABLE ROW LEVEL SECURITY;
ALTER TABLE servisni_zapisi        ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervencije           ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervencije_sudionici ENABLE ROW LEVEL SECURITY;
ALTER TABLE vjezbe                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE vjezbe_sudionici       ENABLE ROW LEVEL SECURITY;
ALTER TABLE zakonska_izvjesca      ENABLE ROW LEVEL SECURITY;
ALTER TABLE aktivnosti_plan_rada   ENABLE ROW LEVEL SECURITY;
ALTER TABLE revizijski_trag        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNKCIJA: Dohvati ulogu trenutnog korisnika
-- ============================================================
CREATE OR REPLACE FUNCTION trenutna_uloga()
RETURNS uloga_tip AS $$
  SELECT uloga FROM korisnici WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- HELPER: Je li korisnik admin/predsjednik/zamjenik
-- ============================================================
CREATE OR REPLACE FUNCTION je_upravljacka_uloga()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM korisnici
    WHERE id = auth.uid()
    AND uloga IN ('admin', 'predsjednik', 'zamjenik')
    AND aktivan = true
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- HELPER: Je li korisnik financijska uloga
-- ============================================================
CREATE OR REPLACE FUNCTION je_financijska_uloga()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM korisnici
    WHERE id = auth.uid()
    AND uloga IN ('admin', 'predsjednik', 'zamjenik', 'tajnik', 'blagajnik')
    AND aktivan = true
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- HELPER: Je li korisnik aktivan (bilo koja uloga)
-- ============================================================
CREATE OR REPLACE FUNCTION je_aktivan_korisnik()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM korisnici
    WHERE id = auth.uid()
    AND aktivan = true
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- POLICIES: korisnici
-- ============================================================
-- Svaki korisnik vidi samo vlastiti red; admin vidi sve
CREATE POLICY "korisnici: vlastiti profil"
  ON korisnici FOR SELECT
  USING (id = auth.uid() OR je_upravljacka_uloga());

CREATE POLICY "korisnici: admin upravlja"
  ON korisnici FOR ALL
  USING (trenutna_uloga() = 'admin');

-- ============================================================
-- POLICIES: clanovi
-- ============================================================
-- Čitanje: upravljačke uloge + tajnik vide sve; clan vidi samo sebe
CREATE POLICY "clanovi: ovlasteni citaju sve"
  ON clanovi FOR SELECT
  USING (
    je_upravljacka_uloga()
    OR trenutna_uloga() IN ('tajnik', 'zapovjednik', 'zamjenik_zapovjednika')
  );

-- Osobni podaci: clan vidi samo vlastite
CREATE POLICY "clanovi: clan vidi vlastito"
  ON clanovi FOR SELECT
  USING (
    -- Ako je clan, provjeri je li to njegov zapis
    -- Veza: korisnici.email = clanovi.email
    (SELECT email FROM korisnici WHERE id = auth.uid()) = email
  );

-- Upisivanje: tajnik i upravljačke uloge
CREATE POLICY "clanovi: tajnik i uprava upisuju"
  ON clanovi FOR INSERT
  WITH CHECK (
    je_upravljacka_uloga()
    OR trenutna_uloga() = 'tajnik'
  );

CREATE POLICY "clanovi: tajnik i uprava azuriraju"
  ON clanovi FOR UPDATE
  USING (
    je_upravljacka_uloga()
    OR trenutna_uloga() = 'tajnik'
  );

-- Brisanje: samo admin (soft-delete je preferirano!)
CREATE POLICY "clanovi: admin brise"
  ON clanovi FOR DELETE
  USING (trenutna_uloga() = 'admin');

-- ============================================================
-- POLICIES: clanarine
-- ============================================================
CREATE POLICY "clanarine: financijska uloga"
  ON clanarine FOR ALL
  USING (je_financijska_uloga());

-- ============================================================
-- POLICIES: certifikati_osposobljavanje
-- ============================================================
CREATE POLICY "certifikati: zapovjednistvo i uprava"
  ON certifikati_osposobljavanje FOR ALL
  USING (
    je_upravljacka_uloga()
    OR trenutna_uloga() IN ('tajnik', 'zapovjednik', 'zamjenik_zapovjednika')
  );

-- ============================================================
-- POLICIES: zdravstveni_pregledi
-- ============================================================
-- Zdravstveni podaci — posebno osjetljivo (GDPR čl. 9.)
CREATE POLICY "zdravlje: predsjednik i zapovjednistvo"
  ON zdravstveni_pregledi FOR SELECT
  USING (
    je_upravljacka_uloga()
    OR trenutna_uloga() IN ('zapovjednik', 'zamjenik_zapovjednika')
  );

CREATE POLICY "zdravlje: tajnik upisuje"
  ON zdravstveni_pregledi FOR INSERT WITH CHECK (je_upravljacka_uloga() OR trenutna_uloga() = 'tajnik');
CREATE POLICY "zdravlje: tajnik azurira"
  ON zdravstveni_pregledi FOR UPDATE USING (je_upravljacka_uloga() OR trenutna_uloga() = 'tajnik');

-- ============================================================
-- POLICIES: sjednice
-- ============================================================
-- Čitanje: svi aktivni korisnici
CREATE POLICY "sjednice: svi citaju"
  ON sjednice FOR SELECT
  USING (je_aktivan_korisnik());

-- Upravljanje: upravljačke uloge + tajnik
CREATE POLICY "sjednice: tajnik i uprava upisuju"
  ON sjednice FOR INSERT WITH CHECK (je_upravljacka_uloga() OR trenutna_uloga() = 'tajnik');
CREATE POLICY "sjednice: tajnik i uprava azuriraju"
  ON sjednice FOR UPDATE USING (je_upravljacka_uloga() OR trenutna_uloga() = 'tajnik');

-- ============================================================
-- POLICIES: tocke_dnevnog_reda, sjednice_prisutni
-- ============================================================
CREATE POLICY "tocke: svi citaju"
  ON tocke_dnevnog_reda FOR SELECT USING (je_aktivan_korisnik());
CREATE POLICY "tocke: tajnik i uprava mijenjaju"
  ON tocke_dnevnog_reda FOR ALL
  USING (je_upravljacka_uloga() OR trenutna_uloga() = 'tajnik');

CREATE POLICY "prisutni: svi citaju"
  ON sjednice_prisutni FOR SELECT USING (je_aktivan_korisnik());
CREATE POLICY "prisutni: tajnik upisuje"
  ON sjednice_prisutni FOR ALL
  USING (je_upravljacka_uloga() OR trenutna_uloga() = 'tajnik');

-- ============================================================
-- POLICIES: dokumenti
-- ============================================================
CREATE POLICY "dokumenti: svi aktivni citaju"
  ON dokumenti FOR SELECT USING (je_aktivan_korisnik());
CREATE POLICY "dokumenti: tajnik i uprava upisuju"
  ON dokumenti FOR INSERT WITH CHECK (je_upravljacka_uloga() OR trenutna_uloga() = 'tajnik');
CREATE POLICY "dokumenti: tajnik i uprava azuriraju"
  ON dokumenti FOR UPDATE USING (je_upravljacka_uloga() OR trenutna_uloga() = 'tajnik');

-- ============================================================
-- POLICIES: financije
-- ============================================================
CREATE POLICY "fin_planovi: financijska uloga"
  ON financijski_planovi FOR ALL USING (je_financijska_uloga());

CREATE POLICY "fin_stavke: financijska uloga"
  ON financijski_plan_stavke FOR ALL USING (je_financijska_uloga());

CREATE POLICY "racuni: financijska uloga"
  ON racuni FOR ALL USING (je_financijska_uloga());

-- ============================================================
-- POLICIES: nabava
-- ============================================================
-- Čitanje: svi aktivni (za transparentnost unutar DVD-a)
CREATE POLICY "nabave: svi citaju"
  ON nabave FOR SELECT USING (je_aktivan_korisnik());

-- Kreiranje zahtjeva: svi aktivni
CREATE POLICY "nabave: zahtjev kreira svako"
  ON nabave FOR INSERT WITH CHECK (je_aktivan_korisnik());

-- Odobravanje/ažuriranje: upravljačke uloge + tajnik
CREATE POLICY "nabave: uprava azurira"
  ON nabave FOR UPDATE USING (je_upravljacka_uloga() OR trenutna_uloga() = 'tajnik');

CREATE POLICY "ponude: svi citaju"
  ON ponude FOR SELECT USING (je_aktivan_korisnik());
CREATE POLICY "ponude: tajnik upisuje"
  ON ponude FOR ALL USING (je_upravljacka_uloga() OR trenutna_uloga() = 'tajnik');

-- ============================================================
-- POLICIES: imovina
-- ============================================================
CREATE POLICY "imovina: svi aktivni citaju"
  ON imovina FOR SELECT USING (je_aktivan_korisnik());
CREATE POLICY "imovina: uprava i tajnik mijenjaju"
  ON imovina FOR ALL
  USING (
    je_upravljacka_uloga()
    OR trenutna_uloga() IN ('tajnik', 'zapovjednik', 'zamjenik_zapovjednika')
  );

CREATE POLICY "servis: svi citaju"
  ON servisni_zapisi FOR SELECT USING (je_aktivan_korisnik());
CREATE POLICY "servis: zapovjednistvo upisuje"
  ON servisni_zapisi FOR ALL
  USING (
    je_upravljacka_uloga()
    OR trenutna_uloga() IN ('zapovjednik', 'zamjenik_zapovjednika', 'tajnik')
  );

-- ============================================================
-- POLICIES: vatrogasna djelatnost
-- ============================================================
CREATE POLICY "intervencije: svi aktivni citaju"
  ON intervencije FOR SELECT USING (je_aktivan_korisnik());
CREATE POLICY "intervencije: zapovjednistvo upisuje"
  ON intervencije FOR INSERT WITH CHECK (
    je_upravljacka_uloga()
    OR trenutna_uloga() IN ('zapovjednik', 'zamjenik_zapovjednika')
  );
CREATE POLICY "intervencije: zapovjednistvo azurira"
  ON intervencije FOR UPDATE USING (
    je_upravljacka_uloga()
    OR trenutna_uloga() IN ('zapovjednik', 'zamjenik_zapovjednika')
  );

CREATE POLICY "int_sudionici: svi citaju"
  ON intervencije_sudionici FOR SELECT USING (je_aktivan_korisnik());
CREATE POLICY "int_sudionici: zapovjednistvo upisuje"
  ON intervencije_sudionici FOR ALL
  USING (je_upravljacka_uloga() OR trenutna_uloga() IN ('zapovjednik', 'zamjenik_zapovjednika'));

CREATE POLICY "vjezbe: svi citaju"
  ON vjezbe FOR SELECT USING (je_aktivan_korisnik());
CREATE POLICY "vjezbe: zapovjednistvo upisuje"
  ON vjezbe FOR ALL
  USING (je_upravljacka_uloga() OR trenutna_uloga() IN ('zapovjednik', 'zamjenik_zapovjednika'));

CREATE POLICY "vjezbe_sud: svi citaju"
  ON vjezbe_sudionici FOR SELECT USING (je_aktivan_korisnik());
CREATE POLICY "vjezbe_sud: zapovjednistvo upisuje"
  ON vjezbe_sudionici FOR ALL
  USING (je_upravljacka_uloga() OR trenutna_uloga() IN ('zapovjednik', 'zamjenik_zapovjednika'));

-- ============================================================
-- POLICIES: zakonska izvješća i plan rada
-- ============================================================
CREATE POLICY "izvjesca: svi citaju"
  ON zakonska_izvjesca FOR SELECT USING (je_aktivan_korisnik());
CREATE POLICY "izvjesca: uprava i tajnik mijenjaju"
  ON zakonska_izvjesca FOR ALL
  USING (je_upravljacka_uloga() OR trenutna_uloga() = 'tajnik');

CREATE POLICY "plan_rada: svi citaju"
  ON aktivnosti_plan_rada FOR SELECT USING (je_aktivan_korisnik());
CREATE POLICY "plan_rada: uprava mijenja"
  ON aktivnosti_plan_rada FOR ALL USING (je_upravljacka_uloga() OR trenutna_uloga() = 'tajnik');

-- ============================================================
-- POLICIES: revizijski trag (samo čitanje, samo admin)
-- ============================================================
CREATE POLICY "audit: samo admin cita"
  ON revizijski_trag FOR SELECT
  USING (trenutna_uloga() = 'admin');

-- ============================================================
-- SUPABASE STORAGE — Bucket konfiguracija
-- ============================================================
-- Pokrenuti u Supabase Dashboard → Storage → New Bucket:
--
-- Bucket: "dokumenti"
--   Public: false
--   File size limit: 50MB
--   Allowed MIME types: application/pdf, application/vnd.openxmlformats-*, image/jpeg, image/png
--
-- Storage policy za "dokumenti" bucket:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dokumenti',
  'dokumenti',
  false,
  52428800,  -- 50MB
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png']
);

CREATE POLICY "dokumenti storage: aktivni citaju"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dokumenti' AND je_aktivan_korisnik());

CREATE POLICY "dokumenti storage: tajnik uploaduje"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dokumenti'
    AND (je_upravljacka_uloga() OR trenutna_uloga() IN ('tajnik', 'blagajnik', 'zapovjednik'))
  );

CREATE POLICY "dokumenti storage: uprava brise"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'dokumenti' AND je_upravljacka_uloga());
