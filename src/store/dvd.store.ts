import { create } from 'zustand'
import { dohvatiOrganizaciju, dohvatiFunkcionere } from '@/lib/supabase/queries/organizacija'
import type { DVDOrganizacija, TrenutniFlunkcioneri } from '@/lib/supabase/queries/organizacija'

interface DVDStore {
  organizacija: DVDOrganizacija | null
  funkcioneri: TrenutniFlunkcioneri | null
  loaded: boolean
  loading: boolean
  init: () => Promise<void>
  refresh: () => Promise<void>
}

export const useDVDStore = create<DVDStore>((set, get) => ({
  organizacija: null,
  funkcioneri: null,
  loaded: false,
  loading: false,

  init: async () => {
    if (get().loaded) return
    set({ loading: true })
    try {
      const [org, funk] = await Promise.all([
        dohvatiOrganizaciju(),
        dohvatiFunkcionere(),
      ])
      set({ organizacija: org, funkcioneri: funk, loaded: true })
    } catch (err) {
      console.error('DVD store init greška:', err)
      // Označi kao loaded čak i na error — inače app visi na loading screenu
      set({ loaded: true })
    } finally {
      set({ loading: false })
    }
  },

  refresh: async () => {
    set({ loading: true })
    try {
      const [org, funk] = await Promise.all([
        dohvatiOrganizaciju(),
        dohvatiFunkcionere(),
      ])
      set({ organizacija: org, funkcioneri: funk })
    } catch (err) {
      console.error('DVD store refresh greška:', err)
    } finally {
      set({ loading: false })
    }
  },
}))

// Backwards compatibility — helper getteri
export function getDVDNaziv(store: DVDStore): string {
  return store.organizacija?.naziv_kratki ?? 'DVD ERP'
}
