import { supabase } from '../client'

export interface ZakonskiSadrzaj {
  id: string
  kategorija: 'financije' | 'clanstvo' | 'sjednice' | 'osnivac' | 'vatrogastvo' | 'imovina' | 'nabava'
  naslov: string
  sadrzaj: string
  rok_opis: string
  izvor_zakon: string
  vaznost: 'hitno' | 'vazno' | 'normalno' | 'info'
  redni_broj: number
  aktivan: boolean
  updated_at: string
  updated_by: string | null
}

export const KATEGORIJE_ZAKON = [
  { value: 'financije',    label: 'Financije i računovodstvo' },
  { value: 'sjednice',     label: 'Sjednice i skupštine' },
  { value: 'clanstvo',     label: 'Članstvo' },
  { value: 'osnivac',      label: 'Osnivač i registri' },
  { value: 'vatrogastvo',  label: 'Vatrogasna djelatnost' },
  { value: 'imovina',      label: 'Imovina i vozila' },
  { value: 'nabava',       label: 'Nabava' },
] as const

export async function dohvatiZakonskiSadrzaj(
  kategorija?: string
): Promise<ZakonskiSadrzaj[]> {
  let query = supabase
    .from('zakonski_sadrzaj' as any)
    .select('*')
    .eq('aktivan', true)
    .order('redni_broj')
  if (kategorija) {
    query = query.eq('kategorija', kategorija)
  }
  const { data, error } = await query
  if (error) throw error
  return data as unknown as ZakonskiSadrzaj[]
}

export async function azurirajZakonskiSadrzaj(
  id: string,
  podaci: Partial<Pick<ZakonskiSadrzaj, 'naslov' | 'sadrzaj' | 'rok_opis' | 'izvor_zakon' | 'vaznost' | 'redni_broj' | 'aktivan'>>,
  updatedBy: string
): Promise<ZakonskiSadrzaj> {
  const { data, error } = await supabase
    .from('zakonski_sadrzaj' as any)
    .update({ ...podaci, updated_by: updatedBy })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as unknown as ZakonskiSadrzaj
}

export async function kreirajZakonskiSadrzaj(
  podaci: Omit<ZakonskiSadrzaj, 'id' | 'aktivan' | 'updated_at' | 'updated_by'>,
  updatedBy: string
): Promise<ZakonskiSadrzaj> {
  const { data, error } = await supabase
    .from('zakonski_sadrzaj' as any)
    .insert({ ...podaci, aktivan: true, updated_by: updatedBy })
    .select()
    .single()
  if (error) throw error
  return data as unknown as ZakonskiSadrzaj
}

export async function obrisiZakonskiSadrzaj(id: string): Promise<void> {
  // Soft delete — nikad ne brišemo, samo deaktiviramo
  const { error } = await supabase
    .from('zakonski_sadrzaj' as any)
    .update({ aktivan: false })
    .eq('id', id)
  if (error) throw error
}
