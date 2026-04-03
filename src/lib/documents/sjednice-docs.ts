import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  Header, ImageRun,
} from 'docx'
import { saveAs } from 'file-saver'
import type { Sjednica, Tocka, Prisutnost } from '@/lib/supabase/queries/sjednice'
import type { Clan } from '@/lib/supabase/queries/clanovi'

// Logo se učitava jednom i cachira
let logoBuffer: ArrayBuffer | null = null

async function ucitajLogo(): Promise<ArrayBuffer | null> {
  if (logoBuffer) return logoBuffer
  try {
    const response = await fetch('/logo-dvd.jpg')
    if (!response.ok) return null
    logoBuffer = await response.arrayBuffer()
    return logoBuffer
  } catch {
    return null
  }
}

// ────────────────────────────────────────────────────────────
// KONSTANTE
// ────────────────────────────────────────────────────────────

const DVD_PUNI = 'DOBROVOLJNO VATROGASNO DRUŠTVO SARVAŠ'
const DVD_KRATKI = 'DVD Sarvaš'
const DVD_KRATKI_GEN = 'DVD-a Sarvaš'
const DVD_PUNI_GEN = 'Dobrovoljnog vatrogasnog društva Sarvaš'
const DVD_ADRESA = 'Ivana Mažuranića 31, 31000 Sarvaš, Osijek'
const DVD_WEB = 'www.dvdsarvas.hr'
const PREDSJEDNIK = 'Atila Vadoci'
const POZDRAV = 'Vatru gasi – brata spasi!'

// ────────────────────────────────────────────────────────────
// HELPERI
// ────────────────────────────────────────────────────────────

function fDatum(d: string) {
  return new Date(d).toLocaleDateString('hr-HR', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

function fDatumDugi(d: string) {
  return new Date(d).toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fDan(d: string) {
  return new Date(d).toLocaleDateString('hr-HR', { weekday: 'long' })
}

function prazno(): Paragraph { return new Paragraph({ children: [] }) }

/** Memorandum u headeru — tekst lijevo, logo desno (kao u stvarnim dokumentima) */
function memorandum(logo: ArrayBuffer | null): Header {
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }

  // Logo ćelija (desno)
  const logoCell = new TableCell({
    width: { size: 15, type: WidthType.PERCENTAGE },
    borders: noBorders,
    children: logo ? [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new ImageRun({ data: logo, transformation: { width: 70, height: 70 }, type: 'jpg' })],
      }),
    ] : [prazno()],
  })

  // Tekst ćelija (lijevo)
  const tekstCell = new TableCell({
    width: { size: 85, type: WidthType.PERCENTAGE },
    borders: noBorders,
    children: [
      new Paragraph({ children: [new TextRun({ text: DVD_PUNI, bold: true, size: 22, font: 'Calibri' })] }),
      new Paragraph({ children: [new TextRun({ text: DVD_ADRESA, size: 18, color: '555555', font: 'Calibri' })] }),
      new Paragraph({ children: [new TextRun({ text: DVD_WEB, size: 18, color: '555555', font: 'Calibri' })] }),
    ],
  })

  return new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: [tekstCell, logoCell] })],
      }),
      new Paragraph({
        spacing: { after: 100 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA', space: 4 } },
        children: [],
      }),
    ],
  })
}

function potpis(naslov: string, ime: string): Paragraph[] {
  return [
    prazno(), prazno(),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: naslov, size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 100 }, children: [new TextRun({ text: ime, bold: true, size: 22 })] }),
  ]
}

async function doc(children: (Paragraph | Table)[]): Promise<Document> {
  const logo = await ucitajLogo()
  return new Document({
    sections: [{
      properties: {},
      headers: { default: memorandum(logo) },
      children,
    }],
  })
}

async function spremi(d: Document, naziv: string): Promise<Blob> {
  const blob = await Packer.toBlob(d)
  saveAs(blob, naziv)
  return blob
}

// ════════════════════════════════════════════════════════════
// 1. POZIVNICA — SKUPŠTINA
//    Prema: Poziv (skupština 2024).docx
// ════════════════════════════════════════════════════════════

