import { useEffect, useState } from 'react'
import { useParams, useLocation } from 'wouter'
import { Link } from 'wouter'
import { dohvatiClana, kreirajClana, azurirajClana } from '@/lib/supabase/queries/clanovi'
import type { ClanInsert, ClanUpdate } from '@/lib/supabase/queries/clanovi'
import { useAuthStore } from '@/store/auth.store'

const KATEGORIJE = [
  { value: 'dobrovoljni_vatrogasac', label: 'Dobrovoljni vatrogasac' },
  { value: 'prikljuceni', label: 'Priključeni' },
  { value: 'pocasni', label: 'Počasni' },
  { value: 'podmladak', label: 'Podmladak' },
]

const STATUSI = [
  { value: 'aktivan', label: 'Aktivan' },
  { value: 'neaktivan', label: 'Neaktivan' },
  { value: 'istupio', label: 'Istupio' },
  { value: 'iskljucen', label: 'Isključen' },
]

interface Forma {
  ime: string
  prezime: string
  oib: string
  datum_rodenja: string
  mjesto_rodenja: string
  ulica: string
  kucni_broj: string
  mjesto: string
  postanski_broj: string
  mobitel: string
  email: string
  kategorija: string
  datum_uclanivanja: string
  status: string
  vatrogasno_zvanje: string
  datum_stjecanja_zvanja: string
}

const praznForma: Forma = {
  ime: '',
  prezime: '',
  oib: '',
  datum_rodenja: '',
  mjesto_rodenja: '',
  ulica: '',
  kucni_broj: '',
  mjesto: '',
  postanski_broj: '',
  mobitel: '',
  email: '',
  kategorija: 'dobrovoljni_vatrogasac',
  datum_uclanivanja: new Date().toISOString().split('T')[0],
  status: 'aktivan',
  vatrogasno_zvanje: '',
  datum_stjecanja_zvanja: '',
}

