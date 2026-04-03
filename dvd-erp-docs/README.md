# DVD ERP — Sustav upravljanja dobrovoljnim vatrogasnim društvom

Sveobuhvatan digitalni sustav koji zamjenjuje papirnu i Excel dokumentaciju DVD-a.
Razvijen za DVD Sarvaš kao pilot — dizajniran za multi-tenant deployment na sve DVD-ove u RH.

---

## Stack

```
React 18 + TypeScript + Vite + Wouter + Zustand
Supabase (PostgreSQL + Auth + Storage + Edge Functions + pg_cron)
Cloudflare Pages  ·  Resend  ·  docx + pdfmake
Shadcn/ui + Tailwind CSS
```

## Stvarni podaci DVD Sarvaš (pilot)

```
OIB: 48874677674  ·  MBS: 2794586  ·  RNO: 197128
IBAN: HR43 2340009 1110673705
Sjedište: Ivana Mažuranića 31, 31000 Sarvaš
Subdomena: sarvas.dvd-erp.hr
Članovi: 46 s pravom glasa (2026.)
Aktivan sastav UO i Zapovjedništva: od 20. 2. 2026. (15. skupština)
```

---

## Zakonska osnova

| Zakon | NN | Pokriva |
|---|---|---|
| Zakon o vatrogastvu | 125/19, 114/22, 155/23 | Kategorije članova, djelatnost, financiranje |
| Zakon o udrugama | 74/14, 70/17, 98/19, 151/22 | Skupštine, popis članova, izvješća |
| Zakon o fin. poslovanju NP | 121/14, 114/22 | Poslovne knjige, FINA izvješća, prag |
| GDPR + NN 42/18 | EU 2016/679 | Osobni podaci članova |
| Pravilnik o vatrog. zvanjima | NN 21/2026 | Evidencija zvanja operativnih vatrogasaca |

---

## Moduli (11)

```
M01  Nadzorna ploča           KPI, upozorenja, rokovi, activity feed
M02  Članstvo                 Evidencija (NOVO list), zvanja, zdravlje, clanarina, GDPR
M03  Sjednice                 Skupštine (protokol+zapisnik+upisnice), UO, Zapovjedništvo
M04  Zapisnici                Arhiva potpisanih zapisnika, dostava UD OBŽ
M05  Plan rada                23 stavke plan rada, praćenje realizacije
M06  Financijsko planiranje   Fin. plan (Računski plan NP), poslovne knjige, računi
M07  Zakonska izvješća        FINA Q1-Q4 + godišnje, skupštinska, JLS, registar
M08  Nabava                   Narudžbenice, ponude, likvidatura, pravilnik nabave
M09  Imovina i vozila         AOP 0221-0231, knjiga vozila, servisi, putni nalozi
M10  Vatrogasna djelatnost    Intervencije, vježbe, natjecanja, HVZ IS
M11  Arhiva dokumenata        11 kategorija prema stvarnoj strukturi DVD-a
```

---

## Projektna dokumentacija

| Datoteka | Sadržaj |
|---|---|
| `PRIJEDLOG.md` | Sve arhitekturalne odluke s obrazloženjima |
| `ARHITEKTURA.md` | Stack, multi-tenancy, subdomain routing, struktura projekta |
| `KORISNICI_I_ULOGE.md` | Auth, 7 uloga, matrica prava, login flow, RLS za korisnike |
| `MODULI.md` | Detaljan opis svakog modula — temelji se na stvarnim dokumentima DVD Sarvaš |
| `BAZA_PODATAKA.md` | Sve tablice s komentarima iz kojih su datoteka izvedene |
| `PREDLOSCI_DOKUMENATA.md` | 20+ predložaka — svaki s izvornim dokumentom i TypeScript signaturom |
| `ZAKONSKE_OBVEZE.md` | Mapiranje zakona na module i rokove |
| `UX_KORISNICI.md` | Uloge, user flows, navigacija |
| `SIGURNOST_GDPR.md` | GDPR, autentikacija, RLS, backup |
| `TODO.md` | 100+ zadataka po fazama s MoSCoW prioritetima |

## SQL i kod

| Datoteka | Sadržaj |
|---|---|
| `supabase/migrations/001_initial_schema.sql` | Sve tablice + triggeri + indeksi |
| `supabase/migrations/002_rls_policies.sql` | RLS policies + Storage config |
| `supabase/migrations/003_cron_jobs.sql` | pg_cron: dnevni alarmi + godišnje kreiranje izvješća |
| `supabase/seed.sql` | Početni podaci za DVD Sarvaš (izvješća, fin. plan, plan rada) |
| `supabase/functions/send-reminder/index.ts` | Edge Function: dnevni email alarmi |
| `supabase/functions/onboarding-init/index.ts` | Edge Function: inicijalizacija novog DVD-a |
| `scripts/migrate-all.sh` | Pokretanje migracija na svim DVD projektima |
| `scripts/projects.env.example` | Template za popis projekata |
| `.env.example` | Template za lokalni razvoj |

---

## Status

**Faza:** 0 — Dokumentacija završena  
**Pilot:** DVD Sarvaš — Vatrogasna zajednica Osječko-baranjske županije  
**Cilj produkcije:** Rujan 2026.
