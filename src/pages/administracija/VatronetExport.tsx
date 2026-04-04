import { useEffect, useState } from 'react'
import { dohvatiClanove } from '@/lib/supabase/queries/clanovi'
import type { Clan } from '@/lib/supabase/queries/clanovi'
import { dohvatiImovinu } from '@/lib/supabase/queries/imovina'
import type { Imovina } from '@/lib/supabase/queries/imovina'

export function VatronetExport() {
  const [clanovi, setClanovi] = useState<Clan[]>([])
  const [imovina, setImovina] = useState<Imovina[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      dohvatiClanove({ status: 'aktivan' }),
      dohvatiImovinu(),
    ]).then(([c, i]) => { if (!cancelled) { setClanovi(c); setImovina(i) } })
      .catch(err => { if (!cancelled) console.error(err) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  function exportCSV(data: string[][], filename: string) {
    const bom = '\uFEFF'
    const csv = bom + data.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function exportClanove() {
    const header = ['Ime', 'Prezime', 'OIB', 'Datum rodenja', 'Adresa', 'Mjesto', 'Postanski broj', 'Mobitel', 'Email', 'Kategorija', 'Status', 'Datum uclanivanja', 'Vatrogasno zvanje']
    const rows = clanovi.map(c => [
      c.ime, c.prezime, c.oib,
      c.datum_rodenja || '',
      [c.ulica, c.kucni_broj].filter(Boolean).join(' '),
      c.mjesto || '', c.postanski_broj || '',
      c.mobitel || '', c.email || '',
      c.kategorija, c.status,
      c.datum_uclanivanja,
      c.vatrogasno_zvanje || '',
    ])
    exportCSV([header, ...rows], `VATROnet_Clanovi_DVD_Sarvas_${new Date().toISOString().split('T')[0]}.csv`)
  }

  function exportVozila() {
    const vozila = imovina.filter(i => i.vrsta === 'vozilo')
    const header = ['Naziv', 'Marka', 'Model', 'Reg. oznaka', 'Status', 'Lokacija', 'Registracija do', 'Tehnicki do', 'Osiguranje do', 'Osiguranje polica']
    const rows = vozila.map(v => [
      v.naziv, v.marka || '', v.model || '', v.reg_oznaka || '',
      v.status || '', v.lokacija || '',
      v.registracija_do || '', v.tehnicki_do || '',
      v.osiguranje_do || '', v.osiguranje_polica || '',
    ])
    exportCSV([header, ...rows], `VATROnet_Vozila_DVD_Sarvas_${new Date().toISOString().split('T')[0]}.csv`)
  }

  function exportOpremu() {
    const oprema = imovina.filter(i => i.vrsta !== 'vozilo')
    const header = ['Naziv', 'Vrsta', 'Status', 'Lokacija', 'Opis', 'Nabavna vrijednost']
    const rows = oprema.map(o => [
      o.naziv, o.vrsta, o.status || '',
      o.lokacija || '', o.opis || '',
      o.nabavna_vrijednost ? String(o.nabavna_vrijednost) : '',
    ])
    exportCSV([header, ...rows], `VATROnet_Oprema_DVD_Sarvas_${new Date().toISOString().split('T')[0]}.csv`)
  }

  const operativni = clanovi.filter(c => c.kategorija === 'dobrovoljni_vatrogasac')
  const vozila = imovina.filter(i => i.vrsta === 'vozilo')
  const oprema = imovina.filter(i => i.vrsta !== 'vozilo')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-white">VATROnet export</h1>
        <p className="text-sm text-[#999] mt-0.5">
          Generiraj CSV datoteke za lakši ručni unos podataka u VATROnet sustav HVZ-a
        </p>
      </div>

      <div className="bg-[#1e1e22] border border-[#333338] rounded-lg p-4 mb-6 text-sm text-[#bbb]">
        <p>VATROnet (vatronet.hvz.hr) je centralna baza HVZ-a. Prema čl. 9 Zakona o vatrogastvu i Pravilniku NN 80/2021,
        svaki DVD mora redovito ažurirati podatke o članovima, opremi i vozilima. Budući da VATROnet nema API za automatski
        uvoz, ovdje možete generirati CSV datoteke čije podatke možete lakše kopirati u VATROnet sučelje.</p>
      </div>

      {loading ? <div className="p-8 text-center text-[#999]">Učitavanje...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Članovi */}
          <div className="bg-[#242428] border border-[#333338] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-900/25 rounded-lg flex items-center justify-center text-red-400 text-lg font-bold">C</div>
              <div>
                <h3 className="text-sm font-medium text-white">Članovi</h3>
                <p className="text-xs text-[#999]">{clanovi.length} aktivnih ({operativni.length} operativnih)</p>
              </div>
            </div>
            <p className="text-xs text-[#999] mb-3">
              Ime, prezime, OIB, datum rođenja, adresa, kontakt, kategorija, zvanje
            </p>
            <button onClick={exportClanove}
              className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
              Preuzmi CSV
            </button>
          </div>

          {/* Vozila */}
          <div className="bg-[#242428] border border-[#333338] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-900/25 rounded-lg flex items-center justify-center text-blue-400 text-lg font-bold">V</div>
              <div>
                <h3 className="text-sm font-medium text-white">Vozila</h3>
                <p className="text-xs text-[#999]">{vozila.length} vozila</p>
              </div>
            </div>
            <p className="text-xs text-[#999] mb-3">
              Naziv, marka/model, reg. oznaka, registracija, tehnički, osiguranje
            </p>
            <button onClick={exportVozila}
              className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              Preuzmi CSV
            </button>
          </div>

          {/* Oprema */}
          <div className="bg-[#242428] border border-[#333338] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-900/25 rounded-lg flex items-center justify-center text-green-400 text-lg font-bold">O</div>
              <div>
                <h3 className="text-sm font-medium text-white">Oprema</h3>
                <p className="text-xs text-[#999]">{oprema.length} stavki</p>
              </div>
            </div>
            <p className="text-xs text-[#999] mb-3">
              Naziv, vrsta, status, lokacija, opis, nabavna vrijednost
            </p>
            <button onClick={exportOpremu}
              className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
              Preuzmi CSV
            </button>
          </div>
        </div>
      )}

      {/* Mapiranje polja */}
      <div className="mt-6 bg-[#242428] border border-[#333338] rounded-xl p-5">
        <h3 className="text-sm font-medium text-white mb-3">Mapiranje polja ERP &rarr; VATROnet</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2e2e32]">
                <th className="text-left py-2 text-[#999] font-medium">DVD ERP polje</th>
                <th className="text-left py-2 text-[#999] font-medium">VATROnet polje</th>
                <th className="text-left py-2 text-[#999] font-medium">Napomena</th>
              </tr>
            </thead>
            <tbody className="text-[#bbb]">
              <tr className="border-b border-[#2a2a2e]"><td className="py-1.5">ime + prezime</td><td>Ime i prezime</td><td>Obavezno</td></tr>
              <tr className="border-b border-[#2a2a2e]"><td className="py-1.5">oib</td><td>OIB</td><td>Obavezno, 11 znamenki</td></tr>
              <tr className="border-b border-[#2a2a2e]"><td className="py-1.5">datum_rodenja</td><td>Datum rodenja</td><td>Format DD.MM.YYYY.</td></tr>
              <tr className="border-b border-[#2a2a2e]"><td className="py-1.5">ulica + kucni_broj</td><td>Adresa</td><td>—</td></tr>
              <tr className="border-b border-[#2a2a2e]"><td className="py-1.5">mjesto</td><td>Mjesto</td><td>—</td></tr>
              <tr className="border-b border-[#2a2a2e]"><td className="py-1.5">mobitel</td><td>Mobitel</td><td>Format +385...</td></tr>
              <tr className="border-b border-[#2a2a2e]"><td className="py-1.5">email</td><td>E-mail</td><td>—</td></tr>
              <tr className="border-b border-[#2a2a2e]"><td className="py-1.5">kategorija</td><td>Kategorija clana</td><td>Operativni / Izvršni / Počasni / Podmladak</td></tr>
              <tr className="border-b border-[#2a2a2e]"><td className="py-1.5">vatrogasno_zvanje</td><td>Vatrogasno zvanje</td><td>Prema Pravilniku NN 89/2024</td></tr>
              <tr className="border-b border-[#2a2a2e]"><td className="py-1.5">datum_uclanivanja</td><td>Datum učlanjivanja</td><td>—</td></tr>
              <tr className="border-b border-[#2a2a2e]"><td className="py-1.5">reg_oznaka</td><td>Registarska oznaka vozila</td><td>—</td></tr>
              <tr><td className="py-1.5">marka + model</td><td>Proizvođač / Model vozila</td><td>—</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