export function ClanForma() {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const { korisnik } = useAuthStore()
  const isEdit = params.id && params.id !== 'novi'

  const [forma, setForma] = useState<Forma>(praznForma)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(!!isEdit)
  const [greska, setGreska] = useState('')

  useEffect(() => {
    if (!isEdit || !params.id) return
    let cancelled = false
    dohvatiClana(params.id).then(clan => {
      if (cancelled) return
      setForma({
        ime: clan.ime,
        prezime: clan.prezime,
        oib: clan.oib,
        datum_rodenja: clan.datum_rodenja || '',
        mjesto_rodenja: clan.mjesto_rodenja || '',
        ulica: clan.ulica || '',
        kucni_broj: clan.kucni_broj || '',
        mjesto: clan.mjesto || '',
        postanski_broj: clan.postanski_broj || '',
        mobitel: clan.mobitel || '',
        email: clan.email || '',
        kategorija: clan.kategorija,
        datum_uclanivanja: clan.datum_uclanivanja,
        status: clan.status,
        vatrogasno_zvanje: clan.vatrogasno_zvanje || '',
        datum_stjecanja_zvanja: clan.datum_stjecanja_zvanja || '',
      })
      setLoadingData(false)
    }).catch(() => {
      if (cancelled) return
      setGreska('Greška pri učitavanju člana.')
      setLoadingData(false)
    })
    return () => { cancelled = true }
  }, [isEdit, params.id])

  function handleChange(field: keyof Forma, value: string) {
    setForma(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGreska('')

    // Validacija
    if (!forma.ime.trim() || !forma.prezime.trim()) {
      setGreska('Ime i prezime su obavezni.')
      return
    }
    if (!forma.oib.trim() || forma.oib.length !== 11) {
      setGreska('OIB mora imati točno 11 znamenki.')
      return
    }
    if (!forma.datum_uclanivanja) {
      setGreska('Datum učlanjivanja je obavezan.')
      return
    }

    setLoading(true)
    try {
      const podaci = {
        ime: forma.ime.trim(),
        prezime: forma.prezime.trim(),
        oib: forma.oib.trim(),
        datum_rodenja: forma.datum_rodenja || null,
        mjesto_rodenja: forma.mjesto_rodenja.trim() || null,
        ulica: forma.ulica.trim() || null,
        kucni_broj: forma.kucni_broj.trim() || null,
        mjesto: forma.mjesto.trim() || null,
        postanski_broj: forma.postanski_broj.trim() || null,
        mobitel: forma.mobitel.trim() || null,
        email: forma.email.trim() || null,
        kategorija: forma.kategorija as ClanInsert['kategorija'],
        datum_uclanivanja: forma.datum_uclanivanja,
        status: forma.status as ClanInsert['status'],
        vatrogasno_zvanje: forma.vatrogasno_zvanje.trim() || null,
        datum_stjecanja_zvanja: forma.datum_stjecanja_zvanja || null,
        updated_by: korisnik?.id || null,
      }

      if (isEdit && params.id) {
        await azurirajClana(params.id, podaci as ClanUpdate)
        navigate(`/clanstvo/${params.id}`)
      } else {
        const novi = await kreirajClana(podaci as ClanInsert)
        navigate(`/clanstvo/${novi.id}`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nepoznata greška'
      if (msg.includes('duplicate') || msg.includes('unique')) {
        setGreska('Član s ovim OIB-om već postoji.')
      } else {
        setGreska(`Greška pri spremanju: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <div className="p-8 text-[#999]">Učitavanje...</div>
  }

  return (
    <div>
      {/* Zaglavlje */}
      <div className="mb-6">
        <Link href="/clanstvo" className="text-sm text-[#777] hover:text-[#bbb]">
          ← Članstvo
        </Link>
        <h1 className="text-xl font-medium text-white mt-1">
          {isEdit ? 'Uredi člana' : 'Novi član'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Osobni podaci */}
        <Sekcija naslov="Osobni podaci">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PoljeInput label="Ime *" value={forma.ime} onChange={v => handleChange('ime', v)} />
            <PoljeInput label="Prezime *" value={forma.prezime} onChange={v => handleChange('prezime', v)} />
            <PoljeInput label="OIB *" value={forma.oib} onChange={v => handleChange('oib', v)} maxLength={11} />
            <PoljeInput label="Datum rođenja" type="date" value={forma.datum_rodenja} onChange={v => handleChange('datum_rodenja', v)} />
            <PoljeInput label="Mjesto rođenja" value={forma.mjesto_rodenja} onChange={v => handleChange('mjesto_rodenja', v)} />
          </div>
        </Sekcija>

        {/* Adresa i kontakt */}
        <Sekcija naslov="Adresa i kontakt">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PoljeInput label="Ulica" value={forma.ulica} onChange={v => handleChange('ulica', v)} />
            <PoljeInput label="Kućni broj" value={forma.kucni_broj} onChange={v => handleChange('kucni_broj', v)} />
            <PoljeInput label="Mjesto" value={forma.mjesto} onChange={v => handleChange('mjesto', v)} />
            <PoljeInput label="Poštanski broj" value={forma.postanski_broj} onChange={v => handleChange('postanski_broj', v)} />
            <PoljeInput label="Mobitel" value={forma.mobitel} onChange={v => handleChange('mobitel', v)} />
            <PoljeInput label="Email" type="email" value={forma.email} onChange={v => handleChange('email', v)} />
          </div>
        </Sekcija>

        {/* Članstvo */}
        <Sekcija naslov="Članstvo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PoljeSelect label="Kategorija *" value={forma.kategorija} onChange={v => handleChange('kategorija', v)} opcije={KATEGORIJE} />
            <PoljeInput label="Datum učlanjivanja *" type="date" value={forma.datum_uclanivanja} onChange={v => handleChange('datum_uclanivanja', v)} />
            <PoljeSelect label="Status" value={forma.status} onChange={v => handleChange('status', v)} opcije={STATUSI} />
          </div>
        </Sekcija>

        {/* Vatrogasno */}
        <Sekcija naslov="Vatrogasni podaci">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PoljeInput label="Vatrogasno zvanje" value={forma.vatrogasno_zvanje} onChange={v => handleChange('vatrogasno_zvanje', v)} />
            <PoljeInput label="Datum stjecanja zvanja" type="date" value={forma.datum_stjecanja_zvanja} onChange={v => handleChange('datum_stjecanja_zvanja', v)} />
          </div>
        </Sekcija>

        {/* Greška i gumbi */}
        {greska && (
          <div className="bg-red-50 text-red-400 text-sm px-4 py-3 rounded-lg">
            {greska}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Spremanje...' : (isEdit ? 'Spremi promjene' : 'Dodaj člana')}
          </button>
          <Link href="/clanstvo" className="px-6 py-2 bg-[#2a2a2e] text-[#ddd] text-sm font-medium rounded-lg hover:bg-[#3a3a3e] transition-colors">
            Odustani
          </Link>
        </div>
      </form>
    </div>
  )
}

// ── Pomoćne komponente ─────────────────────────────────────

function Sekcija({ naslov, children }: { naslov: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#242428] border border-[#333338] rounded-xl p-6">
      <h2 className="text-sm font-medium text-white mb-4">{naslov}</h2>
      {children}
    </div>
  )
}

function PoljeInput({
  label, value, onChange, type = 'text', maxLength,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; maxLength?: number
}) {
  return (
    <div>
      <label className="block text-xs text-[#999] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={maxLength}
        className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
      />
    </div>
  )
}

function PoljeSelect({
  label, value, onChange, opcije,
}: {
  label: string; value: string; onChange: (v: string) => void; opcije: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-xs text-[#999] mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428] focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        {opcije.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
