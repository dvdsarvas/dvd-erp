import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  Header, ImageRun,
} from 'docx'
import { supabase } from '@/lib/supabase/client'
import { dohvatiOrganizaciju, dohvatiFunkcionere } from '@/lib/supabase/queries/organizacija'
import type { DVDOrganizacija, TrenutniFlunkcioneri } from '@/lib/supabase/queries/organizacija'
import { dohvatiFinPlan, dohvatiStavkePlana } from '@/lib/supabase/queries/financije'
import { dohvatiClanove } from '@/lib/supabase/queries/clanovi'

// ── Tipovi ────────────────────────────────────────────────────

export interface SkupstinaPaket {
  izvjesce_o_radu: Blob
  financijsko_izvjesce: Blob
  plan_rada_iduca: Blob
  financijski_plan_iduca: Blob
  poziv_skupstini: Blob
  upisnica: Blob
}

export interface PaketStatus {
  korak: string
  gotovo: boolean
  greske: string[]
}

// ── Logo cache ────────────────────────────────────────────────

let logoBuffer: ArrayBuffer | null = null
async function ucitajLogo(): Promise<ArrayBuffer | null> {
  if (logoBuffer) return logoBuffer
  try {
    const r = await fetch('/logo-dvd.jpg')
    if (!r.ok) return null
    logoBuffer = await r.arrayBuffer()
    return logoBuffer
  } catch { return null }
}

// ── Provjera podataka ─────────────────────────────────────────

export async function provjeriSpremnostSkupstine(godina: number): Promise<PaketStatus> {
  const greske: string[] = []

  const [org, funk, finPlan, aktivnosti, clanovi] = await Promise.all([
    dohvatiOrganizaciju().catch(() => null),
    dohvatiFunkcionere().catch(() => null),
    dohvatiFinPlan(godina).catch(() => null),
    supabase.from('aktivnosti_plan_rada').select('id', { count: 'exact' }).eq('godina', godina),
    dohvatiClanove({ status: 'aktivan' }).catch(() => []),
  ])

  if (!org) greske.push('Podaci organizacije nisu uneseni (Postavke → Podaci DVD-a)')
  if (!funk?.predsjednik) greske.push('Predsjednik nije postavljen u Tijelima DVD-a')
  if (!finPlan) greske.push(`Financijski plan za ${godina} ne postoji`)
  if ((aktivnosti.count ?? 0) === 0) greske.push(`Plan rada za ${godina} nema aktivnosti`)
  if (clanovi.length === 0) greske.push('Nema aktivnih članova u evidenciji')

  return {
    korak: greske.length === 0 ? 'spreman' : 'nedostaje',
    gotovo: greske.length === 0,
    greske,
  }
}

// ── Generiranje paketa ───────────────────────────────────────

export async function generirajSkupstinuPaket(
  godina: number,
  onProgress?: (korak: string) => void
): Promise<SkupstinaPaket> {
  onProgress?.('Učitavanje podataka...')

  const [org, funk, aktivnosti, finPlan, clanovi] = await Promise.all([
    dohvatiOrganizaciju(),
    dohvatiFunkcionere(),
    supabase.from('aktivnosti_plan_rada').select('*').eq('godina', godina).order('redni_broj'),
    dohvatiFinPlan(godina),
    dohvatiClanove({ status: 'aktivan' }),
  ])

  const finStavke = finPlan ? await dohvatiStavkePlana(finPlan.id) : []
  const naziv = org?.naziv ?? 'DVD Sarvaš'
  const predsjednik = funk?.predsjednik ?? 'N/N'

  onProgress?.('Generiranje Izvješća o radu...')
  const izvjesce_o_radu = await generirajIzvjesceORadu(godina, naziv, predsjednik, aktivnosti.data || [])

  onProgress?.('Generiranje Financijskog izvješća...')
  const financijsko_izvjesce = await generirajFinancijskoIzvjesce(godina, naziv, predsjednik, finStavke)

  onProgress?.('Generiranje Plana rada...')
  const plan_rada_iduca = await generirajPlanRadaDoc(godina + 1, naziv, predsjednik)

  onProgress?.('Generiranje Financijskog plana...')
  const financijski_plan_iduca = await generirajFinancijskiPlanDoc(godina + 1, naziv, predsjednik)

  onProgress?.('Generiranje Poziva za skupštinu...')
  const poziv_skupstini = await generirajPozivDoc(godina, naziv, predsjednik, org)

  onProgress?.('Generiranje Upisnice...')
  const upisnica = await generirajUpisnicuDoc(naziv, clanovi)

  onProgress?.('Pakiranje završeno!')

  return {
    izvjesce_o_radu,
    financijsko_izvjesce,
    plan_rada_iduca,
    financijski_plan_iduca,
    poziv_skupstini,
    upisnica,
  }
}

