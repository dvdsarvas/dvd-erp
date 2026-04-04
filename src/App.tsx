import { lazy, Suspense } from 'react'
import { Switch, Route } from 'wouter'
import { useAuthStore } from '@/store/auth.store'
import { useDVDStore } from '@/store/dvd.store'
import { AppLayout } from '@/components/layout/AppLayout'
import { Login } from '@/pages/auth/Login'

// Lazy loaded pages — reduce initial bundle size
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard').then(m => ({ default: m.Dashboard })))
const ClanstvoList = lazy(() => import('@/pages/clanstvo/ClanstvoList').then(m => ({ default: m.ClanstvoList })))
const ClanDetalji = lazy(() => import('@/pages/clanstvo/ClanDetalji').then(m => ({ default: m.ClanDetalji })))
const ClanForma = lazy(() => import('@/pages/clanstvo/ClanForma').then(m => ({ default: m.ClanForma })))
const SkupstineList = lazy(() => import('@/pages/sjednice/SjedniceList').then(m => ({ default: m.SkupstineList })))
const UOList = lazy(() => import('@/pages/sjednice/SjedniceList').then(m => ({ default: m.UOList })))
const ZapovjednistvoList = lazy(() => import('@/pages/sjednice/SjedniceList').then(m => ({ default: m.ZapovjednistvoList })))
const SjednicaDetalji = lazy(() => import('@/pages/sjednice/SjednicaDetalji').then(m => ({ default: m.SjednicaDetalji })))
const SjednicaForma = lazy(() => import('@/pages/sjednice/SjednicaForma').then(m => ({ default: m.SjednicaForma })))
const TijelaDVD = lazy(() => import('@/pages/administracija/TijelaDVD').then(m => ({ default: m.TijelaDVD })))
const ZapisniciList = lazy(() => import('@/pages/zapisnici/ZapisniciList').then(m => ({ default: m.ZapisniciList })))
const PlanRada = lazy(() => import('@/pages/plan-rada/PlanRada').then(m => ({ default: m.PlanRada })))
const Financije = lazy(() => import('@/pages/financije/Financije').then(m => ({ default: m.Financije })))
const ZakonskaIzvjesca = lazy(() => import('@/pages/zakonska-izvjesca/ZakonskaIzvjesca').then(m => ({ default: m.ZakonskaIzvjesca })))
const NabavaPage = lazy(() => import('@/pages/nabava/Nabava').then(m => ({ default: m.NabavaPage })))
const ImovinaPage = lazy(() => import('@/pages/imovina/ImovinaPage').then(m => ({ default: m.ImovinaPage })))
const VatrogasnaPage = lazy(() => import('@/pages/vatrogasna/VatrogasnaPage').then(m => ({ default: m.VatrogasnaPage })))
const ArhivaPage = lazy(() => import('@/pages/arhiva/ArhivaPage').then(m => ({ default: m.ArhivaPage })))
const RacuniPage = lazy(() => import('@/pages/racuni/RacuniPage').then(m => ({ default: m.RacuniPage })))
const BankPage = lazy(() => import('@/pages/racuni/BankPage').then(m => ({ default: m.BankPage })))
const AkcijskiCentar = lazy(() => import('@/pages/akcije/AkcijskiCentar').then(m => ({ default: m.AkcijskiCentar })))
const PripremiSkupstinu = lazy(() => import('@/pages/skupstina/PripremiSkupstinu').then(m => ({ default: m.PripremiSkupstinu })))
const PostavkePage = lazy(() => import('@/pages/administracija/PostavkePage').then(m => ({ default: m.PostavkePage })))
const VatronetExport = lazy(() => import('@/pages/administracija/VatronetExport').then(m => ({ default: m.VatronetExport })))

// Privremene placeholder stranice
const Placeholder = ({ naziv }: { naziv: string }) => (
  <div className="p-8">
    <h1 className="text-2xl font-medium text-slate-900">{naziv}</h1>
    <p className="text-slate-500 mt-2">U razvoju...</p>
  </div>
)

function PageLoader() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-transparent rounded-full animate-spin" style={{ borderTopColor: 'var(--accent)', borderRightColor: 'var(--accent)' }} />
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Učitavanje...</div>
      </div>
    </div>
  )
}

export default function App() {
  const { korisnik, loading } = useAuthStore()
  const { loading: dvdLoading } = useDVDStore()

  // Čekaj dok se auth i DVD store inicijaliziraju
  if (loading || dvdLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Učitavanje...</div>
      </div>
    )
  }

  // Nije prijavljen — prikaži login
  if (!korisnik) {
    return (
      <Switch>
        <Route path="/reset-password" component={() => <Placeholder naziv="Reset lozinke" />} />
        <Route component={Login} />
      </Switch>
    )
  }

  // Prijavljen — prikaži app
  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/akcije" component={AkcijskiCentar} />
          <Route path="/skupstina/pripremi" component={PripremiSkupstinu} />
          <Route path="/clanstvo" component={ClanstvoList} />
          <Route path="/clanstvo/novi" component={ClanForma} />
          <Route path="/clanstvo/:id/uredi" component={ClanForma} />
          <Route path="/clanstvo/:id" component={ClanDetalji} />
          <Route path="/sjednice/skupstine" component={SkupstineList} />
          <Route path="/sjednice/skupstine/nova" component={() => <SjednicaForma defaultVrsta="skupstina_redovna" />} />
          <Route path="/sjednice/upravni-odbor" component={UOList} />
          <Route path="/sjednice/upravni-odbor/nova" component={() => <SjednicaForma defaultVrsta="upravni_odbor" />} />
          <Route path="/sjednice/zapovjednistvo" component={ZapovjednistvoList} />
          <Route path="/sjednice/zapovjednistvo/nova" component={() => <SjednicaForma defaultVrsta="zapovjednistvo" />} />
          <Route path="/sjednice/:id/uredi" component={() => <SjednicaForma />} />
          <Route path="/sjednice/:id" component={SjednicaDetalji} />
          <Route path="/zapisnici" component={ZapisniciList} />
          <Route path="/plan-rada" component={PlanRada} />
          <Route path="/financije" component={Financije} />
          <Route path="/zakonska-izvjesca" component={ZakonskaIzvjesca} />
          <Route path="/nabava" component={NabavaPage} />
          <Route path="/racuni" component={RacuniPage} />
          <Route path="/racuni/bank" component={BankPage} />
          <Route path="/imovina" component={ImovinaPage} />
          <Route path="/vatrogasna" component={VatrogasnaPage} />
          <Route path="/arhiva" component={ArhivaPage} />
          <Route path="/postavke" component={PostavkePage} />
          <Route path="/vatronet" component={VatronetExport} />
          <Route path="/administracija/tijela" component={TijelaDVD} />
          <Route component={() => <Placeholder naziv="Stranica nije pronađena" />} />
        </Switch>
      </Suspense>
    </AppLayout>
  )
}
