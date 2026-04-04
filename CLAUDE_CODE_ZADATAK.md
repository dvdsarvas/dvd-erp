# DVD ERP — Zadatak za Claude Code

> Ovaj dokument je kompletan zadatak. Pročitaj ga u cijelosti prije nego počneš.
> Radi fajl po fajl, commitaj po logičkim koracima.

---

## Pregled zadatka

Dva paralelna cilja:
1. **Ispraviti poznate bugove** (popis u Dijelu A)
2. **Redizajn sučelja** — moderniji dark theme s magenta akcentima, interaktivni grafovi, animacije (Dio B)

**Što NE dirati:** Supabase queries (`src/lib/supabase/`), Zustand store logika,
Zod validatori, routing u `App.tsx`, Edge Functions, SQL migracije.

---

## DIO A — Ispravci bugova

### A1. Tailwind opacity vrijednosti (9 mjesta)

Tailwind `/N` opacity modifier prima samo 0–100. Klase `/200`, `/300` su neispravne
i renderiraju punu boju bez prozirnosti.

**Pronađi i zamijeni u svim fajlovima:**

| Neispravno | Ispravno |
|---|---|
| `bg-yellow-900/200` | `bg-yellow-500/20` |
| `bg-green-900/200` | `bg-green-500/20` |
| `bg-blue-900/200` | `bg-blue-500/20` |
| `bg-orange-900/200` | `bg-orange-500/20` |
| `bg-red-900/200` | `bg-red-500/20` |

Pogođeni fajlovi: `ClanDetalji.tsx`, `SjednicaDetalji.tsx`,
`ZakonskaIzvjesca.tsx`, `Dashboard.tsx`

Pokreni pretragu: `grep -rn "/200\|/300\|/400" src/` da pronađeš sve instance.

---

### A2. Duplicirana `validateOIB` funkcija

Ista logika postoji i u `src/lib/utils/formatters.ts` i u `src/lib/validators/clan.schema.ts`.

**Ispravak u `clan.schema.ts`:**
```ts
// Ukloni lokalnu implementaciju validateOIB funkcije
// Dodaj import na vrhu:
import { validateOIB } from '@/lib/utils/formatters'
// Ostatak sheme ostaje isti
```

---

### A3. `select('*')` na tablici s osjetljivim podacima

U `src/lib/supabase/queries/clanovi.ts`, funkcija `dohvatiClanove()` dohvaća sve
kolumne uključujući JMBG, ime_oca i druge osjetljive podatke koji nisu potrebni za
prikaz u listi.

**Ispravak:**
```ts
export async function dohvatiClanove(filtri?: ClanFilter) {
  let query = supabase
    .from('clanovi')
    .select('id, ime, prezime, kategorija, status, vatrogasno_zvanje, mobitel, oib, datum_uclanivanja')
    .order('prezime', { ascending: true })
  // ... ostatak isti
}
```

Funkcija `dohvatiClana(id)` za detalje člana može zadržati `select('*')` jer tamo
treba sve podatke.

---

### A4. `main.tsx` — dodati `.catch()` fallback

Ako `initAuth()` baci grešku (npr. mrežni problem), React se nikad ne rendera.

**Ispravak u `src/main.tsx`:**
```ts
initAuth()
  .catch(err => console.error('Auth inicijalizacija neuspješna:', err))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  })
```

---

### A5. Sidebar badge — spojiti na `notificationsStore`

`AppLayout.tsx` definira `badge?: number` u `NavItem` tipu ali ga nikad ne puni.
`notifications.store.ts` već postoji i računa alarme.

**Ispravak u `src/components/layout/AppLayout.tsx`:**

1. U komponenti `Sidebar` dodaj:
```ts
const { alarmi, neprocitano, ucitajAlarme } = useNotificationsStore()

useEffect(() => {
  ucitajAlarme()
}, [])
```