// ── Docx helpers ──────────────────────────────────────────────

function prazno(): Paragraph { return new Paragraph({ children: [] }) }

function naslovParagraf(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text, bold: true, size: 28, font: 'Calibri' })],
  })
}

function podnaslov(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [new TextRun({ text, size: 22, color: '555555', font: 'Calibri' })],
  })
}

function tekst(text: string, bold = false): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text, size: 22, bold, font: 'Calibri' })],
  })
}

function potpis(naslov: string, ime: string): Paragraph[] {
  return [
    prazno(), prazno(),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: naslov, size: 22, font: 'Calibri' })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 100 }, children: [new TextRun({ text: ime, bold: true, size: 22, font: 'Calibri' })] }),
  ]
}

async function memorandum(org: DVDOrganizacija | null): Promise<Header> {
  const logo = await ucitajLogo()
  const naziv = org?.naziv ?? 'DOBROVOLJNO VATROGASNO DRUŠTVO SARVAŠ'
  const adresa = org ? `${org.adresa}, ${org.postanski_broj} ${org.mjesto}` : 'Ivana Mažuranića 31, 31000 Sarvaš'
  const web = org?.web ?? 'www.dvdsarvas.hr'

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }

  return new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: [
          new TableCell({
            width: { size: 85, type: WidthType.PERCENTAGE }, borders: noBorders,
            children: [
              new Paragraph({ children: [new TextRun({ text: naziv.toUpperCase(), bold: true, size: 22, font: 'Calibri' })] }),
              new Paragraph({ children: [new TextRun({ text: adresa, size: 18, color: '555555', font: 'Calibri' })] }),
              new Paragraph({ children: [new TextRun({ text: web, size: 18, color: '555555', font: 'Calibri' })] }),
            ],
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE }, borders: noBorders,
            children: logo ? [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new ImageRun({ data: logo, transformation: { width: 70, height: 70 }, type: 'jpg' })] })] : [prazno()],
          }),
        ] })],
      }),
      new Paragraph({ spacing: { after: 100 }, border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA', space: 4 } }, children: [] }),
    ],
  })
}

async function makeDoc(org: DVDOrganizacija | null, children: (Paragraph | Table)[]): Promise<Blob> {
  const header = await memorandum(org)
  const doc = new Document({
    sections: [{ properties: {}, headers: { default: header }, children }],
  })
  return Packer.toBlob(doc)
}

// ── Dokument generatori ──────────────────────────────────────

async function generirajIzvjesceORadu(
  godina: number, naziv: string, predsjednik: string, aktivnosti: any[]
): Promise<Blob> {
  const org = await dohvatiOrganizaciju().catch(() => null)
  const zavrseno = aktivnosti.filter(a => a.status === 'zavrseno').length
  const ukupno = aktivnosti.length

  const children: (Paragraph | Table)[] = [
    naslovParagraf(`IZVJEŠĆE O RADU ZA ${godina}. GODINU`),
    podnaslov(naziv),
    prazno(),
    tekst(`Tijekom ${godina}. godine provedeno je ${zavrseno} od ${ukupno} planiranih aktivnosti.`, true),
    prazno(),
  ]

  // Grupiraj aktivnosti po kategoriji
  const kategorije = [...new Set(aktivnosti.map(a => a.kategorija))]
  for (const kat of kategorije) {
    children.push(tekst(kat.charAt(0).toUpperCase() + kat.slice(1).replace(/_/g, ' '), true))
    const katAktivnosti = aktivnosti.filter(a => a.kategorija === kat)
    for (const a of katAktivnosti) {
      const statusIcon = a.status === 'zavrseno' ? '[✓]' : a.status === 'u_tijeku' ? '[~]' : '[ ]'
      children.push(tekst(`  ${statusIcon} ${a.naziv}${a.napomena ? ` — ${a.napomena}` : ''}`))
    }
    children.push(prazno())
  }

  children.push(...potpis('Predsjednik', predsjednik))

  return makeDoc(org, children)
}

