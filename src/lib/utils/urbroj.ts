import { supabase } from '@/lib/supabase/client'

export const KLASE = {
  vatrogastvo:   '810-01',
  clanstvo:      '032-01',
  financije:     '400-01',
  nabava:        '330-01',
  imovina:       '340-01',
  intervencija:  '810-02',
} as const

type VrstaUrbroja = 'skupstina' | 'uo' | 'zapovjednistvo' | 'nabava' | 'racun' | 'putni_nalog'

const PREFIKS: Record<VrstaUrbroja, string> = {
  skupstina:      'S',
  uo:             'UO',
  zapovjednistvo: 'Z',
  nabava:         'NAB',
  racun:          'R',
  putni_nalog:    'PN',
}

export function generirajUrbroj(
  vrsta: VrstaUrbroja,
  godina: number,
  redniBroj: number,
): string {
  const prefiks = PREFIKS[vrsta]
  const br = String(redniBroj).padStart(3, '0')
  return `SARV-${godina}-${prefiks}/${br}`
}

export function generirajKlasu(
  vrsta: VrstaUrbroja,
  godina: number,
  redniBroj: number,
): string {
  const klasa = vrsta === 'nabava' ? KLASE.nabava
    : vrsta === 'racun' ? KLASE.financije
    : vrsta === 'putni_nalog' ? KLASE.financije
    : KLASE.vatrogastvo

  const br = String(redniBroj).padStart(2, '0')
  return `${klasa}/${godina}-${br}`
}

/**
 * Dohvaća sljedeći redni broj za danu vrstu sjednice u godini.
 * Broji postojeće sjednice s URBROJ-om koji sadrži odgovarajući prefiks i godinu.
 */
export async function sljedeciRedniBrojSjednice(
  vrstaSjednice: string,
  godina: number,
): Promise<number> {
  // Mapiranje vrsta sjednice na vrstu urbroja
  let vrsta: VrstaUrbroja
  if (vrstaSjednice.startsWith('skupstina')) {
    vrsta = 'skupstina'
  } else if (vrstaSjednice === 'upravni_odbor') {
    vrsta = 'uo'
  } else {
    vrsta = 'zapovjednistvo'
  }

  const prefiks = PREFIKS[vrsta]
  const pattern = `SARV-${godina}-${prefiks}/%`

  const { count, error } = await supabase
    .from('sjednice')
    .select('id', { count: 'exact', head: true })
    .like('urbroj', pattern)

  if (error) throw error
  return (count ?? 0) + 1
}
