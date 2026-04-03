# PREDLOŠCI DOKUMENATA — DVD ERP

Svaki predložak je TypeScript funkcija u `src/lib/documents/`.
Temelji se na stvarnim dokumentima DVD Sarvaš.

---

## Skupštine

### `skupstina-pozivnica.ts`
**Temelj:** `Poziv__skupština_2026_.docx`  
**Format:** docx  
```typescript
generirajPozivnicu(sjednica: Sjednica, dvd: DVDConfig): Promise<Blob>
```
Sadržaj: naziv skupštine, datum, sat, lokacija, dnevni red, vatrogasni pozdrav, potpis predsjednika.

### `skupstina-dnevni-red.ts`
**Temelj:** `Dnevni_red_za_izvještajnu_Sjednicu_skupštine_2026_.docx`  
**Format:** docx  
```typescript
generirajDnevniRed(sjednica: Sjednica, tocke: TockaDnevnogReda[], dvd: DVDConfig): Promise<Blob>
```
Uključuje: KLASA/URBROJ, zakonsku osnovu (čl. 34. Statuta), kompletni dnevni red s podtočkama.

### `skupstina-protokol.ts`
**Temelj:** `Skupština_2026_Protokol.docx`  
**Format:** docx (radni dokument za predsjedavajućeg)  
```typescript
generirajProtokol(sjednica: Sjednica, tocke: TockaDnevnogReda[], dvd: DVDConfig): Promise<Blob>
```
Uključuje: kompletni tekst za vođenje sjednice, upute za svaku točku, prijedloge za glasovanje, pozdravne govore, tekst za pozivanje izlagača.

### `skupstina-odluka-radna-tijela.ts`
**Temelj:** `Odluke__radna_tijela__2026_god.docx`  
**Format:** docx  
```typescript
generirajOdlukuRadnaTijela(
  sjednica: Sjednica,
  radnoPred: Clan[],
  verifikacija: Clan[],
  zapisnicar: Clan,
  ovjerovitelji: Clan[],
  dvd: DVDConfig
): Promise<Blob>
```
Sadržaj: rimski broj po točkama (I-IV), pečat + potpis predsjedavajućeg.

### `skupstina-izvjesce-verifikacije.ts`
**Temelj:** `Izvješče_Verifikacijskog_povjerenstva_2026_god.docx`  
**Format:** docx  
```typescript
generirajIzvjesceVerifikacije(
  sjednica: Sjednica,
  komisija: { predsjednik: Clan; clanovi: Clan[] },
  prisutno: number,
  ukupno: number,
  dvd: DVDConfig
): Promise<Blob>
```
Tekst: "Na današnjoj Skupštini prisutno je {prisutno} članova s pravom glasa od njih ukupno {ukupno}. Zaključujem da Skupština ima natpolovičnu većinu i da može donositi odluke."

### `skupstina-upisnica-clanova.ts`
**Temelj:** `Upis_članova_za_izvještajnu_skupštinu.docx`  
**Format:** docx (za ispis — s potpis stupcima)  
```typescript
generirajUpisnicuClanova(sjednica: Sjednica, clanovi: Clan[], dvd: DVDConfig): Promise<Blob>
```
Tablica: RB | IME I PREZIME | POTPIS.

### `skupstina-upisnica-duznosnici.ts`
**Temelj:** `Upisnica_dužnosnici.docx`  
**Format:** docx  
```typescript
generirajUpisnicuDuznosnici(sjednica: Sjednica): Promise<Blob>
```
Tablica: RB | DUŽNOST | IME I PREZIME.

### `skupstina-upisnica-dvd.ts`
**Temelj:** `Upisnica_DVD-a.docx`  
**Format:** docx  
```typescript
generirajUpisnicuDVD(sjednica: Sjednica): Promise<Blob>
```
Tablica: RB | DVD | POTPIS PREDSTAVNIKA.

### `skupstina-zapisnik.ts`
**Format:** docx  
```typescript
generirajZapisnikSkupstine(
  sjednica: Sjednica,
  prisutni: Clan[],
  tocke: TockaDnevnogReda[],
  dvd: DVDConfig
): Promise<Blob>
```
Struktura prema `Zapisnik_sa_skupštine__financijski_plan_i_plan_rada__za_2025.pdf`.

---

## Sjednice UO i Zapovjedništva

### `sjednica-pozivnica.ts`
**Temelj:** `21__Sjednica_UO_Dnevni_red.docx`  
**Format:** docx  
```typescript
generirajPozivnicuSjednice(sjednica: Sjednica, tocke: TockaDnevnogReda[], dvd: DVDConfig): Promise<Blob>
```
Header: `Ur.br: {urbroj}`, datum, `S A Z I V A M`, broj sjednice, saziv, tijelo, lokacija, dnevni red, potpis predsjednika.

