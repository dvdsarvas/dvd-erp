import { useEffect, useState, useRef } from 'react'
import { Link, useParams } from 'wouter'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase/client'
import {
  dohvatiClana,
  dohvatiClanarine,
  dohvatiCertifikate,
  dohvatiZdravstvenePreglede,
} from '@/lib/supabase/queries/clanovi'
import type { Clan, Clanarina, Certifikat, ZdravstveniPregled } from '@/lib/supabase/queries/clanovi'
import { dohvatiPovijestZvanja, dohvatiOdlikovanja, dohvatiSvaZvanja, dodajZvanje, dodajOdlikovanje } from '@/lib/supabase/queries/zvanja'
import type { Odlikovanje, VatrogasnoZvanje } from '@/lib/supabase/queries/zvanja'

type Tab = 'osobno' | 'vatrogasno' | 'zdravlje' | 'clanarina' | 'aktivnosti' | 'dokumenti'

const TABS: { key: Tab; label: string }[] = [
  { key: 'osobno', label: 'Osobni podaci' },
  { key: 'vatrogasno', label: 'Vatrogasno' },
  { key: 'zdravlje', label: 'Zdravlje' },
  { key: 'clanarina', label: 'Članarina' },
  { key: 'aktivnosti', label: 'Aktivnosti' },
  { key: 'dokumenti', label: 'Dokumenti' },
]

