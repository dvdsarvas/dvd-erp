import { useEffect, useState } from 'react'
import { useParams, useLocation } from 'wouter'
import { Link } from 'wouter'
import { dohvatiSjednicu, kreirajSjednicu, azurirajSjednicu, spremiTocku, obrisiTocku, dohvatiTocke, spremiPrisutnost, obrisiPrisutnost, dohvatiPrisutnost } from '@/lib/supabase/queries/sjednice'
import type { SjednicaInsert, VrstaSjednice, StatusSjednice, Tocka, Prisutnost } from '@/lib/supabase/queries/sjednice'
import type { Clan } from '@/lib/supabase/queries/clanovi'
import { dohvatiClanoveZaSjednicu } from '@/lib/supabase/queries/tijela'
import { useAuthStore } from '@/store/auth.store'
import { generirajUrbroj, generirajKlasu, sljedeciRedniBrojSjednice } from '@/lib/utils/urbroj'

const VRSTE: { value: VrstaSjednice; label: string }[] = [
  { value: 'skupstina_redovna', label: 'Redovna skupština' },
  { value: 'skupstina_izborna', label: 'Izborna skupština' },
  { value: 'skupstina_izvanredna', label: 'Izvanredna skupština' },
  { value: 'skupstina_konstitutivna', label: 'Konstitutivna skupština' },
  { value: 'upravni_odbor', label: 'Sjednica Upravnog odbora' },
  { value: 'zapovjednistvo', label: 'Sjednica Zapovjedništva' },
]

const STATUSI: { value: StatusSjednice; label: string }[] = [
  { value: 'planirana', label: 'Planirana' },
  { value: 'pozivnica_poslana', label: 'Pozivnica poslana' },
  { value: 'odrzana', label: 'Održana' },
  { value: 'zapisnik_potpisan', label: 'Zapisnik potpisan' },
  { value: 'arhivirana', label: 'Arhivirana' },
]

interface Forma {
  vrsta: VrstaSjednice
  naziv: string
  datum: string
  sat_pocetka: string
  sat_zavrsetka: string
  mjesto: string
  status: StatusSjednice
  urbroj: string
  klasa: string
  napomena: string
}

