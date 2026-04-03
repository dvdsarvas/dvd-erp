import { supabase } from '../client'
import type { Database } from '@/types/database.types'

type Dokument = Database['public']['Tables']['dokumenti']['Row']
type DokumentInsert = Database['public']['Tables']['dokumenti']['Insert']

export type { Dokument, DokumentInsert }

export async function dohvatiDokumente(modul?: string) {
  let query = supabase.from('dokumenti').select('*').order('created_at', { ascending: false })
  if (modul) query = query.eq('modul', modul)
  const { data, error } = await query
  if (error) throw error
  return data as Dokument[]
}

export async function kreirajDokument(dok: DokumentInsert) {
  const { data, error } = await supabase.from('dokumenti').insert(dok).select().single()
  if (error) throw error
  return data as Dokument
}

export async function obrisiDokument(id: string) {
  const { error } = await supabase.from('dokumenti').delete().eq('id', id)
  if (error) throw error
}

export async function uploadDatoteke(file: File, path: string): Promise<string> {
  const { error } = await supabase.storage.from('dokumenti').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('dokumenti').getPublicUrl(path)
  return data.publicUrl
}
