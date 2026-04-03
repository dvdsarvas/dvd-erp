import { create } from 'zustand'

export interface DVDConfig {
  naziv: string
  nazivKratki: string
  slug: string
  oib: string
  maticniBroj: string
  iban: string
  adresa: string
  mjesto: string
  postanskiBroj: string
  email: string
  web: string
  logoUrl: string | null
  boja: string
  nadredjena: string
  datumOsnivanja: string
  predsjednik: string
  zapovjednik: string
}

interface DVDStore {
  config: DVDConfig
  loaded: boolean
  init: () => void
}

const DEFAULT_CONFIG: DVDConfig = {
  naziv: 'Dobrovoljno vatrogasno društvo Sarvaš',
  nazivKratki: 'DVD Sarvaš',
  slug: 'sarvas',
  oib: '48874677674',
  maticniBroj: '02794586',
  iban: '2360000-1102233720',
  adresa: 'Ivana Mažuranića 31',
  mjesto: 'Sarvaš',
  postanskiBroj: '31000',
  email: 'dvdsarvas@gmail.com',
  web: 'www.dvdsarvas.hr',
  logoUrl: '/logo-dvd.jpg',
  boja: '#dc2626',
  nadredjena: 'Vatrogasna zajednica Grada Osijeka',
  datumOsnivanja: '2011-07-16',
  predsjednik: 'Atila Vadoci',
  zapovjednik: 'Saša Davidović',
}

export const useDVDStore = create<DVDStore>((set) => ({
  config: DEFAULT_CONFIG,
  loaded: false,
  init: () => {
    // Za sada koristimo hardkodirane podatke
    // U budućnosti: dohvati iz Supabase tablice dvd_organizacije
    set({ config: DEFAULT_CONFIG, loaded: true })
  },
}))
