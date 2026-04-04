import { supabase } from '../client'
import type { Database } from '@/types/database.types'

export type DVDOrganizacija = Database['public']['Tables']['dvd_organizacija']['Row']
export type DVDOrganizacijaUpdate = Database['public']['Tables']['dvd_organizacija']['Update']
export type TrenutniFlunkcioneri = Database['public']['Views']['trenutni_funkcioneri']['Row']

export async function dohvatiOrganizaciju(): Promise<DVDOrganizacija | null> {
  const { data, error } = await supabase
    .from('dvd_organizacija')
    .select('*')
    .single()
  if (error) {
    // Tablica postoji ali nema zapisa — onboarding nije završen
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export async function azurirajOrganizaciju(
  id: string,
  podaci: DVDOrganizacijaUpdate
): Promise<DVDOrganizacija> {
  const { data, error } = await supabase
    .from('dvd_organizacija')
    .update(podaci)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function dohvatiFunkcionere(): Promise<TrenutniFlunkcioneri | null> {
  const { data, error } = await supabase
    .from('trenutni_funkcioneri')
    .select('*')
    .single()
  if (error) return null
  return data
}
