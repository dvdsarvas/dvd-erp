# DVD ERP — Sprint 011: Akcijski centar + Ispravni financijski model

> Pročitaj u cijelosti prije nego počneš. Radi redom, commitaj po koracima.
> Sprint 010 mora biti gotov i migriran prije ovoga.

---

## Pregled sprinta

Ovaj sprint rješava dvije odvojene stvari:

1. **Ispravni financijski model** — ispravka modela dotacija: novac ide Grad → VZ JLS → DVD, ne direktno. Nova migracija 012 dodaje tablice za VZ i dotacije s ispravnom hijerarhijom, polje za Riznica pripremu.
2. **Akcijski centar** — nova stranica `/akcije` koja govori predsjedniku/tajniku točno što moraju napraviti danas.
3. **Kopiranje prošle sjednice** — smanjuje repetitivni rad.
4. **Weekly digest email** — proširenje `send-reminder` Edge Function.

**Što NE dirati:** Sve tablice iz Sprinta 009 i 010, RLS politike, racuni workflow.

---

## POZADINA: Ispravni model financiranja vatrogastva u HR

### Kako novac ZAPRAVO dolazi do DVD-a

Zakon o vatrogastvu (NN 125/19) čl. 121 kaže:

> "Sredstva za financiranje redovne djelatnosti DVD-a i VZ-a osiguravaju se u proračunu općine, grada i Grada Zagreba čije područje pokrivaju."

Ali to NE znači direktno Grad → DVD. Stvarni tok je:

```
Grad Osijek (proračun)
    ↓  godišnja odluka o isplati dotacije vatrogastvu
Vatrogasna zajednica Grada Osijeka (VZ JLS)
    ↓  godišnja odluka o raspodjeli između DVD-ova
DVD Sarvaš     DVD Osijek    DVD Tenja    ...
```

**Zašto je ovo važno za sustav:**
- Stavka "Dotacija JLS" u financijskom planu DVD-a zapravo dolazi od VZ JLS, ne od Grada
- Iznos nije fiksan — ovisi o godišnjoj odluci VZ JLS o raspodjeli
- DVD ne zna unaprijed koliko će dobiti dok VZ JLS ne donese odluku
- Isti model vrijedi za Županijsku VZ: VZŽ prima od Županije, raspodjeljuje VZ JLS i DVD-ovima
- HVZ prima državna sredstva za opremu i raspodjeljuje programima aktivnosti

### Potpuna financijska hijerarhija

| Razina | Tijelo | Primatelj od | Raspodjeljuje na |
|--------|--------|--------------|------------------|
| Državna | HVZ | Državni proračun (MUP) | VZŽ-ovi (programi opreme) |
| Županijska | VZŽ | Proračun županije | VZ JLS-ovi |
| Lokalna | VZ JLS | Proračun grada/općine | DVD-ovi |
| DVD | DVD Sarvaš | VZ JLS, VZŽ, vlastiti prihodi | — |

### Tipični prihodi jednog DVD-a (poput DVD Sarvaš)

```
PRIHODI DVD-a:
  1. Dotacija VZ JLS (redovna djelatnost)    ← godišnja odluka VZ JLS
  2. Dotacija VZŽ (specifične namjene)       ← natječaj / program
  3. Dotacija HVZ / Program aktivnosti       ← oprema, vozila
  4. Vlastiti prihodi — članarine
  5. Vlastiti prihodi — donacije, priredbe
  6. Vlastiti prihodi — donacije tvrtki
```

---

## KORAK 1 — Migracija 012: VZ model + Riznica priprema

Kreiraj `supabase/migrations/012_vz_dotacije_riznica.sql`:

