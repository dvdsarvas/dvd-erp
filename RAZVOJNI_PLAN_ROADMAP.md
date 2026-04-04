# DVD ERP — Sveobuhvatni razvojni plan

> Živi dokument. Ažurirati nakon svakog sprinta.
> **Načelo:** Automatiziraj prvi. Korisnik samo potvrđuje.

---

## Trenutno stanje (April 2026.)

### ✅ Implementirano i funkcionalno
- Auth sustav (login, uloge, RLS)
- Dashboard s KPI-jevima, alarmima, AreaChart + BarChart grafovima, animiranim counterima
- Evidencija članstva (CRUD, certifikati, zdravstveni pregledi, članarine, skeleton loading)
- Sjednice — sve tri vrste, dnevni red, prisutnost, kvorum, dokumenti, kopiranje prošle sjednice
- Zapisnici — centralna lista, PDF viewer
- Plan rada — aktivnosti, status praćenje
- Financijski plan — plan vs ostvareno (automatski iz plaćenih računa putem triggera)
- Računi — workflow Primljeno→Likvidirano→Plaćeno, upload dokumenata, kategorizacija (auto-prijedlog), slanje knjigovođi (bilježi datum), e-Račun XML upload
- Knjiga ulaznih računa — zakonski dokument (VIEW), xlsx export, tab Analiza s progress barovima
- Zakonska izvješća — semafor, upload potvrda
- Nabava — zahtjevi, ponude, odobravanje
- Imovina i vozila — registracija, tehnički, servisna knjiga
- Vatrogasna djelatnost — intervencije, vježbe
- Arhiva dokumenata
- Postavke — korisnici, tijela, Podaci DVD-a (editable, auto-sync funkcioneri), Zakonske obveze (wiki, 14 stavki), GDPR
- Akcijski centar (/akcije) — proaktivna to-do lista s prioritetima
- Pripremi skupštinu — wizard koji generira 6 .docx dokumenata jednim klikom
- Import bankovnih izvadaka — CSV parser (Erste/PBZ/ZABA), upload + pregled
- e-Račun integracija — Edge Function sync iz ePoslovanje/mojeRačun, XML parser
- Weekly digest email — ponedjeljkom agregirani tjedni pregled predsjedniku
- Dark theme s magenta akcentima, framer-motion animacije, CSS varijable design sistem

### ⚠️ Implementirano ali čeka Supabase migraciju
- Migracije 009-013 kreirane ali trebaju `supabase db push`
- TypeScript tipovi trebaju regeneraciju (`supabase gen types`)

### ❌ Nije implementirano
- Knjiga primitaka i izdataka (zakonski dokument)
- FINA izvještaj priprema (G-PR-IZ-NPF)
- Godišnji setup wizard
- Multi-tenant onboarding
- Spajanje bank transakcija s računima (smart matching)

---

## Pregled sprintova

| Sprint | Fokus | Status |
|---|---|---|
| **009** | Postavke DVD-a + Zakonske obveze | ✅ Gotovo |
| **010** | Financijski workflow + e-Račun | ✅ Gotovo |
| **011** | Proaktivni ERP — Akcijski centar | ✅ Gotovo |
| **012** | Skupštinska automatizacija | ✅ Gotovo |
| **013** | Redizajn UI + grafovi + animacije | ✅ Gotovo |
| **014** | Multi-tenant onboarding | ⏳ Čeka odluke |

---

---

# SPRINT 010 — Financijski workflow: kompletiranje

## Što rješavamo

Trenutni modul Računi ima dobar workflow ali ima 4 kritična propusta:

1. **Račun nema kategoriju** → ne može se automatski vezati za stavku financijskog plana
2. **Ostvareno u fin. planu** → ručno se upisuje umjesto da se računa iz plaćenih računa
3. **Knjiga ulaznih računa** → ne postoji kao zakonski dokument (zakonska obveza)
4. **Slanje knjigovođi** → otvara mailto umjesto da šalje direktno iz sustava

Bonus (ako stigne): Import bankovnih izvadaka (CSV upload + parser)

---

## KORAK 1 — Migracija 011: Proširenje tablice `racuni`

Kreiraj `supabase/migrations/011_racuni_kategorija.sql`:

