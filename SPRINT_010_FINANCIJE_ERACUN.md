# DVD ERP — Sprint 010: Financijski workflow + e-Račun integracija

> Pročitaj u cijelosti prije nego počneš. Radi redom, commitaj po koracima.
> **Načelo:** Automatiziraj prvi. Korisnik samo potvrđuje.

---

## Pregled sprinta

Ovaj sprint rješava tri povezane stvari:

1. **Finansijski workflow** — kategorizacija računa, auto-ažuriranje fin. plana, knjiga ulaznih računa
2. **e-Račun integracija** — automatsko preuzimanje e-računa iz ePoslovanje/mojeRačun API-ja
3. **CSV uvoz bankovnih izvadaka** — parser za Erste/PBZ/ZABA formate

**Što NE dirati:** Supabase queries koji već rade, RLS politike (osim novih tablica), routing u App.tsx

---

## KORAK 1 — Migracija 011: Proširenje računa + knjiga

Kreiraj `supabase/migrations/011_racuni_eracun.sql`:

```sql
-- ============================================================
-- MIGRACIJA 011: e-Račun integracija i knjiga ulaznih računa
-- ============================================================

-- Proširi tablicu racuni
ALTER TABLE racuni
  ADD COLUMN IF NOT EXISTS plan_stavka_id       UUID REFERENCES financijski_plan_stavke(id),
  ADD COLUMN IF NOT EXISTS aop_konto            TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS poslano_knjigov_datum TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS poslano_knjigov_id    UUID REFERENCES korisnici(id),
  ADD COLUMN IF NOT EXISTS eracun_document_id   TEXT UNIQUE,   -- ID u ePoslovanje/mojeRačun
  ADD COLUMN IF NOT EXISTS eracun_posrednik     TEXT,          -- 'eposlovanje' | 'moj_eracun'
  ADD COLUMN IF NOT EXISTS eracun_xml           TEXT,          -- originalni XML (base64)
  ADD COLUMN IF NOT EXISTS izvor                TEXT NOT NULL DEFAULT 'rucno'
                            CHECK (izvor IN ('rucno', 'xml_upload', 'eracun_api', 'csv_bank'));

-- ============================================================
-- Tablica za pamćenje kategorije po dobavljaču
-- AUTOMATIZACIJA: sustav predlaže kategoriju kod novog računa
-- ============================================================
CREATE TABLE IF NOT EXISTS dobavljaci_kategorije (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv_stranke    TEXT NOT NULL UNIQUE,
  plan_stavka_id   UUID REFERENCES financijski_plan_stavke(id),
  aop_konto        TEXT DEFAULT '',
  zadnji_racun_id  UUID REFERENCES racuni(id),
  zadnji_put       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dobavljaci_naziv
  ON dobavljaci_kategorije(naziv_stranke);

ALTER TABLE dobavljaci_kategorije ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dobavljaci_select" ON dobavljaci_kategorije
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "dobavljaci_write" ON dobavljaci_kategorije
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true))
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true));

-- ============================================================
-- Tablica za konfiguraciju e-Račun servisa
-- Svaki DVD unosi svoje kredencijale za ePoslovanje/mojeRačun
-- ============================================================
CREATE TABLE IF NOT EXISTS eracun_konfiguracija (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posrednik       TEXT NOT NULL DEFAULT 'eposlovanje'
                  CHECK (posrednik IN ('eposlovanje', 'moj_eracun', 'fina')),
  api_username    TEXT NOT NULL DEFAULT '',
  api_password    TEXT NOT NULL DEFAULT '',  -- čuvati enkriptirano
  api_key         TEXT DEFAULT '',
  company_id      TEXT NOT NULL DEFAULT '',  -- OIB DVD-a
  aktivan         BOOLEAN DEFAULT false,     -- false dok se ne postave kredencijali
  zadnji_sync     TIMESTAMPTZ,
  zadnji_sync_br  INT DEFAULT 0,             -- broj uvezenih računa ukupno
  greska_zadnja   TEXT DEFAULT '',           -- zadnja greška za dijagnostiku
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE eracun_konfiguracija ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eracun_kfg_select" ON eracun_konfiguracija
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik','zamjenik','tajnik') AND aktivan = true));
CREATE POLICY "eracun_kfg_write" ON eracun_konfiguracija
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik') AND aktivan = true))
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik') AND aktivan = true));

-- ============================================================
-- Tablica za bankovne transakcije (CSV uvoz)
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_transakcije (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum         DATE NOT NULL,
  iznos         DECIMAL(12,2) NOT NULL,
  tip           TEXT NOT NULL CHECK (tip IN ('prihod', 'rashod')),
  opis          TEXT DEFAULT '',
  referenca     TEXT DEFAULT '',
  racun_id      UUID REFERENCES racuni(id),
  status        TEXT NOT NULL DEFAULT 'nespojeno'
                CHECK (status IN ('nespojeno', 'spojeno', 'ignorano')),
  izvor         TEXT DEFAULT 'csv_upload',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_datum ON bank_transakcije(datum);
CREATE INDEX IF NOT EXISTS idx_bank_status ON bank_transakcije(status);

ALTER TABLE bank_transakcije ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank_select" ON bank_transakcije FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true));
CREATE POLICY "bank_write" ON bank_transakcije FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true))
  WITH CHECK (EXISTS (SELECT 1 FROM korisnici WHERE id = auth.uid()
    AND uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND aktivan = true));

-- ============================================================
-- TRIGGER: Kad se račun plati → automatski ažuriraj fin. plan
-- AUTOMATIZACIJA: nema ručnog unosa ostvarenog iznosa
-- ============================================================
CREATE OR REPLACE FUNCTION sync_ostvareno_na_placanje()
RETURNS TRIGGER AS $$
BEGIN
  -- Samo kad se status mijenja NA 'placeno' i postoji plan_stavka
  IF NEW.status = 'placeno'
     AND (OLD.status IS NULL OR OLD.status != 'placeno')
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

  -- Zapamti kategoriju dobavljača za budući auto-prijedlog
  IF NEW.plan_stavka_id IS NOT NULL
     AND NEW.naziv_stranke IS NOT NULL
     AND NEW.naziv_stranke != ''
  THEN
    INSERT INTO dobavljaci_kategorije
      (naziv_stranke, plan_stavka_id, aop_konto, zadnji_racun_id)
    VALUES
      (lower(trim(NEW.naziv_stranke)), NEW.plan_stavka_id,
       COALESCE(NEW.aop_konto, ''), NEW.id)
    ON CONFLICT (naziv_stranke) DO UPDATE
      SET plan_stavka_id  = EXCLUDED.plan_stavka_id,
          aop_konto       = EXCLUDED.aop_konto,
          zadnji_racun_id = EXCLUDED.zadnji_racun_id,
          zadnji_put      = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS racun_sync_trigger ON racuni;
CREATE TRIGGER racun_sync_trigger
  AFTER INSERT OR UPDATE ON racuni
  FOR EACH ROW EXECUTE FUNCTION sync_ostvareno_na_placanje();

-- ============================================================
-- VIEW: Knjiga ulaznih računa (zakonski dokument)
-- Automatski se održava — nema ručnog vođenja
-- Čuvati 7 godina
-- ============================================================
CREATE OR REPLACE VIEW knjiga_ulaznih_racuna AS
SELECT
  ROW_NUMBER() OVER (
    PARTITION BY EXTRACT(YEAR FROM datum_racuna)
    ORDER BY datum_racuna, created_at
  )::int                               AS redni_broj,
  EXTRACT(YEAR FROM datum_racuna)::int AS godina,
  interni_broj,
  datum_racuna,
  naziv_stranke,
  oib_stranke,
  opis,
  iznos_bez_pdv,
  pdv_iznos,
  iznos_ukupno,
  status,
  aop_konto,
  ps.naziv_stavke                      AS kategorija_plana,
  datum_placanja,
  lik.ime || ' ' || lik.prezime        AS likvidirao_ime,
  datum_odobravanja                    AS datum_likvidacije,
  izvor,
  eracun_document_id IS NOT NULL       AS je_eracun,
  created_at
FROM racuni r
LEFT JOIN financijski_plan_stavke ps ON ps.id = r.plan_stavka_id
LEFT JOIN korisnici lik ON lik.id = r.odobrio_id
WHERE r.vrsta = 'ulazni'
ORDER BY r.datum_racuna, r.created_at;

-- ============================================================
-- Seed: inicijalna konfiguracija (prazna, čeka unos kredencijala)
-- ============================================================
INSERT INTO eracun_konfiguracija (posrednik, company_id, aktivan)
VALUES ('eposlovanje', '48874677674', false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- pg_cron: sync e-računa svakih sat vremena
-- ============================================================
SELECT cron.schedule(
  'dvd-erp-sync-eracuni',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/sync-eracuni',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $$
);
```