```sql
-- ============================================================
-- MIGRACIJA 012: Ispravni financijski model + Riznica priprema
-- ============================================================

-- ============================================================
-- 1. Proširenje dvd_organizacija — polje za Riznica
-- ============================================================
ALTER TABLE dvd_organizacija
  ADD COLUMN IF NOT EXISTS rkp_broj       TEXT DEFAULT '',
  -- RKP = Registar korisnika proračuna
  -- DVD-ovi koji su proračunski korisnici JLS-a imaju RKP broj
  -- Većina DVD-ova (udruge) ga NEMA — to je OK
  ADD COLUMN IF NOT EXISTS u_riznici      BOOLEAN DEFAULT false,
  -- true kad JLS uključi DVD u sustav Riznice
  -- Trenutno: lažno za gotovo sve DVD-ove u HR
  -- Priprema za budući scenarij
  ADD COLUMN IF NOT EXISTS riznica_iban   TEXT DEFAULT '',
  -- IBAN Riznice JLS-a ako DVD posluje kroz nju
  ADD COLUMN IF NOT EXISTS riznica_jls    TEXT DEFAULT '';
  -- Naziv JLS koji vodi Riznicu (npr. "Grad Osijek")

COMMENT ON COLUMN dvd_organizacija.u_riznici IS
  'DVD posluje u sustavu Riznice JLS-a. Trenutno rijetko, priprema za budući zakon.';

-- ============================================================
-- 2. Tablica vatrogasnih zajednica
-- Svaki DVD mora znati koja VZ JLS mu je nadređena
-- jer dotacije DOLAZE KROZ VZ, ne direktno od Grada
-- ============================================================
CREATE TABLE IF NOT EXISTS vatrogasne_zajednice (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv           TEXT NOT NULL,
  -- npr. "Vatrogasna zajednica Grada Osijeka"
  vrsta           TEXT NOT NULL CHECK (vrsta IN ('vz_jls', 'vz_zupanije', 'hvz')),
  -- vz_jls    = VZ grada/općine (izravno nadređena DVD-u)
  -- vz_zupanije = VZŽ (Osječko-baranjska)
  -- hvz        = Hrvatska vatrogasna zajednica
  oib             TEXT DEFAULT '',
  adresa          TEXT DEFAULT '',
  grad            TEXT DEFAULT '',
  predsjednik_ime TEXT DEFAULT '',
  zapovjednik_ime TEXT DEFAULT '',
  email           TEXT DEFAULT '',
  telefon         TEXT DEFAULT '',
  iban            TEXT DEFAULT '',
  aktivan         BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vz_vrsta ON vatrogasne_zajednice(vrsta);

ALTER TABLE vatrogasne_zajednice ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vz_select" ON vatrogasne_zajednice
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "vz_write" ON vatrogasne_zajednice
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik') AND aktivan = true))
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik') AND aktivan = true));

-- ============================================================
-- 3. Veza DVD ↔ VZ (DVD je član koje VZ-e)
-- DVD Sarvaš je član VZ Grada Osijeka koja je član VZŽ OBŽ
-- ============================================================
CREATE TABLE IF NOT EXISTS dvd_vz_clanstvo (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vz_id       UUID NOT NULL REFERENCES vatrogasne_zajednice(id),
  datum_od    DATE NOT NULL DEFAULT CURRENT_DATE,
  datum_do    DATE,
  -- NULL = još uvijek aktivno članstvo
  napomena    TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE dvd_vz_clanstvo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dvd_vz_select" ON dvd_vz_clanstvo
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "dvd_vz_write" ON dvd_vz_clanstvo
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik') AND aktivan = true))
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik') AND aktivan = true));

-- ============================================================
-- 4. Tablica odluka VZ o raspodjeli dotacija
-- ============================================================
-- Svake godine VZ JLS donosi odluku koliko daje svakom DVD-u
-- Ovo je KLJUČNI dokument koji opravdava prihod DVD-a od VZ-a

CREATE TABLE IF NOT EXISTS vz_odluke_raspodjele (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vz_id             UUID NOT NULL REFERENCES vatrogasne_zajednice(id),
  godina            SMALLINT NOT NULL,
  datum_odluke      DATE,
  klasa             TEXT DEFAULT '',
  -- Klasa/Ur.broj odluke VZ-a (npr. "KLASA: 210-04/25-01/1")
  ukupni_iznos      DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- Ukupan iznos koji VZ raspodjeljuje svim DVD-ovima
  iznos_za_dvd      DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- Iznos koji je ovaj DVD dobio po odluci
  datum_isplate     DATE,
  -- Kad je VZ stvarno isplatila (može biti u više obroka)
  napomena          TEXT DEFAULT '',
  dokument_id       UUID REFERENCES dokumenti(id),
  -- Upload PDF odluke
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (vz_id, godina)
  -- Jedna odluka po VZ-u po godini
);

CREATE INDEX IF NOT EXISTS idx_vz_odluke_godina ON vz_odluke_raspodjele(godina);

ALTER TABLE vz_odluke_raspodjele ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vz_odluke_select" ON vz_odluke_raspodjele
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true));
CREATE POLICY "vz_odluke_write" ON vz_odluke_raspodjele
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true))
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true));

-- ============================================================
-- 5. TRIGGER: kad se primi dotacija VZ → auto-ažuriraj
--    stavku prihoda u financijskom planu
-- ============================================================
CREATE OR REPLACE FUNCTION sync_vz_dotacija_na_plan()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id UUID;
  v_stavka_id UUID;
BEGIN
  -- Pronađi financijski plan za tu godinu
  SELECT id INTO v_plan_id
  FROM financijski_planovi
  WHERE godina = NEW.godina AND status != 'arhiviran'
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Pronađi stavku prihoda za VZ JLS dotaciju
  -- (pretraži po ključnim riječima u nazivu)
  SELECT id INTO v_stavka_id
  FROM financijski_plan_stavke
  WHERE plan_id = v_plan_id
    AND kategorija = 'prihod'
    AND (
      lower(naziv_stavke) LIKE '%dotacij%'
      OR lower(naziv_stavke) LIKE '%vatrogasna zajednica%'
      OR lower(naziv_stavke) LIKE '%vz%'
    )
  LIMIT 1;

  IF v_stavka_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ažuriraj ostvareni iznos ako je isplaćeno
  IF NEW.datum_isplate IS NOT NULL THEN
    UPDATE financijski_plan_stavke
    SET iznos_ostvareno = (
      SELECT COALESCE(SUM(iznos_za_dvd), 0)
      FROM vz_odluke_raspodjele
      WHERE id IN (
        SELECT od.id FROM vz_odluke_raspodjele od
        JOIN dvd_vz_clanstvo cl ON cl.vz_id = od.vz_id
        WHERE od.godina = NEW.godina
          AND od.datum_isplate IS NOT NULL
      )
    )
    WHERE id = v_stavka_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS vz_dotacija_sync ON vz_odluke_raspodjele;
CREATE TRIGGER vz_dotacija_sync
  AFTER INSERT OR UPDATE ON vz_odluke_raspodjele
  FOR EACH ROW EXECUTE FUNCTION sync_vz_dotacija_na_plan();

-- ============================================================
-- 6. VIEW: Pregled svih dotacija po godini
-- Predsjedniku pokazuje pregled svih izvora financiranja
-- ============================================================
CREATE OR REPLACE VIEW pregled_dotacija AS
SELECT
  od.godina,
  vz.naziv                              AS vz_naziv,
  vz.vrsta                              AS vz_vrsta,
  od.datum_odluke,
  od.klasa,
  od.ukupni_iznos                       AS vz_ukupni_fond,
  od.iznos_za_dvd,
  od.datum_isplate,
  od.datum_isplate IS NOT NULL          AS je_isplaceno,
  ROUND(od.iznos_za_dvd /
    NULLIF(od.ukupni_iznos, 0) * 100, 1) AS udio_posto,
  od.napomena,
  od.dokument_id IS NOT NULL            AS ima_dokument,
  od.id                                 AS odluka_id
FROM vz_odluke_raspodjele od
JOIN vatrogasne_zajednice vz ON vz.id = od.vz_id
ORDER BY od.godina DESC, vz.vrsta;

-- ============================================================
-- 7. Seed: VZ-ovi za DVD Sarvaš
-- ============================================================
INSERT INTO vatrogasne_zajednice
  (naziv, vrsta, grad, aktivan)
VALUES
  ('Vatrogasna zajednica Grada Osijeka', 'vz_jls', 'Osijek', true),
  ('Vatrogasna zajednica Osječko-baranjske županije', 'vz_zupanije', 'Osijek', true),
  ('Hrvatska vatrogasna zajednica', 'hvz', 'Zagreb', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. Seed: DVD Sarvaš je član VZ Grada Osijeka i VZŽ OBŽ
-- ============================================================
INSERT INTO dvd_vz_clanstvo (vz_id, datum_od)
SELECT id, '2000-01-01'
FROM vatrogasne_zajednice
WHERE naziv IN (
  'Vatrogasna zajednica Grada Osijeka',
  'Vatrogasna zajednica Osječko-baranjske županije'
)
ON CONFLICT DO NOTHING;
```

