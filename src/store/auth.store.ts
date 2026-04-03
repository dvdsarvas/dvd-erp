import { create } from 'zustand'

export type Uloga =
  | 'admin'
  | 'predsjednik'
  | 'zamjenik'
  | 'tajnik'
  | 'blagajnik'
  | 'zapovjednik'
  | 'zamjenik_zapovjednika'
  | 'clan'

export interface Korisnik {
  id: string
  email: string
  ime: string
  prezime: string
  uloga: Uloga
  aktivan: boolean
}

interface AuthStore {
  korisnik: Korisnik | null
  loading: boolean
  setKorisnik: (k: Korisnik) => void
  setLoading: (v: boolean) => void
  logout: () => void
  // Helperi za provjeru prava
  jeAdmin: () => boolean
  jeUpravackaUloga: () => boolean
  jeFinancijskaUloga: () => boolean
  mozeVideoOsobne: () => boolean
  mozeVideoZdravlje: () => boolean
  mozeUnositiIntervencije: () => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  korisnik: null,
  loading: true,

  setKorisnik: (korisnik) => set({ korisnik, loading: false }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ korisnik: null, loading: false }),

  jeAdmin: () =>
    get().korisnik?.uloga === 'admin',

  jeUpravackaUloga: () =>
    ['admin', 'predsjednik', 'zamjenik'].includes(get().korisnik?.uloga ?? ''),

  jeFinancijskaUloga: () =>
    ['admin', 'predsjednik', 'zamjenik', 'tajnik', 'blagajnik'].includes(
      get().korisnik?.uloga ?? ''
    ),

  mozeVideoOsobne: () =>
    ['admin', 'predsjednik', 'zamjenik', 'tajnik'].includes(
      get().korisnik?.uloga ?? ''
    ),

  mozeVideoZdravlje: () =>
    ['admin', 'predsjednik', 'zamjenik', 'tajnik', 'zapovjednik'].includes(
      get().korisnik?.uloga ?? ''
    ),

  mozeUnositiIntervencije: () =>
    ['admin', 'predsjednik', 'zamjenik', 'zapovjednik', 'zamjenik_zapovjednika'].includes(
      get().korisnik?.uloga ?? ''
    ),
}))
