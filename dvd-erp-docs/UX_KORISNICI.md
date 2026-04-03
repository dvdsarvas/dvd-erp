# UX I KORISNIČKE ULOGE — DVD Sarvaš ERP

## Korisničke uloge i prava pristupa

| Modul | Predsjednik | Zamjenik | Tajnik | Blagajnik | Zapovjednik | Clan (čitanje) |
|---|---|---|---|---|---|---|
| Nadzorna ploča | ✅ puno | ✅ puno | ✅ puno | ✅ puno | ✅ puno | ✅ čitanje |
| Članstvo | ✅ puno | ✅ puno | ✅ puno | ✅ čitanje | ✅ čitanje | ❌ |
| Skupštine | ✅ puno | ✅ puno | ✅ puno | ✅ čitanje | ✅ čitanje | ✅ čitanje |
| Sjednice UO | ✅ puno | ✅ puno | ✅ puno | ✅ čitanje | ✅ čitanje | ❌ |
| Sjednice Zap. | ✅ puno | ✅ čitanje | ✅ čitanje | ❌ | ✅ puno | ❌ |
| Financije | ✅ puno | ✅ čitanje | ✅ čitanje | ✅ puno | ❌ | ❌ |
| Zakonska izvješća | ✅ puno | ✅ puno | ✅ puno | ✅ financije | ❌ | ❌ |
| Nabava | ✅ odobrava | ✅ čitanje | ✅ unosi | ✅ čitanje | ✅ zahtjev | ❌ |
| Imovina/Vozila | ✅ puno | ✅ puno | ✅ puno | ✅ čitanje | ✅ puno | ❌ |
| Vatrogasna djel. | ✅ čitanje | ✅ čitanje | ✅ čitanje | ❌ | ✅ puno | ✅ vlastito |
| Arhiva | ✅ puno | ✅ puno | ✅ puno | ✅ financije | ✅ vatrog. | ✅ javno |

---

## Ključni korisnici i njihove tipične sesije

### Predsjednik — tjedno ~15 min
**Jutarnja rutina:**
1. Otvori nadzornu ploču → provjeri upozorenja i rok
2. Odobri nabave koje čekaju odobrenje
3. Pregleda status zakonskih izvješća

**Pred skupštinu:**
1. Kreira sjednicu, dodaje točke dnevnog reda
2. Generira pozivnicu i šalje svim članovima
3. Generira materijale (izvješća) za svaku točku

**Nakon skupštine:**
1. Unosi glasove i zaključke
2. Generira zapisnik → PDF → upload skena
3. Sustav automatski kreira zadatak: dostavi Uredu državne uprave

### Tajnik — tjedno ~30 min
**Svakodnevno:**
1. Prima ulazne dokumente → skenira → uploadne s URBROJ-em
2. Ažurira status zakonskih izvješća
3. Upisuje promjene u popis članova

**Pred sjednicom:**
1. Generira pozivnicu sa sjednice UO
2. Šalje mail svim članovima UO
3. Priprema materijale

**Arhiviranje:**
1. Tjedno pregleda dokumente bez URBROJ-a
2. Klasificira i arhivira

### Blagajnik — tjedno ~45 min
**Pri plaćanju:**
1. Otvori modul Nabava → pronađe stavku
2. Potvrdi primitak robe/usluge
3. Unese podatke računa (ili uploadne scan)
4. Likvidira račun (odobrenje za plaćanje)
5. Nakon plaćanja → unese datum i iznos

**Mesečno:**
1. Ispiše izvod blagajne iz sustava
2. Provjeri stanje blagajne vs. fizičku blagajnu
3. Ažurira ostvarenje vs. plan

**Kvartalno:**
1. Sustav generira formu za FINA izvješće
2. Provjera podataka → upload na FINA

### Zapovjednik — tjedno ~20 min
**Nakon intervencije:**
1. Otvori modul Vatrogasna djelatnost → Nova intervencija
2. Unese podatke (adresa, vrsta, sat, sudionici)
3. Sustav automatski predlaže URBROJ i format
4. Spremi → isti podaci idu u HVZ IS ručno (za sad)

**Pred/nakon vježbe:**
1. Kreira vježbu s nalogom
2. Evidentira prisutne i napomene
3. Sustav ažurira osposobljenost vatrogasaca

---

## Tijekovi rada (User Flows)

### Flow 1: Priprema i vođenje skupštine