async function generirajFinancijskoIzvjesce(
  godina: number, naziv: string, predsjednik: string, stavke: any[]
): Promise<Blob> {
  const org = await dohvatiOrganizaciju().catch(() => null)
  const fEUR = (v: number) => new Intl.NumberFormat('hr-HR', { minimumFractionDigits: 2 }).format(v) + ' EUR'

  const prihodi = stavke.filter(s => s.kategorija === 'prihod')
  const rashodi = stavke.filter(s => s.kategorija === 'rashod')
  const ukPrihodiPlan = prihodi.reduce((a: number, s: any) => a + (s.iznos_plan || 0), 0)
  const ukPrihodiOst = prihodi.reduce((a: number, s: any) => a + (s.iznos_ostvareno || 0), 0)
  const ukRashodiPlan = rashodi.reduce((a: number, s: any) => a + (s.iznos_plan || 0), 0)
  const ukRashodiOst = rashodi.reduce((a: number, s: any) => a + (s.iznos_ostvareno || 0), 0)

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
  const borders = { top: border, bottom: border, left: border, right: border }

  function tableRow(cells: string[], bold = false): TableRow {
    return new TableRow({
      children: cells.map((c, i) => new TableCell({
        borders,
        width: { size: i === 0 ? 50 : 25, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          alignment: i > 0 ? AlignmentType.RIGHT : AlignmentType.LEFT,
          children: [new TextRun({ text: c, size: 20, bold, font: 'Calibri' })],
        })],
      })),
    })
  }

  const rows = [
    tableRow(['Stavka', 'Plan (EUR)', 'Ostvareno (EUR)'], true),
    tableRow(['PRIHODI', '', ''], true),
    ...prihodi.map((s: any) => tableRow([s.naziv_stavke, fEUR(s.iznos_plan || 0), fEUR(s.iznos_ostvareno || 0)])),
    tableRow(['Ukupno prihodi', fEUR(ukPrihodiPlan), fEUR(ukPrihodiOst)], true),
    tableRow(['RASHODI', '', ''], true),
    ...rashodi.map((s: any) => tableRow([s.naziv_stavke, fEUR(s.iznos_plan || 0), fEUR(s.iznos_ostvareno || 0)])),
    tableRow(['Ukupno rashodi', fEUR(ukRashodiPlan), fEUR(ukRashodiOst)], true),
    tableRow(['RAZLIKA (prihodi - rashodi)', fEUR(ukPrihodiPlan - ukRashodiPlan), fEUR(ukPrihodiOst - ukRashodiOst)], true),
  ]

  const children: (Paragraph | Table)[] = [
    naslovParagraf(`FINANCIJSKO IZVJEŠĆE ZA ${godina}. GODINU`),
    podnaslov(naziv),
    prazno(),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
    prazno(),
    ...potpis('Predsjednik', predsjednik),
  ]

  return makeDoc(org, children)
}

async function generirajPlanRadaDoc(godinaIduca: number, naziv: string, predsjednik: string): Promise<Blob> {
  const org = await dohvatiOrganizaciju().catch(() => null)

  const children: (Paragraph | Table)[] = [
    naslovParagraf(`PLAN RADA ZA ${godinaIduca}. GODINU`),
    podnaslov(naziv),
    prazno(),
    tekst('Na temelju članka 18. Statuta i Zakona o udrugama, skupština usvaja sljedeći Plan rada:'),
    prazno(),
    tekst('1. Organizacijske aktivnosti', true),
    tekst('   - Redovne sjednice Upravnog odbora (min. 4 godišnje)'),
    tekst('   - Izvještajna skupština'),
    tekst('   - Ažuriranje evidencije članstva'),
    prazno(),
    tekst('2. Operativne aktivnosti', true),
    tekst('   - Redovne vježbe vatrogasnih postrojbi'),
    tekst('   - Osposobljavanje novih vatrogasaca'),
    tekst('   - Redovni zdravstveni pregledi operativnih članova'),
    prazno(),
    tekst('3. Financijske aktivnosti', true),
    tekst('   - Naplata članarina'),
    tekst('   - Realizacija financijskog plana'),
    tekst('   - Predaja godišnjeg financijskog izvještaja FINA-i'),
    prazno(),
    tekst('4. Održavanje imovine', true),
    tekst('   - Servisiranje vatrogasnih vozila'),
    tekst('   - Održavanje opreme i vatrogasnog doma'),
    prazno(),
    tekst(`Detaljni plan s rokovima i odgovornim osobama nalazi se u ERP sustavu (modul Plan rada ${godinaIduca}).`),
    prazno(),
    ...potpis('Predsjednik', predsjednik),
  ]

  return makeDoc(org, children)
}

