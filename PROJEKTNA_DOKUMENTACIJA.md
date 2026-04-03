# DVD ERP — Projektna dokumentacija

> Sustav za digitalizaciju dokumentacije dobrovoljnih vatrogasnih društava
> Pilot: DVD Sarvaš · OIB: 48874677674 · Osnovan: 16.7.2011.

---

## 1. Pregled projekta

**DVD ERP** je web aplikacija koja zamjenjuje papirnatu dokumentaciju dobrovoljnih vatrogasnih društava. Pokriva evidenciju članstva, sjednice s generiranjem dokumenata, financijsko planiranje, račune s likvidacijom, zakonska izvješća, nabavu, imovinu, vatrogasnu djelatnost, vatrogasna zvanja i odlikovanja — sve prema stvarnim predlošcima i zakonskim obvezama DVD-a Sarvaš.

| Podatak | Vrijednost |
|---------|-----------|
| Verzija | 1.0 |
| Status | Spreman za produkciju |
| Ukupno linija koda | 12.136 |
| Broj datoteka | 58 TypeScript/TSX |
| Broj stranica | 20 |
| Broj ruta | 24 |
| Broj tablica u bazi | 30 |
| Query funkcija | 71+ |
| Document generatora | 10 |
| Validatora (Zod) | 3 |
| Dijeljenih komponenti | 6 |
| Zustand storeova | 3 |
| Utility modula | 3 |
| Migracije | 8 SQL datoteka |
| Seed datoteke | 5 |
| Tema | Dark UI s crvenim akcentom |
| Produkcijski cilj | Rujan 2026. |

---

## 2. Tehnički stack

| Sloj | Tehnologija | Verzija |
|------|-------------|---------|
| Frontend | React + TypeScript | 19.2 / 5.9 |
| Build | Vite | 8.0 |
| Routing | Wouter | 3.9 |
| State | Zustand (3 storea) | 5.0 |
| Forme | React Hook Form + Zod | — |
| CSS | Tailwind CSS (dark tema) | 4.2 |
| Datumi | date-fns (hr locale) | — |
| Backend/Auth/DB | Supabase (PostgreSQL + RLS) | — |
| Generiranje dokumenata | docx (Word) | 9.6 |
| Email | Resend (Edge Function) | — |
| Hosting (planirano) | Cloudflare Pages | — |

---

## 3. Arhitektura

```
Browser (React SPA — Dark UI)
    │
    ├── Supabase Auth (email + password, 8 uloga)
    ├── Supabase PostgreSQL (30 tablica + RLS)
    ├── Supabase Edge Functions (send-email)
    ├── Supabase Storage (dokumenti, skenovi, zdravstvena uvjerenja)
    └── Resend API (email s prilogom)
```

### Struktura projekta

