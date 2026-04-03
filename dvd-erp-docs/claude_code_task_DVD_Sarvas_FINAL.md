# Claude Code Task: DVD Sarvaš ERP — Kompletna specifikacija

## Kontekst

Web aplikacija za automatizaciju administracije DVD Sarvaš (Dobrovoljno vatrogasno društvo Sarvaš,
Ivana Mažuranića 31, Sarvaš, Osječko-baranjska županija).

Stack: React + Vite + Supabase + Cloudflare Pages (identično Carta ERP arhitekturi).

**Cilj:** Smanjiti administrativno opterećenje predsjednika/tajnika s ~4-5h/tjedno na <1h/tjedno
automatizacijom generiranja svih zakonski obveznih izvješća i dokumenata.

---

## Pravna analiza — što sustav MORA pokriti

### Iz Statuta DVD Sarvaš (lipanj 2021.)

#### Tijela društva koja ERP mora podržavati (čl. 27):
| Tijelo | Kako se bira | Mandat | ERP evidencija |
|--------|-------------|--------|----------------|
| Predsjednik + zamjenik | Skupština | 5 god | Potpis dokumenti, zastupanje |
| Zapovjednik + zamjenik | Skupština (+ potvrda JLS + suglasnost nadređenog zapovjednika) | 5 god | Operativna izvješća |
| Upravni odbor | Skupština | 5 god | 9 članova, min 4 sjednice/god |
| Zapovjedništvo | Upravni odbor (prijedlog zapovjednika) | 5 god | 9 članova, operativni rad |
| Tajnik | Upravni odbor | — | Evidencija članova, arhiva |
| Blagajnik | Upravni odbor | 5 god | Financijsko poslovanje |

#### Kategorije članstva (čl. 16) — sve moraju biti u evidenciji:
- **operativni** — 18+, zdravstvena sposobnost, osposobljeni, imaju pravo glasa u Skupštini
- **izvršni** — 18+, u tijelima društva, pravo glasa
- **pričuvni** — bivši operativni/izvršni, 65+ ili zdravstveni razlozi, min 10g staža, pravo glasa
- **veterani** — 60+, min 30g operativnog staža, pravo glasa
- **počasni** — poseban doprinos, pravo glasa samo ako su bili operativni/izvršni
- **vatrogasni podmladak** — 6–12 god, uz suglasnost roditelja, bez prava glasa
- **vatrogasna mladež** — 12–18 god, uz suglasnost roditelja, bez prava glasa

#### Skupštinska obveza izvješćivanja (čl. 34, 35, 36, 38):
- **Zapovjednik**: godišnje izvješće Skupštini + JLS + nadređeni zapovjednik, **rok: 30. lipnja**
- **Predsjednik**: godišnje financijsko izvješće Skupštini
- **Predsjednik**: dostava zapisnika redovne skupštine nadležnom uredu koji vodi Registar udruga

#### Quorum i odlučivanje (čl. 33, 41):
- Skupština: kvorum >50% svih članova, odluke natpolovičnom većinom prisutnih
- Statut i izmjene: 2/3 ukupnog broja članova
- Prestanak: 3/4 ukupnog broja članova
- Upravni odbor: min 4 sjednice/god, kvorum >50%, odluke natpolovičnom većinom

### Iz Zakona o vatrogastvu (NN 125/19, 114/22, 155/23)
- Evidencija operativnih članova u HVZ računalnoj aplikaciji (čl. 14 Statuta + Zakon)
- Vatrogasna zvanja po Pravilniku NN 21/2026 i NN 89/2024
- Osposobljavanje po Pravilniku NN 12/2025
- Godišnje izvješće o operativnoj sposobnosti VZG i VZŽ
- Evidencija intervencija i vježbi s prisutnošću

### Iz Zakona o udrugama (NN 74/14, 70/17, 98/19, 151/22)
- Popis članova: ime, OIB, datum rođenja, datum pristupanja, kategorija, datum prestanka (čl. 14 Statuta)
- Zapisnik skupštine → dostaviti nadležnom UO Županije Osječko-baranjske
- Godišnje izvješće o radu (skupštinska obveza)

