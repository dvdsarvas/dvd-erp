# Analiza pravnog okvira i prijedlozi za poboljšanje DVD ERP-a

> Analiza Statuta DVD Sarvaš, Zakona o vatrogastvu, Zakona o udrugama i Zakona o financijskom poslovanju neprofitnih organizacija u kontekstu funkcionalnosti ERP sustava.

---

## Sažetak

| Kategorija | Ukupno obveza | Implementirano | Djelomično | Nedostaje |
|------------|:---:|:---:|:---:|:---:|
| Zakon o vatrogastvu | 18 | 4 | 8 | 6 |
| Zakon o udrugama | 16 | 6 | 6 | 4 |
| Zakon o fin. poslovanju | 8 | 3 | 3 | 2 |
| GDPR | 5 | 3 | 2 | 0 |
| Statut DVD Sarvaš | 20 | 8 | 7 | 5 |
| **UKUPNO** | **67** | **24 (36%)** | **26 (39%)** | **17 (25%)** |

---

## Kritični nedostaci (riješiti prije produkcije)

### 1. Zdravstveni pregledi — automatski podsjetnici
**Zakon:** Čl. 53 Zakona o vatrogastvu
**Problem:** Sustav evidentira preglede ali ne šalje automatske podsjetnike.
**Rješenje:**
- Automatski email 60/30/7 dana prije isteka pregleda
- Filter "Članovi kojima ističe pregled u sljedećih 90 dana"
- Automatsko generiranje dopisa zdravstvenoj ustanovi
- Upload polje za certifikat o sposobnosti (PDF)

### 2. Dostava zapisnika skupštine — praćenje roka
**Zakon:** Čl. 18 Zakona o udrugama
**Problem:** Zapisnik skupštine mora se dostaviti Uredu državne uprave, ali nema praćenja roka.
**Rješenje:**
- Automatski izračun roka: `datum_skupštine + 14 dana`
- Status u zapisnicima: Nacrt → Potpisan → **Dostavljen**
- Upload potvrde o dostavi
- Alarm na dashboardu ako rok istječe

### 3. Rok za usvajanje planova — 31.12.
**Zakon:** Čl. 28 Zakona o udrugama
**Problem:** Plan rada i financijski plan moraju se usvojiti do 31.12. — nema upozorenja.
**Rješenje:**
- Alarmi: 60/30/7 dana prije 31.12.
- Povezivanje skupštine s usvajanjem planova
- M07 unos: "Usvajanje planova — rok 31.12."

### 4. Evidencija izbora dužnosnika
**Zakon:** Čl. 19 Zakona o udrugama + Statut čl. 30-34
**Problem:** Glasovanje o dužnosnicima se bilježi kao obična točka, a ne strukturirano.
**Rješenje:**
- Strukturirani obrazac "Izbori": kandidat, funkcija, glasovi za/protiv, izabran
- Automatsko ažuriranje uloga u `korisnici` tablici nakon izbora
- Automatsko kreiranje obveze "Promjena u Registru udruga" (rok 60 dana)
- Email obavijest izabranim dužnosnicima

---

## Važni nedostaci (riješiti za v1.1)

### 5. Članarine — automatsko praćenje plaćanja
**Statut:** Čl. 15
- Rok plaćanja: 31.01. svake godine
- Automatsko označavanje neplaćenih nakon 90 dana
- Email podsjetnik: "Članarina za 2026. dospijeva 31.01."
- Automatska suspenzija nakon 90 dana neplaćanja (s ručnim override-om)

### 6. Napredovanje u zvanju — dokumentacija
**Zakon:** Čl. 70 Zakona o vatrogastvu
- Dodati stupce u osposobljavanje: datum_ispita, rezultat, broj_certifikata, certifikat_url
- Generiranje certifikata o zvanju
- Prikaz "Članovi spremni za napredovanje"

### 7. Godišnja inventura imovine
**Zakon:** Čl. 20 Zakona o financijskom poslovanju
- Rok: do 31.01. svake godine
- "Inventurni mod" u M09: zamrzni popis, checkbox za svaku stavku, generiraj izvješće
- Alarmi 60/30/7 dana prije roka

### 8. Samoprocjena sustava financijskog upravljanja (FUK)
**Zakon:** Zakon o sustavu unutarnjih kontrola
- Rok: 28.02. svake godine
- Dodati u M07 kao obvezu
- Link na MFIN portal obrazac

### 9. GDPR — pravo na pristup podacima
**Zakon:** GDPR čl. 15
- Gumb u profilu člana: "Preuzmite svoje podatke"
- CSV export osobnih podataka
- Vidljivi audit trail (tko je pristupio/mijenjao podatke)

