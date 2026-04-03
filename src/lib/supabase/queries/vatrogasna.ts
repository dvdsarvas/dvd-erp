import { supabase } from '../client'
import type { Database } from '@/types/database.types'

type Intervencija = Database['public']['Tables']['intervencije']['Row']
type IntervencijaInsert = Database['public']['Tables']['intervencije']['Insert']
type Sudionik = Database['public']['Tables']['intervencije_sudionici']['Row']
type Vjezba = Database['public']['Tables']['vjezbe']['Row']
type VjezbaInsert = Database['public']['Tables']['vjezbe']['Insert']

export type { Intervencija, IntervencijaInsert, Sudionik, Vjezba, VjezbaInsert }

// ── Intervencije ───────────────────────────────────────────

export async function dohvatiIntervencije(godina?: number) {
  let query = supabase.from('intervencije').select('*').order('datum_dojave', { ascending: false })
  if (godina) {
    query = query.gte('datum_dojave', `${godina}-01-01`).lte('datum_dojave', `${godina}-12-31`)
  }
  const { data, error } = await query
  if (error) throw error
  return data as Intervencija[]
}

export async function kreirajIntervenciju(inter: IntervencijaInsert) {
  const { data, error } = await supabase.from('intervencije').insert(inter).select().single()
  if (error) throw error
  return data as Intervencija
}

export async function dohvatiSudionike(intervencijaId: string) {
  const { data, error } = await supabase.from('intervencije_sudionici').select('*, clanovi(ime, prezime)').eq('intervencija_id', intervencijaId)
  if (error) throw error
  return data
}

// ── Vježbe ─────────────────────────────────────────────────

export async function dohvatiVjezbe(godina?: number) {
  let query = supabase.from('vjezbe').select('*').order('datum', { ascending: false })
  if (godina) {
    query = query.gte('datum', `${godina}-01-01`).lte('datum', `${godina}-12-31`)
  }
  const { data, error } = await query
  if (error) throw error
  return data as Vjezba[]
}

export async function kreirajVjezbu(vjezba: VjezbaInsert) {
  const { data, error } = await supabase.from('vjezbe').insert(vjezba).select().single()
  if (error) throw error
  return data as Vjezba
}
