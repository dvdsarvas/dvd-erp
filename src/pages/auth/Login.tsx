import { useState } from 'react'
import { signIn, resetPassword } from '@/lib/supabase/auth'

export function Login() {
  const [email, setEmail] = useState('')
  const [lozinka, setLozinka] = useState('')
  const [greska, setGreska] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetPoslano, setResetPoslano] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setGreska('')
    setLoading(true)
    try {
      await signIn(email, lozinka)
      // auth.store će se ažurirati automatski putem onAuthStateChange
    } catch (err) {
      setGreska('Pogrešan email ili lozinka.')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setGreska('')
    setLoading(true)
    try {
      await resetPassword(email)
      setResetPoslano(true)
    } catch {
      setGreska('Greška pri slanju emaila. Provjerite adresu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Lijeva strana — hero slika */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img src="/photos/540389023_1208987131261045_3267553643391095664_n.jpg" alt="DVD Sarvaš" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h2 className="text-3xl font-bold mb-2">DVD Sarvaš</h2>
          <p className="text-white/80 text-sm">Dobrovoljno vatrogasno društvo Sarvaš — sustav za digitalizaciju dokumentacije i upravljanje vatrogasnim društvom.</p>
        </div>
      </div>

      {/* Desna strana — login */}
      <div className="flex-1 flex items-center justify-center px-6 bg-[#1a1a1e]">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo-dvd.jpg" alt="DVD Sarvaš" className="w-16 h-16 rounded-xl mx-auto mb-4 object-cover" />
          <h1 className="text-xl font-bold text-white">DVD Sarvaš</h1>
          <p className="text-sm text-[#777] mt-1">Sustav upravljanja</p>
        </div>

        {/* Kartica */}
        <div className="bg-[#242428] border border-[#333338] rounded-xl p-6">

          {resetPoslano ? (
            <div className="text-center">
              <div className="text-green-400 text-3xl mb-3">✓</div>
              <p className="font-medium text-white">Email poslan</p>
              <p className="text-sm text-[#aaa] mt-1">
                Provjerite inbox za link za reset lozinke.
              </p>
              <button
                onClick={() => { setResetMode(false); setResetPoslano(false) }}
                className="mt-4 text-sm text-[#aaa] hover:text-white underline"
              >
                Natrag na prijavu
              </button>
            </div>
          ) : resetMode ? (
            <>
              <h2 className="font-medium text-white mb-4">Reset lozinke</h2>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm text-[#aaa] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#3a3a3e] rounded-lg text-sm bg-[#1e1e22] text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="vase@email.hr"
                  />
                </div>
                {greska && <p className="text-sm text-red-600">{greska}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Slanje...' : 'Pošalji reset link'}
                </button>
                <button
                  type="button"
                  onClick={() => setResetMode(false)}
                  className="w-full text-sm text-[#aaa] hover:text-[#aaa]"
                >
                  Natrag
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="font-medium text-white mb-4">Prijava</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm text-[#aaa] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#3a3a3e] rounded-lg text-sm bg-[#1e1e22] text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="vase@email.hr"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#aaa] mb-1">Lozinka</label>
                  <input
                    type="password"
                    required
                    value={lozinka}
                    onChange={e => setLozinka(e.target.value)}
                    className="w-full px-3 py-2 border border-[#3a3a3e] rounded-lg text-sm bg-[#1e1e22] text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="••••••••"
                  />
                </div>
                {greska && (
                  <p className="text-sm text-red-600 bg-red-900/20 px-3 py-2 rounded-lg">
                    {greska}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Prijava...' : 'Prijavi se'}
                </button>
              </form>
              <button
                onClick={() => setResetMode(true)}
                className="mt-3 w-full text-sm text-[#aaa] hover:text-[#aaa]"
              >
                Zaboravili ste lozinku?
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#777] mt-6">
          DVD ERP v1.0 &middot; Vatrogasna zajednica Grada Osijeka
        </p>
      </div>
      </div>
    </div>
  )
}
