# KORISNICI I ULOGE — DVD ERP

Ovaj dokument definira kompletni sustav autentikacije, korisnika i uloga.
Temelji se na stvarnoj strukturi tijela DVD-a Sarvaš vidljivoj iz datoteke
`tijela` u `DVD_Sarvaš_članstvo.xls` i iz dokumenata skupštine 2026.

---

## Stvarna tijela i dužnosnici DVD Sarvaš (2026–2031)

Iz `Skupština_2026_Protokol.docx` — izabrano na skupštini 20. 2. 2026:

### Upravni odbor
| Dužnost | Ime i prezime |
|---|---|
| Predsjednik | Milenko Korica |
| Zamjenik predsjednika | Atila Vadoci |
| Tajnik | Martina Lončarić |
| Blagajnik | Tatjana Kozarević |
| Zapovjednik (član UO) | Borna Ahmeti |
| Zamjenik zapovjednika (član UO) | Dominik Orešćanin |
| Član | Boris Jošović |
| Član | Igor Ahmeti |
| Član | Sandro Samardžić |

### Zapovjedništvo
| Dužnost | Ime i prezime |
|---|---|
| Zapovjednik | Borna Ahmeti |
| Zamjenik zapovjednika | Dominik Orešćanin |
| Član | Sandro Samardžić |
| Član | Igor Ahmeti |
| Spremištar | Andrija Golić |
| Član | Mihael Živković |
| Član | Milorad Miljatović |
| Član | Boris Jošović |
| Član | Martina Lončarić |

### Likvidator
Josip Pic

---

## Korisničke uloge u sustavu

Sustav ima **7 uloga**. Svaka uloga odgovara stvarnoj dužnosti u DVD-u.

```typescript
type Uloga =
  | 'admin'              // Sistemski admin (developer/održavatelj)
  | 'predsjednik'        // Predsjednik DVD-a — zakonski zastupnik
  | 'zamjenik'           // Zamjenik predsjednika
  | 'tajnik'             // Tajnik — vodi uredsko poslovanje
  | 'blagajnik'          // Blagajnik — financijsko poslovanje
  | 'zapovjednik'        // Zapovjednik — vatrogasna djelatnost
  | 'zamjenik_zapovjednika'  // Zamjenik zapovjednika
  | 'clan'               // Običan član — minimalna prava
```

**Napomena:** UO membri koji nisu predsjednik/zamjenik/tajnik/blagajnik/zapovjednik
dobivaju ulogu `clan` u sustavu — nemaju posebna administrativna prava.

---

## Matrica prava pristupa

### Legenda
- **P** = puno pravo (čitanje + pisanje + brisanje)
- **Č** = samo čitanje
- **V** = vlastiti podaci
- **—** = nema pristupa