```sql
-- ============================================================
-- MIGRACIJA 011: Kategorizacija računa i AOP kontni plan
-- ============================================================

-- Dodaj kategoriju na račun (veza na stavku financijskog plana)
ALTER TABLE racuni
  ADD COLUMN IF NOT EXISTS plan_stavka_id  UUID REFERENCES financijski_plan_stavke(id),
  ADD COLUMN IF NOT EXISTS aop_konto       TEXT DEFAULT '',   -- npr. "3221", "4111"
  ADD COLUMN IF NOT EXISTS poslano_knjigov_datum  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS poslano_knjigov_id     UUID REFERENCES korisnici(id),
  ADD COLUMN IF NOT EXISTS dobavljac_id    UUID REFERENCES clanovi(id),  -- opcionalno, za membre
  ADD COLUMN IF NOT EXISTS dobavljac_naziv TEXT DEFAULT '';  -- slobodan unos za vanjske dobavljače

-- Tablica za pamćenje zadnje kategorije po dobavljaču
-- AUTOMATIZACIJA: kad korisnik unese novi račun od istog dobavljača,
-- sustav automatski predlaže istu stavku financijskog plana
CREATE TABLE IF NOT EXISTS dobavljaci_kategorije (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv_stranke    TEXT NOT NULL UNIQUE,  -- normaliziran naziv (lowercase, trim)
  plan_stavka_id   UUID REFERENCES financijski_plan_stavke(id),
  aop_konto        TEXT DEFAULT '',
  zadnji_racun_id  UUID REFERENCES racuni(id),
  zadnji_put       TIMESTAMPTZ DEFAULT now()
);

-- Index za brzo pretraživanje po nazivu
CREATE INDEX IF NOT EXISTS idx_dobavljaci_naziv ON dobavljaci_kategorije(naziv_stranke);

-- RLS: dobavljaci_kategorije
ALTER TABLE dobavljaci_kategorije ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dobavljaci_select" ON dobavljaci_kategorije
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dobavljaci_write" ON dobavljaci_kategorije
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
      AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
      AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true)
  );

-- ============================================================
-- TRIGGER: Kad se račun označi kao plaćen →
-- automatski ažuriraj iznos_ostvareno u financijskom planu
-- AUTOMATIZACIJA: nema ručnog unosa ostvarenog
-- ============================================================

CREATE OR REPLACE FUNCTION sync_ostvareno_na_placanje()
RETURNS TRIGGER AS $$
BEGIN
  -- Samo ako se status mijenja NA 'placeno' i ima plan_stavka_id
  IF NEW.status = 'placeno'
     AND OLD.status != 'placeno'
     AND NEW.plan_stavka_id IS NOT NULL
  THEN
    UPDATE financijski_plan_stavke
    SET iznos_ostvareno = (
      SELECT COALESCE(SUM(r.iznos_ukupno), 0)
      FROM racuni r
      WHERE r.plan_stavka_id = NEW.plan_stavka_id
        AND r.status = 'placeno'
    )
    WHERE id = NEW.plan_stavka_id;
  END IF;

  -- Ažuriraj dobavljaci_kategorije kad se postavi kategorija
  IF NEW.plan_stavka_id IS NOT NULL
     AND NEW.naziv_stranke IS NOT NULL
     AND NEW.naziv_stranke != ''
  THEN
    INSERT INTO dobavljaci_kategorije (naziv_stranke, plan_stavka_id, aop_konto, zadnji_racun_id)
    VALUES (lower(trim(NEW.naziv_stranke)), NEW.plan_stavka_id, COALESCE(NEW.aop_konto,''), NEW.id)
    ON CONFLICT (naziv_stranke) DO UPDATE
      SET plan_stavka_id  = EXCLUDED.plan_stavka_id,
          aop_konto       = EXCLUDED.aop_konto,
          zadnji_racun_id = EXCLUDED.zadnji_racun_id,
          zadnji_put      = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS racun_placanje_sync ON racuni;
CREATE TRIGGER racun_placanje_sync
  AFTER UPDATE ON racuni
  FOR EACH ROW EXECUTE FUNCTION sync_ostvareno_na_placanje();

-- ============================================================
-- VIEW: Knjiga ulaznih računa (zakonski dokument)
-- Kronološki popis svih ulaznih računa za godinu
-- Automatski se održava — nema ručnog vođenja
-- ============================================================

CREATE OR REPLACE VIEW knjiga_ulaznih_racuna AS
SELECT
  ROW_NUMBER() OVER (
    PARTITION BY EXTRACT(YEAR FROM datum_racuna)
    ORDER BY datum_racuna, created_at
  )                             AS redni_broj,
  EXTRACT(YEAR FROM datum_racuna)::int AS godina,
  interni_broj,
  datum_racuna,
  naziv_stranke,
  opis,
  iznos_ukupno,
  status,
  aop_konto,
  ps.naziv_stavke               AS kategorija_plana,
  datum_placanja,
  likvidirao.ime || ' ' || likvidirao.prezime AS likvidirao_ime,
  datum_odobravanja             AS datum_likvidacije,
  created_at
FROM racuni r
LEFT JOIN financijski_plan_stavke ps ON ps.id = r.plan_stavka_id
LEFT JOIN korisnici likvidirao ON likvidirao.id = r.odobrio_id
WHERE r.vrsta = 'ulazni'
ORDER BY r.datum_racuna, r.created_at;
```

---

## KORAK 2 — Ažuriranje `financije.ts` queries

Dodaj na kraj `src/lib/supabase/queries/financije.ts`:

```ts
// ── Kategorizacija računa ──────────────────────────────────

export interface DobavljacKategorija {
  naziv_stranke: string
  plan_stavka_id: string | null
  aop_konto: string
}

/**
 * Dohvati zapamćenu kategoriju za dobavljača.
 * Poziva se kad korisnik upiše naziv stranke u formu — automatski prijedlog.
 */
export async function dohvatiKategorijuDobavljaca(
  nazivStranke: string
): Promise<DobavljacKategorija | null> {
  const { data } = await supabase
    .from('dobavljaci_kategorije')
    .select('naziv_stranke, plan_stavka_id, aop_konto')
    .eq('naziv_stranke', nazivStranke.toLowerCase().trim())
    .maybeSingle()
  return data as DobavljacKategorija | null
}

/**
 * Dohvati stavke financijskog plana za tekuću godinu (rashodi) — za dropdown.
 */
export async function dohvatiStavkeZaKategorizaciju(godina: number) {
  const plan = await dohvatiFinPlan(godina)
  if (!plan) return []
  const { data, error } = await supabase
    .from('financijski_plan_stavke')
    .select('id, naziv_stavke, kategorija, racunski_plan_konto, iznos_plan, iznos_ostvareno')
    .eq('plan_id', plan.id)
    .eq('kategorija', 'rashod')
    .order('redni_broj')
  if (error) throw error
  return data
}

// ── Knjiga ulaznih računa (VIEW) ───────────────────────────

export interface KnjigaUlazniRacun {
  redni_broj: number
  godina: number
  interni_broj: string | null
  datum_racuna: string
  naziv_stranke: string
  opis: string | null
  iznos_ukupno: number
  status: string
  aop_konto: string | null
  kategorija_plana: string | null
  datum_placanja: string | null
  likvidirao_ime: string | null
  datum_likvidacije: string | null
}

export async function dohvatiKnjiguUlaznihRacuna(
  godina: number
): Promise<KnjigaUlazniRacun[]> {
  const { data, error } = await supabase
    .from('knjiga_ulaznih_racuna')
    .select('*')
    .eq('godina', godina)
    .order('redni_broj')
  if (error) throw error
  return data as KnjigaUlazniRacun[]
}

// ── Označi kao poslano knjigovođi (pravi zapis) ────────────

export async function oznacPoslatoKnjigov(
  racunIds: string[],
  korisnikId: string
): Promise<void> {
  const { error } = await supabase
    .from('racuni')
    .update({
      poslano_knjigov_datum: new Date().toISOString(),
      poslano_knjigov_id: korisnikId,
    })
    .in('id', racunIds)
  if (error) throw error
}
```

---

## KORAK 3 — Ažuriranje `RacuniPage.tsx`

### 3.1 Forma za novi račun — auto-prijedlog kategorije

