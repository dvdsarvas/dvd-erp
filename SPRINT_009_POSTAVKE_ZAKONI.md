# DVD ERP — Sprint 009: Postavke DVD-a + Zakonske obveze

> Pročitaj u cijelosti prije nego počneš. Radi redom, commitaj po koracima.
> **Načelo:** Gdje god je moguće, automatizirati — korisnik samo potvrđuje.

---

## Što rješavamo

1. **PostavkePage / Tab "Podaci DVD-a"** — trenutno je read-only s hardkodiranim podacima.
   Nema tablice u bazi. Treba kompletna implementacija.
2. **Automatska sinkronizacija funkcionera** — predsjednik/zapovjednik/tajnik/blagajnik
   trebaju se automatski ažurirati kad se promijeni sastav tijela.
3. **Novi tab "Zakonske obveze"** — wiki s objašnjenjima zakona, editabilan,
   dostupan svim korisnicima ali piše samo admin/predsjednik.
4. **dvd.store.ts** — trenutno vraća hardkodirane podatke, nikad ne poziva Supabase.

---

## KORAK 1 — Migracija 009: Tablica `dvd_organizacija`

Kreiraj fajl `supabase/migrations/009_dvd_organizacija.sql`:

```sql
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
-- NEMA potrebe za ručnim unošenjem — uvijek aktualno.
-- Promjena u tijelima → odmah reflektira se ovdje i na svim
-- generiranim dokumentima.
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
-- Čitaju svi autenticirani.
-- Piše samo admin ili predsjednik.
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
```

**Pokreni i provjeri:**
```bash
supabase db push
# Provjeri da view radi:
# SELECT * FROM trenutni_funkcioneri;
```

---

## KORAK 2 — Migracija 010: Tablica `zakonski_sadrzaj`

Kreiraj fajl `supabase/migrations/010_zakonski_sadrzaj.sql`:

```sql
-- ============================================================
-- MIGRACIJA 010: Zakonske obveze — wiki sadržaj
-- Editable knowledge base za predsjednike/tajnike.
-- ============================================================

CREATE TABLE zakonski_sadrzaj (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kategorija  TEXT NOT NULL CHECK (kategorija IN (
                'financije', 'clanstvo', 'sjednice',
                'osnivac', 'vatrogastvo', 'imovina', 'nabava'
              )),
  naslov      TEXT NOT NULL,
  sadrzaj     TEXT NOT NULL,      -- Markdown
  rok_opis    TEXT DEFAULT '',    -- npr. "do 31. prosinca tekuće godine"
  izvor_zakon TEXT DEFAULT '',    -- npr. "Zakon o fin. poslovanju čl. 14"
  vaznost     TEXT NOT NULL DEFAULT 'normalno'
              CHECK (vaznost IN ('hitno', 'vazno', 'normalno', 'info')),
  redni_broj  INT DEFAULT 0,
  aktivan     BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  updated_by  UUID REFERENCES korisnici(id)
);

CREATE INDEX idx_zakonski_sadrzaj_kategorija ON zakonski_sadrzaj(kategorija)
  WHERE aktivan = true;

-- Auto-update
CREATE TRIGGER zakonski_sadrzaj_updated_at
  BEFORE UPDATE ON zakonski_sadrzaj
  FOR EACH ROW EXECUTE FUNCTION update_dvd_org_updated_at();

-- ============================================================
-- RLS: zakonski_sadrzaj
-- ============================================================

ALTER TABLE zakonski_sadrzaj ENABLE ROW LEVEL SECURITY;

-- Čitaju svi autenticirani (ovo je javni wiki za sve korisnike sustava)
CREATE POLICY "zakoni_select" ON zakonski_sadrzaj
  FOR SELECT TO authenticated USING (aktivan = true);

-- Piše samo admin/predsjednik/zamjenik
CREATE POLICY "zakoni_write" ON zakonski_sadrzaj
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM korisnici
      WHERE korisnici.id = auth.uid()
        AND korisnici.uloga IN ('admin', 'predsjednik', 'zamjenik')
        AND korisnici.aktivan = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM korisnici
      WHERE korisnici.id = auth.uid()
        AND korisnici.uloga IN ('admin', 'predsjednik', 'zamjenik')
        AND korisnici.aktivan = true
    )
  );

-- ============================================================
-- SEED: Zakonske obveze za DVD-ove u Hrvatskoj
-- Sadržaj napisan bez pravnog žargona, za volontere.
-- ============================================================

INSERT INTO zakonski_sadrzaj
  (kategorija, naslov, sadrzaj, rok_opis, izvor_zakon, vaznost, redni_broj)
VALUES

-- ── FINANCIJE ────────────────────────────────────────────────
(
  'financije',
  'Financijski plan — donošenje',
  '## Što je financijski plan?

Financijski plan je dokument kojim skupština određuje koliko novca planirate primiti i potrošiti u idućoj godini. Bez usvojenog financijskog plana ne smijete trošiti sredstva u novoj godini.

## Kako se donosi?

1. Blagajnik ili predsjednik priprema prijedlog na temelju prošlogodišnjeg izvršenja
2. Predsjednik predlaže skupštini na glasanje
3. Skupština usvaja — bilježi se u zapisnik
4. Financijski plan stupa na snagu 1. siječnja iduće godine

## Što se može promijeniti?

Izmjene i dopune plana moguće su tijekom godine — isti postupak kao i donošenje (sjednica UO ili skupštine, ovisno o statutu i iznosu izmjene).

## Što ako ne usvojite plan na vrijeme?

Prekršajna odgovornost predsjednika kao zakonskog zastupnika.',
  'do 31. prosinca tekuće godine za iduću godinu',
  'Zakon o fin. poslovanju neprofitnih org. čl. 14, Pravilnik o financijskim planovima',
  'hitno',
  10
),

(
  'financije',
  'Godišnji financijski izvještaj — FINA',
  '## Što se predaje?

Organizacije koje vode **jednostavno knjigovodstvo** predaju obrazac **G-PR-IZ-NPF** (Godišnji financijski izvještaj o primicima i izdacima).

Organizacije koje vode **dvojno knjigovodstvo** predaju obrasce **BIL-NPF** (bilanca) i **PR-RAS-NPF** (prihodi i rashodi).

## Kako se predaje?

- Elektronički putem FINA web aplikacije RGFI (potreban FINA kriptouređaj — USB stick)
- Ili osobno u bilo kojoj FINA poslovnici
- Predsjednik potpisuje — on je odgovoran za istinitost

## Što ako ne predate?

Novčana kazna za organizaciju i za predsjednika osobno. FINA može blokirati žiro-račun.',
  'do 1. ožujka za prethodnu godinu',
  'Zakon o fin. poslovanju neprofitnih org. čl. 28, Pravilnik o izvještavanju',
  'hitno',
  20
),

(
  'financije',
  'Polugodišnji financijski izvještaj — FINA',
  '## Tko mora predati?

Samo organizacije koje vode **dvojno knjigovodstvo** (prihodi ili imovina > 30.526,24 EUR godišnje 3 uzastopne godine).

Organizacije na jednostavnom knjigovodstvu **ne predaju** polugodišnji izvještaj.

## Što se predaje?

Obrazac **PR-RAS-NPF** za razdoblje 1. siječnja do 30. lipnja tekuće godine.

## Napomena

Ako ste prešli prag i prešli na dvojno, ovu obvezu imate od iduće poslovne godine.',
  'do 30. srpnja za razdoblje 1.1.–30.6.',
  'Zakon o fin. poslovanju neprofitnih org. čl. 28',
  'vazno',
  30
),

(
  'financije',
  'Obavezne poslovne knjige',
  '## Što morate voditi?

Svaki DVD mora imati ove knjige, bez obzira na veličinu:

| Knjiga | Što bilježimo | Rok čuvanja |
|---|---|---|
| **Knjiga primitaka i izdataka** | Svi primljeni i plaćeni iznosi kronološki | 11 godina |
| **Knjiga blagajne** | Gotovinska plaćanja i primici | 7 godina |
| **Knjiga ulaznih računa** | Svi primljeni računi od dobavljača | 7 godina |
| **Knjiga izlaznih računa** | Svi računi koje ste vi izdali | 7 godina |
| **Popis dugotrajne imovine** | Oprema, vozila, nekretnine > 3.981 EUR | 7 godina |

## Napomena

Knjige se mogu voditi elektronički, ali moraju biti zaključene na kraju godine i zaštićene od naknadnih izmjena.',
  'Kontinuirano — zaključiti na kraju svake godine',
  'Zakon o fin. poslovanju neprofitnih org. čl. 17-22',
  'vazno',
  40
),

(
  'financije',
  'Blagajnički maksimum',
  '## Što je blagajnički maksimum?

Maksimalni iznos gotovine koji DVD može zadržati "preko noći". Sve iznad toga morate položiti na žiro-račun.

## Kako se određuje?

Predsjednik ili UO donosi **Odluku o blagajničkom maksimumu**. Iznos određujete sami, sukladno stvarnim potrebama. Tipično: 100–500 EUR.

## Što ako nemate gotovinu?

Ako plaćate isključivo s računa (bezgotovinsko), **ne morate voditi knjigu blagajne**.',
  'Odluka se donosi jednom — vrijedi dok se ne promijeni',
  'Zakon o fin. poslovanju neprofitnih org. čl. 23',
  'normalno',
  50
),

-- ── SJEDNICE I SKUPŠTINE ──────────────────────────────────
(
  'sjednice',
  'Godišnja skupština — obveza i rokovi',
  '## Kad se mora održati?

**Izvještajna skupština** (jednom godišnje) mora se održati do **30. lipnja** tekuće godine za prethodnu godinu. Na njoj se donose:

- Izvješće o radu za prošlu godinu
- Financijsko izvješće za prošlu godinu

**Planska skupština** (može biti odvojena ili zajedno s izvještajnom):
- Plan rada za iduću godinu
- Financijski plan za iduću godinu
→ Mora se održati do **31. prosinca** tekuće godine

## Tko saziva?

Predsjednik saziva skupštinu. Poziv se šalje **najmanje 8 dana unaprijed** (provjeri statut — može biti i dulje).

## Zapisnik

Skupštinski zapisnik mora se dostaviti **Uredu državne uprave OBŽ** u roku **14 dana** od održavanja.',
  'Jednom godišnje — do 30. lipnja (izvještajna) i 31. prosinca (planska)',
  'Zakon o udrugama čl. 18, Zakon o vatrogastvu, Statut DVD-a',
  'hitno',
  10
),

(
  'sjednice',
  'Dostava zapisnika skupštine — Ured državne uprave OBŽ',
  '## Zašto?

DVD je udruga pod Zakonom o udrugama. Svaka skupštinska odluka (promjena statuta, izbor tijela, plan, izvješće) mora biti dostavljena nadležnom Uredu državne uprave.

## Kako?

Šalje se ovjerena kopija zapisnika (ili original s potpisom predsjednika i zapisničara) poštom ili osobno.

## Što ako ne dostavite?

DVD može biti brisan iz registra, što znači gubitak pravne osobnosti i nemogućnost primanja javnih sredstava.',
  'U roku 14 dana od održavanja skupštine',
  'Zakon o udrugama čl. 30, 31',
  'hitno',
  20
),

(
  'sjednice',
  'Sjednice Upravnog odbora',
  '## Koliko često?

UO se mora sastati **najmanje 4 puta godišnje** prema Statutu DVD Sarvaš (čl. 42). U praksi — svaki kvartal je minimum.

## Kvorum

Za donošenje odluka potrebna je **nadpolovična većina** prisutnih. Provjeriti statut za točan broj.

## Odluke koje mora donijeti UO

- Usvajanje proračuna/plana ako skupština prenosi ovlast
- Prihvat novih članova
- Isključenje članova
- Nabavke iznad iznosa koji predsjednik može sam odlučiti
- Izmjene financijskog plana',
  'Najmanje 4x godišnje',
  'Statut DVD-a čl. 42, Zakon o udrugama',
  'vazno',
  30
),

-- ── ČLANSTVO ─────────────────────────────────────────────
(
  'clanstvo',
  'Zdravstveni pregled vatrogasaca',
  '## Tko mora imati pregled?

Svaki **operativni vatrogasac** (dobrovoljni vatrogasac koji sudjeluje u intervencijama) mora imati valjani zdravstveni pregled.

## Koliko često?

- Do 30 godina starosti: **svake 2 godine**
- 30–50 godina: **svake godine**
- Iznad 50 godina: **svake godine**

## Što ako vatrogasac nema valjan pregled?

**Ne smije sudjelovati u intervencijama.** Zapovjednik je odgovoran za ovu provjeru.

## Tko plaća?

Troškovi pregleda padaju na teret DVD-a — unijeti u financijski plan pod "Zdravstveni pregledi".',
  'Ovisno o dobi — godišnje ili svake 2 godine',
  'Zakon o vatrogastvu čl. 35, Pravilnik o uvjetima za vatrogasce',
  'hitno',
  10
),

(
  'clanstvo',
  'Evidencija članova — obveza',
  '## Što mora sadržavati?

Svaki DVD mora voditi ažurnu evidenciju članova s:
- Osobnim podacima (ime, prezime, OIB, adresa, kontakt)
- Kategorijom članstva
- Datumom učlanjivanja
- Statusom (aktivan/neaktivan/istupio)

## GDPR napomena

Podaci se smiju prikupljati samo uz **pisanu privolu člana**. Svaki novi član potpisuje pristupnicu s GDPR klauzulom.

## Rok čuvanja

Podaci aktivnih članova čuvaju se trajno. Podaci bivših članova — preporučeno 7 godina nakon prestanka članstva.',
  'Kontinuirano — ažurirati odmah pri promjeni',
  'Zakon o udrugama, GDPR Uredba EU 2016/679',
  'vazno',
  20
),

-- ── OSNIVAČ ──────────────────────────────────────────────
(
  'osnivac',
  'Obveze prema osnivačima i donatorima',
  '## Tko su osnivači?

DVD osniva lokalna zajednica (općina/grad). Osim osnivača, tipični donatori su:
- JLS (Općina/Grad) — redovna godišnja dotacija
- Vatrogasna zajednica JLS
- Župan./regionalna vatrogasna zajednica

## Što se traži?

Osnivači/donatori koji daju javna sredstva imaju pravo (i obvezu) pratiti namjensko trošenje. Obično traže:
- Godišnje izvješće o radu
- Financijsko izvješće
- Kopiju skupštinskog zapisnika

## Ugovor o financiranju

Svaka dotacija JLS-a mora biti potkrijepljena **ugovorom o financiranju**. Provjeriti što ugovor traži — neke općine traže kvartalna izvješća!',
  'Prema ugovoru s JLS — obično godišnje',
  'Zakon o udrugama čl. 32, lokalni pravilnici o udrugama',
  'vazno',
  10
),

(
  'osnivac',
  'Registar neprofitnih organizacija (RNO)',
  '## Što je RNO?

Središnji registar svih neprofitnih organizacija u Hrvatskoj. Vodi ga Ministarstvo financija.

## Obveze:

1. **Upis** — obveza u roku 60 dana od osnivanja
2. **Promjena podataka** — u roku 7 radnih dana od promjene u matičnom registru
3. **Godišnji financijski izvještaji** — javno se objavljuju putem RNO

## Kako provjeriti podatke?

Pretražite na: mfin.gov.hr → Registar neprofitnih organizacija

## Što ako su podaci netočni?

Ažurirajte odmah — netočni podaci u RNO mogu uzrokovati probleme pri prijavi za javne natječaje.',
  'Ažurirati u roku 7 radnih dana od svake promjene',
  'Zakon o fin. poslovanju neprofitnih org. čl. 34-36',
  'vazno',
  20
),

-- ── VATROGASTVO ──────────────────────────────────────────
(
  'vatrogastvo',
  'Osposobljavanje vatrogasaca',
  '## Što se traži?

Svaki operativni vatrogasac mora imati odgovarajući **certifikat osposobljenosti** za razinu intervencije u kojoj sudjeluje.

## Tko provodi osposobljavanje?

Isključivo **HVZ (Hrvatska vatrogasna zajednica)** i njihovi ovlašteni centri. Nema zamjene za internu obuku.

## Rokovi

Certifikati imaju rok valjanosti — pratiti ih u evidenciji. Vatrogasac s isteklim certifikatom ne smije sudjelovati u intervencijama na toj razini.

## Financiranje

Troškove obuke podmiruje DVD, HVZ ili JLS — ovisno o vrsti osposobljavanja. Predvidjeti u financijskom planu.',
  'Prema rokovima isteka certifikata — pratiti individualno',
  'Zakon o vatrogastvu čl. 36-40',
  'vazno',
  10
),

-- ── NABAVA ───────────────────────────────────────────────
(
  'nabava',
  'Pravila jednostavne nabave',
  '## Pragovi (2024.)

| Iznos nabave | Postupak |
|---|---|
| do 2.654 EUR | Predsjednik odlučuje samostalno |
| 2.655 – 13.270 EUR | Potrebno najmanje 1 pisana ponuda |
| 13.271 – 26.540 EUR | Poziv za ponude — min. 3 ponuditelja, rok min. 5 radnih dana |
| iznad 26.540 EUR | Zakon o javnoj nabavi — složen postupak |

## Što se mora dokumentirati?

- Zahtjev za nabavom
- Ponude (čuvati sve, ne samo odabranu)
- Odluka o odabiru ponuđača (pisana, za iznose iznad 2.654 EUR)
- Narudžbenica ili ugovor

## Tko odlučuje?

Ovisno o iznosu i statutu — predsjednik sam ili UO. Provjerite pravilnik o nabavi DVD-a.',
  'Svaka nabava mora slijediti ova pravila',
  'Zakon o javnoj nabavi, interni Pravilnik o nabavi DVD-a',
  'vazno',
  10
);
```