async function generirajFinancijskiPlanDoc(godinaIduca: number, naziv: string, predsjednik: string): Promise<Blob> {
  const org = await dohvatiOrganizaciju().catch(() => null)

  const children: (Paragraph | Table)[] = [
    naslovParagraf(`FINANCIJSKI PLAN ZA ${godinaIduca}. GODINU`),
    podnaslov(naziv),
    prazno(),
    tekst('Na temelju članka 14. Zakona o financijskom poslovanju i računovodstvu neprofitnih organizacija, skupština usvaja sljedeći Financijski plan:'),
    prazno(),
    tekst(`Detaljne stavke financijskog plana nalaze se u ERP sustavu (modul Financije ${godinaIduca}).`),
    tekst('Plan se može izmijeniti odlukom UO ili skupštine tijekom godine.'),
    prazno(),
    ...potpis('Predsjednik', predsjednik),
  ]

  return makeDoc(org, children)
}

async function generirajPozivDoc(
  godina: number, naziv: string, predsjednik: string, org: DVDOrganizacija | null
): Promise<Blob> {
  const datum = new Date()
  datum.setDate(datum.getDate() + 14)
  const datumStr = datum.toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' })

  const children: (Paragraph | Table)[] = [
    naslovParagraf('POZIV ZA IZVJEŠTAJNU SKUPŠTINU'),
    podnaslov(naziv),
    prazno(),
    tekst('Poštovani članovi,'),
    prazno(),
    tekst(`Na temelju članka 18. Statuta ${naziv}, sazivam izvještajnu skupštinu za ${godina}. godinu.`),
    prazno(),
    tekst(`Datum: ${datumStr}`, true),
    tekst(`Vrijeme: 18:00 sati`, true),
    tekst(`Mjesto: ${org?.adresa ?? 'Prostorije DVD-a'}, ${org?.mjesto ?? 'Sarvaš'}`, true),
    prazno(),
    tekst('Predloženi dnevni red:', true),
    tekst('1. Otvaranje skupštine i utvrđivanje kvoruma'),
    tekst('2. Izbor radnih tijela (predsjedavajući, zapisničar, ovjerovitelji)'),
    tekst(`3. Izvješće o radu za ${godina}. godinu`),
    tekst(`4. Financijsko izvješće za ${godina}. godinu`),
    tekst(`5. Plan rada za ${godina + 1}. godinu`),
    tekst(`6. Financijski plan za ${godina + 1}. godinu`),
    tekst('7. Razno'),
    prazno(),
    tekst('Molimo sve članove da prisustvuju skupštini.'),
    tekst('Vatru gasi — brata spasi!'),
    prazno(),
    ...potpis('Predsjednik', predsjednik),
  ]

  return makeDoc(org, children)
}

async function generirajUpisnicuDoc(naziv: string, clanovi: any[]): Promise<Blob> {
  const org = await dohvatiOrganizaciju().catch(() => null)

  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
  const borders = { top: border, bottom: border, left: border, right: border }

  function cell(text: string, bold = false, width = 0): TableCell {
    return new TableCell({
      borders,
      ...(width ? { width: { size: width, type: WidthType.PERCENTAGE } } : {}),
      children: [new Paragraph({ children: [new TextRun({ text, size: 20, bold, font: 'Calibri' })] })],
    })
  }

  const headerRow = new TableRow({ children: [
    cell('R.br.', true, 8), cell('Ime i prezime', true, 40), cell('Potpis', true, 52),
  ] })

  const rows = clanovi
    .sort((a: any, b: any) => a.prezime.localeCompare(b.prezime))
    .map((c: any, i: number) => new TableRow({ children: [
      cell(String(i + 1), false, 8),
      cell(`${c.prezime} ${c.ime}`, false, 40),
      cell('', false, 52),
    ] }))

  const children: (Paragraph | Table)[] = [
    naslovParagraf('UPISNICA ČLANOVA'),
    podnaslov(`Izvještajna skupština ${naziv}`),
    prazno(),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...rows] }),
  ]

  return makeDoc(org, children)
}
