import { supabase } from '../client'
import type { Database } from '@/types/database.types'

type Aktivnost = Database['public']['Tables']['aktivnosti_plan_rada']['Row']
type AktivnostInsert = Database['public']['Tables']['aktivnosti_plan_rada']['Insert']
type AktivnostUpdate = Database['public']['Tables']['aktivnosti_plan_rada']['Update']

export type { Aktivnost, AktivnostInsert, AktivnostUpdate }

export async function dohvatiAktivnosti(godina?: number) {
  let query = supabase
    .from('aktivnosti_plan_rada')
    .select('*')
    .order('kategorija')
    .order('rok_datum', { ascending: true, nullsFirst: false })

  if (godina) query = query.eq('godina', godina)

  const { data, error } = await query
  if (error) throw error
  return data as Aktivnost[]
}

export async function kreirajAktivnost(aktivnost: AktivnostInsert) {
  const { data, error } = await supabase
    .from('aktivnosti_plan_rada')
    .insert(aktivnost)
    .select()
    .single()
  if (error) throw error
  return data as Aktivnost
}

export async function azurirajAktivnost(id: string, podaci: AktivnostUpdate) {
  const { data, error } = await supabase
    .from('aktivnosti_plan_rada')
    .update(podaci)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Aktivnost
}

export async function obrisiAktivnost(id: string) {
  const { error } = await supabase.from('aktivnosti_plan_rada').delete().eq('id', id)
  if (error) throw error
}
