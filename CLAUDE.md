# DVD ERP — Upute za Claude Code

## Projekt

**Repo:** https://github.com/dvdsarvas/dvd-erp
**Stack:** React 18 + TypeScript, Vite, Wouter, Zustand, Supabase, Tailwind CSS v4, framer-motion, recharts
**Tema:** Dark UI s magenta akcentima (CSS varijable u index.css)
**Hosting:** Cloudflare Workers with Static Assets (auto-deploy iz mastera)

---

## Arhitekturalna pravila

- **Jedan Supabase projekt po DVD-u** — ne multi-tenant, ne row-level tenancy
- **Tailwind opacity max /100** — `/200`, `/300` ne postoje, pišu se kao `/20`, `/30`
- **RLS pattern:** `EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid() AND uloga IN (...) AND aktivan = true)`
- **select('*') zabranjeno** za list prikaze na tablicama `clanovi`, `korisnici`
- **Konto polje:** `racunski_konto` (ne `aop_konto`)
- **CSS boje:** koristiti `var(--bg-base)`, `var(--accent)`, `var(--text-primary)` itd.
- **Animacije:** koristiti varijante iz `src/lib/animations.ts` (fadeUp, slideIn, scaleIn)
- **Tipovi:** koristiti `Database['public']['Tables']['X']['Row']` iz generiranog `database.types.ts` — ne raditi ručne interface-ove osim za UI-specific literal unions
- **Lazy loading:** sve stranice u App.tsx moraju biti `lazy(() => import(...))` osim Login-a

---

## Konvencije

```
Tablice/polja: hrvatski (racuni, clanovi, sjednice)
Funkcije: hrvatski (dohvatiClanove, kreirajRacun, azurirajClana)
Commitovi: hrvatski, prefiks fix:/feat:/sql:/docs:/chore:
Komunikacija s korisnikom: hrvatski
```

---

## Struktura projekta

```
src/
  pages/              — stranice (po modulu), sve lazy loadane
  components/
    layout/AppLayout.tsx  — sidebar + topbar
    shared/           — PageHeader, StatusBadge, ConfirmDialog, itd.
  lib/
    supabase/
      client.ts       — Supabase klijent
      auth.ts         — initAuth, loadKorisnik, signIn/Out (promise dedup)
      queries/        — po modulu (clanovi.ts, financije.ts, organizacija.ts, itd.)
    documents/        — docx generiranje (sjednice-docs.ts, skupstina-paket.ts)
    utils/            — formatters.ts, eracun-parser.ts, bank-parser.ts, akcije.ts
    animations.ts     — framer-motion varijante
  store/              — auth.store.ts, dvd.store.ts, notifications.store.ts
  types/database.types.ts — Supabase generirani tipovi (regen: supabase gen types)
```

---

## Auth flow

```
main.tsx -> initAuth() -> getSession() -> loadKorisnik() -> setKorisnik + await dvdStore.init()
                        -> onAuthStateChange listener (dedup via promise pattern)

App.tsx gate: if (authLoading || dvdLoading) -> loading screen
```

`loadKorisnik` koristi promise dedup — paralelni pozivi cekaju prvi.
`dvd.store.init()` se AWAIT-a — app ne renderira dok org podaci nisu spremni.

---

## Migracije

```
dvd-erp-docs/supabase/migrations/
  001-008  — inicijalna shema, RLS, cron, tijela, predlosci, zvanja, popravke
  009      — dvd_organizacija + view trenutni_funkcioneri
  010      — zakonski_sadrzaj + seed 14 stavki
  011      — racuni kategorija + trigger sync_ostvareno + knjiga view
  011b     — aop_konto -> racunski_konto rename + konto seed + trigger fix
  012      — bank_transakcije
  013      — eracun_integracija (kolumne + eracun_konfiguracija)
  014      — pg_cron job za sync-eracuni (svaki sat)
```

---

## useEffect pattern (OBAVEZAN za Supabase querije)

Svi useEffect hookovi koji pozivaju Supabase moraju koristiti `cancelled` flag:

```tsx
useEffect(() => {
  let cancelled = false
  setLoading(true)
  dohvatiPodatke()
    .then(d => { if (!cancelled) setPodaci(d) })
    .catch(err => { if (!cancelled) console.error(err) })
    .finally(() => { if (!cancelled) setLoading(false) })
  return () => { cancelled = true }
}, [deps])
```

Razlog: spriječava setState na unmountanoj komponenti i stale data pri brzim rute promjenama.

---

## Poznati gotchei

- **SQL VIEW s JOIN-om:** uvijek table alias (r.created_at, ne created_at)
- **CREATE OR REPLACE VIEW:** ne dozvoljava promjenu tipa kolumne — treba DROP + CREATE
- **File input onChange:** mora biti async s try-catch, dodati `e.target.value = ''` za reset
- **XML parser:** traziti podatke unutar AccountingSupplierParty, ne prvi match u dokumentu
- **pg_cron dollar-quoting:** koristiti wrapper funkciju, ne inline $$ DO $$ BEGIN
- **Nested relation tipovi:** Supabase !inner joinovi zahtijevaju ručni tip (Row + { clanovi: X })

---

## Sljedeci koraci

- [ ] mer API kredencijali — cekamo odgovor na email od posrednika
- [ ] FINA izvjestaj priprema (G-PR-IZ-NPF obrazac)
- [ ] Knjiga primitaka i izdataka (zakonski dokument)
- [ ] Smart matching bank transakcija s racunima
- [ ] Multi-tenant onboarding (Sprint 014 — ceka arhitekturne odluke)