export async function generirajPozivnicuSkupstine(sjednica: Sjednica) {
  await spremi(await doc([
    prazno(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 400 },
      children: [new TextRun({ text: 'P O Z I V N I C A', size: 36, font: 'Calibri' })],
    }),

    prazno(),

    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: '     Čast nam je pozvati Vas na ', size: 24 }),
        new TextRun({ text: sjednica.naziv, size: 24 }),
        new TextRun({ text: ` ${DVD_PUNI_GEN}`, size: 24 }),
        new TextRun({ text: `, koja će se održati dana `, size: 24 }),
        new TextRun({ text: `${fDatum(sjednica.datum)} (${fDan(sjednica.datum)})`, size: 24 }),
        new TextRun({ text: ` s početkom u ${sjednica.sat_pocetka || '18:00'} sati`, size: 24 }),
        new TextRun({ text: sjednica.mjesto ? ` u ${sjednica.mjesto}.` : '.', size: 24 }),
      ],
    }),

    prazno(),
    new Paragraph({ children: [new TextRun({ text: 'Uz Vatrogasni pozdrav', size: 24, italics: true })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 100 },
      children: [new TextRun({ text: POZDRAV, bold: true, size: 24, italics: true })],
    }),
    ...potpis(`Predsjednik ${DVD_KRATKI}:`, PREDSJEDNIK),
  ]), `DVD-Pozivnica-${sjednica.datum}.docx`)
}

// ════════════════════════════════════════════════════════════
// 2. POZIV — UO / ZAPOVJEDNIŠTVO (formalno pismo)
//    Prema: 20. Sjednica UO_Dnevni red.docx
// ════════════════════════════════════════════════════════════

export async function generirajPozivSjednice(sjednica: Sjednica, tocke: Tocka[]) {
  const isUO = sjednica.vrsta === 'upravni_odbor'
  const tijelo = isUO ? 'Upravnog odbora' : 'Zapovjedništva'
  const primatelj = `Članovima ${tijelo} ${DVD_KRATKI_GEN}`

  const children: (Paragraph | Table)[] = [
    // Ur.br + datum
    new Paragraph({ children: [new TextRun({ text: sjednica.urbroj ? `Ur.br: ${sjednica.urbroj}` : '', size: 20, color: '666666' })] }),
    new Paragraph({ children: [new TextRun({ text: `U Sarvašu, ${fDatum(sjednica.datum)}`, size: 20, color: '666666' })] }),
    prazno(),

    // Primatelj (desno poravnanje kao u originalu)
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: primatelj, size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '  — svima', size: 22 })] }),
    prazno(),

    // PREDMET
    new Paragraph({
      children: [
        new TextRun({ text: 'PREDMET: ', bold: true, size: 22 }),
        new TextRun({ text: `Poziv na sjednicu ${tijelo} ${DVD_PUNI_GEN}`, size: 22 }),
      ],
    }),
    prazno(),

    // Poštovani
    new Paragraph({ children: [new TextRun({ text: 'Poštovani,', size: 22 })] }),

    // Tekst poziva
    new Paragraph({
      children: [
        new TextRun({ text: `pozivamo Vas na `, size: 22 }),
        new TextRun({ text: sjednica.naziv, bold: true, size: 22 }),
        new TextRun({ text: ` koja će se održati `, size: 22 }),
      ],
    }),
    // Datum/vrijeme centrirano kao u originalu
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 100 },
      children: [
        new TextRun({ text: `${fDan(sjednica.datum).charAt(0).toUpperCase() + fDan(sjednica.datum).slice(1)} ${fDatum(sjednica.datum)} u ${sjednica.sat_pocetka || '18:00'} sati`, bold: true, size: 22 }),
      ],
    }),
  ]

  if (sjednica.mjesto) {
    children.push(new Paragraph({ children: [new TextRun({ text: `u ${sjednica.mjesto}`, size: 22 })] }))
  }

  children.push(new Paragraph({ children: [new TextRun({ text: 'Uz sljedeći:', size: 22 })] }))
  children.push(prazno())

  // D N E V N I    R E D
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
    children: [new TextRun({ text: 'D N E V N I    R E D', bold: true, size: 26 })],
  }))

  // Točke
  tocke.forEach(t => {
    children.push(new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: `${t.redni_broj}. ${t.naziv}`, size: 22 })],
    }))
    if (t.opis) {
      children.push(new Paragraph({
        indent: { left: 300 },
        spacing: { after: 60 },
        children: [new TextRun({ text: t.opis, size: 20, italics: true, color: '555555' })],
      }))
    }
  })

  children.push(prazno())

  // S poštovanjem
  children.push(new Paragraph({ children: [new TextRun({ text: 'S poštovanjem,', size: 22 })] }))
  children.push(...potpis(`Predsjednik ${DVD_KRATKI}`, PREDSJEDNIK))

  // Napomena o glasanju
  children.push(prazno())
  children.push(new Paragraph({
    spacing: { before: 200 },
    border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC', space: 8 } },
    children: [new TextRun({
      text: '\tMolim Vas da za točke dnevnog reda glasujete sa ZA ili PROTIV ili SUZDRŽAN elektronskim putem na e-mail adresu: dvdsarvas@gmail.com',
      size: 18, italics: true, color: '777777',
    })],
  }))

  await spremi(await doc(children), `DVD-Poziv-Sjednica-${sjednica.datum}.docx`)
}