---

## KORAK 2 — Edge Function: `sync-eracuni`

Kreiraj `supabase/functions/sync-eracuni/index.ts`:

```ts
// supabase/functions/sync-eracuni/index.ts
// Okidač: pg_cron svakih sat vremena
// Svrha: Automatsko preuzimanje novih e-računa iz ePoslovanje/mojeRačun

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ePoslovanje API base URL-ovi
const API_URLS = {
  eposlovanje: 'https://eracun.eposlovanje.hr/apis/v2',
  moj_eracun:  'https://api.moj-eracun.hr/apis/v2',
  fina:        '', // FINA je SOAP — ne koristimo u ovom sprintu
}

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const log: string[] = []
  let uvezeno = 0

  try {
    // 1. Dohvati aktivnu konfiguraciju
    const { data: config, error: cfgErr } = await supabase
      .from('eracun_konfiguracija')
      .select('*')
      .eq('aktivan', true)
      .single()

    if (cfgErr || !config) {
      return new Response(JSON.stringify({ ok: true, poruka: 'e-Račun nije konfiguriran' }))
    }

    const baseUrl = API_URLS[config.posrednik as keyof typeof API_URLS]
    if (!baseUrl) {
      return new Response(JSON.stringify({ ok: false, greska: 'Nepodržani posrednik' }))
    }

    const auth = {
      username: config.api_username,
      password: config.api_password,
      companyId: config.company_id,
    }

    // 2. Dohvati inbox — nova primljeni dokumenti
    const inboxResp = await fetch(`${baseUrl}/queryInbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...auth,
        documentStatus: 99,    // Status 99 = RECEIVED (tek primljeno, nismo preuzeli)
      }),
    })

    if (!inboxResp.ok) {
      const greska = `queryInbox greška: ${inboxResp.status} ${await inboxResp.text()}`
      await supabase.from('eracun_konfiguracija')
        .update({ greska_zadnja: greska, updated_at: new Date().toISOString() })
        .eq('id', config.id)
      return new Response(JSON.stringify({ ok: false, greska }), { status: 500 })
    }

    const inbox = await inboxResp.json()
    const dokumenti = inbox.documents ?? inbox.Documents ?? inbox.items ?? []
    log.push(`Inbox: ${dokumenti.length} dokumenata`)

    // 3. Za svaki dokument koji nismo uvezli
    for (const dok of dokumenti) {
      const docId = String(dok.documentId ?? dok.DocumentId ?? dok.id)

      // Provjeri je li već uvezen
      const { count } = await supabase
        .from('racuni')
        .select('id', { count: 'exact' })
        .eq('eracun_document_id', docId)

      if (count && count > 0) {
        log.push(`Preskačem ${docId} — već postoji`)
        continue
      }

      // 4. Preuzmi XML dokumenta
      const docResp = await fetch(`${baseUrl}/receiveDocument/${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auth),
      })

      if (!docResp.ok) {
        log.push(`Greška preuzimanja ${docId}: ${docResp.status}`)
        continue
      }

      const docData = await docResp.json()
      const encodedXml = docData.encodedXml ?? docData.xmlContent ?? docData.xml ?? ''

      if (!encodedXml) {
        log.push(`Nema XML za ${docId}`)
        continue
      }

      // 5. Parsiraj XML i izvuci podatke
      const xmlString = atob(encodedXml)
      const podaci = parsirajEracunXML(xmlString)

      if (!podaci) {
        log.push(`Nije moguće parsirati XML za ${docId}`)
        continue
      }

      // 6. Generiraj interni broj
      const brRacuna = await generirajBrojRacuna(supabase, podaci.datum_racuna)

      // 7. Spremi u Supabase
      const { error: insertErr } = await supabase.from('racuni').insert({
        vrsta:               'ulazni',
        interni_broj:        brRacuna,
        broj_racuna:         podaci.br_racuna,
        naziv_stranke:       podaci.naziv_stranke,
        oib_stranke:         podaci.oib_stranke,
        datum_racuna:        podaci.datum_racuna,
        datum_dospijeća:     podaci.datum_dospieca || null,
        iznos_bez_pdv:       podaci.iznos_bez_pdv,
        pdv_iznos:           podaci.iznos_pdv,
        iznos_ukupno:        podaci.iznos_ukupno,
        status:              'primljeno',
        izvor:               'eracun_api',
        eracun_document_id:  docId,
        eracun_posrednik:    config.posrednik,
        eracun_xml:          encodedXml,
      })

      if (insertErr) {
        log.push(`Greška upisa ${docId}: ${insertErr.message}`)
        continue
      }

      // 8. Obavijesti ePoslovanje da smo preuzeli
      await fetch(`${baseUrl}/notifyimport/${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auth),
      }).catch(() => {}) // Neuspjeh notifikacije nije kritičan

      uvezeno++
      log.push(`✓ Uvezen: ${podaci.naziv_stranke} — ${podaci.iznos_ukupno} EUR`)
    }

    // 9. Ažuriraj zadnji sync u konfiguraciji
    await supabase.from('eracun_konfiguracija').update({
      zadnji_sync:    new Date().toISOString(),
      zadnji_sync_br: config.zadnji_sync_br + uvezeno,
      greska_zadnja:  '',
      updated_at:     new Date().toISOString(),
    }).eq('id', config.id)

    // 10. Ako su uvezeni računi, pošalji notifikaciju tajniku
    if (uvezeno > 0) {
      await posaljiNotifikacijuTajniku(supabase, uvezeno, log)
    }

    return new Response(JSON.stringify({
      ok: true,
      uvezeno,
      log,
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    const greska = err instanceof Error ? err.message : String(err)
    console.error('sync-eracuni greška:', greska)
    return new Response(JSON.stringify({ ok: false, greska }), { status: 500 })
  }
})