2. Dinamički popuni badge za zakonska-izvjesca i imovina rute:
```ts
const badgeMap: Record<string, number> = {
  '/zakonska-izvjesca': alarmi.filter(a => a.href === '/zakonska-izvjesca' && a.hitnost === 'crveno').length,
  '/imovina': alarmi.filter(a => a.href === '/imovina' && a.hitnost === 'crveno').length,
}
// U renderu nav itema: badge={badgeMap[item.path] || undefined}
```

3. U `Topbar` komponenti: dodaj ikonu zvona s crvenim badge brojem `neprocitano`.

---

### A6. `shared/StatusBadge.tsx` — koristiti ga

Postoji `src/components/shared/StatusBadge.tsx` ali se ne koristi nigdje — svaki modul
ima svoju lokalnu implementaciju.

Provjeri što `shared/StatusBadge.tsx` već sadrži. Proširi ga da podrži sve statuse
koji se koriste u projektu, zatim zamijeni lokalne `StatusBadge`, `StatusPill`,
`KategorijaBadge`, `ClanarinaStatus` komponente u `Dashboard.tsx` i `ClanstvoList.tsx`
s importom iz `@/components/shared/StatusBadge`.

---

## DIO B — Redizajn sučelja

### B1. Instalacija novih ovisnosti

```bash
npm install framer-motion recharts
```

---

### B2. Design sistem — CSS varijable

Zamijeni sadašnje hard-coded hex vrijednosti CSS varijablama.
Dodaj/zamijeni u `src/index.css`:

```css
:root {
  --bg-base:     #07070d;
  --bg-surface:  #0f0f18;
  --bg-elevated: #14141f;
  --bg-overlay:  #1a1a28;

  --accent:        #d946a8;
  --accent-dim:    #a21caf;
  --accent-glow:   rgba(217, 70, 168, 0.25);
  --accent-subtle: rgba(217, 70, 168, 0.08);

  --text-primary:   #ededf5;
  --text-secondary: #8888a0;
  --text-muted:     #50506a;
  --text-accent:    #e879d0;

  --border:        #1e1e30;
  --border-strong: #2a2a40;
  --border-accent: rgba(217, 70, 168, 0.2);

  --success: #10b981;
  --warning: #f59e0b;
  --danger:  #ef4444;
  --info:    #3b82f6;

  --glow-accent: 0 0 20px rgba(217,70,168,0.15), 0 0 60px rgba(217,70,168,0.05);
  --shadow-card: 0 4px 24px rgba(0,0,0,0.5);
}
```

**Migracija boja kroz sve komponente:**
```
#07070d / #0a0a0f  →  var(--bg-base)
#1a1a1e            →  var(--bg-base) ili var(--bg-surface)
#242428            →  var(--bg-surface)
#16161f / #1e1e22  →  var(--bg-elevated)
#2e2e32 / #333338  →  var(--border)
#f0f0f8 / #ddd     →  var(--text-primary)
#9090a8 / #aaa     →  var(--text-secondary)
#50506a / #777     →  var(--text-muted)
red-600 / red-400  →  var(--accent) / var(--text-accent)  (gdje je naglasak)
```

---

### B3. Animacije — globalni modul

Kreiraj `src/lib/animations.ts`:

```ts
import type { Variants } from 'framer-motion'

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }
  })
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } }
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }
  }
}

export const slideIn: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i: number = 0) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }
  })
}
```

---

### B4. AppLayout — animirani Sidebar

1. Zamijeni hard-coded boje s CSS varijablama
2. Sidebar open/close s framer-motion:
```tsx
import { motion } from 'framer-motion'

<motion.aside
  animate={{ width: open ? 220 : 0 }}
  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
  className="flex-shrink-0 overflow-hidden flex flex-col border-r"
  style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
>
```
3. Svaki nav item animiran s `motion.div` + `slideIn` + `custom={index}`
4. Aktivni item: magenta `var(--accent)` umjesto crvene, s `box-shadow: var(--glow-accent)`
5. Logo: suptilni pulsing glow efekt (`animate={{ opacity: [0.7, 1, 0.7] }}` s repeat)

---

### B5. Dashboard — kompletan redizajn s grafovima

#### B5.1 KPI kartice — animirani counter

