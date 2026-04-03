import { supabase } from '../client'
import type { Database } from '@/types/database.types'

type Izvjesce = Database['public']['Tables']['zakonska_izvjesca']['Row']
type IzvjesceUpdate = Database['public']['Tables']['zakonska_izvjesca']['Update']

export type { Izvjesce }

export async function dohvatiIzvjesca(godina?: number) {
  let query = supabase
    .from('zakonska_izvjesca')
    .select('*')
    .order('rok', { ascending: true })

  if (godina) query = query.eq('godina', godina)

  const { data, error } = await query
  if (error) throw error
  return data as Izvjesce[]
}

export async function azurirajIzvjesce(id: string, podaci: IzvjesceUpdate) {
  const { data, error } = await supabase
    .from('zakonska_izvjesca')
    .update(podaci)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Izvjesce
}

/**
 * Generira standardne zakonske obveze za zadanu godinu.
 * Kreira 8 tipičnih obveza s rokovima prema zakonima.
 */
export async function generirajObvezeZaGodinu(godina: number): Promise<number> {
  // Provjeri postoje li već
  const { count } = await supabase
    .from('zakonska_izvjesca')
    .select('id', { count: 'exact', head: true })
    .eq('godina', godina)

  if (count && count > 0) {
    throw new Error(`Obveze za ${godina}. već postoje (${count} unosa).`)
  }

  const obveze = [
    { naziv: 'Godišnji financijski izvještaj (NEPROF-06)', primatelj: 'FINA', vrsta: 'financijsko', rok: `${godina}-03-01`, napomena: `Obrazac Neprof-06 za ${godina - 1}. godinu` },
    { naziv: 'Bilješke uz financijsko izvješće', primatelj: 'FINA', vrsta: 'financijsko', rok: `${godina}-03-01`, napomena: null },
    { naziv: 'Samoprocjena sustava financijskog upravljanja (FUK)', primatelj: 'MFIN', vrsta: 'financijsko', rok: `${godina}-02-28`, napomena: 'Upitnik samoocjene sustava unutarnjih kontrola' },
    { naziv: `Izvješće o radu za ${godina - 1}.`, primatelj: 'Skupština DVD-a', vrsta: 'izvjestaj_o_radu', rok: `${godina}-06-30`, napomena: 'Prezentirati na redovnoj skupštini' },
    { naziv: 'Izvješće zapovjednika za JLS i VZ', primatelj: 'Grad Osijek / VZ Osijek', vrsta: 'izvjestaj_o_radu', rok: `${godina}-06-30`, napomena: 'Čl. 39 Zakona o vatrogastvu — rok 30.06.' },
    { naziv: 'Polugodišnji financijski izvještaj', primatelj: 'FINA', vrsta: 'financijsko', rok: `${godina}-07-31`, napomena: `Obrazac Neprof-06 za I-VI ${godina}.` },
    { naziv: 'Potvrda o financijskom izvješću (SI potvrda)', primatelj: 'FINA', vrsta: 'financijsko', rok: `${godina}-06-30`, napomena: null },
    { naziv: 'Inventura imovine', primatelj: 'Interno', vrsta: 'financijsko', rok: `${godina}-01-31`, napomena: 'Čl. 20 Zakona o fin. poslovanju NP — rok 31.01.' },
    { naziv: `Plan rada i financijski plan za ${godina + 1}.`, primatelj: 'Skupština DVD-a', vrsta: 'plan', rok: `${godina}-12-31`, napomena: 'Čl. 28 Zakona o udrugama — usvojiti do 31.12.' },
  ]

  const { error } = await supabase
    .from('zakonska_izvjesca')
    .insert(obveze.map(o => ({ ...o, godina, status: 'nije_predano' })))

  if (error) throw error
  return obveze.length
}
