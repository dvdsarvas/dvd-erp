import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth.store'
import { generirajAkcije, type AkcijskaStavka } from '@/lib/utils/akcije'
import { fadeUp, slideIn } from '@/lib/animations'

const katBoja: Record<string, string> = {
  financije: 'var(--info)',
  zakon:     'var(--danger)',
  zdravlje:  'var(--warning)',
  imovina:   'var(--warning)',
  clanstvo:  'var(--accent)',
}

function AkcijskaKartica({ a, index }: { a: AkcijskaStavka; index: number }) {
  return (
    <motion.div
      variants={slideIn}
      initial="hidden"
      animate="visible"
      custom={index}
      className="rounded-xl p-4 border"
      style={{
        background: 'var(--bg-elevated)',
        borderColor: 'var(--border)',
        borderLeftWidth: 4,
        borderLeftColor: katBoja[a.kategorija] || 'var(--text-muted)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.naslov}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{a.opis}</p>
        </div>
        <Link href={a.akcija_href}
          className="flex-shrink-0 px-3 py-1.5 text-white text-xs font-medium rounded-lg whitespace-nowrap"
          style={{ background: 'var(--accent)' }}>
          {a.akcija_label}
        </Link>
      </div>
    </motion.div>
  )
}

export function AkcijskiCentar() {
  const { korisnik } = useAuthStore()
  const [akcije, setAkcije] = useState<AkcijskaStavka[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!korisnik) return
    generirajAkcije(korisnik.uloga)
      .then(setAkcije)
      .finally(() => setLoading(false))
  }, [korisnik])

  const hitne = akcije.filter(a => a.prioritet === 1)
  const uskoro = akcije.filter(a => a.prioritet === 2)
  const planirano = akcije.filter(a => a.prioritet === 3)

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Učitavanje akcija...</div>

  return (
    <div>
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Što trebaš napraviti</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {akcije.length === 0 ? 'Sve je u redu!' : `${hitne.length} hitno · ${uskoro.length} uskoro · ${planirano.length} planirano`}
        </p>
      </motion.div>

      {akcije.length === 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}
          className="rounded-xl p-12 text-center border"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="text-4xl mb-3">&#10004;</div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Sve je u redu!</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Nema hitnih ni nadolazećih akcija.</p>
        </motion.div>
      )}

      {hitne.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--danger)' }}>
            Hitno ({hitne.length})
          </h2>
          <div className="space-y-3">
            {hitne.map((a, i) => <AkcijskaKartica key={a.id} a={a} index={i} />)}
          </div>
        </div>
      )}

      {uskoro.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--warning)' }}>
            Uskoro ({uskoro.length})
          </h2>
          <div className="space-y-3">
            {uskoro.map((a, i) => <AkcijskaKartica key={a.id} a={a} index={i} />)}
          </div>
        </div>
      )}

      {planirano.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Planirano ({planirano.length})
          </h2>
          <div className="space-y-3">
            {planirano.map((a, i) => <AkcijskaKartica key={a.id} a={a} index={i} />)}
          </div>
        </div>
      )}
    </div>
  )
}
