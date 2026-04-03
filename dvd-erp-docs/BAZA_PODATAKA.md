# BAZA PODATAKA — DVD ERP

Shema je izvedena iz stvarnih datoteka DVD Sarvaš:
- `DVD_Sarvaš_članstvo.xls` — listovi: redovni, NOVO, pomladak, liječnički, školovanje, tijela, ispisani
- `Popis_operativnih_članova.xlsx` — operativni sastav s brojevima telefona i zvanjima
- `Financijski_plan_2025.xlsm` — struktura po Računskom planu za NP organizacije
- `Neprof606_01_01_31_12_2024.xls` — FINA PR-RAS-NPF obrazac s AOP oznakama
- Svi docx dokumenti skupštine, UO i zapovjedništva 2025/2026

---

## Stvarni podaci DVD Sarvaš (u seed.sql)

```
Naziv: DOBROVOLJNO VATROGASNO DRUŠTVO SARVAŠ
Kratki naziv: DVD Sarvaš
Adresa: Ivana Mažuranića 31, 31000 Sarvaš
OIB: 48874677674
MBS (Registarski broj): 2794586
RNO: 197128
IBAN: HR43 2340009 1110673705
Email: dvdsarvas@gmail.com
Web: www.dvdsarvas.hr
Šifra djelatnosti: 9499
Šifra grada/općine: 312 (Osijek)
Šifra županije: 14 (Osječko-baranjska)
```

---

## Vatrogasna zvanja (prema pravilniku NN 21/2026)

Iz lista `školovanje` u `DVD_Sarvaš_članstvo.xls`:

```typescript
export const VATROGASNA_ZVANJA = [
  'vatrogasac',
  'vatrogasac_1_klase',
  'vatrogasni_docasnik',
  'vatrogasni_docasnik_1_klase',
  'vatrogasni_casnik',
  'vatrogasni_casnik_1_klase',
  'visi_vatrogasni_casnik',
  'visi_vatrogasni_casnik_1_klase',
] as const
```

Primjeri iz stvarnih podataka: Andrija Golić — Vatrogasac, Milorad Miljatović — Vatrogasac 1. klase, Davor Ivčić — Viši vatrogasni časnik.

---

## Kategorije članstva (iz stvarnih datoteka)

Iz listova `redovni`, `pomladak`, `ispisani`:

```typescript
export const KATEGORIJE_CLANSTVA = [
  'dobrovoljni_vatrogasac',   // operativni, ima vatrogasni ispit
  'pricuvni',                  // nekad aktivan, sada u pričuvi
  'pocasni',                   // posebne zasluge, bez obveza
  'podmladak',                 // vatrogasna mladež i pioniri
  'pricuvni_ispisani',         // napustio društvo
] as const
```

---

## Tablice

### `dvd_organizacije` (meta-registry, zasebni projekt)

```sql
CREATE TABLE dvd_organizacije (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv           TEXT NOT NULL,
  naziv_kratki    TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  subdomena       TEXT UNIQUE NOT NULL,
  supabase_url    TEXT NOT NULL,
  supabase_anon   TEXT NOT NULL,

  -- Pravni podaci
  oib             TEXT,
  mbs             TEXT,
  rno             TEXT,
  iban            TEXT,
  adresa          TEXT,
  email           TEXT,
  web             TEXT,
  sifra_djelatnosti TEXT,
  sifra_opcine    TEXT,
  sifra_zupanije  TEXT,

  -- Branding
  primarna_boja   TEXT DEFAULT '#CC0000',
  logo_url        TEXT,

  -- Status
  aktivan         BOOLEAN DEFAULT false,
  plan            TEXT DEFAULT 'free',
  kreiran         TIMESTAMPTZ DEFAULT now()
);
```

### `korisnici`

```sql
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

CREATE TABLE korisnici (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  ime         TEXT NOT NULL,
  prezime     TEXT NOT NULL,
  uloga       uloga_tip NOT NULL DEFAULT 'clan',
  aktivan     BOOLEAN DEFAULT true,
  napomena    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
```

### `clanovi`

Struktura izvedena iz lista `NOVO` u `DVD_Sarvaš_članstvo.xls` koji ima stupce:
RB | PREZIME | IME | DATUM ROĐENJA | GODINA ROĐ. | STAROST | ADRESA | TEL/MOB | VPN MOB | OIB | JMBG | IME OCA | ŠKOLSKA SPREMA | VOZAČKA DOZVOLA | VATROGASNI ČIN | E-MAIL | ČLAN OD | BR. KNJIŽICE

