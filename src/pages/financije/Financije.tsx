import { useEffect, useState } from 'react'
import {
  dohvatiFinPlan, dohvatiStavkePlana, azurirajStavku,
} from '@/lib/supabase/queries/financije'
import type { FinPlan, FinStavka } from '@/lib/supabase/queries/financije'
import { useAuthStore } from '@/store/auth.store'
import { generirajFinancijskiPlan } from '@/lib/supabase/queries/predlosci'

const tekucaGodina = new Date().getFullYear()

export function Financije() {
  const { jeFinancijskaUloga } = useAuthStore()
  const [plan, setPlan] = useState<FinPlan | null>(null)
  const [stavke, setStavke] = useState<FinStavka[]>([])
  const [loading, setLoading] = useState(true)
  const [godina, setGodina] = useState(tekucaGodina)
  const [editId, setEditId] = useState<string | null>(null)
  const [editIznos, setEditIznos] = useState('')

  useEffect(() => { ucitaj() }, [godina])

  async function ucitaj() {
    setLoading(true)
    try {
      const p = await dohvatiFinPlan(godina).catch(() => null)
      setPlan(p)
      if (p) {
        const s = await dohvatiStavkePlana(p.id).catch(() => [] as FinStavka[])
        setStavke(s)
      } else {
        setStavke([])
      }
    } catch (err) { console.error(err); setPlan(null); setStavke([]) }
    finally { setLoading(false) }
  }

  async function handleGeneriraj() {
    if (!confirm(`Generirati financijski plan za ${godina} iz predložaka?`)) return
    try {
      await generirajFinancijskiPlan(godina)
      alert(`Financijski plan za ${godina} je generiran.`)
      await ucitaj()
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Greška pri generiranju: ${msg}\n\nJeste li pokrenuli migraciju 005_predlosci.sql u Supabase SQL Editoru?`)
    }
  }

  async function handleSpremiIznos(id: string) {
    const iznos = parseFloat(editIznos.replace(',', '.'))
    if (isNaN(iznos)) return
    await azurirajStavku(id, { iznos_ostvareno: iznos })
    setEditId(null); await ucitaj()
  }

  const ukupnoPlan = stavke.filter(s => s.kategorija === 'prihod').reduce((a, s) => a + (s.iznos_plan || 0), 0)
  const ukupnoOstvareno = stavke.filter(s => s.kategorija === 'prihod').reduce((a, s) => a + (s.iznos_ostvareno || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-white">Financije {godina}</h1>
          <p className="text-sm text-[#999] mt-0.5">
            {plan ? `Plan: ${fEUR(ukupnoPlan)} · Ostvareno: ${fEUR(ukupnoOstvareno)}` : 'Nema financijskog plana'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={godina} onChange={e => setGodina(Number(e.target.value))}
            className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]">
            {[tekucaGodina + 1, tekucaGodina, tekucaGodina - 1, tekucaGodina - 2].map(g =>
              <option key={g} value={g}>{g}</option>)}
          </select>
          {!plan && !loading && jeFinancijskaUloga() && (
            <button onClick={handleGeneriraj}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
              Generiraj plan
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-[#333338] mb-6">
      </div>

      {loading ? <div className="p-8 text-center text-[#999]">Učitavanje...</div>
      : (
        <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
          {stavke.length === 0 ? <div className="p-8 text-center text-[#999]">Nema stavki plana za {godina}.</div> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2e2e32] bg-[#1e1e22]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Konto</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Stavka</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#999] uppercase">Planirano</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#999] uppercase">Ostvareno</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#999] uppercase">%</th>
                </tr>
              </thead>
              <tbody>
                {stavke.map(s => {
                  const pl = s.iznos_plan || 0
                  const ost = s.iznos_ostvareno || 0
                  const pct = pl > 0 ? Math.round((ost / pl) * 100) : 0
                  const isPrihod = s.kategorija === 'prihod'
                  return (
                    <tr key={s.id} className="border-b border-[#2a2a2e] hover:bg-[#1e1e22]">
                      <td className="px-4 py-2 text-xs text-[#777] font-mono">{s.racunski_plan_konto || '—'}</td>
                      <td className="px-4 py-2 text-white">{s.naziv_stavke}</td>
                      <td className="px-4 py-2 text-right text-[#bbb]">{fEUR(pl)}</td>
                      <td className="px-4 py-2 text-right">
                        {editId === s.id ? (
                          <div className="flex justify-end gap-1">
                            <input type="text" value={editIznos} onChange={e => setEditIznos(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSpremiIznos(s.id)}
                              className="w-24 px-2 py-1 border border-[#333338] rounded text-sm text-right" autoFocus />
                            <button onClick={() => handleSpremiIznos(s.id)} className="text-xs text-green-400">✓</button>
                            <button onClick={() => setEditId(null)} className="text-xs text-[#777]">✕</button>
                          </div>
                        ) : (
                          <span
                            onClick={() => { if (jeFinancijskaUloga()) { setEditId(s.id); setEditIznos(String(ost)) } }}
                            className={`${jeFinancijskaUloga() ? 'cursor-pointer hover:text-red-600' : ''} ${isPrihod ? 'text-green-400' : 'text-[#ddd]'}`}>
                            {fEUR(ost)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={`text-xs ${pct >= 100 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-[#777]'}`}>{pct}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function fEUR(iznos: number): string {
  return new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(iznos)
}
