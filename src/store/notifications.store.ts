import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'

export interface Alarm {
  id: string
  tekst: string
  rok: string
  dani: number
  href: string
  hitnost: 'crveno' | 'narancasto' | 'zuto'
  modul: string
}

interface NotificationsStore {
  alarmi: Alarm[]
  neprocitano: number
  loading: boolean
  ucitajAlarme: () => Promise<void>
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  alarmi: [],
  neprocitano: 0,
  loading: false,

  ucitajAlarme: async () => {
    set({ loading: true })
    try {
      const danas = new Date()
      const noviAlarmi: Alarm[] = []

      // Zakonska izvješća
      const { data: izvjesca } = await supabase
        .from('zakonska_izvjesca')
        .select('id, naziv, rok, status')
        .in('status', ['nije_predano', 'u_pripremi'])
        .not('rok', 'is', null)
        .order('rok')

      if (izvjesca) {
        izvjesca.forEach(iz => {
          if (!iz.rok) return
          const dani = Math.ceil((new Date(iz.rok).getTime() - danas.getTime()) / 86400000)
          if (dani <= 60) {
            noviAlarmi.push({
              id: iz.id,
              tekst: iz.naziv,
              rok: iz.rok,
              dani,
              href: '/zakonska-izvjesca',
              hitnost: dani < 0 ? 'crveno' : dani <= 7 ? 'narancasto' : 'zuto',
              modul: 'zakonska_izvjesca',
            })
          }
        })
      }

      // Vozila
      const { data: vozila } = await supabase
        .from('imovina')
        .select('id, naziv, registracija_do')
        .eq('vrsta', 'vozilo')

      if (vozila) {
        vozila.forEach(v => {
          if (v.registracija_do) {
            const dani = Math.ceil((new Date(v.registracija_do).getTime() - danas.getTime()) / 86400000)
            if (dani <= 60) {
              noviAlarmi.push({
                id: `reg-${v.id}`,
                tekst: `Registracija: ${v.naziv}`,
                rok: v.registracija_do,
                dani,
                href: '/imovina',
                hitnost: dani < 0 ? 'crveno' : dani <= 30 ? 'narancasto' : 'zuto',
                modul: 'imovina',
              })
            }
          }
        })
      }

      noviAlarmi.sort((a, b) => a.dani - b.dani)
      set({
        alarmi: noviAlarmi,
        neprocitano: noviAlarmi.filter(a => a.hitnost === 'crveno').length,
        loading: false,
      })
    } catch (err) {
      console.error('Greška pri učitavanju alarma:', err)
      set({ loading: false })
    }
  },
}))