| Modul / Akcija | admin | predsjednik | zamjenik | tajnik | blagajnik | zapovjednik | zamj.zap. | clan |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **ČLANSTVO** | | | | | | | | |
| Popis članova (javni podaci) | P | P | P | P | Č | Č | Č | — |
| OIB, adresa, kontakt | P | P | P | P | — | — | — | V |
| Zdravstveni podaci | P | P | Č | P | — | P | Č | V |
| Vatrogasna zvanja i certif. | P | P | P | P | — | P | P | Č |
| Dodaj/uredi člana | P | P | P | P | — | — | — | — |
| Promjena statusa člana | P | P | P | P | — | — | — | — |
| Evidencija liječničkih | P | P | Č | P | — | P | Č | — |
| Članarine — pregled | P | P | P | P | P | — | — | V |
| Članarine — unos | P | P | — | P | P | — | — | — |
| **SJEDNICE** | | | | | | | | |
| Skupštine — čitanje | P | P | P | P | Č | Č | Č | Č |
| Skupštine — kreiranje/uredi | P | P | P | P | — | — | — | — |
| UO sjednice — čitanje | P | P | P | P | Č | Č | Č | — |
| UO sjednice — kreiranje/uredi | P | P | P | P | — | — | — | — |
| Zapovjedništvo — čitanje | P | P | P | P | — | P | P | — |
| Zapovjedništvo — kreiranje/uredi | P | P | — | Č | — | P | P | — |
| **ZAPISNICI** | | | | | | | | |
| Svi zapisnici — čitanje | P | P | P | P | Č | P | P | Č |
| Upload potpisanih zapisa | P | P | P | P | — | P | — | — |
| **PLANOVI** | | | | | | | | |
| Plan rada — čitanje | P | P | P | P | P | P | P | Č |
| Plan rada — uredi | P | P | P | P | — | — | — | — |
| Financijski plan — čitanje | P | P | P | P | P | — | — | — |
| Financijski plan — uredi | P | P | — | — | P | — | — | — |
| **FINANCIJSKO POSLOVANJE** | | | | | | | | |
| Knjiga primit./izdataka — čitanje | P | P | Č | Č | P | — | — | — |
| Knjiga primit./izdataka — unos | P | P | — | Č | P | — | — | — |
| Knjiga blagajne | P | P | — | — | P | — | — | — |
| Ulazni računi — čitanje | P | P | Č | Č | P | — | — | — |
| Ulazni računi — unos | P | P | — | P | P | — | — | — |
| Likvidatura (odobrenje) | P | P | P | — | P | — | — | — |
| **ZAKONSKA IZVJEŠĆA** | | | | | | | | |
| Sva izvješća — čitanje | P | P | P | P | P | — | — | — |
| Promjena statusa izvješća | P | P | P | P | P | — | — | — |
| **NABAVA** | | | | | | | | |
| Zahtjev za nabavom | P | P | P | P | P | P | P | — |
| Odobrenje zahtjeva | P | P | P | — | — | — | — | — |
| Narudžbenica — generiranje | P | P | P | P | P | — | — | — |
| **IMOVINA I VOZILA** | | | | | | | | |
| Popis imovine — čitanje | P | P | P | P | Č | P | P | — |
| Dodaj/uredi imovinu | P | P | P | P | — | P | P | — |
| Knjiga vozila — unos vožnje | P | P | P | P | — | P | P | Č |
| Servisna knjiga | P | P | P | P | — | P | P | — |
| **VATROGASNA DJELATNOST** | | | | | | | | |
| Intervencije — čitanje | P | P | P | P | — | P | P | Č |
| Intervencije — unos | P | P | — | — | — | P | P | — |
| Vježbe — čitanje | P | P | P | P | — | P | P | Č |
| Vježbe — kreiranje/uredi | P | P | — | — | — | P | P | — |
| Osposobljenost postrojbe | P | P | Č | Č | — | P | P | Č |
| **ARHIVA** | | | | | | | | |
| Upload dokumenta | P | P | P | P | P | P | P | — |
| Pregled — financijska mapa | P | P | Č | Č | P | — | — | — |
| Pregled — vatrogasna mapa | P | P | P | P | — | P | P | Č |
| Pregled — ostale mape | P | P | P | P | Č | Č | Č | Č |
| **ADMINISTRACIJA** | | | | | | | | |
| Upravljanje korisnicima | P | Č | — | — | — | — | — | — |
| Promjena uloga | P | — | — | — | — | — | — | — |
| Revizijski trag | P | — | — | — | — | — | — | — |
| Postavke DVD-a | P | P | — | — | — | — | — | — |

---

## Auth tijek (Supabase Auth)

### Registracija / Kreiranje korisnika
```
NE postoji javna registracija — sve korisnike kreira predsjednik ili admin.

Tijek:
1. Predsjednik otvori Administracija → Korisnici → Novi korisnik
2. Unese: email, ime, prezime, uloga
3. Sustav pozove Supabase Auth admin.createUser({ email, password: generiran })
4. Supabase pošalje "Set your password" email korisniku
5. Korisnik postavi lozinku → automatski prijavljen

Alternativa: predsjednik kreira korisnika i ručno pošalje privremenu lozinku.
```

