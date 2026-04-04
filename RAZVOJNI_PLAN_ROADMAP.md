# DVD ERP — Razvojni plan

> Azurirano: 4. travnja 2026.

---

## Zavrseni sprintovi

| Sprint | Fokus | Status |
|---|---|---|
| **009** | Postavke DVD-a + Zakonske obveze (wiki) | Gotovo |
| **010** | Financijski workflow + e-Racun integracija + korekcije | Gotovo |
| **011** | Akcijski centar + kopiranje sjednica + weekly digest | Gotovo |
| **012** | Skupstinska automatizacija (6 dokumenata) | Gotovo |
| **013** | Redizajn UI (dark magenta tema, animacije, grafovi) | Gotovo |

---

## Sljedeci: Sprint 014 — Multi-tenant onboarding

**Status:** Ceka arhitekturne odluke

### Otvorena pitanja
1. **Centralni registry** — gdje hostati? (Supabase, Cloudflare KV, JSON CDN)
2. **DNS** — wildcard `*.dvd-erp.hr` ili rucno dodavanje subdomena?
3. **Onboarding** — tko kreira Supabase projekte? (admin rucno ili API)
4. **Hosting** — Vercel / Netlify / Cloudflare Pages?

### Predlozeni flow
1. Podaci DVD-a (naziv, OIB, IBAN, adresa)
2. Predsjednik (ime, email, lozinka)
3. Supabase projekt (URL + anon key — rucno kreiran)
4. Inicijalizacija (Edge Function `onboarding-init`)
5. Potvrda (link na novu instancu)

### Subdomain routing
```ts
const subdomain = window.location.hostname.split('.')[0]
const { url, anonKey } = await fetchFromRegistry(subdomain)
supabaseInstance = createClient(url, anonKey)
```

---

## Sto nedostaje do produkcije

- [ ] Pokrenuti migracije 009-013 na Supabase
- [ ] Regenerirati database.types.ts
- [ ] Knjiga primitaka i izdataka
- [ ] FINA izvjestaj priprema (G-PR-IZ-NPF)
- [ ] Smart matching bank transakcija s racunima
- [ ] Code splitting (bundle > 500kB)
- [ ] Multi-tenant (Sprint 014)

---

*DVD Sarvas ERP — https://github.com/dvdsarvas/dvd-erp*