---

## KORAK 3 — Query fajlovi

### `src/lib/supabase/queries/organizacija.ts`

```ts
import { supabase } from '../client'

// Tip — ručno jer nova tablica nije u database.types.ts dok se ne regen
export interface DVDOrganizacija {
  id: string
  naziv: string
  naziv_kratki: string
  oib: string
  maticni_broj: string
  rbr_rno: string
  adresa: string
  mjesto: string
  postanski_broj: string
  email: string
  web: string
  telefon: string
  iban: string
  banka: string
  knjig_prag: 'jednostavno' | 'dvojno'
  vatrogasna_zajednica: string
  zupanijska_zajednica: string
  hvz_region: string
  logo_url: string
  boja_akcentna: string
  datum_osnivanja: string | null
  updated_at: string
}

export interface TrenutniFlunkcioneri {
  organizacija_id: string
  naziv_kratki: string
  predsjednik: string | null
  zamjenik_predsjednika: string | null
  zapovjednik: string | null
  zamjenik_zapovjednika: string | null
  tajnik: string | null
  blagajnik: string | null
  predsjednik_mobitel: string | null
  predsjednik_email: string | null
  zapovjednik_mobitel: string | null
  tajnik_email: string | null
}

export async function dohvatiOrganizaciju(): Promise<DVDOrganizacija | null> {
  const { data, error } = await supabase
    .from('dvd_organizacija')
    .select('*')
    .single()
  if (error) {
    // Tablica postoji ali nema zapisa — onboarding nije završen
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as DVDOrganizacija
}

export async function azurirajOrganizaciju(
  id: string,
  podaci: Partial<Omit<DVDOrganizacija, 'id' | 'created_at' | 'updated_at'>>
): Promise<DVDOrganizacija> {
  const { data, error } = await supabase
    .from('dvd_organizacija')
    .update(podaci)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as DVDOrganizacija
}

export async function dohvatiFunkcionere(): Promise<TrenutniFlunkcioneri | null> {
  const { data, error } = await supabase
    .from('trenutni_funkcioneri')
    .select('*')
    .single()
  if (error) return null
  return data as TrenutniFlunkcioneri
}
```