```
src/
├── App.tsx                              # Router (24 rute)
├── main.tsx                             # Bootstrap (initAuth → render)
├── index.css                            # Tailwind v4 + dark tema varijable
│
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx                # Dark sidebar + topbar + user block
│   └── shared/                          # 6 dijeljenih komponenti
│       ├── StatusBadge.tsx              # 5 varijanti (sjednica/clan/izvjesce/nabava/racun)
│       ├── PageHeader.tsx               # Naslov + opis + akcije
│       ├── ConfirmDialog.tsx            # Modal za potvrdu (destruktivna varijanta)
│       ├── FileUpload.tsx               # Upload s validacijom veličine/tipa
│       ├── DocumentButton.tsx           # Generiranje dokumenata s loading stateom
│       └── EmailShareDialog.tsx         # Modal za slanje emailom
│
├── pages/                               # 20 stranica
│   ├── auth/Login.tsx                   # Split screen: hero foto + dark forma
│   ├── dashboard/Dashboard.tsx          # 5 KPI, alarmi, sjednice, 8 brzih akcija
│   ├── clanstvo/                        # M02: Lista, Detalji (6 tabova + zvanja + odlikovanja + upload uvjerenja), Forma
│   ├── sjednice/                        # M03: 3 liste, Detalji (dokumenti + dostava zapisnika), Forma (auto URBROJ)
│   ├── zapisnici/                       # M04: Centralna lista s filterima
│   ├── plan-rada/                       # M05: Kategorije, progress, auto-generiranje iz predložaka
│   ├── financije/                       # M06: Plan vs ostvareno, inline edit, auto-generiranje
│   ├── racuni/                          # Računi: unos+upload, likvidacija (tko/kad), plaćanje, skupno slanje knjigovođi
│   ├── zakonska-izvjesca/               # M07: Semafor, countdown, auto-generiranje 9 obveza
│   ├── nabava/                          # M08: Workflow zahtjev→plaćeno
│   ├── imovina/                         # M09: Vozila s rokovima (reg/teh/osig) + oprema, uređivanje, brisanje
│   ├── vatrogasna/                      # M10: Intervencije + Vježbe
│   ├── arhiva/                          # M11: Dokumenti po modulima
│   └── administracija/
│       ├── PostavkePage.tsx             # 4 taba: Korisnici/Uloge, Tijela DVD-a, Podaci DVD-a, GDPR export
│       ├── TijelaDVD.tsx                # UO + Zapovjedništvo prema Statutu
│       └── VatronetExport.tsx           # CSV export za VATROnet (članovi, vozila, oprema)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    # Supabase singleton
│   │   ├── auth.ts                      # signIn, signOut, initAuth
│   │   ├── email.ts                     # posaljiEmail (Edge Function wrapper)
│   │   └── queries/                     # 14 modula, 71+ funkcija
│   │       ├── clanovi.ts, sjednice.ts, tijela.ts, financije.ts
│   │       ├── plan-rada.ts, predlosci.ts, zakonska-izvjesca.ts
│   │       ├── nabava.ts, imovina.ts, vatrogasna.ts, dokumenti.ts
│   │       ├── zdravlje.ts, zvanja.ts, korisnici.ts
│   ├── documents/
│   │   ├── sjednice-docs.ts             # 10 Word generatora s memorandumom + logom
│   │   └── email-templates.ts           # 4 HTML email predloška
│   ├── validators/                      # Zod validacijske sheme
│   │   ├── clan.schema.ts              # OIB validacija (mod 11)
│   │   ├── sjednica.schema.ts
│   │   └── nabava.schema.ts
│   └── utils/
│       ├── urbroj.ts                    # URBROJ/KLASA auto-generator
│       ├── formatters.ts                # formatDate, formatEUR, validateOIB, formatPhone (date-fns hr)
│       └── rokovi.ts                    # daniDo, statusRoka, bojaRoka, countdownTekst
│
├── store/                               # 3 Zustand storea
│   ├── auth.store.ts                    # Korisnik, uloga, 6 permission helpera
│   ├── dvd.store.ts                     # DVD konfiguracija (naziv, OIB, IBAN, adresa, predsjednik)
│   └── notifications.store.ts           # Alarmi iz baze (izvješća, vozila, zdravlje)
│
└── types/
    └── database.types.ts                # Supabase generirani tipovi (30 tablica)
```

---

## 4. Moduli (11 + Računi + Administracija)

### M01 · Nadzorna ploča (`/`)
5 KPI kartica, rokovi i upozorenja (zakonska izvješća, registracije vozila, zdravstveni pregledi, dostava zapisnika), nedavne sjednice, 8 brzih akcija

### M02 · Evidencija članstva (`/clanstvo`)
Lista s filterima, 6 tabova (osobno, vatrogasno+zvanja+odlikovanja, zdravlje+upload uvjerenja, članarina, aktivnosti, dokumenti), dodavanje/uređivanje

### M03 · Sjednice (`/sjednice/*`)
3 liste (Skupštine/UO/Zapovjedništvo), auto URBROJ/KLASA, dnevni red s pod-točkama, prisutnost prema tijelima, 7 Word dokumenata s memorandumom+logom, email dijeljenje, dostava zapisnika s uploadom potvrde

