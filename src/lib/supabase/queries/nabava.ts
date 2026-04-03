import { supabase } from '../client'
import type { Database } from '@/types/database.types'

type Nabava = Database['public']['Tables']['nabave']['Row']
type NabavaInsert = Database['public']['Tables']['nabave']['Insert']
type NabavaUpdate = Database['public']['Tables']['nabave']['Update']

export type { Nabava, NabavaInsert, NabavaUpdate }

export async function dohvatiNabave() {
  const { data, error } = await supabase
    .from('nabave')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Nabava[]
}

export async function kreirajNabavu(nabava: NabavaInsert) {
  const { data, error } = await supabase.from('nabave').insert(nabava).select().single()
  if (error) throw error
  return data as Nabava
}

export async function azurirajNabavu(id: string, podaci: NabavaUpdate) {
  const { data, error } = await supabase.from('nabave').update(podaci).eq('id', id).select().single()
  if (error) throw error
  return data as Nabava
}