### `src/lib/supabase/queries/zakonski-sadrzaj.ts`

```ts
import { supabase } from '../client'

export interface ZakonskiSadrzaj {
  id: string
  kategorija: 'financije' | 'clanstvo' | 'sjednice' | 'osnivac' | 'vatrogastvo' | 'imovina' | 'nabava'
  naslov: string
  sadrzaj: string
  rok_opis: string
  izvor_zakon: string
  vaznost: 'hitno' | 'vazno' | 'normalno' | 'info'
  redni_broj: number
  aktivan: boolean
  updated_at: string
  updated_by: string | null
}

export const KATEGORIJE_ZAKON = [
  { value: 'financije',    label: 'Financije i računovodstvo' },
  { value: 'sjednice',     label: 'Sjednice i skupštine' },
  { value: 'clanstvo',     label: 'Članstvo' },
  { value: 'osnivac',      label: 'Osnivač i registri' },
  { value: 'vatrogastvo',  label: 'Vatrogasna djelatnost' },
  { value: 'imovina',      label: 'Imovina i vozila' },
  { value: 'nabava',       label: 'Nabava' },
] as const

export async function dohvatiZakonskiSadrzaj(
  kategorija?: string
): Promise<ZakonskiSadrzaj[]> {
  let query = supabase
    .from('zakonski_sadrzaj')
    .select('*')
    .eq('aktivan', true)
    .order('redni_broj')
  if (kategorija) {
    query = query.eq('kategorija', kategorija)
  }
  const { data, error } = await query
  if (error) throw error
  return data as ZakonskiSadrzaj[]
}

export async function azurirajZakonskiSadrzaj(
  id: string,
  podaci: Partial<Pick<ZakonskiSadrzaj, 'naslov' | 'sadrzaj' | 'rok_opis' | 'izvor_zakon' | 'vaznost' | 'redni_broj' | 'aktivan'>>,
  updatedBy: string
): Promise<ZakonskiSadrzaj> {
  const { data, error } = await supabase
    .from('zakonski_sadrzaj')
    .update({ ...podaci, updated_by: updatedBy })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as ZakonskiSadrzaj
}

export async function kreirajZakonskiSadrzaj(
  podaci: Omit<ZakonskiSadrzaj, 'id' | 'aktivan' | 'updated_at' | 'updated_by'>,
  updatedBy: string
): Promise<ZakonskiSadrzaj> {
  const { data, error } = await supabase
    .from('zakonski_sadrzaj')
    .insert({ ...podaci, aktivan: true, updated_by: updatedBy })
    .select()
    .single()
  if (error) throw error
  return data as ZakonskiSadrzaj
}

export async function obrisiZakonskiSadrzaj(id: string): Promise<void> {
  // Soft delete — nikad ne brišemo, samo deaktiviramo
  const { error } = await supabase
    .from('zakonski_sadrzaj')
    .update({ aktivan: false })
    .eq('id', id)
  if (error) throw error
}
```

---

## KORAK 4 — Ažuriranje `dvd.store.ts`

Zamijeni **cijeli** `src/store/dvd.store.ts` ovim:

```ts
import { create } from 'zustand'
import { dohvatiOrganizaciju, dohvatiFunkcionere } from '@/lib/supabase/queries/organizacija'
import type { DVDOrganizacija, TrenutniFlunkcioneri } from '@/lib/supabase/queries/organizacija'

interface DVDStore {
  organizacija: DVDOrganizacija | null
  funkcioneri: TrenutniFlunkcioneri | null
  loaded: boolean
  loading: boolean
  init: () => Promise<void>
  refresh: () => Promise<void>
}

export const useDVDStore = create<DVDStore>((set, get) => ({
  organizacija: null,
  funkcioneri: null,
  loaded: false,
  loading: false,

  init: async () => {
    if (get().loaded) return
    set({ loading: true })
    try {
      const [org, funk] = await Promise.all([
        dohvatiOrganizaciju(),
        dohvatiFunkcionere(),
      ])
      set({ organizacija: org, funkcioneri: funk, loaded: true })
    } catch (err) {
      console.error('DVD store init greška:', err)
    } finally {
      set({ loading: false })
    }
  },

  refresh: async () => {
    set({ loading: true })
    try {
      const [org, funk] = await Promise.all([
        dohvatiOrganizaciju(),
        dohvatiFunkcionere(),
      ])
      set({ organizacija: org, funkcioneri: funk })
    } catch (err) {
      console.error('DVD store refresh greška:', err)
    } finally {
      set({ loading: false })
    }
  },
}))

// Backwards compatibility — helper getteri koji ne bace error ako store nije učitan
export function getDVDNaziv(store: DVDStore): string {
  return store.organizacija?.naziv_kratki ?? 'DVD ERP'
}
```

### Ažuriranje `main.tsx` — pozovi init() nakon auth

U `src/main.tsx` dodaj inicijalizaciju DVD stora **nakon** auth:

```ts
import { useDVDStore } from '@/store/dvd.store'

initAuth()
  .catch(err => console.error('Auth init greška:', err))
  .finally(() => {
    // Init DVD store kad je korisnik prijavljen
    // (auth.store triggeraj refresh kada se setKorisnik pozove)
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  })
```

