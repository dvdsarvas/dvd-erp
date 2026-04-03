# ARHITEKTURA — DVD ERP

---

## Tehnički stack

| Sloj | Tehnologija | Napomena |
|---|---|---|
| Frontend | React 18 + TypeScript | — |
| Build | Vite | — |
| Router | Wouter | SPA, lagani |
| Global state | Zustand | auth, dvd, notifications store |
| Styling | Tailwind CSS + Shadcn/ui | — |
| Forme | React Hook Form + Zod | — |
| Dokumenti | docx + pdfmake | Client-side generiranje |
| Datumi | date-fns | — |
| Baza | Supabase PostgreSQL | Jedan projekt po DVD-u |
| Auth | Supabase Auth | Email + lozinka |
| Storage | Supabase Storage | Dokumenti, skenovi, logotipi |
| Scheduled jobs | Supabase pg_cron | Dnevni alarmi 07:00 |
| Server funkcije | Supabase Edge Functions | Samo email i onboarding |
| Email | Resend | Free 3000/mj po projektu |
| Hosting | Cloudflare Pages | Subdomena per DVD |
| DNS | Cloudflare | *.dvd-erp.hr |

---

## Multi-tenancy: jedan Supabase projekt po DVD-u

Svaki DVD = vlastiti Supabase projekt. Potpuna izolacija podataka.

**Tradeoff:** Migracije se moraju pokrenuti na svakom projektu.
Riješeno sa `scripts/migrate-all.sh`.

Detaljna obrazloženja odluke u `PRIJEDLOG.md` — poglavlje 3.

---

## Dijagram sustava

```
┌─ Cloudflare DNS ──────────────────────────────────────┐
│  sarvas.dvd-erp.hr                                    │
│  antunovac.dvd-erp.hr                                 │
│  *.dvd-erp.hr                                         │
└────────────────────────┬──────────────────────────────┘
                         │
┌─ Cloudflare Pages ─────▼──────────────────────────────┐
│  React 18 + TypeScript + Vite + Wouter + Zustand      │
│  Shadcn/ui + Tailwind                                 │
│  docx + pdfmake (client-side)                         │
│                                                       │
│  main.tsx:                                            │
│  subdomena → meta-registry → init Supabase klijent    │
└────────────────────────┬──────────────────────────────┘
                         │ Supabase JS (anon + RLS)
           ┌─────────────┴──────────────┐
           ▼                            ▼
┌─ Supabase: DVD Sarvaš ─┐   ┌─ Supabase: DVD X ───────┐
│  PostgreSQL + RLS       │   │  PostgreSQL + RLS        │
│  Storage (dokumenti)    │   │  Storage                 │
│  Auth                   │   │  Auth                    │
│  Edge Functions (2)     │   │  Edge Functions (2)      │
│  pg_cron (1 job)        │   │  pg_cron (1 job)         │
└─────────────────────────┘   └──────────────────────────┘

┌─ Meta-registry (zasebni mali Supabase projekt) ────────┐
│  dvd_organizacije: subdomena → supabase_url + anon    │
│  Javno čitljivo (anon) — zaštita je u RLS per projekt │
└────────────────────────────────────────────────────────┘
```

---

## Subdomain resolve — inicijalizacija klijenta

```typescript
// src/lib/supabase/client.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

let supabaseInstance: SupabaseClient<Database> | null = null

export async function initSupabase(): Promise<SupabaseClient<Database>> {
  if (supabaseInstance) return supabaseInstance

  // Lokalni razvoj — preskoči resolve
  if (import.meta.env.VITE_DEV_MODE === 'true') {
    supabaseInstance = createClient<Database>(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
    return supabaseInstance
  }

  // Produkcija — resolvi subdomenu
  const subdomain = window.location.hostname.split('.')[0]

  const registry = createClient(
    import.meta.env.VITE_REGISTRY_URL,
    import.meta.env.VITE_REGISTRY_ANON_KEY
  )

  const { data, error } = await registry
    .from('dvd_organizacije')
    .select('supabase_url, supabase_anon')
    .eq('slug', subdomain)
    .eq('aktivan', true)
    .single()

  if (error || !data) throw new Error(`DVD '${subdomain}' nije pronađen`)

  supabaseInstance = createClient<Database>(data.supabase_url, data.supabase_anon)
  return supabaseInstance
}

// Hook za korištenje u komponentama
export function useSupabase() {
  // Inicijaliziran u main.tsx, ovdje samo čitamo instancu
  if (!supabaseInstance) throw new Error('Supabase nije inicijaliziran')
  return supabaseInstance
}
```

