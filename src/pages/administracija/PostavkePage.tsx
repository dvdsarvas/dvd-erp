import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase/client'
import { dohvatiKorisnike, kreirajKorisnika, azurirajKorisnika, deaktivirajKorisnika, aktivirajKorisnika } from '@/lib/supabase/queries/korisnici'
import type { Korisnik } from '@/lib/supabase/queries/korisnici'
import { dohvatiClanoveTijela, dodajClanaTijela, ukloniClanaTijela } from '@/lib/supabase/queries/tijela'
import type { ClanTijela } from '@/lib/supabase/queries/tijela'
import { dohvatiClanove } from '@/lib/supabase/queries/clanovi'
import type { Clan } from '@/lib/supabase/queries/clanovi'
import { dohvatiOrganizaciju, azurirajOrganizaciju, dohvatiFunkcionere } from '@/lib/supabase/queries/organizacija'
import type { DVDOrganizacija, TrenutniFlunkcioneri } from '@/lib/supabase/queries/organizacija'
import { useDVDStore } from '@/store/dvd.store'
import {
  dohvatiZakonskiSadrzaj,
  azurirajZakonskiSadrzaj,
  kreirajZakonskiSadrzaj,
  KATEGORIJE_ZAKON
} from '@/lib/supabase/queries/zakonski-sadrzaj'
import type { ZakonskiSadrzaj } from '@/lib/supabase/queries/zakonski-sadrzaj'
import { dohvatiEracunKfg, azurirajEracunKfg } from '@/lib/supabase/queries/financije'
import type { EracunKonfiguracija } from '@/lib/supabase/queries/financije'

type Tab = 'korisnici' | 'dvd' | 'tijela' | 'zakoni' | 'eracun' | 'gdpr'
type Tijelo = 'upravni_odbor' | 'zapovjednistvo'

const ULOGE = [
  { value: 'admin', label: 'Administrator' },
  { value: 'predsjednik', label: 'Predsjednik' },
  { value: 'zamjenik', label: 'Zamjenik predsjednika' },
  { value: 'tajnik', label: 'Tajnik' },
  { value: 'blagajnik', label: 'Blagajnik' },
  { value: 'zapovjednik', label: 'Zapovjednik' },
  { value: 'zamjenik_zapovjednika', label: 'Zamjenik zapovjednika' },
  { value: 'clan', label: 'Član' },
]

const FUNKCIJE_UO = ['predsjednik', 'zamjenik predsjednika', 'zapovjednik', 'zamjenik zapovjednika', 'tajnik', 'blagajnik', 'član']
const FUNKCIJE_ZAP = ['zapovjednik', 'zamjenik zapovjednika', 'voditelj odjeljenja', 'član']

