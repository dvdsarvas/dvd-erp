import { supabase } from '../client'

// Tip — ručno jer nova tablica nije u database.types.ts dok se ne regen
export interface DVDOrganizacija {
  id: string
  naziv: string
  naziv_kratki: string
  oib: string
  maticni_broj: string
  rbr_rno: string
  adresa: string
  mjesto: string
  postanski_broj: string
  email: string
  web: string
  telefon: string
  iban: string
  banka: string
  knjig_prag: 'jednostavno' | 'dvojno'
  vatrogasna_zajednica: string
  zupanijska_zajednica: string
  hvz_region: string
  logo_url: string
  boja_akcentna: string
  datum_osnivanja: string | null
  updated_at: string
}

export interface TrenutniFlunkcioneri {
  organizacija_id: string
  naziv_kratki: string
  predsjednik: string | null
  zamjenik_predsjednika: string | null
  zapovjednik: string | null
  zamjenik_zapovjednika: string | null
  tajnik: string | null
  blagajnik: string | null
  predsjednik_mobitel: string | null
  predsjednik_email: string | null
  zapovjednik_mobitel: string | null
  tajnik_email: string | null
}

export async function dohvatiOrganizaciju(): Promise<DVDOrganizacija | null> {
  const { data, error } = await supabase
    .from('dvd_organizacija' as any)
    .select('*')
    .single()
  if (error) {
    // Tablica postoji ali nema zapisa — onboarding nije završen
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as unknown as DVDOrganizacija
}

export async function azurirajOrganizaciju(
  id: string,
  podaci: Partial<Omit<DVDOrganizacija, 'id' | 'created_at' | 'updated_at'>>
): Promise<DVDOrganizacija> {
  const { data, error } = await supabase
    .from('dvd_organizacija' as any)
    .update(podaci)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as unknown as DVDOrganizacija
}

export async function dohvatiFunkcionere(): Promise<TrenutniFlunkcioneri | null> {
  const { data, error } = await supabase
    .from('trenutni_funkcioneri' as any)
    .select('*')
    .single()
  if (error) return null
  return data as unknown as TrenutniFlunkcioneri
}
