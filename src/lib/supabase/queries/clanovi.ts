import { supabase } from '../client'
import type { Database } from '@/types/database.types'

type Clan = Database['public']['Tables']['clanovi']['Row']
type ClanInsert = Database['public']['Tables']['clanovi']['Insert']
type ClanUpdate = Database['public']['Tables']['clanovi']['Update']
type Clanarina = Database['public']['Tables']['clanarine']['Row']
type ClanarinaInsert = Database['public']['Tables']['clanarine']['Insert']
type Certifikat = Database['public']['Tables']['certifikati_osposobljavanje']['Row']
type ZdravstveniPregled = Database['public']['Tables']['zdravstveni_pregledi']['Row']

export type { Clan, ClanInsert, ClanUpdate, Clanarina, ClanarinaInsert, Certifikat, ZdravstveniPregled }

export interface ClanFilter {
  kategorija?: string
  status?: string
  zvanje?: string
  clanarineGodina?: number
  clanarineStatus?: 'placeno' | 'neplaceno'
  pretraga?: string
}

// ── Popis članova ──────────────────────────────────────────

export async function dohvatiClanove(filtri?: ClanFilter) {
  let query = supabase
    .from('clanovi')
    .select('id, ime, prezime, kategorija, status, vatrogasno_zvanje, mobitel, oib, datum_uclanivanja')
    .order('prezime', { ascending: true })

  if (filtri?.kategorija) {
    query = query.eq('kategorija', filtri.kategorija as Database['public']['Enums']['kategorija_clana'])
  }
  if (filtri?.status) {
    query = query.eq('status', filtri.status as Database['public']['Enums']['status_clana'])
  }
  if (filtri?.zvanje) {
    query = query.eq('vatrogasno_zvanje', filtri.zvanje)
  }
  if (filtri?.pretraga) {
    query = query.or(`ime.ilike.%${filtri.pretraga}%,prezime.ilike.%${filtri.pretraga}%,oib.ilike.%${filtri.pretraga}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Clan[]
}

// ── Detalji člana ──────────────────────────────────────────

export async function dohvatiClana(id: string) {
  const { data, error } = await supabase
    .from('clanovi')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Clan
}

// ── Kreiranje člana ────────────────────────────────────────

export async function kreirajClana(clan: ClanInsert) {
  const { data, error } = await supabase
    .from('clanovi')
    .insert(clan)
    .select()
    .single()

  if (error) throw error
  return data as Clan
}

// ── Ažuriranje člana ───────────────────────────────────────

export async function azurirajClana(id: string, podaci: ClanUpdate) {
  const { data, error } = await supabase
    .from('clanovi')
    .update(podaci)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Clan
}

// ── Članarine ──────────────────────────────────────────────

export async function dohvatiClanarine(clanId: string) {
  const { data, error } = await supabase
    .from('clanarine')
    .select('*')
    .eq('clan_id', clanId)
    .order('godina', { ascending: false })

  if (error) throw error
  return data as Clanarina[]
}

export async function dohvatiClanarineZaGodinu(godina: number) {
  const { data, error } = await supabase
    .from('clanarine')
    .select('clan_id, datum_placanja')
    .eq('godina', godina)

  if (error) throw error
  return data
}

export async function upisClanarine(clanarina: ClanarinaInsert) {
  const { data, error } = await supabase
    .from('clanarine')
    .upsert(clanarina, { onConflict: 'clan_id,godina' })
    .select()
    .single()

  if (error) throw error
  return data as Clanarina
}

// ── Certifikati ────────────────────────────────────────────

export async function dohvatiCertifikate(clanId: string) {
  const { data, error } = await supabase
    .from('certifikati_osposobljavanje')
    .select('*')
    .eq('clan_id', clanId)
    .order('datum_stjecanja', { ascending: false })

  if (error) throw error
  return data as Certifikat[]
}

// ── Zdravstveni pregledi ───────────────────────────────────

export async function dohvatiZdravstvenePreglede(clanId: string) {
  const { data, error } = await supabase
    .from('zdravstveni_pregledi')
    .select('*')
    .eq('clan_id', clanId)
    .order('datum_pregleda', { ascending: false })

  if (error) throw error
  return data as ZdravstveniPregled[]
}
