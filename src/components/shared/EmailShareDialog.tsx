import { useState } from 'react'
import { posaljiEmail, blobToBase64 } from '@/lib/supabase/email'
import type { Clan } from '@/lib/supabase/queries/clanovi'

interface EmailShareDialogProps {
  open: boolean
  onClose: () => void
  clanovi: Clan[]
  predmet: string
  html: string
  tip: string
  /** Async funkcija koja generira dokument blob */
  generirajDokument: () => Promise<Blob>
  nazivDokumenta: string
}

export function EmailShareDialog({
  open, onClose, clanovi, predmet, html, tip, generirajDokument, nazivDokumenta,
}: EmailShareDialogProps) {
  const clanoviSEmailom = clanovi.filter(c => c.email)
  const bezEmaila = clanovi.length - clanoviSEmailom.length

  const [odabrani, setOdabrani] = useState<Set<string>>(new Set(clanoviSEmailom.map(c => c.id)))
  const [editPredmet, setEditPredmet] = useState(predmet)
  const [sending, setSending] = useState(false)
  const [rezultat, setRezultat] = useState<{ uspjesno: number; greske: number; error?: string } | null>(null)

  if (!open) return null

  function toggleClan(id: string) {
    setOdabrani(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function odaberiSve() {
    setOdabrani(new Set(clanoviSEmailom.map(c => c.id)))
  }

  function ponistiSve() {
    setOdabrani(new Set())
  }

  async function handlePosalji() {
    const primatelji = clanoviSEmailom
      .filter(c => odabrani.has(c.id) && c.email)
      .map(c => c.email!)

    if (primatelji.length === 0) return

    setSending(true)
    setRezultat(null)

    try {
      // Generiraj dokument
      const blob = await generirajDokument()
      const base64 = await blobToBase64(blob)

      // Pošalji
      const result = await posaljiEmail({
        primatelji,
        predmet: editPredmet,
        html,
        tip,
        prilog: {
          naziv: nazivDokumenta,
          sadrzaj: base64,
          tip: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      })

      setRezultat(result)
    } catch (err) {
      setRezultat({ uspjesno: 0, greske: primatelji.length })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#242428] rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="px-6 py-4 border-b border-[#333338] flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">Pošalji emailom</h2>
            <button onClick={onClose} className="text-[#777] hover:text-[#bbb] text-xl">&times;</button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

            {/* Rezultat */}
            {rezultat && (
              <div className={`p-3 rounded-lg text-sm ${rezultat.greske === 0 ? 'bg-green-900/20 text-green-400' : 'bg-red-50 text-red-400'}`}>
                {rezultat.greske === 0
                  ? `Uspješno poslano ${rezultat.uspjesno} emailova.`
                  : rezultat.error || `Greška pri slanju. Uspješno: ${rezultat.uspjesno}, Greške: ${rezultat.greske}`
                }
              </div>
            )}

            {/* Predmet */}
            <div>
              <label className="block text-xs text-[#999] mb-1">Predmet</label>
              <input
                type="text"
                value={editPredmet}
                onChange={e => setEditPredmet(e.target.value)}
                className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Prilog */}
            <div className="flex items-center gap-2 p-3 bg-[#1e1e22] rounded-lg">
              <span className="w-4 h-4 rounded bg-[#444] flex-shrink-0" />
              <span className="text-sm text-[#ddd]">{nazivDokumenta}</span>
            </div>

            {/* Primatelji */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-[#999]">
                  Primatelji ({odabrani.size} od {clanoviSEmailom.length})
                </label>
                <div className="flex gap-2">
                  <button onClick={odaberiSve} className="text-xs text-red-600 hover:text-red-400">Odaberi sve</button>
                  <button onClick={ponistiSve} className="text-xs text-[#999] hover:text-[#ddd]">Poništi</button>
                </div>
              </div>

              {bezEmaila > 0 && (
                <div className="text-xs text-yellow-400 bg-yellow-900/20 px-3 py-2 rounded-lg mb-2">
                  {bezEmaila} članova nema email adresu i neće primiti poruku.
                </div>
              )}

              <div className="max-h-48 overflow-y-auto border border-[#333338] rounded-lg">
                {clanoviSEmailom.map(c => (
                  <label key={c.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[#1e1e22] cursor-pointer border-b border-slate-50 last:border-0">
                    <input
                      type="checkbox"
                      checked={odabrani.has(c.id)}
                      onChange={() => toggleClan(c.id)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-[#ddd] flex-1">{c.prezime} {c.ime}</span>
                    <span className="text-xs text-[#777]">{c.email}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#333338] flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-[#bbb] hover:text-[#eee]">
              {rezultat ? 'Zatvori' : 'Odustani'}
            </button>
            {!rezultat && (
              <button
                onClick={handlePosalji}
                disabled={sending || odabrani.size === 0}
                className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {sending ? 'Slanje...' : `Pošalji (${odabrani.size})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
