import { supabase } from '../client'
import type { Database } from '@/types/database.types'

type ZdravstveniPregled = Database['public']['Tables']['zdravstveni_pregledi']['Row']

export type { ZdravstveniPregled }

export interface ClanZdravlje {
  clan_id: string
  ime: string
  prezime: string
  zadnji_pregled: string | null
  sljedeci_pregled: string | null
  rezultat: string | null
  dani_do_isteka: number | null
}

/**
 * Dohvaća članove koji trebaju zdravstveni pregled u sljedećih N dana.
 * Vraća sortirano po hitnosti (najhitniji prvi).
 */
export async function dohvatiClanoveSPregledom(danaUnaprijed: number = 90): Promise<ClanZdravlje[]> {
  // Dohvati sve aktivne operativne članove
  const { data: clanovi, error: clanoviError } = await supabase
    .from('clanovi')
    .select('id, ime, prezime')
    .eq('status', 'aktivan')
    .eq('kategorija', 'dobrovoljni_vatrogasac')
    .order('prezime')

  if (clanoviError) throw clanoviError
  if (!clanovi || clanovi.length === 0) return []

  // Dohvati zadnje preglede za sve članove
  const { data: pregledi, error: preglediError } = await supabase
    .from('zdravstveni_pregledi')
    .select('clan_id, datum_pregleda, datum_sljedeceg, rezultat')
    .order('datum_pregleda', { ascending: false })

  if (preglediError) throw preglediError

  const danas = new Date()

  // Grupiraj preglede po članu (samo zadnji)
  const zadnjiPregled: Record<string, { datum: string; sljedeci: string | null; rezultat: string | null }> = {}
  if (pregledi) {
    pregledi.forEach(p => {
      if (!zadnjiPregled[p.clan_id]) {
        zadnjiPregled[p.clan_id] = {
          datum: p.datum_pregleda,
          sljedeci: p.datum_sljedeceg,
          rezultat: p.rezultat,
        }
      }
    })
  }

  // Mapiraj
  const rezultat: ClanZdravlje[] = clanovi.map(c => {
    const pregled = zadnjiPregled[c.id]
    let daniDoIsteka: number | null = null

    if (pregled?.sljedeci) {
      daniDoIsteka = Math.ceil((new Date(pregled.sljedeci).getTime() - danas.getTime()) / 86400000)
    } else if (pregled?.datum) {
      // Ako nema datum_sljedeceg, pretpostavi 12 mjeseci od zadnjeg
      const istek = new Date(pregled.datum)
      istek.setFullYear(istek.getFullYear() + 1)
      daniDoIsteka = Math.ceil((istek.getTime() - danas.getTime()) / 86400000)
    }

    return {
      clan_id: c.id,
      ime: c.ime,
      prezime: c.prezime,
      zadnji_pregled: pregled?.datum || null,
      sljedeci_pregled: pregled?.sljedeci || null,
      rezultat: pregled?.rezultat || null,
      dani_do_isteka: daniDoIsteka,
    }
  })

  // Filtriraj i sortiraj
  return rezultat
    .filter(c => c.dani_do_isteka === null || c.dani_do_isteka <= danaUnaprijed)
    .sort((a, b) => (a.dani_do_isteka ?? -999) - (b.dani_do_isteka ?? -999))
}
