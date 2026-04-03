import { supabase } from '../client'
import type { Database } from '@/types/database.types'

type VatrogasnoZvanje = Database['public']['Tables']['vatrogasna_zvanja']['Row']
type Odlikovanje = Database['public']['Tables']['odlikovanja']['Row']
type OdlikovanjeInsert = Database['public']['Tables']['odlikovanja']['Insert']
type PovijestZvanja = Database['public']['Tables']['povijest_zvanja']['Row']
type PovijestZvanjaInsert = Database['public']['Tables']['povijest_zvanja']['Insert']

export type { VatrogasnoZvanje, Odlikovanje, OdlikovanjeInsert, PovijestZvanja, PovijestZvanjaInsert }

// ── Referentna zvanja ──────────────────────────────────────

export async function dohvatiSvaZvanja() {
  const { data, error } = await supabase
    .from('vatrogasna_zvanja')
    .select('*')
    .eq('aktivan', true)
    .order('razina')
  if (error) throw error
  return data as VatrogasnoZvanje[]
}

// ── Povijest zvanja člana ──────────────────────────────────

export async function dohvatiPovijestZvanja(clanId: string) {
  const { data, error } = await supabase
    .from('povijest_zvanja')
    .select('*, vatrogasna_zvanja(naziv, kategorija, razina)')
    .eq('clan_id', clanId)
    .order('datum_stjecanja', { ascending: false })
  if (error) throw error
  return data
}

export async function dodajZvanje(unos: PovijestZvanjaInsert) {
  const { data, error } = await supabase
    .from('povijest_zvanja')
    .insert(unos)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Odlikovanja člana ──────────────────────────────────────

export async function dohvatiOdlikovanja(clanId: string) {
  const { data, error } = await supabase
    .from('odlikovanja')
    .select('*')
    .eq('clan_id', clanId)
    .order('datum_dodjele', { ascending: false })
  if (error) throw error
  return data as Odlikovanje[]
}

export async function dodajOdlikovanje(unos: OdlikovanjeInsert) {
  const { data, error } = await supabase
    .from('odlikovanja')
    .insert(unos)
    .select()
    .single()
  if (error) throw error
  return data as Odlikovanje
}

// ── Napredovanje — tko ispunjava uvjete ────────────────────

export interface KandidatNapredovanje {
  clan_id: string
  ime: string
  prezime: string
  trenutno_zvanje: string | null
  trenutna_razina: number
  sljedece_zvanje: string
  sljedeca_razina: number
  staz_mjeseci: number
  ispunjava_staz: boolean
}

export async function dohvatiKandidateZaNapredovanje(): Promise<KandidatNapredovanje[]> {
  const [zvanja, clanovi, povijestData] = await Promise.all([
    dohvatiSvaZvanja(),
    supabase.from('clanovi').select('id, ime, prezime, vatrogasno_zvanje, datum_uclanivanja').eq('status', 'aktivan').eq('kategorija', 'dobrovoljni_vatrogasac'),
    supabase.from('povijest_zvanja').select('clan_id, zvanje_id, datum_stjecanja').order('datum_stjecanja', { ascending: false }),
  ])

  if (clanovi.error) throw clanovi.error

  const danas = new Date()
  const zvanjaMap = new Map(zvanja.map(z => [z.naziv.toLowerCase(), z]))
  const zvanjaById = new Map(zvanja.map(z => [z.id, z]))

  // Zadnje zvanje po članu iz povijest_zvanja
  const zadnjeZvanje: Record<string, { zvanje_id: string; datum: string }> = {}
  if (povijestData.data) {
    povijestData.data.forEach(p => {
      if (!zadnjeZvanje[p.clan_id]) zadnjeZvanje[p.clan_id] = { zvanje_id: p.zvanje_id, datum: p.datum_stjecanja }
    })
  }

  const kandidati: KandidatNapredovanje[] = []

  for (const clan of clanovi.data || []) {
    // Pronađi trenutnu razinu
    let trenutnaRazina = 0
    let trenutnoZvanje = clan.vatrogasno_zvanje

    const hist = zadnjeZvanje[clan.id]
    if (hist) {
      const z = zvanjaById.get(hist.zvanje_id)
      if (z) { trenutnaRazina = z.razina; trenutnoZvanje = z.naziv }
    } else if (clan.vatrogasno_zvanje) {
      const z = zvanjaMap.get(clan.vatrogasno_zvanje.toLowerCase())
      if (z) trenutnaRazina = z.razina
    }

    // Sljedeće zvanje
    const sljedece = zvanja.find(z => z.razina === trenutnaRazina + 1 && z.kategorija !== 'pocasno')
    if (!sljedece) continue

    // Izračunaj staž
    const datumOd = hist?.datum || clan.datum_uclanivanja
    const stazMjeseci = Math.floor((danas.getTime() - new Date(datumOd).getTime()) / (30.44 * 24 * 60 * 60 * 1000))

    const ispunjavaStaz = sljedece.uvjeti_staz_mjeseci ? stazMjeseci >= sljedece.uvjeti_staz_mjeseci : true

    if (ispunjavaStaz) {
      kandidati.push({
        clan_id: clan.id,
        ime: clan.ime,
        prezime: clan.prezime,
        trenutno_zvanje: trenutnoZvanje,
        trenutna_razina: trenutnaRazina,
        sljedece_zvanje: sljedece.naziv,
        sljedeca_razina: sljedece.razina,
        staz_mjeseci: stazMjeseci,
        ispunjava_staz: true,
      })
    }
  }

  return kandidati.sort((a, b) => b.staz_mjeseci - a.staz_mjeseci)
}