Dodaj hook:
```ts
function useAnimatedCounter(target: number, duration = 1000) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target) return
    let current = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      current += increment
      if (current >= target) { setValue(target); clearInterval(timer) }
      else setValue(Math.floor(current))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}
```

Svaka KPI kartica: `motion.div` s `fadeUp` + `custom={index}`.

#### B5.2 Recharts grafovi

Dodaj dva grafa između KPI kartica i alarmi/sjednice panela.

**Graf 1 — AreaChart: Aktivnost po mjesecima (zadnjih 6 mj.)**

Dohvati iz Supabase:
- Broj sjednica po mjesecu: `supabase.from('sjednice').select('datum').gte('datum', sixMonthsAgo)`
- Broj intervencija po mjesecu: `supabase.from('intervencije').select('datum_intervencije').gte('datum_intervencije', sixMonthsAgo)`

Grupiraj po mjesecu u TS kodu. Format podataka:
```ts
[{ mjesec: 'Sij', sjednice: 2, intervencije: 5 }, ...]
```

Recharts:
```tsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

<ResponsiveContainer width="100%" height={180}>
  <AreaChart data={data}>
    <defs>
      <linearGradient id="gradSjednice" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="gradIntervencije" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="var(--info)" stopOpacity={0.3} />
        <stop offset="95%" stopColor="var(--info)" stopOpacity={0} />
      </linearGradient>
    </defs>
    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
    <XAxis dataKey="mjesec" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
    <Tooltip contentStyle={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-accent)', borderRadius: 8 }} />
    <Area type="monotone" dataKey="sjednice" stroke="var(--accent)" fill="url(#gradSjednice)" strokeWidth={2} />
    <Area type="monotone" dataKey="intervencije" stroke="var(--info)" fill="url(#gradIntervencije)" strokeWidth={2} />
  </AreaChart>
</ResponsiveContainer>
```

**Graf 2 — BarChart: Financijski plan vs ostvareno**

Dohvati iz Supabase — ukupno prihodi i rashodi (plan vs ostvareno) za tekuću godinu.
Ako nema podataka, prikaži placeholder s nulama.

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// Format: [{ naziv: 'Prihodi', plan: 15000, ostvareno: 12000 }, { naziv: 'Rashodi', plan: 14000, ostvareno: 9000 }]

<ResponsiveContainer width="100%" height={180}>
  <BarChart data={financijskiData} barGap={4}>
    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
    <XAxis dataKey="naziv" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
    <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
    <Tooltip
      formatter={(v: number) => [`${v.toLocaleString('hr-HR')} EUR`]}
      contentStyle={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-accent)', borderRadius: 8 }}
    />
    <Bar dataKey="plan" fill="var(--accent)" opacity={0.5} radius={[4,4,0,0]} />
    <Bar dataKey="ostvareno" fill="var(--accent)" radius={[4,4,0,0]} />
  </BarChart>
</ResponsiveContainer>
```

#### B5.3 Layout grida

```
[ KPI ] [ KPI ] [ KPI ] [ KPI ] [ KPI ]   ← 5 stupaca

[ AreaChart — 3/5 širine   ] [ BarChart — 2/5 širine ]

[ Alarmi — 1/2 ]   [ Zadnje sjednice — 1/2 ]
```

Svaki panel: `motion.div` s `fadeUp` i odgovarajućim `custom` indeksom.

#### B5.4 Alarm lista

Svaki alarm red: `motion.div` s `slideIn` + `custom={index}`.
Umjesto točke, dodaj lijevi 3px colored border:
```tsx
<motion.div
  style={{ borderLeft: `3px solid ${a.hitnost === 'crveno' ? 'var(--danger)' : a.hitnost === 'narancasto' ? 'var(--warning)' : 'var(--warning)'}` }}
  ...