export function PostavkePage() {
  const { jeAdmin, korisnik } = useAuthStore()
  const [tab, setTab] = useState<Tab>('korisnici')

  // GDPR tab dostupan svima, ostali samo admin/predsjednik
  if (!jeAdmin() && korisnik?.uloga !== 'predsjednik') {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>Postavke</h1>
        </div>
        <TabGDPR />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>Postavke</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Administracija sustava DVD ERP</p>
      </div>

      <div className="border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        <nav className="flex gap-1 -mb-px">
          {([
            { key: 'korisnici' as Tab, label: 'Korisnici i uloge' },
            { key: 'tijela' as Tab, label: 'Tijela DVD-a' },
            { key: 'dvd' as Tab, label: 'Podaci DVD-a' },
            { key: 'zakoni' as Tab, label: 'Zakonske obveze' },
            { key: 'eracun' as Tab, label: 'e-Račun' },
            { key: 'gdpr' as Tab, label: 'Moji podaci (GDPR)' },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t.key ? 'text-[var(--text-accent)]' : ''}`}
              style={tab === t.key ? { borderColor: 'var(--accent)', color: 'var(--text-accent)' } : { borderColor: 'transparent', color: 'var(--text-secondary)' }}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'korisnici' && <TabKorisnici />}
      {tab === 'tijela' && <TabTijela />}
      {tab === 'dvd' && <TabDVDPodaci />}
      {tab === 'zakoni' && <TabZakonskeObveze />}
      {tab === 'eracun' && <TabEracun />}
      {tab === 'gdpr' && <TabGDPR />}
    </div>
  )
}

// ── Tab: Korisnici i uloge ─────────────────────────────────

function TabKorisnici() {
  const [korisnici, setKorisnici] = useState<Korisnik[]>([])
  const [loading, setLoading] = useState(true)
  const [showDodaj, setShowDodaj] = useState(false)
  const [forma, setForma] = useState({ email: '', ime: '', prezime: '', uloga: 'clan', lozinka: '' })
  const [editUloga, setEditUloga] = useState<{ id: string; uloga: string } | null>(null)

  useEffect(() => { ucitaj() }, [])

  async function ucitaj() {
    setLoading(true)
    try { setKorisnici(await dohvatiKorisnike()) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleDodaj() {
    if (!forma.email || !forma.ime || !forma.prezime || !forma.lozinka) {
      alert('Sva polja su obavezna.'); return
    }
    try {
      await kreirajKorisnika(forma)
      setShowDodaj(false)
      setForma({ email: '', ime: '', prezime: '', uloga: 'clan', lozinka: '' })
      await ucitaj()
    } catch (err: unknown) {
      alert(`Greška: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async function handlePromjenaUloge(id: string, novaUloga: string) {
    try {
      await azurirajKorisnika(id, { uloga: novaUloga as Korisnik['uloga'] })
      setEditUloga(null)
      await ucitaj()
    } catch (err) { console.error(err) }
  }

  async function handleToggleAktivan(k: Korisnik) {
    const akcija = k.aktivan ? 'Deaktivirati' : 'Aktivirati'
    if (!confirm(`${akcija} korisnika ${k.ime} ${k.prezime}?`)) return
    try {
      if (k.aktivan) await deaktivirajKorisnika(k.id)
      else await aktivirajKorisnika(k.id)
      await ucitaj()
    } catch (err) { console.error(err) }
  }

  return (
    <div>
      <div className="border rounded-lg p-4 mb-4 text-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
        Korisnici su osobe koje se prijavljuju u sustav. Svaki korisnik ima ulogu koja određuje što može vidjeti i raditi.
      </div>

      {showDodaj ? (
        <div className="border rounded-xl p-4 mb-4" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Novi korisnik</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" value={forma.ime} onChange={e => setForma(f => ({ ...f, ime: e.target.value }))}
              placeholder="Ime *" className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }} />
            <input type="text" value={forma.prezime} onChange={e => setForma(f => ({ ...f, prezime: e.target.value }))}
              placeholder="Prezime *" className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }} />
            <input type="email" value={forma.email} onChange={e => setForma(f => ({ ...f, email: e.target.value }))}
              placeholder="Email *" className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }} />
            <input type="password" value={forma.lozinka} onChange={e => setForma(f => ({ ...f, lozinka: e.target.value }))}
              placeholder="Lozinka *" className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }} />
            <select value={forma.uloga} onChange={e => setForma(f => ({ ...f, uloga: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
              {ULOGE.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleDodaj} className="px-4 py-2 text-white text-sm rounded-lg" style={{ background: 'var(--accent)' }}>Kreiraj korisnika</button>
            <button onClick={() => setShowDodaj(false)} className="px-4 py-2 text-sm rounded-lg" style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>Odustani</button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <button onClick={() => setShowDodaj(true)} className="px-4 py-2 text-white text-sm font-medium rounded-lg" style={{ background: 'var(--accent)' }}>
            + Novi korisnik
          </button>
        </div>
      )}

      <div className="border rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        {loading ? <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Učitavanje...</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Korisnik</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Uloga</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {korisnici.map(k => (
                <tr key={k.id} className={`border-b ${!k.aktivan ? 'opacity-50' : ''}`} style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--text-accent)' }}>
                        {k.ime[0]}{k.prezime[0]}
                      </div>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{k.ime} {k.prezime}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{k.email}</td>
                  <td className="px-4 py-3">
                    {editUloga?.id === k.id ? (
                      <div className="flex gap-1">
                        <select value={editUloga.uloga} onChange={e => setEditUloga({ ...editUloga, uloga: e.target.value })}
                          className="px-2 py-1 border rounded text-xs" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                          {ULOGE.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                        <button onClick={() => handlePromjenaUloge(k.id, editUloga.uloga)} className="text-xs" style={{ color: 'var(--success)' }}>&#10003;</button>
                        <button onClick={() => setEditUloga(null)} className="text-xs" style={{ color: 'var(--text-muted)' }}>&#10005;</button>
                      </div>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/20 text-blue-400 cursor-pointer"
                        onClick={() => setEditUloga({ id: k.id, uloga: k.uloga })}>
                        {ULOGE.find(u => u.value === k.uloga)?.label || k.uloga}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${k.aktivan ? 'bg-green-900/25 text-green-400' : 'bg-red-900/25 text-red-400'}`}>
                      {k.aktivan ? 'Aktivan' : 'Neaktivan'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleToggleAktivan(k)} className={`text-xs ${k.aktivan ? 'text-red-500' : 'text-green-500'}`}>
                      {k.aktivan ? 'Deaktiviraj' : 'Aktiviraj'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 border rounded-xl p-4" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Opis uloga</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div><strong>Administrator</strong> — potpuni pristup svim modulima</div>
          <div><strong>Predsjednik</strong> — sjednice, plan rada, izvješća, likvidacija računa, tijela</div>
          <div><strong>Zamjenik predsjednika</strong> — isto kao predsjednik</div>
          <div><strong>Tajnik</strong> — članstvo, sjednice, zapisnici, računi (unos), izvješća</div>
          <div><strong>Blagajnik</strong> — financije, računi (plaćanje), nabava</div>
          <div><strong>Zapovjednik</strong> — vatrogasna djelatnost, imovina, nabava (zahtjevi)</div>
          <div><strong>Zamjenik zapovjednika</strong> — isto kao zapovjednik</div>
          <div><strong>Član</strong> — dashboard (samo pregled)</div>
        </div>
      </div>
    </div>
  )
}

// ── Tab: Tijela DVD-a ──────────────────────────────────────

function TabTijela() {
  const [aktivnoTijelo, setAktivnoTijelo] = useState<Tijelo>('upravni_odbor')
  const [clanoviUO, setClanoviUO] = useState<ClanTijela[]>([])
  const [clanoviZap, setClanoviZap] = useState<ClanTijela[]>([])
  const [sviClanovi, setSviClanovi] = useState<Clan[]>([])
  const [loading, setLoading] = useState(true)
  const [showDodaj, setShowDodaj] = useState(false)
  const [noviClanId, setNoviClanId] = useState('')
  const [novaFunkcija, setNovaFunkcija] = useState('član')

  useEffect(() => { ucitaj() }, [])

  async function ucitaj() {
    setLoading(true)
    try {
      const [uo, zap, svi] = await Promise.all([
        dohvatiClanoveTijela('upravni_odbor'),
        dohvatiClanoveTijela('zapovjednistvo'),
        dohvatiClanove({ status: 'aktivan' }),
      ])
      setClanoviUO(uo); setClanoviZap(zap); setSviClanovi(svi)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const clanovi = aktivnoTijelo === 'upravni_odbor' ? clanoviUO : clanoviZap
  const postojeciIds = new Set(clanovi.map(c => c.clan_id))
  const dostupniClanovi = sviClanovi.filter(c => !postojeciIds.has(c.id))
  const funkcije = aktivnoTijelo === 'upravni_odbor' ? FUNKCIJE_UO : FUNKCIJE_ZAP

  async function handleDodaj() {
    if (!noviClanId) return
    await dodajClanaTijela(aktivnoTijelo, noviClanId, novaFunkcija)
    setShowDodaj(false); setNoviClanId(''); setNovaFunkcija('član')
    await ucitaj()
  }

  async function handleUkloni(id: string) {
    if (!confirm('Ukloniti člana iz tijela?')) return
    await ukloniClanaTijela(id)
    await ucitaj()
  }

  return (
    <div>
      <div className="border rounded-lg p-4 mb-4 text-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
        {aktivnoTijelo === 'upravni_odbor'
          ? <><strong>Čl. 42 Statuta:</strong> Upravni odbor ima 9 članova — predsjednik, zapovjednik, zamjenik predsjednika, zamjenik zapovjednika, tajnik, blagajnik + 3 izabrana člana.</>
          : <><strong>Čl. 44 Statuta:</strong> Zapovjedništvo ima 9 članova — zapovjednik, zamjenik zapovjednika + voditelji odjeljenja.</>
        }
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => { setAktivnoTijelo('upravni_odbor'); setShowDodaj(false) }}
          className="px-4 py-2 text-sm rounded-lg"
          style={aktivnoTijelo === 'upravni_odbor' ? { background: 'var(--accent)', color: 'white' } : { background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
          Upravni odbor ({clanoviUO.length})
        </button>
        <button onClick={() => { setAktivnoTijelo('zapovjednistvo'); setShowDodaj(false) }}
          className="px-4 py-2 text-sm rounded-lg"
          style={aktivnoTijelo === 'zapovjednistvo' ? { background: 'var(--accent)', color: 'white' } : { background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
          Zapovjedništvo ({clanoviZap.length})
        </button>
      </div>

      <div className="border rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        {loading ? <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Učitavanje...</div>
        : clanovi.length === 0 ? <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Nema unesenih članova.</div>
        : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>#</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Ime i prezime</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Funkcija</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Mobitel</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}></th>
              </tr>
            </thead>
            <tbody>
              {clanovi.map((c, i) => (
                <tr key={c.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{c.prezime} {c.ime}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/20 text-blue-400 capitalize">{c.funkcija}</span></td>
                  <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>{c.mobitel || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleUkloni(c.id)} className="text-xs" style={{ color: 'var(--danger)' }}>Ukloni</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {showDodaj ? (
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[200px]">
                <select value={noviClanId} onChange={e => setNoviClanId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                  <option value="">Odaberi člana...</option>
                  {dostupniClanovi.map(c => <option key={c.id} value={c.id}>{c.prezime} {c.ime}</option>)}
                </select>
              </div>
              <select value={novaFunkcija} onChange={e => setNovaFunkcija(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm capitalize" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                {funkcije.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <button onClick={handleDodaj} className="px-4 py-2 text-white text-sm rounded-lg" style={{ background: 'var(--accent)' }}>Dodaj</button>
              <button onClick={() => setShowDodaj(false)} className="px-4 py-2 text-sm rounded-lg" style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>Odustani</button>
            </div>
          ) : (
            <button onClick={() => setShowDodaj(true)} className="text-sm font-medium" style={{ color: 'var(--text-accent)' }}>+ Dodaj člana</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tab: Podaci DVD-a ──────────────────────────────────────

function TabDVDPodaci() {
  const { refresh: refreshStore } = useDVDStore()
  const [org, setOrg] = useState<DVDOrganizacija | null>(null)
  const [funk, setFunk] = useState<TrenutniFlunkcioneri | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [forma, setForma] = useState<Partial<DVDOrganizacija>>({})
  const [oibPotvrda, setOibPotvrda] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => { ucitaj() }, [])

  async function ucitaj() {
    setLoading(true)
    try {
      const [o, f] = await Promise.all([dohvatiOrganizaciju(), dohvatiFunkcionere()])
      setOrg(o)
      setFunk(f)
      if (o) setForma(o)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleSpremi() {
    if (!org) return
    setError(null)
    if (forma.oib !== org.oib && forma.oib !== oibPotvrda) {
      setError('OIB potvrda se ne poklapa. Unesite OIB ponovo za potvrdu promjene.')
      return
    }
    setSaving(true)
    try {
      const azurirano = await azurirajOrganizaciju(org.id, forma)
      setOrg(azurirano)
      setForma(azurirano)
      setEditMode(false)
      setOibPotvrda('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      await refreshStore()
    } catch (err: unknown) {
      setError(`Greška: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  function handleOdustani() {
    if (org) setForma(org)
    setEditMode(false)
    setError(null)
    setOibPotvrda('')
  }

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Učitavanje...</div>

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-900/20 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg">
          Podaci uspješno spremljeni
        </div>
      )}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Identifikacijski podaci */}
      <div className="border rounded-xl p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Identifikacijski podaci</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              OIB, matični broj, IBAN — mijenjaju se rijetko. Promjena OIB-a zahtijeva potvrdu.
            </p>
          </div>
          {!editMode && (
            <button onClick={() => setEditMode(true)}
              className="px-3 py-1.5 text-xs rounded-lg" style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
              Uredi podatke
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormaPolje label="Puni naziv organizacije" value={forma.naziv ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, naziv: v }))} />
          <FormaPolje label="Kratki naziv" value={forma.naziv_kratki ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, naziv_kratki: v }))} />
          <FormaPolje label="OIB" value={forma.oib ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, oib: v }))} maxLength={11} />
          {editMode && forma.oib !== org?.oib && (
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--warning)' }}>Potvrdi novi OIB (upiši ponovo)</label>
              <input type="text" value={oibPotvrda} onChange={e => setOibPotvrda(e.target.value)} maxLength={11}
                className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--warning)', background: 'var(--bg-base)', color: 'var(--warning)' }}
                placeholder="Upiši OIB ponovo..." />
            </div>
          )}
          <FormaPolje label="Matični broj" value={forma.maticni_broj ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, maticni_broj: v }))} />
          <FormaPolje label="Broj u RNO" value={forma.rbr_rno ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, rbr_rno: v }))} hint="Registar neprofitnih organizacija — MFIN" />
          <FormaPolje label="IBAN" value={forma.iban ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, iban: v }))} />
          <FormaPolje label="Banka" value={forma.banka ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, banka: v }))} />
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Razina knjigovodstva</label>
            {editMode ? (
              <select value={forma.knjig_prag ?? 'jednostavno'} onChange={e => setForma(f => ({ ...f, knjig_prag: e.target.value as 'jednostavno' | 'dvojno' }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
                <option value="jednostavno">Jednostavno (prihodi &#8804; 30.526 EUR)</option>
                <option value="dvojno">Dvojno (prihodi &gt; 30.526 EUR)</option>
              </select>
            ) : (
              <p className="text-sm capitalize" style={{ color: 'var(--text-primary)' }}>{forma.knjig_prag ?? 'jednostavno'}</p>
            )}
          </div>
          <FormaPolje label="Datum osnivanja" value={forma.datum_osnivanja ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, datum_osnivanja: v }))} type="date" />
        </div>
      </div>

      {/* Kontakt i sjedište */}
      <div className="border rounded-xl p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Kontakt i sjedište</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormaPolje label="Adresa (ulica i broj)" value={forma.adresa ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, adresa: v }))} />
          <FormaPolje label="Mjesto" value={forma.mjesto ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, mjesto: v }))} />
          <FormaPolje label="Poštanski broj" value={forma.postanski_broj ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, postanski_broj: v }))} />
          <FormaPolje label="Telefon" value={forma.telefon ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, telefon: v }))} />
          <FormaPolje label="Email" value={forma.email ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, email: v }))} type="email" />
          <FormaPolje label="Web" value={forma.web ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, web: v }))} />
        </div>
      </div>

      {/* Hijerarhija */}
      <div className="border rounded-xl p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Vatrogasna hijerarhija</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormaPolje label="Vatrogasna zajednica JLS" value={forma.vatrogasna_zajednica ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, vatrogasna_zajednica: v }))} />
          <FormaPolje label="Županijska vatrogasna zajednica" value={forma.zupanijska_zajednica ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, zupanijska_zajednica: v }))} />
          <FormaPolje label="HVZ regija" value={forma.hvz_region ?? ''} editMode={editMode} onChange={v => setForma(f => ({ ...f, hvz_region: v }))} />
        </div>
      </div>

      {/* Funkcioneri (auto-sync) */}
      <div className="border rounded-xl p-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Trenutni funkcioneri</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Automatski preuzeto iz Tijela DVD-a. Za promjenu idi na tab "Tijela DVD-a".
            </p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
            Auto-sync
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { label: 'Predsjednik', value: funk?.predsjednik },
            { label: 'Zamjenik predsjednika', value: funk?.zamjenik_predsjednika },
            { label: 'Zapovjednik', value: funk?.zapovjednik },
            { label: 'Zamjenik zapovjednika', value: funk?.zamjenik_zapovjednika },
            { label: 'Tajnik', value: funk?.tajnik },
            { label: 'Blagajnik', value: funk?.blagajnik },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</dt>
              <dd className="text-sm" style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>{value ?? 'Nije postavljeno'}</dd>
            </div>
          ))}
        </div>
      </div>

      {editMode && (
        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleSpremi} disabled={saving}
            className="px-5 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50" style={{ background: 'var(--accent)' }}>
            {saving ? 'Spremanje...' : 'Spremi promjene'}
          </button>
          <button onClick={handleOdustani}
            className="px-4 py-2 text-sm rounded-lg" style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
            Odustani
          </button>
        </div>
      )}

      {org && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Zadnja promjena: {new Date(org.updated_at).toLocaleDateString('hr-HR')}
        </p>
      )}
    </div>
  )
}

