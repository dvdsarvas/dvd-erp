# Sprint 010 — Korekcije: konto vs AOP

> Primijeni OVE korekcije na Sprint 010 kod PRIJE ili UMJESTO pokretanja migracije.
> Ako je migracija već pokrenuta, dodaj SPRINT_010_PATCH migraciju na kraju.

---

## Pozadina — zašto korekcija

U kodu smo pomiješali dva različita koncepta:

| Pojam | Što je | Primjer | Tko ga koristi |
|---|---|---|---|
| **Konto** (računski plan) | Račun iz Računskog plana za NP organizacije | `4231`, `3311` | Knjigovođa za dnevno knjiženje |
| **AOP** | Pozicija u FINA obrascu G-PR-IZ-NPF | AOP 341, AOP 001 | FINA godišnji izvještaj |

Polje `aop_konto` u kodu pokušava biti oboje, a nije ni jedno ispravno.

**Rješenje:** Preименовати u `racunski_konto`. AOP sifre su zasebna tema za Sprint s FINA izvještajem — za sada ih ne trebamo.

---

## Korekcija 1 — SQL migracija

### Ako migracija 011 JOŠ NIJE pokrenuta — izmijeni je direktno:

Pronađi i zamijeni svaki `aop_konto` s `racunski_konto` u datoteci migracije.

### Ako migracija 011 JEŠ JEST pokrenuta — dodaj patch migraciju:

Kreiraj `supabase/migrations/011b_rename_aop_konto.sql`:

```sql
-- ============================================================
-- PATCH: Preimenovanje aop_konto → racunski_konto
-- AOP i konto su dvije različite stvari.
-- aop_konto je bio pogrešno ime za konto iz računskog plana.
-- ============================================================

-- Tablica racuni
ALTER TABLE racuni
  RENAME COLUMN aop_konto TO racunski_konto;

COMMENT ON COLUMN racuni.racunski_konto IS
  'Konto iz Računskog plana za NP organizacije (npr. 4231, 3311). 
   Automatski se kopira sa stavke financijskog plana.
   AOP sifre (FINA izvještaj) su zasebna stvar — ne miješati.';

-- Tablica dobavljaci_kategorije
ALTER TABLE dobavljaci_kategorije
  RENAME COLUMN aop_konto TO racunski_konto;

-- ============================================================
-- Seed: Konto vrijednosti na standardnim stavkama fin. plana
-- Predsjednik i tajnik NIKAD ne unose ove brojeve ručno.
-- Kopiraju se automatski pri odabiru stavke plana.
-- ============================================================

-- Ovo je primjer za DVD Sarvaš — prilagodi nazivima stavki u bazi
-- Pokrenuti tek nakon što su stavke plana kreirane

-- PRIHODI (razred 3)
UPDATE financijski_plan_stavke SET racunski_plan_konto = '3211'
  WHERE lower(naziv_stavke) LIKE '%članarin%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '3311'
  WHERE lower(naziv_stavke) LIKE '%dotacij%' 
     OR lower(naziv_stavke) LIKE '%vatrogasna zajednica%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '3531'
  WHERE lower(naziv_stavke) LIKE '%donacij%' 
     AND lower(naziv_stavke) NOT LIKE '%proračun%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '3631'
  WHERE lower(naziv_stavke) LIKE '%priredba%'
     OR lower(naziv_stavke) LIKE '%zabav%'
     OR lower(naziv_stavke) LIKE '%vlastit%prihod%';

-- RASHODI (razred 4)
UPDATE financijski_plan_stavke SET racunski_plan_konto = '4221'
  WHERE lower(naziv_stavke) LIKE '%uredski%' 
     OR lower(naziv_stavke) LIKE '%kancelarij%'
     OR lower(naziv_stavke) LIKE '%pisarniči%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4222'
  WHERE lower(naziv_stavke) LIKE '%čišćenj%'
     OR lower(naziv_stavke) LIKE '%higijen%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4223'
  WHERE lower(naziv_stavke) LIKE '%energij%'
     OR lower(naziv_stavke) LIKE '%struja%'
     OR lower(naziv_stavke) LIKE '%plin%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4225'
  WHERE lower(naziv_stavke) LIKE '%gorivo%'
     OR lower(naziv_stavke) LIKE '%mazivo%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4232'
  WHERE lower(naziv_stavke) LIKE '%telefon%'
     OR lower(naziv_stavke) LIKE '%internet%'
     OR lower(naziv_stavke) LIKE '%komunikacij%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4234'
  WHERE lower(naziv_stavke) LIKE '%najam%'
     OR lower(naziv_stavke) LIKE '%zakup%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4237'
  WHERE lower(naziv_stavke) LIKE '%intelektualne uslug%'
     OR lower(naziv_stavke) LIKE '%računovodstv%'
     OR lower(naziv_stavke) LIKE '%knjigovod%'
     OR lower(naziv_stavke) LIKE '%revizij%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4239'
  WHERE lower(naziv_stavke) LIKE '%ostale uslug%'
     OR lower(naziv_stavke) LIKE '%vanjske uslug%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4262'
  WHERE lower(naziv_stavke) LIKE '%osiguranj%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4293'
  WHERE lower(naziv_stavke) LIKE '%reprezentacij%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4299'
  WHERE lower(naziv_stavke) LIKE '%ostali materijalni%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '4211'
  WHERE lower(naziv_stavke) LIKE '%putni%'
     OR lower(naziv_stavke) LIKE '%putovanje%'
     OR lower(naziv_stavke) LIKE '%dnevnica%';

UPDATE financijski_plan_stavke SET racunski_plan_konto = '3712'
  WHERE lower(naziv_stavke) LIKE '%natjecanje%'
     OR lower(naziv_stavke) LIKE '%smotra%';
```

