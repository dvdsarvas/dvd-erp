import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationsStore } from '@/store/notifications.store'
import { signOut } from '@/lib/supabase/auth'
import { slideIn } from '@/lib/animations'

interface NavItem {
  path: string
  label: string
  section: string
  badge?: number
}

const NAV: NavItem[] = [
  { path: '/',                        label: 'Nadzorna ploča',    section: 'Pregled' },
  { path: '/clanstvo',                label: 'Članstvo',          section: 'Upravljanje' },
  { path: '/imovina',                 label: 'Imovina i vozila',  section: 'Upravljanje' },
  { path: '/sjednice/skupstine',      label: 'Skupštine',         section: 'Sjednice' },
  { path: '/sjednice/upravni-odbor',  label: 'Sjednice UO',       section: 'Sjednice' },
  { path: '/sjednice/zapovjednistvo', label: 'Zapovjedništvo',    section: 'Sjednice' },
  { path: '/zapisnici',               label: 'Zapisnici',         section: 'Dokumenti' },
  { path: '/arhiva',                  label: 'Arhiva',            section: 'Dokumenti' },
  { path: '/plan-rada',               label: 'Plan rada',         section: 'Planovi' },
  { path: '/financije',               label: 'Financijski plan',  section: 'Planovi' },
  { path: '/racuni',                  label: 'Računi',            section: 'Financije' },
  { path: '/zakonska-izvjesca',       label: 'Zakonska izvješća', section: 'Obveze' },
  { path: '/nabava',                  label: 'Nabava',            section: 'Obveze' },
  { path: '/vatrogasna',              label: 'Vatrogasna djel.',  section: 'Vatrogastvo' },
  { path: '/vatronet',                label: 'VATROnet export',   section: 'Administracija' },
  { path: '/postavke',                label: 'Postavke',          section: 'Administracija' },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <Sidebar open={sidebarOpen} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(o => !o)} />
        <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--bg-surface)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

function Sidebar({ open }: { open: boolean }) {
  const [location] = useLocation()
  const { alarmi, ucitajAlarme } = useNotificationsStore()
  let prevSection = ''

  useEffect(() => {
    ucitajAlarme()
  }, [])

  const badgeMap: Record<string, number> = {
    '/zakonska-izvjesca': alarmi.filter(a => a.href === '/zakonska-izvjesca' && a.hitnost === 'crveno').length,
    '/imovina': alarmi.filter(a => a.href === '/imovina' && a.hitnost === 'crveno').length,
  }

  return (
    <motion.aside
      animate={{ width: open ? 220 : 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex-shrink-0 overflow-hidden flex flex-col border-r"
      style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <motion.img
            src="/logo-dvd.jpg"
            alt="DVD Sarvaš"
            className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 0 8px var(--accent-glow))' }}
          />
          <div className="min-w-0">
            <div className="text-[13px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>DVD Sarvaš</div>
            <div className="text-[9px] uppercase tracking-[0.2em] font-semibold" style={{ color: 'var(--accent)' }}>ERP SUSTAV</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1 px-3">
        {NAV.map((item, index) => {
          const showSection = item.section !== prevSection
          prevSection = item.section
          const active = location === item.path || (item.path !== '/' && location.startsWith(item.path))
          const badge = badgeMap[item.path] || undefined

          return (
            <div key={item.path}>
              {showSection && (
                <div className="px-3 pt-5 pb-1 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>
                  {item.section}
                </div>
              )}
              <motion.div
                variants={slideIn}
                initial="hidden"
                animate="visible"
                custom={index}
              >
                <Link href={item.path}
                  className="flex items-center gap-2 px-3 py-[7px] text-[13px] rounded-md cursor-pointer transition-all"
                  style={active
                    ? { background: 'var(--accent-subtle)', color: 'var(--text-accent)', fontWeight: 500, boxShadow: 'var(--glow-accent)' }
                    : { color: 'var(--text-secondary)' }
                  }
                >
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge && (
                    <span className="text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--danger)' }}>
                      {badge}
                    </span>
                  )}
                </Link>
              </motion.div>
            </div>
          )
        })}
      </nav>

      {/* User at bottom */}
      <UserBlock />
    </motion.aside>
  )
}

function UserBlock() {
  const { korisnik } = useAuthStore()
  if (!korisnik) return null

  return (
    <div className="px-4 py-3 border-t flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: 'var(--accent)' }}>
        {korisnik.ime[0]}{korisnik.prezime[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{korisnik.ime} {korisnik.prezime}</div>
        <div className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{korisnik.uloga?.replace('_', ' ')}</div>
      </div>
      <button onClick={() => signOut()} className="transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }} title="Odjava">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </div>
  )
}

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { neprocitano } = useNotificationsStore()

  return (
    <header className="h-12 border-b flex items-center px-5 gap-4 flex-shrink-0" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
      <button onClick={onMenuClick} className="transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
      </button>
      <div className="text-[11px] uppercase tracking-widest font-medium flex-1" style={{ color: 'var(--text-secondary)' }}>
        ERP &rsaquo; <span style={{ color: 'var(--text-secondary)' }}>DVD Sarvaš</span>
      </div>
      {/* Notification bell */}
      <Link href="/zakonska-izvjesca" className="relative transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {neprocitano > 0 && (
          <span className="absolute -top-1.5 -right-1.5 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--danger)' }}>
            {neprocitano}
          </span>
        )}
      </Link>
    </header>
  )
}