```typescript
// src/main.tsx

import { initSupabase } from '@/lib/supabase/client'
import { useDVDStore } from '@/store/dvd.store'

async function bootstrap() {
  const supabase = await initSupabase()
  // Učitaj DVD config u Zustand store
  useDVDStore.getState().init(supabase)
  // Render app
  ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
}

bootstrap()
```

---

## Meta-registry shema

```sql
-- U zasebnom Supabase projektu (meta-registry)
CREATE TABLE dvd_organizacije (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv           TEXT NOT NULL,
  naziv_kratki    TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  subdomena       TEXT UNIQUE NOT NULL,
  supabase_url    TEXT NOT NULL,
  supabase_anon   TEXT NOT NULL,
  primarna_boja   TEXT DEFAULT '#CC0000',
  logo_url        TEXT,
  aktivan         BOOLEAN DEFAULT false,
  plan            TEXT DEFAULT 'free',
  kreiran         TIMESTAMPTZ DEFAULT now(),
  zadnja_aktivnost TIMESTAMPTZ
);

-- Javno čitljivo za resolve
CREATE POLICY "anon moze citati aktivne"
  ON dvd_organizacije FOR SELECT
  USING (aktivan = true);
```

---

## Zustand stores

```typescript
// src/store/auth.store.ts
interface AuthStore {
  korisnik: Korisnik | null
  uloga: Uloga | null          // 'predsjednik' | 'zamjenik' | 'tajnik' | ...
  setKorisnik: (k: Korisnik) => void
  logout: () => void
}

// src/store/dvd.store.ts
interface DVDStore {
  naziv: string
  nazivKratki: string
  boja: string
  logoUrl: string | null
  init: (supabase: SupabaseClient) => Promise<void>
}

// src/store/notifications.store.ts
interface NotificationsStore {
  alarmi: Alarm[]              // Rokovi koji se bliže
  neprocitano: number
  ucitajAlarme: () => Promise<void>
  oznacitoProcitano: (id: string) => void
}
```

---

## Edge Functions

### `send-reminder` (okidač: pg_cron 07:00)

```typescript
// supabase/functions/send-reminder/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const danas = new Date()
  const za30dana = new Date(danas.getTime() + 30 * 24 * 60 * 60 * 1000)

  // 1. Zakonska izvješća
  const { data: izvjesca } = await supabase
    .from('zakonska_izvjesca')
    .select('*, odgovorna_osoba:korisnici(email, ime)')
    .lte('rok', za30dana.toISOString().split('T')[0])
    .neq('status', 'predano')

  // 2. Rokovi vozila
  const { data: vozila } = await supabase
    .from('imovina')
    .select('naziv, reg_oznaka, registracija_do, tehnicki_do')
    .eq('vrsta', 'vozilo')
    .lte('registracija_do', za30dana.toISOString().split('T')[0])

  // 3. Zdravstveni pregledi
  const { data: pregledi } = await supabase
    .from('zdravstveni_pregledi')
    .select('*, clan:clanovi(ime, prezime)')
    .lte('datum_sljedeceg', za30dana.toISOString().split('T')[0])

  // Pošalji emailove putem Resend
  // ... (vidjeti potpunu implementaciju u functions/send-reminder/)

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
```

### `onboarding-init` (okidač: HTTP POST iz wizarda)

```typescript
// Primi podatke novog DVD-a, kreira inicijalnu strukturu, šalje welcome email
// Vidjeti potpunu implementaciju u functions/onboarding-init/
```

---

## Generiranje dokumenata

Svi dokumenti generiraju se client-side. Svaki predložak je zasebna TypeScript funkcija.

```typescript
// src/lib/documents/zapisnik-skupstine.ts
import { Document, Packer, Paragraph, TextRun, ... } from 'docx'
import { saveAs } from 'file-saver'

export async function generirajZapisnikSkupstine(
  sjednica: Sjednica,
  tocke: TockaDnevnogReda[],
  prisutni: Clan[]
): Promise<void> {
  const doc = new Document({
    sections: [{
      children: [
        // Header s KLASA i URBROJ
        // Tijelo zapisnika
        // Potpisi
      ]
    }]
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `Zapisnik-skupstine-${sjednica.datum}.docx`)
}
```

Popis svih predložaka i njihovih inputa u `PREDLOSCI_DOKUMENATA.md`.

---

## Struktura projekta