### `sjednica-zapisnik-uo.ts`
**Format:** docx  
```typescript
generirajZapisnikUO(sjednica: Sjednica, tocke: TockaDnevnogReda[], prisutni: Clan[], dvd: DVDConfig): Promise<Blob>
```

### `sjednica-zapisnik-zapovjednistvo.ts`
**Format:** docx  
Kao UO, ali s vatrogasnim specifičnostima (oprema, intervencije, dežuranstvo).

---

## Planovi i izvješća

### `plan-rada.ts`
**Temelj:** `Plan_rada_2025_DVD_Sarvaš.pdf`  
**Format:** docx  
```typescript
generirajPlanRada(aktivnosti: AktivnostPlanRada[], godina: number, dvd: DVDConfig): Promise<Blob>
```
Sadržaj: 23 stavke u `Plan_rada_2025` (vatrogasne obveze, natjecanja, vježbe, proslava MO Sarvaš, zabave, edukacija djece...).

### `izvjesce-o-radu.ts`
**Temelj:** `Izvješće_o_radu_2025_DVD_Sarvaš.docx`  
**Format:** docx  
```typescript
generirajIzvjesceORadu(
  podaci: {
    intervencije: { ukupno: number; pozarne: number; tehnicke: number; satRada: number }
    natjecanja: NatjecanjskiRezultat[]
    vjezbe: Vjezba[]
    osposobljavanje: OsposobljavanjeEvent[]
    clanstvo: { ukupno: number; operativnih: number; sLijecnickim: number }
    sjednice: { skupstine: number; uo: number; zapovjednistvo: number }
  },
  godina: number,
  dvd: DVDConfig
): Promise<Blob>
```

### `financijski-plan.ts`
**Temelj:** `Financijski_plan_2025.xlsm` — struktura po Računskom planu NP  
**Format:** docx  
```typescript
generirajFinancijskiPlan(plan: FinancijskiPlan, stavke: FinancijskiPlanStavka[], dvd: DVDConfig): Promise<Blob>
```
AOP struktura: 33110, 33111, 3413, 3512, 3531, 3541... do rashoda 4222–4434.

### `financijsko-izvjesce-skupstini.ts`
**Format:** docx — sažetak za skupštinu (plan vs. ostvareno)  
```typescript
generirajFinancijskoIzvjesceSkupstini(plan: FinancijskiPlan, stavke: FinancijskiPlanStavka[], dvd: DVDConfig): Promise<Blob>
```

---

## Članstvo

### `pristupnica.ts`
**Temelj:** `Pristupnica_nova.docx`  
**Format:** docx (za ispis i potpis)  
```typescript
generirajPristupnicu(clan?: Partial<Clan>, dvd: DVDConfig): Promise<Blob>
```
Sadržaj: osobni podaci (prefillani ili prazni), kategorija članstva (operativni/izvršni/pričuvni/veteran/počasni/mladež), izjava, GDPR privola, datum + potpis + M.P.

### `hvz-obrazac.ts`
**Temelj:** `Obrazac_za_prikupljanje_podataka_-_punoljetne_osobe.docx`  
**Format:** docx (HVZ standardni obrazac)  
```typescript
generirajHVZObrazac(clan: Clan, dvd: DVDConfig): Promise<Blob>
```
Uključuje: GDPR izjavu HVZ-a, tablice za sve podatke (osobni, adresa, liječnički, vatrogasna zvanja, specijalizacije, odlikovanja), privole za 9 kategorija obrade.

### `popis-clanova.ts`
**Temelj:** `Popis_operativnih_članova.xlsx`  
**Format:** xlsx  
```typescript
generirajPopisClanova(clanovi: Clan[], filtri: ClanFilter, dvd: DVDConfig): Promise<Blob>
```
Stupci: Rb. | Ime | Prezime | Br. telefona | Zvanje | Kategorija | Status | Clanarina tekuća god.

### `lista-za-skupstinu.ts`
**Temelj:** `redovni` list u `DVD_Sarvaš_članstvo.xls`  
**Format:** docx + xlsx  
Lista s pravom glasa (46 članova), stupac za prisutnost/odsutnost.

### `dopis-lijecnicki-pregled.ts`
**Temelj:** `DOM_ZDRAVLJA_LIJECNICKI_PREGLED_listopad.docx`  
**Format:** docx  
```typescript
generirajDopisLijecnickiPregled(
  clanovi: Clan[],
  ustanova: { naziv: string; adresa: string },
  dvd: DVDConfig
): Promise<Blob>
```
Sadržaj: naslov "PREDMET: LIJEČNIČKI PREGLED ZA {N} ČLANOVA DVD {naziv}", popis članova, uputa o nalazima i računu.