// ════════════════════════════════════════════════════════════
// 3. DNEVNI RED — SKUPŠTINA
//    Prema: Dnevni red za izvještajnu Sjednicu skupštine.docx
// ════════════════════════════════════════════════════════════

export async function generirajDnevniRed(sjednica: Sjednica, tocke: Tocka[]) {
  const children: (Paragraph | Table)[] = [
    // Uvodni tekst s pozivom na Statut
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: 'Temeljem članka 34. Statuta ', size: 22 }),
        new TextRun({ text: DVD_KRATKI, bold: true, size: 22 }),
        new TextRun({ text: ', Upravni odbor saziva ', size: 22 }),
        new TextRun({ text: sjednica.naziv, bold: true, size: 22 }),
        new TextRun({ text: ` dana ${fDatum(sjednica.datum)} s početkom u ${sjednica.sat_pocetka || '18:00'} sati`, size: 22 }),
        new TextRun({ text: sjednica.mjesto ? ` u ${sjednica.mjesto}` : '', size: 22 }),
        new TextRun({ text: ' s sljedećim', size: 22 }),
      ],
    }),

    // DNEVNIM REDOM
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 300 },
      children: [new TextRun({ text: 'D N E V N I M    R E D O M', bold: true, size: 26 })],
    }),
  ]

  // Točke s pod-točkama
  tocke.forEach(t => {
    children.push(new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: `${t.redni_broj}. `, bold: true, size: 22 }),
        new TextRun({ text: t.naziv.toUpperCase(), size: 22 }),
      ],
    }))
    if (t.opis) {
      t.opis.split('\n').forEach(line => {
        if (line.trim()) {
          children.push(new Paragraph({
            indent: { left: 400 },
            children: [new TextRun({ text: line.trim(), size: 22 })],
          }))
        }
      })
    }
  })

  children.push(prazno())

  // Poziv na sudjelovanje
  children.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED, spacing: { before: 200 },
    children: [new TextRun({ text: 'Molimo Vas da svojom nazočnošću i učešćem u diskusiji pomognete u radu Skupštine.', size: 22, italics: true })],
  }))

  // Potpis
  children.push(prazno())
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Upravni odbor', size: 22 })] }))
  children.push(...potpis('Predsjednik', PREDSJEDNIK))

  await spremi(await doc(children), `DVD-Dnevni-Red-${sjednica.datum}.docx`)
}

// ════════════════════════════════════════════════════════════
// 4. ZAPISNIK
//    Prema: Zapisnik sa skupštine 2025.docx
// ════════════════════════════════════════════════════════════

