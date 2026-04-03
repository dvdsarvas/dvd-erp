import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { dohvatiClanove, dohvatiClanarineZaGodinu } from '@/lib/supabase/queries/clanovi'
import type { Clan, ClanFilter } from '@/lib/supabase/queries/clanovi'
import { useAuthStore } from '@/store/auth.store'
import { StatusBadge } from '@/components/shared/StatusBadge'

const KATEGORIJE = [
  { value: '', label: 'Sve kategorije' },
  { value: 'dobrovoljni_vatrogasac', label: 'Dobrovoljni vatrogasac' },
  { value: 'prikljuceni', label: 'Priključeni' },
  { value: 'pocasni', label: 'Počasni' },
  { value: 'podmladak', label: 'Podmladak' },
]

const STATUSI = [
  { value: '', label: 'Svi statusi' },
  { value: 'aktivan', label: 'Aktivan' },
  { value: 'neaktivan', label: 'Neaktivan' },
  { value: 'istupio', label: 'Istupio' },
  { value: 'iskljucen', label: 'Isključen' },
]

const tekucaGodina = new Date().getFullYear()

export function ClanstvoList() {
  const { jeUpravackaUloga } = useAuthStore()
  const [clanovi, setClanovi] = useState<Clan[]>([])
  const [loading, setLoading] = useState(true)
  const [placanjaMap, setPlacanjaMap] = useState<Record<string, boolean>>({})
  const [filtri, setFiltri] = useState<ClanFilter>({
    kategorija: '',
    status: 'aktivan',
    pretraga: '',
  })

  useEffect(() => {
    ucitaj()
  }, [filtri.kategorija, filtri.status])

  async function ucitaj() {
    setLoading(true)
    try {
      const [lista, clanarine] = await Promise.all([
        dohvatiClanove({
          kategorija: filtri.kategorija || undefined,
          status: filtri.status || undefined,
          pretraga: filtri.pretraga || undefined,
        }),
        dohvatiClanarineZaGodinu(tekucaGodina),
      ])
      setClanovi(lista)
      const map: Record<string, boolean> = {}
      clanarine.forEach(c => { map[c.clan_id] = !!c.datum_placanja })
      setPlacanjaMap(map)
    } catch (err) {
      console.error('Greška pri učitavanju članova:', err)
    } finally {
      setLoading(false)
    }
  }

  function handlePretraga(e: React.FormEvent) {
    e.preventDefault()
    ucitaj()
  }

  const filtriraniClanovi = filtri.pretraga
    ? clanovi.filter(c =>
        `${c.ime} ${c.prezime} ${c.oib}`.toLowerCase().includes(filtri.pretraga!.toLowerCase())
      )
    : clanovi

  return (
    <div>
      {/* Zaglavlje */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-white">Evidencija članstva</h1>
          <p className="text-sm text-[#999] mt-0.5">
            {loading ? '...' : `${filtriraniClanovi.length} članova`}
          </p>
        </div>
        {jeUpravackaUloga() && (
          <Link href="/clanstvo/novi" className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
            + Novi član
          </Link>
        )}
      </div>

      {/* Filteri */}
      <div className="bg-[#242428] border border-[#333338] rounded-xl p-4 mb-4">
        <form onSubmit={handlePretraga} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-[#999] mb-1">Kategorija</label>
            <select
              value={filtri.kategorija}
              onChange={e => setFiltri(f => ({ ...f, kategorija: e.target.value }))}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]"
            >
              {KATEGORIJE.map(k => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#999] mb-1">Status</label>
            <select
              value={filtri.status}
              onChange={e => setFiltri(f => ({ ...f, status: e.target.value }))}
              className="px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]"
            >
              {STATUSI.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-[#999] mb-1">Pretraži</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={filtri.pretraga}
                onChange={e => setFiltri(f => ({ ...f, pretraga: e.target.value }))}
                placeholder="Ime, prezime ili OIB..."
                className="flex-1 px-3 py-2 border border-[#333338] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#2a2a2e] text-[#ddd] text-sm rounded-lg hover:bg-[#3a3a3e]"
              >
                Traži
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Tablica */}
      <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#999]">Učitavanje...</div>
        ) : filtriraniClanovi.length === 0 ? (
          <div className="p-8 text-center text-[#999]">Nema članova za prikaz.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2e2e32] bg-[#1e1e22]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Ime i prezime</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Zvanje</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Kategorija</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase hidden md:table-cell">Mobitel</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#999] uppercase">Članarina {tekucaGodina}</th>
                </tr>
              </thead>
              <tbody>
                {filtriraniClanovi.map((clan, i) => (
                  <tr key={clan.id} className="border-b border-[#2a2a2e] hover:bg-[#1e1e22]">
                    <td className="px-4 py-3 text-[#777]">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/clanstvo/${clan.id}`} className="text-white font-medium hover:text-red-400">
                        {clan.prezime} {clan.ime}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#bbb]">{clan.vatrogasno_zvanje || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={clan.kategorija} varijanta="kategorija" />
                    </td>
                    <td className="px-4 py-3 text-[#bbb] hidden md:table-cell">{clan.mobitel || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={clan.status} varijanta="clan" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={placanjaMap[clan.id] === undefined ? 'nepoznato' : placanjaMap[clan.id] ? 'placeno' : 'neplaceno'} varijanta="clanarina" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

