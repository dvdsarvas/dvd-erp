/**
 * scripts/import-sarvas-data.ts
 *
 * Uvoz stvarnih podataka DVD Sarvaš iz Excel datoteka u Supabase.
 * Pokrenuti jednom pri inicijalizaciji, nakon migracija i seed-a.
 *
 * Korištenje:
 *   npx ts-node scripts/import-sarvas-data.ts
 *
 * Potrebno:
 *   npm install xlsx @supabase/supabase-js ts-node typescript dotenv
 *   .env.local s VITE_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY
 *
 * Izvor datoteka:
 *   - DVD_Sarvaš_članstvo.xls  (listovi: NOVO, pomladak, liječnički, školovanje, ispisani)
 *   - Popis_operativnih_članova.xlsx
 */

import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Service role — bypass RLS za import
)

// ============================================================
// KONFIGURACIJA — prilagoditi putanje
// ============================================================
const DATA_DIR = process.env.DATA_DIR || './data-import'
const CLANSTVO_FILE = path.join(DATA_DIR, 'DVD_Sarvaš_članstvo.xls')
const OPERATIVNI_FILE = path.join(DATA_DIR, 'Popis_operativnih_članova.xlsx')

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('DVD Sarvaš — uvoz podataka')
  console.log('================================')

  if (!fs.existsSync(CLANSTVO_FILE)) {
    console.error(`Datoteka nije pronađena: ${CLANSTVO_FILE}`)
    console.error(`Kopiraj Excel datoteke u: ${DATA_DIR}/`)
    process.exit(1)
  }

  const wb = XLSX.readFile(CLANSTVO_FILE)

  await importRedovniClanovi(wb)
  await importPomladak(wb)
  await importIspisani(wb)
  await importLijecnicki(wb)
  await importSkolovanje(wb)
  await importOperativni()

  console.log('\n✓ Uvoz završen')
}

// ============================================================
// LIST: NOVO — redovni aktivni članovi
// ============================================================
async function importRedovniClanovi(wb: XLSX.WorkBook) {
  console.log('\n→ Uvoz redovnih članova (list NOVO)...')
  const ws = wb.Sheets['NOVO']
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

  // Pronađi header red (red koji ima 'PREZIME', 'IME', 'OIB'...)
  const headerRowIdx = rows.findIndex(r =>
    r.some((c: any) => String(c).toUpperCase().includes('PREZIME'))
  )
  if (headerRowIdx < 0) { console.warn('  ! Header red nije pronađen'); return }

  const headers: string[] = rows[headerRowIdx].map((h: any) => String(h ?? '').trim())
  const dataRows = rows.slice(headerRowIdx + 1).filter(r =>
    r[0] && !isNaN(Number(r[0]))  // redak počinje s rednim brojem
  )

  const col = (row: any[], name: string) => {
    const idx = headers.findIndex(h => h.toUpperCase().includes(name.toUpperCase()))
    return idx >= 0 ? row[idx] : null
  }

  let uvezeno = 0
  let preskoceno = 0

  for (const row of dataRows) {
    const ime = clean(col(row, 'IME'))
    const prezime = clean(col(row, 'PREZIME'))
    const oib = cleanOIB(col(row, 'OIB'))

    if (!ime || !prezime) { preskoceno++; continue }

    const clan = {
      ime,
      prezime,
      oib: oib || null,
      jmbg: clean(col(row, 'JMBG')),
      ime_oca: clean(col(row, 'IME OCA')),
      datum_rodenja: parseDate(col(row, 'DATUM ROÐENJA') || col(row, 'DATUM RÖÐENJA') || col(row, 'DATUM RO')),
      adresa: clean(col(row, 'ADRESA')),
      mobitel: cleanPhone(col(row, 'TEL/MOB')),
      mobitel2: cleanPhone(col(row, 'VPN MOB')),
      email: clean(col(row, 'E-MAIL')),
      skolska_sprema: clean(col(row, 'ŠKOLSKA SPREMA')),
      vozacka_dozvola: clean(col(row, 'VOZAÈKA DOZVOLA') || col(row, 'VOZACKA')),
      vatrogasno_zvanje: normalizeZvanje(clean(col(row, 'VATROGASNI ÈIN') || col(row, 'VATROGASNI CIN') || col(row, 'ÈIN'))),
      broj_knjizice: clean(col(row, 'BR.')),
      datum_uclanivanja: parseDate(col(row, 'ÈLAN OD') || col(row, 'CLAN OD')),
      kategorija: 'dobrovoljni_vatrogasac' as const,
      status: 'aktivan' as const,
    }

    const { error } = await supabase
      .from('clanovi')
      .upsert(clan, { onConflict: 'oib', ignoreDuplicates: false })

    if (error) {
      console.warn(`  ! ${ime} ${prezime}: ${error.message}`)
      preskoceno++
    } else {
      uvezeno++
    }
  }

  console.log(`  ✓ Uvezeno: ${uvezeno}, preskočeno: ${preskoceno}`)
}

