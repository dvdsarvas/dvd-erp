import { supabase } from '../client'
import type { Database } from '@/types/database.types'

type FinPlan = Database['public']['Tables']['financijski_planovi']['Row']
type FinStavka = Database['public']['Tables']['financijski_plan_stavke']['Row']
type FinStavkaUpdate = Database['public']['Tables']['financijski_plan_stavke']['Update']
type Racun = Database['public']['Tables']['racuni']['Row']
type RacunInsert = Database['public']['Tables']['racuni']['Insert']
type RacunUpdate = Database['public']['Tables']['racuni']['Update']

export type { FinPlan, FinStavka, Racun, RacunInsert, RacunUpdate }

// ── Financijski plan ───────────────────────────────────────

export async function dohvatiFinPlan(godina: number) {
  const { data, error } = await supabase
    .from('financijski_planovi')
    .select('*')
    .eq('godina', godina)
    .maybeSingle()
  if (error) throw error
  return data as FinPlan | null
}

export async function dohvatiStavkePlana(planId: string) {
  const { data, error } = await supabase
    .from('financijski_plan_stavke')
    .select('*')
    .eq('plan_id', planId)
    .order('redni_broj')
  if (error) throw error
  return data as FinStavka[]
}

export async function azurirajStavku(id: string, podaci: FinStavkaUpdate) {
  const { data, error } = await supabase
    .from('financijski_plan_stavke')
    .update(podaci)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as FinStavka
}

// ── Računi ─────────────────────────────────────────────────

export async function dohvatiRacune(godina?: number, status?: string) {
  let query = supabase
    .from('racuni')
    .select('*')
    .order('datum_racuna', { ascending: false })

  if (godina) {
    query = query.gte('datum_racuna', `${godina}-01-01`).lte('datum_racuna', `${godina}-12-31`)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Racun[]
}

export async function kreirajRacun(racun: RacunInsert) {
  const { data, error } = await supabase.from('racuni').insert(racun).select().single()
  if (error) throw error
  return data as Racun
}

export async function azurirajRacun(id: string, podaci: RacunUpdate) {
  const { data, error } = await supabase.from('racuni').update(podaci).eq('id', id).select().single()
  if (error) throw error
  return data as Racun
}

/**
 * Likvidacija računa — predsjednik potvrđuje račun.
 * Nakon likvidacije račun prelazi u status 'odobreno'.
 */
export async function likvidirajRacun(id: string, korisnikId: string) {
  return azurirajRacun(id, {
    status: 'odobreno',
    odobrio_id: korisnikId,
    datum_odobravanja: new Date().toISOString(),
  })
}

/**
 * Označi račun kao plaćen.
 */
export async function platiRacun(id: string, datumPlacanja?: string) {
  return azurirajRacun(id, {
    status: 'placeno',
    datum_placanja: datumPlacanja || new Date().toISOString().split('T')[0],
  })
}

// ── Upload dokumenta za račun ──────────────────────────────

export async function uploadRacunDokument(racunId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'pdf'
  const path = `racuni/${racunId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('dokumenti')
    .upload(path, file, { contentType: file.type })

  if (uploadError) throw uploadError

  // Kreiraj zapis u dokumenti tablici
  await supabase.from('dokumenti').insert({
    naziv: file.name,
    storage_path: path,
    modul: 'financije',
    racun_id: racunId,
    vrsta: ext === 'pdf' ? 'pdf' : 'ostalo',
  })

  return path
}

export async function dohvatiDokumenteRacuna(racunId: string) {
  const { data, error } = await supabase
    .from('dokumenti')
    .select('id, naziv, storage_path, created_at')
    .eq('racun_id', racunId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function dohvatiDokumentUrl(path: string): Promise<string> {
  const { data } = await supabase.storage.from('dokumenti').createSignedUrl(path, 3600) // 1h
  return data?.signedUrl || ''
}

// ── Kategorizacija računa ──────────────────────────────────

export interface DobavljacKategorija {
  naziv_stranke: string
  plan_stavka_id: string | null
  racunski_konto: string
}

/**
 * Dohvati zapamćenu kategoriju za dobavljača.
 * Poziva se kad korisnik upiše naziv stranke — automatski prijedlog.
 */
export async function dohvatiKategorijuDobavljaca(
  nazivStranke: string
): Promise<DobavljacKategorija | null> {
  const { data } = await supabase
    .from('dobavljaci_kategorije' as any)
    .select('naziv_stranke, plan_stavka_id, racunski_konto')
    .eq('naziv_stranke', nazivStranke.toLowerCase().trim())
    .maybeSingle()
  return data as unknown as DobavljacKategorija | null
}

/**
 * Dohvati stavke financijskog plana za tekuću godinu (rashodi) — za dropdown.
 */
export async function dohvatiStavkeZaKategorizaciju(godina: number) {
  const plan = await dohvatiFinPlan(godina)
  if (!plan) return []
  const { data, error } = await supabase
    .from('financijski_plan_stavke')
    .select('id, naziv_stavke, kategorija, racunski_plan_konto, iznos_plan, iznos_ostvareno')
    .eq('plan_id', plan.id)
    .eq('kategorija', 'rashod')
    .order('redni_broj')
  if (error) throw error
  return data
}

// ── Knjiga ulaznih računa (VIEW) ───────────────────────────

export interface KnjigaUlazniRacun {
  redni_broj: number
  godina: number
  interni_broj: string | null
  datum_racuna: string
  naziv_stranke: string
  opis: string | null
  iznos_ukupno: number
  status: string
  racunski_konto: string | null
  kategorija_plana: string | null
  datum_placanja: string | null
  likvidirao_ime: string | null
  datum_likvidacije: string | null
}

export async function dohvatiKnjiguUlaznihRacuna(
  godina: number
): Promise<KnjigaUlazniRacun[]> {
  const { data, error } = await supabase
    .from('knjiga_ulaznih_racuna' as any)
    .select('*')
    .eq('godina', godina)
    .order('redni_broj')
  if (error) throw error
  return data as unknown as KnjigaUlazniRacun[]
}

// ── Označi kao poslano knjigovođi ────────────────────────────

export async function oznacPoslatoKnjigov(
  racunIds: string[],
  korisnikId: string
): Promise<void> {
  const { error } = await supabase
    .from('racuni')
    .update({
      poslano_knjigov_datum: new Date().toISOString(),
      poslano_knjigov_id: korisnikId,
    } as any)
    .in('id', racunIds)
  if (error) throw error
}

// ── e-Račun konfiguracija ───────────────────────────────────

export interface EracunKonfiguracija {
  id:             string
  posrednik:      'eposlovanje' | 'moj_eracun' | 'fina'
  api_username:   string
  api_password:   string
  api_key:        string
  company_id:     string
  aktivan:        boolean
  zadnji_sync:    string | null
  zadnji_sync_br: number
  greska_zadnja:  string
}

export async function dohvatiEracunKfg(): Promise<EracunKonfiguracija | null> {
  const { data } = await supabase
    .from('eracun_konfiguracija' as any)
    .select('*')
    .single()
  return data as unknown as EracunKonfiguracija | null
}

export async function azurirajEracunKfg(
  id: string,
  podaci: Partial<EracunKonfiguracija>
): Promise<void> {
  const { error } = await supabase
    .from('eracun_konfiguracija' as any)
    .update({ ...podaci, updated_at: new Date().toISOString() } as any)
    .eq('id', id)
  if (error) throw error
}