```
dvd-erp/
├── src/
│   ├── main.tsx
│   ├── App.tsx                       # Wouter <Switch> sa svim rutama
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # initSupabase, useSupabase
│   │   │   ├── auth.ts               # signIn, signOut, resetPassword
│   │   │   └── queries/              # Typed query funkcije
│   │   │       ├── clanovi.ts        # getClanovi, getClan, upsertClan...
│   │   │       ├── sjednice.ts
│   │   │       ├── financije.ts
│   │   │       ├── nabava.ts
│   │   │       ├── imovina.ts
│   │   │       ├── intervencije.ts
│   │   │       └── izvjesca.ts
│   │   │
│   │   ├── documents/
│   │   │   ├── zapisnik-skupstine.ts
│   │   │   ├── zapisnik-uo.ts
│   │   │   ├── zapisnik-zapovjednistvo.ts
│   │   │   ├── pozivnica-sjednice.ts
│   │   │   ├── financijski-plan.ts
│   │   │   ├── izvjesce-o-radu.ts
│   │   │   ├── plan-rada.ts
│   │   │   ├── popis-clanova.ts
│   │   │   ├── narudzbenica.ts
│   │   │   └── pristupnica.ts
│   │   │
│   │   ├── validators/
│   │   │   ├── clan.schema.ts
│   │   │   ├── sjednica.schema.ts
│   │   │   ├── racun.schema.ts
│   │   │   └── nabava.schema.ts
│   │   │
│   │   └── utils/
│   │       ├── urbroj.ts
│   │       ├── rokovi.ts
│   │       └── formatters.ts
│   │
│   ├── store/
│   │   ├── auth.store.ts
│   │   ├── dvd.store.ts
│   │   └── notifications.store.ts
│   │
│   ├── types/
│   │   ├── database.types.ts         # supabase gen types typescript > src/types/database.types.ts
│   │   └── app.types.ts
│   │
│   ├── components/
│   │   ├── ui/                       # Shadcn/ui komponente
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx         # Sidebar + Topbar wrapper
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   └── PageHeader.tsx
│   │   └── shared/
│   │       ├── StatusBadge.tsx
│   │       ├── DataTable.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── FileUpload.tsx
│   │       └── DocumentButton.tsx    # Gumb koji okida generiranje docx/pdf
│   │
│   └── pages/
│       ├── auth/
│       │   ├── Login.tsx
│       │   └── ResetPassword.tsx
│       ├── onboarding/
│       │   └── OnboardingWizard.tsx
│       ├── dashboard/
│       │   └── Dashboard.tsx
│       ├── clanstvo/
│       │   ├── ClanstvoList.tsx
│       │   ├── ClanDetalji.tsx
│       │   └── ClanForma.tsx
│       ├── sjednice/
│       │   ├── skupstine/
│       │   ├── upravni-odbor/
│       │   └── zapovjednistvo/
│       ├── zapisnici/
│       ├── plan-rada/
│       ├── financije/
│       │   ├── FinancijskiPlan.tsx
│       │   ├── PoslovneKnjige.tsx
│       │   └── Racuni.tsx
│       ├── zakonska-izvjesca/
│       ├── nabava/
│       ├── imovina/
│       ├── vatrogasna/
│       └── arhiva/
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_cron_jobs.sql
│   ├── functions/
│   │   ├── send-reminder/index.ts
│   │   └── onboarding-init/index.ts
│   └── seed.sql
│
├── scripts/
│   ├── migrate-all.sh
│   └── projects.env.example
│
├── .env.local                        # Nije u git
├── .env.example
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Environment varijable

```bash
# .env.example

# Lokalni razvoj
VITE_DEV_MODE=true
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Meta-registry (produkcija)
VITE_REGISTRY_URL=https://yyyy.supabase.co
VITE_REGISTRY_ANON_KEY=eyJ...
```

---

## Načela razvoja

1. **RLS je jedina zaštita** — ne filtrirati na frontendu, testirati izolaciju explicitno
2. **Supabase klijent = jedini API** — bez custom REST-a osim Edge Functions
3. **Tipovi iz baze** — `supabase gen types typescript` nakon svake migracije
4. **Dokumenti su funkcije** — čiste TypeScript funkcije, bez state-a, bez side effecta
5. **Zustand samo za globalni state** — auth, dvd config, notifikacije
6. **Mobile-first** — svaki layout gradi se prvo za mobitel
7. **Revizijski trag = DB trigger** — nikad iz aplikacije ručno
8. **Migracije su jedini način promjene sheme** — nikad direktno u Supabase Studio UI na produkciji
