# DVD ERP — Analiza projekta

> Zadnje azuriranje: 4. travnja 2026.

---

## Stanje projekta

| Metrika | Vrijednost |
|---------|-----------|
| Sprintovi zavrseni | 009, 010, 011, 012, 013 |
| Broj stranica | 22 |
| Broj ruta | 28 |
| Migracije | 13 SQL datoteka |
| UI tema | Dark + magenta akcenti, framer-motion animacije |

---

## Implementirani moduli

| Modul | Status | Kljucne funkcionalnosti |
|-------|--------|------------------------|
| Auth | Gotovo | Login, uloge (8), RLS, session management |
| Dashboard | Gotovo | KPI animirani counteri, AreaChart + BarChart, alarmi |
| Clanstvo | Gotovo | CRUD, certifikati, zdravstveni pregledi, clanarine, skeleton loading |
| Sjednice | Gotovo | 3 vrste, dnevni red, prisutnost, kvorum, kopiranje prosle sjednice |
| Zapisnici | Gotovo | Centralna lista, PDF viewer |
| Plan rada | Gotovo | Aktivnosti, status pracenje, generiranje iz predlozaka |
| Financije | Gotovo | Plan vs ostvareno (auto iz racuna), inline konto editing |
| Racuni | Gotovo | Workflow, kategorizacija, e-Racun XML upload, knjiga ulaznih, analiza tab |
| Zakonska izvjesca | Gotovo | Semafor, upload potvrda |
| Nabava | Gotovo | Zahtjevi, ponude, odobravanje |
| Imovina | Gotovo | Registracija, tehnicki, servisna knjiga |
| Vatrogasna djel. | Gotovo | Intervencije, vjezbe |
| Arhiva | Gotovo | Upload, pretraga, kategorije |
| Postavke | Gotovo | Korisnici, tijela, podaci DVD-a (editable), zakonske obveze (wiki), e-Racun config, GDPR |
| Akcijski centar | Gotovo | Proaktivna to-do lista s prioritetima |
| Skupstina wizard | Gotovo | Jedan klik, 6 docx dokumenata |
| Bank import | Gotovo | CSV parser (Erste/PBZ/ZABA), upload + pregled |
| e-Racun | Gotovo | XML parser, Edge Function sync, konfiguracija UI |
| Weekly digest | Gotovo | Agregirani tjedni email predsjedniku |

---

## Pronadjeni i rijeseni bugovi

| Bug | Uzrok | Rjesenje |
|-----|-------|---------|
| Potreban refresh nakon logina | `dvdStore.init()` nije awaitan, app renderira prerano | Promise dedup pattern, await init, dual loading gate |
| XML upload ne radi | Parser uzima krivog dobavljaca (kupac umjesto supplierta), nema try-catch | AccountingSupplierParty parsing, regex fallback, error handling |
| Sidebar bljeskne "DVD ERP" | dvdStore loading nije u App.tsx gate-u | Dodan dvdStore.loading check |
| Tailwind opacity /200 | Neispravne klase, puna boja bez prozirnosti | Zamijenjeno s /20 u 4 fajla |
| Dupliciran validateOIB | Ista logika u formatters.ts i clan.schema.ts | Import iz formatters.ts |
| select('*') dohvaca JMBG | Osjetljivi podaci u list query-u | Eksplicitne kolumne |
| aop_konto krivo ime | Pomijesani AOP i konto koncepti | Preimenovano u racunski_konto |
| VIEW ambiguous created_at | JOIN bez table aliasa | Dodani r. prefiksi |
| VIEW bigint->int error | CREATE OR REPLACE ne dozvoljava type change | DROP + CREATE |

---

## Sto nedostaje do produkcije

### Visoki prioritet
- [ ] Pokrenuti migracije 009-013 na Supabase (supabase db push)
- [ ] Regenerirati database.types.ts (supabase gen types)
- [ ] Ukloniti "as any" castove nakon regeneracije tipova
- [ ] Testirati auth flow na produkciji (race conditions)

### Srednji prioritet
- [ ] Knjiga primitaka i izdataka (zakonski dokument)
- [ ] FINA izvjestaj priprema (G-PR-IZ-NPF obrazac)
- [ ] Spajanje bank transakcija s racunima (smart matching)
- [ ] Code splitting (bundle > 500kB)

### Nizak prioritet
- [ ] Multi-tenant onboarding (Sprint 014 — ceka arhitekturne odluke)
- [ ] Godisnji setup wizard
- [ ] useEffect cancelled pattern na svim async hookovima

---

## Automatizacije u sustavu

| Rucni posao | Automatizirano |
|-------------|---------------|
| Azuriraj predsjednika u postavkama | VIEW trenutni_funkcioneri iz tijela_dvd |
| Unesi ostvareno u fin. plan | Trigger sync_ostvareno_na_placanje |
| Zapamti kategoriju dobavljaca | Tablica dobavljaci_kategorije + auto-prijedlog |
| Vodi knjigu ulaznih racuna | VIEW knjiga_ulaznih_racuna (auto-maintained) |
| Preuzmi e-racune | Edge Function sync-eracuni (svakih sat) |
| Pripremi skupstinu (6 dokumenata) | skupstina-paket.ts — jedan klik |
| Tjedni pregled za predsjednika | Weekly digest email (ponedjeljkom) |
| Kopiraj konto sa stavke plana | Trigger propagacija u racun |

---

## Deployano na Supabase (4. travnja 2026.)