U `src/lib/supabase/auth.ts` — u `loadKorisnik()` funkciji, na kraju (iza `setKorisnik`):

```ts
// Na kraju loadKorisnik():
setKorisnik(data as Korisnik)
// Automatski učitaj podatke organizacije
useDVDStore.getState().init()
```

---

## KORAK 5 — PostavkePage: Tab "Podaci DVD-a" — editable

Zamijeni `TabDVDPodaci` komponentu u `PostavkePage.tsx`.
Dodaj potrebne importe na vrhu fajla:

```ts
import { dohvatiOrganizaciju, azurirajOrganizaciju, dohvatiFunkcionere } from '@/lib/supabase/queries/organizacija'
import type { DVDOrganizacija, TrenutniFlunkcioneri } from '@/lib/supabase/queries/organizacija'
import { useDVDStore } from '@/store/dvd.store'
```

Nova komponenta `TabDVDPodaci`:

```tsx
function TabDVDPodaci() {
  const { refresh: refreshStore } = useDVDStore()
  const [org, setOrg] = useState<DVDOrganizacija | null>(null)
  const [funk, setFunk] = useState<TrenutniFlunkcioneri | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [forma, setForma] = useState<Partial<DVDOrganizacija>>({})
  const [oibPotvrda, setOibPotvrda] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => { ucitaj() }, [])

  async function ucitaj() {
    setLoading(true)
    try {
      const [o, f] = await Promise.all([dohvatiOrganizaciju(), dohvatiFunkcionere()])
      setOrg(o)
      setFunk(f)
      if (o) setForma(o)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleSpremi() {
    if (!org) return
    setError(null)

    // Provjera OIB potvrde samo ako se OIB mijenja
    if (forma.oib !== org.oib && forma.oib !== oibPotvrda) {
      setError('OIB potvrda se ne poklapa. Unesite OIB ponovo za potvrdu promjene.')
      return
    }

    setSaving(true)
    try {
      const azurirano = await azurirajOrganizaciju(org.id, forma)
      setOrg(azurirano)
      setForma(azurirano)
      setEditMode(false)
      setOibPotvrda('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      await refreshStore()  // ← automatski ažurira sve komponente koje koriste store
    } catch (err: unknown) {
      setError(`Greška: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  function handleOdustani() {
    if (org) setForma(org)
    setEditMode(false)
    setError(null)
    setOibPotvrda('')
  }

  if (loading) return <div className="p-8 text-center text-[#999]">Učitavanje...</div>

  return (
    <div className="space-y-6">

      {/* Success banner */}
      {success && (
        <div className="bg-green-900/20 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg">
          ✓ Podaci uspješno spremljeni
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* === SEKCIJA A: Statični podaci === */}
      <div className="bg-[#242428] border border-[#333338] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Identifikacijski podaci</h3>
            <p className="text-xs text-[#777] mt-0.5">
              OIB, matični broj, IBAN — mijenjaju se rijetko. Promjena OIB-a zahtijeva potvrdu.
            </p>
          </div>
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="px-3 py-1.5 text-xs bg-[#2a2a2e] text-[#bbb] rounded-lg hover:bg-[#333338] hover:text-white"
            >
              Uredi podatke
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormaPolje
            label="Puni naziv organizacije"
            value={forma.naziv ?? ''}
            editMode={editMode}
            onChange={v => setForma(f => ({ ...f, naziv: v }))}
          />
          <FormaPolje
            label="Kratki naziv"
            value={forma.naziv_kratki ?? ''}
            editMode={editMode}
            onChange={v => setForma(f => ({ ...f, naziv_kratki: v }))}
          />
          <FormaPolje
            label="OIB"
            value={forma.oib ?? ''}
            editMode={editMode}
            onChange={v => setForma(f => ({ ...f, oib: v }))}
            type="text"
            maxLength={11}
          />
          {editMode && forma.oib !== org?.oib && (
            <div>
              <label className="block text-xs text-[#f59e0b] mb-1">
                ⚠ Potvrdi novi OIB (upiši ponovo)
              </label>
              <input
                type="text"
                value={oibPotvrda}
                onChange={e => setOibPotvrda(e.target.value)}
                maxLength={11}
                className="w-full px-3 py-2 border border-yellow-600/50 rounded-lg text-sm bg-[#1a1a1e] text-yellow-400"
                placeholder="Upiši OIB ponovo..."
              />
            </div>
          )}
          <FormaPolje
            label="Matični broj"
            value={forma.maticni_broj ?? ''}
            editMode={editMode}
            onChange={v => setForma(f => ({ ...f, maticni_broj: v }))}
          />
          <FormaPolje
            label="Broj u RNO"
            value={forma.rbr_rno ?? ''}
            editMode={editMode}
            onChange={v => setForma(f => ({ ...f, rbr_rno: v }))}
            hint="Registar neprofitnih organizacija — MFIN"
          />
          <FormaPolje
            label="IBAN"
            value={forma.iban ?? ''}
            editMode={editMode}
            onChange={v => setForma(f => ({ ...f, iban: v }))}
          />
          <FormaPolje
            label="Banka"
            value={forma.banka ?? ''}
            editMode={editMode}
            onChange={v => setForma(f => ({ ...f, banka: v }))}
          />
          <div>
            <label className="block text-xs text-[#999] mb-1">Razina knjigovodstva</label>
            {editMode ? (
              <select
                value={forma.knjig_prag ?? 'jednostavno'}
                onChange={e => setForma(f => ({ ...f, knjig_prag: e.target.value as 'jednostavno' | 'dvojno' }))}
                className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#1a1a1e] text-white"
              >
                <option value="jednostavno">Jednostavno (prihodi ≤ 30.526 EUR)</option>
                <option value="dvojno">Dvojno (prihodi {'>'} 30.526 EUR)</option>
              </select>
            ) : (
              <p className="text-sm text-white capitalize">{forma.knjig_prag ?? 'jednostavno'}</p>
            )}
          </div>
          <FormaPolje
            label="Datum osnivanja"
            value={forma.datum_osnivanja ?? ''}
            editMode={editMode}
            onChange={v => setForma(f => ({ ...f, datum_osnivanja: v }))}
            type="date"
          />
        </div>
      </div>

      {/* === SEKCIJA B: Kontakt i sjedište === */}
      <div className="bg-[#242428] border border-[#333338] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Kontakt i sjedište</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormaPolje label="Adresa (ulica i broj)" value={forma.adresa ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, adresa: v }))} />
          <FormaPolje label="Mjesto" value={forma.mjesto ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, mjesto: v }))} />
          <FormaPolje label="Poštanski broj" value={forma.postanski_broj ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, postanski_broj: v }))} />
          <FormaPolje label="Telefon" value={forma.telefon ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, telefon: v }))} />
          <FormaPolje label="Email" value={forma.email ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, email: v }))} type="email" />
          <FormaPolje label="Web" value={forma.web ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, web: v }))} />
        </div>
      </div>

      {/* === SEKCIJA C: Hijerarhija === */}
      <div className="bg-[#242428] border border-[#333338] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Vatrogasna hijerarhija</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormaPolje label="Vatrogasna zajednica JLS" value={forma.vatrogasna_zajednica ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, vatrogasna_zajednica: v }))} />
          <FormaPolje label="Županijska vatrogasna zajednica" value={forma.zupanijska_zajednica ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, zupanijska_zajednica: v }))} />
          <FormaPolje label="HVZ regija" value={forma.hvz_region ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, hvz_region: v }))} />
        </div>
      </div>

      {/* === SEKCIJA D: Funkcioneri (read-only, automatski) === */}
      <div className="bg-[#1e1e22] border border-[#2e2e32] rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Trenutni funkcioneri</h3>
            <p className="text-xs text-[#777] mt-0.5">
              Automatski preuzeto iz Tijela DVD-a. Za promjenu idi na tab "Tijela DVD-a".
            </p>
          </div>
          <span className="text-[10px] text-emerald-500 bg-emerald-900/20 px-2 py-1 rounded-full">
            ⚡ Auto-sync
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { label: 'Predsjednik', value: funk?.predsjednik },
            { label: 'Zamjenik predsjednika', value: funk?.zamjenik_predsjednika },
            { label: 'Zapovjednik', value: funk?.zapovjednik },
            { label: 'Zamjenik zapovjednika', value: funk?.zamjenik_zapovjednika },
            { label: 'Tajnik', value: funk?.tajnik },
            { label: 'Blagajnik', value: funk?.blagajnik },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-[#999] mb-0.5">{label}</dt>
              <dd className="text-sm text-white">{value ?? <span className="text-[#555]">Nije postavljeno</span>}</dd>
            </div>
          ))}
        </div>
      </div>

      {/* Akcijski gumbi */}
      {editMode && (
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSpremi}
            disabled={saving}
            className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Spremanje...' : 'Spremi promjene'}
          </button>
          <button
            onClick={handleOdustani}
            className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg hover:bg-[#333338]"
          >
            Odustani
          </button>
        </div>
      )}

      {/* Meta info */}
      {org && (
        <p className="text-xs text-[#555]">
          Zadnja promjena: {new Date(org.updated_at).toLocaleDateString('hr-HR')}
        </p>
      )}
    </div>
  )
}