interface FormaPoljeProp {
  label: string
  value: string
  editMode: boolean
  onChange: (v: string) => void
  type?: string
  hint?: string
  maxLength?: number
}

function FormaPolje({ label, value, editMode, onChange, type = 'text', hint, maxLength }: FormaPoljeProp) {
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {editMode ? (
        <>
          <input type={type} value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
          {hint && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
        </>
      ) : (
        <p className="text-sm" style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>{value || '—'}</p>
      )}
    </div>
  )
}

// ── Tab: Zakonske obveze ───────────────────────────────────

function TabZakonskeObveze() {
  const { korisnik } = useAuthStore()
  const mozeUredivati = ['admin', 'predsjednik', 'zamjenik'].includes(korisnik?.uloga ?? '')

  const [stavke, setStavke] = useState<ZakonskiSadrzaj[]>([])
  const [loading, setLoading] = useState(true)
  const [aktivnaKategorija, setAktivnaKategorija] = useState('financije')
  const [editStavka, setEditStavka] = useState<ZakonskiSadrzaj | null>(null)
  const [showNova, setShowNova] = useState(false)

  useEffect(() => { ucitaj() }, [])

  async function ucitaj() {
    setLoading(true)
    try { setStavke(await dohvatiZakonskiSadrzaj()) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const filtrirane = stavke.filter(s => s.kategorija === aktivnaKategorija)

  const vaznostBoja: Record<string, string> = {
    hitno:   'bg-red-900/25 text-red-400 border-red-900/50',
    vazno:   'bg-orange-900/20 text-orange-400 border-orange-900/40',
    normalno:'bg-blue-900/20 text-blue-400 border-blue-900/40',
    info:    'text-[var(--text-muted)] border-[var(--border)]',
  }

  const vaznostLabela: Record<string, string> = {
    hitno: 'Hitno', vazno: 'Važno', normalno: 'Normalno', info: 'Info',
  }

  return (
    <div>
      <div className="border rounded-lg p-4 mb-5 text-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
        Pregled zakonskih obveza i uputa za predsjednike i tajnike DVD-a.
        Sadržaj je prilagođen za volontere — bez pravnog žargona.
        {mozeUredivati && ' Kao predsjednik/admin možeš uređivati i dodavati stavke.'}
      </div>

      <div className="flex flex-wrap gap-1 mb-5">
        {KATEGORIJE_ZAKON.map(k => (
          <button key={k.value} onClick={() => setAktivnaKategorija(k.value)}
            className="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors"
            style={aktivnaKategorija === k.value
              ? { background: 'var(--accent)', color: 'white' }
              : { background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }
            }>
            {k.label}
            <span className="ml-1.5 opacity-60">
              ({stavke.filter(s => s.kategorija === k.value).length})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Učitavanje...</div>
      ) : (
        <div className="space-y-3">
          {filtrirane.length === 0 && (
            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              Nema stavki u ovoj kategoriji.
              {mozeUredivati && (
                <button onClick={() => setShowNova(true)} className="ml-2" style={{ color: 'var(--text-accent)' }}>
                  Dodaj prvu stavku
                </button>
              )}
            </div>
          )}

          {filtrirane.map(stavka => (
            editStavka?.id === stavka.id ? (
              <EditForma
                key={stavka.id}
                stavka={editStavka}
                korisnikId={korisnik!.id}
                onSpremi={async (azurirano) => {
                  setStavke(s => s.map(x => x.id === azurirano.id ? azurirano : x))
                  setEditStavka(null)
                }}
                onOdustani={() => setEditStavka(null)}
              />
            ) : (
              <div key={stavka.id} className="border rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                <div className="px-5 py-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{stavka.naslov}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${vaznostBoja[stavka.vaznost]}`}>
                          {vaznostLabela[stavka.vaznost]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {stavka.rok_opis && (
                          <span><strong style={{ color: 'var(--text-secondary)' }}>{stavka.rok_opis}</strong></span>
                        )}
                        {stavka.izvor_zakon && (
                          <span>{stavka.izvor_zakon}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {mozeUredivati && (
                    <button onClick={() => setEditStavka(stavka)}
                      className="text-xs flex-shrink-0 px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>
                      Uredi
                    </button>
                  )}
                </div>

                <div className="px-5 pb-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                  <MarkdownPrikaz sadrzaj={stavka.sadrzaj} />
                </div>
              </div>
            )
          ))}

          {mozeUredivati && !showNova && filtrirane.length > 0 && (
            <button onClick={() => setShowNova(true)}
              className="w-full py-3 border border-dashed text-sm rounded-xl transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              + Dodaj stavku za "{KATEGORIJE_ZAKON.find(k => k.value === aktivnaKategorija)?.label}"
            </button>
          )}

          {showNova && (
            <EditForma
              stavka={{
                id: '',
                kategorija: aktivnaKategorija as ZakonskiSadrzaj['kategorija'],
                naslov: '', sadrzaj: '', rok_opis: '', izvor_zakon: '',
                vaznost: 'normalno', redni_broj: filtrirane.length * 10 + 10,
                aktivan: true, updated_at: '', updated_by: null,
              }}
              korisnikId={korisnik!.id}
              isNova={true}
              onSpremi={async (nova) => { setStavke(s => [...s, nova]); setShowNova(false) }}
              onOdustani={() => setShowNova(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function MarkdownPrikaz({ sadrzaj }: { sadrzaj: string }) {
  const lineParsed = sadrzaj
    .split('\n')
    .map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} className="text-sm font-semibold mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>{line.slice(3)}</h3>
      if (line.startsWith('### ')) return <h4 key={i} className="text-xs font-semibold mt-2 mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{line.slice(4)}</h4>
      if (line.startsWith('- ')) return <li key={i} className="text-sm ml-4 list-disc" style={{ color: 'var(--text-secondary)' }}>{parseBold(line.slice(2))}</li>
      if (line.startsWith('|')) return <TableLine key={i} line={line} />
      if (line.trim() === '') return <div key={i} className="h-2" />
      return <p key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>{parseBold(line)}</p>
    })
  return <div className="space-y-0.5">{lineParsed}</div>
}

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-medium" style={{ color: 'var(--text-primary)' }}>{part}</strong> : part
  )
}

function TableLine({ line }: { line: string }) {
  if (line.replace(/[\|\s\-]/g, '') === '') return null
  const cells = line.split('|').filter(c => c.trim() !== '')
  return (
    <div className="grid text-xs border-b py-1" style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)`, borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
      {cells.map((cell, i) => <span key={i} style={i === 0 ? { color: 'var(--text-primary)', fontWeight: 500 } : {}}>{cell.trim()}</span>)}
    </div>
  )
}

interface EditFormaProp {
  stavka: ZakonskiSadrzaj
  korisnikId: string
  isNova?: boolean
  onSpremi: (s: ZakonskiSadrzaj) => Promise<void>
  onOdustani: () => void
}

function EditForma({ stavka, korisnikId, isNova = false, onSpremi, onOdustani }: EditFormaProp) {
  const [forma, setForma] = useState(stavka)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)

  async function handleSpremi() {
    if (!forma.naslov.trim() || !forma.sadrzaj.trim()) {
      alert('Naslov i sadržaj su obavezni.'); return
    }
    setSaving(true)
    try {
      let rezultat: ZakonskiSadrzaj
      if (isNova) {
        rezultat = await kreirajZakonskiSadrzaj(
          { kategorija: forma.kategorija, naslov: forma.naslov, sadrzaj: forma.sadrzaj,
            rok_opis: forma.rok_opis, izvor_zakon: forma.izvor_zakon,
            vaznost: forma.vaznost, redni_broj: forma.redni_broj },
          korisnikId
        )
      } else {
        rezultat = await azurirajZakonskiSadrzaj(forma.id,
          { naslov: forma.naslov, sadrzaj: forma.sadrzaj, rok_opis: forma.rok_opis,
            izvor_zakon: forma.izvor_zakon, vaznost: forma.vaznost, redni_broj: forma.redni_broj },
          korisnikId
        )
      }
      await onSpremi(rezultat)
    } catch (err) {
      alert(`Greška: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border rounded-xl p-5 space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-accent)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {isNova ? 'Nova stavka' : `Uredi: ${stavka.naslov}`}
        </h3>
        <button onClick={() => setPreview(p => !p)} className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {preview ? 'Uredi' : 'Pregled'}
        </button>
      </div>

      {preview ? (
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)' }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{forma.naslov || '(bez naslova)'}</h3>
          <MarkdownPrikaz sadrzaj={forma.sadrzaj} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Naslov *</label>
              <input value={forma.naslov} onChange={e => setForma(f => ({ ...f, naslov: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Važnost</label>
              <select value={forma.vaznost} onChange={e => setForma(f => ({ ...f, vaznost: e.target.value as ZakonskiSadrzaj['vaznost'] }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
                <option value="hitno">Hitno</option>
                <option value="vazno">Važno</option>
                <option value="normalno">Normalno</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Rok / Učestalost</label>
              <input value={forma.rok_opis} onChange={e => setForma(f => ({ ...f, rok_opis: e.target.value }))}
                placeholder="npr. do 31. prosinca tekuće godine"
                className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Izvor zakona</label>
              <input value={forma.izvor_zakon} onChange={e => setForma(f => ({ ...f, izvor_zakon: e.target.value }))}
                placeholder="npr. Zakon o udrugama čl. 18"
                className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
              Sadržaj (Markdown) * <span style={{ color: 'var(--text-muted)' }}>## Naslov, **bold**, - lista, | tablica</span>
            </label>
            <textarea value={forma.sadrzaj} onChange={e => setForma(f => ({ ...f, sadrzaj: e.target.value }))}
              rows={10} className="w-full px-3 py-2 border rounded-lg text-sm font-mono resize-y"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
              placeholder="## Naslov sekcije&#10;&#10;Opis obveze..." />
          </div>
        </>
      )}

      <div className="flex gap-2">
        <button onClick={handleSpremi} disabled={saving}
          className="px-4 py-2 text-white text-sm rounded-lg disabled:opacity-50" style={{ background: 'var(--accent)' }}>
          {saving ? 'Spremanje...' : isNova ? 'Dodaj stavku' : 'Spremi izmjene'}
        </button>
        <button onClick={onOdustani} className="px-4 py-2 text-sm rounded-lg" style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
          Odustani
        </button>
      </div>
    </div>
  )
}

// ── Tab: e-Račun konfiguracija ─────────────────────────────

function TabEracun() {
  const [kfg, setKfg] = useState<EracunKonfiguracija | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [forma, setForma] = useState({ posrednik: 'eposlovanje', api_username: '', api_password: '', api_key: '', company_id: '', aktivan: false })
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [testRezultat, setTestRezultat] = useState<{ ok: boolean; poruka: string } | null>(null)

  useEffect(() => {
    dohvatiEracunKfg()
      .then(k => {
        setKfg(k)
        if (k) setForma({ posrednik: k.posrednik, api_username: k.api_username, api_password: k.api_password, api_key: k.api_key, company_id: k.company_id, aktivan: k.aktivan })
      })
      .catch(err => console.error('e-Račun kfg greška:', err))
      .finally(() => setLoading(false))
  }, [])

  async function handleSpremi() {
    if (!kfg) return
    setSaving(true)
    setError(null)
    try {
      await azurirajEracunKfg(kfg.id, forma as any)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      setError(`Greška: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Učitavanje...</div>

  if (!kfg) return (
    <div className="border rounded-xl p-6" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        e-Račun konfiguracija nije inicijalizirana. Pokrenite migraciju 013 na Supabase bazi.
      </p>
    </div>
  )

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-900/20 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg">
          Postavke uspješno spremljene
        </div>
      )}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Info */}
      <div className="border rounded-lg p-4 text-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
        e-Račun integracija automatski preuzima primljene račune iz ePoslovanje ili mojeRačun servisa.
        Nakon konfiguracije, sustav provjerava inbox svakih sat vremena i uvozi nove račune.
      </div>

      {/* Forma */}
      <div className="border rounded-xl p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Pristupni podaci</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Posrednik</label>
            <select value={forma.posrednik} onChange={e => setForma(f => ({ ...f, posrednik: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
              <option value="eposlovanje">ePoslovanje</option>
              <option value="moj_eracun">mojeRačun</option>
              <option value="fina">FINA (nije podržano)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>OIB organizacije</label>
            <input type="text" value={forma.company_id} onChange={e => setForma(f => ({ ...f, company_id: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
              placeholder="npr. 48874677674" maxLength={11} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>API korisničko ime</label>
            <input type="text" value={forma.api_username} onChange={e => setForma(f => ({ ...f, api_username: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
              placeholder="Korisničko ime za API" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>API lozinka</label>
            <input type="password" value={forma.api_password} onChange={e => setForma(f => ({ ...f, api_password: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
              placeholder="Lozinka za API" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>API ključ (opcionalno)</label>
            <input type="text" value={forma.api_key} onChange={e => setForma(f => ({ ...f, api_key: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
              placeholder="Ako posrednik zahtijeva API ključ" />
          </div>
          <div className="flex items-center gap-3">
            <label className="block text-xs" style={{ color: 'var(--text-secondary)' }}>Aktiviraj automatski sync</label>
            <button
              onClick={() => setForma(f => ({ ...f, aktivan: !f.aktivan }))}
              className="w-10 h-5 rounded-full transition-colors relative"
              style={{ background: forma.aktivan ? 'var(--success)' : 'var(--border-strong)' }}
            >
              <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform" style={{ left: forma.aktivan ? '22px' : '2px' }} />
            </button>
            <span className="text-xs" style={{ color: forma.aktivan ? 'var(--success)' : 'var(--text-muted)' }}>
              {forma.aktivan ? 'Aktivno' : 'Neaktivno'}
            </span>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={handleSpremi} disabled={saving}
            className="px-5 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50" style={{ background: 'var(--accent)' }}>
            {saving ? 'Spremanje...' : 'Spremi postavke'}
          </button>
          <button onClick={async () => {
            setTesting(true)
            setTestRezultat(null)
            try {
              const { data, error: fnError } = await supabase.functions.invoke('test-eracun-vezu', {
                body: { posrednik: forma.posrednik, username: forma.api_username, password: forma.api_password, companyId: forma.company_id }
              })
              if (fnError) setTestRezultat({ ok: false, poruka: fnError.message })
              else setTestRezultat(data as { ok: boolean; poruka: string })
            } catch (err) {
              setTestRezultat({ ok: false, poruka: err instanceof Error ? err.message : String(err) })
            } finally {
              setTesting(false)
            }
          }} disabled={testing || !forma.api_username || !forma.company_id}
            className="px-5 py-2 text-sm font-medium rounded-lg disabled:opacity-50" style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
            {testing ? 'Testiranje...' : 'Testiraj vezu'}
          </button>
        </div>

        {testRezultat && (
          <div className={`mt-3 text-sm px-4 py-3 rounded-lg ${testRezultat.ok ? 'bg-green-900/20 border border-green-500/30 text-green-400' : 'bg-red-900/20 border border-red-500/30 text-red-400'}`}>
            {testRezultat.poruka}
          </div>
        )}
      </div>

      {/* Status sinkronizacije */}
      <div className="border rounded-xl p-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Status sinkronizacije</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Zadnji sync</dt>
            <dd style={{ color: 'var(--text-primary)' }}>
              {kfg.zadnji_sync ? new Date(kfg.zadnji_sync).toLocaleString('hr-HR') : 'Nikada'}
            </dd>
          </div>
          <div>
            <dt className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Ukupno uvezeno</dt>
            <dd style={{ color: 'var(--text-primary)' }}>{kfg.zadnji_sync_br} računa</dd>
          </div>
          <div>
            <dt className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Zadnja greška</dt>
            <dd style={{ color: kfg.greska_zadnja ? 'var(--danger)' : 'var(--success)' }}>
              {kfg.greska_zadnja || 'Nema grešaka'}
            </dd>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab: GDPR — Moji podaci ────────────────────────────────

function TabGDPR() {
  const { korisnik } = useAuthStore()
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (!korisnik) return
    setExporting(true)
    try {
      const { data: clan } = await supabase.from('clanovi').select('*').eq('email', korisnik.email).maybeSingle()
      const { data: pregledi } = await supabase.from('zdravstveni_pregledi').select('datum_pregleda, rezultat, datum_sljedeceg, ustanova').eq('clan_id', clan?.id || '')
      const { data: certifikati } = await supabase.from('certifikati_osposobljavanje').select('naziv, vrsta, datum_stjecanja, datum_isteka, organizator').eq('clan_id', clan?.id || '')

      const podaci = {
        korisnik: { ime: korisnik.ime, prezime: korisnik.prezime, email: korisnik.email, uloga: korisnik.uloga },
        clan: clan ? {
          oib: clan.oib, datum_rodenja: clan.datum_rodenja, mjesto_rodenja: clan.mjesto_rodenja,
          adresa: [clan.ulica, clan.kucni_broj, clan.mjesto, clan.postanski_broj].filter(Boolean).join(', '),
          mobitel: clan.mobitel, email: clan.email, kategorija: clan.kategorija, status: clan.status,
          datum_uclanivanja: clan.datum_uclanivanja, vatrogasno_zvanje: clan.vatrogasno_zvanje, gdpr_privola_datum: clan.gdpr_privola_datum,
        } : null,
        zdravstveni_pregledi: pregledi || [],
        certifikati: certifikati || [],
        datum_exporta: new Date().toISOString(),
      }

      const json = JSON.stringify(podaci, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `GDPR_Moji_Podaci_${korisnik.prezime}_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) { console.error(err); alert('Greška pri exportu.') }
    finally { setExporting(false) }
  }

  return (
    <div>
      <div className="border rounded-xl p-6" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Pravo na pristup osobnim podacima</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Prema članku 15. GDPR-a, imate pravo zatražiti kopiju svih osobnih podataka koje DVD Sarvaš obrađuje o Vama.
        </p>
        <button onClick={handleExport} disabled={exporting}
          className="px-5 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50" style={{ background: 'var(--info)' }}>
          {exporting ? 'Generiranje...' : 'Preuzmi svoje podatke (JSON)'}
        </button>
      </div>

      <div className="mt-4 border rounded-lg p-4 text-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <p className="font-medium mb-1">Vaša prava prema GDPR-u:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li><strong>Pravo na pristup</strong> (čl. 15) — preuzimanje kopije podataka</li>
          <li><strong>Pravo na ispravak</strong> (čl. 16) — zatražite ispravak od tajnika</li>
          <li><strong>Pravo na brisanje</strong> (čl. 17) — zatražite brisanje uz zakonska ograničenja</li>
          <li><strong>Pravo na prijenos</strong> (čl. 20) — podaci su u strojno čitljivom formatu (JSON)</li>
        </ul>
        <p className="mt-2">Za ostvarivanje prava obratite se: <strong>dvdsarvas@gmail.com</strong></p>
      </div>
    </div>
  )
}