// ============================================================
// LIST: pomladak
// ============================================================
async function importPomladak(wb: XLSX.WorkBook) {
  console.log('\n→ Uvoz podmlatka (list pomladak)...')
  const ws = wb.Sheets['pomladak']
  if (!ws) { console.warn('  ! List pomladak nije pronađen'); return }

  const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const headerRowIdx = rows.findIndex(r =>
    r.some((c: any) => String(c).toUpperCase().includes('PREZIME'))
  )
  if (headerRowIdx < 0) { console.warn('  ! Header red nije pronađen'); return }

  const headers: string[] = rows[headerRowIdx].map((h: any) => String(h ?? '').trim())
  const dataRows = rows.slice(headerRowIdx + 1).filter(r => r[1] && !isNaN(Number(r[1])))

  const col = (row: any[], name: string) => {
    const idx = headers.findIndex(h => h.toUpperCase().includes(name.toUpperCase()))
    return idx >= 0 ? row[idx] : null
  }

  let uvezeno = 0
  for (const row of dataRows) {
    const ime = clean(col(row, 'IME'))
    const prezime = clean(col(row, 'PREZIME'))
    if (!ime || !prezime) continue

    const { error } = await supabase.from('clanovi').upsert({
      ime, prezime,
      oib: cleanOIB(col(row, 'OIB')),
      jmbg: clean(col(row, 'JMBG')),
      ime_oca: clean(col(row, 'IME OCA')),
      datum_rodenja: parseDate(col(row, 'DATUM')),
      adresa: clean(col(row, 'ADRESA')),
      mobitel: cleanPhone(col(row, 'TEL')),
      broj_knjizice: clean(col(row, 'BR.')),
      datum_uclanivanja: parseDate(col(row, 'ÈLAN OD') || col(row, 'CLAN OD')),
      kategorija: 'podmladak',
      status: 'aktivan',
    }, { onConflict: 'oib', ignoreDuplicates: true })

    if (!error) uvezeno++
  }
  console.log(`  ✓ Uvezeno: ${uvezeno}`)
}

// ============================================================
// LIST: ispisani
// ============================================================
async function importIspisani(wb: XLSX.WorkBook) {
  console.log('\n→ Uvoz ispisanih članova (list ispisani)...')
  const ws = wb.Sheets['ispisani']
  if (!ws) { console.warn('  ! List ispisani nije pronađen'); return }

  const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const headerRowIdx = rows.findIndex(r =>
    r.some((c: any) => String(c).toUpperCase() === 'PREZIME')
  )
  if (headerRowIdx < 0) { console.warn('  ! Header red nije pronađen'); return }

  const headers: string[] = rows[headerRowIdx].map((h: any) => String(h ?? '').trim())
  const dataRows = rows.slice(headerRowIdx + 1).filter(r =>
    r[0] && !isNaN(Number(r[0]))
  )

  const col = (row: any[], name: string) => {
    const idx = headers.findIndex(h => h.toUpperCase().includes(name.toUpperCase()))
    return idx >= 0 ? row[idx] : null
  }

  let uvezeno = 0
  for (const row of dataRows) {
    const ime = clean(col(row, 'IME'))
    const prezime = clean(col(row, 'PREZIME'))
    if (!ime || !prezime) continue

    const { error } = await supabase.from('clanovi').upsert({
      ime, prezime,
      oib: cleanOIB(col(row, 'OIB')),
      datum_rodenja: parseDate(col(row, 'DATUM')),
      adresa: clean(col(row, 'ADRESA')),
      mobitel: cleanPhone(col(row, 'TEL')),
      kategorija: 'pricuvni',
      status: 'istupio',
    }, { onConflict: 'oib', ignoreDuplicates: true })

    if (!error) uvezeno++
  }
  console.log(`  ✓ Uvezeno: ${uvezeno}`)
}