Proširi `forma` state:
```ts
const [forma, setForma] = useState({
  naziv_stranke: '',
  datum_racuna: new Date().toISOString().split('T')[0],
  iznos_ukupno: '',
  opis: '',
  plan_stavka_id: '',  // NOVO
  aop_konto: '',       // NOVO
})
const [stavkePlana, setStavkePlana] = useState<Awaited<ReturnType<typeof dohvatiStavkeZaKategorizaciju>>>([])
const [prijedlogKategorije, setPrijedlogKategorije] = useState<string | null>(null)
```

Pri učitavanju stranice, dohvati stavke plana:
```ts
useEffect(() => {
  dohvatiStavkeZaKategorizaciju(godina).then(setStavkePlana).catch(console.error)
}, [godina])
```

**Automatski prijedlog kategorije pri unosu dobavljača:**
```ts
// Debounce na promjenu naziv_stranke
useEffect(() => {
  if (forma.naziv_stranke.length < 3) return
  const timer = setTimeout(async () => {
    const kat = await dohvatiKategorijuDobavljaca(forma.naziv_stranke)
    if (kat?.plan_stavka_id) {
      setForma(f => ({
        ...f,
        plan_stavka_id: kat.plan_stavka_id || '',
        aop_konto: kat.aop_konto || '',
      }))
      const stavka = stavkePlana.find(s => s.id === kat.plan_stavka_id)
      if (stavka) setPrijedlogKategorije(stavka.naziv_stavke)
    }
  }, 500)
  return () => clearTimeout(timer)
}, [forma.naziv_stranke])
```

Dodaj u formu prikaz prijedloga + dropdown za ručni odabir:
```tsx
{/* Kategorizacija — AUTOMATSKA iz zadnjeg računa istog dobavljača */}
<div className="md:col-span-2">
  <label className="block text-xs text-[#999] mb-1">
    Kategorija financijskog plana
    {prijedlogKategorije && (
      <span className="ml-2 text-emerald-400 text-[10px]">
        ⚡ Automatski preuzeto: {prijedlogKategorije}
      </span>
    )}
  </label>
  <select
    value={forma.plan_stavka_id}
    onChange={e => {
      const id = e.target.value
      const stavka = stavkePlana.find(s => s.id === id)
      setForma(f => ({
        ...f,
        plan_stavka_id: id,
        aop_konto: stavka?.racunski_plan_konto || '',
      }))
      setPrijedlogKategorije(null)
    }}
    className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]"
  >
    <option value="">-- Odaberi stavku plana --</option>
    {stavkePlana.map(s => (
      <option key={s.id} value={s.id}>
        {s.racunski_plan_konto ? `[${s.racunski_plan_konto}] ` : ''}{s.naziv_stavke}
        {' '}(Plan: {new Intl.NumberFormat('hr-HR').format(s.iznos_plan || 0)} EUR)
      </option>
    ))}
  </select>
  {forma.plan_stavka_id && (
    <p className="text-[10px] text-[#666] mt-0.5">
      Plaćanjem ovog računa automatski će se ažurirati ostvarenje u financijskom planu.
    </p>
  )}
</div>
```

### 3.2 Slanje knjigovođi — pravi zapis umjesto mailto

Zamijeni `handlePosaljiKnjigov` funkciju:

```ts
async function handlePosaljiKnjigov() {
  if (!korisnik) return
  const odabraniRacuni = racuni.filter(r => odabrani.has(r.id))
  if (odabraniRacuni.length === 0) return

  if (!confirm(
    `Poslati ${odabraniRacuni.length} računa knjigovođi?\n` +
    `Ukupno: ${fEUR(odabraniRacuni.reduce((a, r) => a + Number(r.iznos_ukupno), 0))}\n\n` +
    `Datum slanja će biti zabilježen u sustavu.`
  )) return

  try {
    // Zabilježi u sustav
    await oznacPoslatoKnjigov(odabraniRacuni.map(r => r.id), korisnik.id)

    // Otvori mailto kao sekundarni kanal (za prilaganje PDF-ova)
    const popis = odabraniRacuni
      .map((r, i) =>
        `${i + 1}. ${r.interni_broj || 'b/b'} — ${r.naziv_stranke} — ` +
        `${new Date(r.datum_racuna).toLocaleDateString('hr-HR')} — ` +
        `${Number(r.iznos_ukupno).toFixed(2)} EUR`
      ).join('\n')
    const subject = `DVD Sarvaš — Računi ${new Date().toLocaleDateString('hr-HR')} (${odabraniRacuni.length} kom)`
    const body =
      `Poštovani,\n\nU prilogu šaljem ${odabraniRacuni.length} računa za knjiženje:\n\n` +
      popis +
      `\n\nUkupno: ${odabraniRacuni.reduce((a, r) => a + Number(r.iznos_ukupno), 0).toFixed(2)} EUR\n\nS poštovanjem,\nDVD Sarvaš`
    window.open(
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      '_blank'
    )

    setOdabrani(new Set())
    await ucitaj()
    alert('Slanje zabilježeno. Priložite dokumente u email klijentu.')
  } catch (err) {
    console.error(err)
    alert('Greška pri bilježenju slanja.')
  }
}
```

### 3.3 Prikaz "Poslano knjigovođi" u ekspandiranom redu

U expanded sekciji, nakon prikaza plaćanja, dodaj:
```tsx
{r.poslano_knjigov_datum && (
  <div className="text-xs text-[#999] bg-[#2a2a2e] px-3 py-2 rounded mt-2">
    📤 Poslano knjigovođi: {new Date(r.poslano_knjigov_datum).toLocaleDateString('hr-HR')}
  </div>
)}
```

### 3.4 Novi tab "Knjiga ulaznih računa"

Dodaj tab navigaciju u `RacuniPage`:
```ts
type TabRacuni = 'lista' | 'knjiga' | 'analiza'
const [activeTab, setActiveTab] = useState<TabRacuni>('lista')
```

Tab "Knjiga" prikazuje `KnjigaUlaznihRacuna` komponentu:

```tsx
function KnjigaUlaznihRacuna({ godina }: { godina: number }) {
  const [stavke, setStavke] = useState<KnjigaUlazniRacun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dohvatiKnjiguUlaznihRacuna(godina)
      .then(setStavke)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [godina])

  async function handleExportXlsx() {
    // Generiraj XLSX za Knjiga ulaznih računa
    // Koristiti već instaliranu xlsx/docx biblioteku
    const { utils, writeFile } = await import('xlsx')
    const ws = utils.json_to_sheet(stavke.map(s => ({
      'R.br.': s.redni_broj,
      'Interni br.': s.interni_broj || '',
      'Datum računa': s.datum_racuna,
      'Naziv stranke': s.naziv_stranke,
      'Opis': s.opis || '',
      'Iznos (EUR)': s.iznos_ukupno,
      'AOP konto': s.aop_konto || '',
      'Kategorija plana': s.kategorija_plana || '',
      'Status': s.status,
      'Datum plaćanja': s.datum_placanja || '',
      'Likvidirao': s.likvidirao_ime || '',
    })))
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, `KUR ${godina}`)
    writeFile(wb, `Knjiga_ulaznih_racuna_${godina}.xlsx`)
  }

  if (loading) return <div className="p-8 text-center text-[#999]">Učitavanje...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Knjiga ulaznih računa {godina}</h2>
          <p className="text-xs text-[#777] mt-0.5">
            Zakonski dokument — čuvati 7 godina. {stavke.length} zapisa.
          </p>
        </div>
        <button
          onClick={handleExportXlsx}
          className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg hover:bg-[#333338]"
        >
          📥 Export .xlsx
        </button>
      </div>

      <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2e2e32] bg-[#1e1e22]">
                <th className="text-left px-3 py-3 text-[#999] uppercase">R.br.</th>
                <th className="text-left px-3 py-3 text-[#999] uppercase">Int. br.</th>
                <th className="text-left px-3 py-3 text-[#999] uppercase">Datum</th>
                <th className="text-left px-3 py-3 text-[#999] uppercase">Stranka</th>
                <th className="text-left px-3 py-3 text-[#999] uppercase hidden lg:table-cell">Kategorija</th>
                <th className="text-right px-3 py-3 text-[#999] uppercase">Iznos</th>
                <th className="text-left px-3 py-3 text-[#999] uppercase">Status</th>
                <th className="text-left px-3 py-3 text-[#999] uppercase hidden md:table-cell">Plaćeno</th>
              </tr>
            </thead>
            <tbody>
              {stavke.map(s => (
                <tr key={s.redni_broj} className="border-b border-[#2a2a2e] hover:bg-[#1e1e22]">
                  <td className="px-3 py-2 text-[#777]">{s.redni_broj}</td>
                  <td className="px-3 py-2 font-mono text-[#999]">{s.interni_broj || '—'}</td>
                  <td className="px-3 py-2 text-[#bbb]">{new Date(s.datum_racuna).toLocaleDateString('hr-HR')}</td>
                  <td className="px-3 py-2 text-white font-medium">{s.naziv_stranke}</td>
                  <td className="px-3 py-2 text-[#777] hidden lg:table-cell">{s.kategorija_plana || '—'}</td>
                  <td className="px-3 py-2 text-right text-white">
                    {new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(s.iznos_ukupno)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      s.status === 'placeno' ? 'bg-green-900/25 text-green-400' :
                      s.status === 'odobreno' ? 'bg-blue-900/25 text-blue-400' :
                      'bg-yellow-900/25 text-yellow-400'
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-3 py-2 text-[#777] hidden md:table-cell">
                    {s.datum_placanja ? new Date(s.datum_placanja).toLocaleDateString('hr-HR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#333338] bg-[#1a1a1e]">
                <td colSpan={5} className="px-3 py-3 text-xs font-semibold text-[#bbb]">
                  UKUPNO ({stavke.length} računa)
                </td>
                <td className="px-3 py-3 text-right font-bold text-white">
                  {new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(
                    stavke.reduce((a, s) => a + s.iznos_ukupno, 0)
                  )}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
```

### 3.5 Tab "Analiza" — plan vs ostvareno iz računa

