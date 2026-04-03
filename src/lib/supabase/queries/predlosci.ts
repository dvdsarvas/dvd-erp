import { supabase } from '../client'
import type { Database } from '@/types/database.types'

type PredlozakPlanRada = Database['public']['Tables']['predlosci_plan_rada']['Row']
type PredlozakFinPlan = Database['public']['Tables']['predlosci_fin_plan']['Row']

export type { PredlozakPlanRada, PredlozakFinPlan }

// ── Predlošci plana rada ───────────────────────────────────

export async function dohvatiPredloskePlanRada() {
  const { data, error } = await supabase
    .from('predlosci_plan_rada')
    .select('*')
    .eq('aktivan', true)
    .order('redni_broj')
  if (error) throw error
  return data as PredlozakPlanRada[]
}

/**
 * Generira plan rada za zadanu godinu iz predložaka.
 * Kopira sve aktivne predloške u aktivnosti_plan_rada.
 * Vraća broj kreiranih aktivnosti.
 */
export async function generirajPlanRada(godina: number): Promise<number> {
  const predlosci = await dohvatiPredloskePlanRada()

  const aktivnosti = predlosci.map(p => ({
    naziv: p.naziv,
    kategorija: p.kategorija,
    napomena: p.opis,
    godina,
    status: 'planirano',
    rok: p.mjesec_rok ? `${godina}-${String(p.mjesec_rok).padStart(2, '0')}` : null,
    rok_datum: p.mjesec_rok ? `${godina}-${String(p.mjesec_rok).padStart(2, '0')}-28` : null,
  }))

  const { error } = await supabase.from('aktivnosti_plan_rada').insert(aktivnosti)
  if (error) throw error
  return aktivnosti.length
}

// ── Predlošci financijskog plana ───────────────────────────

export async function dohvatiPredloskeFinPlan() {
  const { data, error } = await supabase
    .from('predlosci_fin_plan')
    .select('*')
    .eq('aktivan', true)
    .order('redni_broj')
  if (error) throw error
  return data as PredlozakFinPlan[]
}

/**
 * Generira financijski plan za zadanu godinu iz predložaka.
 * 1. Kreira novi financijski_planovi red
 * 2. Kopira sve predloške u financijski_plan_stavke s iznosima iz prošle godine
 * Vraća ID novog plana.
 */
export async function generirajFinancijskiPlan(godina: number): Promise<string> {
  // Provjeri postoji li već plan za tu godinu
  const { data: postojeci } = await supabase
    .from('financijski_planovi')
    .select('id')
    .eq('godina', godina)
    .maybeSingle()

  if (postojeci) {
    throw new Error(`Financijski plan za ${godina}. već postoji. Obrišite ga prvo ako želite regenerirati.`)
  }

  // Dohvati predloške
  const predlosci = await dohvatiPredloskeFinPlan()
  if (predlosci.length === 0) {
    throw new Error('Nema predložaka financijskog plana. Pokrenite migraciju 005_predlosci.sql.')
  }

  // Pokušaj dohvatiti iznose iz prošle godine
  const proslogodisnji: Record<string, number> = {}
  const { data: prosliPlan } = await supabase
    .from('financijski_planovi')
    .select('id')
    .eq('godina', godina - 1)
    .maybeSingle()

  if (prosliPlan) {
    const { data: prosleStavke } = await supabase
      .from('financijski_plan_stavke')
      .select('racunski_plan_konto, iznos_plan')
      .eq('plan_id', prosliPlan.id)

    if (prosleStavke) {
      prosleStavke.forEach(s => {
        if (s.racunski_plan_konto) {
          proslogodisnji[s.racunski_plan_konto] = s.iznos_plan || 0
        }
      })
    }
  }

  // Kreiraj plan
  const { data: plan, error: planError } = await supabase
    .from('financijski_planovi')
    .insert({ godina, status: 'prijedlog', verzija: '1.0' })
    .select()
    .single()
  if (planError) {
    throw new Error(`Greška pri kreiranju plana: ${planError.message}`)
  }

  // Kreiraj stavke — filtriraj samo prihod/rashod (CHECK constraint)
  const stavke = predlosci
    .filter(p => p.kategorija === 'prihod' || p.kategorija === 'rashod')
    .map((p, i) => ({
      plan_id: plan.id,
      naziv_stavke: p.naziv_stavke,
      kategorija: p.kategorija,
      racunski_plan_konto: p.konto,
      redni_broj: p.redni_broj || i + 1,
      iznos_plan: proslogodisnji[p.konto] ?? p.zadnji_iznos ?? 0,
      iznos_ostvareno: 0,
    }))

  const { error: stavkeError } = await supabase.from('financijski_plan_stavke').insert(stavke)
  if (stavkeError) {
    // Rollback — obriši plan ako stavke ne uspiju
    await supabase.from('financijski_planovi').delete().eq('id', plan.id)
    throw new Error(`Greška pri kreiranju stavki: ${stavkeError.message}`)
  }

  return plan.id
}
