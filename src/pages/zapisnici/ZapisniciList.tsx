import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { dohvatiSjednice } from '@/lib/supabase/queries/sjednice'
import type { Sjednica } from '@/lib/supabase/queries/sjednice'

const VRSTE_FILTER = [
  { value: '', label: 'Sve vrste' },
  { value: 'skupstina', label: 'Skupštine' },
  { value: 'upravni_odbor', label: 'Upravni odbor' },
  { value: 'zapovjednistvo', label: 'Zapovjedništvo' },
]

const STATUSI_FILTER = [
  { value: '', label: 'Svi statusi' },
  { value: 'zapisnik_potpisan', label: 'Potpisan' },
  { value: 'odrzana', label: 'Održana (nacrt)' },
  { value: 'arhivirana', label: 'Arhivirana' },
]

export function ZapisniciList() {
  const [sjednice, setSjednice] = useState<Sjednica[]>([])
  const [loading, setLoading] = useState(true)
  const [vrstaFilter, setVrstaFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pretraga, setPretraga] = useState('')
  const [godina, setGodina] = useState('')

  useEffect(() => {
    let cancelled = false
    dohvatiSjednice()
      .then(data => {
        if (cancelled) return
        const sZapisnikom = data.filter(s =>
          ['odrzana', 'zapisnik_potpisan', 'arhivirana'].includes(s.status)
        )
        setSjednice(sZapisnikom)
      })
      .catch(err => { if (!cancelled) console.error('Greška:', err) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Filtriranje
  let filtrirane = sjednice

  if (vrstaFilter) {
    filtrirane = filtrirane.filter(s =>
      vrstaFilter === 'skupstina' ? s.vrsta.startsWith('skupstina') : s.vrsta === vrstaFilter
    )
  }
  if (statusFilter) {
    filtrirane = filtrirane.filter(s => s.status === statusFilter)
  }
  if (godina) {
    filtrirane = filtrirane.filter(s => s.datum.startsWith(godina))
  }
  if (pretraga) {
    const q = pretraga.toLowerCase()
    filtrirane = filtrirane.filter(s =>
      s.naziv.toLowerCase().includes(q) ||
      (s.urbroj && s.urbroj.toLowerCase().includes(q))
    )
  }

  // Dostupne godine za filter
  const godine = [...new Set(sjednice.map(s => s.datum.slice(0, 4)))].sort().reverse()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-white">Zapisnici</h1>
        <p className="text-sm text-[#999] mt-0.5">
          Centralna evidencija zapisnika sa svih sjednica
        </p>
      </div>

      {/* Filteri */}
      <div className="bg-[#242428] border border-[#333338] rounded-xl p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-[#999] mb-1">Vrsta</label>
            <select value={vrstaFilter} onChange={e => setVrstaFilter(e.target.value)}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]">
              {VRSTE_FILTER.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#999] mb-1">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]">
              {STATUSI_FILTER.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#999] mb-1">Godina</label>
            <select value={godina} onChange={e => setGodina(e.target.value)}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]">
              <option value="">Sve godine</option>
              {godine.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-[#999] mb-1">Pretraži</label>
            <input
              type="text" value={pretraga} onChange={e => setPretraga(e.target.value)}
              placeholder="Naziv ili URBROJ..."
              className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#999]">Učitavanje...</div>
        ) : filtrirane.length === 0 ? (
          <div className="p-8 text-center text-[#999]">Nema zapisnika za prikaz.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2e2e32] bg-[#1e1e22]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Naziv</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Vrsta</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Datum</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase hidden md:table-cell">Prisutno</th>
                </tr>
              </thead>
              <tbody>
                {filtrirane.map(s => (
                  <tr key={s.id} className="border-b border-[#2a2a2e] hover:bg-[#1e1e22]">
                    <td className="px-4 py-3">
                      <Link href={`/sjednice/${s.id}`} className="text-white font-medium hover:text-red-400">
                        {s.naziv}
                      </Link>
                      {s.urbroj && <div className="text-xs text-[#777] mt-0.5 font-mono">{s.urbroj}</div>}
                    </td>
                    <td className="px-4 py-3"><VrstaBadge vrsta={s.vrsta} /></td>
                    <td className="px-4 py-3 text-[#bbb]">{new Date(s.datum).toLocaleDateString('hr-HR')}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-[#bbb] hidden md:table-cell">
                      {s.prisutno_clanova != null ? `${s.prisutno_clanova}/${s.ukupno_clanova}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function VrstaBadge({ vrsta }: { vrsta: string }) {
  const boje: Record<string, string> = {
    skupstina_redovna: 'bg-purple-900/25 text-purple-400',
    skupstina_izborna: 'bg-purple-900/25 text-purple-400',
    skupstina_izvanredna: 'bg-purple-900/25 text-purple-400',
    skupstina_konstitutivna: 'bg-purple-900/25 text-purple-400',
    upravni_odbor: 'bg-blue-900/25 text-blue-400',
    zapovjednistvo: 'bg-orange-900/25 text-orange-400',
  }
  const labele: Record<string, string> = {
    skupstina_redovna: 'Skupština',
    skupstina_izborna: 'Skupština (izborna)',
    skupstina_izvanredna: 'Skupština (izvanredna)',
    skupstina_konstitutivna: 'Skupština (konst.)',
    upravni_odbor: 'UO',
    zapovjednistvo: 'Zapovjedništvo',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${boje[vrsta] || 'bg-[#2a2a2e] text-[#bbb]'}`}>
      {labele[vrsta] || vrsta}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const stilovi: Record<string, string> = {
    odrzana: 'bg-yellow-900/25 text-yellow-400',
    zapisnik_potpisan: 'bg-green-900/25 text-green-400',
    arhivirana: 'bg-[#2a2a2e] text-[#bbb]',
  }
  const labele: Record<string, string> = {
    odrzana: 'Nacrt',
    zapisnik_potpisan: 'Potpisan',
    arhivirana: 'Arhiviran',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${stilovi[status] || 'bg-[#2a2a2e] text-[#bbb]'}`}>
      {labele[status] || status}
    </span>
  )
}
