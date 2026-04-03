import { useEffect, useState } from 'react'
import { dohvatiDokumente, kreirajDokument, obrisiDokument } from '@/lib/supabase/queries/dokumenti'
import type { Dokument } from '@/lib/supabase/queries/dokumenti'
import { useAuthStore } from '@/store/auth.store'
import { PageHeader } from '@/components/shared/PageHeader'

const MODULI = [
  { value: '', label: 'Svi moduli' },
  { value: 'skupstine', label: 'Skupštine' },
  { value: 'sjednice_uo', label: 'Sjednice UO' },
  { value: 'zapovjednistvo', label: 'Zapovjedništvo' },
  { value: 'clanstvo', label: 'Članstvo' },
  { value: 'financije', label: 'Financije' },
  { value: 'nabava', label: 'Nabava' },
  { value: 'imovina', label: 'Imovina' },
  { value: 'vatrogasna', label: 'Vatrogasna djelatnost' },
  { value: 'ostalo', label: 'Ostalo' },
]

export function ArhivaPage() {
  const { jeUpravackaUloga } = useAuthStore()
  const [dokumenti, setDokumenti] = useState<Dokument[]>([])
  const [loading, setLoading] = useState(true)
  const [filterModul, setFilterModul] = useState('')
  const [pretraga, setPretraga] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [forma, setForma] = useState({ naziv: '', modul: 'ostalo', opis: '', urbroj: '', klasa: '' })

  useEffect(() => { ucitaj() }, [filterModul])

  async function ucitaj() {
    setLoading(true)
    try { setDokumenti(await dohvatiDokumente(filterModul || undefined)) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleDodaj() {
    if (!forma.naziv.trim()) return
    await kreirajDokument({
      naziv: forma.naziv.trim(),
      modul: forma.modul,
      opis: forma.opis.trim() || null,
      urbroj: forma.urbroj.trim() || null,
      klasa: forma.klasa.trim() || null,
      storage_path: `arhiva/${forma.modul}/${Date.now()}_${forma.naziv.trim().replace(/\s/g, '_')}`,
    })
    setShowUpload(false)
    setForma({ naziv: '', modul: 'ostalo', opis: '', urbroj: '', klasa: '' })
    await ucitaj()
  }

  async function handleObrisi(id: string) {
    if (!confirm('Obrisati dokument iz arhive?')) return
    await obrisiDokument(id)
    await ucitaj()
  }

  let filtrirani = dokumenti
  if (pretraga) {
    const q = pretraga.toLowerCase()
    filtrirani = filtrirani.filter(d =>
      d.naziv.toLowerCase().includes(q) ||
      (d.urbroj && d.urbroj.toLowerCase().includes(q)) ||
      (d.opis && d.opis.toLowerCase().includes(q))
    )
  }

  return (
    <div>
      <PageHeader
        naslov="Arhiva dokumenata"
        opis={`${dokumenti.length} dokumenata`}
        akcije={jeUpravackaUloga() ? (
          <button onClick={() => setShowUpload(true)}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg" style={{ background: 'var(--accent)' }}>
            + Novi dokument
          </button>
        ) : undefined}
      />

      {/* Filteri */}
      <div className="bg-[#242428] border border-[#333338] rounded-xl p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-[#999] mb-1">Modul</label>
            <select value={filterModul} onChange={e => setFilterModul(e.target.value)}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]">
              {MODULI.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-[#999] mb-1">Pretraži</label>
            <input type="text" value={pretraga} onChange={e => setPretraga(e.target.value)}
              placeholder="Naziv, URBROJ ili opis..."
              className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
        </div>
      </div>

      {/* Upload forma */}
      {showUpload && (
        <div className="bg-[#242428] border border-[#333338] rounded-xl p-4 mb-4">
          <h3 className="text-sm font-medium text-white mb-3">Novi dokument</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" value={forma.naziv} onChange={e => setForma(f => ({ ...f, naziv: e.target.value }))}
              placeholder="Naziv dokumenta *" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <select value={forma.modul} onChange={e => setForma(f => ({ ...f, modul: e.target.value }))}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]">
              {MODULI.filter(m => m.value).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <input type="text" value={forma.urbroj} onChange={e => setForma(f => ({ ...f, urbroj: e.target.value }))}
              placeholder="URBROJ" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="text" value={forma.klasa} onChange={e => setForma(f => ({ ...f, klasa: e.target.value }))}
              placeholder="KLASA" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <div className="md:col-span-2">
              <input type="text" value={forma.opis} onChange={e => setForma(f => ({ ...f, opis: e.target.value }))}
                placeholder="Opis" className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleDodaj} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Spremi</button>
            <button onClick={() => setShowUpload(false)} className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg">Odustani</button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-[#999]">Učitavanje...</div>
        : filtrirani.length === 0 ? <div className="p-8 text-center text-[#999]">Nema dokumenata.</div>
        : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e2e32] bg-[#1e1e22]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Naziv</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Modul</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase hidden md:table-cell">URBROJ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase hidden md:table-cell">Datum</th>
                {jeUpravackaUloga() && <th className="text-right px-4 py-3 text-xs font-medium text-[#999] uppercase"></th>}
              </tr>
            </thead>
            <tbody>
              {filtrirani.map(d => (
                <tr key={d.id} className="border-b border-[#2a2a2e] hover:bg-[#1e1e22]">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{d.naziv}</div>
                    {d.opis && <div className="text-xs text-[#777] mt-0.5">{d.opis}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#2a2a2e] text-[#bbb] capitalize">
                      {d.modul || 'ostalo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#999] font-mono text-xs hidden md:table-cell">{d.urbroj || '—'}</td>
                  <td className="px-4 py-3 text-[#999] text-xs hidden md:table-cell">
                    {d.created_at ? new Date(d.created_at).toLocaleDateString('hr-HR') : '—'}
                  </td>
                  {jeUpravackaUloga() && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleObrisi(d.id)} className="text-xs text-red-400 hover:text-red-600">Obriši</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
