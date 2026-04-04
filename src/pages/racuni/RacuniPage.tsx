import { useEffect, useState, useRef } from 'react'
import {
  dohvatiRacune, kreirajRacun, azurirajRacun, likvidirajRacun, platiRacun,
  uploadRacunDokument, dohvatiDokumenteRacuna, dohvatiDokumentUrl,
  dohvatiKategorijuDobavljaca, dohvatiStavkeZaKategorizaciju,
  dohvatiKnjiguUlaznihRacuna, oznacPoslatoKnjigov,
  dohvatiFinPlan, dohvatiStavkePlana,
} from '@/lib/supabase/queries/financije'
import type { Racun, FinPlan, FinStavka, KnjigaUlazniRacun } from '@/lib/supabase/queries/financije'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/PageHeader'
import { parsirajEracunFajl } from '@/lib/utils/eracun-parser'

const tekucaGodina = new Date().getFullYear()

function fEUR(iznos: number): string {
  return new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(iznos)
}

type TabRacuni = 'lista' | 'knjiga' | 'analiza'

export function RacuniPage() {
  const { korisnik, jeFinancijskaUloga } = useAuthStore()
  const [racuni, setRacuni] = useState<Racun[]>([])
  const [loading, setLoading] = useState(true)
  const [godina, setGodina] = useState(tekucaGodina)
  const [filterStatus, setFilterStatus] = useState('')
  const [showForma, setShowForma] = useState(false)
  const [forma, setForma] = useState({ naziv_stranke: '', datum_racuna: new Date().toISOString().split('T')[0], iznos_ukupno: '', opis: '', plan_stavka_id: '', racunski_konto: '' })
  const [formaDatoteka, setFormaDatoteka] = useState<File | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [docs, setDocs] = useState<Record<string, { id: string; naziv: string; storage_path: string }[]>>({})
  const [uploading, setUploading] = useState(false)
  const [odabrani, setOdabrani] = useState<Set<string>>(new Set())
  const [stavkePlana, setStavkePlana] = useState<Awaited<ReturnType<typeof dohvatiStavkeZaKategorizaciju>>>([])
  const [prijedlogKategorije, setPrijedlogKategorije] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabRacuni>('lista')
  const fileRef = useRef<HTMLInputElement>(null)
  const formFileRef = useRef<HTMLInputElement>(null)

  const jePredsjednik = korisnik?.uloga === 'admin' || korisnik?.uloga === 'predsjednik'

  useEffect(() => { ucitaj() }, [godina, filterStatus])

  useEffect(() => {
    dohvatiStavkeZaKategorizaciju(godina).then(setStavkePlana).catch(console.error)
  }, [godina])

  // Auto-prijedlog kategorije pri unosu dobavljača
  useEffect(() => {
    if (forma.naziv_stranke.length < 3) return
    const timer = setTimeout(async () => {
      const kat = await dohvatiKategorijuDobavljaca(forma.naziv_stranke)
      if (kat?.plan_stavka_id) {
        setForma(f => ({ ...f, plan_stavka_id: kat.plan_stavka_id || '', racunski_konto: kat.racunski_konto || '' }))
        const stavka = stavkePlana.find(s => s.id === kat.plan_stavka_id)
        if (stavka) setPrijedlogKategorije(stavka.naziv_stavke)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [forma.naziv_stranke])

  async function ucitaj() {
    setLoading(true)
    try { setRacuni(await dohvatiRacune(godina, filterStatus || undefined)) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

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
        ...(forma.plan_stavka_id ? { plan_stavka_id: forma.plan_stavka_id, racunski_konto: forma.racunski_konto } : {}),
      } as any)
      if (formaDatoteka) await uploadRacunDokument(racun.id, formaDatoteka)
      setShowForma(false)
      setForma({ naziv_stranke: '', datum_racuna: new Date().toISOString().split('T')[0], iznos_ukupno: '', opis: '', plan_stavka_id: '', racunski_konto: '' })
      setFormaDatoteka(null)
      setPrijedlogKategorije(null)
      await ucitaj()
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? (err as any).message : JSON.stringify(err)
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
    if (expandedId === id) setExpandedId(null)
    else { setExpandedId(id); if (!docs[id]) ucitajDocs(id) }
  }

  function toggleOdabir(id: string) {
    setOdabrani(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  async function handlePosaljiKnjigov() {
    if (!korisnik) return
    const odabraniRacuni = racuni.filter(r => odabrani.has(r.id))
    if (odabraniRacuni.length === 0) return

    if (!confirm(
      `Poslati ${odabraniRacuni.length} računa knjigovođi?\n` +
      `Ukupno: ${fEUR(odabraniRacuni.reduce((a, r) => a + Number(r.iznos_ukupno), 0))}\n\n` +
      `Datum slanja će biti zabilježen u sustavu.`
    )) return

    try {
      await oznacPoslatoKnjigov(odabraniRacuni.map(r => r.id), korisnik.id)
      for (const r of odabraniRacuni) {
        if (r.status === 'primljeno') await azurirajRacun(r.id, { status: 'u_obradi' })
      }

      const popis = odabraniRacuni
        .map((r, i) => `${i + 1}. ${r.interni_broj || 'b/b'} — ${r.naziv_stranke} — ${new Date(r.datum_racuna).toLocaleDateString('hr-HR')} — ${Number(r.iznos_ukupno).toFixed(2)} EUR`)
        .join('\n')
      const subject = `DVD Sarvaš — Računi ${new Date().toLocaleDateString('hr-HR')} (${odabraniRacuni.length} kom)`
      const body = `Poštovani,\n\nU prilogu šaljem ${odabraniRacuni.length} računa za knjiženje:\n\n${popis}\n\nUkupno: ${odabraniRacuni.reduce((a, r) => a + Number(r.iznos_ukupno), 0).toFixed(2)} EUR\n\nS poštovanjem,\nDVD Sarvaš`
      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')

      setOdabrani(new Set())
      await ucitaj()
      alert('Slanje zabilježeno. Priložite dokumente u email klijentu.')
    } catch (err) {
      console.error(err)
      alert('Greška pri bilježenju slanja.')
    }
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
      <PageHeader
        naslov={`Računi ${godina}`}
        opis={`${racuni.length} računa · Neplaćeno: ${fEUR(ukupnoNeplaceno)}`}
        akcije={<div className="flex items-center gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
            <option value="">Svi statusi</option>
            <option value="primljeno">Primljeno</option>
            <option value="u_obradi">Poslano knjigovođi</option>
            <option value="odobreno">Likvidirano</option>
            <option value="placeno">Plaćeno</option>
          </select>
          <select value={godina} onChange={e => setGodina(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
            {[tekucaGodina, tekucaGodina - 1, tekucaGodina - 2].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          {jeFinancijskaUloga() && (<>
            <label className="px-3 py-2 text-sm font-medium rounded-lg cursor-pointer" style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
              Uvezi XML
              <input type="file" accept=".xml" className="hidden" onChange={async (e) => {
                try {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const podaci = await parsirajEracunFajl(file)
                  if (!podaci) { alert('Nije moguće pročitati XML datoteku. Provjerite format (UBL 2.1).'); return }
                  setForma(f => ({ ...f, naziv_stranke: podaci.naziv_stranke, datum_racuna: podaci.datum_racuna, iznos_ukupno: String(podaci.iznos_ukupno), opis: `e-Račun ${podaci.br_racuna}`, plan_stavka_id: '', racunski_konto: '' }))
                  setShowForma(true)
                  if (podaci.naziv_stranke) {
                    const kat = await dohvatiKategorijuDobavljaca(podaci.naziv_stranke)
                    if (kat?.plan_stavka_id) setForma(f => ({ ...f, plan_stavka_id: kat.plan_stavka_id || '', racunski_konto: kat.racunski_konto || '' }))
                  }
                } catch (err) {
                  console.error('XML upload greška:', err)
                  alert(`Greška pri učitavanju XML datoteke: ${err instanceof Error ? err.message : String(err)}`)
                }
              }} />
            </label>
            <button onClick={() => setShowForma(true)} className="px-4 py-2 text-white text-sm font-medium rounded-lg" style={{ background: 'var(--accent)' }}>
              + Novi račun
            </button>
          </>)}
        </div>}
      />

      {/* Tab navigacija */}
      <div className="flex gap-1 mb-4">
        {([
          { key: 'lista' as TabRacuni, label: 'Lista računa' },
          { key: 'knjiga' as TabRacuni, label: 'Knjiga ulaznih računa' },
          { key: 'analiza' as TabRacuni, label: 'Analiza (plan vs ostvareno)' },
        ]).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors"
            style={activeTab === t.key ? { background: 'var(--accent)', color: 'white' } : { background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'knjiga' && <KnjigaUlaznihRacunaTab godina={godina} />}
      {activeTab === 'analiza' && <AnalizaFinancija godina={godina} />}

      {activeTab === 'lista' && (
        <>
          {/* Forma za novi račun */}
          {showForma && (
            <div className="border rounded-xl p-4 mb-4" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Novi račun</h3>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Interni broj: <span className="font-mono">{generirajBrojRacuna()}</span> (automatski)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="text" value={forma.naziv_stranke} onChange={e => setForma(f => ({ ...f, naziv_stranke: e.target.value }))}
                  placeholder="Naziv stranke (dobavljač) *" className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }} />
                <input type="date" value={forma.datum_racuna} onChange={e => setForma(f => ({ ...f, datum_racuna: e.target.value }))}
                  className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }} />
                <input type="number" step="0.01" value={forma.iznos_ukupno} onChange={e => setForma(f => ({ ...f, iznos_ukupno: e.target.value }))}
                  placeholder="Iznos (EUR) *" className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }} />
                <input type="text" value={forma.opis} onChange={e => setForma(f => ({ ...f, opis: e.target.value }))}
                  placeholder="Opis / napomena" className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }} />

                {/* Kategorizacija */}
                <div className="md:col-span-2">
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Kategorija financijskog plana
                    {prijedlogKategorije && (
                      <span className="ml-2 text-[10px]" style={{ color: 'var(--success)' }}>
                        Auto: {prijedlogKategorije}
                      </span>
                    )}
                  </label>
                  <select value={forma.plan_stavka_id}
                    onChange={e => {
                      const id = e.target.value
                      const stavka = stavkePlana.find(s => s.id === id)
                      setForma(f => ({ ...f, plan_stavka_id: id, racunski_konto: stavka?.racunski_plan_konto || '' }))
                      setPrijedlogKategorije(null)
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                    <option value="">-- Odaberi stavku plana --</option>
                    {stavkePlana.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.racunski_plan_konto ? `[${s.racunski_plan_konto}] ` : ''}{s.naziv_stavke}
                        {' '}(Plan: {new Intl.NumberFormat('hr-HR').format(s.iznos_plan || 0)} EUR)
                      </option>
                    ))}
                  </select>
                  {forma.plan_stavka_id && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Plaćanjem ovog računa automatski će se ažurirati ostvarenje u financijskom planu.
                    </p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <input ref={formFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.xml"
                    onChange={e => setFormaDatoteka(e.target.files?.[0] || null)}
                    className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium" style={{ color: 'var(--text-secondary)' }} />
                  {formaDatoteka && <div className="text-xs mt-1" style={{ color: 'var(--success)' }}>{formaDatoteka.name}</div>}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={handleDodaj} className="px-4 py-2 text-white text-sm rounded-lg" style={{ background: 'var(--accent)' }}>Spremi račun</button>
                <button onClick={() => { setShowForma(false); setFormaDatoteka(null) }} className="px-4 py-2 text-sm rounded-lg" style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>Odustani</button>
              </div>
            </div>
          )}

          {/* Skupno slanje knjigovođi */}
          {odabrani.size > 0 && (
            <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-blue-400">{odabrani.size} računa odabrano</span>
              <button onClick={handlePosaljiKnjigov}
                className="px-4 py-2 text-white text-xs font-medium rounded-lg" style={{ background: 'var(--info)' }}>
                Pošalji knjigovođi
              </button>
            </div>
          )}

          {/* Lista računa */}
          <div className="border rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            {loading ? <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Učitavanje...</div>
            : racuni.length === 0 ? <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Nema računa za {godina}.</div>
            : (
              <div>
                {racuni.map(r => {
                  const expanded = expandedId === r.id
                  const mozelikvidirati = jePredsjednik && (r.status === 'primljeno' || r.status === 'u_obradi')
                  const mozeplatiti = jeFinancijskaUloga() && r.status === 'odobreno'
                  const zakljucan = r.status === 'placeno'

                  return (
                    <div key={r.id} className="border-b last:border-0" style={{ borderColor: 'var(--border)', opacity: zakljucan ? 0.7 : 1 }}>
                      <div className="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer">
                        <input type="checkbox" checked={odabrani.has(r.id)} onChange={() => toggleOdabir(r.id)} className="rounded" />
                        <div className="flex-1 min-w-0" onClick={() => toggleExpand(r.id)}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{r.interni_broj || '—'}</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.naziv_stranke}</span>
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {new Date(r.datum_racuna).toLocaleDateString('hr-HR')}
                            {r.opis && ` · ${r.opis}`}
                          </div>
                        </div>
                        <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{fEUR(Number(r.iznos_ukupno))}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusBoja[r.status] || ''}`}>
                          {statusLabel[r.status] || r.status}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }} onClick={() => toggleExpand(r.id)}>{expanded ? '▲' : '▼'}</span>
                      </div>

                      {expanded && (
                        <div className="px-4 pb-4 border-t" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-3 text-sm">
                            <div><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Interni broj</span><div className="font-mono">{r.interni_broj || '—'}</div></div>
                            <div><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Datum računa</span><div>{new Date(r.datum_racuna).toLocaleDateString('hr-HR')}</div></div>
                            <div><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Dospijeće</span><div>{r.datum_dospijeća ? new Date(r.datum_dospijeća).toLocaleDateString('hr-HR') : '—'}</div></div>
                            <div><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Plaćeno</span><div>{r.datum_placanja ? new Date(r.datum_placanja).toLocaleDateString('hr-HR') : '—'}</div></div>
                          </div>

                          {(r.status === 'odobreno' || r.status === 'placeno') && (
                            <div className="text-xs px-3 py-2 rounded mb-3" style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
                              {r.status === 'placeno' ? 'Plaćen' : 'Likvidiran'}
                              {r.datum_odobravanja && ` · Likvidacija: ${new Date(r.datum_odobravanja).toLocaleDateString('hr-HR')}`}
                              {r.odobrio_id && <LikvidatorIme odobrioId={r.odobrio_id} />}
                              {r.datum_placanja && ` · Plaćeno: ${new Date(r.datum_placanja).toLocaleDateString('hr-HR')}`}
                            </div>
                          )}

                          {(r as any).poslano_knjigov_datum && (
                            <div className="text-xs px-3 py-2 rounded mb-3" style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
                              Poslano knjigovođi: {new Date((r as any).poslano_knjigov_datum).toLocaleDateString('hr-HR')}
                            </div>
                          )}

                          {/* Dokumenti */}
                          <div className="mb-3">
                            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Dokumenti</div>
                            {docs[r.id]?.length ? (
                              <div className="space-y-1">
                                {docs[r.id].map(d => (
                                  <button key={d.id} onClick={() => otvoriDokument(d.storage_path)}
                                    className="flex items-center gap-2 text-sm" style={{ color: 'var(--info)' }}>
                                    {d.naziv}
                                  </button>
                                ))}
                              </div>
                            ) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Nema priloženih dokumenata</span>}
                            {!zakljucan && jeFinancijskaUloga() && (
                              <div className="mt-2">
                                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.xml"
                                  className="hidden" onChange={e => { if (e.target.files?.[0]) handleUpload(r.id, e.target.files[0]) }} />
                                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                                  className="text-xs disabled:opacity-50" style={{ color: 'var(--text-accent)' }}>
                                  {uploading ? 'Učitavanje...' : '+ Priloži dokument'}
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {mozelikvidirati && (
                              <button onClick={() => handleLikvidacija(r.id)}
                                className="px-4 py-2 text-white text-xs font-medium rounded-lg" style={{ background: 'var(--info)' }}>
                                Likvidiraj (predsjednik)
                              </button>
                            )}
                            {mozeplatiti && (
                              <button onClick={() => handlePlacanje(r.id)}
                                className="px-4 py-2 text-white text-xs font-medium rounded-lg" style={{ background: 'var(--success)' }}>
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
        </>
      )}
    </div>
  )
}

// ── Knjiga ulaznih računa tab ─────────────────────────────

function KnjigaUlaznihRacunaTab({ godina }: { godina: number }) {
  const [stavke, setStavke] = useState<KnjigaUlazniRacun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dohvatiKnjiguUlaznihRacuna(godina)
      .then(setStavke)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [godina])

  async function handleExportXlsx() {
    const { utils, writeFile } = await import('xlsx')
    const ws = utils.json_to_sheet(stavke.map(s => ({
      'R.br.': s.redni_broj,
      'Interni br.': s.interni_broj || '',
      'Datum računa': s.datum_racuna,
      'Naziv stranke': s.naziv_stranke,
      'Opis': s.opis || '',
      'Iznos (EUR)': s.iznos_ukupno,
      'Konto': s.racunski_konto || '',
      'Kategorija plana': s.kategorija_plana || '',
      'Status': s.status,
      'Datum plaćanja': s.datum_placanja || '',
      'Likvidirao': s.likvidirao_ime || '',
    })))
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, `KUR ${godina}`)
    writeFile(wb, `Knjiga_ulaznih_racuna_${godina}.xlsx`)
  }

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Učitavanje...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Knjiga ulaznih računa {godina}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Zakonski dokument — čuvati 7 godina. {stavke.length} zapisa.
          </p>
        </div>
        <button onClick={handleExportXlsx}
          className="px-4 py-2 text-sm rounded-lg" style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
          Export .xlsx
        </button>
      </div>

      <div className="border rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                <th className="text-left px-3 py-3 uppercase" style={{ color: 'var(--text-secondary)' }}>R.br.</th>
                <th className="text-left px-3 py-3 uppercase" style={{ color: 'var(--text-secondary)' }}>Int. br.</th>
                <th className="text-left px-3 py-3 uppercase" style={{ color: 'var(--text-secondary)' }}>Datum</th>
                <th className="text-left px-3 py-3 uppercase" style={{ color: 'var(--text-secondary)' }}>Stranka</th>
                <th className="text-left px-3 py-3 uppercase hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>Kategorija</th>
                <th className="text-right px-3 py-3 uppercase" style={{ color: 'var(--text-secondary)' }}>Iznos</th>
                <th className="text-left px-3 py-3 uppercase" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="text-left px-3 py-3 uppercase hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Plaćeno</th>
              </tr>
            </thead>
            <tbody>
              {stavke.map(s => (
                <tr key={s.redni_broj} className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{s.redni_broj}</td>
                  <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-muted)' }}>{s.interni_broj || '—'}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{new Date(s.datum_racuna).toLocaleDateString('hr-HR')}</td>
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>{s.naziv_stranke}</td>
                  <td className="px-3 py-2 hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>{s.kategorija_plana || '—'}</td>
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--text-primary)' }}>{fEUR(s.iznos_ukupno)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      s.status === 'placeno' ? 'bg-green-900/25 text-green-400' :
                      s.status === 'odobreno' ? 'bg-blue-900/25 text-blue-400' :
                      'bg-yellow-900/25 text-yellow-400'
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>
                    {s.datum_placanja ? new Date(s.datum_placanja).toLocaleDateString('hr-HR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2" style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-base)' }}>
                <td colSpan={5} className="px-3 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  UKUPNO ({stavke.length} računa)
                </td>
                <td className="px-3 py-3 text-right font-bold" style={{ color: 'var(--text-primary)' }}>
                  {fEUR(stavke.reduce((a, s) => a + s.iznos_ukupno, 0))}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Analiza financija tab ─────────────────────────────────

function AnalizaFinancija({ godina }: { godina: number }) {
  const [plan, setPlan] = useState<FinPlan | null>(null)
  const [stavke, setStavke] = useState<FinStavka[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function ucitaj() {
      const p = await dohvatiFinPlan(godina).catch(() => null)
      setPlan(p)
      if (p) setStavke(await dohvatiStavkePlana(p.id).catch(() => []))
      setLoading(false)
    }
    ucitaj()
  }, [godina])

  const rashodi = stavke.filter(s => s.kategorija === 'rashod')
  const prihodi = stavke.filter(s => s.kategorija === 'prihod')

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Učitavanje...</div>
  if (!plan) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Nema financijskog plana za {godina}.</div>

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4 text-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
        Ostvarenje se automatski ažurira iz plaćenih računa — nema ručnog unosa.
        Kategoriziraj račune pri unosu za točan prikaz.
      </div>

      {[
        { naslov: 'Prihodi', stavke: prihodi, boja: 'emerald' },
        { naslov: 'Rashodi', stavke: rashodi, boja: 'blue' },
      ].map(({ naslov, stavke: s, boja }) => (
        <div key={naslov} className="border rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{naslov}</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Plan: {fEUR(s.reduce((a, x) => a + (x.iznos_plan || 0), 0))} ·
              Ostvareno: {fEUR(s.reduce((a, x) => a + (x.iznos_ostvareno || 0), 0))}
            </p>
          </div>
          <div>
            {s.map(stavka => {
              const planIznos = stavka.iznos_plan || 0
              const ost = stavka.iznos_ostvareno || 0
              const pct = planIznos > 0 ? Math.min(Math.round((ost / planIznos) * 100), 100) : 0
              const overBudget = ost > planIznos && planIznos > 0
              return (
                <div key={stavka.id} className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{stavka.naziv_stavke}</span>
                      {stavka.racunski_plan_konto && (
                        <span className="ml-2 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{stavka.racunski_plan_konto}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium" style={{ color: overBudget ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {fEUR(ost)}
                      </span>
                      <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>/ {fEUR(planIznos)}</span>
                    </div>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ background: 'var(--bg-base)' }}>
                    <div
                      className={`h-1.5 rounded-full transition-all ${overBudget ? 'bg-red-500' : pct >= 80 ? 'bg-orange-500' : boja === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] mt-0.5 text-right" style={{ color: 'var(--text-muted)' }}>{pct}%</div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
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
