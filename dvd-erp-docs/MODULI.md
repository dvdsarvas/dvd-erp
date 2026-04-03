# MODULI — DVD ERP

Detaljan opis svakog od 11 modula na temelju stvarnih dokumenata DVD Sarvaš.

---

## M01 · Nadzorna ploča

### Sadržaj
- **KPI kartice:** aktivni članovi, operativnih s važećim pregledom, otvorena izvješća (FINA, JLS), % realizacije fin. plana
- **Upozorenja** sortirana po hitnosti:
  - Crveno: rokovi prošli ili unutar 7 dana
  - Narančasto: unutar 14 dana
  - Žuto: unutar 30 dana
- **Nadolazeće sjednice:** iz tablice `sjednice` gdje datum > danas
- **Activity feed:** zadnje promjene iz `revizijski_trag`

### Automatski alarmi
| Što | Kada | Za koga |
|---|---|---|
| FINA kvartalno izvješće | 30/14/7 dana | Predsjednik + Blagajnik |
| Registracija vozila | 60/30 dana | Predsjednik |
| Zdravstveni pregled vatrogasca | 60/30 dana | Predsjednik + Zapovjednik |
| Skupština (plan) nije zakazana | Ako je prošao 1.10. | Predsjednik |

---

## M02 · Evidencija članstva

### Temelji se na
- `DVD_Sarvaš_članstvo.xls` — 9 listova (redovni, NOVO, pomladak, liječnički, školovanje, tijela, ispisani...)
- `Popis_operativnih_članova.xlsx` — 16 operativnih članova s telefonima i zvanjima
- `Pristupnica_nova.docx` — obrazac za učlanjenje s GDPR izjavom
- `Obrazac_za_prikupljanje_podataka_-_punoljetne_osobe.docx` — HVZ IS obrazac

### Tipovi pogleda

#### Lista članova
Filter po: kategorija | status | zvanje | clanarina tekuća god.  
Stupci: Rb. | Ime i prezime | Zvanje | Kategorija | Telefon | Status | Članirina

#### Detalji člana — 6 tabova

**Tab: Osobni podaci** (pristup: predsjednik, tajnik)
- Ime, prezime, OIB, JMBG, ime oca
- Datum i mjesto rođenja
- Adresa, mobitel (primarni + sekundarni), email
- Školska sprema, vozačka dozvola
- Datum učlanjenja, broj knjižice

**Tab: Vatrogasno**
- Kategorija, status, zvanje
- Osposobljenost: tablica s datumima za svako zvanje (vatrogasac → viši vatrogasni časnik 1. kl.)
- Ostale specijalizacije (slobodni unos)

**Tab: Zdravstveni pregledi**
- Kronološka lista pregleda s datumima od-do
- Trenutna sposobnost (zeleno/crveno)
- Datum sljedećeg pregleda s odbrojavanjem

**Tab: Članarina**
- Tablica po godinama: plaćeno/neplaćeno + datum + iznos
- Masa ažuriranje: označi više članova → "Plaćeno za 2026."

**Tab: Intervencije i vježbe** (samo čitanje)
- Lista intervencija u kojima je član sudjelovao
- Lista vježbi i obuka

**Tab: Dokumenti**
- Pristupnica, uvjerenja, certifikati vezani uz ovog člana

### Generiranje dokumenata
- **Pristupnica** (docx) — na temelju `Pristupnica_nova.docx`
- **HVZ obrazac** (docx) — na temelju `Obrazac_za_prikupljanje_podataka`
- **Popis operativnih članova** (xlsx) — na temelju `Popis_operativnih_članova.xlsx`
- **Popis s liječničkim pregledima** (xlsx) — za organizaciju pregleda (Dom zdravlja Osijek)
- **Popis članova za skupštinu** — lista s pravom glasa (na temelju `Upis_članova_za_izvještajnu_skupštinu.docx`)

### Liječnički pregledi — posebna napomena
Iz `DOM_ZDRAVLJA_LIJECNICKI_PREGLED_listopad.docx`:
DVD šalje popis članova koji dolaze na pregled.
Sustav generira ovaj dopis automatski iz filtriranog popisa vatrogasaca.

```
Dokument uključuje:
- Naziv i adresu zdravstvene ustanove (Dom zdravlja Osijek, Medicina rada)
- Popis članova koji dolaze (ime, prezime)
- Napomenu tko preuzima nalaze
- Podatke DVD-a (OIB, adresa)
```

---

## M03 · Sjednice

