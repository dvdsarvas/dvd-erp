import { useEffect, useState } from 'react'
import { dohvatiClanoveTijela, dodajClanaTijela, ukloniClanaTijela } from '@/lib/supabase/queries/tijela'
import type { ClanTijela } from '@/lib/supabase/queries/tijela'
import { dohvatiClanove } from '@/lib/supabase/queries/clanovi'
import type { Clan } from '@/lib/supabase/queries/clanovi'
import { useAuthStore } from '@/store/auth.store'

type Tijelo = 'upravni_odbor' | 'zapovjednistvo'

const FUNKCIJE_UO = [
  'predsjednik', 'zamjenik predsjednika', 'zapovjednik', 'zamjenik zapovjednika',
  'tajnik', 'blagajnik', 'član',
]
const FUNKCIJE_ZAP = [
  'zapovjednik', 'zamjenik zapovjednika', 'voditelj odjeljenja', 'član',
]

export function TijelaDVD() {
  const { jeUpravackaUloga } = useAuthStore()
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
      setClanoviUO(uo)
      setClanoviZap(zap)
      setSviClanovi(svi)
    } catch (err) {
      console.error('Greška:', err)
    } finally {
      setLoading(false)
    }
  }

  const clanovi = aktivnoTijelo === 'upravni_odbor' ? clanoviUO : clanoviZap
  const postojeciIds = new Set(clanovi.map(c => c.clan_id))
  const dostupniClanovi = sviClanovi.filter(c => !postojeciIds.has(c.id))
  const funkcije = aktivnoTijelo === 'upravni_odbor' ? FUNKCIJE_UO : FUNKCIJE_ZAP

  async function handleDodaj() {
    if (!noviClanId) return
    try {
      await dodajClanaTijela(aktivnoTijelo, noviClanId, novaFunkcija)
      setShowDodaj(false)
      setNoviClanId('')
      setNovaFunkcija('član')
      await ucitaj()
    } catch (err) {
      console.error('Greška:', err)
    }
  }

  async function handleUkloni(id: string) {
    if (!confirm('Ukloniti člana iz tijela?')) return
    try {
      await ukloniClanaTijela(id)
      await ucitaj()
    } catch (err) {
      console.error('Greška:', err)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-white">Tijela DVD-a</h1>
        <p className="text-sm text-[#999] mt-0.5">
          Upravni odbor i Zapovjedništvo prema Statutu DVD-a Sarvaš
        </p>
      </div>

      {/* Tabovi */}
      <div className="border-b border-[#333338] mb-6">
        <nav className="flex gap-1 -mb-px">
          {([
            { key: 'upravni_odbor' as Tijelo, label: `Upravni odbor (${clanoviUO.length})` },
            { key: 'zapovjednistvo' as Tijelo, label: `Zapovjedništvo (${clanoviZap.length})` },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => { setAktivnoTijelo(tab.key); setShowDodaj(false) }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                aktivnoTijelo === tab.key
                  ? 'border-red-600 text-red-400'
                  : 'border-transparent text-[#999] hover:text-[#ddd]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Info */}
      <div className="bg-[#1e1e22] border border-[#333338] rounded-lg p-4 mb-4 text-sm text-[#bbb]">
        {aktivnoTijelo === 'upravni_odbor' ? (
          <p>
            <strong>Čl. 42 Statuta:</strong> Upravni odbor ima 9 članova — predsjednik, zapovjednik,
            zamjenik predsjednika, zamjenik zapovjednika, tajnik, blagajnik + 3 izabrana člana.
            Saziva predsjednik, minimum 4x godišnje. Kvorum: natpolovična većina (5+).
          </p>
        ) : (
          <p>
            <strong>Čl. 44 Statuta:</strong> Zapovjedništvo ima 9 članova — zapovjednik, zamjenik zapovjednika
            + voditelji odjeljenja. Saziva zapovjednik. Predsjednik je pozvan na sve sjednice.
            Kvorum: natpolovična većina.
          </p>
        )}
      </div>

      {/* Popis članova tijela */}
      <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#999]">Učitavanje...</div>
        ) : clanovi.length === 0 ? (
          <div className="p-8 text-center text-[#999]">Nema unesenih članova.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e2e32] bg-[#1e1e22]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Ime i prezime</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Funkcija</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase hidden md:table-cell">Mobitel</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase hidden md:table-cell">Od</th>
                {jeUpravackaUloga() && (
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#999] uppercase"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {clanovi.map((c, i) => (
                <tr key={c.id} className="border-b border-[#2a2a2e] hover:bg-[#1e1e22]">
                  <td className="px-4 py-3 text-[#777]">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-white">{c.prezime} {c.ime}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/20 text-blue-400 capitalize">
                      {c.funkcija}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#bbb] hidden md:table-cell">{c.mobitel || '—'}</td>
                  <td className="px-4 py-3 text-[#999] text-xs hidden md:table-cell">
                    {new Date(c.datum_od).toLocaleDateString('hr-HR')}
                  </td>
                  {jeUpravackaUloga() && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleUkloni(c.id)}
                        className="text-xs text-red-500 hover:text-red-400"
                      >
                        Ukloni
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Dodaj člana */}
        {jeUpravackaUloga() && (
          <div className="p-4 border-t border-[#2e2e32]">
            {showDodaj ? (
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-[#999] mb-1">Član</label>
                  <select
                    value={noviClanId}
                    onChange={e => setNoviClanId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]"
                  >
                    <option value="">Odaberi člana...</option>
                    {dostupniClanovi.map(c => (
                      <option key={c.id} value={c.id}>{c.prezime} {c.ime}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#999] mb-1">Funkcija</label>
                  <select
                    value={novaFunkcija}
                    onChange={e => setNovaFunkcija(e.target.value)}
                    className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428] capitalize"
                  >
                    {funkcije.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleDodaj} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
                  Dodaj
                </button>
                <button onClick={() => setShowDodaj(false)} className="px-4 py-2 bg-[#2a2a2e] text-[#bbb] text-sm rounded-lg hover:bg-[#3a3a3e]">
                  Odustani
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDodaj(true)}
                className="text-sm text-red-600 hover:text-red-400 font-medium"
              >
                + Dodaj člana
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