### Iz Zakona o financijskom poslovanju i računovodstvu neprofitnih organizacija (NN 121/14)
- G-PR-IZ-NPF obrazac (FINA, godišnje)
- Popis imovine na kraju godine
- Poslovne knjige (jednostavno knjigovodstvo ako prihodi < ~230.000 EUR)
- Pravdanje javnih poziva po Uredbi NN 26/15

---

## Baza podataka — Supabase SQL migracije

```sql
-- ═══════════════════════════════════════════════════════
-- ORGANIZACIJA
-- ═══════════════════════════════════════════════════════

create table organizations (
  id uuid primary key default gen_random_uuid(),
  naziv text not null default 'Dobrovoljno vatrogasno društvo Sarvaš',
  kratki_naziv text default 'DVD Sarvaš',
  oib char(11),
  adresa text default 'Ivana Mažuranića 31',
  mjesto text default 'Sarvaš',
  zupanija text default 'Osječko-baranjska',
  postanski_broj text default '31207',
  pib_broj text, -- registarski broj pri VZŽ/VZG
  vzg_naziv text, -- Vatrogasna zajednica Grada Osijeka
  vzz_naziv text default 'VZŽ Osječko-baranjska',
  jls_naziv text default 'Grad Osijek',
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════
-- TIJELA DRUŠTVA — mandati i trenutni nositelji
-- ═══════════════════════════════════════════════════════

create type tijelo_enum as enum (
  'predsjednik', 'zamjenik_predsjednika',
  'zapovjednik', 'zamjenik_zapovjednika',
  'tajnik', 'blagajnik', 'likvidator',
  'clan_upravnog_odbora', 'clan_zapovjednistva'
);

create table mandates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id),
  member_id uuid references members(id),
  tijelo tijelo_enum not null,
  datum_pocetka date not null,
  datum_zavrsetka date, -- null = aktivan mandat
  aktivan bool generated always as (datum_zavrsetka is null) stored,
  napomena text,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════
-- ČLANOVI
-- ═══════════════════════════════════════════════════════

create type kategorija_clanstva as enum (
  'operativni', 'izvrsni', 'pricuvni', 'veteran',
  'pocasni', 'podmladak', 'mladez'
);

create table members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id),

  -- Osobni podaci (obvezni po Statutu čl. 14 i Zakonu o udrugama)
  ime text not null,
  prezime text not null,
  oib char(11) unique,
  datum_rodenja date,
  adresa text,
  mjesto text,
  telefon text,
  email text,

  -- Članstvo
  kategorija kategorija_clanstva not null,
  datum_uclanjena date not null,
  datum_prestanka date,
  aktivan bool default true,

  -- Vatrogasno (relevantno za operativne/izvršne)
  vatrogasno_zvanje text, -- po Pravilniku NN 21/2026
  datum_zvanja date,
  broj_vatrogasne_iskaznice text,

  -- Za podmladak/mladež: roditeljev pristanak
  suglasnost_roditelja bool default false,
  ime_roditelja text,

  -- Stegovno
  stegovna_mjera text, -- zadnja izrečena mjera
  datum_stegovna date,

  napomena text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Pravo glasa u skupštini (izvodi se iz kategorije)
create view members_with_voting_rights as
select m.*,
  case
    when kategorija in ('operativni', 'izvrsni', 'pricuvni', 'veteran') then true
    when kategorija = 'pocasni' and exists (
      -- počasni ima pravo glasa samo ako je bio operativni/izvršni
      select 1 from member_history mh
      where mh.member_id = m.id
      and mh.kategorija in ('operativni', 'izvrsni')
    ) then true
    else false
  end as ima_pravo_glasa
from members m
where m.aktivan = true;

-- Osposobljavanja
create table member_trainings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id),
  naziv_tecaja text not null,
  datum_pocetka date,
  datum_zavrsetka date not null,
  ustanova text,
  zvanje_steceno text,
  certifikat_broj text,
  napomena text,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════
-- VJEŽBE, SJEDNICE, INTERVENCIJE
-- ═══════════════════════════════════════════════════════

create type event_vrsta as enum (
  'vjezba_operativna',
  'vjezba_pokazna',
  'intervencija',
  'natjecanje',
  'osposobljavanje',
  'skupstina_redovna',
  'skupstina_izborna',
  'skupstina_izvanredna',
  'sjednica_upravnog_odbora',
  'sjednica_zapovjednistva',
  'ostalo'
);

create table events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id),
  vrsta event_vrsta not null,
  naziv text not null,
  redni_broj int, -- za sjednice: br. sjednice u godini
  datum_pocetka timestamptz not null,
  datum_zavrsetka timestamptz,
  lokacija text,
  opis text,
  dnevni_red text, -- za sjednice
  odluke text,     -- za sjednice: donesene odluke
  voditelj_id uuid references members(id),
  kvorum_potreban int, -- broj potreban za pravovaljanost
  kvorum_ostvaren int, -- stvarna prisutnost s pravom glasa
  pravovaljan bool,    -- automatski izračun
  zapisnik_potpisan bool default false,
  zapisnik_poslan_uredu bool default false, -- za skupštine: dostavljeno Registru udruga
  napomena text,
  created_by uuid references members(id),
  created_at timestamptz default now()
);

-- Prisutnost na događaju
create table event_attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id),
  member_id uuid references members(id),
  prisutan bool default false,
  uloga text, -- npr. "predsjedavajući", "zapisničar", "ovjerovitelj"
  napomena text,
  unique(event_id, member_id)
);

-- Ovjerovitelji zapisnika (čl. 32 Statuta: zapisnik + 2 ovjerovitelja)
create table meeting_verifiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id),
  member_id uuid references members(id),
  redosljed int check (redosljed in (1, 2)) -- max 2 ovjerovitelja
);

-- ═══════════════════════════════════════════════════════
-- OPREMA I VOZILA
-- ═══════════════════════════════════════════════════════

create type equipment_kategorija as enum (
  'vozilo_navalna', 'vozilo_tanker', 'vozilo_kombinirano',
  'vozilo_zapovjedno', 'vozilo_specijalno',
  'motorna_pumpa', 'aparat_za_disanje', 'hidraulicki_alat',
  'osobna_zastitna_oprema', 'vatrogasna_crijevna_oprema',
  'komunikacijska_oprema', 'oprema_za_spasavanje', 'ostalo'
);

create table equipment (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id),
  naziv text not null,
  kategorija equipment_kategorija not null,
  kolicina int default 1, -- za OZO (12 aparata za disanje itd.)
  serijski_broj text,
  registracija text, -- za vozila
  godina_nabave int,
  vrijednost_nabave numeric(12,2),
  zadnji_servis date,
  sljedeci_servis date,
  zadnji_tehnicki date, -- za vozila
  sljedeci_tehnicki date,
  zadnja_inspekcija date,
  sljedeca_inspekcija date,
  ispravno bool default true,
  napomena text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Servisni zapisi
create table equipment_service (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid references equipment(id),
  datum date not null,
  vrsta_servisa text not null,
  izvrsio text,
  trosak numeric(10,2),
  sljedeci_servis date,
  napomena text,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════
-- FINANCIJE
-- ═══════════════════════════════════════════════════════

create type fin_kategorija as enum (
  -- Prihodi
  'dotacija_grad', 'dotacija_vzg', 'dotacija_vzz', 'dotacija_drzava',
  'javni_poziv_prihod', 'clanarine', 'donacija', 'vlastiti_prihodi',
  -- Rashodi
  'gorivo_mazivo', 'servis_vozila', 'oprema_nabava', 'oprema_servis',
  'rezije', 'osiguranje', 'obuke_natjecanja', 'putni_nalozi',
  'nagrade_priznanja', 'administrativni_troskovi', 'ostalo_rashod'
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id),
  datum date not null,
  vrsta text check (vrsta in ('prihod', 'rashod')) not null,
  kategorija fin_kategorija not null,
  opis text not null,
  iznos numeric(12,2) not null check (iznos > 0),
  dokument_broj text, -- broj računa, uplatnice itd.
  javni_poziv_id uuid references public_calls(id), -- FK za pravdanje
  created_by uuid references members(id),
  created_at timestamptz default now()
);

-- Javni pozivi (projekti s financiranjem)
create table public_calls (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id),
  naziv text not null,
  izvor_financiranja text not null, -- "VZŽ", "Grad Osijek" itd.
  odobreni_iznos numeric(12,2) not null,
  rok_pravdanja date not null,
  status text check (status in ('odobreno','u_provedbi','pravdanje','zakljuceno')) default 'odobreno',
  napomena text,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════
-- PUTNI NALOZI
-- ═══════════════════════════════════════════════════════

create table travel_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id),
  broj_naloga text not null, -- format: PN-XX/GG (npr. PN-07/26)
  datum date not null,
  putnik_id uuid references members(id),
  svrha text not null,
  relacija_od text not null,
  relacija_do text not null,
  datum_polaska date,
  datum_povratka date,
  km numeric(7,1),
  trosak_karte numeric(10,2),
  dnevnica numeric(10,2) default 0,
  ostali_troskovi numeric(10,2) default 0,
  ukupno numeric(10,2) generated always as (
    coalesce(km * 0.40, 0) + coalesce(trosak_karte, 0) +
    coalesce(dnevnica, 0) + coalesce(ostali_troskovi, 0)
  ) stored, -- 0.40 EUR/km — prilagoditi aktualnom iznosu
  odobrio_id uuid references members(id),
  datum_odobrenja date,
  status text check (status in ('nacrt','odobreno','isplaceno')) default 'nacrt',
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════
-- ALERTI (automatsko generiranje)
-- ═══════════════════════════════════════════════════════

create table notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id),
  vrsta text not null, -- 'servis_uskoro', 'servis_prekoracen', 'rok_pravdanje', 'neaktivan_clan' itd.
  prioritet text check (prioritet in ('hitno','upozorenje','info')) default 'upozorenje',
  naslov text not null,
  poruka text not null,
  referenca_tablica text, -- 'equipment', 'public_calls', 'members'
  referenca_id uuid,
  datum_isteka date, -- kad alert postaje nebitan
  rijeseno bool default false,
  rijesio_id uuid references members(id),
  datum_rjesavanja timestamptz,
  created_at timestamptz default now()
);
```