### Login
```
1. Korisnik otvori sarvas.dvd-erp.hr
2. Sustav detektira subdomenu → inicijalizira Supabase klijent za DVD Sarvaš
3. Prikaz login forme (email + lozinka)
4. supabase.auth.signInWithPassword({ email, password })
5. Uspjeh → dohvat korisničkih podataka iz tablice korisnici
6. Zustand auth.store popunjen → render aplikacije
```

### Session management
```typescript
// src/lib/supabase/auth.ts

export function listenToAuthChanges(supabase: SupabaseClient) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      // Dohvati ulogu iz tablice korisnici
      const { data } = await supabase
        .from('korisnici')
        .select('id, ime, prezime, uloga, aktivan')
        .eq('id', session.user.id)
        .single()

      if (!data?.aktivan) {
        // Korisnički račun deaktiviran — odjavi
        await supabase.auth.signOut()
        return
      }

      useAuthStore.getState().setKorisnik(data)
    }

    if (event === 'SIGNED_OUT') {
      useAuthStore.getState().logout()
    }
  })
}
```

### Odjava
- Klik na Avatar → Odjava → `supabase.auth.signOut()`
- Automatska odjava: Supabase JWT istječe za 1 sat, refresh token za 7 dana

### Zaboravljena lozinka
```
1. Korisnik klikne "Zaboravili ste lozinku?"
2. Unese email
3. supabase.auth.resetPasswordForEmail(email, { redirectTo: 'sarvas.dvd-erp.hr/reset' })
4. Korisnik dobije email → klikne link → postavi novu lozinku
```

---

## Zustand Auth Store

```typescript
// src/store/auth.store.ts
import { create } from 'zustand'

interface Korisnik {
  id: string
  ime: string
  prezime: string
  uloga: Uloga
  aktivan: boolean
}

interface AuthStore {
  korisnik: Korisnik | null
  loading: boolean
  setKorisnik: (k: Korisnik) => void
  logout: () => void
  // Helperi za provjeru prava — koristiti u komponentama
  jeUpravackaUloga: () => boolean
  jeFinancijskaUloga: () => boolean
  mozeVideoOsobne: () => boolean
  mozeVideoZdravlje: () => boolean
  mozeUnositiIntervencije: () => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  korisnik: null,
  loading: true,

  setKorisnik: (korisnik) => set({ korisnik, loading: false }),
  logout: () => set({ korisnik: null, loading: false }),

  jeUpravackaUloga: () => {
    const { uloga } = get().korisnik ?? {}
    return ['admin', 'predsjednik', 'zamjenik'].includes(uloga ?? '')
  },

  jeFinancijskaUloga: () => {
    const { uloga } = get().korisnik ?? {}
    return ['admin', 'predsjednik', 'zamjenik', 'tajnik', 'blagajnik'].includes(uloga ?? '')
  },

  mozeVideoOsobne: () => {
    const { uloga } = get().korisnik ?? {}
    return ['admin', 'predsjednik', 'zamjenik', 'tajnik'].includes(uloga ?? '')
  },

  mozeVideoZdravlje: () => {
    const { uloga } = get().korisnik ?? {}
    return ['admin', 'predsjednik', 'zapovjednik', 'tajnik'].includes(uloga ?? '')
  },

  mozeUnositiIntervencije: () => {
    const { uloga } = get().korisnik ?? {}
    return ['admin', 'predsjednik', 'zapovjednik', 'zamjenik_zapovjednika'].includes(uloga ?? '')
  },
}))
```

---

## Protected Routes

```typescript
// src/components/layout/ProtectedRoute.tsx
import { useAuthStore } from '@/store/auth.store'
import { Redirect } from 'wouter'

interface Props {
  children: React.ReactNode
  zahtijevaUlogu?: Uloga[]
}

export function ProtectedRoute({ children, zahtijevaUlogu }: Props) {
  const { korisnik, loading } = useAuthStore()

  if (loading) return <LoadingSpinner />
  if (!korisnik) return <Redirect to="/login" />

  if (zahtijevaUlogu && !zahtijevaUlogu.includes(korisnik.uloga)) {
    return <NemaPrivilega />
  }

  return <>{children}</>
}

// Korištenje u App.tsx:
// <Route path="/administracija">
//   <ProtectedRoute zahtijevaUlogu={['admin', 'predsjednik']}>
//     <Administracija />
//   </ProtectedRoute>
// </Route>
```

