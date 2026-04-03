import { supabase } from '../client'
import type { Database } from '@/types/database.types'

type Imovina = Database['public']['Tables']['imovina']['Row']
type ImovinaInsert = Database['public']['Tables']['imovina']['Insert']
type ImovinaUpdate = Database['public']['Tables']['imovina']['Update']
type ServisniZapis = Database['public']['Tables']['servisni_zapisi']['Row']
type ServisniZapisInsert = Database['public']['Tables']['servisni_zapisi']['Insert']

export type { Imovina, ImovinaInsert, ImovinaUpdate, ServisniZapis }

export async function dohvatiImovinu(vrsta?: string) {
  let query = supabase.from('imovina').select('*').order('naziv')
  if (vrsta) query = query.eq('vrsta', vrsta)
  const { data, error } = await query
  if (error) throw error
  return data as Imovina[]
}

export async function dohvatiImovinuById(id: string) {
  const { data, error } = await supabase.from('imovina').select('*').eq('id', id).single()
  if (error) throw error
  return data as Imovina
}

export async function kreirajImovinu(imovina: ImovinaInsert) {
  const { data, error } = await supabase.from('imovina').insert(imovina).select().single()
  if (error) throw error
  return data as Imovina
}

export async function azurirajImovinu(id: string, podaci: ImovinaUpdate) {
  const { data, error } = await supabase.from('imovina').update(podaci).eq('id', id).select().single()
  if (error) throw error
  return data as Imovina
}

export async function obrisiImovinu(id: string) {
  const { error } = await supabase.from('imovina').delete().eq('id', id)
  if (error) throw error
}

export async function dohvatiServise(imovinaId: string) {
  const { data, error } = await supabase.from('servisni_zapisi').select('*').eq('imovina_id', imovinaId).order('datum', { ascending: false })
  if (error) throw error
  return data as ServisniZapis[]
}

export async function kreirajServis(servis: ServisniZapisInsert) {
  const { data, error } = await supabase.from('servisni_zapisi').insert(servis).select().single()
  if (error) throw error
  return data as ServisniZapis
}