// ── Helper komponenta FormaPolje ─────────────────────────────

interface FormaPoljeProp {
  label: string
  value: string
  editMode: boolean
  onChange: (v: string) => void
  type?: string
  hint?: string
  maxLength?: number
}

function FormaPolje({ label, value, editMode, onChange, type = 'text', hint, maxLength }: FormaPoljeProp) {
  return (
    <div>
      <label className="block text-xs text-[#999] mb-1">{label}</label>
      {editMode ? (
        <>
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            maxLength={maxLength}
            className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#1a1a1e] text-white focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          {hint && <p className="text-[10px] text-[#666] mt-0.5">{hint}</p>}
        </>
      ) : (
        <p className="text-sm text-white">{value || <span className="text-[#555]">—</span>}</p>
      )}
    </div>
  )
}
```

---

## KORAK 6 — PostavkePage: Novi tab "Zakonske obveze"

### 6.1 Dodaj tab u navigaciju

U `PostavkePage()` komponenti, u array tabova dodaj:

```ts
{ key: 'zakoni' as Tab, label: 'Zakonske obveze' },
```

Ažuriraj `Tab` tip:
```ts
type Tab = 'korisnici' | 'dvd' | 'tijela' | 'zakoni' | 'gdpr'
```

Dodaj uvjetni render:
```tsx
{tab === 'zakoni' && <TabZakonskeObveze />}
```

### 6.2 Komponenta `TabZakonskeObveze`

Ovu komponentu dodaj u PostavkePage.tsx:

```tsx
// ── Tab: Zakonske obveze ───────────────────────────────────

