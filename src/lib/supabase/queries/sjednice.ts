import { supabase } from '../client'
import type { Database } from '@/types/database.types'

type Sjednica = Database['public']['Tables']['sjednice']['Row']
type SjednicaInsert = Database['public']['Tables']['sjednice']['Insert']
type SjednicaUpdate = Database['public']['Tables']['sjednice']['Update']
type Tocka = Database['public']['Tables']['tocke_dnevnog_reda']['Row']
type TockaInsert = Database['public']['Tables']['tocke_dnevnog_reda']['Insert']
type TockaUpdate = Database['public']['Tables']['tocke_dnevnog_reda']['Update']
type Prisutnost = Database['public']['Tables']['sjednice_prisutni']['Row']
type PrisutnostInsert = Database['public']['Tables']['sjednice_prisutni']['Insert']
type VrstaSjednice = Database['public']['Enums']['vrsta_sjednice']
type StatusSjednice = Database['public']['Enums']['status_sjednice']

export type { Sjednica, SjednicaInsert, SjednicaUpdate, Tocka, TockaInsert, TockaUpdate, Prisutnost, VrstaSjednice, StatusSjednice }

// ── Popis sjednica ─────────────────────────────────────────

export async function dohvatiSjednice(vrsta?: VrstaSjednice | VrstaSjednice[]) {
  let query = supabase
    .from('sjednice')
    .select('*')
    .order('datum', { ascending: false })

  if (vrsta) {
    if (Array.isArray(vrsta)) {
      query = query.in('vrsta', vrsta)
    } else {
      query = query.eq('vrsta', vrsta)
    }
  }

  const { data, error } = await query
  if (error) throw error
  return data as Sjednica[]
}

// ── Detalji sjednice ───────────────────────────────────────

export async function dohvatiSjednicu(id: string) {
  const { data, error } = await supabase
    .from('sjednice')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Sjednica
}

// ── Kreiranje sjednice ─────────────────────────────────────

export async function kreirajSjednicu(sjednica: SjednicaInsert) {
  const { data, error } = await supabase
    .from('sjednice')
    .insert(sjednica)
    .select()
    .single()

  if (error) throw error
  return data as Sjednica
}

// ── Ažuriranje sjednice ────────────────────────────────────

export async function azurirajSjednicu(id: string, podaci: SjednicaUpdate) {
  const { data, error } = await supabase
    .from('sjednice')
    .update(podaci)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Sjednica
}

// ── Točke dnevnog reda ─────────────────────────────────────

export async function dohvatiTocke(sjednicaId: string) {
  const { data, error } = await supabase
    .from('tocke_dnevnog_reda')
    .select('*')
    .eq('sjednica_id', sjednicaId)
    .order('redni_broj', { ascending: true })

  if (error) throw error
  return data as Tocka[]
}

export async function spremiTocku(tocka: TockaInsert) {
  const { data, error } = await supabase
    .from('tocke_dnevnog_reda')
    .upsert(tocka, { onConflict: 'sjednica_id,redni_broj' })
    .select()
    .single()

  if (error) throw error
  return data as Tocka
}

export async function azurirajTocku(id: string, podaci: TockaUpdate) {
  const { data, error } = await supabase
    .from('tocke_dnevnog_reda')
    .update(podaci)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Tocka
}

export async function obrisiTocku(id: string) {
  const { error } = await supabase
    .from('tocke_dnevnog_reda')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ── Prisutnost ─────────────────────────────────────────────

export async function dohvatiPrisutnost(sjednicaId: string) {
  const { data, error } = await supabase
    .from('sjednice_prisutni')
    .select('*')
    .eq('sjednica_id', sjednicaId)

  if (error) throw error
  return data as Prisutnost[]
}

export async function spremiPrisutnost(prisutnost: PrisutnostInsert) {
  const { data, error } = await supabase
    .from('sjednice_prisutni')
    .upsert(prisutnost, { onConflict: 'sjednica_id,clan_id' })
    .select()
    .single()

  if (error) throw error
  return data as Prisutnost
}

export async function obrisiPrisutnost(sjednicaId: string, clanId: string) {
  const { error } = await supabase
    .from('sjednice_prisutni')
    .delete()
    .eq('sjednica_id', sjednicaId)
    .eq('clan_id', clanId)

  if (error) throw error
}
