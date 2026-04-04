import { supabase } from './client'
import { useAuthStore } from '@/store/auth.store'
import type { Korisnik } from '@/store/auth.store'
import { useDVDStore } from '@/store/dvd.store'

// Guard — spriječi paralelne loadKorisnik pozive
let _loadingPromise: Promise<void> | null = null

// Inicijalizacija — pozvati jednom u main.tsx
export async function initAuth() {
  const { setLoading, logout } = useAuthStore.getState()

  // Provjeri postojeću sesiju
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.user) {
    await loadKorisnik(session.user.id)
  } else {
    setLoading(false)
  }

  // Slušaj promjene auth stanja (login/logout iz drugog taba itd.)
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      // Čekaj ako je loadKorisnik već u tijeku (iz getSession gore)
      if (_loadingPromise) await _loadingPromise
      // Provjeri da korisnik nije već postavljen za ovog usera
      const current = useAuthStore.getState().korisnik
      if (current?.id === session.user.id) return
      await loadKorisnik(session.user.id)
    }
    if (event === 'SIGNED_OUT') {
      logout()
      useDVDStore.setState({ organizacija: null, funkcioneri: null, loaded: false })
    }
  })
}

async function loadKorisnik(userId: string) {
  // Ako je već u tijeku, vrati isti promise (dedup)
  if (_loadingPromise) return _loadingPromise

  _loadingPromise = _doLoadKorisnik(userId)
  try {
    await _loadingPromise
  } finally {
    _loadingPromise = null
  }
}

async function _doLoadKorisnik(userId: string) {
  const { setKorisnik, setLoading, logout } = useAuthStore.getState()

  // Osiguraj da loading ostane true dok sve ne završi
  setLoading(true)

  try {
    const { data, error } = await supabase
      .from('korisnici')
      .select('id, email, ime, prezime, uloga, aktivan')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('Korisnik nije pronađen u bazi:', error)
      await supabase.auth.signOut()
      logout()
      return
    }

    if (!data.aktivan) {
      await supabase.auth.signOut()
      logout()
      return
    }

    // Postavi korisnika (ovo postavlja loading: false u auth storeu)
    setKorisnik(data as Korisnik)

    // Učitaj podatke organizacije — await da app čeka
    await useDVDStore.getState().init()
  } catch (err) {
    console.error('loadKorisnik greška:', err)
    setLoading(false)
  }
}

export async function signIn(email: string, lozinka: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: lozinka,
  })
  if (error) throw new Error(error.message)
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw new Error(error.message)
}