```tsx
function AnalizaFinancija({ godina }: { godina: number }) {
  // Prikazuje stavke financijskog plana s progresom koji dolazi
  // AUTOMATSKI iz plaćenih računa (trigger u bazi to ažurira)
  // Ovo je read-only pogled — nema ručnog unosa
  const [plan, setPlan] = useState<FinPlan | null>(null)
  const [stavke, setStavke] = useState<FinStavka[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function ucitaj() {
      const p = await dohvatiFinPlan(godina).catch(() => null)
      setPlan(p)
      if (p) setStavke(await dohvatiStavkePlana(p.id).catch(() => []))
      setLoading(false)
    }
    ucitaj()
  }, [godina])

  const rashodi = stavke.filter(s => s.kategorija === 'rashod')
  const prihodi = stavke.filter(s => s.kategorija === 'prihod')
  const fEUR = (v: number) => new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v)

  if (loading) return <div className="p-8 text-center text-[#999]">Učitavanje...</div>
  if (!plan) return <div className="p-8 text-center text-[#999]">Nema financijskog plana za {godina}.</div>

  return (
    <div className="space-y-6">
      <div className="bg-[#1e1e22] border border-[#333338] rounded-lg p-4 text-xs text-[#bbb]">
        ⚡ Ostvarenje se automatski ažurira iz plaćenih računa — nema ručnog unosa.
        Kategoriziraj račune pri unosu za točan prikaz.
      </div>

      {[
        { naslov: 'Prihodi', stavke: prihodi, boja: 'emerald' },
        { naslov: 'Rashodi', stavke: rashodi, boja: 'red' },
      ].map(({ naslov, stavke: s, boja }) => (
        <div key={naslov} className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2e2e32]">
            <h3 className="text-sm font-semibold text-white">{naslov}</h3>
            <p className="text-xs text-[#777] mt-0.5">
              Plan: {fEUR(s.reduce((a, x) => a + (x.iznos_plan || 0), 0))} ·
              Ostvareno: {fEUR(s.reduce((a, x) => a + (x.iznos_ostvareno || 0), 0))}
            </p>
          </div>
          <div className="divide-y divide-[#2a2a2e]">
            {s.map(stavka => {
              const plan = stavka.iznos_plan || 0
              const ost = stavka.iznos_ostvareno || 0
              const pct = plan > 0 ? Math.min(Math.round((ost / plan) * 100), 100) : 0
              const overBudget = ost > plan && plan > 0
              return (
                <div key={stavka.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm text-white">{stavka.naziv_stavke}</span>
                      {stavka.racunski_plan_konto && (
                        <span className="ml-2 text-[10px] text-[#555] font-mono">{stavka.racunski_plan_konto}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${overBudget ? 'text-red-400' : 'text-white'}`}>
                        {fEUR(ost)}
                      </span>
                      <span className="text-xs text-[#666] ml-1">/ {fEUR(plan)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#1a1a1e] rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${overBudget ? 'bg-red-500' : pct >= 80 ? 'bg-orange-500' : boja === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[#666] mt-0.5 text-right">{pct}%</div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## KORAK 4 — Import bankovnih izvadaka (CSV)

### 4.1 Migracija 012: Tablica `bank_transakcije`

```sql
-- supabase/migrations/012_bank_transakcije.sql

CREATE TABLE bank_transakcije (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum            DATE NOT NULL,
  iznos            DECIMAL(12,2) NOT NULL,
  tip              TEXT NOT NULL CHECK (tip IN ('prihod', 'rashod')),
  opis             TEXT DEFAULT '',
  referenca        TEXT DEFAULT '',     -- referenca plaćanja iz banke
  racun_id         UUID REFERENCES racuni(id),   -- NULL ako nije spojeno
  status           TEXT NOT NULL DEFAULT 'nespojeno'
                   CHECK (status IN ('nespojeno', 'spojeno', 'ignorano')),
  izvor            TEXT DEFAULT 'csv_upload'
                   CHECK (izvor IN ('csv_upload', 'n8n_auto', 'rucno')),
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bank_tranz_datum ON bank_transakcije(datum);
CREATE INDEX idx_bank_tranz_status ON bank_transakcije(status);

ALTER TABLE bank_transakcije ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_select" ON bank_transakcije FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true));
CREATE POLICY "bank_write" ON bank_transakcije FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true))
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true));
```

### 4.2 CSV parser — `src/lib/utils/bank-parser.ts`

```ts
export interface BankTransakcija {
  datum: string
  iznos: number
  tip: 'prihod' | 'rashod'
  opis: string
  referenca: string
}

/**
 * Parsira bankovni izvadak. Podržava formate:
 * - Erste: "Datum;Opis;Iznos;Valuta;Stanje"
 * - PBZ: "Datum transakcije;Opis;Dugovni iznos;Potražni iznos"
 * - ZABA: "Datum;Valuta datum;Iznos;Opis transakcije"
 * - Generički: autodetekt
 */
export function parsirајCSV(csv: string): BankTransakcija[] {
  const linije = csv
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  if (linije.length < 2) throw new Error('CSV je prazan ili nema podataka')

  const separator = detektirajSeparator(linije[0])
  const zaglavlje = linije[0].split(separator).map(h => h.trim().toLowerCase().replace(/['"]/g, ''))

  // Detektiraj format banke
  const format = detektirajFormat(zaglavlje)

  return linije.slice(1)
    .map(linija => parseLinijaPoFormatu(linija, separator, zaglavlje, format))
    .filter((t): t is BankTransakcija => t !== null)
}

function detektirajSeparator(zaglavlje: string): string {
  if (zaglavlje.includes(';')) return ';'
  if (zaglavlje.includes(',')) return ','
  if (zaglavlje.includes('\t')) return '\t'
  return ';'
}

function detektirajFormat(zaglavlje: string[]): string {
  if (zaglavlje.some(h => h.includes('dugovni'))) return 'pbz'
  if (zaglavlje.some(h => h.includes('stanje'))) return 'erste'
  if (zaglavlje.some(h => h.includes('valuta datum'))) return 'zaba'
  return 'generic'
}

function parseLinijaPoFormatu(
  linija: string,
  sep: string,
  zaglavlje: string[],
  format: string
): BankTransakcija | null {
  const cells = linija.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''))

  try {
    const get = (kljuc: string) => {
      const idx = zaglavlje.findIndex(h => h.includes(kljuc))
      return idx >= 0 ? cells[idx] || '' : ''
    }

    const parseIznos = (s: string) =>
      parseFloat(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''))

    let datum = '', iznos = 0, tip: 'prihod' | 'rashod' = 'rashod', opis = '', referenca = ''

    if (format === 'pbz') {
      datum = get('datum')
      const dug = parseIznos(get('dugovni'))
      const pot = parseIznos(get('potražni'))
      iznos = isNaN(dug) || dug === 0 ? Math.abs(pot) : Math.abs(dug)
      tip = isNaN(dug) || dug === 0 ? 'prihod' : 'rashod'
      opis = get('opis')
    } else {
      datum = get('datum')
      const iznosStr = get('iznos')
      const iznosNum = parseIznos(iznosStr)
      iznos = Math.abs(iznosNum)
      tip = iznosNum < 0 ? 'rashod' : 'prihod'
      opis = get('opis') || get('opis transakcije') || get('namjena')
      referenca = get('referenca') || get('broj dokumenta') || ''
    }

    // Normalizacija datuma (DD.MM.YYYY → YYYY-MM-DD)
    const datumNorm = normalizirајDatum(datum)
    if (!datumNorm || isNaN(iznos) || iznos === 0) return null

    return { datum: datumNorm, iznos, tip, opis: opis.trim(), referenca: referenca.trim() }
  } catch {
    return null
  }
}

function normalizirајDatum(d: string): string | null {
  d = d.trim()
  // DD.MM.YYYY
  const m1 = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`
  // DD/MM/YYYY
  const m2 = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m2) return `${m2[3]}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`
  // YYYY-MM-DD
  const m3 = d.match(/^\d{4}-\d{2}-\d{2}$/)
  if (m3) return d
  return null
}
```

### 4.3 Nova stranica — `src/pages/racuni/BankPage.tsx`

Stranica s tri sekcije:
1. **Upload** — drag & drop CSV zona s podrškom za poznate banke
2. **Nespojene transakcije** — lista s gumbom "Spoji s računom"
3. **Sve transakcije** — pregled po datumu

Za svaku nespojen transakciju — smart matching:
```ts
// Pronađi kandidate za spajanje (plaćeni ili likvidirani računi sličnog iznosa ±0.01 EUR)
async function pronađiKandidateZaSpajanje(transakcija: BankTransakcija) {
  const { data } = await supabase
    .from('racuni')
    .select('id, naziv_stranke, iznos_ukupno, datum_racuna, status')
    .gte('iznos_ukupno', transakcija.iznos - 0.01)
    .lte('iznos_ukupno', transakcija.iznos + 0.01)
    .in('status', ['odobreno', 'placeno'])
    .is('bank_transakcija_id', null)  // još nije spojeno
    .order('datum_racuna', { ascending: false })
    .limit(5)
  return data || []
}
```

Dodaj rutu u `App.tsx`: `<Route path="/racuni/bank" component={BankPage} />`
Dodaj link u `AppLayout.tsx` NAV pod "Financije": `{ path: '/racuni/bank', label: 'Izvadak banke', section: 'Financije' }`

---

## Redosljed commitova Sprint 010

```
1. sql: migracija 011 — kategorija na računima + trigger za ostvareno + knjiga view
2. sql: migracija 012 — bank_transakcije tablica
3. feat: queries/financije.ts — dodati kategorizaciju, knjiga, označi poslano
4. feat: RacuniPage — auto-prijedlog kategorije pri unosu dobavljača
5. feat: RacuniPage — tab Knjiga ulaznih računa + xlsx export
6. feat: RacuniPage — tab Analiza (plan vs ostvareno iz računa)
7. feat: RacuniPage — slanje knjigovođi bilježi datum u sustav
8. feat: utils/bank-parser.ts — CSV parser za Erste/PBZ/ZABA
9. feat: BankPage — upload + prikaz transakcija + spajanje s računima
10. chore: supabase gen types
```

---

---

# SPRINT 011 — Proaktivni ERP: Akcijski centar

## Filozofija

Korisnik otvori sustav i vidi **jedan ekran** koji mu govori točno što mora napraviti danas i ovaj tjedan. Navigacija po modulima je sekundarna.

---

## KORAK 1 — Nova stranica: `/akcije`

Ovo nije dashboard — dashboard je pregled stanja. **Akcijski centar** je to-do lista s direktnim akcijama.

Svaka stavka je **akcijska** — klik vodi direktno na akciju, ne na pregled.

### Kategorije akcija (automatski detektirane)

```ts
// src/lib/utils/akcije.ts