```
PREDSJEDNIK/TAJNIK
│
├─ 1. NOVO → "Skupština"
│        → Odabir vrste (redovna/izborna/izvanredna)
│        → Datum, sat, mjesto, procijenjeni broj prisutnih
│
├─ 2. DNEVNI RED
│        → Dodavanje točaka (drag & drop reorder)
│        → Za svaku točku: naziv, vrsta, odgovoran za izlaganje
│        → Upload priloženih materijala (excel, pdf)
│
├─ 3. POZIVNICA
│        → [Generiraj pozivnicu] → preview docx
│        → [Pošalji svim članovima] → email s prilogom
│        → Evidencija: datum slanja, primatelji
│
├─ 4. VOĐENJE SJEDNICE (na dan)
│        → [Otvori sjednicu]
│        → Unos prisutnih (checkboxovi s popisom članova)
│        → Automatski: kvorum postignut? (prag prema statutu)
│        → Za svaku točku: unos zaključka, glasovi
│
├─ 5. ZAPISNIK
│        → [Generiraj zapisnik] → docx s popunjenim podacima
│        → Tiskaj, potpiši, ovjeritelji potpišu
│        → [Upload potpisan PDF sken]
│        → Status → "Zapisnik potpisan"
│
└─ 6. DOSTAVA I PRAĆENJE
         → Ako je skupština: upozorenje "Dostavi Uredu drž. uprave OBŽ"
         → [Označi kao dostavljeno] → unos datuma
         → Provjera: ima li promjena za Registar udruga?
```

### Flow 2: Unos i plaćanje računa

```
BLAGAJNIK/TAJNIK
│
├─ 1. PRIMITAK RAČUNA
│        → Scan → Upload u sustav
│        → Unos: datum, iznos, dobavljač, opis
│        → Automatski URBROJ (Knjiga ulaznih računa)
│        → Sustav traži: postoji li narudžbenica za ovo?
│
├─ 2. LIKVIDATURA
│        → Blagajnik: "Provjera" → je li roba primljena?
│        → [Odobri za plaćanje] → e-potpis ili checkbox
│        → Ako iznos > limit → upozorenje "Treba odobrenje predsjednika"
│
├─ 3. PLAĆANJE
│        → [Označi kao plaćeno] → datum i iznos
│        → Sustav bilježi u Knjigu primitaka i izdataka
│
└─ 4. ARHIVIRANJE
         → Račun dostupan u Arhivi i vezan uz Nabavu
         → Vidljivo u financijskim izvješćima
```

### Flow 3: Godišnji ciklus zakonskih obveza

```
AUTOMATSKI (1. siječnja svake godine)
│
├─ Sustav kreira evidenciju za novu godinu:
│     ├─ Q1/Q2/Q3/Q4 FINA izvješća
│     ├─ Godišnje FINA izvješće
│     ├─ Skupštinska izvješća
│     └─ JLS izvješće
│
├─ Sva sa statusom "Nije predano" i rokovima
│
└─ Automatski alarmi prema konfiguriranom kalendaru
```

---

## Navigacija i UX načela

### Globalna navigacija
```
[🔥 DVD Sarvaš]     ← Logo + naziv DVD-a
│
├── Pregled
│    └── Nadzorna ploča
│
├── Upravljanje
│    ├── Članstvo          [badge: neplaćena clanarina]
│    └── Imovina i vozila
│
├── Sjednice
│    ├── Skupštine
│    ├── Sjednice UO
│    └── Zapovjedništvo
│
├── Dokumenti
│    ├── Zapisnici
│    └── Arhiva dokumenata
│
├── Planovi
│    ├── Plan rada
│    └── Financijski plan
│
├── Zakonske obveze       [badge: broj otvorenih]
│    ├── Zakonska izvješća
│    └── Nabava
│
└── Vatrogasna djelatnost
     ├── Intervencije
     ├── Vježbe i obuka
     └── Oprema postrojbe
```

### UX pravila
1. **Svaki modul ima 3 razine:** Lista → Detalji → Uredi/Unesi
2. **Generiranje dokumenta** uvijek dostupno iz detalja zapisa
3. **Rok/upozorenje** vidljivo odmah uz naziv stavke — ne sakrivati
4. **Mobilni prikaz:** lista s karticama, detalji na cijelom ekranu
5. **Potvrdni dijalozi** samo za destruktivne akcije (brisanje, poništavanje)
6. **Automatski spremi** — forme ne gube podatke pri navigaciji
7. **URBROJ** — uvijek vidljivo, kopiraj jednim klikom
