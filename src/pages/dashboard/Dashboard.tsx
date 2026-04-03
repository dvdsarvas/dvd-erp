import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth.store'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { dohvatiClanoveSPregledom } from '@/lib/supabase/queries/zdravlje'
import type { ClanZdravlje } from '@/lib/supabase/queries/zdravlje'

interface Stats {
  aktivnih_clanova: number
  operativnih_vatrogasaca: number
  otvorenih_izvjesca: number
  nadolazecih_sjednica: number
  neplacenih_racuna: number
}

interface Alarm {
  id: string
  tekst: string
  rok: string
  dani: number
  href: string
  hitnost: 'crveno' | 'narancasto' | 'zuto'
}

export function Dashboard() {
  const { korisnik } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [alarmi, setAlarmi] = useState<Alarm[]>([])
  const [, setZdravljeAlarmi] = useState<ClanZdravlje[]>([])
  const [recentSjednice, setRecentSjednice] = useState<{ id: string; naziv: string; datum: string; status: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function ucitaj() {
      try {
        const danas = new Date()
        const [clanovi, izvjesca, sjednice, racuniData] = await Promise.all([
          supabase.from('clanovi').select('kategorija', { count: 'exact' }).eq('status', 'aktivan'),
          supabase.from('zakonska_izvjesca').select('id', { count: 'exact' }).in('status', ['nije_predano', 'u_pripremi']),
          supabase.from('sjednice').select('id', { count: 'exact' }).gte('datum', danas.toISOString().split('T')[0]).eq('status', 'planirana'),
          supabase.from('racuni').select('iznos_ukupno').in('status', ['primljeno', 'u_obradi', 'odobreno']),
        ])

        setStats({
          aktivnih_clanova: clanovi.count ?? 0,
          operativnih_vatrogasaca: clanovi.data?.filter(c => c.kategorija === 'dobrovoljni_vatrogasac').length ?? 0,
          otvorenih_izvjesca: izvjesca.count ?? 0,
          nadolazecih_sjednica: sjednice.count ?? 0,
          neplacenih_racuna: racuniData.data?.length ?? 0,
        })

        // Alarmi
        const noviAlarmi: Alarm[] = []

        const { data: izvjescaData } = await supabase
          .from('zakonska_izvjesca').select('id, naziv, rok, status')
          .in('status', ['nije_predano', 'u_pripremi']).not('rok', 'is', null).order('rok')

        if (izvjescaData) {
          izvjescaData.forEach(iz => {
            if (!iz.rok) return
            const dani = Math.ceil((new Date(iz.rok).getTime() - danas.getTime()) / 86400000)
            if (dani <= 60) noviAlarmi.push({ id: iz.id, tekst: iz.naziv, rok: iz.rok, dani, href: '/zakonska-izvjesca', hitnost: dani < 0 ? 'crveno' : dani <= 7 ? 'narancasto' : 'zuto' })
          })
        }

        const { data: vozilaData } = await supabase.from('imovina').select('id, naziv, registracija_do').eq('vrsta', 'vozilo')
        if (vozilaData) {
          vozilaData.forEach(v => {
            if (v.registracija_do) {
              const dani = Math.ceil((new Date(v.registracija_do).getTime() - danas.getTime()) / 86400000)
              if (dani <= 60) noviAlarmi.push({ id: `reg-${v.id}`, tekst: `Registracija: ${v.naziv}`, rok: v.registracija_do, dani, href: '/imovina', hitnost: dani < 0 ? 'crveno' : dani <= 30 ? 'narancasto' : 'zuto' })
            }
          })
        }

        try {
          const zdravlje = await dohvatiClanoveSPregledom(90)
          zdravlje.forEach(z => {
            const dani = z.dani_do_isteka
            if (dani !== null && dani <= 60) noviAlarmi.push({ id: `zdrav-${z.clan_id}`, tekst: `Liječnički: ${z.prezime} ${z.ime}`, rok: z.sljedeci_pregled || '', dani, href: `/clanstvo/${z.clan_id}`, hitnost: dani < 0 ? 'crveno' : dani <= 14 ? 'narancasto' : 'zuto' })
          })
          setZdravljeAlarmi(zdravlje)
        } catch {}

        const { data: skupstineBezDostave } = await supabase.from('sjednice').select('id, naziv, datum').like('vrsta', 'skupstina%').in('status', ['odrzana', 'zapisnik_potpisan'])
        if (skupstineBezDostave) {
          skupstineBezDostave.forEach(s => {
            const rok = new Date(s.datum); rok.setDate(rok.getDate() + 14)
            const dani = Math.ceil((rok.getTime() - danas.getTime()) / 86400000)
            if (dani <= 30) noviAlarmi.push({ id: `dostava-${s.id}`, tekst: `Dostava zapisnika: ${s.naziv}`, rok: rok.toISOString().split('T')[0], dani, href: `/sjednice/${s.id}`, hitnost: dani < 0 ? 'crveno' : dani <= 7 ? 'narancasto' : 'zuto' })
          })
        }

        noviAlarmi.sort((a, b) => a.dani - b.dani)
        setAlarmi(noviAlarmi)

        const { data: zadnjeSjednice } = await supabase.from('sjednice').select('id, naziv, datum, status').order('datum', { ascending: false }).limit(5)
        if (zadnjeSjednice) setRecentSjednice(zadnjeSjednice)

      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    ucitaj()
  }, [])

  const sat = new Date().getHours()
  const pozdrav = sat < 12 ? 'Dobro jutro' : sat < 18 ? 'Dobar dan' : 'Dobra večer'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{pozdrav}, {korisnik?.ime}</h1>
        <p className="text-sm text-[#aaa] mt-1">
          DVD Sarvaš &middot; {new Date().toLocaleDateString('hr-HR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KPI label="Aktivnih članova" value={loading ? '...' : stats?.aktivnih_clanova ?? 0} color="red" />
        <KPI label="Operativnih vatrog." value={loading ? '...' : stats?.operativnih_vatrogasaca ?? 0} color="green" />
        <KPI label="Otvorenih izvješća" value={loading ? '...' : stats?.otvorenih_izvjesca ?? 0} color={stats && stats.otvorenih_izvjesca > 0 ? 'red' : 'green'} />
        <KPI label="Neplaćenih računa" value={loading ? '...' : stats?.neplacenih_racuna ?? 0} color={stats && stats.neplacenih_racuna > 0 ? 'orange' : 'green'} />
        <KPI label="Planiranih sjednica" value={loading ? '...' : stats?.nadolazecih_sjednica ?? 0} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Alarmi */}
        <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#333338] flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Rokovi i upozorenja</span>
            {alarmi.length > 0 && <span className="bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{alarmi.length}</span>}
          </div>
          <div className="divide-y divide-[#222]">
            {loading ? <div className="p-5 text-sm text-[#777]">Učitavanje...</div>
            : alarmi.length === 0 ? <div className="p-5 text-sm text-[#777]">Nema hitnih rokova.</div>
            : alarmi.slice(0, 8).map(a => (
              <Link key={a.id} href={a.href} className="flex items-center gap-3 px-5 py-3 hover:bg-[#2a2a2e] transition-colors">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.hitnost === 'crveno' ? 'bg-red-500 animate-pulse' : a.hitnost === 'narancasto' ? 'bg-orange-500/20' : 'bg-yellow-500/20'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[#ddd] truncate">{a.tekst}</div>
                  <div className="text-[11px] text-[#777]">{new Date(a.rok).toLocaleDateString('hr-HR')}</div>
                </div>
                <span className={`text-[11px] font-semibold ${a.dani < 0 ? 'text-red-400' : a.dani <= 7 ? 'text-orange-400' : 'text-yellow-500'}`}>
                  {a.dani < 0 ? `${Math.abs(a.dani)}d kasni` : a.dani === 0 ? 'Danas' : `${a.dani}d`}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Nedavne sjednice */}
        <div className="bg-[#242428] border border-[#333338] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#333338] flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Nedavne sjednice</span>
            <Link href="/zapisnici" className="text-[11px] text-red-400 hover:text-red-300">Sve &rarr;</Link>
          </div>
          <div className="divide-y divide-[#222]">
            {loading ? <div className="p-5 text-sm text-[#777]">Učitavanje...</div>
            : recentSjednice.length === 0 ? <div className="p-5 text-sm text-[#777]">Nema sjednica.</div>
            : recentSjednice.map(s => (
              <Link key={s.id} href={`/sjednice/${s.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-[#2a2a2e] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[#ddd] truncate">{s.naziv}</div>
                  <div className="text-[11px] text-[#777]">{new Date(s.datum).toLocaleDateString('hr-HR')}</div>
                </div>
                <StatusBadge status={s.status} varijanta="sjednica" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Brze akcije */}
      <div>
        <h2 className="text-sm font-bold text-white mb-3">Brze akcije</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Nova sjednica UO', href: '/sjednice/upravni-odbor/nova' },
            { label: 'Novi član', href: '/clanstvo/novi' },
            { label: 'Nova intervencija', href: '/vatrogasna' },
            { label: 'Zakonska izvješća', href: '/zakonska-izvjesca' },
            { label: 'Plan rada', href: '/plan-rada' },
            { label: 'Financije', href: '/financije' },
            { label: 'Nabava', href: '/nabava' },
            { label: 'Imovina', href: '/imovina' },
          ].map(a => (
            <Link key={a.href} href={a.href}
              className="flex items-center gap-3 p-4 bg-[#242428] border border-[#333338] rounded-xl hover:border-red-900/50 hover:bg-[#2a2428] transition-all">
              <span className="text-[13px] font-medium text-[#bbb]">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function KPI({ label, value, color }: { label: string; value: number | string; color: string }) {
  const colors: Record<string, string> = {
    red: 'text-red-400', green: 'text-emerald-400', blue: 'text-blue-400', orange: 'text-orange-400',
  }
  const bgColors: Record<string, string> = {
    red: 'bg-red-600/10', green: 'bg-emerald-600/10', blue: 'bg-blue-600/10', orange: 'bg-orange-600/10',
  }
  return (
    <div className={`${bgColors[color] || bgColors.red} border border-[#333338] rounded-xl p-4`}>
      <div className={`text-3xl font-bold ${colors[color] || colors.red}`}>{value}</div>
      <div className="text-[11px] text-[#aaa] mt-1 uppercase tracking-wider">{label}</div>
    </div>
  )
}