---

## KORAK 2 — Query fajl: `src/lib/supabase/queries/vz.ts`

```ts
// src/lib/supabase/queries/vz.ts

import { supabase } from '../client'
import type { Database } from '@/types/database.types'

type VZ           = Database['public']['Tables']['vatrogasne_zajednice']['Row']
type VZOdluka     = Database['public']['Tables']['vz_odluke_raspodjele']['Row']

export type { VZ, VZOdluka }

// ── VZ popis ───────────────────────────────────────────────

export async function dohvatiVatrogasneZajednice(): Promise<VZ[]> {
  const { data, error } = await supabase
    .from('vatrogasne_zajednice')
    .select('id, naziv, vrsta, grad, predsjednik_ime, zapovjednik_ime, email, telefon, iban, aktivan')
    .eq('aktivan', true)
    .order('vrsta')
  if (error) throw error
  return data as VZ[]
}

export async function spremiVZ(
  id: string | null,
  podaci: Partial<VZ>
): Promise<void> {
  if (id) {
    const { error } = await supabase.from('vatrogasne_zajednice')
      .update(podaci).eq('id', id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('vatrogasne_zajednice')
      .insert(podaci as VZ)
    if (error) throw error
  }
}

// ── Odluke o raspodjeli ────────────────────────────────────

export interface PregledDotacije {
  godina:         number
  vz_naziv:       string
  vz_vrsta:       string
  datum_odluke:   string | null
  klasa:          string
  vz_ukupni_fond: number
  iznos_za_dvd:   number
  datum_isplate:  string | null
  je_isplaceno:   boolean
  udio_posto:     number | null
  napomena:       string
  ima_dokument:   boolean
  odluka_id:      string
}

export async function dohvatiDotacije(
  godina?: number
): Promise<PregledDotacije[]> {
  let q = supabase.from('pregled_dotacija').select('*')
  if (godina) q = q.eq('godina', godina)
  const { data, error } = await q
  if (error) throw error
  return data as PregledDotacije[]
}

export async function dohvatiOdlukuVZ(
  vzId: string, godina: number
): Promise<VZOdluka | null> {
  const { data } = await supabase
    .from('vz_odluke_raspodjele')
    .select('*')
    .eq('vz_id', vzId)
    .eq('godina', godina)
    .maybeSingle()
  return data as VZOdluka | null
}

export async function spremiOdlukuVZ(
  podaci: Partial<VZOdluka> & { vz_id: string; godina: number }
): Promise<void> {
  const { error } = await supabase
    .from('vz_odluke_raspodjele')
    .upsert({
      ...podaci,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'vz_id,godina' })
  if (error) throw error
}

export async function oznacDotacijuIsplacenom(
  odlukaId: string,
  datumIsplate: string
): Promise<void> {
  const { error } = await supabase
    .from('vz_odluke_raspodjele')
    .update({
      datum_isplate: datumIsplate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', odlukaId)
  if (error) throw error
}

// ── Provjera za Dashboard alarm ────────────────────────────

export interface DotacijaAlarm {
  vz_naziv:    string
  godina:      number
  iznos:       number
  ceka_odluku: boolean   // VZ još nije donijela odluku o raspodjeli
  ceka_isplatu: boolean  // Odluka donesena, ali novac nije stigao
}

export async function provjeriDotacijeAlarme(
  godina: number
): Promise<DotacijaAlarm[]> {
  const alarmi: DotacijaAlarm[] = []

  // Dohvati sve VZ-e kojih je DVD član
  const { data: clanstva } = await supabase
    .from('dvd_vz_clanstvo')
    .select('vz_id, vatrogasne_zajednice(naziv, vrsta)')
    .is('datum_do', null)

  if (!clanstva) return []

  for (const cl of clanstva) {
    const vz = cl.vatrogasne_zajednice as any
    const odluka = await dohvatiOdlukuVZ(cl.vz_id, godina)

    if (!odluka) {
      // Nema unesene odluke za ovu godinu
      // Alarm samo ako je već ožujak (trebala bi biti donesena)
      if (new Date().getMonth() >= 2) {
        alarmi.push({
          vz_naziv:     vz.naziv,
          godina,
          iznos:        0,
          ceka_odluku:  true,
          ceka_isplatu: false,
        })
      }
    } else if (!odluka.datum_isplate) {
      // Odluka postoji ali novac nije stigao
      alarmi.push({
        vz_naziv:     vz.naziv,
        godina,
        iznos:        odluka.iznos_za_dvd,
        ceka_odluku:  false,
        ceka_isplatu: true,
      })
    }
  }

  return alarmi
}
```