---

## Korekcija 2 — TypeScript tipovi

U `financije.ts` queries — pronađi i zamijeni:

```ts
// STARO — u svim interfaceima i SELECT upitima:
aop_konto: string

// NOVO:
racunski_konto: string
```

### Konkretno u `DobavljacKategorija` interfaceu:
```ts
// STARO:
export interface DobavljacKategorija {
  naziv_stranke:  string
  plan_stavka_id: string | null
  aop_konto:      string  // ← krivo ime
}

// NOVO:
export interface DobavljacKategorija {
  naziv_stranke:   string
  plan_stavka_id:  string | null
  racunski_konto:  string  // ← ispravno
}
```

### U `KnjigaUlazniRacun` interfaceu:
```ts
// STARO:
aop_konto: string | null

// NOVO:
racunski_konto: string | null
```

### U `dohvatiKategorijuDobavljaca`:
```ts
const { data } = await supabase
  .from('dobavljaci_kategorije')
  .select('naziv_stranke, plan_stavka_id, racunski_konto')  // ← promjena
  .eq('naziv_stranke', nazivStranke.toLowerCase().trim())
```

---

## Korekcija 3 — UI: konto NIJE vidljiv u formi za unos računa

### Ukloni iz forme novi račun:

Pronađi i ukloni bilo koji prikaz `aop_konto` ili `racunski_konto` u formi za unos:

```tsx
// UKLONI — konto se NE prikazuje u normalnom UI:
<input ... onChange={e => setForma(f => ({ ...f, aop_konto: e.target.value }))} />
```

### Auto-populate u pozadini — OSTAVI:

```ts
// OVO OSTAJE — kad korisnik odabere stavku plana, konto se kopira tiho:
const stavka = stavkePlana.find(s => s.id === e.target.value)
if (stavka?.racunski_plan_konto) {
  setForma(f => ({
    ...f,
    plan_stavka_id: e.target.value,
    racunski_konto: stavka.racunski_plan_konto,  // ← kopira se, ali ne prikazuje
  }))
}
```

Konto se sprema u bazu automatski, ali korisnik ga nikad ne vidi u formi.

---

## Korekcija 4 — Knjiga ulaznih računa: dodaj "Pripremi za knjigovođu"

U `KnjigaTab` komponenti, pored gumba "Export .xlsx" dodaj drugi gumb:

```tsx
<button onClick={handleExportKnjigov}
  className="px-4 py-2 bg-emerald-800/40 text-emerald-400 text-sm rounded-lg hover:bg-emerald-800/60">
  📊 Pripremi za knjigovođu
</button>
```

Funkcija `handleExportKnjigov`:

