import { useEffect, useState } from 'react'
import { dohvatiAktivnosti, kreirajAktivnost, azurirajAktivnost, obrisiAktivnost } from '@/lib/supabase/queries/plan-rada'
import type { Aktivnost } from '@/lib/supabase/queries/plan-rada'
import { useAuthStore } from '@/store/auth.store'
import { generirajPlanRada } from '@/lib/supabase/queries/predlosci'
import { PageHeader } from '@/components/shared/PageHeader'

const tekucaGodina = new Date().getFullYear()

const KATEGORIJE = [
  'vatrogasne vježbe', 'natjecanja', 'osposobljavanje', 'zdravstveni pregledi',
  'održavanje opreme', 'održavanje vozila', 'društvene aktivnosti',
  'administrativno', 'financijsko', 'skupštine i sjednice', 'ostalo',
]

const STATUSI = [
  { value: 'planirano', label: 'Planirano', boja: 'bg-blue-900/25 text-blue-400' },
  { value: 'u_tijeku', label: 'U tijeku', boja: 'bg-yellow-900/25 text-yellow-400' },
  { value: 'zavrseno', label: 'Završeno', boja: 'bg-green-900/25 text-green-400' },
  { value: 'otkazano', label: 'Otkazano', boja: 'bg-red-900/25 text-red-400' },
]