---

## PostgreSQL funkcije — poslovne logike

### 1. OIB validacija (kontrolni zbroj)
```sql
create or replace function validate_oib(oib text) returns bool as $$
declare
  i int; a int := 10; b int;
begin
  if length(oib) != 11 or oib !~ '^[0-9]+$' then return false; end if;
  for i in 1..10 loop
    a := a + cast(substr(oib, i, 1) as int);
    a := a mod 10;
    if a = 0 then a := 10; end if;
    a := (a * 2) mod 11;
  end loop;
  b := 11 - a;
  if b = 10 then b := 0; end if;
  return b = cast(substr(oib, 11, 1) as int);
end;
$$ language plpgsql immutable;
```

### 2. Automatski kvorum za skupštinu
```sql
create or replace function check_skupstina_quorum(event_id uuid)
returns table(
  ukupno_clanova_s_pravom_glasa int,
  prisutnih_s_pravom_glasa int,
  kvorum_ostvaren bool,
  posto_prisutnih numeric
) as $$
  select
    count(distinct m.id)::int as ukupno,
    count(distinct case when ea.prisutan then m.id end)::int as prisutnih,
    count(distinct case when ea.prisutan then m.id end) * 2 >
      count(distinct m.id) as kvorum,
    round(
      count(distinct case when ea.prisutan then m.id end)::numeric /
      nullif(count(distinct m.id), 0) * 100, 1
    ) as posto
  from members m
  left join event_attendance ea on ea.member_id = m.id and ea.event_id = $1
  where m.aktivan = true
  and m.kategorija in ('operativni','izvrsni','pricuvni','veteran')
  -- počasni koji su imali operativni/izvršni status dodati po potrebi
$$ language sql;
```