### Temelji se na
- `Skupština_2026_Protokol.docx` — kompletni protokol vođenja skupštine
- `Dnevni_red_za_izvještajnu_Sjednicu_skupštine_2026_.docx` — službeni dnevni red
- `Poziv__skupština_2026_.docx` — pozivnica
- `Odluke__radna_tijela__2026_god.docx` — odluka o izboru radnih tijela
- `Izvješče_Verifikacijskog_povjerenstva_2026_god.docx` — obrazac verifikacijske komisije
- `Upis_članova_za_izvještajnu_skupštinu.docx` — lista prisutnih
- `Upisnica_dužnosnici.docx` — upisnica gostiju dužnosnika
- `Upisnica_DVD-a.docx` — upisnica predstavnika DVD-ova
- `21__Sjednica_UO_Dnevni_red.docx` — dnevni red UO sjednice

### M03-A · Skupštine

Stvarni dnevni red 15. skupštine (20. 2. 2026.) iz protokola:

```
OTVARANJE SKUPŠTINE (intonacija himni, minuta šutnje)
1. IZBOR RADNIH TIJELA SKUPŠTINE
   a) Radno voditeljstvo — 3 člana
   b) Zapisničar
   c) Ovjerovitelji zapisnika — 2 člana
   d) Verifikacijska komisija — 3 člana
2. PODNOŠENJE IZVJEŠĆA VERIFIKACIJSKE KOMISIJE
3. IZVJEŠĆE O RADU DRUŠTVA ZA 2025. GODINU
4. FINANCIJSKO IZVJEŠĆE ZA 2025. GODINU
5. RASPRAVA I USVAJANJE IZVJEŠĆA
6. RAZRJEŠENJE DOSADAŠNJIH DUŽNOSNIKA DRUŠTVA
7. IZBOR NOVIH DUŽNOSNIKA DRUŠTVA
8. DODJELA PRIZNANJA I ODLIKOVANJA
9. POZDRAVNA RIJEČ GOSTIJU
10. RAZNO
```

**Posebnost izborne skupštine:** Točke 6 i 7 — razrješenje i izbor. Sustav mora podržati unos novoizabranih dužnosnika i automatsko ažuriranje uloga u `korisnici` tablici.

**Gosti na skupštini** (iz protokola 2026):
- Predsjednik VZ OBŽ (Zdenko Čarapar)
- Zapovjednik VZ Osijek i JVP (Goran Ivković)
- Predstavnica gradonačelnika (Loreta Vanko)
- Predstavnici MO Sarvaš
- Predstavnici prijateljskih DVD-ova

Sustav mora imati `Upisnica_DVD-a` (gosti DVD-ovi) i `Upisnica_dužnosnici` (gosti dužnosnici) — generiranje iz modularne tablice.

**Verifikacijska komisija** — iz `Izvješče_Verifikacijskog_povjerenstva_2026_god.docx`:
- Sastavlja se od 3 člana
- Utvrđuje broj prisutnih i kvorum
- DVD Sarvaš ima 46 članova s pravom glasa
- Tekst: "Na današnjoj Skupštini prisutno je ___ članova od njih ukupno 46."

**KLASA i URBROJ format za skupštine:**
```
KLASA: 810-01/2026-01
URBROJ: DVD-Sarvas-2026-S/001
```

### M03-B · Sjednice Upravnog odbora

Iz `21__Sjednica_UO_Dnevni_red.docx`:
- Format: `Ur.br: 20/225` (stariji format, treba ažurirati)
- Saziv: "21. sjednica trećeg saziva Upravnog odbora"
- Lokacija: "prostorije DVD-a Sarvaš, Ivana Mažuranića 31"

Tipičan dnevni red UO:
```
- Usvajanje dnevnog reda
- Usvajanje zapisnika s prethodne sjednice
- Financijsko izvješće (tekuće stanje)
- Prijedlog planova i odluka
- Razno
```

### M03-C · Sjednice Zapovjedništva

Fokus na operativne teme:
- Analiza prošlih intervencija
- Stanje opreme i vozila
- Raspored dežurstava
- Planiranje vježbi
- Osposobljavanje

---

## M04 · Zapisnici

Centralna arhiva. Posebnosti DVD Sarvaš:

**Dostava zapisnika skupštine Uredu državne uprave OBŽ** — zakonska obveza (čl. 18. ZoU).
Sustav generira podsjetnik i evidentira datum dostave.