// ============================================================
// LIST: liječnički
// ============================================================
async function importLijecnicki(wb: XLSX.WorkBook) {
  console.log('\n→ Uvoz liječničkih pregleda (list liječnički)...')
  const ws = wb.Sheets['liječnički']
  if (!ws) { console.warn('  ! List liječnički nije pronađen'); return }

  const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const headerRowIdx = rows.findIndex(r =>
    r.some((c: any) => String(c).toUpperCase().includes('PREZIME'))
  )
  if (headerRowIdx < 0) { console.warn('  ! Header nije pronađen'); return }

  const dataRows = rows.slice(headerRowIdx + 1).filter(r => r[1] && !isNaN(Number(r[1])))

  let uvezeno = 0
  for (const row of dataRows) {
    // Format: [null, RB, Prezime, Ime, Datum_rodenja, Od., Do.]
    const prezime = clean(row[2])
    const ime = clean(row[3])
    if (!ime || !prezime) continue

    // Pronađi člana po imenu i prezimenu
    const { data: clan } = await supabase
      .from('clanovi')
      .select('id')
      .ilike('ime', ime)
      .ilike('prezime', prezime)
      .single()

    if (!clan) { console.warn(`  ! Nije pronađen: ${ime} ${prezime}`); continue }

    const datumOd = parseDate(row[5])
    const datumDo = parseDate(row[6])

    if (!datumOd) continue

    const { error } = await supabase.from('zdravstveni_pregledi').upsert({
      clan_id: clan.id,
      datum_pregleda: datumOd,
      datum_isteka: datumDo,
      rezultat: 'sposoban',
      ustanova: 'Dom zdravlja Osijek — Medicina rada',
    }, { onConflict: 'clan_id,datum_pregleda', ignoreDuplicates: true })

    if (!error) uvezeno++
  }
  console.log(`  ✓ Uvezeno: ${uvezeno}`)
}

// ============================================================
// LIST: školovanje — vatrogasna zvanja
// ============================================================
async function importSkolovanje(wb: XLSX.WorkBook) {
  console.log('\n→ Uvoz vatrogasnih zvanja (list školovanje)...')
  const ws = wb.Sheets['školovanje']
  if (!ws) { console.warn('  ! List školovanje nije pronađen'); return }

  const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const headerRowIdx = rows.findIndex(r =>
    r.some((c: any) => String(c).toUpperCase().includes('PREZIME'))
  )
  if (headerRowIdx < 0) { console.warn('  ! Header nije pronađen'); return }

  const headers: string[] = rows[headerRowIdx].map((h: any) => String(h ?? '').trim())
  const dataRows = rows.slice(headerRowIdx + 1).filter(r => r[1] && !isNaN(Number(r[1])))

  let uvezeno = 0
  for (const row of dataRows) {
    const prezime = clean(row[2])
    const ime = clean(row[3])
    if (!ime || !prezime) continue

    const { data: clan } = await supabase
      .from('clanovi')
      .select('id')
      .ilike('ime', ime)
      .ilike('prezime', prezime)
      .single()

    if (!clan) continue

    // Stupci u listu školovanje (prema headers):
    // ISPITANI VATROGASAC, ISPITANI VATROGASAC 1.KLASE,
    // VATROGASNI DOČASNIK, VATROGASNI DOČASNIK 1.KLASE,
    // VATROGASNI ČASNIK, VATROGASNI ČASNIK 1.KLASE,
    // VIŠI VATROGASNI ČASNIK, VIŠI VATROGASNI ČASNIK 1.KLASE

    const getZvanjeDatum = (kljuc: string) => {
      const idx = headers.findIndex(h => h.toUpperCase().includes(kljuc.toUpperCase()))
      return idx >= 0 ? parseDate(row[idx]) : null
    }

    const { error } = await supabase.from('osposobljavanje').upsert({
      clan_id: clan.id,
      vatrogasac_datum:                 getZvanjeDatum('VATROGASAC') ? getZvanjeDatum('VATROGASAC') : null,
      vatrogasac_1klase_datum:          getZvanjeDatum('1.KLASE'),
      vatrogasni_docasnik_datum:        getZvanjeDatum('DOČASNIK') || getZvanjeDatum('DOCASNIK'),
      vatrogasni_docasnik_1klase_datum: getZvanjeDatum('DOČASNIK 1') || getZvanjeDatum('DOCASNIK 1'),
      vatrogasni_casnik_datum:          getZvanjeDatum('ČASNIK') || getZvanjeDatum('CASNIK'),
      vatrogasni_casnik_1klase_datum:   getZvanjeDatum('ČASNIK 1') || getZvanjeDatum('CASNIK 1'),
      visi_vatrogasni_casnik_datum:     getZvanjeDatum('VIŠI') || getZvanjeDatum('VISI'),
    }, { onConflict: 'clan_id', ignoreDuplicates: false })

    if (!error) uvezeno++
  }
  console.log(`  ✓ Uvezeno: ${uvezeno}`)
}

