# TODO — DVD ERP

> `- [ ]` nije početo · `- [~]` u tijeku · `- [x]` završeno  
> Procjena je u danima rada (1 dan ≈ 6h)

---

## FAZA 0 — Projektna dokumentacija
**Rok:** Travanj 2026. · **Procjena:** 5 dana

- [x] README.md
- [x] PRIJEDLOG.md — sažetak arhitekturalnih odluka
- [x] ARHITEKTURA.md
- [x] MODULI.md
- [x] BAZA_PODATAKA.md
- [x] PREDLOSCI_DOKUMENATA.md
- [x] ZAKONSKE_OBVEZE.md
- [x] UX_KORISNICI.md
- [x] SIGURNOST_GDPR.md
- [x] TODO.md
- [x] supabase/migrations/001_initial_schema.sql
- [x] supabase/migrations/002_rls_policies.sql
- [x] supabase/migrations/003_cron_jobs.sql
- [x] supabase/seed.sql
- [x] supabase/functions/send-reminder/index.ts
- [x] supabase/functions/onboarding-init/index.ts
- [x] scripts/migrate-all.sh
- [x] .env.example
- [x] KORISNICI_I_ULOGE.md — auth, uloge, matrica prava, login flow
- [ ] Wireframes — skice ekrana za ključne module (papir ili Figma)
- [ ] Validacija dokumentacije — pregled s predsjednikom DVD Sarvaš

---

## FAZA 1 — Temelji
**Rok:** Svibanj 2026. · **Procjena:** 7 dana

### Inicijalizacija projekta
- [ ] `npm create vite@latest dvd-erp -- --template react-ts`
- [ ] Instalacija: `wouter zustand @supabase/supabase-js`
- [ ] Instalacija: `tailwindcss @tailwindcss/vite`
- [ ] Instalacija: `shadcn/ui` init + base komponente (Button, Input, Table, Card, Badge, Dialog, Select, Tabs)
- [ ] Instalacija: `react-hook-form zod @hookform/resolvers`
- [ ] Instalacija: `date-fns`
- [ ] Instalacija: `docx pdfmake file-saver @types/file-saver`
- [ ] Konfiguracija path aliases (`@/` → `src/`)
- [ ] Konfiguracija Tailwind
- [ ] Struktura mapa prema ARHITEKTURA.md

### Supabase
- [ ] Kreiranje Supabase projekta za DVD Sarvaš
- [ ] Pokretanje migracija: `supabase db push` (001, 002, 003)
- [ ] Pokretanje seed-a: `supabase db seed`
- [ ] `scripts/import-sarvas-data.ts` — uvoz stvarnih podataka iz Excel datoteka
- [ ] `supabase gen types typescript --project-id <id> > src/types/database.types.ts`
- [ ] Testiranje RLS izolacije: pokušaj dohvata podataka bez auth → treba odbiti

### Supabase Auth i inicijalizacija klijenta
- [ ] `src/lib/supabase/client.ts` — `initSupabase()` s dev mode
- [ ] `src/lib/supabase/auth.ts` — signIn, signOut, onAuthStateChange
- [ ] Zustand `auth.store.ts` — korisnik, uloga, loading
- [ ] Zustand `dvd.store.ts` — naziv, boja, logo
- [ ] Zustand `notifications.store.ts` — alarmi, nepročitano

### Layout i routing
- [ ] `App.tsx` — Wouter `<Switch>` s rutama
- [ ] `components/layout/AppLayout.tsx` — zaštićeni layout (redirect na login)
- [ ] `components/layout/Sidebar.tsx` — navigacija, aktivna stavka, badgevi
- [ ] `components/layout/Topbar.tsx` — naziv DVD-a, korisnik, odjava
- [ ] `pages/auth/Login.tsx` — forma, validacija, error handling
- [ ] `pages/auth/ResetPassword.tsx`
- [ ] Protected route — redirect na `/login` ako nema sesije

### Shared komponente
- [ ] `components/shared/StatusBadge.tsx` — boja prema statusu
- [ ] `components/shared/DataTable.tsx` — sortiranje, paginacija, filtriranje
- [ ] `components/shared/PageHeader.tsx` — naslov + akcijski gumbi
- [ ] `components/shared/ConfirmDialog.tsx` — potvrda destruktivnih akcija
- [ ] `components/shared/FileUpload.tsx` — drag & drop, Supabase Storage upload
- [ ] `components/shared/DocumentButton.tsx` — okida generiranje docx/pdf

### Utils
- [ ] `lib/utils/urbroj.ts` — `generirajUrbroj()`, `generirajKlasu()`
- [ ] `lib/utils/rokovi.ts` — `daniDo()`, `statusRoka()`, `bojaRoka()`
- [ ] `lib/utils/formatters.ts` — `formatDate()`, `formatEUR()`, `validateOIB()`

---

## FAZA 2 — Osnovni moduli (MVP)
**Rok:** Lipanj–Srpanj 2026. · **Procjena:** 22 dana

