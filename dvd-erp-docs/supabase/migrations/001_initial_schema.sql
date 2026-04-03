-- ============================================================
-- DVD ERP — Migracija 001: Inicijalna shema
-- Pokrenuti: supabase db push --db-url <projekt_url>
-- ============================================================

-- Ekstenzije
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- ENUMERACIJE (konstante kao check constrainti)
-- ============================================================

-- Korisničke uloge
CREATE TYPE uloga_tip AS ENUM (
  'admin',
  'predsjednik',
  'zamjenik',
  'tajnik',
  'blagajnik',
  'zapovjednik',
  'zamjenik_zapovjednika',
  'clan'
);

-- Kategorije članstva
CREATE TYPE kategorija_clana AS ENUM (
  'dobrovoljni_vatrogasac',
  'prikljuceni',
  'pocasni',
  'podmladak'
);

-- Statusi člana
CREATE TYPE status_clana AS ENUM (
  'aktivan',
  'neaktivan',
  'istupio',
  'iskljucen'
);

-- Vrste sjednica
CREATE TYPE vrsta_sjednice AS ENUM (
  'skupstina_redovna',
  'skupstina_izborna',
  'skupstina_izvanredna',
  'skupstina_konstitutivna',
  'upravni_odbor',
  'zapovjednistvo'
);

-- Statusi sjednice
CREATE TYPE status_sjednice AS ENUM (
  'planirana',
  'pozivnica_poslana',
  'odrzana',
  'zapisnik_potpisan',
  'arhivirana'
);

