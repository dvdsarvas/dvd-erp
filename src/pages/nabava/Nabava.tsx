import { useEffect, useState } from 'react'
import { dohvatiNabave, kreirajNabavu, azurirajNabavu } from '@/lib/supabase/queries/nabava'
import type { Nabava as NabavaType } from '@/lib/supabase/queries/nabava'
import { useAuthStore } from '@/store/auth.store'
import { PageHeader } from '@/components/shared/PageHeader'

const STATUSI = [
  { value: 'zahtjev', label: 'Zahtjev', boja: 'bg-blue-900/25 text-blue-400' },
  { value: 'odobreno', label: 'Odobreno', boja: 'bg-green-900/25 text-green-400' },
  { value: 'odbijeno', label: 'Odbijeno', boja: 'bg-red-900/25 text-red-400' },
  { value: 'naruceno', label: 'Naručeno', boja: 'bg-purple-900/25 text-purple-400' },
  { value: 'isporuceno', label: 'Isporučeno', boja: 'bg-emerald-900/25 text-emerald-400' },
  { value: 'placeno', label: 'Plaćeno', boja: 'bg-[#2a2a2e] text-[#bbb]' },
]

export function NabavaPage() {
  const { jeUpravackaUloga, jeFinancijskaUloga } = useAuthStore()
  const [nabave, setNabave] = useState<NabavaType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForma, setShowForma] = useState(false)
  const [forma, setForma] = useState({ naziv: '', opis: '', procijenjeni_iznos: '', dobavljac: '' })

  useEffect(() => { ucitaj() }, [])

  async function ucitaj() {
    setLoading(true)
    try { setNabave(await dohvatiNabave()) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleDodaj() {
    if (!forma.naziv.trim()) return
    const rbr = `NAB-${new Date().getFullYear()}-${String(nabave.length + 1).padStart(3, '0')}`
    await kreirajNabavu({
      broj_nabave: rbr,
      opis: forma.naziv.trim() + (forma.opis.trim() ? ` — ${forma.opis.trim()}` : ''),
      procijenjeni_iznos: forma.procijenjeni_iznos ? parseFloat(forma.procijenjeni_iznos) : null,
      dobavljac_naziv: forma.dobavljac.trim() || null,
      status: 'zahtjev',
      datum_zahtjeva: new Date().toISOString().split('T')[0],
    })
    setShowForma(false)
    setForma({ naziv: '', opis: '', procijenjeni_iznos: '', dobavljac: '' })
    await ucitaj()
  }

  async function handleStatus(id: string, status: string) {
    await azurirajNabavu(id, { status })
    await ucitaj()
  }

  return (
    <div>
      <PageHeader
        naslov="Nabava"
        opis={`${nabave.length} zahtjeva`}
        akcije={(jeUpravackaUloga() || jeFinancijskaUloga()) ? (
          <button onClick={() => setShowForma(true)}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg" style={{ background: 'var(--accent)' }}>
            + Novi zahtjev
          </button>
        ) : undefined}
      />

      {showForma && (
        <div className="bg-[#242428] border border-[#333338] rounded-xl p-4 mb-4">
          <h3 className="text-sm font-medium text-white mb-3">Novi zahtjev za nabavom</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <input type="text" value={forma.naziv} onChange={e => setForma(f => ({ ...f, naziv: e.target.value }))}
                placeholder="Naziv nabave..." className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            </div>
            <input type="text" value={forma.opis} onChange={e => setForma(f => ({ ...f, opis: e.target.value }))}
              placeholder="Opis..." className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="number" value={forma.procijenjeni_iznos} onChange={e => setForma(f => ({ ...f, procijenjeni_iznos: e.target.value }))}
              placeholder="Procijenjeni iznos (EUR)" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="text" value={forma.dobavljac} onChange={e => setForma(f => ({ ...f, dobavljac: e.target.value }))}
              placeholder="Dobavljač..." className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleDodaj} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Pošalji zahtjev</button>
            <button onClick={() => setShowForma(false)} className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg">Odustani</button>
          </div>
        </div>
      )}

      <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#999]">Učitavanje...</div>
        ) : nabave.length === 0 ? (
          <div className="p-8 text-center text-[#999]">Nema zahtjeva za nabavom.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e2e32] bg-[#1e1e22]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Naziv</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase hidden md:table-cell">Dobavljač</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#999] uppercase">Iznos</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase hidden md:table-cell">Datum</th>
              </tr>
            </thead>
            <tbody>
              {nabave.map(n => (
                <tr key={n.id} className="border-b border-[#2a2a2e] hover:bg-[#1e1e22]">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{n.opis}</div>
                    {n.opis && <div className="text-xs text-[#777] mt-0.5">{n.opis}</div>}
                  </td>
                  <td className="px-4 py-3 text-[#bbb] hidden md:table-cell">{n.dobavljac_naziv || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {n.procijenjeni_iznos ? `${Number(n.procijenjeni_iznos).toFixed(2)} EUR` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {jeUpravackaUloga() ? (
                      <select value={n.status} onChange={e => handleStatus(n.id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${STATUSI.find(s => s.value === n.status)?.boja || 'bg-[#2a2a2e] text-[#bbb]'}`}>
                        {STATUSI.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUSI.find(s => s.value === n.status)?.boja || 'bg-[#2a2a2e] text-[#bbb]'}`}>
                        {STATUSI.find(s => s.value === n.status)?.label || n.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#999] text-xs hidden md:table-cell">
                    {n.created_at ? new Date(n.created_at).toLocaleDateString('hr-HR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
