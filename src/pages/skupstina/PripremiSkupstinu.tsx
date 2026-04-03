import { useState } from 'react'
import { motion } from 'framer-motion'
import { saveAs } from 'file-saver'
import { provjeriSpremnostSkupstine, generirajSkupstinuPaket, type SkupstinaPaket } from '@/lib/documents/skupstina-paket'
import { PageHeader } from '@/components/shared/PageHeader'
import { fadeUp } from '@/lib/animations'

const tekucaGodina = new Date().getFullYear()

export function PripremiSkupstinu() {
  const [godina, setGodina] = useState(tekucaGodina - 1) // izvještajna za prošlu godinu
  const [step, setStep] = useState<'provjera' | 'generiranje' | 'gotovo'>('provjera')
  const [greske, setGreske] = useState<string[]>([])
  const [progress, setProgress] = useState('')
  const [loading, setLoading] = useState(false)
  const [paket, setPaket] = useState<SkupstinaPaket | null>(null)

  async function handleProvjeri() {
    setLoading(true)
    const status = await provjeriSpremnostSkupstine(godina)
    setGreske(status.greske)
    if (status.gotovo) setStep('generiranje')
    setLoading(false)
  }

  async function handleGeneriraj() {
    setLoading(true)
    setProgress('Početak...')
    try {
      const p = await generirajSkupstinuPaket(godina, setProgress)
      setPaket(p)
      setStep('gotovo')
    } catch (err) {
      setGreske([`Greška: ${err instanceof Error ? err.message : String(err)}`])
    } finally {
      setLoading(false)
    }
  }

  function preuzmiDokument(blob: Blob, naziv: string) {
    saveAs(blob, naziv)
  }

  function preuzmiSve() {
    if (!paket) return
    const docs = [
      { blob: paket.izvjesce_o_radu, naziv: `Izvjesce_o_radu_${godina}.docx` },
      { blob: paket.financijsko_izvjesce, naziv: `Financijsko_izvjesce_${godina}.docx` },
      { blob: paket.plan_rada_iduca, naziv: `Plan_rada_${godina + 1}.docx` },
      { blob: paket.financijski_plan_iduca, naziv: `Financijski_plan_${godina + 1}.docx` },
      { blob: paket.poziv_skupstini, naziv: `Poziv_skupstina_${godina}.docx` },
      { blob: paket.upisnica, naziv: `Upisnica_clanova.docx` },
    ]
    docs.forEach((d, i) => {
      setTimeout(() => saveAs(d.blob, d.naziv), i * 300)
    })
  }

  return (
    <div>
      <PageHeader
        naslov="Pripremi skupštinu"
        opis={`Automatsko generiranje svih dokumenata za izvještajnu skupštinu ${godina}.`}
      />

      {/* Odabir godine */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="border rounded-xl p-5 mb-6"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Izvještajna godina</label>
            <select value={godina} onChange={e => { setGodina(Number(e.target.value)); setStep('provjera'); setGreske([]) }}
              className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)' }}>
              {[tekucaGodina - 1, tekucaGodina - 2, tekucaGodina].map(g =>
                <option key={g} value={g}>{g}</option>
              )}
            </select>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Skupština izvještava za {godina}., a usvaja planove za {godina + 1}. godinu.
          </div>
        </div>
      </motion.div>

      {/* Step 1: Provjera */}
      {step === 'provjera' && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}
          className="border rounded-xl p-6 mb-6"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Korak 1: Provjera spremnosti
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Sustav provjerava jesu li svi potrebni podaci uneseni za generiranje dokumenata.
          </p>

          {greske.length > 0 && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--danger)' }}>Nedostaju podaci:</p>
              <ul className="space-y-1">
                {greske.map((g, i) => (
                  <li key={i} className="text-xs" style={{ color: 'var(--danger)' }}>- {g}</li>
                ))}
              </ul>
            </div>
          )}

          <button onClick={handleProvjeri} disabled={loading}
            className="px-5 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            style={{ background: 'var(--accent)' }}>
            {loading ? 'Provjera...' : 'Provjeri spremnost'}
          </button>
        </motion.div>
      )}

      {/* Step 2: Generiranje */}
      {step === 'generiranje' && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}
          className="border rounded-xl p-6 mb-6"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium" style={{ color: 'var(--success)' }}>Svi podaci su spremni!</p>
          </div>

          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Korak 2: Generiranje dokumenata
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Generirat će se 6 .docx dokumenata. Možete ih zatim pregledati i urediti prije tiskanja.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <div>1. Izvješće o radu za {godina}.</div>
            <div>2. Financijsko izvješće za {godina}.</div>
            <div>3. Plan rada za {godina + 1}.</div>
            <div>4. Financijski plan za {godina + 1}.</div>
            <div>5. Poziv za skupštinu</div>
            <div>6. Upisnica članova</div>
          </div>

          {progress && (
            <div className="text-xs mb-3" style={{ color: 'var(--text-accent)' }}>{progress}</div>
          )}

          <button onClick={handleGeneriraj} disabled={loading}
            className="px-5 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            style={{ background: 'var(--accent)' }}>
            {loading ? 'Generiranje...' : 'Generiraj sve dokumente'}
          </button>
        </motion.div>
      )}

      {/* Step 3: Gotovo — preuzimanje */}
      {step === 'gotovo' && paket && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}
          className="border rounded-xl p-6"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium" style={{ color: 'var(--success)' }}>
              6 dokumenata generirano!
            </p>
          </div>

          <div className="space-y-2 mb-6">
            {[
              { blob: paket.izvjesce_o_radu, naziv: `Izvjesce_o_radu_${godina}.docx`, label: `Izvješće o radu ${godina}` },
              { blob: paket.financijsko_izvjesce, naziv: `Financijsko_izvjesce_${godina}.docx`, label: `Financijsko izvješće ${godina}` },
              { blob: paket.plan_rada_iduca, naziv: `Plan_rada_${godina + 1}.docx`, label: `Plan rada ${godina + 1}` },
              { blob: paket.financijski_plan_iduca, naziv: `Financijski_plan_${godina + 1}.docx`, label: `Financijski plan ${godina + 1}` },
              { blob: paket.poziv_skupstini, naziv: `Poziv_skupstina_${godina}.docx`, label: 'Poziv za skupštinu' },
              { blob: paket.upisnica, naziv: `Upisnica_clanova.docx`, label: 'Upisnica članova' },
            ].map((d, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" animate="visible" custom={i}
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{d.label}</span>
                <button onClick={() => preuzmiDokument(d.blob, d.naziv)}
                  className="text-xs font-medium px-3 py-1 rounded-lg"
                  style={{ background: 'var(--bg-overlay)', color: 'var(--text-accent)' }}>
                  Preuzmi .docx
                </button>
              </motion.div>
            ))}
          </div>

          <button onClick={preuzmiSve}
            className="px-5 py-2 text-white text-sm font-medium rounded-lg"
            style={{ background: 'var(--accent)' }}>
            Preuzmi sve (6 dokumenata)
          </button>
        </motion.div>
      )}
    </div>
  )
}