function TabZakonskeObveze() {
  const { korisnik } = useAuthStore()
  const mozeUredivati = ['admin', 'predsjednik', 'zamjenik'].includes(korisnik?.uloga ?? '')

  const [stavke, setStavke] = useState<ZakonskiSadrzaj[]>([])
  const [loading, setLoading] = useState(true)
  const [aktivnaKategorija, setAktivnaKategorija] = useState('financije')
  const [editStavka, setEditStavka] = useState<ZakonskiSadrzaj | null>(null)
  const [showNova, setShowNova] = useState(false)

  useEffect(() => { ucitaj() }, [])

  async function ucitaj() {
    setLoading(true)
    try { setStavke(await dohvatiZakonskiSadrzaj()) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const filtrirane = stavke.filter(s => s.kategorija === aktivnaKategorija)

  const vaznostBoja: Record<string, string> = {
    hitno:   'bg-red-900/25 text-red-400 border-red-900/50',
    vazno:   'bg-orange-900/20 text-orange-400 border-orange-900/40',
    normalno:'bg-blue-900/20 text-blue-400 border-blue-900/40',
    info:    'bg-[#2a2a2e] text-[#999] border-[#333338]',
  }

  const vaznostLabela: Record<string, string> = {
    hitno: 'Hitno', vazno: 'Važno', normalno: 'Normalno', info: 'Info',
  }

  return (
    <div>
      {/* Info */}
      <div className="bg-[#1e1e22] border border-[#333338] rounded-lg p-4 mb-5 text-sm text-[#bbb]">
        Pregled zakonskih obveza i uputa za predsjednike i tajnike DVD-a.
        Sadržaj je prilagođen za volontere — bez pravnog žargona.
        {mozeUredivati && ' Kao predsjednik/admin možeš uređivati i dodavati stavke.'}
      </div>

      {/* Kategorije (tab navigacija) */}
      <div className="flex flex-wrap gap-1 mb-5">
        {KATEGORIJE_ZAKON.map(k => (
          <button
            key={k.value}
            onClick={() => setAktivnaKategorija(k.value)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              aktivnaKategorija === k.value
                ? 'bg-red-600 text-white'
                : 'bg-[#2a2a2e] text-[#999] hover:text-[#ddd] hover:bg-[#333338]'
            }`}
          >
            {k.label}
            <span className="ml-1.5 opacity-60">
              ({stavke.filter(s => s.kategorija === k.value).length})
            </span>
          </button>
        ))}
      </div>

      {/* Lista stavki */}
      {loading ? (
        <div className="p-8 text-center text-[#999]">Učitavanje...</div>
      ) : (
        <div className="space-y-3">
          {filtrirane.length === 0 && (
            <div className="p-8 text-center text-[#999]">
              Nema stavki u ovoj kategoriji.
              {mozeUredivati && (
                <button onClick={() => setShowNova(true)} className="ml-2 text-red-400 hover:text-red-300">
                  Dodaj prvu stavku →
                </button>
              )}
            </div>
          )}

          {filtrirane.map(stavka => (
            editStavka?.id === stavka.id ? (
              <EditForma
                key={stavka.id}
                stavka={editStavka}
                korisnikId={korisnik!.id}
                onSpremi={async (azurirano) => {
                  setStavke(s => s.map(x => x.id === azurirano.id ? azurirano : x))
                  setEditStavka(null)
                }}
                onOdustani={() => setEditStavka(null)}
              />
            ) : (
              <div key={stavka.id} className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold text-white">{stavka.naslov}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${vaznostBoja[stavka.vaznost]}`}>
                          {vaznostLabela[stavka.vaznost]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-[#777]">
                        {stavka.rok_opis && (
                          <span>🗓 <strong className="text-[#999]">{stavka.rok_opis}</strong></span>
                        )}
                        {stavka.izvor_zakon && (
                          <span>📖 {stavka.izvor_zakon}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {mozeUredivati && (
                    <button
                      onClick={() => setEditStavka(stavka)}
                      className="text-xs text-[#666] hover:text-[#bbb] flex-shrink-0 px-2 py-1 rounded hover:bg-[#2a2a2e]"
                    >
                      Uredi
                    </button>
                  )}
                </div>

                {/* Sadržaj — Markdown renderiran kao preformatted */}
                <div className="px-5 pb-4 border-t border-[#2a2a2e] pt-4">
                  <MarkdownPrikaz sadrzaj={stavka.sadrzaj} />
                </div>
              </div>
            )
          ))}

          {/* Dodaj novu stavku */}
          {mozeUredivati && !showNova && filtrirane.length > 0 && (
            <button
              onClick={() => setShowNova(true)}
              className="w-full py-3 border border-dashed border-[#333338] text-[#666] text-sm rounded-xl hover:border-[#555] hover:text-[#999] transition-colors"
            >
              + Dodaj stavku za "{KATEGORIJE_ZAKON.find(k => k.value === aktivnaKategorija)?.label}"
            </button>
          )}

          {showNova && (
            <EditForma
              stavka={{
                id: '',
                kategorija: aktivnaKategorija as ZakonskiSadrzaj['kategorija'],
                naslov: '',
                sadrzaj: '',
                rok_opis: '',
                izvor_zakon: '',
                vaznost: 'normalno',
                redni_broj: filtrirane.length * 10 + 10,
                aktivan: true,
                updated_at: '',
                updated_by: null,
              }}
              korisnikId={korisnik!.id}
              isNova={true}
              onSpremi={async (nova) => {
                setStavke(s => [...s, nova])
                setShowNova(false)
              }}
              onOdustani={() => setShowNova(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Markdown prikaz (jednostavan, bez library) ────────────────

function MarkdownPrikaz({ sadrzaj }: { sadrzaj: string }) {
  // Osnovna Markdown → HTML konverzija bez biblioteke
  // Podržava: ## naslovi, **bold**, | tablice, - liste, prazne linije kao paragrafi
  const lineParsed = sadrzaj
    .split('\n')
    .map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} className="text-sm font-semibold text-white mt-3 mb-1">{line.slice(3)}</h3>
      if (line.startsWith('### ')) return <h4 key={i} className="text-xs font-semibold text-[#bbb] mt-2 mb-1 uppercase tracking-wide">{line.slice(4)}</h4>
      if (line.startsWith('- ')) return <li key={i} className="text-sm text-[#bbb] ml-4 list-disc">{parseBold(line.slice(2))}</li>
      if (line.startsWith('|')) return <TableLine key={i} line={line} />
      if (line.trim() === '') return <div key={i} className="h-2" />
      return <p key={i} className="text-sm text-[#bbb]">{parseBold(line)}</p>
    })
  return <div className="space-y-0.5">{lineParsed}</div>
}

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="text-white font-medium">{part}</strong> : part
  )
}

function TableLine({ line }: { line: string }) {
  if (line.replace(/[\|\s\-]/g, '') === '') return null
  const cells = line.split('|').filter(c => c.trim() !== '')
  return (
    <div className="grid text-xs text-[#bbb] border-b border-[#2a2a2e] py-1" style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
      {cells.map((cell, i) => <span key={i} className={i === 0 ? 'font-medium text-white' : ''}>{cell.trim()}</span>)}
    </div>
  )
}

// ── Edit forma za zakonski sadržaj ────────────────────────────

interface EditFormaProp {
  stavka: ZakonskiSadrzaj
  korisnikId: string
  isNova?: boolean
  onSpremi: (s: ZakonskiSadrzaj) => Promise<void>
  onOdustani: () => void
}

function EditForma({ stavka, korisnikId, isNova = false, onSpremi, onOdustani }: EditFormaProp) {
  const [forma, setForma] = useState(stavka)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)

  async function handleSpremi() {
    if (!forma.naslov.trim() || !forma.sadrzaj.trim()) {
      alert('Naslov i sadržaj su obavezni.'); return
    }
    setSaving(true)
    try {
      let rezultat: ZakonskiSadrzaj
      if (isNova) {
        rezultat = await kreirajZakonskiSadrzaj(
          { kategorija: forma.kategorija, naslov: forma.naslov, sadrzaj: forma.sadrzaj,
            rok_opis: forma.rok_opis, izvor_zakon: forma.izvor_zakon,
            vaznost: forma.vaznost, redni_broj: forma.redni_broj },
          korisnikId
        )
      } else {
        rezultat = await azurirajZakonskiSadrzaj(forma.id,
          { naslov: forma.naslov, sadrzaj: forma.sadrzaj, rok_opis: forma.rok_opis,
            izvor_zakon: forma.izvor_zakon, vaznost: forma.vaznost, redni_broj: forma.redni_broj },
          korisnikId
        )
      }
      await onSpremi(rezultat)
    } catch (err) {
      alert(`Greška: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-[#1e1e28] border border-red-900/30 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          {isNova ? 'Nova stavka' : `Uredi: ${stavka.naslov}`}
        </h3>
        <button onClick={() => setPreview(p => !p)} className="text-xs text-[#777] hover:text-[#bbb]">
          {preview ? 'Uredi' : 'Pregled'}
        </button>
      </div>

      {preview ? (
        <div className="bg-[#242428] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-2">{forma.naslov || '(bez naslova)'}</h3>
          <MarkdownPrikaz sadrzaj={forma.sadrzaj} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#999] mb-1">Naslov *</label>
              <input
                value={forma.naslov}
                onChange={e => setForma(f => ({ ...f, naslov: e.target.value }))}
                className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#1a1a1e] text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-[#999] mb-1">Važnost</label>
              <select
                value={forma.vaznost}
                onChange={e => setForma(f => ({ ...f, vaznost: e.target.value as ZakonskiSadrzaj['vaznost'] }))}
                className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#1a1a1e] text-white"
              >
                <option value="hitno">Hitno</option>
                <option value="vazno">Važno</option>
                <option value="normalno">Normalno</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#999] mb-1">Rok / Učestalost</label>
              <input
                value={forma.rok_opis}
                onChange={e => setForma(f => ({ ...f, rok_opis: e.target.value }))}
                placeholder="npr. do 31. prosinca tekuće godine"
                className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#1a1a1e] text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-[#999] mb-1">Izvor zakona</label>
              <input
                value={forma.izvor_zakon}
                onChange={e => setForma(f => ({ ...f, izvor_zakon: e.target.value }))}
                placeholder="npr. Zakon o udrugama čl. 18"
                className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#1a1a1e] text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#999] mb-1">
              Sadržaj (Markdown) *
              <span className="ml-2 text-[#555]">## Naslov, **bold**, - lista, | tablica</span>
            </label>
            <textarea
              value={forma.sadrzaj}
              onChange={e => setForma(f => ({ ...f, sadrzaj: e.target.value }))}
              rows={10}
              className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#1a1a1e] text-white font-mono resize-y"
              placeholder="## Naslov sekcije&#10;&#10;Opis obveze..."
            />
          </div>
        </>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSpremi}
          disabled={saving}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {saving ? 'Spremanje...' : isNova ? 'Dodaj stavku' : 'Spremi izmjene'}
        </button>
        <button onClick={onOdustani} className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg">
          Odustani
        </button>
      </div>
    </div>
  )
}
```

### 6.3 Dodaj importove za tab Zakoni

Na vrhu `PostavkePage.tsx` dodaj:

```ts
import {
  dohvatiZakonskiSadrzaj,
  azurirajZakonskiSadrzaj,
  kreirajZakonskiSadrzaj,
  KATEGORIJE_ZAKON
} from '@/lib/supabase/queries/zakonski-sadrzaj'
import type { ZakonskiSadrzaj } from '@/lib/supabase/queries/zakonski-sadrzaj'
```

---

## KORAK 7 — Ažuriranje Topbar/Sidebar (dvd.store integracija)

U `AppLayout.tsx`, Topbar komponenta — zamijeni hardkodirani "DVD Sarvaš" s podatkom iz stora:

```tsx
import { useDVDStore } from '@/store/dvd.store'

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { organizacija } = useDVDStore()

  return (
    <header className="h-12 bg-[#1a1a1e] border-b border-[#2e2e32] flex items-center px-5 gap-4 flex-shrink-0">
      <button onClick={onMenuClick} ...>...</button>
      <div className="text-[11px] text-[#aaa] uppercase tracking-widest font-medium">
        ERP &rsaquo; <span className="text-[#aaa]">{organizacija?.naziv_kratki ?? 'DVD ERP'}</span>
      </div>
    </header>
  )
}
```

U Sidebar komponenta — logo sekcija:

```tsx
function Sidebar({ open }: { open: boolean }) {
  const { organizacija } = useDVDStore()
  // ...
  <div className="text-[13px] font-bold text-white tracking-tight">
    {organizacija?.naziv_kratki ?? 'DVD Sarvaš'}
  </div>
```

---

## KORAK 8 — Regeneracija TypeScript tipova

Nakon što su migracije pokrenute:

```bash
supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
```

Nakon regeneracije, ažuriraj `organizacija.ts` i `zakonski-sadrzaj.ts` query fajlove
da koriste generirane tipove umjesto ručnih interfacea.

---

## Redosljed commitova

```
1. sql: migracija 009 — dvd_organizacija + view trenutni_funkcioneri
2. sql: migracija 010 — zakonski_sadrzaj + seed sadržaj
3. feat: queries/organizacija.ts — dohvati/azuriraj organizaciju + funkcioneri
4. feat: queries/zakonski-sadrzaj.ts — CRUD zakonskog sadržaja
5. feat: dvd.store.ts — zamjena hardkodiranih podataka Supabase queryjem
6. feat: auth.ts — init DVDStore nakon loginа
7. feat: PostavkePage — TabDVDPodaci editable forma s 4 sekcije
8. feat: PostavkePage — TabZakonskeObveze + EditForma + MarkdownPrikaz
9. feat: AppLayout — Topbar/Sidebar koriste dvd.store
10. chore: supabase gen types — regeneracija tipova
```

---

## Automatizacije u ovom sprintu (sažetak)

| Što bi bio ručni posao | Kako je automatizirano |
|---|---|
| "Ažuriraj predsjednika u postavkama" | VIEW `trenutni_funkcioneri` — automatski iz tijela |
| "Promijeni naziv na 5 mjesta u kodu" | dvd.store — jedan izvor istine |
| "Pisati zakonske obveze od nule" | Seed s 14 unaprijed napisanih stavki |
| "Čuvati i čitati organizacijske podatke" | Supabase tablica umjesto hardkoda |

---

*Projekt: DVD Sarvaš ERP — https://github.com/dvdsarvas/dvd-erp*