export async function generirajZapisnik(
  sjednica: Sjednica, tocke: Tocka[], prisutnost: Prisutnost[], clanovi: Clan[],
) {
  const prisutniIds = new Set(prisutnost.filter(p => p.prisutan).map(p => p.clan_id))
  const prisutniClanovi = clanovi.filter(c => prisutniIds.has(c.id))
  const predsjedavajuci = clanovi.find(c => c.id === sjednica.predsjedavajuci_id)
  const zapisnicar = clanovi.find(c => c.id === sjednica.zapisnicar_id)

  const vrstaGen: Record<string, string> = {
    skupstina_redovna: 'izvještajne sjednice Skupštine',
    skupstina_izborna: 'izborne sjednice Skupštine',
    skupstina_izvanredna: 'izvanredne sjednice Skupštine',
    skupstina_konstitutivna: 'konstitutivne sjednice Skupštine',
    upravni_odbor: 'sjednice Upravnog odbora',
    zapovjednistvo: 'sjednice Zapovjedništva',
  }

  const children: (Paragraph | Table)[] = [
    // Ur.Br
    new Paragraph({ children: [new TextRun({ text: sjednica.urbroj ? `Ur.Br:${sjednica.urbroj}` : '', size: 20, color: '666666' })] }),
    new Paragraph({ children: [new TextRun({ text: ` ${DVD_KRATKI}`, bold: true, size: 22 })] }),
    prazno(),

    // ZAPISNIK naslov
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 100, after: 200 },
      children: [new TextRun({ text: 'ZAPISNIK', bold: true, size: 32 })],
    }),

    // Uvodni tekst — točno kao u originalu
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: `Sa  ${vrstaGen[sjednica.vrsta] || 'sjednice'} ${DVD_KRATKI_GEN} održane`, size: 22 }),
        new TextRun({ text: sjednica.mjesto ? ` u ${sjednica.mjesto}` : '', size: 22 }),
        new TextRun({ text: ` dana ${fDatumDugi(sjednica.datum)} s početkom u ${sjednica.sat_pocetka || '18:00'} sati.`, size: 22 }),
      ],
    }),
    prazno(),
  ]

  // Tko otvara, tko vodi zapisnik
  if (predsjedavajuci || zapisnicar) {
    const parts: TextRun[] = []
    if (predsjedavajuci) {
      parts.push(new TextRun({ text: `Skupštinu otvara Predsjednik ${DVD_KRATKI_GEN} `, size: 22 }))
      parts.push(new TextRun({ text: `${predsjedavajuci.ime} ${predsjedavajuci.prezime}`, bold: true, size: 22 }))
    }
    if (zapisnicar) {
      parts.push(new TextRun({ text: '  zapisnik vodi ', size: 22 }))
      parts.push(new TextRun({ text: `${zapisnicar.ime} ${zapisnicar.prezime}`, bold: true, size: 22 }))
    }
    children.push(new Paragraph({ spacing: { after: 200 }, children: parts }))
  }

  // Dnevni red
  children.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Dnevni red', bold: true, size: 22 })] }))
  tocke.forEach(t => {
    children.push(new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: `${t.redni_broj}. `, bold: true, size: 22 }),
        new TextRun({ text: t.naziv.toUpperCase(), size: 22 }),
      ],
    }))
    if (t.opis) {
      t.opis.split('\n').forEach(line => {
        if (line.trim()) children.push(new Paragraph({ indent: { left: 400 }, children: [new TextRun({ text: line.trim(), size: 20 })] }))
      })
    }
  })
  children.push(prazno())

  // Ad. po točkama
  tocke.forEach(t => {
    children.push(new Paragraph({
      spacing: { before: 150, after: 80 },
      children: [new TextRun({ text: `Ad.${t.redni_broj}.`, bold: true, size: 22 })],
    }))

    if (t.rasprava) {
      children.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 60 }, children: [new TextRun({ text: t.rasprava, size: 22 })] }))
    }
    if (t.zakljucak) {
      children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Zaključak: ', bold: true, size: 22 }), new TextRun({ text: t.zakljucak, size: 22 })] }))
    }
    if (t.odluka_tekst) {
      children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Odluka: ', bold: true, size: 22 }), new TextRun({ text: t.odluka_tekst, size: 22 })] }))
    }
    if (t.glasovi_za != null) {
      const u = t.usvojena != null ? (t.usvojena ? ' — USVOJENO' : ' — NIJE USVOJENO') : ''
      children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `Glasanje: Za: ${t.glasovi_za}, Protiv: ${t.glasovi_protiv ?? 0}, Suzdržani: ${t.glasovi_uzdrzani ?? 0}${u}`, size: 22, italics: true })] }))
    }
    if (!t.rasprava && !t.zakljucak && !t.odluka_tekst && t.glasovi_za == null) {
      children.push(new Paragraph({ children: [new TextRun({ text: '— bez rasprave', size: 20, italics: true, color: '999999' })] }))
    }
  })

  // Završetak
  children.push(prazno())
  children.push(new Paragraph({ children: [new TextRun({ text: `Dovršeno u ${sjednica.sat_zavrsetka || '___:___'} sati.`, size: 22 })] }))
  children.push(prazno(), prazno(), prazno())

  // Potpisi — desno poravnanje kao u originalu
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Zapisničar: ${zapisnicar ? `${zapisnicar.ime} ${zapisnicar.prezime}` : ''}`, size: 22 })] }))
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '______________________', size: 22 })] }))
  children.push(prazno())
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Ovjerovitelji zapisnika:', size: 22 })] }))
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 150 }, children: [new TextRun({ text: '______________________', size: 22 })] }))
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 150 }, children: [new TextRun({ text: '______________________', size: 22 })] }))

  // Popis prisutnih
  children.push(prazno(), prazno())
  children.push(new Paragraph({ children: [new TextRun({ text: 'Popis prisutnih članova:', bold: true, size: 20 })] }))
  prisutniClanovi.forEach((c, i) => {
    children.push(new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${c.prezime} ${c.ime}`, size: 20 })] }))
  })

  await spremi(await doc(children), `DVD-Zapisnik-${sjednica.datum}.docx`)
}

