import { useEffect, useState, useRef } from 'react'
import {
  dohvatiRacune, kreirajRacun, azurirajRacun, likvidirajRacun, platiRacun,
  uploadRacunDokument, dohvatiDokumenteRacuna, dohvatiDokumentUrl,
} from '@/lib/supabase/queries/financije'
import type { Racun } from '@/lib/supabase/queries/financije'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase/client'

const tekucaGodina = new Date().getFullYear()

function fEUR(iznos: number): string {
  return new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(iznos)
}

export function RacuniPage() {
  const { korisnik, jeFinancijskaUloga } = useAuthStore()
  const [racuni, setRacuni] = useState<Racun[]>([])
  const [loading, setLoading] = useState(true)
  const [godina, setGodina] = useState(tekucaGodina)
  const [filterStatus, setFilterStatus] = useState('')
  const [showForma, setShowForma] = useState(false)
  const [forma, setForma] = useState({ naziv_stranke: '', datum_racuna: new Date().toISOString().split('T')[0], iznos_ukupno: '', opis: '' })
  const [formaDatoteka, setFormaDatoteka] = useState<File | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [docs, setDocs] = useState<Record<string, { id: string; naziv: string; storage_path: string }[]>>({})
  const [uploading, setUploading] = useState(false)
  const [odabrani, setOdabrani] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)
  const formFileRef = useRef<HTMLInputElement>(null)

  const jePredsjednik = korisnik?.uloga === 'admin' || korisnik?.uloga === 'predsjednik'

  useEffect(() => { ucitaj() }, [godina, filterStatus])

  async function ucitaj() {
    setLoading(true)
    try {
      setRacuni(await dohvatiRacune(godina, filterStatus || undefined))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  /** Auto-generira interni broj: URA-2026-001 (ulazni račun) */
  function generirajBrojRacuna(): string {
    const postojeci = racuni.filter(r => r.interni_broj?.startsWith(`URA-${godina}`))
    const sljedeci = postojeci.length + 1
    return `URA-${godina}-${String(sljedeci).padStart(3, '0')}`
  }

  async function handleDodaj() {
    if (!forma.naziv_stranke.trim()) { alert('Unesite naziv stranke.'); return }
    if (!forma.iznos_ukupno || isNaN(parseFloat(forma.iznos_ukupno))) { alert('Unesite ispravan iznos.'); return }
    try {
      const racun = await kreirajRacun({
        vrsta: 'ulazni',
        interni_broj: generirajBrojRacuna(),
        naziv_stranke: forma.naziv_stranke.trim(),
        datum_racuna: forma.datum_racuna,
        iznos_ukupno: parseFloat(forma.iznos_ukupno),
        opis: forma.opis.trim() || null,
        status: 'primljeno',
      })
      if (formaDatoteka) {
        await uploadRacunDokument(racun.id, formaDatoteka)
      }
      setShowForma(false)
      setForma({ naziv_stranke: '', datum_racuna: new Date().toISOString().split('T')[0], iznos_ukupno: '', opis: '' })
      setFormaDatoteka(null)
      await ucitaj()
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? (err as any).message : JSON.stringify(err)
      console.error('Račun greška:', err)
      alert(`Greška: ${msg}`)
    }
  }

  async function handleLikvidacija(id: string) {
    if (!korisnik || !confirm('Likvidirati račun? Nakon likvidacije račun se ne može mijenjati.')) return
    await likvidirajRacun(id, korisnik.id)
    await ucitaj()
  }

  async function handlePlacanje(id: string) {
    if (!confirm('Označiti račun kao plaćen?')) return
    await platiRacun(id)
    await ucitaj()
  }

  async function handleUpload(racunId: string, file: File) {
    setUploading(true)
    try { await uploadRacunDokument(racunId, file); await ucitajDocs(racunId) }
    catch (err) { console.error(err); alert('Greška pri uploadu') }
    finally { setUploading(false) }
  }

  async function ucitajDocs(racunId: string) {
    const d = await dohvatiDokumenteRacuna(racunId)
    setDocs(prev => ({ ...prev, [racunId]: d }))
  }

  async function otvoriDokument(path: string) {
    const url = await dohvatiDokumentUrl(path)
    if (url) window.open(url, '_blank')
  }

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null) }
    else { setExpandedId(id); if (!docs[id]) ucitajDocs(id) }
  }

  function toggleOdabir(id: string) {
    setOdabrani(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  async function handlePosaljiKnjigov() {
    const odabraniRacuni = racuni.filter(r => odabrani.has(r.id))
    if (odabraniRacuni.length === 0) return
    const popis = odabraniRacuni.map((r, i) =>
      `${i + 1}. ${r.interni_broj || 'b/b'} — ${r.naziv_stranke} — ${new Date(r.datum_racuna).toLocaleDateString('hr-HR')} — ${Number(r.iznos_ukupno).toFixed(2)} EUR`
    ).join('\n')
    const ukupno = odabraniRacuni.reduce((a, r) => a + Number(r.iznos_ukupno), 0)
    const subject = `DVD Sarvaš — Računi za knjiženje (${odabraniRacuni.length} kom)`
    const body = `Poštovani,%0D%0A%0D%0AŠaljem ${odabraniRacuni.length} računa za knjiženje:%0D%0A%0D%0A${encodeURIComponent(popis)}%0D%0A%0D%0AUkupno: ${ukupno.toFixed(2)} EUR%0D%0A%0D%0AS poštovanjem,%0D%0ADVD Sarvaš`
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${body}`, '_blank')
    for (const r of odabraniRacuni) {
      if (r.status === 'primljeno') await azurirajRacun(r.id, { status: 'u_obradi' })
    }
    setOdabrani(new Set())
    await ucitaj()
  }

  const statusBoja: Record<string, string> = {
    primljeno: 'bg-yellow-900/25 text-yellow-400', u_obradi: 'bg-orange-900/25 text-orange-400',
    odobreno: 'bg-blue-900/25 text-blue-400', placeno: 'bg-green-900/25 text-green-400', odbijeno: 'bg-red-900/25 text-red-400',
  }
  const statusLabel: Record<string, string> = {
    primljeno: 'Primljeno', u_obradi: 'Poslano knjigovođi', odobreno: 'Likvidirano', placeno: 'Plaćeno', odbijeno: 'Odbijeno',
  }

  const neplaceni = racuni.filter(r => r.status !== 'placeno' && r.status !== 'odbijeno')
  const ukupnoNeplaceno = neplaceni.reduce((a, r) => a + Number(r.iznos_ukupno), 0)

  return (
    <div>
      {/* Zaglavlje */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-white">Računi {godina}</h1>
          <p className="text-sm text-[#999] mt-0.5">
            {racuni.length} računa · Neplaćeno: {fEUR(ukupnoNeplaceno)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]">
            <option value="">Svi statusi</option>
            <option value="primljeno">Primljeno</option>
            <option value="u_obradi">Poslano knjigovođi</option>
            <option value="odobreno">Likvidirano</option>
            <option value="placeno">Plaćeno</option>
          </select>
          <select value={godina} onChange={e => setGodina(Number(e.target.value))}
            className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]">
            {[tekucaGodina, tekucaGodina - 1, tekucaGodina - 2].map(g =>
              <option key={g} value={g}>{g}</option>)}
          </select>
          {jeFinancijskaUloga() && (
            <button onClick={() => setShowForma(true)}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
              + Novi račun
            </button>
          )}
        </div>
      </div>

      {/* Forma za novi račun */}
      {showForma && (
        <div className="bg-[#242428] border border-[#333338] rounded-xl p-4 mb-4">
          <h3 className="text-sm font-medium text-white mb-1">Novi račun</h3>
          <p className="text-xs text-[#777] mb-3">Interni broj: <span className="font-mono">{generirajBrojRacuna()}</span> (automatski)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="text" value={forma.naziv_stranke} onChange={e => setForma(f => ({ ...f, naziv_stranke: e.target.value }))}
              placeholder="Naziv stranke (dobavljač) *" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="date" value={forma.datum_racuna} onChange={e => setForma(f => ({ ...f, datum_racuna: e.target.value }))}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="number" step="0.01" value={forma.iznos_ukupno} onChange={e => setForma(f => ({ ...f, iznos_ukupno: e.target.value }))}
              placeholder="Iznos (EUR) *" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="text" value={forma.opis} onChange={e => setForma(f => ({ ...f, opis: e.target.value }))}
              placeholder="Opis / napomena" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <div className="md:col-span-2">
              <input ref={formFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.xml"
                onChange={e => setFormaDatoteka(e.target.files?.[0] || null)}
                className="text-sm text-[#bbb] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#2a2a2e] file:text-[#ddd] hover:file:bg-slate-200" />
              {formaDatoteka && <div className="text-xs text-green-400 mt-1">{formaDatoteka.name}</div>}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleDodaj} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Spremi račun</button>
            <button onClick={() => { setShowForma(false); setFormaDatoteka(null) }} className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg">Odustani</button>
          </div>
        </div>
      )}

      {/* Skupno slanje knjigovođi */}
      {odabrani.size > 0 && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-blue-800">{odabrani.size} računa odabrano</span>
          <button onClick={handlePosaljiKnjigov}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
            Pošalji knjigovođi
          </button>
        </div>
      )}

      {/* Lista računa */}
      <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-[#999]">Učitavanje...</div>
        : racuni.length === 0 ? <div className="p-8 text-center text-[#999]">Nema računa za {godina}.</div>
        : (
          <div>
            {racuni.map(r => {
              const expanded = expandedId === r.id
              const mozelikvidirati = jePredsjednik && (r.status === 'primljeno' || r.status === 'u_obradi')
              const mozeplatiti = jeFinancijskaUloga() && r.status === 'odobreno'
              const zakljucan = r.status === 'placeno'

              return (
                <div key={r.id} className={`border-b border-[#2e2e32] last:border-0 ${zakljucan ? 'bg-[#1e1e22]/50' : ''}`}>
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#1e1e22]">
                    <input type="checkbox" checked={odabrani.has(r.id)}
                      onChange={() => toggleOdabir(r.id)}
                      className="rounded border-slate-300 text-blue-400 focus:ring-blue-500" />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(r.id)}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[#777]">{r.interni_broj || '—'}</span>
                        <span className="text-sm font-medium text-white">{r.naziv_stranke}</span>
                      </div>
                      <div className="text-xs text-[#999] mt-0.5">
                        {new Date(r.datum_racuna).toLocaleDateString('hr-HR')}
                        {r.broj_racuna && ` · Br: ${r.broj_racuna}`}
                        {r.opis && ` · ${r.opis}`}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-white whitespace-nowrap">{fEUR(Number(r.iznos_ukupno))}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusBoja[r.status] || 'bg-[#2a2a2e]'}`}>
                      {statusLabel[r.status] || r.status}
                    </span>
                    <span className="text-[#777] text-xs cursor-pointer" onClick={() => toggleExpand(r.id)}>{expanded ? '▲' : '▼'}</span>
                  </div>

                  {expanded && (
                    <div className="px-4 pb-4 bg-[#1e1e22] border-t border-[#2e2e32]">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-3 text-sm">
                        <div><span className="text-xs text-[#777]">Interni broj</span><div className="font-mono">{r.interni_broj || '—'}</div></div>
                        <div><span className="text-xs text-[#777]">Datum računa</span><div>{new Date(r.datum_racuna).toLocaleDateString('hr-HR')}</div></div>
                        <div><span className="text-xs text-[#777]">Dospijeće</span><div>{r.datum_dospijeća ? new Date(r.datum_dospijeća).toLocaleDateString('hr-HR') : '—'}</div></div>
                        <div><span className="text-xs text-[#777]">Plaćeno</span><div>{r.datum_placanja ? new Date(r.datum_placanja).toLocaleDateString('hr-HR') : '—'}</div></div>
                      </div>

                      {(r.status === 'odobreno' || r.status === 'placeno') && (
                        <div className="text-xs text-[#999] bg-[#2a2a2e] px-3 py-2 rounded mb-3">
                          {r.status === 'placeno' ? 'Plaćen' : 'Likvidiran'}
                          {r.datum_odobravanja && ` · Likvidacija: ${new Date(r.datum_odobravanja).toLocaleDateString('hr-HR')}`}
                          {r.odobrio_id && <LikvidatorIme odobrioId={r.odobrio_id} />}
                          {r.datum_placanja && ` · Plaćeno: ${new Date(r.datum_placanja).toLocaleDateString('hr-HR')}`}
                        </div>
                      )}

                      {/* Dokumenti */}
                      <div className="mb-3">
                        <div className="text-xs text-[#999] mb-1">Dokumenti</div>
                        {docs[r.id]?.length ? (
                          <div className="space-y-1">
                            {docs[r.id].map(d => (
                              <button key={d.id} onClick={() => otvoriDokument(d.storage_path)}
                                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-800">
                                {d.naziv}
                              </button>
                            ))}
                          </div>
                        ) : <span className="text-xs text-[#777]">Nema priloženih dokumenata</span>}
                        {!zakljucan && jeFinancijskaUloga() && (
                          <div className="mt-2">
                            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.xml"
                              className="hidden" onChange={e => { if (e.target.files?.[0]) handleUpload(r.id, e.target.files[0]) }} />
                            <button onClick={() => fileRef.current?.click()} disabled={uploading}
                              className="text-xs text-red-600 hover:text-red-400 disabled:opacity-50">
                              {uploading ? 'Učitavanje...' : '+ Priloži dokument'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Akcije */}
                      <div className="flex gap-2">
                        {mozelikvidirati && (
                          <button onClick={() => handleLikvidacija(r.id)}
                            className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
                            ✓ Likvidiraj (predsjednik)
                          </button>
                        )}
                        {mozeplatiti && (
                          <button onClick={() => handlePlacanje(r.id)}
                            className="px-4 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700">
                            Označi plaćeno
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function LikvidatorIme({ odobrioId }: { odobrioId: string }) {
  const [ime, setIme] = useState('')
  useEffect(() => {
    supabase.from('korisnici').select('ime, prezime').eq('id', odobrioId).single()
      .then(({ data }) => { if (data) setIme(`${data.ime} ${data.prezime}`) })
  }, [odobrioId])
  return ime ? <span> · Likvidirao: <strong>{ime}</strong></span> : null
}