---

## Stranica za upravljanje korisnicima

Dostupno na: `/administracija/korisnici` — samo `admin` i `predsjednik`

### Prikaz
```
┌─────────────────────────────────────────────────────────┐
│ Korisnici sustava              [+ Novi korisnik]       │
├──────────────┬──────────┬──────────────┬──────────┬────┤
│ Ime i prezime│ Email    │ Uloga        │ Status   │    │
├──────────────┼──────────┼──────────────┼──────────┼────┤
│ Milenko Kor. │ mk@...   │ predsjednik  │ ● Aktivan│ ✏  │
│ Tatjana Koz. │ tk@...   │ blagajnik    │ ● Aktivan│ ✏  │
│ Borna Ahmeti │ ba@...   │ zapovjednik  │ ● Aktivan│ ✏  │
│ Martina Lon. │ ml@...   │ tajnik       │ ● Aktivan│ ✏  │
│ Atila Vadoci │ av@...   │ zamjenik     │ ● Aktivan│ ✏  │
└──────────────┴──────────┴──────────────┴──────────┴────┘
```

### Operacije
- **Novi korisnik:** email + ime + prezime + uloga → Supabase kreira + šalje email
- **Uredi:** promjena uloge ili deaktivacija
- **Deaktiviraj:** ne briše korisnika — postavlja `aktivan = false`, blokira login
- **Brisanje:** nije dopušteno (revizijski trag mora ostati)
- **Reset lozinke:** šalje Supabase reset email

---

## Veza korisnik ↔ član

Korisnik sustava i član DVD-a su **dva zasebna entiteta** koji se mogu ali ne moraju podudarati.

- Predsjednik kreira korisnika za svakoga tko treba pristup sustavu
- Ne moraju svi članovi DVD-a biti korisnici sustava
- Veza se ostvaruje putem emaila: `korisnici.email = clanovi.email`
- Svaki korisnik vidi vlastite podatke člana putem ove veze

```sql
-- Dohvat vlastitih podataka člana
SELECT * FROM clanovi
WHERE email = (SELECT email FROM korisnici WHERE id = auth.uid());
```

---

## SQL: tablica korisnici (finalna verzija)

```sql
CREATE TABLE korisnici (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  ime         TEXT NOT NULL,
  prezime     TEXT NOT NULL,
  uloga       uloga_tip NOT NULL DEFAULT 'clan',
  aktivan     BOOLEAN DEFAULT true,
  napomena    TEXT,    -- bilješka za admina (npr. "zapovjednik od 2026.")
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Auth trigger: sync s Supabase Auth
CREATE OR REPLACE FUNCTION sync_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Onemogući login ako je korisnik deaktiviran
  IF NOT NEW.aktivan AND OLD.aktivan THEN
    UPDATE auth.users SET banned_until = 'infinity'
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_korisnici_deactivate
  AFTER UPDATE OF aktivan ON korisnici
  FOR EACH ROW EXECUTE FUNCTION sync_auth_user();
```

---

## RLS za korisničke podatke

```sql
-- Korisnik vidi vlastiti profil; predsjednik i admin vide sve
CREATE POLICY "korisnici: vlastiti ili uprava"
  ON korisnici FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM korisnici
      WHERE id = auth.uid()
      AND uloga IN ('admin', 'predsjednik')
      AND aktivan = true
    )
  );

-- Samo admin i predsjednik mogu kreirati/mijenjati korisnike
CREATE POLICY "korisnici: admin i predsjednik upravljaju"
  ON korisnici FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM korisnici
      WHERE id = auth.uid()
      AND uloga IN ('admin', 'predsjednik')
    )
  );

CREATE POLICY "korisnici: admin i predsjednik azuriraju"
  ON korisnici FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM korisnici
      WHERE id = auth.uid()
      AND uloga IN ('admin', 'predsjednik')
    )
  );
```