```sql
CREATE TYPE kategorija_clana AS ENUM (
  'dobrovoljni_vatrogasac',
  'pricuvni',
  'pocasni',
  'podmladak',
  'ispisani'
);

CREATE TYPE status_clana AS ENUM (
  'aktivan',
  'neaktivan',
  'istupio',
  'iskljucen'
);

CREATE TABLE clanovi (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Osobni podaci (GDPR — pristup ograničen RLS-om)
  ime                     TEXT NOT NULL,
  prezime                 TEXT NOT NULL,
  oib                     TEXT UNIQUE,
  jmbg                    TEXT,
  ime_oca                 TEXT,
  datum_rodenja           DATE,
  mjesto_rodenja          TEXT,
  spol                    TEXT CHECK (spol IN ('M', 'Ž')),

  -- Adresa
  adresa                  TEXT,          -- ulica i kućni broj
  mjesto                  TEXT DEFAULT 'Sarvaš',
  postanski_broj          TEXT DEFAULT '31000',

  -- Kontakt
  mobitel                 TEXT,          -- primarni (TEL/MOB)
  mobitel2                TEXT,          -- sekundarni (VPN MOB)
  email                   TEXT,

  -- Obrazovanje
  skolska_sprema          TEXT,
  vozacka_dozvola         TEXT,          -- kategorije (B, C...)

  -- Članstvo
  kategorija              kategorija_clana NOT NULL DEFAULT 'dobrovoljni_vatrogasac',
  datum_uclanivanja       DATE,
  broj_knjizice           TEXT,          -- BR. KNJIŽICE iz Excel-a
  status                  status_clana NOT NULL DEFAULT 'aktivan',
  datum_promjene_statusa  DATE,
  razlog_promjene         TEXT,

  -- Vatrogasni podaci
  vatrogasno_zvanje       TEXT,          -- iz VATROGASNI ČIN stupca
  datum_stjecanja_zvanja  DATE,

  -- GDPR
  gdpr_privola_datum      DATE,
  gdpr_privola_verzija    TEXT DEFAULT 'v1',

  -- Meta
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  updated_by              UUID REFERENCES korisnici(id)
);
```

### `clanarine`

```sql
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
```

### `osposobljavanje`

Iz lista `školovanje` — prati kada je tko položio svako zvanje:

```sql
CREATE TABLE osposobljavanje (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id           UUID NOT NULL REFERENCES clanovi(id) ON DELETE CASCADE,

  -- Vatrogasna zvanja (datum stjecanja, NULL = nije položeno)
  vatrogasac_datum                 DATE,
  vatrogasac_1klase_datum          DATE,
  vatrogasni_docasnik_datum        DATE,
  vatrogasni_docasnik_1klase_datum DATE,
  vatrogasni_casnik_datum          DATE,
  vatrogasni_casnik_1klase_datum   DATE,
  visi_vatrogasni_casnik_datum     DATE,

  -- Ostale specijalizacije (slobodni unos)
  ostalo                           JSONB DEFAULT '[]',
  -- Format: [{ naziv, datum, organizator, broj_certifikata }]

  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (clan_id)  -- jedan red po članu
);
```

### `zdravstveni_pregledi`

Iz lista `liječnički` — stupci: RB | Prezime | Ime | Datum rođenja | Od. | Do.

```sql
CREATE TABLE zdravstveni_pregledi (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         UUID NOT NULL REFERENCES clanovi(id) ON DELETE CASCADE,
  datum_pregleda  DATE NOT NULL,
  datum_isteka    DATE,          -- "Do." datum iz Excel-a
  rezultat        TEXT CHECK (rezultat IN ('sposoban', 'uvjetno_sposoban', 'nesposoban')),
  ustanova        TEXT,
  lijecnik        TEXT,
  napomena        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### `sjednice`

Iz stvarnih dokumenata DVD Sarvaš:
- Skupština: `15. sjednica skupštine`, KLASA: 810-01/2026, URBROJ: DVD-Sarvas-2026-S/001
- UO: `21. sjednica trećeg saziva Upravnog odbora`, Ur.br: 20/225
- Zapovjedništvo: vlastiti URBROJ format

```sql
CREATE TYPE vrsta_sjednice AS ENUM (
  'skupstina_redovna',
  'skupstina_izborna',
  'skupstina_izvanredna',
  'skupstina_konstitutivna',
  'upravni_odbor',
  'zapovjednistvo'
);

CREATE TYPE status_sjednice AS ENUM (
  'planirana',
  'pozivnica_poslana',
  'odrzana',
  'zapisnik_u_izradi',
  'zapisnik_potpisan',
  'arhivirana'
);