export function SjednicaForma({ defaultVrsta }: { defaultVrsta?: VrstaSjednice }) {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const { korisnik } = useAuthStore()
  const isEdit = params.id && params.id !== 'nova'

  const [forma, setForma] = useState<Forma>({
    vrsta: defaultVrsta || 'upravni_odbor',
    naziv: '',
    datum: new Date().toISOString().split('T')[0],
    sat_pocetka: '18:00',
    sat_zavrsetka: '',
    mjesto: 'Prostorije DVD-a Sarvaš, Ivana Mažuranića 31',
    status: 'planirana',
    urbroj: '',
    klasa: '',
    napomena: '',
  })
  const [tocke, setTocke] = useState<Tocka[]>([])
  const [novaTocka, setNovaTocka] = useState('')
  const [clanovi, setClanovi] = useState<Clan[]>([])
  const [prisutniIds, setPrisutniIds] = useState<Set<string>>(new Set())
  const [existingPrisutnost, setExistingPrisutnost] = useState<Prisutnost[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(!!isEdit)
  const [greska, setGreska] = useState('')
  const [step, setStep] = useState<'podaci' | 'dnevni_red' | 'prisutnost'>('podaci')

  // Auto-generiranje URBROJ i KLASA za nove sjednice
  useEffect(() => {
    if (isEdit) return
    const godina = forma.datum ? new Date(forma.datum).getFullYear() : new Date().getFullYear()
    sljedeciRedniBrojSjednice(forma.vrsta, godina).then(rb => {
      const vrstaUrbroja = forma.vrsta.startsWith('skupstina') ? 'skupstina' as const
        : forma.vrsta === 'upravni_odbor' ? 'uo' as const
        : 'zapovjednistvo' as const
      setForma(f => ({
        ...f,
        urbroj: generirajUrbroj(vrstaUrbroja, godina, rb),
        klasa: generirajKlasu(vrstaUrbroja, godina, rb),
      }))
    }).catch(console.error)
  }, [forma.vrsta, forma.datum, isEdit])

  // Učitaj članove prema vrsti sjednice (tijela)
  // Za skupštinu: svi aktivni članovi; za UO/Zapovjedništvo: samo članovi tijela
  useEffect(() => {
    let cancelled = false
    dohvatiClanoveZaSjednicu(forma.vrsta)
      .then(d => { if (!cancelled) setClanovi(d) })
      .catch(() => {
        // Fallback ako tijela_dvd tablica ne postoji — dohvati sve aktivne
        import('@/lib/supabase/queries/clanovi').then(({ dohvatiClanove }) => {
          dohvatiClanove({ status: 'aktivan' }).then(d => { if (!cancelled) setClanovi(d) })
        })
      })
    return () => { cancelled = true }
  }, [forma.vrsta])

  useEffect(() => {
    if (!isEdit || !params.id) return
    let cancelled = false
    Promise.all([
      dohvatiSjednicu(params.id),
      dohvatiTocke(params.id),
      dohvatiPrisutnost(params.id),
    ]).then(([s, t, p]) => {
      if (cancelled) return
      setForma({
        vrsta: s.vrsta,
        naziv: s.naziv,
        datum: s.datum,
        sat_pocetka: s.sat_pocetka || '',
        sat_zavrsetka: s.sat_zavrsetka || '',
        mjesto: s.mjesto || '',
        status: s.status,
        urbroj: s.urbroj || '',
        klasa: s.klasa || '',
        napomena: s.napomena || '',
      })
      setTocke(t)
      setExistingPrisutnost(p)
      setPrisutniIds(new Set(p.filter(pr => pr.prisutan).map(pr => pr.clan_id)))
      setLoadingData(false)
    }).catch(() => {
      if (cancelled) return
      setGreska('Greška pri učitavanju.')
      setLoadingData(false)
    })
    return () => { cancelled = true }
  }, [isEdit, params.id])

  // Kopiranje prošle sjednice (URL param ?kopiraj=ID&datum=YYYY-MM-DD)
  useEffect(() => {
    if (isEdit) return
    const searchParams = new URLSearchParams(window.location.search)
    const kopirajId = searchParams.get('kopiraj')
    const novaDatum = searchParams.get('datum')
    if (!kopirajId) return

    Promise.all([
      dohvatiSjednicu(kopirajId),
      dohvatiTocke(kopirajId),
    ]).then(([prosla, prosleTocke]) => {
      setForma(f => ({
        ...f,
        naziv: prosla.naziv.replace(/\d{4}/, String(new Date().getFullYear())),
        vrsta: prosla.vrsta,
        datum: novaDatum || f.datum,
        mjesto: prosla.mjesto || f.mjesto,
        sat_pocetka: prosla.sat_pocetka || f.sat_pocetka,
      }))
      // Kopiraj točke dnevnog reda
      setTocke(prosleTocke.map(t => ({
        ...t,
        id: `temp-${Math.random().toString(36).slice(2)}`,
        sjednica_id: '',
      })))
    }).catch(console.error)
  }, [isEdit])

  function handleChange(field: keyof Forma, value: string) {
    setForma(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGreska('')

    if (!forma.naziv.trim()) { setGreska('Naziv je obavezan.'); return }
    if (!forma.datum) { setGreska('Datum je obavezan.'); return }

    setLoading(true)
    try {
      const podaci: SjednicaInsert = {
        vrsta: forma.vrsta,
        naziv: forma.naziv.trim(),
        datum: forma.datum,
        sat_pocetka: forma.sat_pocetka || null,
        sat_zavrsetka: forma.sat_zavrsetka || null,
        mjesto: forma.mjesto.trim() || null,
        status: forma.status,
        urbroj: forma.urbroj.trim() || null,
        klasa: forma.klasa.trim() || null,
        napomena: forma.napomena.trim() || null,
        created_by: korisnik?.id || null,
      }

      let sjednicaId: string
      if (isEdit && params.id) {
        await azurirajSjednicu(params.id, podaci)
        sjednicaId = params.id
      } else {
        const nova = await kreirajSjednicu(podaci)
        sjednicaId = nova.id
      }

      // Spremi prisutnost
      for (const clanId of prisutniIds) {
        await spremiPrisutnost({ sjednica_id: sjednicaId, clan_id: clanId, prisutan: true })
      }
      // Obriši one koji su uklonjeni
      for (const p of existingPrisutnost) {
        if (!prisutniIds.has(p.clan_id)) {
          await obrisiPrisutnost(sjednicaId, p.clan_id)
        }
      }

      navigate(`/sjednice/${sjednicaId}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nepoznata greška'
      setGreska(`Greška: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  async function dodajTocku() {
    if (!novaTocka.trim() || !isEdit || !params.id) return
    try {
      await spremiTocku({
        sjednica_id: params.id,
        redni_broj: tocke.length + 1,
        naziv: novaTocka.trim(),
      })
      const t = await dohvatiTocke(params.id)
      setTocke(t)
      setNovaTocka('')
    } catch (err) {
      console.error('Greška:', err)
    }
  }

  async function ukloniTocku(id: string) {
    if (!params.id) return
    try {
      await obrisiTocku(id)
      const t = await dohvatiTocke(params.id)
      setTocke(t)
    } catch (err) {
      console.error('Greška:', err)
    }
  }

  function togglePrisutnost(clanId: string) {
    setPrisutniIds(prev => {
      const next = new Set(prev)
      if (next.has(clanId)) next.delete(clanId)
      else next.add(clanId)
      return next
    })
  }

  if (loadingData) return <div className="p-8 text-[#999]">Učitavanje...</div>

  return (
    <div>
      <div className="mb-6">
        <Link href={backPath(forma.vrsta)} className="text-sm text-[#777] hover:text-[#bbb]">
          ← Natrag
        </Link>
        <h1 className="text-xl font-medium text-white mt-1">
          {isEdit ? 'Uredi sjednicu' : 'Nova sjednica'}
        </h1>
      </div>

      {/* Koraci */}
      <div className="flex gap-2 mb-6">
        {(['podaci', 'prisutnost'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`px-4 py-2 text-sm rounded-lg ${step === s ? 'bg-red-600 text-white' : 'bg-[#2a2a2e] text-[#bbb] hover:bg-[#3a3a3e]'}`}
          >
            {s === 'podaci' ? '1. Podaci' : '2. Prisutnost'}
          </button>
        ))}
        {isEdit && (
          <button
            onClick={() => setStep('dnevni_red')}
            className={`px-4 py-2 text-sm rounded-lg ${step === 'dnevni_red' ? 'bg-red-600 text-white' : 'bg-[#2a2a2e] text-[#bbb] hover:bg-[#3a3a3e]'}`}
          >
            3. Dnevni red
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        {/* Korak 1: Podaci */}
        {step === 'podaci' && (
          <div className="bg-[#242428] border border-[#333338] rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#999] mb-1">Vrsta *</label>
                <select value={forma.vrsta} onChange={e => handleChange('vrsta', e.target.value)}
                  className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]">
                  {VRSTE.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">Status</label>
                <select value={forma.status} onChange={e => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm bg-[#242428]">
                  {STATUSI.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-[#999] mb-1">Naziv *</label>
                <input type="text" value={forma.naziv} onChange={e => handleChange('naziv', e.target.value)}
                  placeholder="npr. 15. redovna skupština DVD-a Sarvaš"
                  className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">Datum *</label>
                <input type="date" value={forma.datum} onChange={e => handleChange('datum', e.target.value)}
                  className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-[#999] mb-1">Početak</label>
                  <input type="time" value={forma.sat_pocetka} onChange={e => handleChange('sat_pocetka', e.target.value)}
                    className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-[#999] mb-1">Završetak</label>
                  <input type="time" value={forma.sat_zavrsetka} onChange={e => handleChange('sat_zavrsetka', e.target.value)}
                    className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-[#999] mb-1">Mjesto</label>
                <input type="text" value={forma.mjesto} onChange={e => handleChange('mjesto', e.target.value)}
                  className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">URBROJ</label>
                <input type="text" value={forma.urbroj} onChange={e => handleChange('urbroj', e.target.value)}
                  placeholder="DVD-Sarvas-2026-S/001"
                  className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">KLASA</label>
                <input type="text" value={forma.klasa} onChange={e => handleChange('klasa', e.target.value)}
                  placeholder="810-01/2026-01"
                  className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-[#999] mb-1">Napomena</label>
                <textarea value={forma.napomena} onChange={e => handleChange('napomena', e.target.value)}
                  rows={2} className="w-full px-3 py-2 border border-[#333338] rounded-lg text-sm" />
              </div>
            </div>
          </div>
        )}

        {/* Korak 2: Prisutnost */}
        {step === 'prisutnost' && (
          <div className="bg-[#242428] border border-[#333338] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-white">Evidencija prisutnosti</h2>
              <span className="text-sm text-[#999]">{prisutniIds.size} / {clanovi.length} prisutno</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-96 overflow-y-auto">
              {clanovi.map(c => (
                <label key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-[#1e1e22] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prisutniIds.has(c.id)}
                    onChange={() => togglePrisutnost(c.id)}
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-[#ddd]">{c.prezime} {c.ime}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Korak 3: Dnevni red (samo edit) */}
        {step === 'dnevni_red' && isEdit && (
          <div className="bg-[#242428] border border-[#333338] rounded-xl p-6">
            <h2 className="text-sm font-medium text-white mb-4">Točke dnevnog reda</h2>
            <div className="space-y-2 mb-4">
              {tocke.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 border border-[#2e2e32] rounded-lg">
                  <span className="text-xs font-medium text-[#777] w-6 text-center">{t.redni_broj}.</span>
                  <span className="flex-1 text-sm text-[#ddd]">{t.naziv}</span>
                  <button type="button" onClick={() => ukloniTocku(t.id)} className="text-xs text-red-500 hover:text-red-400">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={novaTocka}
                onChange={e => setNovaTocka(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), dodajTocku())}
                placeholder="Nova točka dnevnog reda..."
                className="flex-1 px-3 py-2 border border-[#333338] rounded-lg text-sm"
              />
              <button type="button" onClick={dodajTocku} className="px-4 py-2 bg-[#2a2a2e] text-[#ddd] text-sm rounded-lg hover:bg-[#3a3a3e]">
                Dodaj
              </button>
            </div>
          </div>
        )}

        {/* Greška i gumbi */}
        {greska && (
          <div className="mt-4 bg-red-50 text-red-400 text-sm px-4 py-3 rounded-lg">{greska}</div>
        )}

        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
            {loading ? 'Spremanje...' : (isEdit ? 'Spremi promjene' : 'Kreiraj sjednicu')}
          </button>
          <Link href={backPath(forma.vrsta)} className="px-6 py-2 bg-[#2a2a2e] text-[#ddd] text-sm font-medium rounded-lg hover:bg-[#3a3a3e]">
            Odustani
          </Link>
        </div>
      </form>
    </div>
  )
}

function backPath(vrsta: string): string {
  if (vrsta.startsWith('skupstina')) return '/sjednice/skupstine'
  if (vrsta === 'upravni_odbor') return '/sjednice/upravni-odbor'
  return '/sjednice/zapovjednistvo'
}
