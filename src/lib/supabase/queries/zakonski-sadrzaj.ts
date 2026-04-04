import { supabase } from '../client'
import type { Database } from '@/types/database.types'

type ZakonskiSadrzajRow = Database['public']['Tables']['zakonski_sadrzaj']['Row']

export type KategorijaZakon = 'financije' | 'clanstvo' | 'sjednice' | 'osnivac' | 'vatrogastvo' | 'imovina' | 'nabava'
export type VaznostZakon = 'hitno' | 'vazno' | 'normalno' | 'info'

// App-level tip s uzim literalima (database koristi CHECK constraint pa je string u generiranom tipu)
export interface ZakonskiSadrzaj extends Omit<ZakonskiSadrzajRow, 'kategorija' | 'vaznost' | 'aktivan' | 'redni_broj' | 'rok_opis' | 'izvor_zakon' | 'updated_at'> {
  kategorija: KategorijaZakon
  vaznost: VaznostZakon
  rok_opis: string
  izvor_zakon: string
  vaznost_orig?: string
  redni_broj: number
  aktivan: boolean
  updated_at: string
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

function mapRow(r: ZakonskiSadrzajRow): ZakonskiSadrzaj {
  return {
    ...r,
    kategorija: r.kategorija as KategorijaZakon,
    vaznost: r.vaznost as VaznostZakon,
    rok_opis: r.rok_opis ?? '',
    izvor_zakon: r.izvor_zakon ?? '',
    redni_broj: r.redni_broj ?? 0,
    aktivan: r.aktivan ?? true,
    updated_at: r.updated_at ?? '',
  }
}

export async function dohvatiZakonskiSadrzaj(
  kategorija?: string
): Promise<ZakonskiSadrzaj[]> {
  let query = supabase
    .from('zakonski_sadrzaj')
    .select('*')
    .eq('aktivan', true)
    .order('redni_broj')
  if (kategorija) {
    query = query.eq('kategorija', kategorija)
  }
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(mapRow)
}

export async function azurirajZakonskiSadrzaj(
  id: string,
  podaci: Partial<Pick<ZakonskiSadrzaj, 'naslov' | 'sadrzaj' | 'rok_opis' | 'izvor_zakon' | 'vaznost' | 'redni_broj' | 'aktivan'>>,
  updatedBy: string
): Promise<ZakonskiSadrzaj> {
  const { data, error } = await supabase
    .from('zakonski_sadrzaj')
    .update({ ...podaci, updated_by: updatedBy })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapRow(data)
}

export async function kreirajZakonskiSadrzaj(
  podaci: Omit<ZakonskiSadrzaj, 'id' | 'aktivan' | 'updated_at' | 'updated_by' | 'created_at'>,
  updatedBy: string
): Promise<ZakonskiSadrzaj> {
  const { data, error } = await supabase
    .from('zakonski_sadrzaj')
    .insert({ ...podaci, aktivan: true, updated_by: updatedBy })
    .select()
    .single()
  if (error) throw error
  return mapRow(data)
}

export async function obrisiZakonskiSadrzaj(id: string): Promise<void> {
  // Soft delete — nikad ne brišemo, samo deaktiviramo
  const { error } = await supabase
    .from('zakonski_sadrzaj')
    .update({ aktivan: false })
    .eq('id', id)
  if (error) throw error
}
