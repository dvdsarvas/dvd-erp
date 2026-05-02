import { supabase } from '../client'
import type { Database } from '@/types/database.types'

type Korisnik = Database['public']['Tables']['korisnici']['Row']
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
 * Kreira novog korisnika atomarno u auth.users + korisnici tablici
 * preko Edge Function `kreiraj-korisnika` (koristi service_role key).
 * Ne mijenja sesiju trenutnog korisnika i radi rollback ako insert padne.
 */
export async function kreirajKorisnika(podaci: { email: string; ime: string; prezime: string; uloga: string; lozinka: string }) {
  const { data, error } = await supabase.functions.invoke('kreiraj-korisnika', {
    body: podaci,
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data.korisnik as Korisnik
}

export async function deaktivirajKorisnika(id: string) {
  return azurirajKorisnika(id, { aktivan: false })
}

export async function aktivirajKorisnika(id: string) {
  return azurirajKorisnika(id, { aktivan: true })
}
