export interface BankTransakcija {
  datum: string
  iznos: number
  tip: 'prihod' | 'rashod'
  opis: string
  referenca: string
}

/**
 * Parsira bankovni izvadak CSV. Podržava Erste, PBZ, ZABA i generički format.
 */
export function parsiraCSV(csv: string): BankTransakcija[] {
  const linije = csv
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  if (linije.length < 2) throw new Error('CSV je prazan ili nema podataka')

  const separator = detektirajSeparator(linije[0])
  const zaglavlje = linije[0].split(separator).map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
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

    const datumNorm = normalizirajDatum(datum)
    if (!datumNorm || isNaN(iznos) || iznos === 0) return null

    return { datum: datumNorm, iznos, tip, opis: opis.trim(), referenca: referenca.trim() }
  } catch {
    return null
  }
}

function normalizirajDatum(d: string): string | null {
  d = d.trim()
  const m1 = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/)
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`
  const m2 = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m2) return `${m2[3]}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`
  const m3 = d.match(/^\d{4}-\d{2}-\d{2}$/)
  if (m3) return d
  return null
}