// ════════════════════════════════════════════════════════════
// 5. UPISNICA ČLANOVA (tablica za potpis)
//    Prema: Upis članova za izvještajnu skupštinu.docx
// ════════════════════════════════════════════════════════════

export async function generirajUpisnicuClanova(sjednica: Sjednica, clanovi: Clan[]) {
  const b = { style: BorderStyle.SINGLE, size: 1, color: '999999' }
  const borders = { top: b, bottom: b, left: b, right: b }

  const header = new TableRow({
    children: [
      new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, borders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'RB.', bold: true, size: 20 })] })] }),
      new TableCell({ width: { size: 52, type: WidthType.PERCENTAGE }, borders, children: [new Paragraph({ children: [new TextRun({ text: 'IME I PREZIME', bold: true, size: 20 })] })] }),
      new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, borders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'POTPIS', bold: true, size: 20 })] })] }),
    ],
  })

  const rows = clanovi.map((c, i) => new TableRow({
    children: [
      new TableCell({ borders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${i + 1}`, size: 20 })] })] }),
      new TableCell({ borders, children: [new Paragraph({ children: [new TextRun({ text: `${c.prezime} ${c.ime}`, size: 20 })] })] }),
      new TableCell({ borders, children: [new Paragraph({ spacing: { before: 200, after: 200 }, children: [] })] }),
    ],
  }))

  const logo = await ucitajLogo()
  const d = new Document({
    sections: [{
      properties: {},
      headers: { default: memorandum(logo) },
      children: [
        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Sarvaš, ${fDatum(sjednica.datum)}`, size: 20, color: '666666' })] }),
        prazno(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: 'PRISUTNI ČLANOVI', bold: true, size: 28 })] }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...rows] }),
      ],
    }],
  })

  await spremi(d, `DVD-Upisnica-Clanova-${sjednica.datum}.docx`)
}

// ════════════════════════════════════════════════════════════
// 6. IZVJEŠĆE VERIFIKACIJSKE KOMISIJE
//    Prema: Izvješče Verifikacijskog povjerenstva.docx
// ════════════════════════════════════════════════════════════