---

## Nabava

### `narudzbenica.ts`
**Format:** docx  
```typescript
generirajNarudzbenicu(nabava: Nabava, dvd: DVDConfig): Promise<Blob>
```
Sadržaj: naziv + OIB DVD-a i dobavljača, URBROJ, datum, tablica stavki (opis/jed.mj./kol./cijena/ukupno), rok isporuke, potpis predsjednika + M.P.

### `zapisnik-odabira.ts`
**Format:** docx  
```typescript
generirajZapisnikOdabira(nabava: Nabava, ponude: Ponuda[], odabrana: Ponuda, razlog: string, komisija: Clan[], dvd: DVDConfig): Promise<Blob>
```
Za nabave > 2.000 EUR.

---

## Imovina

### `popis-imovine.ts`
**Format:** xlsx — AOP kategorije 0221, 0222, 0223, 0231  
```typescript
generirajPopisImovine(imovina: Imovina[], datum: Date, komisija: Clan[], dvd: DVDConfig): Promise<Blob>
```

### `dopis-registracija.ts`
**Format:** docx — dopis za produljenje registracije vozila (ako treba)

---

## Vatrogasna djelatnost

### `interventni-izvjestaj.ts`
**Format:** docx — prati HVZ format  
```typescript
generirajInterventniIzvjestaj(intervencija: Intervencija, sudionici: Clan[], dvd: DVDConfig): Promise<Blob>
```

### `nalog-za-vjezbu.ts`
**Format:** docx  

---

## Putni nalozi

### `putni-nalog.ts`
**Temelj:** `putni_nalog_Savo_Paripović_04.03.17.ods`  
**Format:** docx ili xlsx  
```typescript
generirajPutniNalog(nalog: PutniNalog, clan: Clan, dvd: DVDConfig): Promise<Blob>
```
Sadržaj: ime/prezime/OIB putnika, datum i svrha putovanja, odredište, vrsta prijevoza, km, iznos dnevnica i prijevoza, potpis + odobrenje.

---

## Registar i zakonski dokumenti

### `zahtjev-registar-udruga.ts`
**Temelj:** `zahtjev_za_upis_promjena_u_registar_udruga_rh__1__1_.docx`  
**Format:** docx — za dostavu Uredu državne uprave OBŽ  
```typescript
generirajZahtjevRegistar(promjene: PromjenaRegistra, dvd: DVDConfig): Promise<Blob>
```
Popunjava: naziv, OIB (48874677674), registarski broj (14003337), sjedište, datum promjene statuta, ovlaštena osoba.

---

## Imenovanje datoteka pri downloadanju

```typescript
// src/lib/utils/filename.ts

export function generirajImeDatoteke(
  tip: string,
  dvdSlug: string,
  datum: Date,
  urbroj?: string,
  ext = 'docx'
): string {
  const d = datum.toISOString().split('T')[0]  // YYYY-MM-DD
  const slug = dvdSlug.toUpperCase().slice(0, 4)
  const br = urbroj ? `-${urbroj}` : ''
  return `${slug}-${tip}-${d}${br}.${ext}`
}

// Primjeri:
// DVDs-Zapisnik-Skupstine-2026-02-20-S001.docx
// DVDs-Financijski-Plan-2026.docx
// DVDs-Popis-Clanova-2026-01-15.xlsx
// DVDs-Narudzbenica-2026-03-10-NAB026001.docx
// DVDs-Putni-Nalog-2025-03-04.docx
```

---

## URBROJ generator

```typescript
// src/lib/utils/urbroj.ts

export const KLASE = {
  vatrogastvo:   '810-01',
  clanstvo:      '032-01',
  financije:     '400-01',
  nabava:        '330-01',
  imovina:       '340-01',
  intervencija:  '810-02',
} as const

export function generirajUrbroj(
  vrsta: 'skupstina' | 'uo' | 'zapovjednistvo' | 'nabava' | 'racun' | 'putni_nalog',
  dvdSlug: string,
  godina: number,
  redniBroj: number
): string {
  const prefiks = {
    skupstina:      'S',
    uo:             'UO',
    zapovjednistvo: 'Z',
    nabava:         'NAB',
    racun:          'R',
    putni_nalog:    'PN',
  }[vrsta]

  const slug = dvdSlug.toUpperCase().slice(0, 4)  // 'SARV'
  const br = String(redniBroj).padStart(3, '0')

  return `${slug}-${godina}-${prefiks}/${br}`
  // Primjeri: SARV-2026-S/001, SARV-2026-UO/022, SARV-2026-NAB/003
}
```
