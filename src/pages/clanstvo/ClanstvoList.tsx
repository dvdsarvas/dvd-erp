import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { motion } from 'framer-motion'
import { dohvatiClanove, dohvatiClanarineZaGodinu } from '@/lib/supabase/queries/clanovi'
import type { Clan, ClanFilter } from '@/lib/supabase/queries/clanovi'
import { useAuthStore } from '@/store/auth.store'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { fadeUp } from '@/lib/animations'

const KATEGORIJE = [
  { value: '', label: 'Sve kategorije' },
  { value: 'dobrovoljni_vatrogasac', label: 'Dobrovoljni vatrogasac' },
  { value: 'prikljuceni', label: 'Priključeni' },
  { value: 'pocasni', label: 'Počasni' },
  { value: 'podmladak', label: 'Podmladak' },
]

const STATUSI = [
  { value: '', label: 'Svi statusi' },
  { value: 'aktivan', label: 'Aktivan' },
  { value: 'neaktivan', label: 'Neaktivan' },
  { value: 'istupio', label: 'Istupio' },
  { value: 'iskljucen', label: 'Isključen' },
]

const tekucaGodina = new Date().getFullYear()

function SkeletonRow() {
  return (
    <tr>
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded animate-pulse" style={{ background: 'var(--bg-elevated)', width: i === 1 ? '120px' : '60px' }} />
        </td>
      ))}
    </tr>
  )
}

export function ClanstvoList() {
  const { jeUpravackaUloga } = useAuthStore()
  const [clanovi, setClanovi] = useState<Clan[]>([])
  const [loading, setLoading] = useState(true)
  const [placanjaMap, setPlacanjaMap] = useState<Record<string, boolean>>({})
  const [filtri, setFiltri] = useState<ClanFilter>({
    kategorija: '',
    status: 'aktivan',
    pretraga: '',
  })

  useEffect(() => {
    let cancelled = false
    async function ucitajAsync() {
      setLoading(true)
      try {
        const [lista, clanarine] = await Promise.all([
          dohvatiClanove({
            kategorija: filtri.kategorija || undefined,
            status: filtri.status || undefined,
            pretraga: filtri.pretraga || undefined,
          }),
          dohvatiClanarineZaGodinu(tekucaGodina),
        ])
        if (cancelled) return
        setClanovi(lista)
        const map: Record<string, boolean> = {}
        clanarine.forEach(c => { map[c.clan_id] = !!c.datum_placanja })
        setPlacanjaMap(map)
      } catch (err) {
        if (!cancelled) console.error('Greška pri učitavanju članova:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    ucitajAsync()
    return () => { cancelled = true }
  }, [filtri.kategorija, filtri.status])

  async function ucitaj() {
    // Ručni refresh (nakon pretrage)
    setLoading(true)
    try {
      const [lista, clanarine] = await Promise.all([
        dohvatiClanove({
          kategorija: filtri.kategorija || undefined,
          status: filtri.status || undefined,
          pretraga: filtri.pretraga || undefined,
        }),
        dohvatiClanarineZaGodinu(tekucaGodina),
      ])
      setClanovi(lista)
      const map: Record<string, boolean> = {}
      clanarine.forEach(c => { map[c.clan_id] = !!c.datum_placanja })
      setPlacanjaMap(map)
    } catch (err) {
      console.error('Greška pri učitavanju članova:', err)
    } finally {
      setLoading(false)
    }
  }

  function handlePretraga(e: React.FormEvent) {
    e.preventDefault()
    ucitaj()
  }

  const filtriraniClanovi = filtri.pretraga
    ? clanovi.filter(c =>
        `${c.ime} ${c.prezime} ${c.oib}`.toLowerCase().includes(filtri.pretraga!.toLowerCase())
      )
    : clanovi

  return (
    <div>
      <PageHeader
        naslov="Evidencija članstva"
        opis={loading ? '...' : `${filtriraniClanovi.length} članova`}
        akcije={jeUpravackaUloga() ? (
          <Link href="/clanstvo/novi" className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors" style={{ background: 'var(--accent)' }}>
            + Novi član
          </Link>
        ) : undefined}
      />

      {/* Filteri */}
      <div className="rounded-xl p-4 mb-4 border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        <form onSubmit={handlePretraga} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Kategorija</label>
            <select
              value={filtri.kategorija}
              onChange={e => setFiltri(f => ({ ...f, kategorija: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
            >
              {KATEGORIJE.map(k => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
            <select
              value={filtri.status}
              onChange={e => setFiltri(f => ({ ...f, status: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
            >
              {STATUSI.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Pretraži</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={filtri.pretraga}
                onChange={e => setFiltri(f => ({ ...f, pretraga: e.target.value }))}
                placeholder="Ime, prezime ili OIB..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
              />
              <button
                type="submit"
                className="px-4 py-2 text-sm rounded-lg transition-colors"
                style={{ background: 'var(--bg-overlay)', color: 'var(--text-primary)' }}
              >
                Traži
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Tablica */}
      <div className="rounded-xl overflow-hidden border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        {filtriraniClanovi.length === 0 && !loading ? (
          <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Nema članova za prikaz.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Ime i prezime</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Zvanje</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Kategorija</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Mobitel</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Članarina {tekucaGodina}</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)
                  : filtriraniClanovi.map((clan, i) => (
                  <motion.tr
                    key={clan.id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                    className="border-b transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/clanstvo/${clan.id}`} className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {clan.prezime} {clan.ime}
                      </Link>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{clan.vatrogasno_zvanje || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={clan.kategorija} varijanta="kategorija" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>{clan.mobitel || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={clan.status} varijanta="clan" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={placanjaMap[clan.id] === undefined ? 'nepoznato' : placanjaMap[clan.id] ? 'placeno' : 'neplaceno'} varijanta="clanarina" />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