// ============================================================
// XML PARSER — FINA UBL 2.1 format
// ============================================================

interface EracunPodaci {
  br_racuna:      string
  oib_stranke:    string
  naziv_stranke:  string
  datum_racuna:   string
  datum_dospieca: string
  iznos_ukupno:   number
  iznos_bez_pdv:  number
  iznos_pdv:      number
  valuta:         string
}

function parsirajEracunXML(xml: string): EracunPodaci | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')

    const FINA = 'http://fina.hr/eracun/erp/OutgoingInvoicesData/v3.2'
    const CBC  = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
    const CAC  = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'
    const UBL  = 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2'

    const get = (tag: string, ns: string, context?: Element): string => {
      const el = (context ?? doc).getElementsByTagNameNS(ns, tag)[0]
      return el?.textContent?.trim() ?? ''
    }

    // FINA wrapper podaci
    const supplierId    = get('SupplierID', FINA)
    const supplierInvId = get('SupplierInvoiceID', FINA)

    // UBL Invoice podaci
    const issueDate   = get('IssueDate', CBC)
    const dueDate     = get('DueDate', CBC)
    const currency    = get('DocumentCurrencyCode', CBC)

    // Iznosi
    const payable   = parseFloat(get('PayableAmount', CBC) || '0')
    const taxExcl   = parseFloat(get('TaxExclusiveAmount', CBC) || '0')
    const taxAmount = parseFloat(get('TaxAmount', CBC) || '0')

    // Naziv dobavljača — probaj više lokacija u XML-u
    let nazivStranke = get('RegistrationName', CAC)
      || get('Name', CAC)
      || get('PartyName', CAC)
      || ''

    // Normalizacija datuma (YYYY-MM-DD je već ispravan format)
    const normDatum = (d: string) => {
      if (!d) return ''
      // Ako je DD.MM.YYYY format
      const m = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
      if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
      return d
    }

    if (!issueDate || payable <= 0) return null

    return {
      br_racuna:      supplierInvId,
      oib_stranke:    supplierId,
      naziv_stranke:  nazivStranke || `Dobavljač ${supplierId}`,
      datum_racuna:   normDatum(issueDate),
      datum_dospieca: normDatum(dueDate),
      iznos_ukupno:   payable,
      iznos_bez_pdv:  taxExcl || (payable - taxAmount),
      iznos_pdv:      taxAmount,
      valuta:         currency || 'EUR',
    }
  } catch (err) {
    console.error('XML parse greška:', err)
    return null
  }
}

// ============================================================
// HELPERS
// ============================================================

async function generirajBrojRacuna(supabase: ReturnType<typeof createClient>, datum: string): Promise<string> {
  const godina = datum.substring(0, 4)
  const { count } = await supabase
    .from('racuni')
    .select('id', { count: 'exact' })
    .like('interni_broj', `URA-${godina}-%`)
  return `URA-${godina}-${String((count ?? 0) + 1).padStart(3, '0')}`
}

async function posaljiNotifikacijuTajniku(
  supabase: ReturnType<typeof createClient>,
  brRacuna: number,
  log: string[]
): Promise<void> {
  // Dohvati email tajnika
  const { data } = await supabase
    .from('korisnici')
    .select('email, ime')
    .in('uloga', ['tajnik', 'predsjednik'])
    .eq('aktivan', true)
    .limit(1)
    .single()

  if (!data) return

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) return

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'DVD ERP <noreply@dvd-erp.hr>',
      to: data.email,
      subject: `📄 ${brRacuna} novi e-račun${brRacuna > 1 ? 'a' : ''} uvezeno — DVD ERP`,
      html: `
        <h2>Uvezeni novi e-računi</h2>
        <p>${data.ime}, uvezeno je <strong>${brRacuna} novih e-računa</strong> iz ePoslovanje servisa.</p>
        <ul>
          ${log.filter(l => l.startsWith('✓')).map(l => `<li>${l}</li>`).join('')}
        </ul>
        <p>Potrebna akcija: kategorizirajte račune u DVD ERP → Računi → dodijelite stavku financijskog plana.</p>
        <hr>
        <p style="color:#666;font-size:12px">DVD ERP — automatska obavijest</p>
      `,
    }),
  }).catch(() => {}) // Greška slanja emaila nije kritična
}
```

---

## KORAK 3 — Query fajlovi

### `src/lib/supabase/queries/financije.ts` — dodaci

Na kraj postojećeg fajla dodaj:

```ts
// ── Kategorizacija ─────────────────────────────────────────

export interface DobavljacKategorija {
  naziv_stranke:  string
  plan_stavka_id: string | null
  aop_konto:      string
}

