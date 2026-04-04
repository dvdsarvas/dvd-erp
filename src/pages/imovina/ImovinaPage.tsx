import { useEffect, useState } from 'react'
import { dohvatiImovinu, kreirajImovinu, azurirajImovinu, obrisiImovinu } from '@/lib/supabase/queries/imovina'
import type { Imovina, ImovinaInsert } from '@/lib/supabase/queries/imovina'
import { useAuthStore } from '@/store/auth.store'
import { PageHeader } from '@/components/shared/PageHeader'

const VRSTE = ['vozilo', 'oprema', 'objekt', 'ostalo']
const STATUSI = ['u_uporabi', 'servis', 'neispravno', 'otpisano']

export function ImovinaPage() {
  const { jeUpravackaUloga } = useAuthStore()
  const [imovina, setImovina] = useState<Imovina[]>([])
  const [loading, setLoading] = useState(true)
  const [filterVrsta, setFilterVrsta] = useState('')
  const [showForma, setShowForma] = useState(false)
  const [editStavka, setEditStavka] = useState<Imovina | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [forma, setForma] = useState({
    naziv: '', vrsta: 'oprema', marka: '', model: '', reg_oznaka: '',
    inventurni_broj: '', lokacija: '', nabavna_vrijednost: '', opis: '',
    registracija_do: '', tehnicki_do: '', osiguranje_do: '', osiguranje_polica: '',
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    dohvatiImovinu(filterVrsta || undefined)
      .then(d => { if (!cancelled) setImovina(d) })
      .catch(err => { if (!cancelled) console.error(err) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filterVrsta])

  async function ucitaj() {
    setLoading(true)
    try { setImovina(await dohvatiImovinu(filterVrsta || undefined)) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  function otvoriFormu(stavka?: Imovina) {
    if (stavka) {
      setEditStavka(stavka)
      setForma({
        naziv: stavka.naziv, vrsta: stavka.vrsta, marka: stavka.marka || '',
        model: stavka.model || '', reg_oznaka: stavka.reg_oznaka || '',
        inventurni_broj: stavka.inventurni_broj || '', lokacija: stavka.lokacija || '',
        nabavna_vrijednost: stavka.nabavna_vrijednost ? String(stavka.nabavna_vrijednost) : '',
        opis: stavka.opis || '', registracija_do: stavka.registracija_do || '',
        tehnicki_do: stavka.tehnicki_do || '', osiguranje_do: stavka.osiguranje_do || '',
        osiguranje_polica: stavka.osiguranje_polica || '',
      })
    } else {
      setEditStavka(null)
      setForma({ naziv: '', vrsta: 'oprema', marka: '', model: '', reg_oznaka: '', inventurni_broj: '', lokacija: '', nabavna_vrijednost: '', opis: '', registracija_do: '', tehnicki_do: '', osiguranje_do: '', osiguranje_polica: '' })
    }
    setShowForma(true)
  }

  async function handleSpremi() {
    if (!forma.naziv.trim()) { alert('Naziv je obavezan.'); return }
    try {
      const podaci = {
        naziv: forma.naziv.trim(),
        vrsta: forma.vrsta,
        marka: forma.marka.trim() || null,
        model: forma.model.trim() || null,
        reg_oznaka: forma.reg_oznaka.trim() || null,
        inventurni_broj: forma.inventurni_broj.trim() || null,
        lokacija: forma.lokacija.trim() || null,
        nabavna_vrijednost: forma.nabavna_vrijednost ? parseFloat(forma.nabavna_vrijednost) : null,
        opis: forma.opis.trim() || null,
        registracija_do: forma.registracija_do || null,
        tehnicki_do: forma.tehnicki_do || null,
        osiguranje_do: forma.osiguranje_do || null,
        osiguranje_polica: forma.osiguranje_polica.trim() || null,
      }
      if (editStavka) {
        await azurirajImovinu(editStavka.id, podaci)
      } else {
        await kreirajImovinu({ ...podaci, status: 'u_uporabi' } as ImovinaInsert)
      }
      setShowForma(false); setEditStavka(null)
      await ucitaj()
    } catch (err: unknown) {
      alert(`Greška: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async function handleObrisi(id: string) {
    if (!confirm('Obrisati stavku imovine?')) return
    try { await obrisiImovinu(id); await ucitaj() }
    catch (err) { console.error(err); alert('Greška pri brisanju.') }
  }

  async function handlePromjenaStatusa(id: string, status: string) {
    await azurirajImovinu(id, { status })
    await ucitaj()
  }

  const danas = new Date()
  function rokStatus(datum: string | null): string {
    if (!datum) return 'bg-[#2a2a2e] text-[#999]'
    const dani = Math.ceil((new Date(datum).getTime() - danas.getTime()) / 86400000)
    if (dani < 0) return 'bg-red-900/25 text-red-400'
    if (dani <= 30) return 'bg-yellow-900/25 text-yellow-400'
    return 'bg-green-900/25 text-green-400'
  }

  function fDatum(d: string | null) {
    return d ? new Date(d).toLocaleDateString('hr-HR') : '—'
  }

  const vozila = imovina.filter(i => i.vrsta === 'vozilo')
  const ostalo = imovina.filter(i => i.vrsta !== 'vozilo')

  return (
    <div>
      <PageHeader
        naslov="Imovina i vozila"
        opis={`${imovina.length} stavki`}
        akcije={<div className="flex items-center gap-2">
          <select value={filterVrsta} onChange={e => setFilterVrsta(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
            <option value="">Sve vrste</option>
            {VRSTE.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
          </select>
          {jeUpravackaUloga() && (
            <button onClick={() => otvoriFormu()} className="px-4 py-2 text-white text-sm font-medium rounded-lg" style={{ background: 'var(--accent)' }}>
              + Nova stavka
            </button>
          )}
        </div>}
      />

      {/* Forma za dodavanje/uređivanje */}
      {showForma && (
        <div className="bg-[#242428] border border-[#333338] rounded-xl p-4 mb-4">
          <h3 className="text-sm font-medium text-white mb-3">{editStavka ? `Uredi: ${editStavka.naziv}` : 'Nova imovina'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="text" value={forma.naziv} onChange={e => setForma(f => ({ ...f, naziv: e.target.value }))}
              placeholder="Naziv *" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <select value={forma.vrsta} onChange={e => setForma(f => ({ ...f, vrsta: e.target.value }))}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]">
              {VRSTE.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
            </select>
            <input type="text" value={forma.marka} onChange={e => setForma(f => ({ ...f, marka: e.target.value }))}
              placeholder="Marka/Proizvođač" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="text" value={forma.model} onChange={e => setForma(f => ({ ...f, model: e.target.value }))}
              placeholder="Model" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="text" value={forma.reg_oznaka} onChange={e => setForma(f => ({ ...f, reg_oznaka: e.target.value }))}
              placeholder="Reg. oznaka" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="text" value={forma.inventurni_broj} onChange={e => setForma(f => ({ ...f, inventurni_broj: e.target.value }))}
              placeholder="Inventurni broj" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="text" value={forma.lokacija} onChange={e => setForma(f => ({ ...f, lokacija: e.target.value }))}
              placeholder="Lokacija" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="number" value={forma.nabavna_vrijednost} onChange={e => setForma(f => ({ ...f, nabavna_vrijednost: e.target.value }))}
              placeholder="Nabavna vrijednost (EUR)" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="text" value={forma.opis} onChange={e => setForma(f => ({ ...f, opis: e.target.value }))}
              placeholder="Opis" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            {/* Rokovi za vozila */}
            {forma.vrsta === 'vozilo' && (<>
              <div>
                <label className="block text-xs text-[#999] mb-1">Registracija do</label>
                <input type="date" value={forma.registracija_do} onChange={e => setForma(f => ({ ...f, registracija_do: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">Tehnički pregled do</label>
                <input type="date" value={forma.tehnicki_do} onChange={e => setForma(f => ({ ...f, tehnicki_do: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">Osiguranje do</label>
                <input type="date" value={forma.osiguranje_do} onChange={e => setForma(f => ({ ...f, osiguranje_do: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm" />
              </div>
              <input type="text" value={forma.osiguranje_polica} onChange={e => setForma(f => ({ ...f, osiguranje_polica: e.target.value }))}
                placeholder="Broj police osiguranja" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            </>)}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSpremi} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
              {editStavka ? 'Spremi promjene' : 'Dodaj'}
            </button>
            <button onClick={() => { setShowForma(false); setEditStavka(null) }}
              className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg">Odustani</button>
          </div>
        </div>
      )}

      {loading ? <div className="p-8 text-center text-[#999]">Učitavanje...</div>
      : imovina.length === 0 ? <div className="bg-[#242428] border border-[#333338] rounded-xl p-8 text-center text-[#999]">Nema unesene imovine.</div>
      : (<>
        {/* Vozila */}
        {(filterVrsta === '' || filterVrsta === 'vozilo') && vozila.length > 0 && (
          <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden mb-4">
            <div className="px-4 py-3 bg-[#1e1e22] border-b border-[#2e2e32]">
              <span className="text-sm font-medium text-[#ddd]">Vozila ({vozila.length})</span>
            </div>
            {vozila.map(v => (
              <div key={v.id} className="border-b border-[#2e2e32] last:border-0">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#1e1e22] cursor-pointer" onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{v.naziv}</div>
                    <div className="text-xs text-[#999]">{[v.marka, v.model].filter(Boolean).join(' ')} · {v.reg_oznaka || '—'}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rokStatus(v.registracija_do)}`}>
                    Reg: {fDatum(v.registracija_do)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium hidden md:inline-flex ${rokStatus(v.osiguranje_do)}`}>
                    Osig: {fDatum(v.osiguranje_do)}
                  </span>
                  <span className="text-[#777] text-xs">{expandedId === v.id ? '▲' : '▼'}</span>
                </div>
                {expandedId === v.id && (
                  <div className="px-4 pb-4 bg-[#1e1e22] border-t border-[#2e2e32]">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-3 text-sm">
                      <div><span className="text-xs text-[#777]">Marka/Model</span><div>{[v.marka, v.model].filter(Boolean).join(' ') || '—'}</div></div>
                      <div><span className="text-xs text-[#777]">Reg. oznaka</span><div className="font-mono">{v.reg_oznaka || '—'}</div></div>
                      <div><span className="text-xs text-[#777]">Registracija do</span><div>{fDatum(v.registracija_do)}</div></div>
                      <div><span className="text-xs text-[#777]">Tehnički do</span><div>{fDatum(v.tehnicki_do)}</div></div>
                      <div><span className="text-xs text-[#777]">Osiguranje do</span><div>{fDatum(v.osiguranje_do)}</div></div>
                      <div><span className="text-xs text-[#777]">Polica</span><div>{v.osiguranje_polica || '—'}</div></div>
                      <div><span className="text-xs text-[#777]">Lokacija</span><div>{v.lokacija || '—'}</div></div>
                      <div><span className="text-xs text-[#777]">Status</span>
                        {jeUpravackaUloga() ? (
                          <select value={v.status || 'u_uporabi'} onChange={e => handlePromjenaStatusa(v.id, e.target.value)}
                            className="px-2 py-1 rounded text-xs border border-[#333338] bg-[#242428]">
                            {STATUSI.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                          </select>
                        ) : <div>{v.status?.replace('_', ' ') || '—'}</div>}
                      </div>
                    </div>
                    {v.opis && <div className="text-xs text-[#999] mb-3">{v.opis}</div>}
                    {jeUpravackaUloga() && (
                      <div className="flex gap-2">
                        <button onClick={() => otvoriFormu(v)} className="text-xs text-blue-400 hover:text-blue-800">Uredi</button>
                        <button onClick={() => handleObrisi(v.id)} className="text-xs text-red-500 hover:text-red-400">Obriši</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Ostala oprema */}
        {(filterVrsta === '' ? ostalo.length > 0 : filterVrsta !== 'vozilo' && imovina.length > 0) && (
          <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
            {filterVrsta === '' && <div className="px-4 py-3 bg-[#1e1e22] border-b border-[#2e2e32]">
              <span className="text-sm font-medium text-[#ddd]">Oprema i ostalo ({ostalo.length})</span>
            </div>}
            {(filterVrsta === '' ? ostalo : imovina).map(i => (
              <div key={i.id} className="border-b border-[#2e2e32] last:border-0">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#1e1e22] cursor-pointer" onClick={() => setExpandedId(expandedId === i.id ? null : i.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white">{i.naziv}</div>
                    {i.opis && <div className="text-xs text-[#777]">{i.opis}</div>}
                  </div>
                  <span className="text-xs text-[#999] capitalize hidden md:block">{i.lokacija || '—'}</span>
                  {i.nabavna_vrijednost && <span className="text-xs text-[#bbb]">{Number(i.nabavna_vrijednost).toFixed(2)} EUR</span>}
                  <span className="text-[#777] text-xs">{expandedId === i.id ? '▲' : '▼'}</span>
                </div>
                {expandedId === i.id && jeUpravackaUloga() && (
                  <div className="px-4 pb-3 bg-[#1e1e22] border-t border-[#2e2e32] flex gap-2">
                    <button onClick={() => otvoriFormu(i)} className="text-xs text-blue-400 hover:text-blue-800">Uredi</button>
                    <button onClick={() => handleObrisi(i.id)} className="text-xs text-red-500 hover:text-red-400">Obriši</button>
                    <select value={i.status || 'u_uporabi'} onChange={e => handlePromjenaStatusa(i.id, e.target.value)}
                      className="ml-auto px-2 py-1 rounded text-xs border border-[#333338] bg-[#242428]">
                      {STATUSI.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </>)}
    </div>
  )
}