export function ClanDetalji() {
  const params = useParams<{ id: string }>()
  const { mozeVideoOsobne, mozeVideoZdravlje, jeUpravackaUloga } = useAuthStore()
  const [clan, setClan] = useState<Clan | null>(null)
  const [clanarine, setClanarine] = useState<Clanarina[]>([])
  const [certifikati, setCertifikati] = useState<Certifikat[]>([])
  const [pregledi, setPregledi] = useState<ZdravstveniPregled[]>([])
  const [povijestZv, setPovijestZv] = useState<any[]>([])
  const [odlikovanjaList, setOdlikovanjaList] = useState<Odlikovanje[]>([])
  const [svaZvanja, setSvaZvanja] = useState<VatrogasnoZvanje[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('osobno')

  useEffect(() => {
    if (!params.id) return
    ucitaj(params.id)
  }, [params.id])

  async function ucitaj(id: string) {
    setLoading(true)
    try {
      const [c, cl, cert, zdr] = await Promise.all([
        dohvatiClana(id),
        dohvatiClanarine(id),
        dohvatiCertifikate(id),
        dohvatiZdravstvenePreglede(id),
      ])
      setClan(c)
      setClanarine(cl)
      setCertifikati(cert)
      setPregledi(zdr)

      // Zvanja i odlikovanja (mogu failati ako tablice ne postoje)
      try {
        const [pz, odl, sz] = await Promise.all([
          dohvatiPovijestZvanja(id),
          dohvatiOdlikovanja(id),
          dohvatiSvaZvanja(),
        ])
        setPovijestZv(pz)
        setOdlikovanjaList(odl)
        setSvaZvanja(sz)
      } catch { /* tablice možda ne postoje */ }
    } catch (err) {
      console.error('Greška:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-[#999]">Učitavanje...</div>
  }

  if (!clan) {
    return <div className="p-8 text-[#999]">Član nije pronađen.</div>
  }

  return (
    <div>
      {/* Zaglavlje */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/clanstvo" className="text-sm text-[#777] hover:text-[#bbb]">
              ← Članstvo
            </Link>
          </div>
          <h1 className="text-xl font-medium text-white">
            {clan.ime} {clan.prezime}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={clan.status} />
            <span className="text-sm text-[#999]">{formatKategorija(clan.kategorija)}</span>
            {clan.vatrogasno_zvanje && (
              <span className="text-sm text-[#999]">· {clan.vatrogasno_zvanje}</span>
            )}
          </div>
        </div>
        {jeUpravackaUloga() && (
          <Link href={`/clanstvo/${clan.id}/uredi`} className="px-4 py-2 bg-[#2a2a2e] text-[#ddd] text-sm font-medium rounded-lg hover:bg-[#3a3a3e] transition-colors">
            Uredi
          </Link>
        )}
      </div>

      {/* Tabovi */}
      <div className="border-b border-[#333338] mb-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map(tab => {
            if (tab.key === 'osobno' && !mozeVideoOsobne()) return null
            if (tab.key === 'zdravlje' && !mozeVideoZdravlje()) return null
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'border-red-600 text-red-400'
                    : 'border-transparent text-[#999] hover:text-[#ddd] hover:border-[#444]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Sadržaj taba */}
      <div className="bg-[#242428] border border-[#333338] rounded-xl p-6">
        {activeTab === 'osobno' && <TabOsobno clan={clan} />}
        {activeTab === 'vatrogasno' && <TabVatrogasno clan={clan} certifikati={certifikati} povijestZvanja={povijestZv} odlikovanja={odlikovanjaList} svaZvanja={svaZvanja} onRefresh={() => params.id && ucitaj(params.id)} />}
        {activeTab === 'zdravlje' && <TabZdravlje pregledi={pregledi} clanId={clan.id} />}
        {activeTab === 'clanarina' && <TabClanarina clanarine={clanarine} />}
        {activeTab === 'aktivnosti' && <TabAktivnosti />}
        {activeTab === 'dokumenti' && <TabDokumenti />}
      </div>
    </div>
  )
}

// ── Tab: Osobni podaci ─────────────────────────────────────

function TabOsobno({ clan }: { clan: Clan }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Polje label="Ime" value={clan.ime} />
      <Polje label="Prezime" value={clan.prezime} />
      <Polje label="OIB" value={clan.oib} />
      <Polje label="Datum rođenja" value={formatDatum(clan.datum_rodenja)} />
      <Polje label="Mjesto rođenja" value={clan.mjesto_rodenja} />
      <Polje label="Adresa" value={[clan.ulica, clan.kucni_broj, clan.mjesto, clan.postanski_broj].filter(Boolean).join(', ')} />
      <Polje label="Mobitel" value={clan.mobitel} />
      <Polje label="Email" value={clan.email} />
      <Polje label="Datum učlanjivanja" value={formatDatum(clan.datum_uclanivanja)} />
      <Polje label="GDPR privola" value={clan.gdpr_privola_datum ? `${formatDatum(clan.gdpr_privola_datum)} (${clan.gdpr_privola_verzija})` : null} />
    </div>
  )
}

// ── Tab: Vatrogasno ────────────────────────────────────────

function TabVatrogasno({ clan, certifikati, povijestZvanja, odlikovanja, svaZvanja, onRefresh }: {
  clan: Clan; certifikati: Certifikat[]; povijestZvanja: any[]; odlikovanja: Odlikovanje[]; svaZvanja: VatrogasnoZvanje[]; onRefresh: () => void
}) {
  const { jeUpravackaUloga } = useAuthStore()
  const [showDodajZvanje, setShowDodajZvanje] = useState(false)
  const [showDodajOdl, setShowDodajOdl] = useState(false)
  const [novoZvanje, setNovoZvanje] = useState({ zvanje_id: '', datum: new Date().toISOString().split('T')[0] })
  const [novoOdl, setNovoOdl] = useState({ naziv: '', vrsta: 'pisano_priznanje', datum: new Date().toISOString().split('T')[0], dodijelio: '' })

  const VRSTE_ODL: Record<string, string> = {
    odlikovanje_posebne_zasluge: 'Odlikovanje za posebne zasluge',
    zlatna_medalja: 'Zlatna vatrogasna medalja', zlatni_znak: 'Zlatni vatrogasni znak',
    spomen_medalja_50: 'Spomen-medalja 50 godina', spomen_medalja_60: 'Spomen-medalja 60 godina', spomen_medalja_70: 'Spomen-medalja 70 godina',
    plaketa_dezelic: 'Plaketa Gj. S. Deželić', plaketa_kolaric: 'Plaketa M. Kolarić',
    plaketa_hrabrost_zlatna: 'Zlatna plaketa za hrabrost', plaketa_hrabrost_srebrna: 'Srebrna plaketa za hrabrost', plaketa_hrabrost_broncana: 'Brončana plaketa za hrabrost',
    povelja: 'Povelja', pisano_priznanje: 'Pisano priznanje', zahvalnica: 'Zahvalnica', ostalo: 'Ostalo',
  }

  async function handleDodajZvanje() {
    if (!novoZvanje.zvanje_id) return
    await dodajZvanje({ clan_id: clan.id, zvanje_id: novoZvanje.zvanje_id, datum_stjecanja: novoZvanje.datum })
    setShowDodajZvanje(false)
    onRefresh()
  }

  async function handleDodajOdl() {
    if (!novoOdl.naziv.trim()) return
    await dodajOdlikovanje({ clan_id: clan.id, naziv: novoOdl.naziv.trim(), vrsta: novoOdl.vrsta, datum_dodjele: novoOdl.datum, dodijelio: novoOdl.dodijelio.trim() || null })
    setShowDodajOdl(false)
    setNovoOdl({ naziv: '', vrsta: 'pisano_priznanje', datum: new Date().toISOString().split('T')[0], dodijelio: '' })
    onRefresh()
  }

  return (
    <div className="space-y-6">
      {/* Osnovni podaci */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Polje label="Kategorija" value={formatKategorija(clan.kategorija)} />
        <Polje label="Vatrogasno zvanje" value={clan.vatrogasno_zvanje} />
        <Polje label="Datum stjecanja zvanja" value={formatDatum(clan.datum_stjecanja_zvanja)} />
        <Polje label="Status" value={formatStatus(clan.status)} />
      </div>

      {/* Povijest zvanja / napredovanje */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Povijest zvanja</h3>
          {jeUpravackaUloga() && svaZvanja.length > 0 && (
            <button onClick={() => setShowDodajZvanje(true)} className="text-xs text-red-600 hover:text-red-400">+ Dodaj zvanje</button>
          )}
        </div>
        {showDodajZvanje && (
          <div className="flex gap-2 mb-3 items-end">
            <div className="flex-1">
              <select value={novoZvanje.zvanje_id} onChange={e => setNovoZvanje(f => ({ ...f, zvanje_id: e.target.value }))}
                className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]">
                <option value="">Odaberi zvanje...</option>
                {svaZvanja.map(z => <option key={z.id} value={z.id}>{z.naziv} ({z.kategorija})</option>)}
              </select>
            </div>
            <input type="date" value={novoZvanje.datum} onChange={e => setNovoZvanje(f => ({ ...f, datum: e.target.value }))}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <button onClick={handleDodajZvanje} className="px-3 py-2 bg-red-600 text-white text-xs rounded-lg">Spremi</button>
            <button onClick={() => setShowDodajZvanje(false)} className="px-3 py-2 bg-[#2a2a2e] text-[#bbb] text-xs rounded-lg">✕</button>
          </div>
        )}
        {povijestZvanja.length > 0 ? (
          <div className="space-y-2">
            {povijestZvanja.map((pz: any) => (
              <div key={pz.id} className="flex items-center gap-3 p-3 border border-[#2e2e32] rounded-lg">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  pz.vatrogasna_zvanja?.kategorija === 'casnik' || pz.vatrogasna_zvanja?.kategorija === 'visi_casnik' ? 'bg-yellow-500/20' :
                  pz.vatrogasna_zvanja?.kategorija === 'docasnik' ? 'bg-blue-500/20' : 'bg-green-500/20'
                }`} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{pz.vatrogasna_zvanja?.naziv || 'Nepoznato'}</div>
                  <div className="text-xs text-[#999]">{formatDatum(pz.datum_stjecanja)}</div>
                </div>
                <span className="text-xs text-[#777] capitalize">{pz.vatrogasna_zvanja?.kategorija}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#777]">Nema unesene povijesti zvanja.</p>
        )}
      </div>

      {/* Odlikovanja i priznanja */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Odlikovanja i priznanja</h3>
          {jeUpravackaUloga() && (
            <button onClick={() => setShowDodajOdl(true)} className="text-xs text-red-600 hover:text-red-400">+ Dodaj odlikovanje</button>
          )}
        </div>
        {showDodajOdl && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 p-3 border border-[#333338] rounded-lg">
            <input type="text" value={novoOdl.naziv} onChange={e => setNovoOdl(f => ({ ...f, naziv: e.target.value }))}
              placeholder="Naziv *" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <select value={novoOdl.vrsta} onChange={e => setNovoOdl(f => ({ ...f, vrsta: e.target.value }))}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]">
              {Object.entries(VRSTE_ODL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="date" value={novoOdl.datum} onChange={e => setNovoOdl(f => ({ ...f, datum: e.target.value }))}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="text" value={novoOdl.dodijelio} onChange={e => setNovoOdl(f => ({ ...f, dodijelio: e.target.value }))}
              placeholder="Dodijelio (DVD, VZ, HVZ...)" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <div className="flex gap-2 md:col-span-2">
              <button onClick={handleDodajOdl} className="px-3 py-2 bg-red-600 text-white text-xs rounded-lg">Spremi</button>
              <button onClick={() => setShowDodajOdl(false)} className="px-3 py-2 bg-[#2a2a2e] text-[#bbb] text-xs rounded-lg">Odustani</button>
            </div>
          </div>
        )}
        {odlikovanja.length > 0 ? (
          <div className="space-y-2">
            {odlikovanja.map(o => (
              <div key={o.id} className="flex items-center gap-3 p-3 border border-[#2e2e32] rounded-lg">
                <span className="w-2 h-2 rounded-full bg-yellow-500/20 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{o.naziv}</div>
                  <div className="text-xs text-[#999]">{formatDatum(o.datum_dodjele)} {o.dodijelio && `· ${o.dodijelio}`}</div>
                </div>
                <span className="text-xs text-[#777]">{VRSTE_ODL[o.vrsta] || o.vrsta}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#777]">Nema unesenih odlikovanja.</p>
        )}
      </div>

      {/* Certifikati */}
      {certifikati.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white mb-3">Osposobljavanje i certifikati</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e2e32]">
                <th className="text-left py-2 text-xs font-medium text-[#999]">Naziv</th>
                <th className="text-left py-2 text-xs font-medium text-[#999]">Vrsta</th>
                <th className="text-left py-2 text-xs font-medium text-[#999]">Datum</th>
                <th className="text-left py-2 text-xs font-medium text-[#999]">Istječe</th>
                <th className="text-left py-2 text-xs font-medium text-[#999]">Organizator</th>
              </tr>
            </thead>
            <tbody>
              {certifikati.map(c => (
                <tr key={c.id} className="border-b border-[#2a2a2e]">
                  <td className="py-2 text-white">{c.naziv}</td>
                  <td className="py-2 text-[#bbb]">{c.vrsta}</td>
                  <td className="py-2 text-[#bbb]">{formatDatum(c.datum_stjecanja)}</td>
                  <td className="py-2 text-[#bbb]">{formatDatum(c.datum_isteka)}</td>
                  <td className="py-2 text-[#bbb]">{c.organizator || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Tab: Zdravlje ──────────────────────────────────────────

function TabZdravlje({ pregledi, clanId }: { pregledi: ZdravstveniPregled[]; clanId: string }) {
  const { mozeVideoZdravlje } = useAuthStore()
  const zadnji = pregledi[0]
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uvjerenja, setUvjerenja] = useState<{ id: string; naziv: string; storage_path: string }[]>([])

  useEffect(() => { ucitajUvjerenja() }, [clanId])

  async function ucitajUvjerenja() {
    const { data } = await supabase
      .from('dokumenti')
      .select('id, naziv, storage_path')
      .eq('clan_id', clanId)
      .eq('modul', 'clanstvo')
      .order('created_at', { ascending: false })
    if (data) setUvjerenja(data)
  }

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'pdf'
      const path = `zdravstveni/${clanId}/${Date.now()}.${ext}`
      await supabase.storage.from('dokumenti').upload(path, file, { contentType: file.type })
      await supabase.from('dokumenti').insert({
        naziv: file.name,
        storage_path: path,
        modul: 'clanstvo',
        clan_id: clanId,
        vrsta: ext === 'pdf' ? 'pdf' : 'scan',
      })
      await ucitajUvjerenja()
    } catch (err) { console.error(err); alert('Greška pri uploadu') }
    finally { setUploading(false) }
  }

  async function otvori(path: string) {
    const { data } = await supabase.storage.from('dokumenti').createSignedUrl(path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="space-y-6">
      {zadnji && (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-[#1e1e22]">
          <div className={`w-3 h-3 rounded-full ${
            zadnji.rezultat === 'sposoban' ? 'bg-green-500/20' :
            zadnji.rezultat === 'uvjetno_sposoban' ? 'bg-yellow-500/20' : 'bg-red-500'
          }`} />
          <div>
            <div className="text-sm font-medium text-white">{formatRezultat(zadnji.rezultat)}</div>
            <div className="text-xs text-[#999]">
              Zadnji pregled: {formatDatum(zadnji.datum_pregleda)}
              {zadnji.datum_sljedeceg && ` · Sljedeći: ${formatDatum(zadnji.datum_sljedeceg)}`}
            </div>
          </div>
        </div>
      )}

      {pregledi.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2e2e32]">
              <th className="text-left py-2 text-xs font-medium text-[#999]">Datum</th>
              <th className="text-left py-2 text-xs font-medium text-[#999]">Rezultat</th>
              <th className="text-left py-2 text-xs font-medium text-[#999]">Sljedeći</th>
              <th className="text-left py-2 text-xs font-medium text-[#999]">Ustanova</th>
              <th className="text-left py-2 text-xs font-medium text-[#999]">Napomena</th>
            </tr>
          </thead>
          <tbody>
            {pregledi.map(p => (
              <tr key={p.id} className="border-b border-[#2a2a2e]">
                <td className="py-2 text-white">{formatDatum(p.datum_pregleda)}</td>
                <td className="py-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.rezultat === 'sposoban' ? 'bg-green-900/25 text-green-400' :
                    p.rezultat === 'uvjetno_sposoban' ? 'bg-yellow-900/25 text-yellow-400' :
                    'bg-red-900/25 text-red-400'
                  }`}>{formatRezultat(p.rezultat)}</span>
                </td>
                <td className="py-2 text-[#bbb]">{formatDatum(p.datum_sljedeceg)}</td>
                <td className="py-2 text-[#bbb]">{p.ustanova || '—'}</td>
                <td className="py-2 text-[#bbb]">{p.napomena || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-[#999]">Nema unesenih zdravstvenih pregleda.</p>
      )}

      {/* Uvjerenja / dokumenti */}
      <div>
        <h3 className="text-sm font-medium text-white mb-2">Zdravstvena uvjerenja</h3>
        {uvjerenja.length > 0 ? (
          <div className="space-y-1 mb-2">
            {uvjerenja.map(u => (
              <button key={u.id} onClick={() => otvori(u.storage_path)}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-800">
                {u.naziv}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#777] mb-2">Nema učitanih uvjerenja.</p>
        )}
        {mozeVideoZdravlje() && (
          <>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="text-xs text-red-600 hover:text-red-400 disabled:opacity-50">
              {uploading ? 'Učitavanje...' : '+ Učitaj zdravstveno uvjerenje (PDF/scan)'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Tab: Članarina ─────────────────────────────────────────

function TabClanarina({ clanarine }: { clanarine: Clanarina[] }) {
  return (
    <div>
      {clanarine.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2e2e32]">
              <th className="text-left py-2 text-xs font-medium text-[#999]">Godina</th>
              <th className="text-left py-2 text-xs font-medium text-[#999]">Status</th>
              <th className="text-left py-2 text-xs font-medium text-[#999]">Iznos</th>
              <th className="text-left py-2 text-xs font-medium text-[#999]">Datum plaćanja</th>
              <th className="text-left py-2 text-xs font-medium text-[#999]">Način</th>
              <th className="text-left py-2 text-xs font-medium text-[#999]">Napomena</th>
            </tr>
          </thead>
          <tbody>
            {clanarine.map(c => (
              <tr key={c.id} className="border-b border-[#2a2a2e]">
                <td className="py-2 text-white font-medium">{c.godina}</td>
                <td className="py-2">
                  {c.datum_placanja ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/25 text-green-400">
                      Plaćeno
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/25 text-red-400">
                      Neplaćeno
                    </span>
                  )}
                </td>
                <td className="py-2 text-[#bbb]">{c.iznos ? `${Number(c.iznos).toFixed(2)} EUR` : '—'}</td>
                <td className="py-2 text-[#bbb]">{formatDatum(c.datum_placanja)}</td>
                <td className="py-2 text-[#bbb]">{formatNacinPlacanja(c.nacin_placanja)}</td>
                <td className="py-2 text-[#bbb]">{c.napomena || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-[#999]">Nema unesenih članarina.</p>
      )}
    </div>
  )
}

// ── Tab: Aktivnosti ────────────────────────────────────────

function TabAktivnosti() {
  return (
    <p className="text-sm text-[#999]">
      Intervencije i vježbe će biti dostupne nakon implementacije modula Vatrogasna djelatnost.
    </p>
  )
}

// ── Tab: Dokumenti ─────────────────────────────────────────

function TabDokumenti() {
  return (
    <p className="text-sm text-[#999]">
      Dokumenti člana će biti dostupni nakon implementacije modula Arhiva dokumenata.
    </p>
  )
}

// ── Pomoćne komponente i funkcije ──────────────────────────

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
    aktivan: 'bg-green-900/25 text-green-400',
    neaktivan: 'bg-[#2a2a2e] text-[#bbb]',
    istupio: 'bg-yellow-900/25 text-yellow-400',
    iskljucen: 'bg-red-900/25 text-red-400',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${stilovi[status] || 'bg-[#2a2a2e] text-[#bbb]'}`}>
      {formatStatus(status)}
    </span>
  )
}

function formatDatum(datum: string | null | undefined): string {
  if (!datum) return '—'
  return new Date(datum).toLocaleDateString('hr-HR')
}

function formatKategorija(k: string): string {
  const m: Record<string, string> = {
    dobrovoljni_vatrogasac: 'Dobrovoljni vatrogasac',
    prikljuceni: 'Priključeni',
    pocasni: 'Počasni',
    podmladak: 'Podmladak',
  }
  return m[k] || k
}

function formatStatus(s: string): string {
  const m: Record<string, string> = {
    aktivan: 'Aktivan',
    neaktivan: 'Neaktivan',
    istupio: 'Istupio',
    iskljucen: 'Isključen',
  }
  return m[s] || s
}

function formatRezultat(r: string | null): string {
  if (!r) return '—'
  const m: Record<string, string> = {
    sposoban: 'Sposoban',
    uvjetno_sposoban: 'Uvjetno sposoban',
    nesposoban: 'Nesposoban',
  }
  return m[r] || r
}

function formatNacinPlacanja(n: string | null): string {
  if (!n) return '—'
  const m: Record<string, string> = {
    gotovina: 'Gotovina',
    virman: 'Virman',
    uplatnica: 'Uplatnica',
  }
  return m[n] || n
}
