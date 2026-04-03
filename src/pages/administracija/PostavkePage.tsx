import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase/client'
import { dohvatiKorisnike, kreirajKorisnika, azurirajKorisnika, deaktivirajKorisnika, aktivirajKorisnika } from '@/lib/supabase/queries/korisnici'
import type { Korisnik } from '@/lib/supabase/queries/korisnici'
import { dohvatiClanoveTijela, dodajClanaTijela, ukloniClanaTijela } from '@/lib/supabase/queries/tijela'
import type { ClanTijela } from '@/lib/supabase/queries/tijela'
import { dohvatiClanove } from '@/lib/supabase/queries/clanovi'
import type { Clan } from '@/lib/supabase/queries/clanovi'

type Tab = 'korisnici' | 'dvd' | 'tijela' | 'gdpr'
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
          <h1 className="text-xl font-medium text-white">Postavke</h1>
        </div>
        <TabGDPR />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-white">Postavke</h1>
        <p className="text-sm text-[#999] mt-0.5">Administracija sustava DVD ERP</p>
      </div>

      <div className="border-b border-[#333338] mb-6">
        <nav className="flex gap-1 -mb-px">
          {([
            { key: 'korisnici' as Tab, label: 'Korisnici i uloge' },
            { key: 'tijela' as Tab, label: 'Tijela DVD-a' },
            { key: 'dvd' as Tab, label: 'Podaci DVD-a' },
            { key: 'gdpr' as Tab, label: 'Moji podaci (GDPR)' },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${tab === t.key ? 'border-red-600 text-red-400' : 'border-transparent text-[#999] hover:text-[#ddd]'}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'korisnici' && <TabKorisnici />}
      {tab === 'tijela' && <TabTijela />}
      {tab === 'dvd' && <TabDVDPodaci />}
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
      {/* Info */}
      <div className="bg-[#1e1e22] border border-[#333338] rounded-lg p-4 mb-4 text-sm text-[#bbb]">
        Korisnici su osobe koje se prijavljuju u sustav. Svaki korisnik ima ulogu koja određuje što može vidjeti i raditi.
        Korisnik se povezuje s članom DVD-a putem email adrese.
      </div>

      {/* Dodaj korisnika */}
      {showDodaj ? (
        <div className="bg-[#242428] border border-[#333338] rounded-xl p-4 mb-4">
          <h3 className="text-sm font-medium text-white mb-3">Novi korisnik</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" value={forma.ime} onChange={e => setForma(f => ({ ...f, ime: e.target.value }))}
              placeholder="Ime *" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="text" value={forma.prezime} onChange={e => setForma(f => ({ ...f, prezime: e.target.value }))}
              placeholder="Prezime *" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="email" value={forma.email} onChange={e => setForma(f => ({ ...f, email: e.target.value }))}
              placeholder="Email *" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <input type="password" value={forma.lozinka} onChange={e => setForma(f => ({ ...f, lozinka: e.target.value }))}
              placeholder="Lozinka *" className="px-3 py-2 border border-[#333338] rounded-lg text-sm" />
            <select value={forma.uloga} onChange={e => setForma(f => ({ ...f, uloga: e.target.value }))}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]">
              {ULOGE.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleDodaj} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Kreiraj korisnika</button>
            <button onClick={() => setShowDodaj(false)} className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg">Odustani</button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <button onClick={() => setShowDodaj(true)} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
            + Novi korisnik
          </button>
        </div>
      )}

      {/* Lista korisnika */}
      <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-[#999]">Učitavanje...</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e2e32] bg-[#1e1e22]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Korisnik</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Uloga</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#999] uppercase">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {korisnici.map(k => (
                <tr key={k.id} className={`border-b border-[#2a2a2e] hover:bg-[#1e1e22] ${!k.aktivan ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-900/25 flex items-center justify-center text-xs font-medium text-red-400">
                        {k.ime[0]}{k.prezime[0]}
                      </div>
                      <span className="font-medium text-white">{k.ime} {k.prezime}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#bbb]">{k.email}</td>
                  <td className="px-4 py-3">
                    {editUloga?.id === k.id ? (
                      <div className="flex gap-1">
                        <select value={editUloga.uloga} onChange={e => setEditUloga({ ...editUloga, uloga: e.target.value })}
                          className="px-2 py-1 border border-[#333338] rounded text-xs bg-[#242428]">
                          {ULOGE.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                        <button onClick={() => handlePromjenaUloge(k.id, editUloga.uloga)} className="text-xs text-green-400">✓</button>
                        <button onClick={() => setEditUloga(null)} className="text-xs text-[#777]">✕</button>
                      </div>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/20 text-blue-400 cursor-pointer hover:bg-blue-900/25"
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
                    <button onClick={() => handleToggleAktivan(k)} className={`text-xs ${k.aktivan ? 'text-red-500 hover:text-red-400' : 'text-green-500 hover:text-green-400'}`}>
                      {k.aktivan ? 'Deaktiviraj' : 'Aktiviraj'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Opis uloga */}
      <div className="mt-6 bg-[#242428] border border-[#333338] rounded-xl p-4">
        <h3 className="text-sm font-medium text-white mb-3">Opis uloga</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#bbb]">
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
      {/* Info */}
      <div className="bg-[#1e1e22] border border-[#333338] rounded-lg p-4 mb-4 text-sm text-[#bbb]">
        {aktivnoTijelo === 'upravni_odbor'
          ? <><strong>Čl. 42 Statuta:</strong> Upravni odbor ima 9 članova — predsjednik, zapovjednik, zamjenik predsjednika, zamjenik zapovjednika, tajnik, blagajnik + 3 izabrana člana. Saziva predsjednik, minimum 4x godišnje.</>
          : <><strong>Čl. 44 Statuta:</strong> Zapovjedništvo ima 9 članova — zapovjednik, zamjenik zapovjednika + voditelji odjeljenja. Saziva zapovjednik. Predsjednik pozvan na sve sjednice.</>
        }
      </div>

      {/* Tab za UO/Zapovjedništvo */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => { setAktivnoTijelo('upravni_odbor'); setShowDodaj(false) }}
          className={`px-4 py-2 text-sm rounded-lg ${aktivnoTijelo === 'upravni_odbor' ? 'bg-red-600 text-white' : 'bg-[#2a2a2e] text-[#bbb]'}`}>
          Upravni odbor ({clanoviUO.length})
        </button>
        <button onClick={() => { setAktivnoTijelo('zapovjednistvo'); setShowDodaj(false) }}
          className={`px-4 py-2 text-sm rounded-lg ${aktivnoTijelo === 'zapovjednistvo' ? 'bg-red-600 text-white' : 'bg-[#2a2a2e] text-[#bbb]'}`}>
          Zapovjedništvo ({clanoviZap.length})
        </button>
      </div>

      {/* Lista */}
      <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-[#999]">Učitavanje...</div>
        : clanovi.length === 0 ? <div className="p-8 text-center text-[#999]">Nema unesenih članova.</div>
        : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e2e32] bg-[#1e1e22]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Ime i prezime</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Funkcija</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase hidden md:table-cell">Mobitel</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#999] uppercase"></th>
              </tr>
            </thead>
            <tbody>
              {clanovi.map((c, i) => (
                <tr key={c.id} className="border-b border-[#2a2a2e] hover:bg-[#1e1e22]">
                  <td className="px-4 py-3 text-[#777]">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-white">{c.prezime} {c.ime}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/20 text-blue-400 capitalize">{c.funkcija}</span></td>
                  <td className="px-4 py-3 text-[#bbb] hidden md:table-cell">{c.mobitel || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleUkloni(c.id)} className="text-xs text-red-500 hover:text-red-400">Ukloni</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Dodaj */}
        <div className="p-4 border-t border-[#2e2e32]">
          {showDodaj ? (
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[200px]">
                <select value={noviClanId} onChange={e => setNoviClanId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]">
                  <option value="">Odaberi člana...</option>
                  {dostupniClanovi.map(c => <option key={c.id} value={c.id}>{c.prezime} {c.ime}</option>)}
                </select>
              </div>
              <select value={novaFunkcija} onChange={e => setNovaFunkcija(e.target.value)}
                className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428] capitalize">
                {funkcije.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <button onClick={handleDodaj} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Dodaj</button>
              <button onClick={() => setShowDodaj(false)} className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg">Odustani</button>
            </div>
          ) : (
            <button onClick={() => setShowDodaj(true)} className="text-sm text-red-600 hover:text-red-400 font-medium">+ Dodaj člana</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tab: Podaci DVD-a ──────────────────────────────────────

function TabDVDPodaci() {
  return (
    <div>
      <div className="bg-[#242428] border border-[#333338] rounded-xl p-6">
        <h3 className="text-sm font-medium text-white mb-4">Podaci organizacije</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Polje label="Puni naziv" value="Dobrovoljno vatrogasno društvo Sarvaš" />
          <Polje label="Skraćeni naziv" value="DVD Sarvaš" />
          <Polje label="OIB" value="48874677674" />
          <Polje label="Matični broj" value="02794586" />
          <Polje label="IBAN" value="2360000-1102233720" />
          <Polje label="Adresa" value="Ivana Mažuranića 31, 31000 Sarvaš" />
          <Polje label="Email" value="dvdsarvas@gmail.com" />
          <Polje label="Web" value="www.dvdsarvas.hr" />
          <Polje label="Nadređena organizacija" value="Vatrogasna zajednica Grada Osijeka" />
          <Polje label="Datum osnivanja" value="16.7.2011." />
          <Polje label="Predsjednik" value="Atila Vadoci" />
          <Polje label="Zapovjednik" value="Saša Davidović" />
        </div>
      </div>

      <div className="mt-4 bg-[#1e1e22] border border-[#333338] rounded-lg p-4 text-xs text-[#999]">
        Podaci su preuzeti iz Matičnog lista HVZ-a od 28.03.2026. Za promjenu podataka kontaktirajte administratora.
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
      // Dohvati sve osobne podatke člana
      const { data: clan } = await supabase
        .from('clanovi')
        .select('*')
        .eq('email', korisnik.email)
        .maybeSingle()

      const { data: pregledi } = await supabase
        .from('zdravstveni_pregledi')
        .select('datum_pregleda, rezultat, datum_sljedeceg, ustanova')
        .eq('clan_id', clan?.id || '')

      const { data: certifikati } = await supabase
        .from('certifikati_osposobljavanje')
        .select('naziv, vrsta, datum_stjecanja, datum_isteka, organizator')
        .eq('clan_id', clan?.id || '')

      // Generiraj CSV
      const podaci = {
        korisnik: {
          ime: korisnik.ime,
          prezime: korisnik.prezime,
          email: korisnik.email,
          uloga: korisnik.uloga,
        },
        clan: clan ? {
          oib: clan.oib,
          datum_rodenja: clan.datum_rodenja,
          mjesto_rodenja: clan.mjesto_rodenja,
          adresa: [clan.ulica, clan.kucni_broj, clan.mjesto, clan.postanski_broj].filter(Boolean).join(', '),
          mobitel: clan.mobitel,
          email: clan.email,
          kategorija: clan.kategorija,
          status: clan.status,
          datum_uclanivanja: clan.datum_uclanivanja,
          vatrogasno_zvanje: clan.vatrogasno_zvanje,
          gdpr_privola_datum: clan.gdpr_privola_datum,
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
      <div className="bg-[#242428] border border-[#333338] rounded-xl p-6">
        <h3 className="text-sm font-medium text-white mb-2">Pravo na pristup osobnim podacima</h3>
        <p className="text-sm text-[#bbb] mb-4">
          Prema članku 15. Opće uredbe o zaštiti podataka (GDPR), imate pravo zatražiti kopiju svih osobnih
          podataka koje DVD Sarvaš obrađuje o Vama. Klikom na gumb ispod preuzet ćete datoteku sa svim
          Vašim osobnim podacima koji se nalaze u sustavu.
        </p>

        <div className="bg-[#1e1e22] rounded-lg p-4 mb-4 text-xs text-[#bbb]">
          <p className="font-medium mb-1">Podaci koji se exportiraju:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Osobni podaci (ime, prezime, OIB, datum rođenja, adresa, kontakt)</li>
            <li>Podaci o članstvu (kategorija, status, datum učlanjivanja, zvanje)</li>
            <li>Zdravstveni pregledi (datumi, rezultati, ustanove)</li>
            <li>Certifikati i osposobljavanje</li>
            <li>GDPR privola (datum i verzija)</li>
          </ul>
        </div>

        <button onClick={handleExport} disabled={exporting}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {exporting ? 'Generiranje...' : '📥 Preuzmi svoje podatke (JSON)'}
        </button>
      </div>

      <div className="mt-4 bg-[#1e1e22] border border-[#333338] rounded-lg p-4 text-xs text-[#999]">
        <p className="font-medium mb-1">Vaša prava prema GDPR-u:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li><strong>Pravo na pristup</strong> (čl. 15) — preuzimanje kopije podataka (gumb iznad)</li>
          <li><strong>Pravo na ispravak</strong> (čl. 16) — zatražite ispravak netočnih podataka od tajnika</li>
          <li><strong>Pravo na brisanje</strong> (čl. 17) — zatražite brisanje uz zakonska ograničenja</li>
          <li><strong>Pravo na prijenos</strong> (čl. 20) — podaci su u strojno čitljivom formatu (JSON)</li>
        </ul>
        <p className="mt-2">Za ostvarivanje prava obratite se: <strong>dvdsarvas@gmail.com</strong></p>
      </div>
    </div>
  )
}

function Polje({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[#999] mb-0.5">{label}</dt>
      <dd className="text-sm text-white">{value}</dd>
    </div>
  )
}