export async function generirajIzvjesceVerifikacije(
  sjednica: Sjednica,
  komisija: { predsjednik: string; clan1: string; clan2: string },
  prisutno: number, ukupno: number,
) {
  const kvorum = prisutno > ukupno / 2

  await spremi(await doc([
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Sarvaš, ${fDatumDugi(sjednica.datum)}`, size: 20, color: '666666' })] }),
    prazno(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: 'Izvješće verifikacijskog povjerenstva', bold: true, size: 26 })] }),

    // Sastav
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: 'Verifikacijsko povjerenstvo u sastavu:', size: 22 })] }),
    new Paragraph({ indent: { left: 400 }, children: [new TextRun({ text: `1. ${komisija.predsjednik} — predsjednik`, size: 22 })] }),
    new Paragraph({ indent: { left: 400 }, children: [new TextRun({ text: `2. ${komisija.clan1} — član`, size: 22 })] }),
    new Paragraph({ indent: { left: 400 }, spacing: { after: 200 }, children: [new TextRun({ text: `3. ${komisija.clan2} — član`, size: 22 })] }),

    // Zaključak
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 },
      children: [
        new TextRun({ text: `Na današnjoj Skupštini prisutno je `, size: 24 }),
        new TextRun({ text: `${prisutno}`, bold: true, size: 24 }),
        new TextRun({ text: ` članova s pravom glasa od njih ukupno ${ukupno}. `, size: 24 }),
        new TextRun({
          text: kvorum
            ? 'Zaključujem da Skupština ima natpolovičnu većinu i da može donositi odluke.'
            : 'Zaključujem da Skupština nema natpolovičnu većinu.',
          size: 24, bold: true,
        }),
      ],
    }),

    prazno(), prazno(), prazno(),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Predsjednik verifikacijskog povjerenstva:', size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 150 }, children: [new TextRun({ text: '______________________', size: 22 })] }),
  ]), `DVD-Izvjesce-Verifikacije-${sjednica.datum}.docx`)
}

// ════════════════════════════════════════════════════════════
// 7. ODLUKA O RADNIM TIJELIMA
//    Prema: Odluke (radna tijela).docx
// ════════════════════════════════════════════════════════════

export async function generirajOdlukuRadnaTijela(
  sjednica: Sjednica,
  predsjednistvo: { predsjednik: string; clan1: string; clan2: string },
  verifikacija: { predsjednik: string; clan1: string; clan2: string },
  zapisnicar: string,
  ovjerovitelji: [string, string],
) {
  const vrstaGen: Record<string, string> = {
    skupstina_redovna: 'izvještajne sjednice Skupštine',
    skupstina_izborna: 'izborne sjednice Skupštine',
    skupstina_izvanredna: 'izvanredne sjednice Skupštine',
    skupstina_konstitutivna: 'konstitutivne sjednice Skupštine',
  }

  await spremi(await doc([
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `U Sarvašu dana ${fDatumDugi(sjednica.datum)}`, size: 20, color: '666666' })] }),
    prazno(),

    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'ODLUKU O IZBORU RADNIH TIJELA', bold: true, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: `SKUPŠTINE ${DVD_KRATKI.toUpperCase()}`, bold: true, size: 26 })] }),

    // I.
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'I. ', bold: true, size: 22 }), new TextRun({ text: `Na ${vrstaGen[sjednica.vrsta] || 'sjednici'} ${DVD_KRATKI_GEN} izabrana su sljedeća radna tijela:`, size: 22 })] }),

    // II. Radno predsjedništvo
    new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: 'II. Radno predsjedništvo:', bold: true, size: 22 })] }),
    new Paragraph({ indent: { left: 400 }, children: [new TextRun({ text: `1. ${predsjednistvo.predsjednik} — predsjednik`, size: 22 })] }),
    new Paragraph({ indent: { left: 400 }, children: [new TextRun({ text: `2. ${predsjednistvo.clan1} — član`, size: 22 })] }),
    new Paragraph({ indent: { left: 400 }, spacing: { after: 100 }, children: [new TextRun({ text: `3. ${predsjednistvo.clan2} — član`, size: 22 })] }),

    // III. Verifikacijska komisija
    new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: 'III. Verifikacijska komisija:', bold: true, size: 22 })] }),
    new Paragraph({ indent: { left: 400 }, children: [new TextRun({ text: `1. ${verifikacija.predsjednik} — predsjednik`, size: 22 })] }),
    new Paragraph({ indent: { left: 400 }, children: [new TextRun({ text: `2. ${verifikacija.clan1} — član`, size: 22 })] }),
    new Paragraph({ indent: { left: 400 }, spacing: { after: 100 }, children: [new TextRun({ text: `3. ${verifikacija.clan2} — član`, size: 22 })] }),

    // IV. Zapisničar i ovjerovitelji
    new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: 'IV. Zapisničar i ovjerovitelji zapisnika:', bold: true, size: 22 })] }),
    new Paragraph({ indent: { left: 400 }, children: [new TextRun({ text: `1. ${zapisnicar} — zapisničar`, size: 22 })] }),
    new Paragraph({ indent: { left: 400 }, children: [new TextRun({ text: `2. ${ovjerovitelji[0]} — ovjerovitelj`, size: 22 })] }),
    new Paragraph({ indent: { left: 400 }, spacing: { after: 200 }, children: [new TextRun({ text: `3. ${ovjerovitelji[1]} — ovjerovitelj`, size: 22 })] }),

    prazno(), prazno(),
    new Paragraph({ children: [new TextRun({ text: 'M.P.', size: 22, bold: true })] }),
    prazno(),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Predsjedavajući:', size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 150 }, children: [new TextRun({ text: '______________________', size: 22 })] }),
  ]), `DVD-Odluka-Radna-Tijela-${sjednica.datum}.docx`)
}

// ════════════════════════════════════════════════════════════
// WRAPPER za kompatibilnost s UI
// ════════════════════════════════════════════════════════════

export async function generirajPozivnicu(sjednica: Sjednica, tocke?: Tocka[]) {
  if (sjednica.vrsta.startsWith('skupstina')) {
    await generirajPozivnicuSkupstine(sjednica)
  } else {
    await generirajPozivSjednice(sjednica, tocke || [])
  }
}

// ════════════════════════════════════════════════════════════
// BLOB VARIJANTE (za email prilog — bez saveAs)
// ════════════════════════════════════════════════════════════

async function generirajBlob(d: Document): Promise<Blob> {
  return Packer.toBlob(d)
}

export async function pozivnicaBlob(sjednica: Sjednica, tocke: Tocka[]): Promise<Blob> {
  if (sjednica.vrsta.startsWith('skupstina')) {
    return generirajBlob(await doc([
      prazno(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 400 }, children: [new TextRun({ text: 'P O Z I V N I C A', size: 36, font: 'Calibri' })] }),
      prazno(),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 },
        children: [
          new TextRun({ text: '     Čast nam je pozvati Vas na ', size: 24 }),
          new TextRun({ text: sjednica.naziv, size: 24 }),
          new TextRun({ text: ` ${DVD_PUNI_GEN}, koja će se održati dana `, size: 24 }),
          new TextRun({ text: `${fDatum(sjednica.datum)} (${fDan(sjednica.datum)})`, size: 24 }),
          new TextRun({ text: ` s početkom u ${sjednica.sat_pocetka || '18:00'} sati`, size: 24 }),
          new TextRun({ text: sjednica.mjesto ? ` u ${sjednica.mjesto}.` : '.', size: 24 }),
        ],
      }),
      prazno(),
      new Paragraph({ children: [new TextRun({ text: 'Uz Vatrogasni pozdrav', size: 24, italics: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: POZDRAV, bold: true, size: 24, italics: true })] }),
      ...potpis(`Predsjednik ${DVD_KRATKI}:`, PREDSJEDNIK),
    ]))
  }
  // UO/Zapovjedništvo — koristi istu logiku kao generirajPozivSjednice ali vraća blob
  // Jednostavnije: generiraj cijeli dokument i vrati blob iz Packera
  const isUO = sjednica.vrsta === 'upravni_odbor'
  const tijelo = isUO ? 'Upravnog odbora' : 'Zapovjedništva'
  const primatelj = `Članovima ${tijelo} ${DVD_KRATKI_GEN}`
  const children: (Paragraph | Table)[] = [
    new Paragraph({ children: [new TextRun({ text: sjednica.urbroj ? `Ur.br: ${sjednica.urbroj}` : '', size: 20, color: '666666' })] }),
    new Paragraph({ children: [new TextRun({ text: `U Sarvašu, ${fDatum(sjednica.datum)}`, size: 20, color: '666666' })] }),
    prazno(),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: primatelj, size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '  — svima', size: 22 })] }),
    prazno(),
    new Paragraph({ children: [new TextRun({ text: 'PREDMET: ', bold: true, size: 22 }), new TextRun({ text: `Poziv na sjednicu ${tijelo} ${DVD_PUNI_GEN}`, size: 22 })] }),
    prazno(),
    new Paragraph({ children: [new TextRun({ text: 'Poštovani,', size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: `pozivamo Vas na `, size: 22 }), new TextRun({ text: sjednica.naziv, bold: true, size: 22 }), new TextRun({ text: ` koja će se održati `, size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: `${fDan(sjednica.datum).charAt(0).toUpperCase() + fDan(sjednica.datum).slice(1)} ${fDatum(sjednica.datum)} u ${sjednica.sat_pocetka || '18:00'} sati`, bold: true, size: 22 })] }),
  ]
  if (sjednica.mjesto) children.push(new Paragraph({ children: [new TextRun({ text: `u ${sjednica.mjesto}`, size: 22 })] }))
  children.push(new Paragraph({ children: [new TextRun({ text: 'Uz sljedeći:', size: 22 })] }), prazno())
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 }, children: [new TextRun({ text: 'D N E V N I    R E D', bold: true, size: 26 })] }))
  tocke.forEach(t => {
    children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `${t.redni_broj}. ${t.naziv}`, size: 22 })] }))
  })
  children.push(prazno(), new Paragraph({ children: [new TextRun({ text: 'S poštovanjem,', size: 22 })] }))
  children.push(...potpis(`Predsjednik ${DVD_KRATKI}`, PREDSJEDNIK))
  return generirajBlob(await doc(children))
}

export async function zapisnikBlob(sjednica: Sjednica, tocke: Tocka[], prisutnost: Prisutnost[], clanovi: Clan[]): Promise<Blob> {
  // Generiraj zapisnik i vrati blob (bez saveAs)
  // Koristimo isti Document ali ne zovemo saveAs
  const prisutniIds = new Set(prisutnost.filter(p => p.prisutan).map(p => p.clan_id))
  const prisutniClanovi = clanovi.filter(c => prisutniIds.has(c.id))
  const predsjedavajuci = clanovi.find(c => c.id === sjednica.predsjedavajuci_id)
  const zapisnicar = clanovi.find(c => c.id === sjednica.zapisnicar_id)
  const vrstaGen: Record<string, string> = {
    skupstina_redovna: 'izvještajne sjednice Skupštine', skupstina_izborna: 'izborne sjednice Skupštine',
    skupstina_izvanredna: 'izvanredne sjednice Skupštine', skupstina_konstitutivna: 'konstitutivne sjednice Skupštine',
    upravni_odbor: 'sjednice Upravnog odbora', zapovjednistvo: 'sjednice Zapovjedništva',
  }
  const ch: (Paragraph | Table)[] = [
    new Paragraph({ children: [new TextRun({ text: sjednica.urbroj ? `Ur.Br:${sjednica.urbroj}` : '', size: 20, color: '666666' })] }),
    new Paragraph({ children: [new TextRun({ text: ` ${DVD_KRATKI}`, bold: true, size: 22 })] }),
    prazno(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 200 }, children: [new TextRun({ text: 'ZAPISNIK', bold: true, size: 32 })] }),
    new Paragraph({ spacing: { after: 100 }, children: [
      new TextRun({ text: `Sa  ${vrstaGen[sjednica.vrsta] || 'sjednice'} ${DVD_KRATKI_GEN} održane`, size: 22 }),
      new TextRun({ text: sjednica.mjesto ? ` u ${sjednica.mjesto}` : '', size: 22 }),
      new TextRun({ text: ` dana ${fDatumDugi(sjednica.datum)} s početkom u ${sjednica.sat_pocetka || '18:00'} sati.`, size: 22 }),
    ]}),
    prazno(),
  ]
  if (predsjedavajuci || zapisnicar) {
    const parts: TextRun[] = []
    if (predsjedavajuci) { parts.push(new TextRun({ text: `Skupštinu otvara Predsjednik ${DVD_KRATKI_GEN} `, size: 22 })); parts.push(new TextRun({ text: `${predsjedavajuci.ime} ${predsjedavajuci.prezime}`, bold: true, size: 22 })) }
    if (zapisnicar) { parts.push(new TextRun({ text: predsjedavajuci ? '  zapisnik vodi ' : 'Zapisnik vodi ', size: 22 })); parts.push(new TextRun({ text: `${zapisnicar.ime} ${zapisnicar.prezime}`, bold: true, size: 22 })) }
    ch.push(new Paragraph({ spacing: { after: 200 }, children: parts }))
  }
  ch.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Dnevni red', bold: true, size: 22 })] }))
  tocke.forEach(t => ch.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `${t.redni_broj}. `, bold: true, size: 22 }), new TextRun({ text: t.naziv.toUpperCase(), size: 22 })] })))
  ch.push(prazno())
  tocke.forEach(t => {
    ch.push(new Paragraph({ spacing: { before: 150, after: 80 }, children: [new TextRun({ text: `Ad.${t.redni_broj}.`, bold: true, size: 22 })] }))
    if (t.rasprava) ch.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: t.rasprava, size: 22 })] }))
    if (t.zakljucak) ch.push(new Paragraph({ children: [new TextRun({ text: 'Zaključak: ', bold: true, size: 22 }), new TextRun({ text: t.zakljucak, size: 22 })] }))
    if (t.glasovi_za != null) ch.push(new Paragraph({ children: [new TextRun({ text: `Glasanje: Za: ${t.glasovi_za}, Protiv: ${t.glasovi_protiv ?? 0}, Suzdržani: ${t.glasovi_uzdrzani ?? 0}`, size: 22, italics: true })] }))
  })
  ch.push(prazno(), new Paragraph({ children: [new TextRun({ text: `Dovršeno u ${sjednica.sat_zavrsetka || '___:___'} sati.`, size: 22 })] }))
  ch.push(prazno(), prazno())
  ch.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Zapisničar: ${zapisnicar ? `${zapisnicar.ime} ${zapisnicar.prezime}` : ''}`, size: 22 })] }))
  ch.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '______________________', size: 22 })] }))
  ch.push(prazno())
  ch.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Ovjerovitelji zapisnika:', size: 22 })] }))
  ch.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 150 }, children: [new TextRun({ text: '______________________', size: 22 })] }))
  ch.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 150 }, children: [new TextRun({ text: '______________________', size: 22 })] }))
  ch.push(prazno())
  ch.push(new Paragraph({ children: [new TextRun({ text: 'Popis prisutnih članova:', bold: true, size: 20 })] }))
  prisutniClanovi.forEach((c, i) => ch.push(new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${c.prezime} ${c.ime}`, size: 20 })] })))
  return generirajBlob(await doc(ch))
}
