import { useEffect, useState } from 'react'
import { Link, useParams } from 'wouter'
import { useAuthStore } from '@/store/auth.store'
import {
  dohvatiSjednicu, dohvatiTocke, dohvatiPrisutnost, azurirajTocku, azurirajSjednicu,
} from '@/lib/supabase/queries/sjednice'
import { supabase } from '@/lib/supabase/client'
import type { Sjednica, Tocka, Prisutnost } from '@/lib/supabase/queries/sjednice'
import type { Clan } from '@/lib/supabase/queries/clanovi'
import { dohvatiClanoveZaSjednicu } from '@/lib/supabase/queries/tijela'
import {
  generirajPozivnicu, generirajDnevniRed, generirajZapisnik,
  generirajPozivSjednice, generirajUpisnicuClanova,
  pozivnicaBlob, zapisnikBlob,
} from '@/lib/documents/sjednice-docs'
import { emailPozivnica, emailPozivSjednice, emailZapisnik } from '@/lib/documents/email-templates'
import { EmailShareDialog } from '@/components/shared/EmailShareDialog'

type Tab = 'dnevni_red' | 'prisutnost' | 'info'

export function SjednicaDetalji() {
  const params = useParams<{ id: string }>()
  const { jeUpravackaUloga } = useAuthStore()
  const [sjednica, setSjednica] = useState<Sjednica | null>(null)
  const [tocke, setTocke] = useState<Tocka[]>([])
  const [prisutnost, setPrisutnost] = useState<Prisutnost[]>([])
  const [clanovi, setClanovi] = useState<Clan[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('dnevni_red')

  useEffect(() => {
    if (!params.id) return
    ucitaj(params.id)
  }, [params.id])

  async function ucitaj(id: string) {
    setLoading(true)
    try {
      const [s, t, p] = await Promise.all([
        dohvatiSjednicu(id),
        dohvatiTocke(id),
        dohvatiPrisutnost(id),
      ])
      const c = await dohvatiClanoveZaSjednicu(s.vrsta)
      setSjednica(s)
      setTocke(t)
      setPrisutnost(p)
      setClanovi(c)
    } catch (err) {
      console.error('Greška:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-[#999]">Učitavanje...</div>
  if (!sjednica) return <div className="p-8 text-[#999]">Sjednica nije pronađena.</div>

  const prisutniIds = new Set(prisutnost.filter(p => p.prisutan).map(p => p.clan_id))

  return (
    <div>
      {/* Zaglavlje */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={backPath(sjednica.vrsta)} className="text-sm text-[#777] hover:text-[#bbb]">
            ← Natrag
          </Link>
          <h1 className="text-xl font-medium text-white mt-1">{sjednica.naziv}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={sjednica.status} />
            <span className="text-sm text-[#999]">{formatDatum(sjednica.datum)}</span>
            {sjednica.urbroj && (
              <span className="text-xs text-[#777] font-mono">{sjednica.urbroj}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DokumentGumbi sjednica={sjednica} tocke={tocke} prisutnost={prisutnost} clanovi={clanovi} />
          {jeUpravackaUloga() && (
            <Link href={`/sjednice/${sjednica.id}/uredi`} className="px-4 py-2 bg-[#2a2a2e] text-[#ddd] text-sm font-medium rounded-lg hover:bg-[#3a3a3e]">
              Uredi
            </Link>
          )}
        </div>
      </div>

      {/* Tabovi */}
      <div className="border-b border-[#333338] mb-6">
        <nav className="flex gap-1 -mb-px">
          {([
            { key: 'dnevni_red' as Tab, label: `Dnevni red (${tocke.length})` },
            { key: 'prisutnost' as Tab, label: `Prisutnost (${prisutniIds.size})` },
            { key: 'info' as Tab, label: 'Podaci' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'border-red-600 text-red-400'
                  : 'border-transparent text-[#999] hover:text-[#ddd]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-[#242428] border border-[#333338] rounded-xl p-6">
        {activeTab === 'dnevni_red' && (
          <TabDnevniRed tocke={tocke} mozeUredivati={jeUpravackaUloga()} onUpdate={() => params.id && ucitaj(params.id)} />
        )}
        {activeTab === 'prisutnost' && (
          <TabPrisutnost prisutnost={prisutnost} clanovi={clanovi} sjednica={sjednica} />
        )}
        {activeTab === 'info' && <TabInfo sjednica={sjednica} />}
      </div>

      {/* Dostava zapisnika — samo za skupštine s potpisanim zapisnikom */}
      {sjednica.vrsta.startsWith('skupstina') && (sjednica.status === 'zapisnik_potpisan' || sjednica.status === 'arhivirana') && (
        <DostavaZapisnika sjednica={sjednica} onRefresh={() => params.id && ucitaj(params.id)} />
      )}
    </div>
  )
}

// ── Tab: Dnevni red ────────────────────────────────────────

function TabDnevniRed({ tocke, mozeUredivati, onUpdate }: {
  tocke: Tocka[]; mozeUredivati: boolean; onUpdate: () => void
}) {
  const [editId, setEditId] = useState<string | null>(null)
  const [editZakljucak, setEditZakljucak] = useState('')

  async function spremiZakljucak(tocka: Tocka) {
    try {
      await azurirajTocku(tocka.id, { zakljucak: editZakljucak })
      setEditId(null)
      onUpdate()
    } catch (err) {
      console.error('Greška:', err)
    }
  }

  if (tocke.length === 0) {
    return <p className="text-sm text-[#999]">Nema točaka dnevnog reda.</p>
  }

  return (
    <div className="space-y-4">
      {tocke.map(t => (
        <div key={t.id} className="border border-[#2e2e32] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#2a2a2e] flex items-center justify-center text-xs font-medium text-[#bbb]">
              {t.redni_broj}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-white">{t.naziv}</h3>
                {t.vrsta && <VrstaBadge vrsta={t.vrsta} />}
              </div>
              {t.opis && <p className="text-sm text-[#999] mt-1">{t.opis}</p>}

              {t.rasprava && (
                <div className="mt-2">
                  <div className="text-xs text-[#777] mb-0.5">Rasprava</div>
                  <p className="text-sm text-[#bbb]">{t.rasprava}</p>
                </div>
              )}

              {/* Zaključak */}
              {editId === t.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={editZakljucak}
                    onChange={e => setEditZakljucak(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Unesite zaključak..."
                  />
                  <div className="flex gap-2">
                    <button onClick={() => spremiZakljucak(t)} className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700">
                      Spremi
                    </button>
                    <button onClick={() => setEditId(null)} className="px-3 py-1 bg-[#2a2a2e] text-[#bbb] text-xs rounded-lg hover:bg-[#3a3a3e]">
                      Odustani
                    </button>
                  </div>
                </div>
              ) : t.zakljucak ? (
                <div className="mt-2">
                  <div className="text-xs text-[#777] mb-0.5">Zaključak</div>
                  <p className="text-sm text-[#ddd]">{t.zakljucak}</p>
                </div>
              ) : null}

              {/* Glasanje */}
              {t.glasovi_za != null && (
                <div className="mt-2 flex items-center gap-4 text-xs">
                  <span className="text-green-400">Za: {t.glasovi_za}</span>
                  <span className="text-red-600">Protiv: {t.glasovi_protiv ?? 0}</span>
                  <span className="text-[#999]">Suzdržani: {t.glasovi_uzdrzani ?? 0}</span>
                  {t.usvojena != null && (
                    <span className={`font-medium ${t.usvojena ? 'text-green-400' : 'text-red-400'}`}>
                      {t.usvojena ? '✓ Usvojeno' : '✕ Nije usvojeno'}
                    </span>
                  )}
                </div>
              )}

              {/* Akcija */}
              {mozeUredivati && editId !== t.id && (
                <button
                  onClick={() => { setEditId(t.id); setEditZakljucak(t.zakljucak || '') }}
                  className="mt-2 text-xs text-[#777] hover:text-[#bbb]"
                >
                  {t.zakljucak ? 'Uredi zaključak' : '+ Dodaj zaključak'}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Tab: Prisutnost ────────────────────────────────────────

function TabPrisutnost({ prisutnost, clanovi, sjednica }: {
  prisutnost: Prisutnost[]; clanovi: Clan[]; sjednica: Sjednica
}) {
  const prisutniIds = new Set(prisutnost.filter(p => p.prisutan).map(p => p.clan_id))
  const prisutniClanovi = clanovi.filter(c => prisutniIds.has(c.id))
  const odsutniClanovi = clanovi.filter(c => !prisutniIds.has(c.id))

  return (
    <div className="space-y-6">
      {/* Kvorum info */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-[#1e1e22]">
        <div className={`w-3 h-3 rounded-full ${sjednica.kvorum_postignut ? 'bg-green-500/20' : sjednica.kvorum_postignut === false ? 'bg-red-500' : 'bg-[#444]'}`} />
        <div>
          <div className="text-sm font-medium text-white">
            Prisutno: {sjednica.prisutno_clanova ?? prisutniIds.size} / {sjednica.ukupno_clanova ?? clanovi.length}
          </div>
          <div className="text-xs text-[#999]">
            {sjednica.kvorum_postignut ? 'Kvorum postignut' : sjednica.kvorum_postignut === false ? 'Kvorum nije postignut' : 'Kvorum nije utvrđen'}
          </div>
        </div>
      </div>

      {/* Prisutni */}
      <div>
        <h3 className="text-sm font-medium text-white mb-2">Prisutni ({prisutniClanovi.length})</h3>
        {prisutniClanovi.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {prisutniClanovi.map(c => (
              <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-green-900/20 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-500/20" />
                <span className="text-[#ddd]">{c.prezime} {c.ime}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#999]">Prisutnost nije evidentirana.</p>
        )}
      </div>

      {/* Odsutni */}
      {prisutniClanovi.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white mb-2">Odsutni ({odsutniClanovi.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {odsutniClanovi.map(c => (
              <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#1e1e22] text-sm">
                <span className="w-2 h-2 rounded-full bg-[#444]" />
                <span className="text-[#777]">{c.prezime} {c.ime}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Info ──────────────────────────────────────────────

function TabInfo({ sjednica }: { sjednica: Sjednica }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Polje label="Vrsta" value={formatVrsta(sjednica.vrsta)} />
      <Polje label="Status" value={formatStatus(sjednica.status)} />
      <Polje label="Datum" value={formatDatum(sjednica.datum)} />
      <Polje label="Vrijeme" value={
        sjednica.sat_pocetka
          ? `${sjednica.sat_pocetka}${sjednica.sat_zavrsetka ? ` — ${sjednica.sat_zavrsetka}` : ''}`
          : null
      } />
      <Polje label="Mjesto" value={sjednica.mjesto} />
      <Polje label="URBROJ" value={sjednica.urbroj} />
      <Polje label="KLASA" value={sjednica.klasa} />
      <Polje label="Kvorum" value={
        sjednica.kvorum_postignut != null
          ? `${sjednica.prisutno_clanova}/${sjednica.ukupno_clanova} — ${sjednica.kvorum_postignut ? 'Postignut' : 'Nije postignut'}`
          : null
      } />
      {sjednica.napomena && <div className="md:col-span-2"><Polje label="Napomena" value={sjednica.napomena} /></div>}
    </div>
  )
}

// ── Pomoćne ────────────────────────────────────────────────

function Polje({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-[#999] mb-0.5">{label}</dt>
      <dd className="text-sm text-white">{value || '—'}</dd>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const stilovi: Record<string, string> = {
    planirana: 'bg-blue-900/25 text-blue-400',
    pozivnica_poslana: 'bg-yellow-900/25 text-yellow-400',
    odrzana: 'bg-green-900/25 text-green-400',
    zapisnik_potpisan: 'bg-emerald-900/25 text-emerald-400',
    arhivirana: 'bg-[#2a2a2e] text-[#bbb]',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${stilovi[status] || 'bg-[#2a2a2e] text-[#bbb]'}`}>
      {formatStatus(status)}
    </span>
  )
}

function VrstaBadge({ vrsta }: { vrsta: string }) {
  const boje: Record<string, string> = {
    izvjesce: 'bg-blue-900/20 text-blue-400',
    plan: 'bg-purple-900/20 text-purple-400',
    odluka: 'bg-orange-900/20 text-orange-400',
    izbori: 'bg-red-50 text-red-600',
    razno: 'bg-[#1e1e22] text-[#999]',
  }
  const labele: Record<string, string> = {
    izvjesce: 'Izvješće', plan: 'Plan', odluka: 'Odluka', izbori: 'Izbori', razno: 'Razno',
  }
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${boje[vrsta] || 'bg-[#1e1e22] text-[#999]'}`}>
      {labele[vrsta] || vrsta}
    </span>
  )
}

function formatDatum(datum: string): string {
  return new Date(datum).toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatVrsta(v: string): string {
  const m: Record<string, string> = {
    skupstina_redovna: 'Redovna skupština', skupstina_izborna: 'Izborna skupština',
    skupstina_izvanredna: 'Izvanredna skupština', skupstina_konstitutivna: 'Konstitutivna skupština',
    upravni_odbor: 'Upravni odbor', zapovjednistvo: 'Zapovjedništvo',
  }
  return m[v] || v
}

function formatStatus(s: string): string {
  const m: Record<string, string> = {
    planirana: 'Planirana', pozivnica_poslana: 'Pozivnica poslana',
    odrzana: 'Održana', zapisnik_potpisan: 'Zapisnik potpisan', arhivirana: 'Arhivirana',
  }
  return m[s] || s
}

// ── Dostava zapisnika Uredu državne uprave ────────────────

function DostavaZapisnika({ sjednica, onRefresh }: { sjednica: Sjednica; onRefresh: () => void }) {
  const { jeUpravackaUloga } = useAuthStore()

  const rokDostave = new Date(sjednica.datum)
  rokDostave.setDate(rokDostave.getDate() + 14)
  const daniDoRoka = Math.ceil((rokDostave.getTime() - Date.now()) / 86400000)
  const dostavljen = !!(sjednica as any).zapisnik_dostavljen_datum

  async function handleDostava(file?: File) {
    try {
      const podaci: Record<string, unknown> = {
        zapisnik_dostavljen_datum: new Date().toISOString().split('T')[0],
        status: 'arhivirana',
      }

      if (file) {
        const path = `zapisnici/${sjednica.id}/${Date.now()}_potvrda.${file.name.split('.').pop()}`
        await supabase.storage.from('dokumenti').upload(path, file)
        podaci.zapisnik_potvrda_url = path
      }

      await azurirajSjednicu(sjednica.id, podaci)
      onRefresh()
    } catch (err) { console.error(err); alert('Greška pri spremanju.') }
  }

  return (
    <div className={`mt-4 border rounded-xl p-4 ${dostavljen ? 'bg-green-900/20 border-green-800' : daniDoRoka < 0 ? 'bg-red-50 border-red-800' : daniDoRoka <= 7 ? 'bg-yellow-900/20 border-yellow-800' : 'bg-[#242428] border-[#333338]'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">
            Dostava zapisnika Uredu državne uprave OBŽ
          </h3>
          <p className="text-xs text-[#999] mt-0.5">
            Čl. 18 Zakona o udrugama — rok 14 dana od skupštine ({rokDostave.toLocaleDateString('hr-HR')})
            {!dostavljen && (
              <span className={`ml-2 font-medium ${daniDoRoka < 0 ? 'text-red-600' : daniDoRoka <= 7 ? 'text-yellow-400' : 'text-green-400'}`}>
                {daniDoRoka < 0 ? `${Math.abs(daniDoRoka)} dana kasni!` : daniDoRoka === 0 ? 'Danas ističe!' : `${daniDoRoka} dana do roka`}
              </span>
            )}
          </p>
        </div>
        {dostavljen ? (
          <span className="px-3 py-1 bg-green-900/25 text-green-400 text-xs font-medium rounded-full">
            ✓ Dostavljeno {(sjednica as any).zapisnik_dostavljen_datum ? new Date((sjednica as any).zapisnik_dostavljen_datum).toLocaleDateString('hr-HR') : ''}
          </span>
        ) : jeUpravackaUloga() && (
          <div className="flex gap-2">
            <label className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 cursor-pointer">
              Označi dostavljeno + potvrda
              <input type="file" accept=".pdf,.jpg,.png" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleDostava(e.target.files[0]) }} />
            </label>
            <button onClick={() => handleDostava()}
              className="px-3 py-2 bg-[#2a2a2e] text-[#bbb] text-xs font-medium rounded-lg hover:bg-[#3a3a3e]">
              Označi dostavljeno (bez potvrde)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function DokumentGumbi({ sjednica, tocke, prisutnost, clanovi }: {
  sjednica: Sjednica; tocke: Tocka[]; prisutnost: Prisutnost[]; clanovi: Clan[]
}) {
  const [generating, setGenerating] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [emailDialog, setEmailDialog] = useState<{
    predmet: string; html: string; tip: string; gen: () => Promise<Blob>; naziv: string
  } | null>(null)
  const isSkupstina = sjednica.vrsta.startsWith('skupstina')

  const datum = new Date(sjednica.datum).toLocaleDateString('hr-HR')

  async function generiraj(tip: string, fn: () => Promise<void>) {
    setGenerating(tip)
    setMenuOpen(false)
    try { await fn() } catch (err) { console.error('Greška:', err) } finally { setGenerating(null) }
  }

  function otvoriEmail(predmet: string, html: string, tip: string, gen: () => Promise<Blob>, naziv: string) {
    setMenuOpen(false)
    setEmailDialog({ predmet, html, tip, gen, naziv })
  }

  const downloadStavke = isSkupstina ? [
    { key: 'pozivnica', label: 'Pozivnica', fn: () => generirajPozivnicu(sjednica, tocke) },
    { key: 'dnevni_red', label: 'Dnevni red', fn: () => generirajDnevniRed(sjednica, tocke), needsTocke: true },
    { key: 'upisnica', label: 'Upisnica članova', fn: () => generirajUpisnicuClanova(sjednica, clanovi) },
    { key: 'zapisnik', label: 'Zapisnik', fn: () => generirajZapisnik(sjednica, tocke, prisutnost, clanovi), needsTocke: true },
  ] : [
    { key: 'poziv', label: 'Poziv sa dnevnim redom', fn: () => generirajPozivSjednice(sjednica, tocke), needsTocke: true },
    { key: 'zapisnik', label: 'Zapisnik', fn: () => generirajZapisnik(sjednica, tocke, prisutnost, clanovi), needsTocke: true },
  ]

  const emailStavke = isSkupstina ? [
    {
      key: 'email_pozivnica', label: 'Pošalji pozivnicu',
      fn: () => otvoriEmail(
        `Pozivnica — ${sjednica.naziv}`,
        emailPozivnica(sjednica.naziv, datum, sjednica.mjesto),
        'pozivnica',
        () => pozivnicaBlob(sjednica, tocke),
        `DVD-Pozivnica-${sjednica.datum}.docx`,
      ),
    },
    {
      key: 'email_zapisnik', label: 'Pošalji zapisnik', needsTocke: true,
      fn: () => otvoriEmail(
        `Zapisnik — ${sjednica.naziv}`,
        emailZapisnik(sjednica.naziv, datum),
        'zapisnik',
        () => zapisnikBlob(sjednica, tocke, prisutnost, clanovi),
        `DVD-Zapisnik-${sjednica.datum}.docx`,
      ),
    },
  ] : [
    {
      key: 'email_poziv', label: 'Pošalji poziv članovima', needsTocke: true,
      fn: () => otvoriEmail(
        `Poziv — ${sjednica.naziv}`,
        emailPozivSjednice(sjednica.naziv, datum, sjednica.sat_pocetka || '18:00', sjednica.mjesto),
        'poziv_sjednice',
        () => pozivnicaBlob(sjednica, tocke),
        `DVD-Poziv-Sjednica-${sjednica.datum}.docx`,
      ),
    },
    {
      key: 'email_zapisnik', label: 'Pošalji zapisnik', needsTocke: true,
      fn: () => otvoriEmail(
        `Zapisnik — ${sjednica.naziv}`,
        emailZapisnik(sjednica.naziv, datum),
        'zapisnik',
        () => zapisnikBlob(sjednica, tocke, prisutnost, clanovi),
        `DVD-Zapisnik-${sjednica.datum}.docx`,
      ),
    },
  ]

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setMenuOpen(o => !o)}
          disabled={generating !== null}
          className="px-3 py-2 bg-[#242428] border border-[#333338] text-[#ddd] text-xs font-medium rounded-lg hover:bg-[#1e1e22] disabled:opacity-50"
        >
          {generating ? 'Generiranje...' : 'Dokumenti ▾'}
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 mt-1 w-64 bg-[#242428] border border-[#333338] rounded-lg shadow-lg z-20 py-1">
              {/* Download sekcija */}
              <div className="px-3 py-1.5 text-[10px] text-[#777] uppercase font-medium">Preuzmi</div>
              {downloadStavke.map(s => (
                <button
                  key={s.key}
                  onClick={() => generiraj(s.key, s.fn)}
                  disabled={s.needsTocke && tocke.length === 0}
                  className="w-full text-left px-3 py-2 text-sm text-[#ddd] hover:bg-[#1e1e22] disabled:text-slate-300"
                >
                  {s.label}
                </button>
              ))}
              {/* Separator */}
              <div className="border-t border-[#2e2e32] my-1" />
              {/* Email sekcija */}
              <div className="px-3 py-1.5 text-[10px] text-[#777] uppercase font-medium">Pošalji emailom</div>
              {emailStavke.map(s => (
                <button
                  key={s.key}
                  onClick={s.fn}
                  disabled={s.needsTocke && tocke.length === 0}
                  className="w-full text-left px-3 py-2 text-sm text-[#ddd] hover:bg-[#1e1e22] disabled:text-slate-300"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {emailDialog && (
        <EmailShareDialog
          open={true}
          onClose={() => setEmailDialog(null)}
          clanovi={clanovi}
          predmet={emailDialog.predmet}
          html={emailDialog.html}
          tip={emailDialog.tip}
          generirajDokument={emailDialog.gen}
          nazivDokumenta={emailDialog.naziv}
        />
      )}
    </>
  )
}

function backPath(vrsta: string): string {
  if (vrsta.startsWith('skupstina')) return '/sjednice/skupstine'
  if (vrsta === 'upravni_odbor') return '/sjednice/upravni-odbor'
  return '/sjednice/zapovjednistvo'
}