### 3. Alert engine — pokretati dnevno
```sql
create or replace function generate_daily_alerts(p_org_id uuid)
returns int as $$
declare
  inserted int := 0;
begin
  -- Briši stare neriješene (svježi run)
  delete from notifications
  where org_id = p_org_id and rijeseno = false
  and created_at < now() - interval '1 day';

  -- Oprema: servis prekoračen
  insert into notifications (org_id, vrsta, prioritet, naslov, poruka, referenca_tablica, referenca_id, datum_isteka)
  select p_org_id, 'servis_prekoracen', 'hitno',
    'Servis prekoračen: ' || naziv,
    'Rok servisa je bio ' || sljedeci_servis::text || '. Potrebno odmah zakazati.',
    'equipment', id, sljedeci_servis + 90
  from equipment
  where org_id = p_org_id and ispravno = true
  and sljedeci_servis < current_date
  on conflict do nothing;
  get diagnostics inserted = row_count;

  -- Oprema: servis za <= 30 dana
  insert into notifications (org_id, vrsta, prioritet, naslov, poruka, referenca_tablica, referenca_id, datum_isteka)
  select p_org_id, 'servis_uskoro', 'upozorenje',
    'Servis uskoro: ' || naziv,
    'Rok servisa: ' || sljedeci_servis::text || ' (za ' || (sljedeci_servis - current_date) || ' dana).',
    'equipment', id, sljedeci_servis
  from equipment
  where org_id = p_org_id and ispravno = true
  and sljedeci_servis between current_date and current_date + 30;

  -- Javni pozivi: pravdanje za <= 30 dana
  insert into notifications (org_id, vrsta, prioritet, naslov, poruka, referenca_tablica, referenca_id, datum_isteka)
  select p_org_id, 'rok_pravdanje', 'hitno',
    'Pravdanje javnog poziva: ' || naziv,
    'Rok za pravdanje: ' || rok_pravdanja::text || ' (za ' || (rok_pravdanja - current_date) || ' dana).',
    'public_calls', id, rok_pravdanja
  from public_calls
  where org_id = p_org_id and status in ('u_provedbi','pravdanje')
  and rok_pravdanja between current_date and current_date + 30;

  -- Neaktivni operativni članovi (> 90 dana bez vježbe)
  insert into notifications (org_id, vrsta, prioritet, naslov, poruka, referenca_tablica, referenca_id)
  select p_org_id, 'neaktivan_clan', 'info',
    'Neaktivan član: ' || ime || ' ' || prezime,
    'Zadnja zabilježena aktivnost: ' || coalesce(
      (select max(e.datum_pocetka)::date::text
       from event_attendance ea join events e on e.id = ea.event_id
       where ea.member_id = m.id and ea.prisutan = true),
      'nikad'
    ) || ' (> 90 dana).',
    'members', m.id
  from members m
  where m.org_id = p_org_id and m.aktivan = true
  and m.kategorija = 'operativni'
  and not exists (
    select 1 from event_attendance ea
    join events e on e.id = ea.event_id
    where ea.member_id = m.id and ea.prisutan = true
    and e.datum_pocetka > now() - interval '90 days'
  );

  -- Mandat tijela društva uskoro istječe (< 6 mj)
  insert into notifications (org_id, vrsta, prioritet, naslov, poruka, referenca_tablica, referenca_id)
  select p_org_id, 'mandat_istjece', 'upozorenje',
    'Mandat uskoro istječe: ' || tijelo::text,
    (select ime || ' ' || prezime from members where id = mn.member_id) ||
    ' — mandat istječe ' || datum_zavrsetka::text,
    'mandates', mn.id
  from mandates mn
  where mn.org_id = p_org_id and mn.aktivan = true
  and mn.datum_zavrsetka between current_date and current_date + 180;

  return inserted;
end;
$$ language plpgsql;
```