### M04 · Zapisnici (`/zapisnici`)
Centralna lista, filteri (vrsta/status/godina/pretraživanje)

### M05 · Plan rada (`/plan-rada`)
Kategorije s progress barom, auto-generiranje iz 23 predložaka

### M06 · Financijski plan (`/financije`)
Plan vs ostvareno po kontima, inline edit, auto-generiranje iz predložaka

### Računi (`/racuni`)
Unos s auto brojem (URA-2026-001) + upload, likvidacija (predsjednik, bilježi tko/kad), plaćanje, skupno slanje knjigovođi, filter po statusu/godini

### M07 · Zakonska izvješća (`/zakonska-izvjesca`)
Semafor (zeleno/žuto/crveno/pulsirajuće), countdown, auto-generiranje 9 obveza za godinu

### M08 · Nabava (`/nabava`)
Workflow zahtjev→odobreno→naručeno→isporučeno→plaćeno

### M09 · Imovina i vozila (`/imovina`)
Vozila s rokovima (registracija/tehnički/osiguranje), oprema, uređivanje/brisanje, promjena statusa

### M10 · Vatrogasna djelatnost (`/vatrogasna`)
Intervencije (požar/tehnička/preventivna/dežurstvo) + Vježbe

### M11 · Arhiva dokumenata (`/arhiva`)
Centralna arhiva po modulima, pretraživanje

### Administracija (`/postavke`)
4 taba: Korisnici i uloge (dodavanje/promjena uloge/deaktivacija), Tijela DVD-a (UO 9 članova + Zapovjedništvo), Podaci DVD-a, Moji podaci (GDPR export)

### VATROnet export (`/vatronet`)
3 CSV exporta (članovi, vozila, oprema) s mapiranjem polja za ručni unos u VATROnet

---

## 5. Vatrogasna zvanja i odlikovanja

12 zvanja za dobrovoljne vatrogasce prema Pravilniku NN 89/2024, 15 tipova odlikovanja prema HVZ pravilniku, povijest zvanja po članu, automatsko praćenje uvjeta za napredovanje.

---

## 6. Baza podataka (30 tablica, 8 migracija)

| Migracija | Opis |
|-----------|------|
| 001 | Sve tablice, enumi, triggeri, indeksi |
| 002 | Row Level Security + Storage bucket |
| 003 | pg_cron: daily reminders, weekly cleanup |
| 004 | Tijela DVD-a + seed iz Matičnog lista |
| 005 | Predlošci plana rada (23) + financijskog plana (25) |
| 006 | Vatrogasna zvanja (12) + odlikovanja + povijest zvanja |
| 007 | Popravke RLS za sve tablice |
| 008 | Pravne popravke (dostava zapisnika) |

Seed: seed.sql, seed_clanovi.sql, seed_clanovi_update.sql, seed_test_podaci.sql, seed_imovina.sql

---

## 7. Korisničke uloge (8)

admin, predsjednik, zamjenik, tajnik, blagajnik, zapovjednik, zamjenik_zapovjednika, clan

---

## 8. Pravni okvir

Usklađeno s: Zakon o vatrogastvu (NN 125/19), Pravilnik o zvanjima (NN 89/2024), Zakon o udrugama (NN 74/14), Zakon o fin. poslovanju NP (NN 121/14), GDPR, Statut DVD Sarvaš (2021)

Detaljne analize: `ANALIZA_PRAVNI_OKVIR.md`

---

## 9. Dizajn

Dark tema s crvenim akcentom. Sidebar (#1a1a1e), kartice (#242428), borderi (#333338). Login: split screen s hero fotografijom DVD-a. Logo DVD-a u sidebaru i dokumentima.

---

## 10. Kontakt

| Uloga | Osoba |
|-------|-------|
| Predsjednik DVD Sarvaš | Atila Vadoci |
| Razvoj | Atila Vadoci |
| Email | dvdsarvas@gmail.com |

---

*Dokumentacija ažurirana 30.03.2026. · DVD ERP v1.0*