export interface AkcijskaStavka {
  id: string
  prioritet: 1 | 2 | 3           // 1=hitno, 2=uskoro, 3=planirano
  kategorija: string              // ikona i boja
  naslov: string                  // kratko i jasno
  opis: string                    // jedan red objašnjenja
  akcija_label: string            // tekst gumba
  akcija_href: string             // kamo ide klik
  rok?: string                    // datum isteka
  dani_do_roka?: number
}

// Generira kompletnu listu akcija za ulogu korisnika
export async function generirajAkcije(
  uloga: string
): Promise<AkcijskaStavka[]> {
  const akcije: AkcijskaStavka[] = []
  const danas = new Date()

  // ── Za sve uloge ──────────────────────────────────────────

  // Zdravstveni pregledi koji ističu
  const { data: zdravlje } = await supabase
    .from('zdravstveni_pregledi')
    .select('id, clan_id, datum_sljedeceg, clanovi(ime, prezime)')
    .lte('datum_sljedeceg', addDays(danas, 60).toISOString().split('T')[0])
    .order('datum_sljedeceg')
  zdravlje?.forEach(z => {
    const dani = diffDays(z.datum_sljedeceg, danas)
    akcije.push({
      id: `zdrav-${z.clan_id}`,
      prioritet: dani < 0 ? 1 : dani <= 14 ? 2 : 3,
      kategorija: 'zdravlje',
      naslov: `Liječnički: ${(z.clanovi as any)?.prezime} ${(z.clanovi as any)?.ime}`,
      opis: dani < 0 ? `Istekao ${Math.abs(dani)} dana` : `Ističe za ${dani} dana`,
      akcija_label: 'Unesi novi pregled',
      akcija_href: `/clanstvo/${z.clan_id}`,
      rok: z.datum_sljedeceg,
      dani_do_roka: dani,
    })
  })

  // ── Za predsjednika/zamjenika/admina ──────────────────────
  if (['admin', 'predsjednik', 'zamjenik'].includes(uloga)) {

    // Računi čekaju likvidaciju
    const { data: cekaju, count } = await supabase
      .from('racuni')
      .select('id', { count: 'exact' })
      .in('status', ['primljeno', 'u_obradi'])
    if ((count || 0) > 0) {
      akcije.push({
        id: 'likvidacija',
        prioritet: 2,
        kategorija: 'financije',
        naslov: `${count} računa čeka likvidaciju`,
        opis: 'Predsjednički potpis potreban za nastavak plaćanja',
        akcija_label: 'Likvidiraj sada',
        akcija_href: '/racuni',
      })
    }

    // Zakonska izvješća koja ističu
    const { data: izvjesca } = await supabase
      .from('zakonska_izvjesca')
      .select('id, naziv, rok')
      .in('status', ['nije_predano', 'u_pripremi'])
      .lte('rok', addDays(danas, 30).toISOString().split('T')[0])
    izvjesca?.forEach(iz => {
      const dani = diffDays(iz.rok, danas)
      akcije.push({
        id: `izvjesce-${iz.id}`,
        prioritet: dani < 0 ? 1 : dani <= 7 ? 1 : 2,
        kategorija: 'zakon',
        naslov: iz.naziv,
        opis: dani < 0 ? `Rok prošao ${Math.abs(dani)} dana` : `Rok za ${dani} dana`,
        akcija_label: 'Označi predanim',
        akcija_href: '/zakonska-izvjesca',
        rok: iz.rok,
        dani_do_roka: dani,
      })
    })

    // Nespojene bankovne transakcije
    const { count: nespojenoCount } = await supabase
      .from('bank_transakcije')
      .select('id', { count: 'exact' })
      .eq('status', 'nespojeno')
    if ((nespojenoCount || 0) > 0) {
      akcije.push({
        id: 'bank-nespojeno',
        prioritet: 2,
        kategorija: 'financije',
        naslov: `${nespojenoCount} transakcija banke nije spojeno`,
        opis: 'Spoji transakcije s računima za točno izvršenje plana',
        akcija_label: 'Spoji transakcije',
        akcija_href: '/racuni/bank',
      })
    }

    // Registracije vozila koje ističu
    const { data: vozila } = await supabase
      .from('imovina')
      .select('id, naziv, registracija_do')
      .eq('vrsta', 'vozilo')
      .lte('registracija_do', addDays(danas, 45).toISOString().split('T')[0])
    vozila?.forEach(v => {
      if (!v.registracija_do) return
      const dani = diffDays(v.registracija_do, danas)
      akcije.push({
        id: `reg-${v.id}`,
        prioritet: dani < 0 ? 1 : dani <= 14 ? 2 : 3,
        kategorija: 'imovina',
        naslov: `Registracija: ${v.naziv}`,
        opis: dani < 0 ? `Istekla ${Math.abs(dani)} dana` : `Ističe za ${dani} dana`,
        akcija_label: 'Unesi obnovu',
        akcija_href: '/imovina',
        rok: v.registracija_do,
        dani_do_roka: dani,
      })
    })
  }

  // Sortiraj: prioritet 1 prvo, unutar prioriteta po datumu
  return akcije.sort((a, b) =>
    a.prioritet !== b.prioritet ? a.prioritet - b.prioritet :
    (a.dani_do_roka ?? 999) - (b.dani_do_roka ?? 999)
  )
}