CREATE TABLE sjednice (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vrsta                 vrsta_sjednice NOT NULL,
  redni_broj            SMALLINT NOT NULL,  -- 21. sjednica, 15. skupština...
  saziv                 SMALLINT,           -- "trećeg saziva" za UO
  naziv                 TEXT NOT NULL,
  urbroj                TEXT UNIQUE,
  klasa                 TEXT,

  datum                 DATE NOT NULL,
  sat_pocetka           TIME,
  sat_zavrsetka         TIME,
  mjesto                TEXT DEFAULT 'Sarvaš',
  lokacija              TEXT,               -- detaljna adresa

  status                status_sjednice NOT NULL DEFAULT 'planirana',

  ukupno_clanova_s_pravom_glasa  SMALLINT,  -- iz verifikacijskog izvješća
  prisutno_clanova               SMALLINT,
  kvorum_postignut               BOOLEAN,

  predsjedavajuci_id    UUID REFERENCES clanovi(id),
  zapisnicar_id         UUID REFERENCES clanovi(id),

  -- Verifikacijska komisija (samo za skupštine)
  verifikacija_predsjednik_id UUID REFERENCES clanovi(id),

  napomena              TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  created_by            UUID REFERENCES korisnici(id)
);
```

### `tocke_dnevnog_reda`

```sql
CREATE TABLE tocke_dnevnog_reda (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sjednica_id       UUID NOT NULL REFERENCES sjednice(id) ON DELETE CASCADE,
  redni_broj        SMALLINT NOT NULL,
  naziv             TEXT NOT NULL,
  opis              TEXT,
  vrsta             TEXT CHECK (vrsta IN ('otvaranje', 'radna_tijela', 'verifikacija',
                                          'izvjesce', 'plan', 'odluka', 'izbori',
                                          'dodjela_priznanja', 'gosti', 'razno')),
  -- Rezultat
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
```

### `radna_tijela_sjednice`

Iz `Odluke__radna_tijela__2026_god.docx` — svaka skupština bira radna tijela:

```sql
CREATE TABLE radna_tijela_sjednice (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sjednica_id     UUID NOT NULL REFERENCES sjednice(id) ON DELETE CASCADE,
  tijelo          TEXT NOT NULL CHECK (tijelo IN (
    'radno_predsjednistvo',
    'verifikacijska_komisija',
    'zapisnicar',
    'ovjerovitelji_zapisnika'
  )),
  clan_id         UUID NOT NULL REFERENCES clanovi(id),
  uloga_u_tijelu  TEXT,  -- 'predsjednik' | 'clan' | 'zapisnicar' | 'ovjerovitelj'
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### `sjednice_prisutni`

```sql
CREATE TABLE sjednice_prisutni (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sjednica_id UUID NOT NULL REFERENCES sjednice(id) ON DELETE CASCADE,
  clan_id     UUID NOT NULL REFERENCES clanovi(id),
  prisutan    BOOLEAN DEFAULT true,
  punomos     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (sjednica_id, clan_id)
);
```

### `dokumenti`

```sql
CREATE TABLE dokumenti (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv         TEXT NOT NULL,
  opis          TEXT,
  vrsta         TEXT CHECK (vrsta IN ('pdf', 'docx', 'xlsx', 'scan', 'slika', 'ostalo')),
  urbroj        TEXT,
  klasa         TEXT,
  storage_path  TEXT NOT NULL,
  velicina_kb   INTEGER,
  modul         TEXT CHECK (modul IN (
    'skupstine', 'upravni_odbor', 'zapovjednistvo', 'clanstvo',
    'financije', 'nabava', 'imovina', 'vatrogasna', 'arhiva', 'ostalo'
  )),
  rok_cuvanja   TEXT CHECK (rok_cuvanja IN ('trajno', '10_god', '7_god', '5_god', '3_god')),
  sjednica_id   UUID REFERENCES sjednice(id),
  nabava_id     UUID,
  racun_id      UUID,
  clan_id       UUID REFERENCES clanovi(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  uploaded_by   UUID REFERENCES korisnici(id)
);
```

### `financijski_planovi` i `financijski_plan_stavke`

Struktura preuzeta iz `Financijski_plan_2025.xlsm` — koristi Računski plan za NP organizacije:

```sql
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

CREATE TABLE financijski_plan_stavke (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id             UUID NOT NULL REFERENCES financijski_planovi(id) ON DELETE CASCADE,
  kategorija          TEXT NOT NULL CHECK (kategorija IN ('prihod', 'rashod', 'imovina')),

  -- Računski plan za NP organizacije (prema FINA obrascu Neprof606)
  skupina             TEXT,   -- '3', '4', '01'
  pod_skupina         TEXT,   -- '33', '42', '022'
  odjeljak            TEXT,   -- '3311', '4263', '0231'
  aop                 TEXT,   -- AOP oznaka za FINA izvješće

  naziv_stavke        TEXT NOT NULL,
  iznos_plan          DECIMAL(12,2) NOT NULL DEFAULT 0,
  iznos_ostvareno     DECIMAL(12,2) NOT NULL DEFAULT 0,
  napomena            TEXT,
  redni_broj          SMALLINT
);
```

Stvarne stavke iz `Financijski_plan_2025.xlsm` (sve AOP oznake):

**PRIHODI:**
- 3311 — Prihodi po posebnim propisima iz proračuna (Grad/Županija)
- 33110 — Prihodi po posebnim propisima iz ostalih izvora (VZ Osijek)
- 33111 — Prihodi po posebnim propisima iz ostalih izvora
- 3413 — Kamate na oročena sredstva
- 3512 — Prihodi od donacija iz proračuna JLS
- 3531 — Prihodi od trgovačkih društava i ostalih pravnih osoba
- 3541 — Donacije fizičkih osoba
- 3611 — Prihodi od naknade štete

**RASHODI:**
- 4222 — Službena putovanja (dnevnice)
- 4223 — Naknade za rad (sjednice, terenski)
- 4231 — Usluge telefona i pošte
- 4232 — Računalne usluge
- 4233 — Poštarine i dostava
- 4234 — Komunalne usluge
- 4236 — Usluge tekućeg i investicijskog održavanja
- 4238 — Ostale usluge
- 4261 — Uredski materijal i tiskanice
- 4262 — Materijal i sirovine
- 4263 — Energija (gorivo, nafta, el. energija, plin)
- 4264 — Sitan inventar i autogume
- 4291 — Premije osiguranja
- 4292 — Reprezentacija (ugostiteljske, skupštinska, natjecanja)
- 4294 — Kotizacije i pristojbe
- 4300 — Amortizacija
- 4431 — Usluge platnog prometa
- 4434 — Ostali financijski rashodi

**IMOVINA:**
- 0511 — Zemljište, građevinski objekti u pripremi
- 0221 — Uredska oprema i namještaj, računala
- 0222 — Komunikacijska oprema (mobiteli)
- 0223 — Oprema za protupožarnu zaštitu
- 0231 — Prijevozna sredstva (vatrogasna vozila)

### `racuni`

```sql
CREATE TABLE racuni (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vrsta             TEXT NOT NULL CHECK (vrsta IN ('ulazni', 'izlazni')),
  broj_racuna       TEXT,
  interni_broj      TEXT UNIQUE,     -- URBROJ u knjizi ulaznih/izlaznih računa

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
  nabava_id         UUID,
  dokument_id       UUID REFERENCES dokumenti(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  odobrio_id        UUID REFERENCES korisnici(id),
  datum_odobravanja TIMESTAMPTZ
);
```

### `nabave`

```sql
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
```

### `imovina`

```sql
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

  lokacija              TEXT,
  status                TEXT DEFAULT 'u_uporabi'
                        CHECK (status IN ('u_uporabi', 'servis', 'neispravno', 'otpisano')),
  datum_otpisa          DATE,

  -- Rokovi vozila
  registracija_do       DATE,
  tehnicki_do           DATE,
  osiguranje_do         DATE,
  osiguranje_polica     TEXT,

  nabava_id             UUID REFERENCES nabave(id),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
```

### `intervencije`

```sql
CREATE TABLE intervencije (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hvz_broj              TEXT,         -- broj u HVZ IS sustavu
  interni_broj          TEXT UNIQUE,  -- interni URBROJ

  datum_dojave          DATE NOT NULL,
  sat_dojave            TIME,
  nacin_dojave          TEXT CHECK (nacin_dojave IN ('193', 'mobilni', 'osobno', 'radio', 'ostalo')),

  opcina                TEXT,
  adresa                TEXT,
  lat                   DECIMAL(10,7),
  lng                   DECIMAL(10,7),

  vrsta                 TEXT NOT NULL CHECK (vrsta IN (
    'pozar_otvoreni', 'pozar_zatvoreni', 'prometna',
    'tehnicka_pomoc', 'ekoloska', 'traganje_spasavanje', 'ostalo'
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

CREATE TABLE intervencije_sudionici (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervencija_id UUID NOT NULL REFERENCES intervencije(id) ON DELETE CASCADE,
  clan_id         UUID NOT NULL REFERENCES clanovi(id),
  uloga           TEXT,
  UNIQUE (intervencija_id, clan_id)
);
```

### `zakonska_izvjesca`

```sql
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
```

### `aktivnosti_plan_rada`

```sql
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
```

### `vjezbe` i `vjezbe_sudionici`

```sql
CREATE TABLE vjezbe (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv           TEXT NOT NULL,
  vrsta           TEXT CHECK (vrsta IN ('terenska', 'teorijska', 'kombinirano', 'pokazna')),
  datum           DATE NOT NULL,
  lokacija        TEXT,
  trajanje_min    SMALLINT,
  opis            TEXT,
  napomene        TEXT,
  voditelj_id     UUID REFERENCES clanovi(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vjezbe_sudionici (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vjezba_id   UUID NOT NULL REFERENCES vjezbe(id) ON DELETE CASCADE,
  clan_id     UUID NOT NULL REFERENCES clanovi(id),
  prisutan    BOOLEAN DEFAULT true,
  napomena    TEXT,
  UNIQUE (vjezba_id, clan_id)
);
```

### `putni_nalozi`

Iz `putni_nalog_Savo_Paripović_04.03.17.ods` — DVD ima putne naloge za službena putovanja:

```sql
CREATE TABLE putni_nalozi (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broj_naloga     TEXT UNIQUE NOT NULL,
  clan_id         UUID NOT NULL REFERENCES clanovi(id),

  datum_polaska   DATE NOT NULL,
  datum_povratka  DATE,
  svrha_putovanja TEXT NOT NULL,
  odrediste       TEXT NOT NULL,

  prijevoz        TEXT CHECK (prijevoz IN ('osobno_vozilo', 'vozilo_dvd', 'javni_prijevoz', 'ostalo')),
  km_polaziste    INTEGER,
  km_odrediste    INTEGER,
  ukupno_km       INTEGER,

  iznos_dnevnice  DECIMAL(8,2),
  iznos_prijevoza DECIMAL(8,2),
  iznos_ukupno    DECIMAL(8,2),

  status          TEXT DEFAULT 'kreiran'
                  CHECK (status IN ('kreiran', 'odobren', 'obracunat', 'placen')),

  odobrio_id      UUID REFERENCES korisnici(id),
  napomena        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### `revizijski_trag`

```sql
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
```

### `email_logovi`

```sql
CREATE TABLE email_logovi (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip         TEXT NOT NULL,
  primatelj   TEXT NOT NULL,
  predmet     TEXT NOT NULL,
  status      TEXT CHECK (status IN ('poslan', 'greska', 'bounce')),
  greska      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## Triggeri

```sql
-- Automatski updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Revizijski trag za osjetljive tablice
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
```

---

## Indeksi

```sql
CREATE INDEX idx_clanovi_status         ON clanovi(status);
CREATE INDEX idx_clanovi_kategorija     ON clanovi(kategorija);
CREATE INDEX idx_clanovi_oib            ON clanovi(oib) WHERE oib IS NOT NULL;
CREATE INDEX idx_sjednice_vrsta_datum   ON sjednice(vrsta, datum DESC);
CREATE INDEX idx_sjednice_status        ON sjednice(status);
CREATE INDEX idx_racuni_datum           ON racuni(datum_racuna DESC);
CREATE INDEX idx_nabave_status          ON nabave(status);
CREATE INDEX idx_imovina_reg_ozn        ON imovina(registracija_do) WHERE vrsta = 'vozilo';
CREATE INDEX idx_intervencije_datum     ON intervencije(datum_dojave DESC);
CREATE INDEX idx_izvjesca_rok           ON zakonska_izvjesca(rok) WHERE status != 'predano';
CREATE INDEX idx_zdravlje_isteka        ON zdravstveni_pregledi(datum_isteka);
CREATE INDEX idx_audit_tablica          ON revizijski_trag(tablica, zapis_id);
```

---

## Napomene o migraciji stvarnih podataka

Prilikom uvoza podataka iz `DVD_Sarvaš_članstvo.xls`:

1. **List `NOVO`** → tablica `clanovi` (aktivni redovni)
2. **List `pomladak`** → tablica `clanovi` s `kategorija = 'podmladak'`
3. **List `ispisani`** → tablica `clanovi` s `status = 'istupio'`
4. **List `liječnički`** → tablica `zdravstveni_pregledi`
5. **List `školovanje`** → tablica `osposobljavanje`
6. **List `tijela`** → tablica `korisnici` (samo dužnosnici koji trebaju pristup)
7. **`Popis_operativnih_članova.xlsx`** → ažuriranje polja `vatrogasno_zvanje`

Predloženo: napisati `scripts/import-sarvas-data.ts` koji čita Excel i puni bazu.