---

## Funkcije za generiranje izvješća

Svaka vraća JSON koji frontend koristi za render i PDF export.

### Godišnje izvješće zapovjednika (čl. 35/36 Statuta — rok 30. lipnja)
```typescript
// Uz ovo izvješće idu i izvješća prema JLS i nadređenom vatrogasnom zapovjedniku
async function generateCommanderAnnualReport(orgId: string, godina: number) {
  // Iz events tablica: vježbe s prisutnošću, intervencije
  // Iz members: broj operativnih, osposobljavanja
  // Iz equipment: popis opreme, stanje
  // Output: strukturirani JSON s poljima za standardni HVZ obrazac
}
```

### Godišnje financijsko izvješće predsjednika (čl. 38/49 Statuta)
```typescript
async function generatePresidentFinancialReport(orgId: string, godina: number) {
  // Iz transactions: prihodi/rashodi po kategorijama
  // Iz equipment: popis imovine s vrijednostima
  // Output: priprema za G-PR-IZ-NPF i skupštinsku prezentaciju
}
```

### Zapisnik sjednice (automatski predložak)
```typescript
async function generateMeetingMinutes(eventId: string) {
  // Iz events: vrsta, redni_broj, datum, lokacija, dnevni_red, odluke
  // Iz event_attendance: prisutni + glasačka prava (member_with_voting_rights view)
  // Iz meeting_verifiers: 2 ovjerovitelja (čl. 32 Statuta)
  // Output: DOCX spreman za potpis + dostavu Registru udruga
  // Format: "Zapisnik s [X]. redovne sjednice Skupštine DVD Sarvaš od [datum]"
}
```

