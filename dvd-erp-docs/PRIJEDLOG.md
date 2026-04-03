# PRIJEDLOG — Arhitekturalne odluke i obrazloženja

Ovaj dokument bilježi svaku ključnu arhitekturalnu odluku,
zašto je donesena i koje su alternative razmatrane.
Služi kao referenca pri onboardingu novog developera ili reviziji sustava.

---

## 1. Frontend: React 18 + TypeScript + Vite + Wouter

**Odluka:** Koristiti isti stack koji tim već poznaje.

**Zašto ne Next.js:**
Next.js je odbačen jer dodaje SSR kompleksnost bez stvarne koristi za ovaj projekt.
DVD ERP je autentificirana aplikacija — sav sadržaj je iza login zida, nema javnih
stranica koje trebaju SEO ili server-side rendering. SPA s direktnim Supabase upitima
je jednostavniji, brži za razvoj i lakši za debugging.

**Wouter umjesto React Router:**
Dovoljan za SPA routing, manji bundle, tim ga poznaje.

**Zustand za globalni state:**
Tri store-a: `auth` (korisnik, uloga), `dvd` (aktivna org., config, branding),
`notifications` (alarmi, rokovi). Sve ostalo je lokalni state komponente.
Ne koristiti Zustand za server state — to ide kroz Supabase query hooks.

---

## 2. Backend: Supabase direktno, bez custom API sloja

**Odluka:** React → Supabase JS klijent → PostgreSQL. Bez REST API-ja između.

**Zašto:**
Supabase Row Level Security zamjenjuje API autorizacijski sloj.
Supabase JS klijent je type-safe kroz generirane tipove (`supabase gen types typescript`).
Manje koda, manje surface area za bugove, manje infrastrukture za održavanje.

**Iznimka — Edge Functions (samo 2):**
- `send-reminder`: dnevni cron za email alarme — mora biti server-side jer browser nije
  otvoren 24/7
- `onboarding-init`: inicijalizacija novog DVD projekta — treba service_role za setup

Sve ostalo (CRUD, pretraživanje, upload, generiranje dokumenata) ide client-side.

---

## 3. Multi-tenancy: jedan Supabase projekt po DVD-u

**Odluka:** Potpuna izolacija — svaki DVD = vlastiti Supabase projekt.

**Alternative razmatrane:**

| Opcija | Opis | Zašto odbačena |
|---|---|---|
| Row-level (dvd_id stupac) | Jedan projekt, RLS filtrira po DVD | RLS bug = podaci curiju između DVD-ova. GDPR rizik. |
| Schema-per-tenant | Jedan projekt, zasebni PostgreSQL schema po DVD-u | Kompleksno upravljanje, Supabase ne podržava dobro |
| Jedan projekt po DVD-u ✓ | Potpuna izolacija | Odabrano |

**Prednosti odabranog:**
- Free tier (500MB + 2GB storage) dovoljan za jedan DVD godinama → 0 EUR/mj.
- GDPR trivijalan — nema šanse curenja između organizacija
- Nezavisne migracije — možete testirati novu verziju sheme na Sarvaš bez rizika za ostale
- Backup/restore po DVD-u je trivijalan

**Jedini tradeoff: migracije**
Riješeno sa `scripts/migrate-all.sh` — jedna skripta iterira sve projekte.
Supabase CLI `db push` je idempotent, sigurno za pokretanje više puta.

---

## 4. Subdomain routing: sarvas.dvd-erp.hr

**Odluka:** Svaki DVD dobiva subdomenu. App pri pokretanju resolva subdomenu
u Supabase URL + anon key putem centralnog meta-registryja.

**Flow:**
```
Browser otvori sarvas.dvd-erp.hr
  → App čita subdomenu iz window.location.hostname
  → Poziva meta-registry: "koji Supabase projekt je za 'sarvas'?"
  → Dobiva URL + anon key → kreira Supabase klijent
  → Normalna auth + RLS sesija
```

**Meta-registry:**
Mali, zasebni Supabase projekt koji drži samo mapiranje
`subdomena → supabase_url + anon_key`. Nema korisničkih podataka.
Javno čitljiv (anon key) jer su URL i anon key sami po sebi ne-osjetljivi —
zaštita je u RLS na svakom DVD projektu.

**Lokalni razvoj:**
`VITE_DEV_MODE=true` u `.env.local` preskoči subdomain resolve i koristi
direktno `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY` iz `.env.local`.

---

## 5. Generiranje dokumenata: client-side

**Odluka:** Svi docx i pdf dokumenti generiraju se u browseru korisnika.

**Zašto ne server-side:**
- Nema serverskih troškova (Lambda/Function invokacija)
- Nema latencije round-trip
- Browser ima dovoljno resursa za dokumente veličine kakve DVD koristi
- `docx` i `pdfmake` su zrele biblioteke s TypeScript tipovima