/**
 * Automatski prijedlog kategorije za novog dobavljača.
 * Poziva se ~500ms nakon unosa naziva stranke.
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
 * Stavke financijskog plana za dropdown (rashodi tekuće godine)
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

// ── Knjiga ulaznih računa ───────────────────────────────────

export interface KnjigaUlazniRacun {
  redni_broj:       number
  godina:           number
  interni_broj:     string | null
  datum_racuna:     string
  naziv_stranke:    string
  oib_stranke:      string | null
  opis:             string | null
  iznos_bez_pdv:    number | null
  pdv_iznos:        number | null
  iznos_ukupno:     number
  status:           string
  aop_konto:        string | null
  kategorija_plana: string | null
  datum_placanja:   string | null
  likvidirao_ime:   string | null
  datum_likvidacije:string | null
  je_eracun:        boolean
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

// ── Slanje knjigovođi ───────────────────────────────────────

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

// ── e-Račun konfiguracija ───────────────────────────────────

export interface EracunKonfiguracija {
  id:             string
  posrednik:      'eposlovanje' | 'moj_eracun' | 'fina'
  api_username:   string
  api_password:   string
  api_key:        string
  company_id:     string
  aktivan:        boolean
  zadnji_sync:    string | null
  zadnji_sync_br: number
  greska_zadnja:  string
}

export async function dohvatiEracunKfg(): Promise<EracunKonfiguracija | null> {
  const { data } = await supabase
    .from('eracun_konfiguracija')
    .select('*')
    .single()
  return data as EracunKonfiguracija | null
}

export async function azurirajEracunKfg(
  id: string,
  podaci: Partial<EracunKonfiguracija>
): Promise<void> {
  const { error } = await supabase
    .from('eracun_konfiguracija')
    .update({ ...podaci, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function testirajEracunVezu(
  posrednik: string,
  username: string,
  password: string,
  companyId: string
): Promise<{ ok: boolean; poruka: string; brDokumenata?: number }> {
  const baseUrls: Record<string, string> = {
    eposlovanje: 'https://eracun.eposlovanje.hr/apis/v2',
    moj_eracun:  'https://api.moj-eracun.hr/apis/v2',
  }
  const url = baseUrls[posrednik]
  if (!url) return { ok: false, poruka: 'Nepodržani posrednik' }

  try {
    const resp = await fetch(`${url}/queryInbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, companyId }),
    })
    if (!resp.ok) {
      const txt = await resp.text()
      return { ok: false, poruka: `Greška ${resp.status}: ${txt.slice(0, 200)}` }
    }
    const data = await resp.json()
    const br = (data.documents ?? data.Documents ?? data.items ?? []).length
    return { ok: true, poruka: `Veza uspješna!`, brDokumenata: br }
  } catch (err) {
    return { ok: false, poruka: `Mrežna greška: ${err instanceof Error ? err.message : String(err)}` }
  }
}
```

### `src/lib/utils/eracun-parser.ts` — za ručni XML upload

```ts
// src/lib/utils/eracun-parser.ts
// Koristi se i kod ručnog upload-a XML-a i kod Edge Function parsiranja

export interface EracunPodaci {
  br_racuna:      string
  oib_stranke:    string
  naziv_stranke:  string
  datum_racuna:   string
  datum_dospieca: string
  iznos_ukupno:   number
  iznos_bez_pdv:  number
  iznos_pdv:      number
  valuta:         string
}

const FINA = 'http://fina.hr/eracun/erp/OutgoingInvoicesData/v3.2'
const CBC  = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
const CAC  = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'

export function parsirajEracunXML(xmlString: string): EracunPodaci | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')

    // Provjeri parsing grešku
    const parseError = doc.querySelector('parsererror')
    if (parseError) throw new Error('Neispravan XML format')

    const get = (tag: string, ns: string): string =>
      doc.getElementsByTagNameNS(ns, tag)[0]?.textContent?.trim() ?? ''

    const normDatum = (d: string): string => {
      if (!d) return ''
      const m = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
      if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
      return d  // pretpostavlja YYYY-MM-DD
    }

    const supplierId    = get('SupplierID', FINA)
    const supplierInvId = get('SupplierInvoiceID', FINA)
    const buyerId       = get('BuyerID', FINA)
    const issueDate     = normDatum(get('IssueDate', CBC))
    const dueDate       = normDatum(get('DueDate', CBC))
    const currency      = get('DocumentCurrencyCode', CBC) || 'EUR'
    const payable       = parseFloat(get('PayableAmount', CBC) || '0')
    const taxExcl       = parseFloat(get('TaxExclusiveAmount', CBC) || '0')
    const taxAmount     = parseFloat(get('TaxAmount', CBC) || '0')
    const naziv         = get('RegistrationName', CAC) || get('Name', CAC) || ''

    if (!issueDate || payable <= 0) return null

    return {
      br_racuna:      supplierInvId,
      oib_stranke:    supplierId,
      naziv_stranke:  naziv || `Dobavljač ${supplierId}`,
      datum_racuna:   issueDate,
      datum_dospieca: dueDate,
      iznos_ukupno:   payable,
      iznos_bez_pdv:  taxExcl > 0 ? taxExcl : payable - taxAmount,
      iznos_pdv:      taxAmount,
      valuta:         currency,
    }
  } catch (err) {
    console.error('eRačun parse greška:', err)
    return null
  }
}

/**
 * Čita File objekt i parsira kao e-Račun XML
 */
export async function parsirajEracunFajl(file: File): Promise<EracunPodaci | null> {
  const text = await file.text()
  return parsirajEracunXML(text)
}
```

### `src/lib/utils/bank-parser.ts` — CSV parser za bankovne izvatke

```ts
// src/lib/utils/bank-parser.ts
// Podržava formate: Erste, PBZ, ZABA, generički CSV

export interface BankTransakcija {
  datum:      string  // YYYY-MM-DD
  iznos:      number
  tip:        'prihod' | 'rashod'
  opis:       string
  referenca:  string
}