### Popis članova za HVZ aplikaciju
```typescript
async function generateHvzMemberList(orgId: string) {
  // Polja: ime, prezime, OIB, datum_rodenja, adresa,
  //        kategorija, vatrogasno_zvanje, datum_zvanja, datum_uclanjena
  // Output: CSV ili Excel kompatibilan s HVZ aplikacijom
}
```

### Pravdanje javnog poziva
```typescript
async function generateJustificationReport(publicCallId: string) {
  // Iz public_calls: naziv, izvor, odobreni_iznos
  // Iz transactions (WHERE javni_poziv_id = publicCallId): stavke s dokumentima
  // Output: PDF tablica prihvatljiva za VZŽ/Grad
}
```

---

## React komponente — prioriteti

### PRIORITET 1 — Demo za četvrtak (osnova)

**`/dashboard`** — DashboardPage
- KPI: aktivni operativni članovi, vježbe ove godine, % proračuna, broj alerta
- AlertBanner: crvena/žuta/plava kartice s alert podacima iz notifications tablice
- ActivityFeed: zadnjih 10 unosa iz events + transactions
- ProgressBars: godišnji plan (vježbe, osposobljavanja, proračun)
- Sve s realnim podacima iz Supabase (ne mock data!)

**`/clanovi`** — MembersPage
- Tablica s filtrom po kategoriji, statusu, zvanju
- Inline badge za kategoriju (boja po tipu)
- Forma za unos — validacija OIB-a checksum algoritmom
- Automatski izračun staža (datum_uclanjena → danas)

**`/dogadjaji`** — EventsPage (vježbe + sjednice u jednom modulu)
- Lista s filter tabovima: Vježbe / Sjednice / Intervencije / Sve
- Forma za unos + checkbox lista prisutnosti (svi aktivni članovi)
- Automatski izračun kvoruma za sjednice

### PRIORITET 2 — Financije i izvješća

**`/financije`** — FinancesPage
- Unos transakcija s kategorizacijom
- Dropdown za vezu na javni poziv (kad je relevantno)
- Saldo blagajne, prihodi/rashodi po kategorijama

**`/izvjesca`** — ReportsPage
- Kartice izvješća (kao u HTML demu)
- Gumb "Generiraj" → PDF s @react-pdf/renderer
- Automatski filename: npr. `Godišnje_izvješće_zapovjednika_DVD_Sarvaš_2025.pdf`