**Predlošci su TypeScript funkcije:**
```
src/lib/documents/
  zapisnik-skupstine.ts      → (sjednica: Sjednica) => Promise<Blob>
  pozivnica-sjednice.ts      → (sjednica: Sjednica) => Promise<Blob>
  financijski-plan.ts        → (plan: FinancijskiPlan) => Promise<Blob>
  popis-clanova.ts           → (filtri: ClanFilter) => Promise<Blob>
  narudzbenica.ts            → (nabava: Nabava) => Promise<Blob>
  pristupnica.ts             → (clan?: Partial<Clan>) => Promise<Blob>
```

Svaka funkcija prima typed podatke iz Supabase, vraća `Blob`, browser preuzima.

---

## 6. Email i alarmi: Resend + pg_cron

**Odluka:** pg_cron okida Edge Function svaki dan u 07:00.
Edge Function pita bazu za nadolazeće rokove i šalje emailove putem Resend API-ja.

**Zašto Resend:**
- Jednostavan API, odličan DX
- Free tier: 3000 emailova/mj — dovoljan za jedan DVD
- Dobre deliverability stope

**Što se prati (rokovi za alarme):**

| Što | Koliko dana ranije | Primatelj |
|---|---|---|
| Zakonska izvješća (FINA, JLS...) | 30, 14, 7 | Predsjednik + Blagajnik |
| Istek registracije vozila | 60, 30 | Predsjednik |
| Istek tehničkog pregleda | 60, 30 | Predsjednik |
| Istek zdravstvenog pregleda vatrogasca | 60, 30 | Predsjednik + Zapovjednik |
| Istek certifikata opreme | 60, 30 | Zapovjednik |
| Neplaćena članarina (godišnji podsjetnik) | 1. veljače | Predsjednik + Tajnik |

---

## 7. Onboarding novog DVD-a: polu-automatski wizard

**Odluka:** Admin (vi) priprema Supabase projekt ručno, DVD predsjednik prolazi
onboarding wizard koji popunjava podatke.

**Zašto ne potpuno automatski:**
Supabase Management API postoji ali je nestabilan i zahtijeva service_role tokene
koje ne smijemo izlagati u browser kontekstu. Ručno kreiranje projekta traje
~5 minuta i daje potpunu kontrolu nad postavkama (region, backup schedule, itd.).

**Tijek:**
```
Admin (jednom):
  1. Kreira Supabase projekt za novi DVD
  2. Pokrene: supabase db push --db-url <novi_projekt>
  3. Doda projekt u meta-registry (naziv, slug, subdomena, URL, anon key)
  4. Pošalje predsjedniku link: novidvd.dvd-erp.hr/onboarding

Predsjednik (wizard - 4 koraka ~15 min):
  Korak 1: Podaci organizacije (naziv, OIB, adresa, JLS, vatrogasna zajednica)
  Korak 2: Branding (logo upload, primarna boja)
  Korak 3: Kreiranje admin korisnika (email, lozinka)
  Korak 4: Uvoz članova (CSV template ili ručni unos prvih članova)

  → Edge Function onboarding-init:
    - Kreira inicijalnu strukturu (kategorije, vrste sjednica, zakonska izvješća za tekuću god.)
    - Šalje welcome email predsjedniku
    - Postavlja aktivan = true u meta-registryju
```

---

## 8. Sigurnost i GDPR

**Ključne odluke:**

**RLS je jedina zaštita — ne oslanjati se na frontend:**
Supabase anon ključ je javan u browseru. Jedina stvar koja sprječava korisnika da vidi
tuđe podatke je RLS policy na bazi. Svaka tablica mora imati restriktivan policy.
Testirati izolaciju: korisnik s ulogom `clan` ne smije moći vidjeti OIB tuđih članova
čak i direktnim Supabase API pozivom iz DevToolsa.

**Osobni podaci samo za ovlaštene uloge:**
OIB, adresa, kontakt, zdravstveni podaci — RLS policy ograničava na
`predsjednik`, `tajnik`, `admin`. Član može čitati samo vlastite podatke.

**Revizijski trag automatski:**
Baza trigger na svim tablicama s osobnim podacima piše u `revizijski_trag`.
Nikad ne pisati revizijski trag ručno iz aplikacije.

---

## 9. Što je svjesno izostavljeno iz v1.0

| Stvar | Zašto ne |
|---|---|
| Prisma ORM | Nepotreban sloj — Supabase JS klijent je type-safe kroz generirane tipove |
| Next.js | Nema benefita za autentificiranu SPA aplikaciju |
| Dvojno knjigovodstvo | DVD Sarvaš je ispod praga, jednostavno je dostatno. Dodati ako tražnja postoji |
| HVZ IS integracija | HVZ nema javni API. Faza 5 — pratiti razvoj |
| Offline mode | Internet je pouzdan u DVD Sarvaš. Složenost nije opravdana |
| Mobilna aplikacija | PWA (Cloudflare Pages) je dovoljna za mobilni pristup |
| Online glasanje | Zahtijeva izmjenu statuta. Razmotriti u v2 |