---

## KORAK 3 — Stranica: `src/pages/financije/DotacijePage.tsx`

Nova stranica dostupna na `/dotacije`:

```tsx
// src/pages/financije/DotacijePage.tsx

import { useState, useEffect } from 'react'
import {
  dohvatiVatrogasneZajednice, dohvatiDotacije,
  spremiOdlukuVZ, oznacDotacijuIsplacenom,
  type VZ, type PregledDotacije,
} from '@/lib/supabase/queries/vz'

export function DotacijePage() {
  const godina = new Date().getFullYear()
  const [dotacije, setDotacije] = useState<PregledDotacije[]>([])
  const [vz, setVZ] = useState<VZ[]>([])
  const [loading, setLoading] = useState(true)
  const [showForma, setShowForma] = useState(false)
  const [editOdluka, setEditOdluka] = useState<PregledDotacije | null>(null)

  useEffect(() => { ucitaj() }, [])

  async function ucitaj() {
    setLoading(true)
    const [d, v] = await Promise.all([
      dohvatiDotacije(godina),
      dohvatiVatrogasneZajednice(),
    ])
    setDotacije(d)
    setVZ(v)
    setLoading(false)
  }

  const fEUR = (v: number) => new Intl.NumberFormat('hr-HR', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2
  }).format(v)

  const ukupnoPlanirano = dotacije.reduce((a, d) => a + d.iznos_za_dvd, 0)
  const ukupnoIsplaceno = dotacije.filter(d => d.je_isplaceno)
    .reduce((a, d) => a + d.iznos_za_dvd, 0)
  const ukupnoNaCekanju = ukupnoPlanirano - ukupnoIsplaceno

  if (loading) return <div className="p-8 text-center text-[#999]">Učitavanje...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Dotacije {godina}</h1>
          <p className="text-xs text-[#777] mt-0.5">
            Grad → VZ JLS → DVD · Vatrogasna zajednica raspodjeljuje godišnjom odlukom
          </p>
        </div>
        <button onClick={() => { setEditOdluka(null); setShowForma(true) }}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
          + Unesi odluku VZ-a
        </button>
      </div>

      {/* Sažetak */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Ukupno odlučeno', val: ukupnoPlanirano, boja: 'text-white' },
          { label: 'Isplaćeno', val: ukupnoIsplaceno, boja: 'text-green-400' },
          { label: 'Na čekanju', val: ukupnoNaCekanju, boja: ukupnoNaCekanju > 0 ? 'text-orange-400' : 'text-[#777]' },
        ].map(s => (
          <div key={s.label} className="bg-[#242428] border border-[#333338] rounded-xl p-4">
            <p className="text-xs text-[#777]">{s.label}</p>
            <p className={`text-lg font-bold mt-1 ${s.boja}`}>{fEUR(s.val)}</p>
          </div>
        ))}
      </div>

      {/* Objašnjenje modela */}
      <div className="bg-[#1a1a22] border border-[#333338] rounded-xl p-4 mb-6 text-xs text-[#999]">
        <p className="font-medium text-[#bbb] mb-1">Kako funkcionira financiranje DVD-a:</p>
        <div className="flex items-start gap-6">
          <div className="flex items-center gap-2 text-[#666]">
            <span className="text-blue-400 font-semibold">Grad Osijek</span>
            <span>→</span>
            <span className="text-yellow-400 font-semibold">VZ Grada</span>
            <span>→</span>
            <span className="text-green-400 font-semibold">DVD Sarvaš</span>
          </div>
          <span className="text-[#555]">
            DVD ne prima dotaciju direktno od Grada. VZ JLS donosi godišnju odluku o raspodjeli.
          </span>
        </div>
      </div>

      {/* Lista odluka */}
      {dotacije.length === 0 ? (
        <div className="bg-[#242428] border border-[#333338] rounded-xl p-8 text-center">
          <p className="text-[#777]">Nema unesenih odluka za {godina}.</p>
          <p className="text-xs text-[#555] mt-1">
            Unesi odluku kad VZ JLS donese raspodjelu za ovu godinu.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dotacije.map(d => (
            <div key={d.odluka_id}
              className={`bg-[#242428] border rounded-xl p-4 ${
                d.je_isplaceno ? 'border-green-900/30' : 'border-orange-900/30'
              }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      d.vz_vrsta === 'vz_jls'      ? 'bg-blue-900/25 text-blue-400' :
                      d.vz_vrsta === 'vz_zupanije' ? 'bg-purple-900/25 text-purple-400' :
                                                     'bg-yellow-900/25 text-yellow-400'
                    }`}>
                      {d.vz_vrsta === 'vz_jls'       ? 'VZ Grada/Općine' :
                       d.vz_vrsta === 'vz_zupanije'  ? 'VZ Županije' : 'HVZ'}
                    </span>
                    <span className="text-sm font-semibold text-white">{d.vz_naziv}</span>
                    {d.je_isplaceno && (
                      <span className="text-xs text-green-400">✓ Isplaćeno</span>
                    )}
                  </div>

                  {d.klasa && (
                    <p className="text-xs text-[#666] mt-0.5">Klasa: {d.klasa}</p>
                  )}

                  <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                    <div>
                      <span className="text-[#666]">Fond VZ-a: </span>
                      <span className="text-[#bbb]">{fEUR(d.vz_ukupni_fond)}</span>
                    </div>
                    <div>
                      <span className="text-[#666]">Za DVD Sarvaš: </span>
                      <span className="text-white font-semibold">{fEUR(d.iznos_za_dvd)}</span>
                      {d.udio_posto && (
                        <span className="text-[#666] ml-1">({d.udio_posto}%)</span>
                      )}
                    </div>
                    {d.datum_odluke && (
                      <div>
                        <span className="text-[#666]">Datum odluke: </span>
                        <span className="text-[#bbb]">
                          {new Date(d.datum_odluke).toLocaleDateString('hr-HR')}
                        </span>
                      </div>
                    )}
                    {d.datum_isplate && (
                      <div>
                        <span className="text-[#666]">Isplaćeno: </span>
                        <span className="text-green-400">
                          {new Date(d.datum_isplate).toLocaleDateString('hr-HR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {!d.je_isplaceno && (
                    <button
                      onClick={async () => {
                        const datum = prompt('Datum isplate (YYYY-MM-DD):',
                          new Date().toISOString().split('T')[0])
                        if (!datum) return
                        await oznacDotacijuIsplacenom(d.odluka_id, datum)
                        await ucitaj()
                      }}
                      className="px-3 py-1.5 bg-green-800/40 text-green-400 text-xs rounded-lg hover:bg-green-800/60">
                      Označi isplaćenom
                    </button>
                  )}
                  <button
                    onClick={() => { setEditOdluka(d); setShowForma(true) }}
                    className="px-3 py-1.5 bg-[#2a2a2e] text-[#bbb] text-xs rounded-lg hover:bg-[#333338]">
                    Uredi
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Forma za unos odluke */}
      {showForma && (
        <OdlukaForma
          vz={vz}
          godina={godina}
          editOdluka={editOdluka}
          onSpremi={async (podaci) => {
            await spremiOdlukuVZ(podaci)
            setShowForma(false)
            await ucitaj()
          }}
          onOdustani={() => setShowForma(false)}
        />
      )}
    </div>
  )
}

// Modalna forma za unos/edit odluke VZ-a
function OdlukaForma({
  vz, godina, editOdluka, onSpremi, onOdustani
}: {
  vz: VZ[]
  godina: number
  editOdluka: PregledDotacije | null
  onSpremi: (p: any) => Promise<void>
  onOdustani: () => void
}) {
  const [forma, setForma] = useState({
    vz_id:          editOdluka ? vz.find(v => v.naziv === editOdluka.vz_naziv)?.id || '' : '',
    godina,
    datum_odluke:   editOdluka?.datum_odluke || '',
    klasa:          editOdluka?.klasa || '',
    ukupni_iznos:   editOdluka ? String(editOdluka.vz_ukupni_fond) : '',
    iznos_za_dvd:   editOdluka ? String(editOdluka.iznos_za_dvd) : '',
    napomena:       editOdluka?.napomena || '',
  })
  const [saving, setSaving] = useState(false)

  const f = (k: keyof typeof forma, v: string) =>
    setForma(prev => ({ ...prev, [k]: v }))

  async function handleSubmit() {
    if (!forma.vz_id || !forma.iznos_za_dvd) return
    setSaving(true)
    try {
      await onSpremi({
        ...forma,
        ukupni_iznos: parseFloat(forma.ukupni_iznos) || 0,
        iznos_za_dvd: parseFloat(forma.iznos_za_dvd),
        datum_odluke: forma.datum_odluke || null,
      })
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1e] border border-[#333338] rounded-2xl w-full max-w-lg p-6">
        <h2 className="text-base font-semibold text-white mb-4">
          {editOdluka ? 'Uredi odluku' : 'Unesi odluku VZ-a'} — {godina}.
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[#999] mb-1">Vatrogasna zajednica</label>
            <select value={forma.vz_id} onChange={e => f('vz_id', e.target.value)}
              className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428] text-white">
              <option value="">-- Odaberi VZ --</option>
              {vz.map(v => (
                <option key={v.id} value={v.id}>{v.naziv}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#999] mb-1">Datum odluke VZ-a</label>
              <input type="date" value={forma.datum_odluke}
                onChange={e => f('datum_odluke', e.target.value)}
                className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428] text-white" />
            </div>
            <div>
              <label className="block text-xs text-[#999] mb-1">Klasa / Ur.broj</label>
              <input type="text" value={forma.klasa}
                onChange={e => f('klasa', e.target.value)}
                placeholder="npr. KLASA: 210-04/25-01/1"
                className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428] text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#999] mb-1">
                Ukupni fond VZ-a (EUR)
              </label>
              <input type="number" value={forma.ukupni_iznos} step="0.01"
                onChange={e => f('ukupni_iznos', e.target.value)}
                placeholder="Koliko VZ ukupno raspodjeljuje"
                className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428] text-white" />
            </div>
            <div>
              <label className="block text-xs text-[#999] mb-1">
                Iznos za DVD Sarvaš (EUR)
              </label>
              <input type="number" value={forma.iznos_za_dvd} step="0.01"
                onChange={e => f('iznos_za_dvd', e.target.value)}
                placeholder="Naš udio po odluci"
                className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428] text-white" />
              {forma.ukupni_iznos && forma.iznos_za_dvd && (
                <p className="text-xs text-emerald-400 mt-0.5">
                  Udio: {(parseFloat(forma.iznos_za_dvd) / parseFloat(forma.ukupni_iznos) * 100).toFixed(1)}%
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#999] mb-1">Napomena</label>
            <textarea value={forma.napomena} onChange={e => f('napomena', e.target.value)}
              rows={2} placeholder="Namjena, posebni uvjeti..."
              className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428] text-white resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onOdustani}
            className="flex-1 px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg hover:bg-[#333338]">
            Odustani
          </button>
          <button onClick={handleSubmit} disabled={saving || !forma.vz_id || !forma.iznos_za_dvd}
            className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50">
            {saving ? 'Spremanje...' : 'Spremi odluku'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## KORAK 4 — Proširenje financijskog plana — ispravna terminologija

U `FinancijskiPlanPage.tsx` — ažuriraj nazive stavki prihoda da reflektiraju ispravnu hijerarhiju.

U formi za novu stavku prihoda, dodaj tooltip/info za dotacije:

```tsx
// U FinancijskiPlanPage, kod dodavanja/uređivanja stavke prihoda kategorije 'prihod'