**Format zapisa:** Zapisnici se čuvaju u dva oblika:
1. Generiran docx (predložak)
2. Skeniran PDF originala s potpisima

**Knjiga zapisnika** — kronološka evidencija svih zapisnika s URBROJ-om.

---

## M05 · Plan rada

### Temelji se na
- `Plan_rada_2025_DVD_Sarvaš.pdf` — stvarni plan rada

Stvarne kategorije iz Plana rada 2025:
1. Preventivne mjere zaštite od požara
2. Vježbe i edukacije
3. Vatrogasna natjecanja
4. Dan vatrogastva (4. 5.)
5. Žetvena sezona — pojačane mjere
6. Opremanje i uređenje doma
7. Obilježavanje obljetnica i manifestacija
8. Suradnja s OŠ Sarvaš (edukacija djece)
9. Vatrogasna zabava
10. Suradnja s MO Sarvaš
11. Skupštine i sjednice

---

## M06 · Financijsko planiranje i poslovanje

### Temelji se na
- `Financijski_plan_2025.xlsm` — stvarni fin. plan po Računskom planu NP
- `Neprof606_01_01_31_12_2024.xls` — FINA obrazac PR-RAS-NPF za 2024.

### Stvarni financijski podaci DVD Sarvaš 2024/2025

Iz FINA izvješća:
- Prihodi 2023: **41.487,08 EUR**
- Prihodi 2024: **51.489,69 EUR** (+24,1%)
- Dominantni prihod: Prihodi po posebnim propisima (dotacija) — 48.265,84 EUR (93,7% ukupnih prihoda)

Iz Fin. plana 2025:
- Ukupni planirani prihodi: **46.456,07 EUR**
- Ukupni planirani rashodi: **42.859,04 EUR**

### M06-A · Financijski plan

Koristi strukturu Računskog plana za NP organizacije — iste AOP oznake kao FINA.
Opcija za uvoz iz postojećeg `Financijski_plan_2025.xlsm`.

### M06-B · Poslovne knjige

Knjige za jednostavno knjigovodstvo (ispod praga 30.526,24 EUR godišnje — DVD Sarvaš je **iznad praga** za 2024!):

**PAŽNJA:** DVD Sarvaš ima prihode od 51.489,69 EUR u 2024. što je **iznad praga** od 30.526,24 EUR.
Treba provjeriti ima li Odluku o vođenju jednostavnog knjigovodstva i udovoljava li uvjetu
**uzastopno 3 godine** ispod praga. Ako ne — obvezno dvojno knjigovodstvo.

### M06-C · FINA izvješća

Sustav generira podatke u formatu kompatibilnom s obrascem `Neprof606`.
Stvarni podaci DVD Sarvaš za obrazac:

```
Naziv: DOBROVOLJNO VATROGASNO DRUŠTVO SARVAŠ
IBAN: HR43 2340009 1110673705
RNO: 197128
MBS: 02794586
OIB: 48874677674
Šifra djelatnosti: 9499
Šifra grada/općine: 312 (Osijek)
Šifra županije: 14
```

---

## M07 · Zakonska izvješća

Kompletna lista s rokovima (vidjeti ZAKONSKE_OBVEZE.md).

**Posebno za DVD Sarvaš:**
- JLS = Općina Antunovac (ili Grad Osijek, ovisno o administrativnoj prip.)
- VZ OBŽ = Vatrogasna zajednica Osječko-baranjske županije
- Ured državne uprave OBŽ = primatelj zapisnika skupštine

---

## M08 · Nabava

### Temelji se na
- Pravilnik o provedbi jednostavne nabave DVD Sarvaš (usvojen na UO sjednici)
- Stavke iz Financijskog plana (OZS, vozila, oprema)

Stvarne nabave iz Financijskog plana 2025:
- Vatrogasna zaštitna oprema: 4.645,61 EUR
- Ostala vatrogasna oprema: 796,39 EUR
- Uredska oprema i računala: 530,93 EUR
- Komunikacijska oprema: 663,66 EUR
- Vatrogasna vozila: 6.636,58 EUR

---

## M09 · Imovina i vozila

### Temelji se na
- AOP 0221, 0222, 0223, 0231 iz Financijskog plana
- Stavka: "Vatrogasna vozila — 6.636,58 EUR"

Kategorije imovine iz Fin. plana:
- Uredska oprema i namještaj, računala (AOP 0221)
- Komunikacijska oprema — mobiteli i telefoni (AOP 0222)
- Oprema za protupožarnu zaštitu (AOP 0223)
- Prijevozna sredstva u cestovnom prometu (AOP 0231)

