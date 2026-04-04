import { useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { dohvatiSjednice } from '@/lib/supabase/queries/sjednice'
import type { Sjednica, VrstaSjednice } from '@/lib/supabase/queries/sjednice'
import { useAuthStore } from '@/store/auth.store'
import { PageHeader } from '@/components/shared/PageHeader'

interface SjedniceListProps {
  vrsteFilter: VrstaSjednice[]
  naslov: string
  novaLabel: string
  novaPath: string
}

export function SkupstineList() {
  return (
    <SjedniceList
      vrsteFilter={['skupstina_redovna', 'skupstina_izborna', 'skupstina_izvanredna', 'skupstina_konstitutivna']}
      naslov="Skupštine"
      novaLabel="+ Nova skupština"
      novaPath="/sjednice/skupstine/nova"
    />
  )
}

export function UOList() {
  return (
    <SjedniceList
      vrsteFilter={['upravni_odbor']}
      naslov="Sjednice Upravnog odbora"
      novaLabel="+ Nova sjednica UO"
      novaPath="/sjednice/upravni-odbor/nova"
    />
  )
}

export function ZapovjednistvoList() {
  return (
    <SjedniceList
      vrsteFilter={['zapovjednistvo']}
      naslov="Sjednice Zapovjedništva"
      novaLabel="+ Nova sjednica"
      novaPath="/sjednice/zapovjednistvo/nova"
    />
  )
}

function SjedniceList({ vrsteFilter, naslov, novaLabel, novaPath }: SjedniceListProps) {
  const { jeUpravackaUloga } = useAuthStore()
  const [sjednice, setSjednice] = useState<Sjednica[]>([])
  const [loading, setLoading] = useState(true)
  const [, navigate] = useLocation()

  useEffect(() => {
    let cancelled = false
    dohvatiSjednice(vrsteFilter)
      .then(d => { if (!cancelled) setSjednice(d) })
      .catch(err => { if (!cancelled) console.error('Greška:', err) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  function handleKopirajProslu() {
    if (sjednice.length === 0) { alert('Nema prethodne sjednice za kopiranje.'); return }
    const prosla = sjednice[0] // već sortirane po datumu desc
    const novaDatum = new Date()
    novaDatum.setDate(novaDatum.getDate() + 30)
    navigate(`${novaPath}?kopiraj=${prosla.id}&datum=${novaDatum.toISOString().split('T')[0]}`)
  }

  return (
    <div>
      <PageHeader
        naslov={naslov}
        opis={loading ? '...' : `${sjednice.length} sjednica`}
        akcije={jeUpravackaUloga() ? (
          <div className="flex items-center gap-2">
            {sjednice.length > 0 && (
              <button onClick={handleKopirajProslu}
                className="px-3 py-2 text-xs font-medium rounded-lg transition-colors"
                style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
                Kopiraj prošlu
              </button>
            )}
            <Link href={novaPath} className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors" style={{ background: 'var(--accent)' }}>
              {novaLabel}
            </Link>
          </div>
        ) : undefined}
      />

      <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#999]">Učitavanje...</div>
        ) : sjednice.length === 0 ? (
          <div className="p-8 text-center text-[#999]">Nema sjednica za prikaz.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2e2e32] bg-[#1e1e22]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Naziv</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Vrsta</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Datum</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase hidden md:table-cell">Mjesto</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase hidden md:table-cell">Prisutno</th>
                </tr>
              </thead>
              <tbody>
                {sjednice.map(s => (
                  <tr key={s.id} className="border-b border-[#2a2a2e] hover:bg-[#1e1e22]">
                    <td className="px-4 py-3">
                      <Link href={`/sjednice/${s.id}`} className="text-white font-medium hover:text-red-400">
                        {s.naziv}
                      </Link>
                      {s.urbroj && (
                        <div className="text-xs text-[#777] mt-0.5">{s.urbroj}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#bbb]">{formatVrsta(s.vrsta)}</td>
                    <td className="px-4 py-3 text-[#bbb]">{formatDatum(s.datum)}</td>
                    <td className="px-4 py-3 text-[#bbb] hidden md:table-cell">{s.mjesto || '—'}</td>
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

function StatusBadge({ status }: { status: string }) {
  const stilovi: Record<string, string> = {
    planirana: 'bg-blue-900/25 text-blue-400',
    pozivnica_poslana: 'bg-yellow-900/25 text-yellow-400',
    odrzana: 'bg-green-900/25 text-green-400',
    zapisnik_potpisan: 'bg-emerald-900/25 text-emerald-400',
    arhivirana: 'bg-[#2a2a2e] text-[#bbb]',
  }
  const labele: Record<string, string> = {
    planirana: 'Planirana',
    pozivnica_poslana: 'Pozivnica poslana',
    odrzana: 'Održana',
    zapisnik_potpisan: 'Zapisnik potpisan',
    arhivirana: 'Arhivirana',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${stilovi[status] || 'bg-[#2a2a2e] text-[#bbb]'}`}>
      {labele[status] || status}
    </span>
  )
}

function formatVrsta(v: string): string {
  const m: Record<string, string> = {
    skupstina_redovna: 'Redovna skupština',
    skupstina_izborna: 'Izborna skupština',
    skupstina_izvanredna: 'Izvanredna skupština',
    skupstina_konstitutivna: 'Konstitutivna skupština',
    upravni_odbor: 'Upravni odbor',
    zapovjednistvo: 'Zapovjedništvo',
  }
  return m[v] || v
}

function formatDatum(datum: string): string {
  return new Date(datum).toLocaleDateString('hr-HR')
}
