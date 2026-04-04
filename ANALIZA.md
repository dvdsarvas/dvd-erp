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

## Tehnicke napomene

**Bundle size:** ~1.5MB JS + 283KB xlsx (lazy loaded). Preporuka: code splitting.

**Database types:** database.types.ts je zastarjeo — ne sadrzi tablice iz migracija 009-013. Sve nove tablice koriste "as any" cast. Prioritetno regenerirati nakon pokretanja migracija.

**Auth flow:** Koristi promise dedup pattern za sprecavanje paralelnih loadKorisnik poziva. App.tsx gate-a na oba loading statea (auth + dvd store).

**CSS:** Sve boje su na CSS varijablama (:root u index.css). Komponente koriste inline style s var(--...) umjesto Tailwind klasa za boje.