export function parsirајBankCSV(csvContent: string): {
  transakcije: BankTransakcija[]
  greske: string[]
} {
  const transakcije: BankTransakcija[] = []
  const greske: string[] = []

  const linije = csvContent
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  if (linije.length < 2) {
    return { transakcije: [], greske: ['CSV je prazan'] }
  }

  const sep = detectSeparator(linije[0])
  const zaglavlje = parseRow(linije[0], sep)
    .map(h => h.toLowerCase().trim())

  const format = detectFormat(zaglavlje)

  linije.slice(1).forEach((linija, idx) => {
    try {
      const cells = parseRow(linija, sep)
      const t = parseLinija(cells, zaglavlje, format)
      if (t) transakcije.push(t)
    } catch (err) {
      greske.push(`Redak ${idx + 2}: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  return { transakcije, greske }
}

function detectSeparator(zaglavlje: string): string {
  const counts = { ';': 0, ',': 0, '\t': 0 }
  for (const sep of Object.keys(counts) as (keyof typeof counts)[]) {
    counts[sep] = (zaglavlje.match(new RegExp(sep === '\t' ? '\t' : `\\${sep}`, 'g')) || []).length
  }
  return Object.entries(counts).sort(([,a],[,b]) => b - a)[0][0]
}

function parseRow(linija: string, sep: string): string[] {
  const result: string[] = []
  let inQuotes = false
  let current = ''
  for (let i = 0; i < linija.length; i++) {
    const ch = linija[i]
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === sep && !inQuotes) { result.push(current.trim()); current = ''; continue }
    current += ch
  }
  result.push(current.trim())
  return result
}

function detectFormat(zaglavlje: string[]): string {
  if (zaglavlje.some(h => h.includes('dugovni') || h.includes('potražni'))) return 'pbz'
  if (zaglavlje.some(h => h.includes('stanje'))) return 'erste'
  if (zaglavlje.some(h => h.includes('valuta datum'))) return 'zaba'
  if (zaglavlje.some(h => h.includes('zaduženje') || h.includes('odobrenje'))) return 'otpbz'
  return 'generic'
}

function parseLinija(
  cells: string[],
  zaglavlje: string[],
  format: string
): BankTransakcija | null {
  const get = (kljuc: string): string => {
    const idx = zaglavlje.findIndex(h => h.includes(kljuc))
    return idx >= 0 ? (cells[idx] || '').replace(/^["']|["']$/g, '').trim() : ''
  }

  const parseIznos = (s: string): number =>
    parseFloat(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0

  const normDatum = (d: string): string | null => {
    d = d.trim()
    const m1 = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
    if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`
    const m2 = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m2) return `${m2[3]}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
    return null
  }

  let datum = '', iznos = 0, tip: 'prihod' | 'rashod' = 'rashod'
  let opis = '', referenca = ''

  if (format === 'pbz' || format === 'otpbz') {
    datum = get('datum')
    const dug = parseIznos(get('dugovni') || get('zaduženje'))
    const pot = parseIznos(get('potražni') || get('odobrenje'))
    if (pot > 0 && dug === 0) { iznos = pot; tip = 'prihod' }
    else if (dug > 0) { iznos = dug; tip = 'rashod' }
    else return null
    opis = get('opis') || get('naziv')
    referenca = get('referenca') || get('model i poziv')
  } else {
    datum = get('datum')
    const iznosStr = get('iznos') || get('promjena') || get('iznos transakcije')
    const iznosNum = parseIznos(iznosStr)
    if (iznosNum === 0) return null
    iznos = Math.abs(iznosNum)
    tip = iznosNum < 0 ? 'rashod' : 'prihod'
    opis = get('opis') || get('opis transakcije') || get('namjena') || get('naziv')
    referenca = get('referenca') || get('broj dokumenta') || get('poziv na broj')
  }

  const datumNorm = normDatum(datum)
  if (!datumNorm || iznos <= 0) return null

  return { datum: datumNorm, iznos, tip, opis: opis.slice(0, 500), referenca: referenca.slice(0, 100) }
}
```

---

## KORAK 4 — Ažuriranje `RacuniPage.tsx`

### 4.1 Novi tab layout

Na vrhu `RacuniPage` komponente, dodaj tab navigaciju:

```tsx
type TabRacuni = 'lista' | 'knjiga' | 'banka'
const [activeTab, setActiveTab] = useState<TabRacuni>('lista')
```

Dodaj header s tabovima iznad sadržaja:
```tsx
<div className="border-b border-[#333338] mb-6">
  <nav className="flex gap-1 -mb-px">
    {([
      { key: 'lista',  label: `Računi ${godina}` },
      { key: 'knjiga', label: 'Knjiga ulaznih računa' },
      { key: 'banka',  label: 'Izvadak banke' },
    ] as { key: TabRacuni; label: string }[]).map(t => (
      <button key={t.key} onClick={() => setActiveTab(t.key)}
        className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${
          activeTab === t.key
            ? 'border-red-600 text-red-400'
            : 'border-transparent text-[#999] hover:text-[#ddd]'
        }`}>
        {t.label}
      </button>
    ))}
  </nav>
</div>

{activeTab === 'lista'  && <ListaRacunaTab ... />}
{activeTab === 'knjiga' && <KnjigaTab godina={godina} />}
{activeTab === 'banka'  && <BankaTab />}
```

### 4.2 Gumb za XML upload u formi novi račun

U postojećoj formi za novi račun, dodaj drugi gumb:

```tsx
{/* Pored gumba "+ Novi račun" */}
<label className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm font-medium rounded-lg
                  hover:bg-[#333338] cursor-pointer">
  📄 Uvezi e-Račun (XML)
  <input
    type="file"
    accept=".xml"
    className="hidden"
    onChange={async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const podaci = await parsirajEracunFajl(file)
      if (!podaci) { alert('Nije moguće pročitati XML datoteku.'); return }
      // Predpopuni formu
      setForma(f => ({
        ...f,
        naziv_stranke: podaci.naziv_stranke,
        datum_racuna:  podaci.datum_racuna,
        iznos_ukupno:  String(podaci.iznos_ukupno),
        opis:          `e-Račun ${podaci.br_racuna}`,
      }))
      setXmlFile(file)
      setShowForma(true)
      // Automatski dohvati kategoriju
      if (podaci.naziv_stranke) {
        const kat = await dohvatiKategorijuDobavljaca(podaci.naziv_stranke)
        if (kat?.plan_stavka_id) {
          setForma(f => ({ ...f, plan_stavka_id: kat.plan_stavka_id || '' }))
        }
      }
    }}
  />
</label>
```

### 4.3 Auto-prijedlog kategorije u formi

U formi, nakon polja `naziv_stranke` dodaj auto-fetch kategorije:

```ts
// State
const [stavkePlana, setStavkePlana] = useState<...[]>([])
const [prijedlogKat, setPrijedlogKat] = useState<string | null>(null)

// useEffect — učitaj stavke plana
useEffect(() => {
  dohvatiStavkeZaKategorizaciju(godina).then(setStavkePlana).catch(console.error)
}, [godina])

// Debounce auto-prijedlog
useEffect(() => {
  if (forma.naziv_stranke.length < 3) return
  const t = setTimeout(async () => {
    const kat = await dohvatiKategorijuDobavljaca(forma.naziv_stranke)
    if (kat?.plan_stavka_id) {
      setForma(f => ({ ...f, plan_stavka_id: kat.plan_stavka_id || '' }))
      const stavka = stavkePlana.find(s => s.id === kat.plan_stavka_id)
      if (stavka) setPrijedlogKat(stavka.naziv_stavke)
    }
  }, 500)
  return () => clearTimeout(t)
}, [forma.naziv_stranke])
```

Dodaj u formu dropdown za kategoriju:
```tsx
<div className="md:col-span-2">
  <label className="block text-xs text-[#999] mb-1">
    Kategorija financijskog plana
    {prijedlogKat && (
      <span className="ml-2 text-emerald-400 text-[10px]">
        ⚡ Automatski: {prijedlogKat}
      </span>
    )}
  </label>
  <select
    value={forma.plan_stavka_id}
    onChange={e => setForma(f => ({ ...f, plan_stavka_id: e.target.value }))}
    className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]"
  >
    <option value="">-- Odaberi stavku plana (opcionalno) --</option>
    {stavkePlana.map(s => (
      <option key={s.id} value={s.id}>
        {s.racunski_plan_konto ? `[${s.racunski_plan_konto}] ` : ''}{s.naziv_stavke}
      </option>
    ))}
  </select>
