import { supabase } from '../client'
import type { Database } from '@/types/database.types'

type Korisnik = Database['public']['Tables']['korisnici']['Row']
type KorisnikInsert = Database['public']['Tables']['korisnici']['Insert']
type KorisnikUpdate = Database['public']['Tables']['korisnici']['Update']

export type { Korisnik, KorisnikUpdate }

export async function dohvatiKorisnike() {
  const { data, error } = await supabase
    .from('korisnici')
    .select('*')
    .order('prezime')
  if (error) throw error
  return data as Korisnik[]
}

export async function azurirajKorisnika(id: string, podaci: KorisnikUpdate) {
  const { data, error } = await supabase
    .from('korisnici')
    .update(podaci)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Korisnik
}

/**
 * Kreira novog korisnika u Auth + korisnici tablici.
 * Koristi Supabase Auth admin funkciju (zahtijeva service role za produkciju).
 * Za dev: korisnik se kreira ručno u Supabase dashboardu, ovdje samo u tablici.
 */
export async function kreirajKorisnika(podaci: { email: string; ime: string; prezime: string; uloga: string; lozinka: string }) {
  // Kreiraj Auth korisnika
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: podaci.email,
    password: podaci.lozinka,
  })
  if (authError) throw authError
  if (!authData.user) throw new Error('Korisnik nije kreiran u Auth sustavu')

  // Kreiraj zapis u korisnici tablici s istim ID-jem
  const { data, error } = await supabase
    .from('korisnici')
    .insert({
      id: authData.user.id,
      email: podaci.email,
      ime: podaci.ime,
      prezime: podaci.prezime,
      uloga: podaci.uloga as KorisnikInsert['uloga'],
      aktivan: true,
    })
    .select()
    .single()
  if (error) throw error
  return data as Korisnik
}

export async function deaktivirajKorisnika(id: string) {
  return azurirajKorisnika(id, { aktivan: false })
}

export async function aktivirajKorisnika(id: string) {
  return azurirajKorisnika(id, { aktivan: true })
}