const PREDLOZENI_NAZIVI_DOTACIJA = [
  { naziv: 'Dotacija VZ Grada Osijeka', napomena: 'Redovna djelatnost — raspodjela VZ JLS' },
  { naziv: 'Dotacija VZ OBŽ', napomena: 'Specifične namjene — natječaj VZŽ' },
  { naziv: 'Dotacija HVZ (Program aktivnosti)', napomena: 'Oprema/vozila — državni program' },
]

// Prikaz info tooltipa:
// ℹ️ Dotacije NE dolaze direktno od Grada/Županije.
// Dolaze od Vatrogasne zajednice koja ima vlastitu raspodjelu.
// Za praćenje odluka o raspodjeli: Financije → Dotacije
```

---

## KORAK 5 — Dashboard alarmi za dotacije

U `DashboardPage.tsx` — proširi `useEffect` koji učitava alarme:

```ts
import { provjeriDotacijeAlarme } from '@/lib/supabase/queries/vz'

// Unutar useEffect za alarm učitavanje:
const dotacijeAlarmi = await provjeriDotacijeAlarme(new Date().getFullYear())

// Dodaj u alarme array:
dotacijeAlarmi.forEach(da => {
  if (da.ceka_odluku) {
    alarmi.push({
      tip: 'upozorenje',
      ikona: '💰',
      tekst: `${da.vz_naziv}: nema unesene odluke o raspodjeli za ${da.godina}.`,
      link: '/dotacije',
    })
  } else if (da.ceka_isplatu) {
    alarmi.push({
      tip: 'info',
      ikona: '⏳',
      tekst: `Čeka isplata ${formatEUR(da.iznos)} od ${da.vz_naziv}`,
      link: '/dotacije',
    })
  }
})
```

---

## KORAK 6 — Routing i navigacija

### `App.tsx` — dodaj rutu:
```tsx
import { DotacijePage } from '@/pages/financije/DotacijePage'
// ...
<Route path="/dotacije" component={DotacijePage} />
```

### `AppLayout.tsx` — dodaj u nav pod sekcijom Financije:
```ts
{ path: '/dotacije', label: '💰 Dotacije VZ', section: 'Financije' },
```

---

## KORAK 7 — Akcijski centar (iz originalnog plana, nepromijenjen)

*(Akcijski centar ostaje identičan kao u originalnom planu RAZVOJNI_PLAN_ROADMAP.md, Koraci 1–3)*

### Sažetak — što dodati:

**`src/lib/utils/akcije.ts`** — logic za detekciju akcija (iz roadmapa, + dodaj dotacije alarme):
```ts
// Na kraju generirajAkcije(), PRIJE sort, dodaj:
const dotAlarm = await provjeriDotacijeAlarme(new Date().getFullYear())
dotAlarm.forEach(da => {
  if (da.ceka_odluku) akcije.push({
    id: `dotacija-odluka-${da.vz_naziv}`,
    prioritet: 2,
    kategorija: 'financije',
    naslov: `Dotacija ${da.vz_naziv}: nema odluke za ${da.godina}.`,
    opis: 'VZ JLS još nije donijela godišnju odluku o raspodjeli.',
    akcija_label: 'Unesi odluku',
    akcija_href: '/dotacije',
  })
  if (da.ceka_isplatu) akcije.push({
    id: `dotacija-isplata-${da.vz_naziv}`,
    prioritet: 3,
    kategorija: 'financije',
    naslov: `Čeka isplata ${formatEUR(da.iznos)} — ${da.vz_naziv}`,
    opis: `Odluka donesena, novac nije stigao na račun.`,
    akcija_label: 'Pregledaj',
    akcija_href: '/dotacije',
  })
})
```

**`src/pages/akcije/AkcijskiCentar.tsx`** — UI komponenta (identičan roadmapu)

**Routing i nav** — identičan roadmapu

---

## KORAK 8 — Kopiranje prošle sjednice (iz originalnog plana)

*(Identičan kao u RAZVOJNI_PLAN_ROADMAP.md, Korak 2)*

---

## KORAK 9 — Weekly digest email (iz originalnog plana)

*(Identičan kao u RAZVOJNI_PLAN_ROADMAP.md, Korak 3)*

---

## KORAK 10 — Postavke: tab "Vatrogasne zajednice"

U `PostavkePage.tsx` — dodaj tab:
```ts
type Tab = 'korisnici' | 'dvd' | 'tijela' | 'zakoni' | 'eracun' | 'vz' | 'gdpr'
{ key: 'vz', label: 'Vatrogasne zajednice' },
```

Tab `TabVZ` — prikazuje popis VZ-a i omogućava uređivanje kontakt podataka:

```tsx
function TabVZ() {
  const [vzList, setVZList] = useState<VZ[]>([])

  useEffect(() => { dohvatiVatrogasneZajednice().then(setVZList) }, [])

  return (
    <div className="space-y-3">
      <div className="bg-[#1e1e22] border border-[#333338] rounded-lg p-4 text-xs text-[#bbb]">
        VZ-ovi kojima je DVD Sarvaš član. Njihove godišnje odluke o raspodjeli
        prate se u <strong>Financije → Dotacije</strong>.
      </div>
      {vzList.map(v => (
        <div key={v.id} className="bg-[#242428] border border-[#333338] rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-white">{v.naziv}</p>
              <p className="text-xs text-[#666] mt-0.5">
                {v.vrsta === 'vz_jls' ? 'VZ Grada/Općine' :
                 v.vrsta === 'vz_zupanije' ? 'VZ Županije' : 'HVZ'}
                {v.grad && ` · ${v.grad}`}
              </p>
            </div>
            {/* gumb Uredi otvara inline formu */}
          </div>
          {(v.predsjednik_ime || v.email || v.iban) && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#777]">
              {v.predsjednik_ime && <div>Predsjednik: {v.predsjednik_ime}</div>}
              {v.email         && <div>Email: {v.email}</div>}
              {v.iban          && <div>IBAN: {v.iban}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## Redosljed commitova

```
1. sql: migracija 012 — dvd_organizacija + vatrogasne_zajednice + vz_odluke + trigger + view + seed
2. feat: queries/vz.ts — VZ CRUD, odluke raspodjele, dotacije alarmi
3. feat: DotacijePage — prikaz i unos godišnjih odluka VZ-a
4. feat: FinancijskiPlan — ispravna terminologija dotacija + info tooltip
5. feat: Dashboard — alarmi za dotacije (ceka_odluku, ceka_isplatu)
6. feat: AkcijskiCentar — dotacije akcije + kompletna implementacija (roadmap korak 1)
7. feat: Sjednice — kopiranje prošle sjednice (roadmap korak 2)
8. feat: send-reminder — weekly digest (roadmap korak 3)
9. feat: PostavkePage — TabVZ (kontakt podaci vatrogasnih zajednica)
10. feat: routing — /dotacije, /akcije + nav stavke
11. chore: supabase gen types
```

---

## Napomene

- `vz_odluke_raspodjele` ima `UNIQUE(vz_id, godina)` — upsert bez duplikata
- Trigger `sync_vz_dotacija_na_plan` traži stavku prihoda po ključnim riječima — ako DVD ima drugačiji naziv stavke, neće se automatski sinkronizirati; dodati napomenu u UI
- Seed unosi tri VZ-a za DVD Sarvaš — u multi-tenant scenariju svaki DVD unosi svoje VZ-ove kroz onboarding wizard
- Riznica polja (`u_riznici`, `riznica_iban`, `riznica_jls`) postoje ali su `false`/prazni po defaultu — nisu vidljivi u UI dok korisnik ne aktivira u Postavke → Podaci DVD-a
- Polje `rkp_broj` ostaviti prazno — DVD Sarvaš je udruga, nema RKP broj

---

*Projekt: DVD Sarvaš ERP — https://github.com/dvdsarvas/dvd-erp*
