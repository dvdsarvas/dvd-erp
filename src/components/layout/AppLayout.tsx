import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { useAuthStore } from '@/store/auth.store'
import { signOut } from '@/lib/supabase/auth'

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
    <div className="flex h-screen overflow-hidden bg-[#1a1a1e]">
      <Sidebar open={sidebarOpen} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(o => !o)} />
        <main className="flex-1 overflow-y-auto p-6 bg-[#1e1e22]">
          {children}
        </main>
      </div>
    </div>
  )
}

function Sidebar({ open }: { open: boolean }) {
  const [location] = useLocation()
  let prevSection = ''

  return (
    <aside className={`${open ? 'w-[220px]' : 'w-0 overflow-hidden'} flex-shrink-0 bg-[#1a1a1e] flex flex-col transition-all duration-200 border-r border-[#2e2e32]`}>

      {/* Logo */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <img src="/logo-dvd.jpg" alt="DVD Sarvaš" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-white tracking-tight">DVD Sarvaš</div>
            <div className="text-[9px] text-red-500 uppercase tracking-[0.2em] font-semibold">ERP SUSTAV</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1 px-3">
        {NAV.map(item => {
          const showSection = item.section !== prevSection
          prevSection = item.section
          const active = location === item.path || (item.path !== '/' && location.startsWith(item.path))

          return (
            <div key={item.path}>
              {showSection && (
                <div className="px-3 pt-5 pb-1 text-[9px] font-bold text-[#777] uppercase tracking-[0.15em]">
                  {item.section}
                </div>
              )}
              <Link href={item.path} className={`
                flex items-center gap-2 px-3 py-[7px] text-[13px] rounded-md cursor-pointer transition-all
                ${active
                  ? 'bg-red-600/15 text-red-400 font-medium'
                  : 'text-[#aaa] hover:text-[#ddd] hover:bg-[#242428]'
                }
              `}>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="bg-red-600 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            </div>
          )
        })}
      </nav>

      {/* User at bottom */}
      <UserBlock />
    </aside>
  )
}

function UserBlock() {
  const { korisnik } = useAuthStore()
  if (!korisnik) return null

  return (
    <div className="px-4 py-3 border-t border-[#2e2e32] flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
        {korisnik.ime[0]}{korisnik.prezime[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-medium text-[#ddd] truncate">{korisnik.ime} {korisnik.prezime}</div>
        <div className="text-[10px] text-[#777] capitalize">{korisnik.uloga?.replace('_', ' ')}</div>
      </div>
      <button onClick={() => signOut()} className="text-[#777] hover:text-red-400 transition-colors" title="Odjava">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </div>
  )
}

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="h-12 bg-[#1a1a1e] border-b border-[#2e2e32] flex items-center px-5 gap-4 flex-shrink-0">
      <button onClick={onMenuClick} className="text-[#777] hover:text-[#bbb] transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
      </button>
      <div className="text-[11px] text-[#aaa] uppercase tracking-widest font-medium">
        ERP &rsaquo; <span className="text-[#aaa]">DVD Sarvaš</span>
      </div>
    </header>
  )
}
