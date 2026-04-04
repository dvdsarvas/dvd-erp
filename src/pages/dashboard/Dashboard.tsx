import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { motion } from 'framer-motion'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth.store'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { dohvatiFinPlan, dohvatiStavkePlana } from '@/lib/supabase/queries/financije'
import { dohvatiClanoveSPregledom } from '@/lib/supabase/queries/zdravlje'
import type { ClanZdravlje } from '@/lib/supabase/queries/zdravlje'
import { fadeUp, slideIn } from '@/lib/animations'

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

interface MjesecData {
  mjesec: string
  sjednice: number
  intervencije: number
}

interface FinData {
  naziv: string
  plan: number
  ostvareno: number
}

function useAnimatedCounter(target: number, duration = 1000) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target) return
    let current = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      current += increment
      if (current >= target) { setValue(target); clearInterval(timer) }
      else setValue(Math.floor(current))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

const MJESECI = ['Sij', 'Velj', 'Ožu', 'Tra', 'Svi', 'Lip', 'Srp', 'Kol', 'Ruj', 'Lis', 'Stu', 'Pro']

export function Dashboard() {
  const { korisnik } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [alarmi, setAlarmi] = useState<Alarm[]>([])
  const [, setZdravljeAlarmi] = useState<ClanZdravlje[]>([])
  const [recentSjednice, setRecentSjednice] = useState<{ id: string; naziv: string; datum: string; status: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [aktivnostData, setAktivnostData] = useState<MjesecData[]>([])
  const [financijskiData, setFinancijskiData] = useState<FinData[]>([])

  useEffect(() => {
    let cancelled = false
    async function ucitaj() {
      try {
        const danas = new Date()
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0]

        const [clanovi, izvjesca, sjednice, racuniData] = await Promise.all([
          supabase.from('clanovi').select('kategorija', { count: 'exact' }).eq('status', 'aktivan'),
          supabase.from('zakonska_izvjesca').select('id', { count: 'exact' }).in('status', ['nije_predano', 'u_pripremi']),
          supabase.from('sjednice').select('id', { count: 'exact' }).gte('datum', danas.toISOString().split('T')[0]).eq('status', 'planirana'),
          supabase.from('racuni').select('iznos_ukupno').in('status', ['primljeno', 'u_obradi', 'odobreno']),
        ])

        if (cancelled) return

        setStats({
          aktivnih_clanova: clanovi.count ?? 0,
          operativnih_vatrogasaca: clanovi.data?.filter(c => c.kategorija === 'dobrovoljni_vatrogasac').length ?? 0,
          otvorenih_izvjesca: izvjesca.count ?? 0,
          nadolazecih_sjednica: sjednice.count ?? 0,
          neplacenih_racuna: racuniData.data?.length ?? 0,
        })

        // Aktivnost po mjesecima
        const [sjedniceMonth, intervencijeMonth] = await Promise.all([
          supabase.from('sjednice').select('datum').gte('datum', sixMonthsAgoStr),
          supabase.from('intervencije').select('datum_dojave').gte('datum_dojave', sixMonthsAgoStr),
        ])

        const monthMap: Record<string, { sjednice: number; intervencije: number }> = {}
        for (let i = 5; i >= 0; i--) {
          const d = new Date()
          d.setMonth(d.getMonth() - i)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          monthMap[key] = { sjednice: 0, intervencije: 0 }
        }

        sjedniceMonth.data?.forEach(s => {
          const key = s.datum?.substring(0, 7)
          if (key && monthMap[key]) monthMap[key].sjednice++
        })
        intervencijeMonth.data?.forEach(i => {
          const key = i.datum_dojave?.substring(0, 7)
          if (key && monthMap[key]) monthMap[key].intervencije++
        })

        setAktivnostData(Object.entries(monthMap).map(([key, val]) => ({
          mjesec: MJESECI[parseInt(key.split('-')[1]) - 1],
          ...val,
        })))

        // Financijski podaci
        try {
          const finPlan = await dohvatiFinPlan(danas.getFullYear())
          if (finPlan) {
            const stavke = await dohvatiStavkePlana(finPlan.id)
            const prihodiPlan = stavke.filter(s => s.kategorija === 'prihod').reduce((a, s) => a + (s.iznos_plan || 0), 0)
            const prihodiOstvareno = stavke.filter(s => s.kategorija === 'prihod').reduce((a, s) => a + (s.iznos_ostvareno || 0), 0)
            const rashodiPlan = stavke.filter(s => s.kategorija === 'rashod').reduce((a, s) => a + (s.iznos_plan || 0), 0)
            const rashodiOstvareno = stavke.filter(s => s.kategorija === 'rashod').reduce((a, s) => a + (s.iznos_ostvareno || 0), 0)
            setFinancijskiData([
              { naziv: 'Prihodi', plan: prihodiPlan, ostvareno: prihodiOstvareno },
              { naziv: 'Rashodi', plan: rashodiPlan, ostvareno: rashodiOstvareno },
            ])
          } else {
            setFinancijskiData([
              { naziv: 'Prihodi', plan: 0, ostvareno: 0 },
              { naziv: 'Rashodi', plan: 0, ostvareno: 0 },
            ])
          }
        } catch {
          setFinancijskiData([
            { naziv: 'Prihodi', plan: 0, ostvareno: 0 },
            { naziv: 'Rashodi', plan: 0, ostvareno: 0 },
          ])
        }

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

      } catch (err) { if (!cancelled) console.error(err) }
      finally { if (!cancelled) setLoading(false) }
    }
    ucitaj()
    return () => { cancelled = true }
  }, [])

  const sat = new Date().getHours()
  const pozdrav = sat < 12 ? 'Dobro jutro' : sat < 18 ? 'Dobar dan' : 'Dobra večer'

  return (
    <div>
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{pozdrav}, {korisnik?.ime}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          DVD Sarvaš &middot; {new Date().toLocaleDateString('hr-HR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </motion.div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KPI label="Aktivnih članova" value={loading ? 0 : stats?.aktivnih_clanova ?? 0} color="accent" index={0} loading={loading} />
        <KPI label="Operativnih vatrog." value={loading ? 0 : stats?.operativnih_vatrogasaca ?? 0} color="success" index={1} loading={loading} />
        <KPI label="Otvorenih izvješća" value={loading ? 0 : stats?.otvorenih_izvjesca ?? 0} color={stats && stats.otvorenih_izvjesca > 0 ? 'danger' : 'success'} index={2} loading={loading} />
        <KPI label="Neplaćenih računa" value={loading ? 0 : stats?.neplacenih_racuna ?? 0} color={stats && stats.neplacenih_racuna > 0 ? 'warning' : 'success'} index={3} loading={loading} />
        <KPI label="Planiranih sjednica" value={loading ? 0 : stats?.nadolazecih_sjednica ?? 0} color="info" index={4} loading={loading} />
      </div>

      {/* Grafovi */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={5}
          className="lg:col-span-3 rounded-xl p-5 border"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Aktivnost (zadnjih 6 mj.)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={aktivnostData}>
              <defs>
                <linearGradient id="gradSjednice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradIntervencije" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--info)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--info)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mjesec" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-accent)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Area type="monotone" dataKey="sjednice" stroke="var(--accent)" fill="url(#gradSjednice)" strokeWidth={2} name="Sjednice" />
              <Area type="monotone" dataKey="intervencije" stroke="var(--info)" fill="url(#gradIntervencije)" strokeWidth={2} name="Intervencije" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={6}
          className="lg:col-span-2 rounded-xl p-5 border"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Financijski plan vs ostvareno</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={financijskiData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="naziv" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => [`${Number(v).toLocaleString('hr-HR')} EUR`]}
                contentStyle={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-accent)', borderRadius: 8, color: 'var(--text-primary)' }}
              />
              <Bar dataKey="plan" fill="var(--accent)" opacity={0.5} radius={[4,4,0,0]} name="Plan" />
              <Bar dataKey="ostvareno" fill="var(--accent)" radius={[4,4,0,0]} name="Ostvareno" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Alarmi */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={7}
          className="rounded-xl overflow-hidden border"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
        >
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Rokovi i upozorenja</span>
            {alarmi.length > 0 && <span className="text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--danger)' }}>{alarmi.length}</span>}
          </div>
          <div>
            {loading ? <div className="p-5 text-sm" style={{ color: 'var(--text-muted)' }}>Učitavanje...</div>
            : alarmi.length === 0 ? <div className="p-5 text-sm" style={{ color: 'var(--text-muted)' }}>Nema hitnih rokova.</div>
            : alarmi.slice(0, 8).map((a, i) => (
              <motion.div key={a.id} variants={slideIn} initial="hidden" animate="visible" custom={i}>
                <Link href={a.href}
                  className="flex items-center gap-3 px-5 py-3 transition-colors"
                  style={{ borderLeft: `3px solid ${a.hitnost === 'crveno' ? 'var(--danger)' : a.hitnost === 'narancasto' ? 'var(--warning)' : 'var(--warning)'}` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>{a.tekst}</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{new Date(a.rok).toLocaleDateString('hr-HR')}</div>
                  </div>
                  <span className="text-[11px] font-semibold" style={{ color: a.dani < 0 ? 'var(--danger)' : a.dani <= 7 ? 'var(--warning)' : 'var(--warning)' }}>
                    {a.dani < 0 ? `${Math.abs(a.dani)}d kasni` : a.dani === 0 ? 'Danas' : `${a.dani}d`}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Nedavne sjednice */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={8}
          className="rounded-xl overflow-hidden border"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
        >
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Nedavne sjednice</span>
            <Link href="/zapisnici" className="text-[11px]" style={{ color: 'var(--text-accent)' }}>Sve &rarr;</Link>
          </div>
          <div>
            {loading ? <div className="p-5 text-sm" style={{ color: 'var(--text-muted)' }}>Učitavanje...</div>
            : recentSjednice.length === 0 ? <div className="p-5 text-sm" style={{ color: 'var(--text-muted)' }}>Nema sjednica.</div>
            : recentSjednice.map((s, i) => (
              <motion.div key={s.id} variants={slideIn} initial="hidden" animate="visible" custom={i}>
                <Link href={`/sjednice/${s.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>{s.naziv}</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{new Date(s.datum).toLocaleDateString('hr-HR')}</div>
                  </div>
                  <StatusBadge status={s.status} varijanta="sjednica" />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Brze akcije */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={9}>
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Brze akcije</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Pripremi skupštinu', href: '/skupstina/pripremi' },
            { label: 'Nova sjednica UO', href: '/sjednice/upravni-odbor/nova' },
            { label: 'Novi član', href: '/clanstvo/novi' },
            { label: 'Nova intervencija', href: '/vatrogasna' },
            { label: 'Zakonska izvješća', href: '/zakonska-izvjesca' },
            { label: 'Plan rada', href: '/plan-rada' },
            { label: 'Financije', href: '/financije' },
            { label: 'Nabava', href: '/nabava' },
          ].map(a => (
            <Link key={a.href} href={a.href}
              className="flex items-center gap-3 p-4 rounded-xl transition-all border"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
            >
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>{a.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function KPI({ label, value, color, index, loading }: { label: string; value: number; color: string; index: number; loading: boolean }) {
  const animatedValue = useAnimatedCounter(value)

  const colorMap: Record<string, string> = {
    accent: 'var(--accent)',
    success: 'var(--success)',
    danger: 'var(--danger)',
    warning: 'var(--warning)',
    info: 'var(--info)',
  }

  const c = colorMap[color] || colorMap.accent

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={index}
      className="rounded-xl p-4 border"
      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
    >
      <div className="text-3xl font-bold" style={{ color: c }}>{loading ? '...' : animatedValue}</div>
      <div className="text-[11px] mt-1 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</div>
    </motion.div>
  )
}
