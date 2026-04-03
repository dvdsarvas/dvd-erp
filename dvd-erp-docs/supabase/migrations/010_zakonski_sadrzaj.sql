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