-- ============================================================
-- TABLICA: korisnici
-- ============================================================
CREATE TABLE korisnici (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  ime         TEXT NOT NULL,
  prezime     TEXT NOT NULL,
  uloga       uloga_tip NOT NULL DEFAULT 'clan',
  aktivan     BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLICA: clanovi
-- ============================================================
CREATE TABLE clanovi (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Osobni podaci (GDPR zaštićeno — RLS ograničava pristup)
  ime                     TEXT NOT NULL,
  prezime                 TEXT NOT NULL,
  oib                     TEXT UNIQUE NOT NULL,
  datum_rodenja           DATE,
  mjesto_rodenja          TEXT,

  -- Adresa
  ulica                   TEXT,
  kucni_broj              TEXT,
  mjesto                  TEXT,
  postanski_broj          TEXT,

  -- Kontakt
  mobitel                 TEXT,
  email                   TEXT,

  -- Podaci o članstvu
  kategorija              kategorija_clana NOT NULL,
  datum_uclanivanja       DATE NOT NULL,
  status                  status_clana NOT NULL DEFAULT 'aktivan',
  datum_promjene_statusa  DATE,
  razlog_promjene         TEXT,

  -- Vatrogasni podaci
  vatrogasno_zvanje       TEXT,
  datum_stjecanja_zvanja  DATE,

  -- GDPR
  gdpr_privola_datum      DATE,
  gdpr_privola_verzija    TEXT DEFAULT 'v1',

  -- Meta
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  updated_by              UUID REFERENCES korisnici(id)
);

-- ============================================================
-- TABLICA: clanarine
-- ============================================================
CREATE TABLE clanarine (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         UUID NOT NULL REFERENCES clanovi(id),
  godina          SMALLINT NOT NULL,
  iznos           DECIMAL(8,2),
  datum_placanja  DATE,
  nacin_placanja  TEXT CHECK (nacin_placanja IN ('gotovina', 'virman', 'uplatnica')),
  napomena        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (clan_id, godina)
);

-- ============================================================
-- TABLICA: certifikati_osposobljavanje
-- ============================================================
CREATE TABLE certifikati_osposobljavanje (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id           UUID NOT NULL REFERENCES clanovi(id) ON DELETE CASCADE,
  vrsta             TEXT NOT NULL,
  naziv             TEXT NOT NULL,
  datum_stjecanja   DATE NOT NULL,
  datum_isteka      DATE,
  organizator       TEXT,
  broj_certifikata  TEXT,
  napomena          TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLICA: zdravstveni_pregledi
-- ============================================================
CREATE TABLE zdravstveni_pregledi (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         UUID NOT NULL REFERENCES clanovi(id) ON DELETE CASCADE,
  datum_pregleda  DATE NOT NULL,
  rezultat        TEXT CHECK (rezultat IN ('sposoban', 'uvjetno_sposoban', 'nesposoban')),
  datum_sljedeceg DATE,
  ustanova        TEXT,
  lijecnik        TEXT,
  napomena        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLICA: sjednice
-- ============================================================
CREATE TABLE sjednice (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vrsta                 vrsta_sjednice NOT NULL,
  naziv                 TEXT NOT NULL,
  urbroj                TEXT UNIQUE,
  klasa                 TEXT,

  datum                 DATE NOT NULL,
  sat_pocetka           TIME,
  sat_zavrsetka         TIME,
  mjesto                TEXT,

  status                status_sjednice NOT NULL DEFAULT 'planirana',

  ukupno_clanova        SMALLINT,
  prisutno_clanova      SMALLINT,
  kvorum_postignut      BOOLEAN,

  predsjedavajuci_id    UUID REFERENCES clanovi(id),
  zapisnicar_id         UUID REFERENCES clanovi(id),

  napomena              TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  created_by            UUID REFERENCES korisnici(id)
);

-- ============================================================
-- TABLICA: tocke_dnevnog_reda
-- ============================================================
CREATE TABLE tocke_dnevnog_reda (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sjednica_id       UUID NOT NULL REFERENCES sjednice(id) ON DELETE CASCADE,
  redni_broj        SMALLINT NOT NULL,
  naziv             TEXT NOT NULL,
  opis              TEXT,
  vrsta             TEXT CHECK (vrsta IN ('izvjesce', 'plan', 'odluka', 'izbori', 'razno')),

  rasprava          TEXT,
  zakljucak         TEXT,
  odluka_tekst      TEXT,
  glasovi_za        SMALLINT,
  glasovi_protiv    SMALLINT,
  glasovi_uzdrzani  SMALLINT,
  usvojena          BOOLEAN,

  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (sjednica_id, redni_broj)
);

-- ============================================================
-- TABLICA: sjednice_prisutni
-- ============================================================
CREATE TABLE sjednice_prisutni (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sjednica_id UUID NOT NULL REFERENCES sjednice(id) ON DELETE CASCADE,
  clan_id     UUID NOT NULL REFERENCES clanovi(id),
  prisutan    BOOLEAN DEFAULT true,
  punomos     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (sjednica_id, clan_id)
);

-- ============================================================
-- TABLICA: dokumenti
-- ============================================================
CREATE TABLE dokumenti (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv         TEXT NOT NULL,
  opis          TEXT,
  vrsta         TEXT CHECK (vrsta IN ('pdf', 'docx', 'xlsx', 'scan', 'slika', 'ostalo')),
  urbroj        TEXT,
  klasa         TEXT,

  -- Supabase Storage
  storage_path  TEXT NOT NULL,
  velicina_kb   INTEGER,

  -- Klasifikacija
  modul         TEXT CHECK (modul IN (
    'skupstine', 'upravni_odbor', 'zapovjednistvo', 'clanstvo',
    'financije', 'nabava', 'imovina', 'vatrogasna', 'arhiva', 'ostalo'
  )),
  rok_cuvanja   TEXT CHECK (rok_cuvanja IN ('trajno', '10_god', '7_god', '5_god', '3_god')),

  -- Veze s ostalim tablicama
  sjednica_id   UUID REFERENCES sjednice(id),
  nabava_id     UUID,   -- FK dodati nakon kreiranja tablice nabave
  racun_id      UUID,   -- FK dodati nakon kreiranja tablice racuna
  clan_id       UUID REFERENCES clanovi(id),

  created_at    TIMESTAMPTZ DEFAULT now(),
  uploaded_by   UUID REFERENCES korisnici(id)
);

-- ============================================================
-- TABLICA: financijski_planovi
-- ============================================================
CREATE TABLE financijski_planovi (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  godina          SMALLINT NOT NULL,
  verzija         TEXT NOT NULL DEFAULT 'original',
  status          TEXT NOT NULL DEFAULT 'prijedlog'
                  CHECK (status IN ('prijedlog', 'usvojen', 'izmijenjen')),
  datum_usvajanja DATE,
  sjednica_id     UUID REFERENCES sjednice(id),
  napomena        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (godina, verzija)
);

-- ============================================================
-- TABLICA: financijski_plan_stavke
-- ============================================================
CREATE TABLE financijski_plan_stavke (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id             UUID NOT NULL REFERENCES financijski_planovi(id) ON DELETE CASCADE,
  kategorija          TEXT NOT NULL CHECK (kategorija IN ('prihod', 'rashod')),
  racunski_plan_konto TEXT,
  naziv_stavke        TEXT NOT NULL,
  iznos_plan          DECIMAL(12,2) NOT NULL DEFAULT 0,
  iznos_ostvareno     DECIMAL(12,2) NOT NULL DEFAULT 0,
  napomena            TEXT,
  redni_broj          SMALLINT
);

-- ============================================================
-- TABLICA: racuni
-- ============================================================
CREATE TABLE racuni (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vrsta             TEXT NOT NULL CHECK (vrsta IN ('ulazni', 'izlazni')),
  broj_racuna       TEXT,
  interni_broj      TEXT UNIQUE,

  naziv_stranke     TEXT NOT NULL,
  oib_stranke       TEXT,
  iban_stranke      TEXT,

  datum_racuna      DATE NOT NULL,
  datum_dospijeća   DATE,
  datum_placanja    DATE,

  iznos_bez_pdv     DECIMAL(12,2),
  pdv_iznos         DECIMAL(12,2) DEFAULT 0,
  iznos_ukupno      DECIMAL(12,2) NOT NULL,

  opis              TEXT,
  napomena          TEXT,

  status            TEXT NOT NULL DEFAULT 'primljeno'
                    CHECK (status IN ('primljeno', 'u_obradi', 'odobreno', 'placeno', 'odbijeno')),

  nabava_id         UUID,   -- FK dodati nakon kreiranja tablice nabave
  dokument_id       UUID REFERENCES dokumenti(id),

  created_at        TIMESTAMPTZ DEFAULT now(),
  odobrio_id        UUID REFERENCES korisnici(id),
  datum_odobravanja TIMESTAMPTZ
);

-- ============================================================
-- TABLICA: nabave
-- ============================================================
CREATE TABLE nabave (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broj_nabave         TEXT UNIQUE NOT NULL,  -- NAB-2026-001

  opis                TEXT NOT NULL,
  procijenjeni_iznos  DECIMAL(12,2),
  stvarni_iznos       DECIMAL(12,2),

  status              TEXT NOT NULL DEFAULT 'zahtjev'
                      CHECK (status IN (
                        'zahtjev', 'odobreno', 'ponude_prikupljene',
                        'narudzbenica_poslana', 'isporuceno', 'placeno', 'zatvoreno'
                      )),

  datum_zahtjeva      DATE,
  datum_odobrenja     DATE,
  datum_narudzbenice  DATE,
  datum_isporuke      DATE,

  dobavljac_naziv     TEXT,
  dobavljac_oib       TEXT,
  dobavljac_iban      TEXT,
  broj_ponuda         SMALLINT DEFAULT 0,

  napomena            TEXT,
  odobrio_id          UUID REFERENCES korisnici(id),
  created_by          UUID REFERENCES korisnici(id),
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- FK veze za nabave
ALTER TABLE racuni ADD CONSTRAINT racuni_nabava_fk
  FOREIGN KEY (nabava_id) REFERENCES nabave(id);
ALTER TABLE dokumenti ADD CONSTRAINT dokumenti_nabava_fk
  FOREIGN KEY (nabava_id) REFERENCES nabave(id);

-- ============================================================
-- TABLICA: ponude
-- ============================================================
CREATE TABLE ponude (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nabava_id       UUID NOT NULL REFERENCES nabave(id) ON DELETE CASCADE,
  dobavljac_naziv TEXT NOT NULL,
  iznos           DECIMAL(12,2),
  rok_isporuke    TEXT,
  napomena        TEXT,
  odabrana        BOOLEAN DEFAULT false,
  dokument_id     UUID REFERENCES dokumenti(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLICA: imovina
-- ============================================================
CREATE TABLE imovina (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vrsta                 TEXT NOT NULL CHECK (vrsta IN ('vozilo', 'oprema', 'nepokretna', 'ostalo')),
  naziv                 TEXT NOT NULL,
  opis                  TEXT,
  serijski_broj         TEXT,
  inventurni_broj       TEXT UNIQUE,

  -- Vozila
  reg_oznaka            TEXT,
  marka                 TEXT,
  model                 TEXT,
  godina_izrade         SMALLINT,

  -- Nabava
  datum_nabave          DATE,
  nabavna_vrijednost    DECIMAL(12,2),
  dobavljac             TEXT,

  lokacija              TEXT,
  status                TEXT DEFAULT 'u_uporabi'
                        CHECK (status IN ('u_uporabi', 'servis', 'neispravno', 'otpisano')),
  datum_otpisa          DATE,
  razlog_otpisa         TEXT,

  -- Rokovi (vozila)
  registracija_do       DATE,
  tehnicki_do           DATE,
  osiguranje_do         DATE,
  osiguranje_polica     TEXT,

  nabava_id             UUID REFERENCES nabave(id),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLICA: servisni_zapisi
-- ============================================================
CREATE TABLE servisni_zapisi (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imovina_id      UUID NOT NULL REFERENCES imovina(id) ON DELETE CASCADE,
  datum           DATE NOT NULL,
  kilometraza     INTEGER,
  opis_radova     TEXT NOT NULL,
  serviser        TEXT,
  iznos           DECIMAL(10,2),
  sljedeci_servis DATE,
  napomena        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLICA: intervencije
-- ============================================================
CREATE TABLE intervencije (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hvz_broj              TEXT,
  interni_broj          TEXT UNIQUE,

  datum_dojave          DATE NOT NULL,
  sat_dojave            TIME,
  nacin_dojave          TEXT CHECK (nacin_dojave IN ('193', 'mobilni', 'osobno', 'radio', 'ostalo')),

  opcina                TEXT,
  adresa                TEXT,
  lat                   DECIMAL(10,7),
  lng                   DECIMAL(10,7),

  vrsta                 TEXT NOT NULL CHECK (vrsta IN (
    'pozar_otvoreni', 'pozar_zatvoreni', 'prometna', 'tehnicka_pomoc',
    'ekoloska', 'traganje_spasavanje', 'ostalo'
  )),
  uzrok                 TEXT,

  sat_polaska           TIME,
  sat_dolaska           TIME,
  sat_zavrsetka         TIME,

  kratki_opis           TEXT,
  detaljan_opis         TEXT,
  materijalna_steta     TEXT,
  ozljede               TEXT,

  voditelj_id           UUID REFERENCES clanovi(id),
  upisao_id             UUID REFERENCES korisnici(id),
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLICA: intervencije_sudionici
-- ============================================================
CREATE TABLE intervencije_sudionici (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervencija_id UUID NOT NULL REFERENCES intervencije(id) ON DELETE CASCADE,
  clan_id         UUID NOT NULL REFERENCES clanovi(id),
  uloga           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (intervencija_id, clan_id)
);

-- ============================================================
-- TABLICA: vjezbe
-- ============================================================
CREATE TABLE vjezbe (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv           TEXT NOT NULL,
  vrsta           TEXT,
  datum           DATE NOT NULL,
  lokacija        TEXT,
  trajanje_min    SMALLINT,
  opis            TEXT,
  napomene        TEXT,
  voditelj_id     UUID REFERENCES clanovi(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLICA: vjezbe_sudionici
-- ============================================================
CREATE TABLE vjezbe_sudionici (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vjezba_id   UUID NOT NULL REFERENCES vjezbe(id) ON DELETE CASCADE,
  clan_id     UUID NOT NULL REFERENCES clanovi(id),
  prisutan    BOOLEAN DEFAULT true,
  napomena    TEXT,
  UNIQUE (vjezba_id, clan_id)
);

-- ============================================================
-- TABLICA: zakonska_izvjesca
-- ============================================================
CREATE TABLE zakonska_izvjesca (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv         TEXT NOT NULL,
  vrsta         TEXT NOT NULL CHECK (vrsta IN (
    'fina_kvartal', 'fina_godisnje', 'skupstina_izvjesce',
    'skupstina_plan', 'jls', 'registar_udruga', 'hvz', 'ostalo'
  )),
  godina        SMALLINT NOT NULL,
  kvartal       SMALLINT CHECK (kvartal BETWEEN 1 AND 4),
  primatelj     TEXT NOT NULL,
  rok           DATE,
  status        TEXT NOT NULL DEFAULT 'nije_predano'
                CHECK (status IN ('nije_predano', 'u_pripremi', 'predano', 'prihvaceno')),
  datum_predaje DATE,
  napomena      TEXT,
  dokument_id   UUID REFERENCES dokumenti(id)
);

-- ============================================================
-- TABLICA: aktivnosti_plan_rada
-- ============================================================
CREATE TABLE aktivnosti_plan_rada (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  godina      SMALLINT NOT NULL,
  kategorija  TEXT NOT NULL CHECK (kategorija IN (
    'upravljanje', 'vatrogasna', 'opremanje', 'drustveno', 'projekti'
  )),
  naziv       TEXT NOT NULL,
  rok         TEXT,
  rok_datum   DATE,
  odgovoran   TEXT,
  status      TEXT NOT NULL DEFAULT 'planirano'
              CHECK (status IN ('planirano', 'u_tijeku', 'realizirano', 'djelomicno', 'otkazano')),
  napomena    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLICA: email_logovi
-- ============================================================
CREATE TABLE email_logovi (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip         TEXT NOT NULL,
  primatelj   TEXT NOT NULL,
  predmet     TEXT NOT NULL,
  status      TEXT CHECK (status IN ('poslan', 'greska', 'bounce')),
  greska      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLICA: revizijski_trag
-- ============================================================
CREATE TABLE revizijski_trag (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tablica       TEXT NOT NULL,
  zapis_id      UUID NOT NULL,
  akcija        TEXT NOT NULL CHECK (akcija IN ('INSERT', 'UPDATE', 'DELETE')),
  stari_podaci  JSONB,
  novi_podaci   JSONB,
  korisnik_id   UUID REFERENCES korisnici(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TRIGGERI: automatski updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_clanovi_updated_at
  BEFORE UPDATE ON clanovi
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_sjednice_updated_at
  BEFORE UPDATE ON sjednice
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_imovina_updated_at
  BEFORE UPDATE ON imovina
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGERI: revizijski trag za osjetljive tablice
-- ============================================================
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO revizijski_trag (tablica, zapis_id, akcija, stari_podaci, novi_podaci)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_audit_clanovi
  AFTER INSERT OR UPDATE OR DELETE ON clanovi
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER tr_audit_racuni
  AFTER INSERT OR UPDATE OR DELETE ON racuni
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- ============================================================
-- INDEKSI
-- ============================================================
CREATE INDEX idx_clanovi_status       ON clanovi(status);
CREATE INDEX idx_clanovi_kategorija   ON clanovi(kategorija);
CREATE INDEX idx_sjednice_vrsta_datum ON sjednice(vrsta, datum DESC);
CREATE INDEX idx_sjednice_status      ON sjednice(status);
CREATE INDEX idx_racuni_datum         ON racuni(datum_racuna DESC);
CREATE INDEX idx_racuni_status        ON racuni(status);
CREATE INDEX idx_nabave_status        ON nabave(status);
CREATE INDEX idx_imovina_vrsta        ON imovina(vrsta);
CREATE INDEX idx_imovina_registracija ON imovina(registracija_do) WHERE vrsta = 'vozilo';
CREATE INDEX idx_intervencije_datum   ON intervencije(datum_dojave DESC);
CREATE INDEX idx_izvjesca_rok         ON zakonska_izvjesca(rok);
CREATE INDEX idx_izvjesca_status      ON zakonska_izvjesca(status);
CREATE INDEX idx_audit_tablica        ON revizijski_trag(tablica, zapis_id);
CREATE INDEX idx_certifikati_datum    ON certifikati_osposobljavanje(datum_isteka) WHERE datum_isteka IS NOT NULL;
CREATE INDEX idx_zdravlje_sljedeci    ON zdravstveni_pregledi(datum_sljedeceg) WHERE datum_sljedeceg IS NOT NULL;