### M01 · Nadzorna ploča
- [ ] KPI kartice: aktivni članovi, otvorena izvješća, neplaćena članarina, % realizacije fin. plana
- [ ] Lista upozorenja s rokovima (7/14/30 dana) — boje prema hitnosti
- [ ] Activity feed — zadnjih 10 promjena
- [ ] Mini kalendar — nadolazeće sjednice i rokovi
- [ ] Gumbi za brze akcije

### M02 · Evidencija članstva
- [ ] `lib/supabase/queries/clanovi.ts` — getClanovi, getClan, upsertClan, promijeniStatus
- [ ] `validators/clan.schema.ts` — Zod shema s OIB validacijom
- [ ] Lista s filtrima (kategorija, status, zvanje) i pretraživanjem
- [ ] Detalji člana — tabovi: Osobno, Vatrogasno, Certifikati, Zdravlje, Članarina
- [ ] Forma: dodavanje/uređivanje člana
- [ ] Forma: promjena statusa (razlog + datum)
- [ ] Masa ažuriranje clanarina (checkbox select + "Označi plaćeno")
- [ ] CRUD certifikati i osposobljenost
- [ ] CRUD zdravstveni pregledi
- [ ] Alarm: crveni badge za istekle zdravstvene preglede
- [ ] `lib/documents/popis-clanova.ts` — xlsx export
- [ ] `lib/documents/pristupnica.ts` — docx s GDPR izjavom

### M03 · Sjednice (sve tri vrste)
- [ ] `lib/supabase/queries/sjednice.ts`
- [ ] `validators/sjednica.schema.ts`
- [ ] Lista sjednica s filtrima (vrsta, godina, status)
- [ ] Forma: nova sjednica (datum, vrsta, mjesto) → auto URBROJ
- [ ] Dnevni red: add/edit/delete/reorder točaka
- [ ] Registracija prisutnosti: checklist + kvorum provjera
- [ ] Unos glasova i zaključaka po točkama
- [ ] Status flow: Planirana → Pozivnica poslana → Završena → Zapisnik potpisan
- [ ] Upload skeniranog zapisnika (PDF)
- [ ] **Skupštine posebno:** upozorenje za dostavu Uredu državne uprave OBŽ
- [ ] `lib/documents/pozivnica-sjednice.ts` — docx
- [ ] `lib/documents/zapisnik-skupstine.ts` — docx
- [ ] `lib/documents/zapisnik-uo.ts` — docx
- [ ] `lib/documents/zapisnik-zapovjednistvo.ts` — docx

### M04 · Zapisnici
- [ ] Centralna lista svih zapisnika (sve vrste)
- [ ] Filter po vrsti, godini, statusu
- [ ] Pretraživanje po nazivu
- [ ] Inline PDF viewer (Supabase Storage URL)
- [ ] Status badge: Nacrt / Potpisan / Dostavljen

### M05 · Plan rada
- [ ] Lista aktivnosti s filtrima i pretraživanjem
- [ ] Forma: nova aktivnost (naziv, rok, odgovoran, kategorija)
- [ ] Promjena statusa aktivnosti
- [ ] Postotni prikaz realizacije po kategorijama
- [ ] `lib/documents/plan-rada.ts` — docx za skupštinu
- [ ] `lib/documents/izvjesce-o-radu.ts` — docx za skupštinu

### M06 · Financijsko planiranje
- [ ] `lib/supabase/queries/financije.ts`
- [ ] Financijski plan: prikaz stavki plan vs. ostvareno
- [ ] Inline uređivanje iznosa stavki (inline edit, ne zasebna forma)
- [ ] Prikaz ostvarenja — progress barovi
- [ ] Knjiga ulaznih računa: lista, unos, auto URBROJ, likvidatura
- [ ] Knjiga blagajne: unos primitaka i isplata
- [ ] Upload scan računa (Supabase Storage)
- [ ] `lib/documents/financijski-plan.ts` — docx za skupštinu
- [ ] `lib/documents/financijsko-izvjesce-skupstini.ts` — docx

### M07 · Zakonska izvješća
- [ ] Lista svih izvješća — semafor (zeleno/žuto/crveno prema roku)
- [ ] Upload potvrde o predaji (PDF sken)
- [ ] Promjena statusa uz datum predaje
- [ ] Alarm badge u navigaciji (broj otvorenih s rokom unutar 30 dana)
- [ ] Email test: testno pokretanje send-reminder funkcije

### M08 · Nabava
- [ ] `lib/supabase/queries/nabava.ts`
- [ ] `validators/nabava.schema.ts`
- [ ] Lista nabava s filtrima
- [ ] Forma: zahtjev za nabavom
- [ ] Odobrenje/odbijanje zahtjeva (s komentarom)
- [ ] Upload ponuda (do 3 datoteke)
- [ ] `lib/documents/narudzbenica.ts` — docx s auto URBROJ-em
- [ ] `lib/documents/zapisnik-odabira-dobavljaca.ts` — docx za > 2.000 EUR
- [ ] Zatvaranje nabave (isporučeno + plaćeno)

---