// Helpers
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function diffDays(iso: string, od: Date): number {
  return Math.ceil((new Date(iso).getTime() - od.getTime()) / 86400000)
}
```

### AkcijskiCentar komponenta — `src/pages/akcije/AkcijskiCentar.tsx`

```tsx
export function AkcijskiCentar() {
  const { korisnik } = useAuthStore()
  const [akcije, setAkcije] = useState<AkcijskaStavka[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!korisnik) return
    generirajAkcije(korisnik.uloga)
      .then(setAkcije)
      .finally(() => setLoading(false))
  }, [korisnik])

  const hitne = akcije.filter(a => a.prioritet === 1)
  const uskoro = akcije.filter(a => a.prioritet === 2)
  const planirano = akcije.filter(a => a.prioritet === 3)

  const katBoja: Record<string, string> = {
    financije: 'border-l-blue-500',
    zakon:     'border-l-red-500',
    zdravlje:  'border-l-orange-500',
    imovina:   'border-l-yellow-500',
    clanstvo:  'border-l-purple-500',
  }

  const AkcijskaKartica = ({ a }: { a: AkcijskaStavka }) => (
    <div className={`bg-[#242428] border border-[#333338] rounded-xl p-4 border-l-4 ${katBoja[a.kategorija] || 'border-l-[#555]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{a.naslov}</p>
          <p className="text-xs text-[#777] mt-0.5">{a.opis}</p>
        </div>
        <Link href={a.akcija_href}
          className="flex-shrink-0 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 whitespace-nowrap">
          {a.akcija_label} →
        </Link>
      </div>
    </div>
  )

  if (loading) return <div className="p-8 text-center text-[#999]">Učitavanje akcija...</div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Što trebaš napraviti</h1>
        <p className="text-sm text-[#aaa] mt-1">
          {akcije.length === 0 ? '✅ Sve je u redu!' : `${hitne.length} hitno · ${uskoro.length} uskoro · ${planirano.length} planirano`}
        </p>
      </div>

      {akcije.length === 0 && (
        <div className="bg-[#242428] border border-[#333338] rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-white font-semibold">Sve je u redu!</p>
          <p className="text-[#777] text-sm mt-1">Nema hitnih ni nadolazećih akcija.</p>
        </div>
      )}

      {hitne.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">
            🔴 Hitno ({hitne.length})
          </h2>
          <div className="space-y-3">
            {hitne.map(a => <AkcijskaKartica key={a.id} a={a} />)}
          </div>
        </div>
      )}

      {uskoro.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3">
            🟠 Uskoro ({uskoro.length})
          </h2>
          <div className="space-y-3">
            {uskoro.map(a => <AkcijskaKartica key={a.id} a={a} />)}
          </div>
        </div>
      )}

      {planirano.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold text-[#777] uppercase tracking-wider mb-3">
            Planirano ({planirano.length})
          </h2>
          <div className="space-y-3">
            {planirano.map(a => <AkcijskaKartica key={a.id} a={a} />)}
          </div>
        </div>
      )}
    </div>
  )
}
```

Dodaj rutu u `App.tsx`: `<Route path="/akcije" component={AkcijskiCentar} />`
Dodaj u `AppLayout.tsx` NAV: `{ path: '/akcije', label: '⚡ Što napraviti', section: 'Pregled' }` — **odmah ispod Nadzorne ploče**

---

## KORAK 2 — Kopiranje prošle sjednice

U `SjedniceList.tsx`, pored gumba "Nova sjednica" dodaj:

```tsx
async function handleKopirajProslu(vrsta: vrsta_sjednice) {
  // Dohvati zadnju sjednicu te vrste
  const { data: prosla } = await supabase
    .from('sjednice')
    .select('*, tocke_dnevnog_reda(*)')
    .eq('vrsta', vrsta)
    .order('datum', { ascending: false })
    .limit(1)
    .single()

  if (!prosla) { alert('Nema prethodne sjednice za kopiranje.'); return }

  // Nova sjednica: datum = danas + 30 dana, ostalo kopirano
  const novaDatum = new Date()
  novaDatum.setDate(novaDatum.getDate() + 30)

  navigate(`/sjednice/${vrsta}/nova?kopiraj=${prosla.id}&datum=${novaDatum.toISOString().split('T')[0]}`)
}
```

U `SjednicaForma.tsx` — provjeri URL param `kopiraj` pri inicijalizaciji:
```ts
const params = useSearch()  // wouter useSearch
const kopirajId = new URLSearchParams(params).get('kopiraj')

useEffect(() => {
  if (kopirajId) {
    // Učitaj prošlu sjednicu i predpopulaj formu
    dohvatiSjednicu(kopirajId).then(prosla => {
      setForma({
        naziv: prosla.naziv.replace(/\d{4}/, new Date().getFullYear().toString()),
        vrsta: prosla.vrsta,
        datum: new URLSearchParams(params).get('datum') || '',
        mjesto: prosla.mjesto,
        // Kopiraj točke dnevnog reda
      })
      // Kopiraj točke
      dohvatiTocke(kopirajId).then(tocke => {
        setTockeZaKopirati(tocke.map(t => ({
          naziv: t.naziv, redosljed: t.redosljed, nositelj: t.nositelj
        })))
      })
    })
  }
}, [kopirajId])
```

---

## KORAK 3 — Weekly digest email

Edge function `send-reminder` već postoji. Ažuriraj logiku agregacije:

```ts
// supabase/functions/send-reminder/index.ts — proširenje

interface DigestPodaci {
  hitnoCount: number
  hitnoStavke: string[]
  ovajTjedan: string[]
  zelenoCount: number
}

async function generirajDigest(supabase: SupabaseClient): Promise<DigestPodaci> {
  const danas = new Date()
  const za30 = new Date(); za30.setDate(za30.getDate() + 30)

  const [izvjesca, racuni, zdravlje, vozila] = await Promise.all([
    supabase.from('zakonska_izvjesca').select('naziv, rok')
      .in('status', ['nije_predano', 'u_pripremi'])
      .lte('rok', za30.toISOString().split('T')[0]),
    supabase.from('racuni').select('id', { count: 'exact' })
      .in('status', ['primljeno', 'u_obradi']),
    supabase.from('zdravstveni_pregledi').select('datum_sljedeceg, clanovi(prezime)')
      .lte('datum_sljedeceg', za30.toISOString().split('T')[0]),
    supabase.from('imovina').select('naziv, registracija_do')
      .eq('vrsta', 'vozilo')
      .lte('registracija_do', za30.toISOString().split('T')[0])
  ])

  const hitno: string[] = []
  const uskoro: string[] = []

  izvjesca.data?.forEach(iz => {
    const dani = Math.ceil((new Date(iz.rok).getTime() - danas.getTime()) / 86400000)
    const tekst = `${iz.naziv} (${dani < 0 ? `${Math.abs(dani)}d kasni` : `za ${dani}d`})`
    dani <= 7 ? hitno.push(tekst) : uskoro.push(tekst)
  })

  if ((racuni.count || 0) > 0)
    hitno.push(`${racuni.count} računa čeka likvidaciju predsjednika`)

  zdravlje.data?.forEach(z => {
    const dani = Math.ceil((new Date(z.datum_sljedeceg).getTime() - danas.getTime()) / 86400000)
    const tekst = `Liječnički: ${(z.clanovi as any)?.prezime} (${dani < 0 ? 'ISTEKAO' : `za ${dani}d`})`
    dani <= 14 ? hitno.push(tekst) : uskoro.push(tekst)
  })

  return {
    hitnoCount: hitno.length,
    hitnoStavke: hitno.slice(0, 5),
    ovajTjedan: uskoro.slice(0, 5),
    zelenoCount: hitno.length === 0 && uskoro.length === 0 ? 1 : 0,
  }
}
```

Ažuriraj cron job u `003_cron_jobs.sql` da šalje ponedjeljkom u 7:00:
```sql
SELECT cron.schedule('weekly-digest', '0 7 * * 1',
  $$SELECT net.http_post(url := ..., body := '{"type":"weekly_digest"}')$$
);
```

---

---

# SPRINT 012 — Skupštinska automatizacija

## "Pripremi skupštinu" gumb

Ovo je **najprodavaniji feature** u cijelom sustavu. Jedan klik, 6 dokumenata.

Tijek:
1. Korisnik klikne "Pripremi skupštinu za [godina]"
2. Sustav provjerava ima li sve potrebne podatke
3. Ako nedostaje nešto — traži potvrdu/dopunu
4. Generira paket dokumenata

```ts
// src/lib/documents/skupstina-paket.ts

export interface SkupstinaPaket {
  izvjesce_o_radu: Blob       // docx
  financijsko_izvjesce: Blob  // docx
  plan_rada_iduca: Blob       // docx
  financijski_plan_iduca: Blob // docx
  poziv_skupstini: Blob       // docx
  upisnica: Blob              // docx
}

export async function generirajSkupstinuPaket(
  godina: number
): Promise<SkupstinaPaket> {
  // 1. Dohvati sve podatke paralelno
  const [org, funk, aktivnosti, finPlan, finStavke, clanovi] = await Promise.all([
    dohvatiOrganizaciju(),
    dohvatiFunkcionere(),
    supabase.from('aktivnosti_plan_rada').select('*').eq('godina', godina).order('redni_broj'),
    dohvatiFinPlan(godina),
    // ...
    dohvatiClanove({ status: 'aktivan' }),
  ])

  // 2. Generiraj svaki dokument
  // Koristiti postojeću docx infrastrukturu iz sjednice-docs.ts

  // 3. Vrati paket
  return { ... }
}
```

Dodaj gumb na `Dashboard.tsx` i `PlanRada.tsx`:
```tsx
<button onClick={() => navigate('/skupstina/pripremi')}>
  📋 Pripremi skupštinu {nova_godina}
</button>
```

---

---

# SPRINT 013 — Redizajn UI

Detaljan plan je u fajlu `CLAUDE_CODE_ZADATAK.md`.

---

---

# SPRINT 014 — Multi-tenant onboarding

## Arhitektura (podsjetnik)

Svaki DVD dobiva vlastiti Supabase projekt. Centralni meta-registry mapira
subdomain → Supabase URL + anon key.

## Onboarding wizard koraci

1. **Podaci DVD-a** — naziv, OIB, IBAN, adresa
2. **Predsjednik** — ime, email, lozinka
3. **Supabase projekt** — admin unosi URL + anon key (ručno kreiran)
4. **Inicijalizacija** → Edge Function `onboarding-init` radi sve ostalo
5. **Potvrda** — link na novu instancu + upute

## Subdomain routing

```ts
// src/lib/supabase/client.ts — multi-tenant verzija
const subdomain = window.location.hostname.split('.')[0]
const { url, anonKey } = await fetchFromRegistry(subdomain)
supabaseInstance = createClient<Database>(url, anonKey, { ... })
```

---

## Ukupna procjena

| Sprint | Dana | Kumulativno |
|---|---|---|
| 009 — Postavke + Zakoni | 2 | 2 |
| 010 — Financijski workflow | 4 | 6 |
| 011 — Akcijski centar | 3 | 9 |
| 012 — Skupštinska automatizacija | 3 | 12 |
| 013 — Redizajn UI | 3 | 15 |
| 014 — Multi-tenant | 4 | 19 |

**~19 radnih dana** do v1.0 spreman za produkciju i distribuciju.

---

*DVD Sarvaš ERP — https://github.com/dvdsarvas/dvd-erp*
*Ažurirano: April 2026.*