**`/oprema`** — EquipmentPage
- Tablica s vizualnim status indikatorom (crveno/žuto/zeleno)
- Forma za servisni zapis → automatski ažurira sljedeci_servis

### PRIORITET 3

**`/putni-nalozi`** — TravelOrdersPage
- Forma s auto-generiranim brojem (PN-XX/YY)
- Auto-obračun km × tarifa (konfigurabilno)
- PDF export spreman za potpis

**`/sjednice`** — MeetingsPage (detalji sjednica + zapisnici)
- Unos dnevnog reda, odluka
- Automatski kvorum check
- DOCX zapisnik s 2 polja za ovjerovitelje + potpis predsjedavajućeg

---

## Tehnički standardi

### Validacija
```typescript
// OIB validation
function validateOib(oib: string): boolean {
  if (!/^\d{11}$/.test(oib)) return false;
  let a = 10;
  for (let i = 0; i < 10; i++) {
    a = (a + parseInt(oib[i])) % 10;
    if (a === 0) a = 10;
    a = (a * 2) % 11;
  }
  const check = 11 - a === 10 ? 0 : 11 - a;
  return check === parseInt(oib[10]);
}

// Kategorija → pravo glasa
function hasVotingRight(kategorija: string): boolean {
  return ['operativni', 'izvrsni', 'pricuvni', 'veteran'].includes(kategorija);
}
```

### CONFIG (sva magic values)
```typescript
const CONFIG = {
  ALERT_DAYS_SERVICE_WARNING: 30,
  ALERT_DAYS_INACTIVE_MEMBER: 90,
  ALERT_DAYS_MANDATE_WARNING: 180,
  KM_RATE_EUR: 0.40,          // prilagoditi aktualnom iznosu po Uredbi
  SKUPSTINA_QUORUM_RATIO: 0.5, // natpolovična = >50%
  STATUT_CHANGE_QUORUM: 2/3,
  DISSOLUTION_QUORUM: 3/4,
  MANAGING_BOARD_MIN_MEETINGS_PER_YEAR: 4,
  COMMANDER_REPORT_DEADLINE_MONTH: 6, // 30. lipnja
  COMMANDER_REPORT_DEADLINE_DAY: 30,
} as const;
```

### Stack standardni importi
```typescript
// Forme: react-hook-form + zod
// Datumi: date-fns s hr lokalom
// Toast: sonner
// PDF: @react-pdf/renderer
// Tablice: @tanstack/react-table
// Supabase klijent: @supabase/supabase-js
```

### RLS politike (sigurnost)
```sql
-- Svaki korisnik vidi samo podatke svoje organizacije
alter table members enable row level security;
create policy "org_isolation" on members
  using (org_id = (select org_id from user_profiles where user_id = auth.uid()));
-- Isto za sve ostale tablice s org_id
```

### Error handling
```typescript
// Svaka Supabase operacija:
try {
  const { data, error } = await supabase.from('...').select();
  if (error) throw error;
  return data;
} catch (err) {
  toast.error('Greška pri dohvatu podataka. Pokušajte ponovo.');
  console.error('[ModuleName]', err);
  return null;
}
```

---

## Početni zadatak (first step za Claude Code)

1. Kreiraj sve SQL migracije iz ovog dokumenta u `supabase/migrations/`
2. Kreiraj TypeScript tipove u `src/types/database.ts` (generiraj iz Supabase schema)
3. Kreiraj `src/lib/db.ts` — typed Supabase wrapper s helper funkcijama po modulu
4. Implementiraj `generate_daily_alerts()` kao Supabase Database Function + Cron Job
5. Implementiraj DashboardPage s realnim podacima, AlertBannerom i ProgressBarsovima

**Napomena o organizaciji:** DVD Sarvaš je volonterska udruga s ~47 aktivnih članova,
sjedište Sarvaš, Osječko-baranjska župnija. Predsjednik i zapovjednik su zakonski zastupnici.
Sva polja na sučelju i u dokumentima moraju biti na **hrvatskom jeziku**.