### Edge Functions (deployed)

| Funkcija | Status | Opis |
|----------|--------|------|
| sync-eracuni | Deployed | Automatsko preuzimanje e-racuna iz ePoslovanje/mojeRacun (pg_cron svakih sat) |
| send-reminder | Deployed | Dnevni alarmi + tjedni digest email predsjedniku (ponedjeljkom) |
| test-eracun-vezu | Deployed | Test API veze za Postavke → e-Racun tab (proxy za CORS) |
| send-email | Ranije deployed | Genericko slanje emaila putem Resend API |
| onboarding-init | Deployed | Inicijalizacija novog DVD-a (multi-tenant priprema) |

Dashboard: https://supabase.com/dashboard/project/hhbfgznjjmgqsmxphhzf/functions

### Migracije (status na bazi)

| Migracija | Na bazi | Opis |
|-----------|---------|------|
| 001-008 | Da | Inicijalna shema, RLS, cron, tijela, predlosci, zvanja |
| 009 | Da | dvd_organizacija + view trenutni_funkcioneri |
| 010 | Da | zakonski_sadrzaj + seed 14 stavki |
| 011 | Da | racuni kategorija + trigger + knjiga view |
| 011b | Da | aop_konto → racunski_konto rename |
| 012 | Da | bank_transakcije |
| 013 | Ceka | eracun_integracija (kolumne + eracun_konfiguracija) |

### Sto jos treba deployati

- [ ] Migracija 013 (eracun_integracija) — pokrenuti u SQL Editoru
- [ ] Regenerirati database.types.ts nakon svih migracija
- [ ] Postaviti RESEND_API_KEY kao secret za Edge Functions
- [ ] Postaviti pg_cron job za sync-eracuni i send-reminder

---

## Tehnicke napomene

**Bundle size:** ~1.5MB JS + 283KB xlsx (lazy loaded). Preporuka: code splitting.

**Database types:** database.types.ts je zastarjeo — ne sadrzi tablice iz migracija 009-013. Sve nove tablice koriste "as any" cast. Prioritetno regenerirati nakon pokretanja migracija.

**Auth flow:** Koristi promise dedup pattern za sprecavanje paralelnih loadKorisnik poziva. App.tsx gate-a na oba loading statea (auth + dvd store).

**CSS:** Sve boje su na CSS varijablama (:root u index.css). Komponente koriste inline style s var(--...) umjesto Tailwind klasa za boje.

---

## Deployano na Cloudflare (4. travnja 2026.)

### Hosting

**Platforma:** Cloudflare Workers with Static Assets (unified Workers + Pages)
**URL:** https://dvd-erp.dvdsarvas.workers.dev
**Repo veza:** GitHub dvdsarvas/dvd-erp → auto-deploy na push u master

### Konfiguracija

- `wrangler.jsonc` — assets.directory = "./dist", not_found_handling = "single-page-application"
- `.env.production` — VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY (publishable key je javan, stvarna sigurnost je u RLS)
- Build command: `npm run build`
- Output directory: `dist`

### Rijeseni deploy problemi

| Problem | Uzrok | Rjesenje |
|---------|-------|---------|
| `_redirects` infinite loop | Worker format ne podrzava _redirects | Zamijenjeno s wrangler.jsonc not_found_handling |
| Supabase URL/KEY undefined u bundle-u | Env vars nisu dostupne u build time | .env.production commitan u repo (public key) |
| Krivi dobavljac u XML parseru | getElementsByTagNameNS vraca prvi match u cijelom dokumentu | Parsing unutar AccountingSupplierParty bloka + regex fallback |
| VIEW knjiga_ulaznih_racuna ambiguous | JOIN bez table aliasa | r. prefiksi na sve kolumne |

---

## Ispravci mer/ePoslovanje API (4. travnja 2026.)

### sync-eracuni i test-eracun-vezu

Edge Functions ispravljene prema stvarnoj Postman kolekciji mojeRacun API-ja:

| Sto | Staro | Novo |
|-----|-------|------|
| Base URL | `https://api.moj-eracun.hr/apis/v2` | `https://moj-eracun.hr/apis/v2` |
| Auth payload | `{ username, password, companyId }` | `{ Username, Password, CompanyId, SoftwareId }` — PascalCase |
| SoftwareId | Nedostajao | `"DVD-ERP-001"` u svim zahtjevima |
| Dokument ID | string `documentId` | integer `ElectronicID` |
| Preuzimanje | `GET /receiveDocument/:id` | `POST /receive` s body `{ ElectronicID }` |
| Potvrda | `POST /notifyimport/:id` | `POST /UpdateDokumentProcessStatus` s `{ ElectronicId, StatusId: 4 }` |

StatusId 4 = `RECEIVING_CONFIRMED` — javlja posredniku da smo uspjesno preuzeli i mozemo ga maknuti iz inboxa.

Obje funkcije deployane:
- `supabase functions deploy sync-eracuni` — OK
- `supabase functions deploy test-eracun-vezu` — OK

---

## Sljedeci koraci

1. Provjeriti produkcijski deploy na https://dvd-erp.dvdsarvas.workers.dev
2. Postaviti custom domain (npr. dvdsarvas.hr ili app.dvdsarvas.hr)
3. Testirati e-Racun sync s pravim ePoslovanje kredencijalima
4. Regenerirati database.types.ts i maknuti `as any` castove
5. Code splitting za smanjenje bundle size-a