// ============================================================
// Popis_operativnih_članova.xlsx
// ============================================================
async function importOperativni() {
  if (!fs.existsSync(OPERATIVNI_FILE)) {
    console.warn(`\n! Preskočen (nije pronađen): ${OPERATIVNI_FILE}`)
    return
  }

  console.log('\n→ Uvoz operativnih članova (Popis_operativnih_članova.xlsx)...')
  const wb = XLSX.readFile(OPERATIVNI_FILE)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

  // Format: [Rb., ime, prezime, br. telefona, zvanje]
  const dataRows = rows.filter(r => r[0] && !isNaN(Number(r[0])))

  let azurirano = 0
  for (const row of dataRows) {
    const ime = clean(row[1])
    const prezime = clean(row[2])
    const telefon = cleanPhone(row[3])
    const zvanje = normalizeZvanje(clean(row[4]))

    if (!ime || !prezime) continue

    const { error } = await supabase
      .from('clanovi')
      .update({
        mobitel: telefon || undefined,
        vatrogasno_zvanje: zvanje || undefined,
      })
      .ilike('ime', ime)
      .ilike('prezime', prezime)

    if (!error) azurirano++
  }
  console.log(`  ✓ Ažurirano: ${azurirano}`)
}

// ============================================================
// HELPER FUNKCIJE
// ============================================================

function clean(val: any): string | null {
  if (val === null || val === undefined) return null
  const s = String(val).trim()
  return s === '' || s === 'NaN' ? null : s
}

function cleanOIB(val: any): string | null {
  const s = clean(val)
  if (!s) return null
  const digits = s.replace(/\D/g, '')
  return digits.length === 11 ? digits : null
}

function cleanPhone(val: any): string | null {
  const s = clean(val)
  if (!s) return null
  return s.replace(/\s+/g, ' ').trim()
}

function parseDate(val: any): string | null {
  if (!val) return null

  // Excel serijski broj datuma
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (!d) return null
    return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  }

  const s = String(val).trim()

  // DD.MM.YYYY.
  const ddmmyyyy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2,'0')}-${ddmmyyyy[1].padStart(2,'0')}`
  }

  // YYYY-MM-DD (ISO)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)

  // MM/YYYY ili M.YYYY (stariji format)
  const mmyyyy = s.match(/^(\d{1,2})[./](\d{4})$/)
  if (mmyyyy) return `${mmyyyy[2]}-${mmyyyy[1].padStart(2,'0')}-01`

  return null
}

function normalizeZvanje(zvanje: string | null): string | null {
  if (!zvanje) return null
  const z = zvanje.toUpperCase().trim()

  if (z.includes('VIŠI') && z.includes('1')) return 'visi_vatrogasni_casnik_1_klase'
  if (z.includes('VIŠI')) return 'visi_vatrogasni_casnik'
  if (z.includes('ČASNIK') && z.includes('1')) return 'vatrogasni_casnik_1_klase'
  if (z.includes('ČASNIK')) return 'vatrogasni_casnik'
  if (z.includes('DOČASNIK') && z.includes('1')) return 'vatrogasni_docasnik_1_klase'
  if (z.includes('DOČASNIK')) return 'vatrogasni_docasnik'
  if (z.includes('1. KLASE') || z.includes('1.KLASE')) return 'vatrogasac_1_klase'
  if (z.includes('VATROGASAC') || z.includes('TEČAJ')) return 'vatrogasac'

  return zvanje.toLowerCase().replace(/\s+/g, '_')
}

// ============================================================
main().catch(err => {
  console.error('Greška:', err)
  process.exit(1)
})
