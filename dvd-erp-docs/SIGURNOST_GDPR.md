# SIGURNOST I GDPR — DVD Sarvaš ERP

## Zakonska osnova

- Uredba (EU) 2016/679 — GDPR
- Zakon o provedbi Opće uredbe o zaštiti podataka (NN 42/18)
- Zakon o kibernetičkoj sigurnosti (NN 14/2024)

---

## Kategorije osobnih podataka u sustavu

| Kategorija | Podaci | Osnova obrade | Rok čuvanja |
|---|---|---|---|
| Podaci članova | Ime, OIB, adresa, kontakt | Privola + statutarna obveza | 5 god. nakon prestanka |
| Zdravstveni podaci | Rezultati pregleda | Zakonska obveza (ZoV čl. 45.) | Trajno (operativni vatrogasci) |
| Financijski podaci | Plaćanje članarine | Ugovorna obveza | 7 god. |
| Vatrogasni podaci | Zvanja, certifikati | Zakonska obveza (ZoV) | Trajno |
| Podaci o intervencijama | Sudionici | Zakonska obveza (ZoV) | Trajno |

## GDPR obveze DVD-a kao voditelja obrade

1. **Privola pri učlanjenju** — svaka pristupnica mora sadržavati GDPR izjavu
2. **Evidencija aktivnosti obrade** — interno, bez prijave AZOP-u za ovu vrstu obrade
3. **Pravo na pristup** — član može tražiti ispis svojih podataka
4. **Pravo na ispravak** — ažuriranje podataka na zahtjev
5. **Pravo na brisanje** — ograničeno zakonskim rokovima čuvanja

## Tehničke mjere zaštite u sustavu

- Autentikacija: Supabase Auth (email + lozinka, opcija 2FA)
- Enkripcija: HTTPS/TLS za sve komunikacije, AES-256 za storage
- Row Level Security: svaki korisnik vidi samo što mu uloga dopušta
- Revizijski trag: svaka promjena osobnih podataka bilježi se s korisnik + timestamp
- Automatsko odjava: sesija istječe nakon 8h neaktivnosti
- Lozinke: min. 12 znakova, Supabase Auth hash (bcrypt)

## Pristup podacima prema ulozi

- **Osobni podaci članova (OIB, adresa, kontakt):** predsjednik, tajnik, admin
- **Zdravstveni podaci:** predsjednik, zapovjednik, admin
- **Financijski podaci:** predsjednik, blagajnik, admin
- **Vatrogasni podaci:** svi autentificirani
- **Vlastiti podaci:** svaki korisnik vidi vlastiti profil

## Pohrana i backup

- Supabase: automatski dnevni backup (uključen u free tier)
- Dokumenti (PDFovi, skenovi): Supabase Storage, EU region (Frankfurt)
- Nije dozvoljeno: pohrana osobnih podataka u Google Drive bez DPA ugovora

---

## Autentikacija i pristup

### Login tijek
1. Email + lozinka
2. (Opciono Faza 2) OTP putem emaila ili authenticator app
3. Sustav bilježi login (IP, timestamp, uređaj)
4. Failed login: 5 pokušaja → lock 15 min

### Upravljanje korisnicima
- Kreira samo admin (predsjednik)
- Deaktivacija: odmah, bez brisanja (revizijski trag ostaje)
- Reset lozinke: putem email linka

### Korisničke sesije
- JWT token, istječe za 8h
- Refresh token: 30 dana
- Logout: invalidira sve tokene korisnika