</div>
```

### 4.4 Tab `KnjigaTab`

```tsx
function KnjigaTab({ godina }: { godina: number }) {
  const [stavke, setStavke] = useState<KnjigaUlazniRacun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dohvatiKnjiguUlaznihRacuna(godina)
      .then(setStavke).catch(console.error)
      .finally(() => setLoading(false))
  }, [godina])

  async function handleExport() {
    // xlsx export
    const { utils, writeFile } = await import('xlsx')
    const ws = utils.json_to_sheet(stavke.map(s => ({
      'R.br.': s.redni_broj,
      'Int. br.': s.interni_broj || '',
      'Datum': s.datum_racuna,
      'Stranka': s.naziv_stranke,
      'OIB stranke': s.oib_stranke || '',
      'Opis': s.opis || '',
      'Bez PDV (EUR)': s.iznos_bez_pdv ?? '',
      'PDV (EUR)': s.pdv_iznos ?? '',
      'Ukupno (EUR)': s.iznos_ukupno,
      'Kategorija': s.kategorija_plana || '',
      'Status': s.status,
      'Plaćeno': s.datum_placanja || '',
      'Likvidirao': s.likvidirao_ime || '',
      'e-Račun': s.je_eracun ? 'DA' : 'NE',
    })))
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, `KUR ${godina}`)
    writeFile(wb, `Knjiga_ulaznih_racuna_${godina}.xlsx`)
  }

  if (loading) return <div className="p-8 text-center text-[#999]">Učitavanje...</div>

  const ukupno = stavke.reduce((a, s) => a + s.iznos_ukupno, 0)
  const fEUR = (v: number) => new Intl.NumberFormat('hr-HR',
    { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">
            Knjiga ulaznih računa {godina}
          </h2>
          <p className="text-xs text-[#777] mt-0.5">
            Zakonski dokument — čuvati 7 godina · {stavke.length} zapisa · Ukupno: {fEUR(ukupno)}
          </p>
        </div>
        <button onClick={handleExport}
          className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg hover:bg-[#333338]">
          📥 Export .xlsx
        </button>
      </div>

      <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2e2e32] bg-[#1e1e22]">
                {['R.br.','Int. br.','Datum','Stranka','Kategorija','Iznos','Status','Plaćeno'].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-[#999] uppercase font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stavke.map(s => (
                <tr key={s.redni_broj} className="border-b border-[#2a2a2e] hover:bg-[#1e1e22]">
                  <td className="px-3 py-2 text-[#777]">{s.redni_broj}</td>
                  <td className="px-3 py-2 font-mono text-[#999]">
                    {s.interni_broj || '—'}
                    {s.je_eracun && <span className="ml-1 text-emerald-500" title="e-Račun">⚡</span>}
                  </td>
                  <td className="px-3 py-2 text-[#bbb]">
                    {new Date(s.datum_racuna).toLocaleDateString('hr-HR')}
                  </td>
                  <td className="px-3 py-2 text-white font-medium">{s.naziv_stranke}</td>
                  <td className="px-3 py-2 text-[#777]">{s.kategorija_plana || '—'}</td>
                  <td className="px-3 py-2 text-right text-white">{fEUR(s.iznos_ukupno)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      s.status === 'placeno'  ? 'bg-green-900/25 text-green-400' :
                      s.status === 'odobreno' ? 'bg-blue-900/25 text-blue-400' :
                                                'bg-yellow-900/25 text-yellow-400'
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-3 py-2 text-[#777]">
                    {s.datum_placanja
                      ? new Date(s.datum_placanja).toLocaleDateString('hr-HR')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#333338] bg-[#1a1a1e]">
                <td colSpan={5} className="px-3 py-3 text-xs font-semibold text-[#bbb]">
                  UKUPNO ({stavke.length} računa)
                </td>
                <td className="px-3 py-3 text-right font-bold text-white">{fEUR(ukupno)}</td>
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

### 4.5 Tab `BankaTab` — CSV upload i sparivanje

```tsx
function BankaTab() {
  const [transakcije, setTransakcije] = useState<...[]>([])  // bank_transakcije iz Supabase
  const [loading, setLoading] = useState(true)
  const [uploadGreska, setUploadGreska] = useState('')

  useEffect(() => { ucitajTransakcije() }, [])

  async function ucitajTransakcije() {
    const { data } = await supabase
      .from('bank_transakcije')
      .select('*')
      .order('datum', { ascending: false })
      .limit(200)
    setTransakcije(data || [])
    setLoading(false)
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadGreska('')
    const text = await file.text()
    const { transakcije: parsed, greske } = parsirајBankCSV(text)

    if (greske.length > 0 && parsed.length === 0) {
      setUploadGreska(`Greška parsiranja: ${greske[0]}`)
      return
    }

    // Upiši u Supabase (preskoči duplikate po datumu+iznosu+opisu)
    const { error } = await supabase
      .from('bank_transakcije')
      .upsert(
        parsed.map(t => ({
          datum: t.datum, iznos: t.iznos, tip: t.tip,
          opis: t.opis, referenca: t.referenca,
          status: 'nespojeno', izvor: 'csv_upload',
        })),
        { ignoreDuplicates: true }
      )

    if (error) { setUploadGreska(error.message); return }
    if (greske.length > 0) setUploadGreska(`Upozorenja: ${greske.join('; ')}`)
    await ucitajTransakcije()
  }

  async function handleSpoji(transakcijaId: string, racunId: string) {
    await supabase.from('bank_transakcije')
      .update({ racun_id: racunId, status: 'spojeno' })
      .eq('id', transakcijaId)
    // Označi račun kao plaćen
    await platiRacun(racunId)
    await ucitajTransakcije()
  }

  const nespojene = transakcije.filter(t => t.status === 'nespojeno')
  const fEUR = (v: number) => new Intl.NumberFormat('hr-HR',
    { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Izvadak banke</h2>
          <p className="text-xs text-[#777] mt-0.5">
            {nespojene.length > 0
              ? `${nespojene.length} transakcija nije spojeno s računima`
              : 'Sve transakcije su spojene ✓'}
          </p>
        </div>
        <label className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg
                          hover:bg-[#333338] cursor-pointer">
          📤 Uvezi CSV izvadak
          <input type="file" accept=".csv,.txt" className="hidden" onChange={handleCSVUpload} />
        </label>
      </div>

      {uploadGreska && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
          {uploadGreska}
        </div>
      )}

      <div className="bg-[#1e1e22] border border-[#333338] rounded-lg p-4 mb-4 text-xs text-[#bbb]">
        Podržani formati: <strong>Erste, PBZ, ZABA, OTP</strong> — exportiraj CSV iz internet bankarstva i uvezi ovdje.
        Rashodi se automatski pokušavaju spariti s neplaćenim računima.
      </div>

      {loading ? (
        <div className="p-8 text-center text-[#999]">Učitavanje...</div>
      ) : (
        <div className="space-y-2">
          {transakcije.map(t => (
            <div key={t.id}
              className={`bg-[#242428] border rounded-xl p-4 flex items-center gap-4 ${
                t.status === 'spojeno'  ? 'border-green-900/30' :
                t.status === 'ignorano' ? 'border-[#2a2a2e] opacity-50' :
                                          'border-orange-900/30'
              }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    t.tip === 'prihod' ? 'bg-green-900/25 text-green-400' : 'bg-red-900/25 text-red-400'
                  }`}>{t.tip === 'prihod' ? 'Prihod' : 'Rashod'}</span>
                  <span className="text-sm font-medium text-white">{fEUR(t.iznos)}</span>
                  <span className="text-xs text-[#777]">
                    {new Date(t.datum).toLocaleDateString('hr-HR')}
                  </span>
                </div>
                <p className="text-xs text-[#999] mt-0.5 truncate">{t.opis || '—'}</p>
              </div>
              <div className="flex-shrink-0">
                {t.status === 'spojeno' ? (
                  <span className="text-xs text-green-400">✓ Spojeno</span>
                ) : t.status === 'ignorano' ? (
                  <span className="text-xs text-[#666]">Ignorirano</span>
                ) : (
                  <div className="flex gap-2">
                    <SpajanjePicker
                      transakcija={t}
                      onSpoji={(racunId) => handleSpoji(t.id, racunId)}
                    />
                    <button
                      onClick={() => supabase.from('bank_transakcije')
                        .update({ status: 'ignorano' }).eq('id', t.id)
                        .then(() => ucitajTransakcije())}
                      className="text-xs text-[#666] hover:text-[#999] px-2 py-1 rounded hover:bg-[#2a2a2e]">
                      Ignoriraj
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {transakcije.length === 0 && (
            <div className="p-8 text-center text-[#999]">
              Nema transakcija. Uvezi CSV izvadak iz banke.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Picker za sparivanje transakcije s računom
function SpajanjePicker({
  transakcija,
  onSpoji,
}: {
  transakcija: { iznos: number; datum: string }
  onSpoji: (racunId: string) => void
}) {
  const [kandidati, setKandidati] = useState<Racun[]>([])
  const [otvoren, setOtvoren] = useState(false)

  async function ucitajKandidateZaSparavanje() {
    // Pronađi račune sličnog iznosa (±5%) koji nisu plaćeni
    const min = transakcija.iznos * 0.95
    const max = transakcija.iznos * 1.05
    const { data } = await supabase
      .from('racuni')
      .select('id, naziv_stranke, iznos_ukupno, datum_racuna, status')
      .gte('iznos_ukupno', min)
      .lte('iznos_ukupno', max)
      .not('status', 'eq', 'placeno')
      .not('status', 'eq', 'odbijeno')
      .order('datum_racuna', { ascending: false })
      .limit(10)
    setKandidati(data || [])
    setOtvoren(true)
  }

  return (
    <div className="relative">
      <button
        onClick={ucitajKandidateZaSparavanje}
        className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-900/20 hover:bg-blue-900/30">
        Spoji s računom
      </button>
      {otvoren && (
        <div className="absolute right-0 top-8 z-10 bg-[#1a1a28] border border-[#333338] rounded-xl
                        shadow-xl w-72 max-h-64 overflow-y-auto">
          <div className="p-2 border-b border-[#2a2a2e] flex justify-between items-center">
            <span className="text-xs text-[#999]">Odaberi račun za spariti</span>
            <button onClick={() => setOtvoren(false)} className="text-[#666] hover:text-[#bbb]">✕</button>
          </div>
          {kandidati.length === 0 ? (
            <div className="p-4 text-xs text-[#777]">Nema odgovarajućih računa.</div>
          ) : (
            kandidati.map(r => (
              <button key={r.id}
                onClick={() => { onSpoji(r.id); setOtvoren(false) }}
                className="w-full text-left px-3 py-2 hover:bg-[#242428] text-xs border-b border-[#2a2a2e]">
                <div className="text-white font-medium">{r.naziv_stranke}</div>
                <div className="text-[#999]">
                  {new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(Number(r.iznos_ukupno))}
                  {' · '}
                  {new Date(r.datum_racuna).toLocaleDateString('hr-HR')}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
```

---

## KORAK 5 — Postavke: e-Račun konfiguracija

U `PostavkePage.tsx` — u tab array dodaj:

```ts
{ key: 'eracun' as Tab, label: 'e-Račun' },
```

Ažuriraj `Tab` tip:
```ts
type Tab = 'korisnici' | 'dvd' | 'tijela' | 'zakoni' | 'eracun' | 'gdpr'
```

Dodaj render:
```tsx
{tab === 'eracun' && <TabEracun />}
```

Komponenta `TabEracun`:

```tsx
function TabEracun() {
  const [config, setConfig] = useState<EracunKonfiguracija | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testRezultat, setTestRezultat] = useState<{ ok: boolean; poruka: string } | null>(null)
  const [forma, setForma] = useState({
    posrednik: 'eposlovanje',
    api_username: '',
    api_password: '',
    company_id: '',
    aktivan: false,
  })

  useEffect(() => {
    dohvatiEracunKfg().then(c => {
      if (c) { setConfig(c); setForma({ ...forma, ...c }) }
      setLoading(false)
    })
  }, [])

  async function handleSpremi() {
    if (!config) return
    setSaving(true)
    try {
      await azurirajEracunKfg(config.id, forma)
      setTestRezultat(null)
    } finally { setSaving(false) }
  }

  async function handleTestiraj() {
    setTesting(true)
    setTestRezultat(null)
    const rez = await testirajEracunVezu(
      forma.posrednik, forma.api_username, forma.api_password, forma.company_id
    )
    setTestRezultat(rez)
    setTesting(false)
  }

  if (loading) return <div className="p-8 text-center text-[#999]">Učitavanje...</div>

  return (
    <div className="space-y-6">
      {/* Upute */}
      <div className="bg-[#1e1e22] border border-[#333338] rounded-lg p-4 text-sm text-[#bbb]">
        <p className="font-medium text-white mb-2">Kako postaviti e-Račun integraciju:</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Registrirajte se na <strong>eposlovanje.hr</strong> ili <strong>portal.moj-eracun.hr</strong></li>
          <li>Odaberite ih kao informacijskog posrednika u <strong>ePorezna sustavu</strong> (obavezno do 31.12.2025.)</li>
          <li>Unesite vaše kredencijale i OIB u polja ispod</li>
          <li>Kliknite "Testiraj vezu" — trebate vidjeti "Veza uspješna!"</li>
          <li>Označite "Aktivan" i sustav će automatski preuzimati e-račune svaki sat</li>
        </ol>
      </div>

      {/* Forma */}
      <div className="bg-[#242428] border border-[#333338] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Konfiguracija</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#999] mb-1">Informacijski posrednik</label>
            <select
              value={forma.posrednik}
              onChange={e => setForma(f => ({ ...f, posrednik: e.target.value }))}
              className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#1a1a1e] text-white">
              <option value="eposlovanje">ePoslovanje.hr</option>
              <option value="moj_eracun">mojeRačun / mer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#999] mb-1">OIB DVD-a (Company ID)</label>
            <input type="text" value={forma.company_id}
              onChange={e => setForma(f => ({ ...f, company_id: e.target.value }))}
              placeholder="npr. 48874677674"
              className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#1a1a1e] text-white" />
          </div>
          <div>
            <label className="block text-xs text-[#999] mb-1">Korisničko ime (username)</label>
            <input type="text" value={forma.api_username}
              onChange={e => setForma(f => ({ ...f, api_username: e.target.value }))}
              placeholder="Korisničko ime s ePoslovanje/mojeRačun"
              className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#1a1a1e] text-white" />
          </div>
          <div>
            <label className="block text-xs text-[#999] mb-1">Lozinka</label>
            <input type="password" value={forma.api_password}
              onChange={e => setForma(f => ({ ...f, api_password: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#1a1a1e] text-white" />
          </div>
        </div>

        {/* Aktivan toggle */}
        <div className="flex items-center gap-3 mt-4">
          <input type="checkbox" id="aktivan" checked={forma.aktivan}
            onChange={e => setForma(f => ({ ...f, aktivan: e.target.checked }))}
            className="w-4 h-4 rounded" />
          <label htmlFor="aktivan" className="text-sm text-white">
            Automatski sync aktivan (svakih sat vremena)
          </label>
        </div>

        {/* Akcije */}
        <div className="flex gap-3 mt-5">
          <button onClick={handleTestiraj} disabled={testing || !forma.api_username}
            className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg hover:bg-[#333338] disabled:opacity-50">
            {testing ? 'Testiranje...' : '🔌 Testiraj vezu'}
          </button>
          <button onClick={handleSpremi} disabled={saving}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50">
            {saving ? 'Spremanje...' : 'Spremi'}
          </button>
        </div>

        {/* Rezultat testa */}
        {testRezultat && (
          <div className={`mt-3 px-4 py-3 rounded-lg text-sm ${
            testRezultat.ok
              ? 'bg-green-900/20 border border-green-500/30 text-green-400'
              : 'bg-red-900/20 border border-red-500/30 text-red-400'
          }`}>
            {testRezultat.ok ? '✓ ' : '✗ '}{testRezultat.poruka}
            {testRezultat.ok && (testRezultat as any).brDokumenata !== undefined && (
              <span className="ml-2 text-[#999]">
                ({(testRezultat as any).brDokumenata} dokumenata u inboxu)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status zadnjeg synca */}
      {config && (
        <div className="bg-[#1a1a1e] border border-[#2a2a2e] rounded-xl p-4 text-xs text-[#777]">
          <div className="flex justify-between">
            <span>Zadnji sync:</span>
            <span>{config.zadnji_sync
              ? new Date(config.zadnji_sync).toLocaleString('hr-HR')
              : 'Još nije sinkronizirano'}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Ukupno uvezeno:</span>
            <span>{config.zadnji_sync_br} računa</span>
          </div>
          {config.greska_zadnja && (
            <div className="mt-2 text-red-400">Zadnja greška: {config.greska_zadnja}</div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## KORAK 6 — Importi u RacuniPage.tsx

Na vrhu `RacuniPage.tsx` dodaj:

```ts
import {
  dohvatiKategorijuDobavljaca,
  dohvatiStavkeZaKategorizaciju,
  dohvatiKnjiguUlaznihRacuna,
  oznacPoslatoKnjigov,
} from '@/lib/supabase/queries/financije'
import type { KnjigaUlazniRacun } from '@/lib/supabase/queries/financije'
import { parsirajEracunFajl } from '@/lib/utils/eracun-parser'
import { parsirајBankCSV } from '@/lib/utils/bank-parser'
```

Na vrhu `PostavkePage.tsx` dodaj:

```ts
import {
  dohvatiEracunKfg, azurirajEracunKfg, testirajEracunVezu,
} from '@/lib/supabase/queries/financije'
import type { EracunKonfiguracija } from '@/lib/supabase/queries/financije'
```

---

## Redosljed commitova

```
1. sql: migracija 011 — proširenje racuni + eracun_konfiguracija + bank_transakcije + trigger + view + cron
2. feat: Edge Function sync-eracuni — automatski uvoz iz ePoslovanje/mojeRačun API
3. feat: utils/eracun-parser.ts — XML parser za UBL 2.1 FINA format
4. feat: utils/bank-parser.ts — CSV parser za Erste/PBZ/ZABA/OTP formate
5. feat: queries/financije.ts — dodaci za kategorizaciju, knjiga, eracun kfg
6. feat: RacuniPage — tab layout + XML upload gumb + auto-prijedlog kategorije
7. feat: RacuniPage — KnjigaTab (knjiga ulaznih računa + xlsx export)
8. feat: RacuniPage — BankaTab (CSV uvoz + sparivanje transakcija)
9. feat: PostavkePage — TabEracun (konfiguracija posrednika + test veze)
10. chore: supabase gen types — regeneracija tipova nakon novih tablica
```

---

## Napomene

- Edge Function `sync-eracuni` poziva se i iz cron joba i može se ručno pokrenuti iz Supabase dashboarda za testiranje
- `testirajEracunVezu` poziva API direktno iz browsera — CORS može biti problem; ako jest, prebaci poziv na Edge Function
- `bank-parser.ts` — ukoliko neka banka ima drugačiji format, dodaj novi `format` case u `detectFormat()` i `parseLinija()`
- XML upload i auto-sync koriste isti `parsirajEracunXML` parser — konzistentnost je zajamčena
- `eracun_xml` kolona čuva originalni XML u base64 — zakonska obveza čuvanja e-računa u izvornom obliku

---

*Projekt: DVD Sarvaš ERP — https://github.com/dvdsarvas/dvd-erp*