### Putni nalozi
Iz `putni_nalog_Savo_Paripović_04.03.17.ods` — DVD koristi putne naloge za:
- Službena putovanja na skupove i seminare
- Obračun troška goriva pri korištenju privatnog vozila
- Dokumentacija za rashod 4222 (Službena putovanja)

---

## M10 · Vatrogasna djelatnost

### Temelji se na
- `Izvješće_o_radu_2025_DVD_Sarvaš.docx` — detaljno opisuje aktivnosti

### Stvarne aktivnosti DVD Sarvaš 2025

**Intervencije:**
- 6 vatrogasnih intervencija ukupno
- 3 požarne + 3 tehničke
- 100 sati ukupnog rada

**Vježbe:**
- 31.03.2025. — zajednička vježba spašavanja u Nemetinu (JVP + 5 DVD-ova)
- 23.06.2025. — velika vježba na prostoru lovačkog doma Sarvaš (5 DVD-ova)

**Osposobljavanje:**
- 29.04.2025. — Modul 2, Gašenje požara na otvorenom, Lučko (Milenko Korica)
- 27-28.03. — 19. Stručni skup vatrogasaca HVZ-a

**Natjecanja:**
- Gradsko natjecanje VZ Osijek: 1. mjesto Mladež, 2. mjesto Pomladak, 2. mjesto Seniori A
- 13.07.2025. — Županijsko natjecanje Belišće (1200 sudionika, 84 ekipe)
  - DVD Sarvaš: **1. mjesto** Djeca-muška (brentača) — historijski rezultat!

**Žetvena sezona:**
- 2 smjene, 17 vatrogasaca
- Prošla bez većih požarnih intervencija

**Edukacija:**
- 17.06.2025. — djeca iz Dječjeg vrtića Sarvaš (podcentar Ribica)

### HVZ IS integracija
DVD unosi podatke u HVZ IS (vatrogasci.hr) direktno.
Ovaj sustav vodi internu kopiju za vlastite potrebe.
Koordinata: zapovjednik je odgovoran za HVZ IS unose.

---

## M11 · Arhiva dokumenata

Organizacija prema stvarnim dokumentima DVD Sarvaš:

```
ARHIVA/
├── 01-OSNIVANJE-STATUT/          # Rješenje, Statut, izmjene
├── 02-CLANSTVO/
│   ├── pristupnice/               # Potpisane pristupnice
│   ├── gdpr-privole/              # Potpisani GDPR obrasci
│   └── uvjerenja-osposobljavanje/ # Uvjerenja o osposobljenosti
│       ├── Uvjerenje_Korica_Milenko.jpg
│       └── Uvjerenje5_Andrašek_Maja.jpg
├── 03-SKUPSTINE/
│   ├── 2024/
│   │   └── Zapisnik_skupstine_financijski_plan_2025.pdf
│   ├── 2025/
│   └── 2026/
│       ├── Dnevni_red_skupstine_2026.docx
│       ├── Protokol_skupstine_2026.docx
│       ├── Odluke_radna_tijela_2026.docx
│       ├── Izvjesce_verifikacijske_komisije_2026.docx
│       └── Upis_clanova_skupstina_2026.docx
├── 04-SJEDNICE-UO/
│   └── 2025/
│       └── 21_Sjednica_UO_Dnevni_red.docx
├── 05-SJEDNICE-ZAPOVJEDNISTVO/
├── 06-FINANCIJE/
│   ├── 2024/
│   │   └── Neprof606_01_01_31_12_2024.xls  # FINA obrazac
│   ├── 2025/
│   │   └── Financijski_plan_2025.xlsm
│   └── clanarine/
├── 07-RACUNI-NABAVA/              # 7 godina čuvanja
├── 08-VATROGASNA/
│   ├── Plan_rada_2025_DVD_Sarvas.pdf
│   ├── Izvjesce_o_radu_2025_DVD_Sarvas.docx
│   └── intervencije/
├── 09-VOZILA-OPREMA/
│   ├── registracije/
│   └── servisi/
├── 10-ZDRAVSTVENI-PREGLEDI/
│   └── DOM_ZDRAVLJA_LIJECNICKI_PREGLED.docx
└── 11-PROJEKTI/                   # EU fondovi, natjecaji
```

**Digitalni ekvivalent:** Sve kategorije mapiraju se u Supabase Storage buckete.
Metapodaci u tablici `dokumenti` s vezama na odgovarajuće zapise.
