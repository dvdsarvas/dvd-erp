import { supabase } from '@/lib/supabase/client'

export interface AkcijskaStavka {
  id: string
  prioritet: 1 | 2 | 3           // 1=hitno, 2=uskoro, 3=planirano
  kategorija: string              // ikona i boja
  naslov: string                  // kratko i jasno
  opis: string                    // jedan red objašnjenja
  akcija_label: string            // tekst gumba
  akcija_href: string             // kamo ide klik
  rok?: string                    // datum isteka
  dani_do_roka?: number
}

export async function generirajAkcije(
  uloga: string
): Promise<AkcijskaStavka[]> {
  const akcije: AkcijskaStavka[] = []
  const danas = new Date()

  // ── Za sve uloge ──────────────────────────────────────────

  // Zdravstveni pregledi koji ističu
  try {
    const { data: zdravlje } = await supabase
      .from('zdravstveni_pregledi')
      .select('id, clan_id, datum_sljedeceg, clanovi(ime, prezime)')
      .lte('datum_sljedeceg', addDays(danas, 60).toISOString().split('T')[0])
      .order('datum_sljedeceg')
    zdravlje?.forEach(z => {
      if (!z.datum_sljedeceg) return
      const dani = diffDays(z.datum_sljedeceg, danas)
      akcije.push({
        id: `zdrav-${z.clan_id}`,
        prioritet: dani < 0 ? 1 : dani <= 14 ? 2 : 3,
        kategorija: 'zdravlje',
        naslov: `Liječnički: ${(z.clanovi as any)?.prezime} ${(z.clanovi as any)?.ime}`,
        opis: dani < 0 ? `Istekao ${Math.abs(dani)} dana` : `Ističe za ${dani} dana`,
        akcija_label: 'Unesi novi pregled',
        akcija_href: `/clanstvo/${z.clan_id}`,
        rok: z.datum_sljedeceg,
        dani_do_roka: dani,
      })
    })
  } catch {}

  // ── Za predsjednika/zamjenika/admina ──────────────────────
  if (['admin', 'predsjednik', 'zamjenik'].includes(uloga)) {

    // Računi čekaju likvidaciju
    try {
      const { count } = await supabase
        .from('racuni')
        .select('id', { count: 'exact' })
        .in('status', ['primljeno', 'u_obradi'])
      if ((count || 0) > 0) {
        akcije.push({
          id: 'likvidacija',
          prioritet: 2,
          kategorija: 'financije',
          naslov: `${count} računa čeka likvidaciju`,
          opis: 'Predsjednički potpis potreban za nastavak plaćanja',
          akcija_label: 'Likvidiraj sada',
          akcija_href: '/racuni',
        })
      }
    } catch {}

    // Zakonska izvješća koja ističu
    try {
      const { data: izvjesca } = await supabase
        .from('zakonska_izvjesca')
        .select('id, naziv, rok')
        .in('status', ['nije_predano', 'u_pripremi'])
        .lte('rok', addDays(danas, 30).toISOString().split('T')[0])
      izvjesca?.forEach(iz => {
        if (!iz.rok) return
        const dani = diffDays(iz.rok, danas)
        akcije.push({
          id: `izvjesce-${iz.id}`,
          prioritet: dani < 0 ? 1 : dani <= 7 ? 1 : 2,
          kategorija: 'zakon',
          naslov: iz.naziv,
          opis: dani < 0 ? `Rok prošao ${Math.abs(dani)} dana` : `Rok za ${dani} dana`,
          akcija_label: 'Označi predanim',
          akcija_href: '/zakonska-izvjesca',
          rok: iz.rok,
          dani_do_roka: dani,
        })
      })
    } catch {}

    // Nespojene bankovne transakcije
    try {
      const { count: nespojenoCount } = await supabase
        .from('bank_transakcije' as any)
        .select('id', { count: 'exact' })
        .eq('status', 'nespojeno')
      if ((nespojenoCount || 0) > 0) {
        akcije.push({
          id: 'bank-nespojeno',
          prioritet: 2,
          kategorija: 'financije',
          naslov: `${nespojenoCount} transakcija banke nije spojeno`,
          opis: 'Spoji transakcije s računima za točno izvršenje plana',
          akcija_label: 'Spoji transakcije',
          akcija_href: '/racuni/bank',
        })
      }
    } catch {}

    // Registracije vozila koje ističu
    try {
      const { data: vozila } = await supabase
        .from('imovina')
        .select('id, naziv, registracija_do')
        .eq('vrsta', 'vozilo')
        .lte('registracija_do', addDays(danas, 45).toISOString().split('T')[0])
      vozila?.forEach(v => {
        if (!v.registracija_do) return
        const dani = diffDays(v.registracija_do, danas)
        akcije.push({
          id: `reg-${v.id}`,
          prioritet: dani < 0 ? 1 : dani <= 14 ? 2 : 3,
          kategorija: 'imovina',
          naslov: `Registracija: ${v.naziv}`,
          opis: dani < 0 ? `Istekla ${Math.abs(dani)} dana` : `Ističe za ${dani} dana`,
          akcija_label: 'Unesi obnovu',
          akcija_href: '/imovina',
          rok: v.registracija_do,
          dani_do_roka: dani,
        })
      })
    } catch {}
  }

  // Sortiraj: prioritet 1 prvo, unutar prioriteta po datumu
  return akcije.sort((a, b) =>
    a.prioritet !== b.prioritet ? a.prioritet - b.prioritet :
    (a.dani_do_roka ?? 999) - (b.dani_do_roka ?? 999)
  )
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function diffDays(iso: string, od: Date): number {
  return Math.ceil((new Date(iso).getTime() - od.getTime()) / 86400000)
}