export function PlanRada() {
  const { jeUpravackaUloga } = useAuthStore()
  const [aktivnosti, setAktivnosti] = useState<Aktivnost[]>([])
  const [loading, setLoading] = useState(true)
  const [godina, setGodina] = useState(tekucaGodina)
  const [showForma, setShowForma] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [forma, setForma] = useState({ naziv: '', kategorija: KATEGORIJE[0], rok: '', odgovoran: '', napomena: '' })
  const [filterKat, setFilterKat] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    dohvatiAktivnosti(godina)
      .then(d => { if (!cancelled) setAktivnosti(d) })
      .catch(err => { if (!cancelled) console.error(err) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [godina])

  async function ucitaj() {
    setLoading(true)
    try {
      setAktivnosti(await dohvatiAktivnosti(godina))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleSpremi() {
    if (!forma.naziv.trim()) return
    try {
      if (editId) {
        await azurirajAktivnost(editId, {
          naziv: forma.naziv.trim(), kategorija: forma.kategorija,
          rok: forma.rok || null, rok_datum: forma.rok || null,
          odgovoran: forma.odgovoran.trim() || null, napomena: forma.napomena.trim() || null,
        })
      } else {
        await kreirajAktivnost({
          naziv: forma.naziv.trim(), kategorija: forma.kategorija, godina,
          rok: forma.rok || null, rok_datum: forma.rok || null,
          odgovoran: forma.odgovoran.trim() || null, napomena: forma.napomena.trim() || null,
          status: 'planirano',
        })
      }
      setShowForma(false); setEditId(null)
      setForma({ naziv: '', kategorija: KATEGORIJE[0], rok: '', odgovoran: '', napomena: '' })
      await ucitaj()
    } catch (err) { console.error(err) }
  }

  async function handleStatus(id: string, status: string) {
    await azurirajAktivnost(id, { status })
    await ucitaj()
  }

  async function handleObrisi(id: string) {
    if (!confirm('Obrisati aktivnost?')) return
    await obrisiAktivnost(id)
    await ucitaj()
  }

  async function handleGeneriraj() {
    if (!confirm(`Generirati plan rada za ${godina} iz predložaka?`)) return
    try {
      const n = await generirajPlanRada(godina)
      alert(`Generirano ${n} aktivnosti za ${godina}.`)
      await ucitaj()
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Greška pri generiranju: ${msg}\n\nJeste li pokrenuli migraciju 005_predlosci.sql u Supabase SQL Editoru?`)
    }
  }

  function uredi(a: Aktivnost) {
    setForma({ naziv: a.naziv, kategorija: a.kategorija, rok: a.rok_datum || '', odgovoran: a.odgovoran || '', napomena: a.napomena || '' })
    setEditId(a.id); setShowForma(true)
  }

  // Grupiraj po kategorijama
  let filtrirane = aktivnosti
  if (filterKat) filtrirane = filtrirane.filter(a => a.kategorija === filterKat)

  const poKategoriji = filtrirane.reduce<Record<string, Aktivnost[]>>((acc, a) => {
    ;(acc[a.kategorija] ||= []).push(a)
    return acc
  }, {})

  // Statistike
  const ukupno = aktivnosti.length
  const zavrseno = aktivnosti.filter(a => a.status === 'zavrseno').length
  const postotak = ukupno > 0 ? Math.round((zavrseno / ukupno) * 100) : 0

  return (
    <div>
      <PageHeader
        naslov={`Plan rada ${godina}`}
        opis={`${zavrseno}/${ukupno} aktivnosti završeno (${postotak}%)`}
        akcije={<div className="flex items-center gap-2">
          <select value={godina} onChange={e => setGodina(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
            {[tekucaGodina + 1, tekucaGodina, tekucaGodina - 1, tekucaGodina - 2].map(g =>
              <option key={g} value={g}>{g}</option>
            )}
          </select>
          {jeUpravackaUloga() && aktivnosti.length === 0 && (
            <button onClick={handleGeneriraj}
              className="px-4 py-2 text-white text-sm font-medium rounded-lg" style={{ background: 'var(--success)' }}>
              Generiraj iz predložaka
            </button>
          )}
          {jeUpravackaUloga() && (
            <button onClick={() => { setShowForma(true); setEditId(null); setForma({ naziv: '', kategorija: KATEGORIJE[0], rok: '', odgovoran: '', napomena: '' }) }}
              className="px-4 py-2 text-white text-sm font-medium rounded-lg" style={{ background: 'var(--accent)' }}>
              + Nova aktivnost
            </button>
          )}
        </div>}
      />

      {/* Progress bar */}
      <div className="bg-[#242428] border border-[#333338] rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-[#bbb]">Realizacija plana</span>
          <span className="font-medium text-white">{postotak}%</span>
        </div>
        <div className="w-full bg-[#2a2a2e] rounded-full h-2.5">
          <div className="bg-green-600 h-2.5 rounded-full transition-all" style={{ width: `${postotak}%` }} />
        </div>
      </div>

      {/* Filter kategorija */}
      <div className="flex flex-wrap gap-1 mb-4">
        <button onClick={() => setFilterKat('')}
          className={`px-3 py-1 text-xs rounded-full ${!filterKat ? 'bg-red-600 text-white' : 'bg-[#2a2a2e] text-[#bbb] hover:bg-[#3a3a3e]'}`}>
          Sve
        </button>
        {KATEGORIJE.map(k => {
          const count = aktivnosti.filter(a => a.kategorija === k).length
          if (count === 0) return null
          return (
            <button key={k} onClick={() => setFilterKat(k)}
              className={`px-3 py-1 text-xs rounded-full capitalize ${filterKat === k ? 'bg-red-600 text-white' : 'bg-[#2a2a2e] text-[#bbb] hover:bg-[#3a3a3e]'}`}>
              {k} ({count})
            </button>
          )
        })}
      </div>

      {/* Forma */}
      {showForma && (
        <div className="bg-[#242428] border border-[#333338] rounded-xl p-4 mb-4">
          <h3 className="text-sm font-medium text-white mb-3">{editId ? 'Uredi aktivnost' : 'Nova aktivnost'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <input type="text" value={forma.naziv} onChange={e => setForma(f => ({ ...f, naziv: e.target.value }))}
                placeholder="Naziv aktivnosti..." className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            </div>
            <select value={forma.kategorija} onChange={e => setForma(f => ({ ...f, kategorija: e.target.value }))}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428] capitalize">
              {KATEGORIJE.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <input type="date" value={forma.rok} onChange={e => setForma(f => ({ ...f, rok: e.target.value }))}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="text" value={forma.odgovoran} onChange={e => setForma(f => ({ ...f, odgovoran: e.target.value }))}
              placeholder="Odgovorna osoba..." className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="text" value={forma.napomena} onChange={e => setForma(f => ({ ...f, napomena: e.target.value }))}
              placeholder="Napomena..." className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSpremi} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
              {editId ? 'Spremi' : 'Dodaj'}
            </button>
            <button onClick={() => { setShowForma(false); setEditId(null) }}
              className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg hover:bg-[#3a3a3e]">Odustani</button>
          </div>
        </div>
      )}

      {/* Lista po kategorijama */}
      {loading ? (
        <div className="p-8 text-center text-[#999]">Učitavanje...</div>
      ) : Object.keys(poKategoriji).length === 0 ? (
        <div className="bg-[#242428] border border-[#333338] rounded-xl p-8 text-center text-[#999]">
          Nema aktivnosti za {godina}. godinu.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(poKategoriji).map(([kat, lista]) => {
            const katZavrseno = lista.filter(a => a.status === 'zavrseno').length
            const katPostotak = Math.round((katZavrseno / lista.length) * 100)
            return (
              <div key={kat} className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#1e1e22] border-b border-[#2e2e32] flex items-center justify-between">
                  <span className="text-sm font-medium text-[#ddd] capitalize">{kat}</span>
                  <span className="text-xs text-[#999]">{katZavrseno}/{lista.length} ({katPostotak}%)</span>
                </div>
                {lista.map(a => (
                  <div key={a.id} className="px-4 py-3 border-b border-[#2a2a2e] last:border-0 flex items-center gap-3 hover:bg-[#1e1e22]">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white">{a.naziv}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {a.rok_datum && (
                          <span className="text-xs text-[#777]">{new Date(a.rok_datum).toLocaleDateString('hr-HR')}</span>
                        )}
                        {a.odgovoran && <span className="text-xs text-[#777]">· {a.odgovoran}</span>}
                      </div>
                    </div>
                    {/* Status dropdown */}
                    {jeUpravackaUloga() ? (
                      <select
                        value={a.status}
                        onChange={e => handleStatus(a.id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${STATUSI.find(s => s.value === a.status)?.boja || 'bg-[#2a2a2e] text-[#bbb]'}`}
                      >
                        {STATUSI.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUSI.find(s => s.value === a.status)?.boja || 'bg-[#2a2a2e] text-[#bbb]'}`}>
                        {STATUSI.find(s => s.value === a.status)?.label || a.status}
                      </span>
                    )}
                    {jeUpravackaUloga() && (
                      <div className="flex gap-1">
                        <button onClick={() => uredi(a)} className="text-xs text-[#777] hover:text-[#bbb]">Uredi</button>
                        <button onClick={() => handleObrisi(a.id)} className="text-xs text-red-400 hover:text-red-600">Obriši</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
