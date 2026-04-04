import { useEffect, useState } from 'react'
import { dohvatiIntervencije, kreirajIntervenciju, dohvatiVjezbe, kreirajVjezbu } from '@/lib/supabase/queries/vatrogasna'
import type { Intervencija, Vjezba } from '@/lib/supabase/queries/vatrogasna'
import { useAuthStore } from '@/store/auth.store'
import { PageHeader } from '@/components/shared/PageHeader'

const tekucaGodina = new Date().getFullYear()

const VRSTE_INTERVENCIJA = ['pozar', 'tehnicka', 'preventivna', 'dezurstvo', 'ostalo']

export function VatrogasnaPage() {
  const { mozeUnositiIntervencije } = useAuthStore()
  const [tab, setTab] = useState<'intervencije' | 'vjezbe'>('intervencije')
  const [intervencije, setIntervencije] = useState<Intervencija[]>([])
  const [vjezbe, setVjezbe] = useState<Vjezba[]>([])
  const [loading, setLoading] = useState(true)
  const [godina, setGodina] = useState(tekucaGodina)
  const [showForma, setShowForma] = useState(false)
  const [formaInter, setFormaInter] = useState({ vrsta: 'pozar', kratki_opis: '', adresa: '', datum_dojave: new Date().toISOString().split('T')[0], sat_dojave: '', sat_zavrsetka: '' })
  const [formaVjezba, setFormaVjezba] = useState({ naziv: '', datum: new Date().toISOString().split('T')[0], lokacija: '', napomene: '' })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([dohvatiIntervencije(godina), dohvatiVjezbe(godina)])
      .then(([i, v]) => { if (!cancelled) { setIntervencije(i); setVjezbe(v) } })
      .catch(err => { if (!cancelled) console.error(err) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [godina])

  async function ucitaj() {
    setLoading(true)
    try {
      const [i, v] = await Promise.all([dohvatiIntervencije(godina), dohvatiVjezbe(godina)])
      setIntervencije(i); setVjezbe(v)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleDodajIntervenciju() {
    if (!formaInter.kratki_opis.trim()) return
    await kreirajIntervenciju({
      vrsta: formaInter.vrsta,
      kratki_opis: formaInter.kratki_opis.trim(),
      adresa: formaInter.adresa.trim() || null,
      datum_dojave: formaInter.datum_dojave,
      sat_dojave: formaInter.sat_dojave || null,
      sat_zavrsetka: formaInter.sat_zavrsetka || null,
    })
    setShowForma(false)
    setFormaInter({ vrsta: 'pozar', kratki_opis: '', adresa: '', datum_dojave: new Date().toISOString().split('T')[0], sat_dojave: '', sat_zavrsetka: '' })
    await ucitaj()
  }

  async function handleDodajVjezbu() {
    if (!formaVjezba.naziv.trim()) return
    await kreirajVjezbu({
      naziv: formaVjezba.naziv.trim(),
      datum: formaVjezba.datum,
      lokacija: formaVjezba.lokacija.trim() || null,
      napomene: formaVjezba.napomene.trim() || null,
    })
    setShowForma(false)
    setFormaVjezba({ naziv: '', datum: new Date().toISOString().split('T')[0], lokacija: '', napomene: '' })
    await ucitaj()
  }

  const vrstaBoja: Record<string, string> = {
    pozar: 'bg-red-900/25 text-red-400',
    tehnicka: 'bg-blue-900/25 text-blue-400',
    preventivna: 'bg-green-900/25 text-green-400',
    dezurstvo: 'bg-yellow-900/25 text-yellow-400',
    ostalo: 'bg-[#2a2a2e] text-[#bbb]',
  }

  return (
    <div>
      <PageHeader
        naslov={`Vatrogasna djelatnost ${godina}`}
        opis={`${intervencije.length} intervencija · ${vjezbe.length} vježbi`}
        akcije={<div className="flex items-center gap-2">
          <select value={godina} onChange={e => setGodina(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
            {[tekucaGodina, tekucaGodina - 1, tekucaGodina - 2].map(g =>
              <option key={g} value={g}>{g}</option>)}
          </select>
          {mozeUnositiIntervencije() && (
            <button onClick={() => setShowForma(true)}
              className="px-4 py-2 text-white text-sm font-medium rounded-lg" style={{ background: 'var(--accent)' }}>
              + {tab === 'intervencije' ? 'Nova intervencija' : 'Nova vježba'}
            </button>
          )}
        </div>}
      />

      {/* Tabovi */}
      <div className="border-b border-[#333338] mb-6">
        <nav className="flex gap-1 -mb-px">
          <button onClick={() => { setTab('intervencije'); setShowForma(false) }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 ${tab === 'intervencije' ? 'border-red-600 text-red-400' : 'border-transparent text-[#999] hover:text-[#ddd]'}`}>
            Intervencije ({intervencije.length})
          </button>
          <button onClick={() => { setTab('vjezbe'); setShowForma(false) }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 ${tab === 'vjezbe' ? 'border-red-600 text-red-400' : 'border-transparent text-[#999] hover:text-[#ddd]'}`}>
            Vježbe ({vjezbe.length})
          </button>
        </nav>
      </div>

      {/* Forme */}
      {showForma && tab === 'intervencije' && (
        <div className="bg-[#242428] border border-[#333338] rounded-xl p-4 mb-4">
          <h3 className="text-sm font-medium text-white mb-3">Nova intervencija</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={formaInter.vrsta} onChange={e => setFormaInter(f => ({ ...f, vrsta: e.target.value }))}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428] capitalize">
              {VRSTE_INTERVENCIJA.map(v => <option key={v} value={v}>{v === 'pozar' ? 'Požar' : v === 'tehnicka' ? 'Tehnička' : v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
            </select>
            <input type="date" value={formaInter.datum_dojave} onChange={e => setFormaInter(f => ({ ...f, datum_dojave: e.target.value }))}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="text" value={formaInter.adresa} onChange={e => setFormaInter(f => ({ ...f, adresa: e.target.value }))}
              placeholder="Adresa/lokacija" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <div className="md:col-span-2">
              <input type="text" value={formaInter.kratki_opis} onChange={e => setFormaInter(f => ({ ...f, kratki_opis: e.target.value }))}
                placeholder="Kratki opis *" className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            </div>
            <div className="flex gap-2">
              <input type="time" value={formaInter.sat_dojave} onChange={e => setFormaInter(f => ({ ...f, sat_dojave: e.target.value }))}
                className="flex-1 px-3 py-2 border border-[#333338] rounded-lg text-sm" placeholder="Dojava" />
              <input type="time" value={formaInter.sat_zavrsetka} onChange={e => setFormaInter(f => ({ ...f, sat_zavrsetka: e.target.value }))}
                className="flex-1 px-3 py-2 border border-[#333338] rounded-lg text-sm" placeholder="Završetak" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleDodajIntervenciju} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Dodaj</button>
            <button onClick={() => setShowForma(false)} className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg">Odustani</button>
          </div>
        </div>
      )}

      {showForma && tab === 'vjezbe' && (
        <div className="bg-[#242428] border border-[#333338] rounded-xl p-4 mb-4">
          <h3 className="text-sm font-medium text-white mb-3">Nova vježba</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" value={formaVjezba.naziv} onChange={e => setFormaVjezba(f => ({ ...f, naziv: e.target.value }))}
              placeholder="Naziv vježbe *" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="date" value={formaVjezba.datum} onChange={e => setFormaVjezba(f => ({ ...f, datum: e.target.value }))}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="text" value={formaVjezba.lokacija} onChange={e => setFormaVjezba(f => ({ ...f, lokacija: e.target.value }))}
              placeholder="Lokacija" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="text" value={formaVjezba.napomene} onChange={e => setFormaVjezba(f => ({ ...f, napomene: e.target.value }))}
              placeholder="Napomene" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleDodajVjezbu} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Dodaj</button>
            <button onClick={() => setShowForma(false)} className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg">Odustani</button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? <div className="p-8 text-center text-[#999]">Učitavanje...</div>
      : tab === 'intervencije' ? (
        <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
          {intervencije.length === 0 ? <div className="p-8 text-center text-[#999]">Nema intervencija za {godina}.</div> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2e2e32] bg-[#1e1e22]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Datum</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Vrsta</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Opis</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase hidden md:table-cell">Lokacija</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase hidden md:table-cell">Vrijeme</th>
                </tr>
              </thead>
              <tbody>
                {intervencije.map(i => (
                  <tr key={i.id} className="border-b border-[#2a2a2e] hover:bg-[#1e1e22]">
                    <td className="px-4 py-3 text-[#bbb]">{new Date(i.datum_dojave).toLocaleDateString('hr-HR')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${vrstaBoja[i.vrsta] || 'bg-[#2a2a2e] text-[#bbb]'}`}>
                        {i.vrsta === 'pozar' ? 'Požar' : i.vrsta === 'tehnicka' ? 'Tehnička' : i.vrsta}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white">{i.kratki_opis || '—'}</td>
                    <td className="px-4 py-3 text-[#bbb] hidden md:table-cell">{i.adresa || '—'}</td>
                    <td className="px-4 py-3 text-[#999] text-xs hidden md:table-cell">
                      {i.sat_dojave && i.sat_zavrsetka ? `${i.sat_dojave} — ${i.sat_zavrsetka}` : i.sat_dojave || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
          {vjezbe.length === 0 ? <div className="p-8 text-center text-[#999]">Nema vježbi za {godina}.</div> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2e2e32] bg-[#1e1e22]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Datum</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Naziv</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase hidden md:table-cell">Lokacija</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase hidden md:table-cell">Napomene</th>
                </tr>
              </thead>
              <tbody>
                {vjezbe.map(v => (
                  <tr key={v.id} className="border-b border-[#2a2a2e] hover:bg-[#1e1e22]">
                    <td className="px-4 py-3 text-[#bbb]">{new Date(v.datum).toLocaleDateString('hr-HR')}</td>
                    <td className="px-4 py-3 text-white font-medium">{v.naziv}</td>
                    <td className="px-4 py-3 text-[#bbb] hidden md:table-cell">{v.lokacija || '—'}</td>
                    <td className="px-4 py-3 text-[#999] text-xs hidden md:table-cell">{v.napomene || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
