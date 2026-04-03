import { useState } from 'react'
import { motion } from 'framer-motion'
import { signIn, resetPassword } from '@/lib/supabase/auth'
import { scaleIn } from '@/lib/animations'

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

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-base)',
    borderColor: 'var(--border-strong)',
    color: 'var(--text-primary)',
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'radial-gradient(ellipse at 30% 50%, rgba(217,70,168,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(162,28,175,0.05) 0%, transparent 50%), var(--bg-base)',
      }}
    >
      <motion.div
        variants={scaleIn}
        initial="hidden"
        animate="visible"
        className="rounded-2xl p-8 w-full max-w-[400px]"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-accent)',
          boxShadow: 'var(--glow-accent), var(--shadow-card)',
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.img
            src="/logo-dvd.jpg"
            alt="DVD Sarvaš"
            className="w-20 h-20 rounded-2xl mx-auto mb-4 object-cover"
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 0 12px var(--accent-glow))', boxShadow: 'var(--glow-accent)' }}
          />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>DVD Sarvaš</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Sustav upravljanja</p>
        </div>

        {resetPoslano ? (
          <div className="text-center">
            <div className="text-3xl mb-3" style={{ color: 'var(--success)' }}>&#10003;</div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Email poslan</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Provjerite inbox za link za reset lozinke.
            </p>
            <button
              onClick={() => { setResetMode(false); setResetPoslano(false) }}
              className="mt-4 text-sm underline" style={{ color: 'var(--text-secondary)' }}
            >
              Natrag na prijavu
            </button>
          </div>
        ) : resetMode ? (
          <>
            <h2 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Reset lozinke</h2>
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="vase@email.hr"
                />
              </div>
              {greska && <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.1)' }}>{greska}</p>}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))' }}
              >
                {loading ? 'Slanje...' : 'Pošalji reset link'}
              </motion.button>
              <button
                type="button"
                onClick={() => setResetMode(false)}
                className="w-full text-sm" style={{ color: 'var(--text-secondary)' }}
              >
                Natrag
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Prijava</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="vase@email.hr"
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Lozinka</label>
                <input
                  type="password"
                  required
                  value={lozinka}
                  onChange={e => setLozinka(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="••••••••"
                />
              </div>
              {greska && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.1)' }}>
                  {greska}
                </p>
              )}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))' }}
              >
                {loading ? 'Prijava...' : 'Prijavi se'}
              </motion.button>
            </form>
            <button
              onClick={() => setResetMode(true)}
              className="mt-3 w-full text-sm" style={{ color: 'var(--text-muted)' }}
            >
              Zaboravili ste lozinku?
            </button>
          </>
        )}

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          DVD ERP v1.0 &middot; Vatrogasna zajednica Grada Osijeka
        </p>
      </motion.div>
    </div>
  )
}
