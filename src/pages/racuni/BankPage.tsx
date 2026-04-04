import { useState, useRef } from 'react'
import { parsiraCSV, type BankTransakcija } from '@/lib/utils/bank-parser'
import { supabase } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/PageHeader'

export function BankPage() {
  const [transakcije, setTransakcije] = useState<BankTransakcija[]>([])
  const [greska, setGreska] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setGreska('')
    setSaved(false)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string
        const parsed = parsiraCSV(csv)
        if (parsed.length === 0) {
          setGreska('Nema valjanih transakcija u datoteci.')
          return
        }
        setTransakcije(parsed)
      } catch (err) {
        setGreska(err instanceof Error ? err.message : 'Greška pri parsiranju CSV datoteke.')
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  async function handleSpremi() {
    if (transakcije.length === 0) return
    setUploading(true)
    try {
      const { error } = await supabase
        .from('bank_transakcije')
        .insert(transakcije.map(t => ({
          datum: t.datum,
          iznos: t.iznos,
          tip: t.tip,
          opis: t.opis,
          referenca: t.referenca,
          izvor: 'csv_upload',
          status: 'nespojeno',
        })))
      if (error) throw error
      setSaved(true)
      setTransakcije([])
    } catch (err) {
      setGreska(err instanceof Error ? err.message : 'Greška pri spremanju.')
    } finally {
      setUploading(false)
    }
  }

  const ukupnoPrihod = transakcije.filter(t => t.tip === 'prihod').reduce((a, t) => a + t.iznos, 0)
  const ukupnoRashod = transakcije.filter(t => t.tip === 'rashod').reduce((a, t) => a + t.iznos, 0)

  return (
    <div>
      <PageHeader
        naslov="Import bankovnog izvatka"
        opis="Upload CSV datoteke iz Erste, PBZ, ZABA ili druge banke"
      />

      {/* Upload zona */}
      <div
        className="border-2 border-dashed rounded-xl p-8 mb-6 text-center transition-colors cursor-pointer"
        style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-elevated)' }}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
      >
        <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
        <div className="text-3xl mb-2">&#128196;</div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Kliknite ili povucite CSV datoteku ovdje
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Podržani formati: Erste, PBZ, ZABA, generički CSV (separator ; ili ,)
        </p>
      </div>

      {greska && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
          {greska}
        </div>
      )}

      {saved && (
        <div className="bg-green-900/20 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg mb-4">
          {transakcije.length === 0 ? 'Transakcije uspješno spremljene!' : ''}
        </div>
      )}

      {/* Pregled parsiranih transakcija */}
      {transakcije.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Parsirano: {transakcije.length} transakcija
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Prihodi: <span style={{ color: 'var(--success)' }}>{fEUR(ukupnoPrihod)}</span> ·
                Rashodi: <span style={{ color: 'var(--danger)' }}>{fEUR(ukupnoRashod)}</span>
              </p>
            </div>
            <button onClick={handleSpremi} disabled={uploading}
              className="px-5 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              style={{ background: 'var(--accent)' }}>
              {uploading ? 'Spremanje...' : 'Spremi u sustav'}
            </button>
          </div>

          <div className="border rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                    <th className="text-left px-3 py-3 uppercase" style={{ color: 'var(--text-secondary)' }}>#</th>
                    <th className="text-left px-3 py-3 uppercase" style={{ color: 'var(--text-secondary)' }}>Datum</th>
                    <th className="text-left px-3 py-3 uppercase" style={{ color: 'var(--text-secondary)' }}>Tip</th>
                    <th className="text-left px-3 py-3 uppercase" style={{ color: 'var(--text-secondary)' }}>Opis</th>
                    <th className="text-right px-3 py-3 uppercase" style={{ color: 'var(--text-secondary)' }}>Iznos</th>
                  </tr>
                </thead>
                <tbody>
                  {transakcije.map((t, i) => (
                    <tr key={i} className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(t.datum).toLocaleDateString('hr-HR')}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          t.tip === 'prihod' ? 'bg-green-900/25 text-green-400' : 'bg-red-900/25 text-red-400'
                        }`}>{t.tip}</span>
                      </td>
                      <td className="px-3 py-2 max-w-[300px] truncate" style={{ color: 'var(--text-primary)' }}>{t.opis}</td>
                      <td className="px-3 py-2 text-right font-medium" style={{ color: t.tip === 'prihod' ? 'var(--success)' : 'var(--text-primary)' }}>
                        {t.tip === 'prihod' ? '+' : '-'}{fEUR(t.iznos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fEUR(iznos: number): string {
  return new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(iznos)
}
