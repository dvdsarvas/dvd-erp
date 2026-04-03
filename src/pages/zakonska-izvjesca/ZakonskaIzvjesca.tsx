import { useEffect, useState } from 'react'
import { dohvatiIzvjesca, azurirajIzvjesce, generirajObvezeZaGodinu } from '@/lib/supabase/queries/zakonska-izvjesca'
import type { Izvjesce } from '@/lib/supabase/queries/zakonska-izvjesca'
import { useAuthStore } from '@/store/auth.store'
import { PageHeader } from '@/components/shared/PageHeader'

const tekucaGodina = new Date().getFullYear()

export function ZakonskaIzvjesca() {
  const { jeUpravackaUloga, jeFinancijskaUloga } = useAuthStore()
  const [izvjesca, setIzvjesca] = useState<Izvjesce[]>([])
  const [loading, setLoading] = useState(true)
  const [godina, setGodina] = useState(tekucaGodina)

  useEffect(() => { ucitaj() }, [godina])

  async function ucitaj() {
    setLoading(true)
    try { setIzvjesca(await dohvatiIzvjesca(godina)) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleGeneriraj() {
    if (!confirm(`Generirati zakonske obveze za ${godina}?`)) return
    try {
      const n = await generirajObvezeZaGodinu(godina)
      alert(`Generirano ${n} obveza za ${godina}.`)
      await ucitaj()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Greška: ${msg}`)
    }
  }

  async function handleStatus(id: string, status: string) {
    const podaci: Record<string, unknown> = { status }
    if (status === 'predano') podaci.datum_predaje = new Date().toISOString().split('T')[0]
    await azurirajIzvjesce(id, podaci)
    await ucitaj()
  }

  // Statistike
  const otvorena = izvjesca.filter(i => i.status !== 'predano').length
  const predana = izvjesca.filter(i => i.status === 'predano').length

  return (
    <div>
      <PageHeader
        naslov={`Zakonska izvješća ${godina}`}
        opis={`${predana} predano · ${otvorena} otvoreno`}
        akcije={<div className="flex items-center gap-2">
          <select value={godina} onChange={e => setGodina(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
            {[tekucaGodina + 1, tekucaGodina, tekucaGodina - 1, tekucaGodina - 2].map(g =>
              <option key={g} value={g}>{g}</option>
            )}
          </select>
          {!loading && izvjesca.length === 0 && jeUpravackaUloga() && (
            <button onClick={handleGeneriraj}
              className="px-4 py-2 text-white text-sm font-medium rounded-lg" style={{ background: 'var(--success)' }}>
              Generiraj obveze
            </button>
          )}
        </div>}
      />

      <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#999]">Učitavanje...</div>
        ) : izvjesca.length === 0 ? (
          <div className="p-8 text-center text-[#999]">Nema izvješća za {godina}.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e2e32] bg-[#1e1e22]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Izvješće</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Institucija</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Rok</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase hidden md:table-cell">Predano</th>
              </tr>
            </thead>
            <tbody>
              {izvjesca.map(iz => {
                const daniDoRoka = iz.rok ? Math.ceil((new Date(iz.rok).getTime() - Date.now()) / 86400000) : null
                return (
                  <tr key={iz.id} className="border-b border-[#2a2a2e] hover:bg-[#1e1e22]">
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{iz.naziv}</div>
                      {iz.napomena && <div className="text-xs text-[#777] mt-0.5">{iz.napomena}</div>}
                    </td>
                    <td className="px-4 py-3 text-[#bbb]">{iz.primatelj || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <SemaforDot dani={daniDoRoka} status={iz.status} />
                        <span className="text-[#bbb]">
                          {iz.rok ? new Date(iz.rok).toLocaleDateString('hr-HR') : '—'}
                        </span>
                        {daniDoRoka != null && iz.status !== 'predano' && (
                          <span className={`text-xs ${daniDoRoka < 0 ? 'text-red-600 font-medium' : daniDoRoka <= 7 ? 'text-red-500' : daniDoRoka <= 30 ? 'text-yellow-400' : 'text-[#777]'}`}>
                            {daniDoRoka < 0 ? `${Math.abs(daniDoRoka)}d kasni` : `${daniDoRoka}d`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(jeUpravackaUloga() || jeFinancijskaUloga()) ? (
                        <select
                          value={iz.status}
                          onChange={e => handleStatus(iz.id, e.target.value)}
                          className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${statusBoja(iz.status)}`}
                        >
                          <option value="nije_predano">Nije predano</option>
                          <option value="u_pripremi">U pripremi</option>
                          <option value="predano">Predano</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBoja(iz.status)}`}>
                          {statusLabel(iz.status)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#999] text-xs hidden md:table-cell">
                      {iz.datum_predaje ? new Date(iz.datum_predaje).toLocaleDateString('hr-HR') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function SemaforDot({ dani, status }: { dani: number | null; status: string }) {
  if (status === 'predano') return <span className="w-2.5 h-2.5 rounded-full bg-green-500/20 flex-shrink-0" />
  if (dani == null) return <span className="w-2.5 h-2.5 rounded-full bg-[#444] flex-shrink-0" />
  if (dani < 0) return <span className="w-2.5 h-2.5 rounded-full bg-red-600 flex-shrink-0 animate-pulse" />
  if (dani <= 7) return <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
  if (dani <= 30) return <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 flex-shrink-0" />
  return <span className="w-2.5 h-2.5 rounded-full bg-green-500/20 flex-shrink-0" />
}

function statusBoja(s: string): string {
  return s === 'predano' ? 'bg-green-900/25 text-green-400' : s === 'u_pripremi' ? 'bg-yellow-900/25 text-yellow-400' : 'bg-red-900/25 text-red-400'
}
function statusLabel(s: string): string {
  return s === 'predano' ? 'Predano' : s === 'u_pripremi' ? 'U pripremi' : 'Nije predano'
}