## FAZA 3 — Napredni moduli
**Rok:** Kolovoz 2026. · **Procjena:** 14 dana

### M09 · Imovina i vozila
- [ ] Lista imovine (filter: vrsta, status, lokacija)
- [ ] Forma: dodavanje/uređivanje imovine
- [ ] Vozila posebno: prikaz rokova registracije/tehničkog/osiguranja s bojama
- [ ] Knjiga vozila: unos izlazaka (tko, kuda, km)
- [ ] Servisna knjiga: CRUD servisa
- [ ] `lib/documents/popis-imovine.ts` — xlsx za inventuru

### M10 · Vatrogasna djelatnost
- [ ] Lista intervencija s filterima (vrsta, datum, lokacija)
- [ ] Forma: unos intervencije — auto URBROJ po HVZ formatu
- [ ] Odabir sudionika (iz popisa operativnih vatrogasaca)
- [ ] Vježbe: planiranje i evidentiranje, upload naloga za vježbu
- [ ] Pregled osposobljenosti postrojbe (po vatrogascu, po certifikatu)
- [ ] `lib/documents/interventni-izvjestaj.ts` — docx
- [ ] `lib/documents/nalog-za-vjezbu.ts` — docx

### M11 · Arhiva dokumenata
- [ ] Pregled po strukturiranim mapama (prema MODULI.md)
- [ ] Upload s metapodacima (naziv, modul, URBROJ, rok čuvanja)
- [ ] Pretraživanje po metapodacima
- [ ] Inline PDF pregled
- [ ] Soft delete (arhiviranje, ne brisanje)

---

## FAZA 4 — Poliranje i produkcija
**Rok:** Rujan 2026. · **Procjena:** 10 dana

### Kvaliteta
- [ ] Testiranje svih formi s neispravnim unosima
- [ ] Testiranje na iOS Safari i Android Chrome
- [ ] Testiranje s 3 korisnika različitih uloga (predsjednik, blagajnik, zapovjednik)
- [ ] Testiranje generiranja svih docx i xlsx dokumenata
- [ ] Explicitni RLS izolacijski test: korisnik `clan` ne smije vidjeti tuđe OIB-ove
- [ ] Testiranje email alarma: ručno pokretanje send-reminder
- [ ] Testiranje onboarding wizarda: kreiranje drugog testnog DVD-a

### Cloudflare i produkcija
- [ ] Kreiranje Cloudflare Pages projekta
- [ ] Konfiguracija wildcard subdomene `*.dvd-erp.hr`
- [ ] Environment varijable u Cloudflare: `VITE_REGISTRY_URL`, `VITE_REGISTRY_ANON_KEY`
- [ ] Supabase: `RESEND_API_KEY` u Edge Function Secrets
- [ ] Produkcijski seed za DVD Sarvaš (pravi podaci)
- [ ] `supabase gen types` → commit novih tipova

### Korisnicka dokumentacija
- [ ] Korisnički priručnik po ulogama (PDF, max 2 stranice po ulozi)
- [ ] Edukacija korisnika: 1 sat uživo s predsjednikom i tajnikom DVD Sarvaš

---

## FAZA 5 — Backlog (poslije v1.0)

- [ ] Onboarding wizard za DVD predsjednike (korak-po-korak UI)
- [ ] Multi-DVD admin panel (pregled svih projekata)
- [ ] HVZ IS integracija — pratiti razvoj API-ja
- [ ] AI asistent — generiranje predložaka dokumenata putem Claude API
- [ ] Push notifikacije — PWA Service Worker za intervencije
- [ ] Dvojno računovodstvo — ako DVD preraste prag
- [ ] Export interventnih podataka u HVZ XML format
- [ ] Iskaznica s QR kodom
- [ ] Modul za EU fondove — praćenje prijava i izvješćivanja

---

## MoSCoW sažetak

| Prioritet | Moduli |
|---|---|
| **Must** (Faza 1+2) | Auth, Dashboard, Članstvo, Sjednice, Zapisnici, Fin. plan, Zakonska izvješća, Nabava |
| **Should** (Faza 3) | Imovina/Vozila, Vatrogasna djelatnost, Arhiva |
| **Could** (Faza 5) | AI asistent, HVZ IS, Push notifikacije, Onboarding wizard |
| **Won't** (v1.0) | Dvojno računovodstvo, Online glasanje, Mobilna app |

---

## Poznate ovisnosti i rizici

| Rizik | Vjerojatnst | Utjecaj | Mitigacija |
|---|---|---|---|
| Promjena zakonodavstva (ZoV, ZoU) | Srednja | Visok | Zakoni su konstante u kodu, lako ažurirati |
| HVZ IS dobije javni API | Niska | Pozitivan | Faza 5 — integracija je pripremljena arhitekturom |
| Supabase free tier postane premali | Niska | Srednji | 500MB baze = dovoljno godinama; pro plan 25$/mj |
| Migracije na novim projektima | Visoka | Nizak | `migrate-all.sh` je idempotent, testiran na Sarvaš |
| RLS policy bug | Niska | Visok | Explicitni izolacijski test u Fazi 4 |