>
```

---

### B6. Shared komponente

#### `PageHeader.tsx` — animiran, konzistentno koristiti

```tsx
import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="flex items-center justify-between mb-6"
    >
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </motion.div>
  )
}
```

Zamijeni zaglavlje pattern u `ClanstvoList`, `SjedniceList`, `ZakonskaIzvjesca`,
`PlanRada`, `Financije`, `Nabava`, `ImovinaPage`, `VatrogasnaPage`, `ArhivaPage`
s `<PageHeader>` komponentom.

#### `ConfirmDialog.tsx` — backdrop blur + animacija

Dodaj `AnimatePresence` + `scaleIn` za modal, backdrop s blur efektom:
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.6)' }}
  className="fixed inset-0 z-50 flex items-center justify-center"
>
  <motion.div variants={scaleIn} initial="hidden" animate="visible" exit="hidden"
    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-accent)' }}
    className="rounded-xl p-6 max-w-sm w-full mx-4"
  >
    ...
  </motion.div>
</motion.div>
```

---

### B7. ClanstvoList — skeleton loading + animirani redovi

1. Skeleton state umjesto "Učitavanje...":
```tsx
function SkeletonRow() {
  return (
    <tr>
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded animate-pulse" style={{ background: 'var(--bg-elevated)', width: i === 1 ? '120px' : '60px' }} />
        </td>
      ))}
    </tr>
  )
}
// Render: loading ? Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />) : ...
```

2. Animirani redovi s `motion.tr` (framer-motion podržava custom HTML tagove):
```tsx
import { motion } from 'framer-motion'
// motion.tr
{filtriraniClanovi.map((clan, i) => (
  <motion.tr
    key={clan.id}
    variants={fadeUp}
    initial="hidden"
    animate="visible"
    custom={i}
    ...
  >
```

---

### B8. Login stranica — premium redizajn

Kompletan redizajn login stranice. Treba impresionirati.

```tsx
// Struktura:
// - Puni ekran, flex center
// - Animirani radial gradient pozadina s magenta akcentom
// - Centriran card: 400px max-width, glass morphism efekt
// - Logo DVD Sarvaš na vrhu carda
// - Forma s animiranim input focus stanjima
// - Submit button: magenta gradient s hover scale animacijom

// Pozadina:
<div style={{
  background: 'radial-gradient(ellipse at 30% 50%, rgba(217,70,168,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(162,28,175,0.05) 0%, transparent 50%), var(--bg-base)',
  minHeight: '100vh'
}} />

// Card:
<motion.div
  variants={scaleIn}
  initial="hidden"
  animate="visible"
  style={{
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-accent)',
    boxShadow: 'var(--glow-accent), var(--shadow-card)',
  }}
  className="rounded-2xl p-8 w-full max-w-[400px]"
>

// Input focus:
// CSS: input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-subtle); }

// Submit button:
// background: linear-gradient(135deg, var(--accent), var(--accent-dim))
// hover: scale(1.02), brightness(1.1)
```

---

## Redosljed rada

```
1. fix: Tailwind opacity vrijednosti (A1)
2. fix: duplicirana validateOIB (A2)
3. fix: dohvatiClanove select kolumne (A3)
4. fix: main.tsx catch/finally (A4)
5. feat: sidebar badges + topbar notifikacije (A5)
6. refactor: shared/StatusBadge konsolidacija (A6)
7. feat: CSS varijable design sistem (B2)
8. feat: animacije — global modul + AppLayout sidebar (B3, B4)
9. feat: Dashboard grafovi (B5)
10. feat: PageHeader + ConfirmDialog animacije (B6)
11. feat: ClanstvoList skeleton + animirani redovi (B7)
12. feat: Login redizajn (B8)
```

---

## Napomene

- Ne mijenjati TypeScript tipove iz `database.types.ts`
- Ne mijenjati Supabase query logiku — samo prezentacijski sloj
- `recharts` komponente moraju biti unutar `<ResponsiveContainer>`
- Framer motion `variants` propagiraju se na djecu samo ako roditelj ima `initial`/`animate`
- Ako nema podataka za grafove (prazna baza), prikazati graf s nulama — ne skrivati ga
- Ne dodavati toast/notification library — to je zasebna odluka

---

*Projekt: DVD Sarvaš ERP — https://github.com/dvdsarvas/dvd-erp*
