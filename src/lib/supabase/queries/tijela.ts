import { supabase } from '../client'
import type { Database } from '@/types/database.types'
import type { Clan } from './clanovi'

type TijeloClan = Database['public']['Tables']['tijela_dvd']['Row']

export type { TijeloClan }

export interface ClanTijela {
  id: string
  vrsta: string
  funkcija: string
  datum_od: string
  clan_id: string
  // Joined from clanovi
  ime: string
  prezime: string
  mobitel: string | null
  email: string | null
}

type VrstaTijela = 'upravni_odbor' | 'zapovjednistvo'

// ── Dohvati članove tijela ─────────────────────────────────

export async function dohvatiClanoveTijela(vrsta: VrstaTijela): Promise<ClanTijela[]> {
  const { data, error } = await supabase
    .from('tijela_dvd')
    .select(`
      id, vrsta, funkcija, datum_od, clan_id,
      clanovi!inner(ime, prezime, mobitel, email)
    `)
    .eq('vrsta', vrsta)
    .eq('aktivan', true)
    .order('funkcija', { ascending: true })

  if (error) throw error

  return (data as any[]).map(row => ({
    id: row.id,
    vrsta: row.vrsta,
    funkcija: row.funkcija,
    datum_od: row.datum_od,
    clan_id: row.clan_id,
    ime: row.clanovi.ime,
    prezime: row.clanovi.prezime,
    mobitel: row.clanovi.mobitel,
    email: row.clanovi.email,
  }))
}

// ── Dodaj člana u tijelo ───────────────────────────────────

export async function dodajClanaTijela(vrsta: VrstaTijela, clanId: string, funkcija: string) {
  const { data, error } = await supabase
    .from('tijela_dvd')
    .insert({
      vrsta,
      clan_id: clanId,
      funkcija,
      aktivan: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Ukloni člana iz tijela ─────────────────────────────────

export async function ukloniClanaTijela(id: string) {
  const { error } = await supabase
    .from('tijela_dvd')
    .update({ aktivan: false, datum_do: new Date().toISOString().split('T')[0] })
    .eq('id', id)

  if (error) throw error
}

// ── Dohvati članove za sjednicu (prema vrsti) ──────────────

export async function dohvatiClanoveZaSjednicu(vrstaSjednice: string): Promise<Clan[]> {
  if (vrstaSjednice.startsWith('skupstina')) {
    // Skupština: svi aktivni članovi s pravom glasa
    const { data, error } = await supabase
      .from('clanovi')
      .select('*')
      .eq('status', 'aktivan')
      .order('prezime')

    if (error) throw error
    return data as Clan[]
  }

  // UO ili Zapovjedništvo: samo članovi tijela
  const vrsta: VrstaTijela = vrstaSjednice === 'upravni_odbor' ? 'upravni_odbor' : 'zapovjednistvo'

  const { data, error } = await supabase
    .from('tijela_dvd')
    .select(`
      clan_id,
      clanovi!inner(*)
    `)
    .eq('vrsta', vrsta)
    .eq('aktivan', true)

  if (error) throw error

  // Za zapovjedništvo: dodaj predsjednika ako nije već u listi (čl. 44 Statuta)
  const clanovi = (data as any[]).map(row => row.clanovi as Clan)

  if (vrsta === 'zapovjednistvo') {
    const { data: predsjednikData } = await supabase
      .from('tijela_dvd')
      .select('clan_id, clanovi!inner(*)')
      .eq('vrsta', 'upravni_odbor')
      .eq('funkcija', 'predsjednik')
      .eq('aktivan', true)
      .limit(1)

    if (predsjednikData && predsjednikData.length > 0) {
      const predsjednik = (predsjednikData[0] as any).clanovi as Clan
      if (!clanovi.find(c => c.id === predsjednik.id)) {
        clanovi.push(predsjednik)
      }
    }
  }

  return clanovi.sort((a, b) => a.prezime.localeCompare(b.prezime))
}
