import { supabase } from './client'
import { useAuthStore } from '@/store/auth.store'
import type { Korisnik } from '@/store/auth.store'
import { useDVDStore } from '@/store/dvd.store'

// Guard protiv duplikatnih poziva loadKorisnik
let _loadingKorisnik = false

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

  // Slušaj promjene auth stanja
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await loadKorisnik(session.user.id)
    }
    if (event === 'SIGNED_OUT') {
      logout()
    }
  })
}

async function loadKorisnik(userId: string) {
  if (_loadingKorisnik) return
  _loadingKorisnik = true

  try {
    const { setKorisnik, logout } = useAuthStore.getState()

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

    setKorisnik(data as Korisnik)
    // Čekaj učitavanje podataka organizacije prije nego app renderira
    await useDVDStore.getState().init()
  } finally {
    _loadingKorisnik = false
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
