import { Switch, Route } from 'wouter'
import { useAuthStore } from '@/store/auth.store'
import { AppLayout } from '@/components/layout/AppLayout'
import { Login } from '@/pages/auth/Login'
import { Dashboard } from '@/pages/dashboard/Dashboard'
import { ClanstvoList } from '@/pages/clanstvo/ClanstvoList'
import { ClanDetalji } from '@/pages/clanstvo/ClanDetalji'
import { ClanForma } from '@/pages/clanstvo/ClanForma'
import { SkupstineList, UOList, ZapovjednistvoList } from '@/pages/sjednice/SjedniceList'
import { SjednicaDetalji } from '@/pages/sjednice/SjednicaDetalji'
import { SjednicaForma } from '@/pages/sjednice/SjednicaForma'
import { TijelaDVD } from '@/pages/administracija/TijelaDVD'
import { ZapisniciList } from '@/pages/zapisnici/ZapisniciList'
import { PlanRada } from '@/pages/plan-rada/PlanRada'
import { Financije } from '@/pages/financije/Financije'
import { ZakonskaIzvjesca } from '@/pages/zakonska-izvjesca/ZakonskaIzvjesca'
import { NabavaPage } from '@/pages/nabava/Nabava'
import { ImovinaPage } from '@/pages/imovina/ImovinaPage'
import { VatrogasnaPage } from '@/pages/vatrogasna/VatrogasnaPage'
import { ArhivaPage } from '@/pages/arhiva/ArhivaPage'
import { RacuniPage } from '@/pages/racuni/RacuniPage'
import { BankPage } from '@/pages/racuni/BankPage'
import { PostavkePage } from '@/pages/administracija/PostavkePage'
import { VatronetExport } from '@/pages/administracija/VatronetExport'

// Privremene placeholder stranice
const Placeholder = ({ naziv }: { naziv: string }) => (
  <div className="p-8">
    <h1 className="text-2xl font-medium text-slate-900">{naziv}</h1>
    <p className="text-slate-500 mt-2">U razvoju...</p>
  </div>
)

export default function App() {
  const { korisnik, loading } = useAuthStore()

  // Čekaj dok se auth inicijalizira
  if (loading) {
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
      <Switch>
        <Route path="/" component={Dashboard} />
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
    </AppLayout>
  )
}