```ts
async function handleExportKnjigov() {
  const { utils, writeFile } = await import('xlsx')
  
  const ws = utils.json_to_sheet(stavke.map(s => ({
    'Datum računa':   s.datum_racuna,
    'Int. broj':      s.interni_broj || '',
    'Dobavljač':      s.naziv_stranke,
    'OIB dobavljača': s.oib_stranke || '',
    'Opis':           s.opis || '',
    'Konto':          s.racunski_konto || '',   // ← jedino mjesto gdje je vidljiv
    'Kategorija':     s.kategorija_plana || '',
    'Bez PDV (EUR)':  s.iznos_bez_pdv ?? '',
    'PDV (EUR)':      s.pdv_iznos ?? '',
    'Ukupno (EUR)':   s.iznos_ukupno,
    'Status':         s.status,
    'Plaćeno':        s.datum_placanja || '',
    'e-Račun':        s.je_eracun ? 'DA' : 'NE',
  })))
  
  // Oboji kolonu "Konto" žuto da se ističe
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, `Za knjigovođu ${godina}`)
  
  writeFile(wb, `DVD_${godina}_za_knjigov_${new Date().toISOString().split('T')[0]}.xlsx`)
}
```

### Ažuriraj VIEW `knjiga_ulaznih_racuna` u SQL-u:

```sql
-- Promijeni aop_konto u racunski_konto u VIEW definiciji:
CREATE OR REPLACE VIEW knjiga_ulaznih_racuna AS
SELECT
  ROW_NUMBER() OVER (
    PARTITION BY EXTRACT(YEAR FROM datum_racuna)
    ORDER BY datum_racuna, created_at
  )::int                               AS redni_broj,
  EXTRACT(YEAR FROM datum_racuna)::int AS godina,
  interni_broj,
  datum_racuna,
  naziv_stranke,
  oib_stranke,
  opis,
  iznos_bez_pdv,
  pdv_iznos,
  iznos_ukupno,
  status,
  racunski_konto,                       -- ← PROMJENA (bilo aop_konto)
  ps.naziv_stavke                       AS kategorija_plana,
  datum_placanja,
  lik.ime || ' ' || lik.prezime         AS likvidirao_ime,
  datum_odobravanja                     AS datum_likvidacije,
  izvor,
  eracun_document_id IS NOT NULL        AS je_eracun,
  created_at
FROM racuni r
LEFT JOIN financijski_plan_stavke ps ON ps.id = r.plan_stavka_id
LEFT JOIN korisnici lik ON lik.id = r.odobrio_id
WHERE r.vrsta = 'ulazni'
ORDER BY r.datum_racuna, r.created_at;
```

---

## Korekcija 5 — trigger: propagacija konta

U `sync_ostvareno_na_placanje` triggeru, dodaj propagaciju konta sa stavke plana:

```sql
CREATE OR REPLACE FUNCTION sync_ostvareno_na_placanje()
RETURNS TRIGGER AS $$
BEGIN
  -- Kopiraj konto s plan stavke ako nije već postavljen
  IF NEW.plan_stavka_id IS NOT NULL AND (NEW.racunski_konto IS NULL OR NEW.racunski_konto = '') THEN
    UPDATE racuni
    SET racunski_konto = (
      SELECT racunski_plan_konto FROM financijski_plan_stavke WHERE id = NEW.plan_stavka_id
    )
    WHERE id = NEW.id;
  END IF;

  -- ... ostatak triggera ostaje isti
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Sažetak promjena

| Što | Staro | Novo | Gdje |
|-----|-------|------|------|
| Ime polja u `racuni` | `aop_konto` | `racunski_konto` | SQL + TypeScript |
| Ime polja u `dobavljaci_kategorije` | `aop_konto` | `racunski_konto` | SQL + TypeScript |
| Vidljivost u formi | Prikazano (pogrešno) | Skriveno, auto-popunjava se | UI |
| Vidljivost u eksportu | Nije postojalo | Kolona "Konto" | xlsx |
| Seed data | Nema | UPDATE po ključnim riječima | SQL patch |
| VIEW knjiga | `aop_konto` | `racunski_konto` | SQL |

---

## Što se NE mijenja

- Kolona `racunski_plan_konto` na tablici `financijski_plan_stavke` ostaje kako jest — ime je ispravno
- AOP sifre (za FINA izvještaj) se ne dodaju sada — to je zasebna tema za Sprint s FINA modulom
- Sve ostale logike Sprint 010 ostaju iste

---

*Projekt: DVD Sarvaš ERP*