---

## Prijedlozi za automatizaciju (brze pobjede)

### Automatski rokovi (Quick Win #1)
Sustav bi trebao automatski generirati zakonske obveze za svaku godinu:

| Obveza | Rok | Primatelj |
|--------|-----|-----------|
| FINA godišnji izvještaj (NEPROF-06) | 01.03. | FINA |
| Bilješke uz financijsko izvješće | 01.03. | FINA |
| Samoprocjena FUK | 28.02. | MFIN |
| FINA polugodišnji izvještaj | 31.07. | FINA |
| Izvješće o radu za JLS i VZ | 30.06. | Grad/VZ |
| Inventura imovine | 31.01. | Interno |
| Plan rada i financijski plan — usvajanje | 31.12. | Skupština |
| Registar udruga — promjene | 60 dana od promjene | Ured dr. uprave |

**Implementacija:** Gumb "Generiraj obveze za 2027" — kreira sve gore navedene unose u `zakonska_izvjesca`.

### Email podsjetnici (Quick Win #2)
Proširiti `send-reminder` Edge Function:
- Zdravstveni pregledi (60/30 dana)
- Članarine (neplaćene nakon 31.01.)
- Registracija vozila (60/30 dana)
- Zakonska izvješća (30/14/7 dana)

### Povezivanje modula (Quick Win #3)
- Kad se kreira skupština s točkom "Izbor dužnosnika" → automatski pripremi obrazac za izbore
- Kad se usvoji financijski plan na skupštini → automatski promijeni status plana na "usvojen"
- Kad se potpiše zapisnik skupštine → automatski kreiraj obvezu "Dostava Uredu dr. uprave" s rokom

---

## Prijedlozi za buduće verzije (v2.0+)

### Integracije
1. **HVZ IS sinkronizacija** — automatski export podataka o članovima u HVZ elektronički sustav
2. **FINA e-Prijava** — direktna predaja financijskih izvještaja
3. **eRačun** — integracija s FINA sustavom e-računa (kad DVD ima poslovnu djelatnost)

### Napredne funkcionalnosti
4. **Disciplinski postupci** — kompletni workflow (prijava → istraga → rasprava → odluka → žalba)
5. **Dvojno knjigovodstvo** — za DVD-ove s prihodima iznad 30.526,24 EUR (DVD Sarvaš je iznad!)
6. **Bodovanje vatrogasaca** — automatsko iz podataka sustava (staž × 100 + intervencije × 500 + vježbe × 800...)
7. **QR iskaznica** — generiranje članske iskaznice s QR kodom za brzu identifikaciju na intervencijama
8. **PWA + Push notifikacije** — obavijest na mobitel kod alarma za intervenciju
9. **AI asistent** — predlaganje sadržaja za izvješće o radu na temelju podataka iz sustava
10. **Multi-DVD** — podrška za više DVD-ova s jednom instalacijom (SaaS model)

### Dokumenti za dodati
11. **Putni nalog** — generiranje iz predloška (PUTNI NALOG 1 - PATRICK LONČARIĆ.xlsx je primjer)
12. **Interventni izvještaj** — prema HVZ formatu
13. **Nalog za vježbu** — prema HVZ formatu
14. **Certifikat o zvanju** — za dodjelu vatrogasnog zvanja
15. **Obavijest o statusu** — kad se član suspendira/isključi

---

## Procjena rizika

| Rizik | Vjerojatnost | Utjecaj | Mitigacija |
|-------|:---:|:---:|-----------|
| DVD ne prati zdravstvene preglede → pravna odgovornost | Visoka | Visok | Implementirati automatske podsjetnike |
| Zapisnik skupštine nije dostavljen u roku → kazna | Srednja | Srednji | Dodati praćenje roka + alarm |
| Članarina neplaćena → gubitak prihoda | Srednja | Srednji | Automatski podsjetnici + suspenzija |
| Izbori dužnosnika nedokumentirani → odbijanje registracije | Niska | Visok | Strukturirani obrazac za izbore |
| GDPR zahtjev za pristup podacima → neusklađenost | Niska | Visok | Gumb za export + audit trail |
| DVD iznad praga za dvojno knjigovodstvo → kazna | Niska | Srednji | Upozorenje u sustavu + preporuka |

---

*Analiza izrađena 28.03.2026.*
*Na temelju: Statut DVD Sarvaš (2021), Zakon o vatrogastvu (NN 125/19), Zakon o udrugama (NN 74/14), Zakon o fin. poslovanju NP (NN 121/14), GDPR (EU 2016/679)*
