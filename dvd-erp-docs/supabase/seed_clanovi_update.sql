-- ============================================================
-- UPDATE: Matični list DVD Sarvaš (28.03.2026.)
-- Ažurira podatke iz matičnog lista HVZ-a:
--   1. Ažurirane adrese i mobiteli postojećih članova
--   2. Novi članovi koji nisu bili u Članstvo.xlsx
--   3. Članovi koji više nisu na matičnom listu -> neaktivan
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. AŽURIRANJE POSTOJEĆIH ČLANOVA (adrese, mobiteli, zvanja)
-- ────────────────────────────────────────────────────────────

-- Ahmeti Borna — nova adresa, novi mobitel, zapovjednik
UPDATE clanovi SET
  ulica = 'Osječka nova', kucni_broj = '13',
  mobitel = '+385994446670'
WHERE prezime = 'Ahmeti' AND ime = 'Borna';

-- Ahmeti Igor — ažuriran mobitel
UPDATE clanovi SET
  mobitel = '+385993927896'
WHERE prezime = 'Ahmeti' AND ime = 'Igor';

-- Davidović Saša — novi mobitel
UPDATE clanovi SET
  mobitel = '+38598812278'
WHERE prezime = 'Davidović' AND ime = 'Saša';

-- Davidović Ivana — novi mobitel
UPDATE clanovi SET
  mobitel = '+385989083081'
WHERE prezime = 'Davidović' AND ime = 'Ivana';

-- Golić Andrija — ažurirana adresa (Dravska 35, ne 30), mobitel
UPDATE clanovi SET
  ulica = 'Dravska', kucni_broj = '35',
  mobitel = '+385993927891'
WHERE prezime = 'Golić' AND ime = 'Andrija';

-- Jošović Boris — ažurirana adresa, novi mobitel
UPDATE clanovi SET
  ulica = 'Hrvatskih junaka', kucni_broj = '65',
  mobitel = '+385997438410'
WHERE prezime = 'Jošović' AND ime = 'Boris';

-- Jurkin Ivica — novi mobitel
UPDATE clanovi SET
  mobitel = '+385914588037'
WHERE prezime = 'Jurkin' AND ime = 'Ivica';

-- Jurkin Sandra — novi mobitel
UPDATE clanovi SET
  mobitel = '+385989598049'
WHERE prezime = 'Jurkin' AND ime = 'Sandra';

-- Korica Milenko — preselio u Osijek
UPDATE clanovi SET
  ulica = 'Vijenac Murse', kucni_broj = '2',
  mjesto = 'Osijek', postanski_broj = '31000',
  mobitel = '+385919507093'
WHERE prezime = 'Korica' AND ime = 'Milenko';

-- Kozarević Tatjana — preselila u Osijek, novi mobitel
UPDATE clanovi SET
  ulica = 'Dugog otoka', kucni_broj = '5',
  mjesto = 'Osijek', postanski_broj = '31000',
  mobitel = '+385953948964'
WHERE prezime = 'Kozarević' AND ime = 'Tatjana';

-- Lambreščak Biljana — ažuriran mobitel
UPDATE clanovi SET
  mobitel = '+385981855417'
WHERE prezime = 'Lambreščak' AND ime = 'Biljana';

-- Lončarić Martina — nova adresa
UPDATE clanovi SET
  ulica = 'Kolodvorska', kucni_broj = '38A',
  mobitel = '+385993927894'
WHERE prezime = 'Lončarić' AND ime = 'Martina';

-- Miljatović Dino — novi mobitel
UPDATE clanovi SET
  mobitel = '+385955659687'
WHERE prezime = 'Miljatović' AND ime = 'Dino';

-- Miljatović Milorad — novi mobitel
UPDATE clanovi SET
  mobitel = '+385977999591'
WHERE prezime = 'Miljatović' AND ime = 'Milorad';

-- Miljatović Tin — novi mobitel
UPDATE clanovi SET
  mobitel = '+385958536353'
WHERE prezime = 'Miljatović' AND ime = 'Tin';

-- Oreščanin Dominik — ažuriran mobitel (prezime u matičnom: Oreščanin)
UPDATE clanovi SET
  mobitel = '+385989406933'
WHERE prezime = 'Orešćanin' AND ime = 'Dominik';

-- Čeleda Josip — ažurirana adresa i mobitel
UPDATE clanovi SET
  ulica = 'Dravska', kucni_broj = '3',
  mobitel = '+385955035545'
WHERE prezime = 'Čeleda' AND ime = 'Josip';

-- Samardžić Ratko — ažuriran poštanski broj
UPDATE clanovi SET
  postanski_broj = '31204'
WHERE prezime = 'Samardžić' AND ime = 'Ratko';

-- Suhić Loreta — ažuriran mobitel
UPDATE clanovi SET
  mobitel = '+385955328201'
WHERE prezime = 'Suhić' AND ime = 'Loreta';

-- Špoljarić Dorijan/Dorian — ažuriran poštanski broj
UPDATE clanovi SET
  postanski_broj = '31204'
WHERE prezime = 'Špoljarić' AND ime = 'Dorijan';

-- Tramičak/Tramišak Arijana — ispravka prezimena i adrese
UPDATE clanovi SET
  prezime = 'Tramišak',
  ulica = 'Kolodvorska', kucni_broj = '10',
  postanski_broj = '31204',
  mobitel = '+385953848266'
WHERE prezime = 'Tramičak' AND ime = 'Arijana';

-- Vadoci Atila — ažuriran mobitel
UPDATE clanovi SET
  mobitel = '+385953996265'
WHERE prezime = 'Vadoci' AND ime = 'Atila';

-- Vadoci Milena — ažuriran mobitel
UPDATE clanovi SET
  mobitel = '+385996920901'
WHERE prezime = 'Vadoci' AND ime = 'Milena';

-- Vuleta Pero — ažuriran poštanski broj i mobitel
UPDATE clanovi SET
  postanski_broj = '31204',
  mobitel = '+3859152969693'
WHERE prezime = 'Vuleta' AND ime = 'Pero';

-- Živković Martina — nova adresa i mobitel
UPDATE clanovi SET
  ulica = 'Ljudevita Gaja', kucni_broj = '43',
  postanski_broj = '31204',
  mobitel = '+385989327667'
WHERE prezime = 'Živković' AND ime = 'Martina';

-- Živković Mihael — ažurirana adresa i mobitel
UPDATE clanovi SET
  ulica = 'M. P. Miškine', kucni_broj = '54',
  mobitel = '+385995306249'
WHERE prezime = 'Živković' AND ime = 'Mihael';

-- ────────────────────────────────────────────────────────────
-- 2. NOVI ČLANOVI (iz matičnog lista, nisu bili u Članstvo.xlsx)
-- ────────────────────────────────────────────────────────────

INSERT INTO clanovi (prezime, ime, oib, ulica, kucni_broj, mjesto, postanski_broj, mobitel, kategorija, status, datum_uclanivanja) VALUES
('Ahmeti', 'Leona', 'TEMP-00101', 'Riječka', '12', 'Sarvaš', '31204', '+385994489558', 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Bubalo', 'Ivana', 'TEMP-00102', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Čeleda', 'Leon', 'TEMP-00103', 'Dravska', '3', 'Sarvaš', '31204', '+385955035545', 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Davidović', 'Ante', 'TEMP-00104', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Fištrović', 'Dino', 'TEMP-00105', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Fot', 'Fran', 'TEMP-00106', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Fot', 'Iva', 'TEMP-00107', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Gernhardt', 'Tin', 'TEMP-00108', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Grabić', 'Antonija', 'TEMP-00109', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Grabić', 'Mate', 'TEMP-00110', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Grabovac', 'Damjan', 'TEMP-00111', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Horvat', 'Petra', 'TEMP-00112', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Ivčić', 'Luka', 'TEMP-00113', 'Ljudevita Gaja', '37', 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Jeger', 'Zlatko', 'TEMP-00114', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Jeger', 'Marijan', 'TEMP-00115', 'Osječka nova', '5', 'Sarvaš', '31000', '+385976941190', 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Jurkin', 'Zvonimir', 'TEMP-00116', 'V. Celestina', '43B', 'Sarvaš', '31204', '+385993275077', 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Kimer', 'Gabriel', 'TEMP-00117', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Kočka', 'Fran', 'TEMP-00118', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Krklec', 'Klara', 'TEMP-00119', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Krstin', 'Karmela', 'TEMP-00120', 'Ivana Mažuranića', '36', 'Sarvaš', '31204', '+385997243439', 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Lambreščak', 'Ana', 'TEMP-00121', 'Dravska', '5', 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Lončarić', 'Leonardo', 'TEMP-00122', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Lončarić', 'Patrick', 'TEMP-00123', 'Kolodvorska', '38A', 'Sarvaš', '31204', '+385953649380', 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Lučenčić', 'Lucija', 'TEMP-00124', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Lučenčić', 'Luka', 'TEMP-00125', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Martinković', 'Domagoj', 'TEMP-00126', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Mihaljević', 'Aria', 'TEMP-00127', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Mihaljević', 'Silvija', 'TEMP-00128', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Mihaljević', 'Tinea', 'TEMP-00129', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Miljatović', 'Ema', 'TEMP-00130', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Miljatović', 'Maria', 'TEMP-00131', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Mišić', 'Dominik', 'TEMP-00132', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Mišić', 'Marin', 'TEMP-00133', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Mitrović', 'Stefano', 'TEMP-00134', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Nađ', 'Dominik', 'TEMP-00135', 'Ivana Mažuranića', '25', 'Sarvaš', '31000', '+385993270114', 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Nađ', 'Lana', 'TEMP-00136', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Nikolić', 'Dorijan', 'TEMP-00137', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Pilanović', 'Antun', 'TEMP-00138', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Pokos', 'Rafaela', 'TEMP-00139', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Popović', 'Luka', 'TEMP-00140', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Radetić', 'Marko', 'TEMP-00141', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Samardžić', 'Sandro', 'TEMP-00142', 'Dravska', '14', 'Sarvaš', '31204', '+385977283889', 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Samardžić', 'Teo', 'TEMP-00143', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Slatki', 'Lucija', 'TEMP-00144', 'V. Celestina', '53', 'Sarvaš', '31000', '+385976558788', 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Slatki', 'Zvonimir', 'TEMP-00145', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Vadoci', 'Karlo', 'TEMP-00146', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Vadoci', 'Petra', 'TEMP-00147', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Vlainić', 'Lucija', 'TEMP-00148', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Živković', 'Bruno', 'TEMP-00149', 'M. P. Miškine', '54', 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16'),
('Živković', 'Dino', 'TEMP-00150', NULL, NULL, 'Sarvaš', '31204', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16');

-- ────────────────────────────────────────────────────────────
-- 3. ČLANOVI KOJI VIŠE NISU NA MATIČNOM LISTU -> neaktivan
--    (bili u Članstvo.xlsx ali nisu u matičnom listu 2026.)
-- ────────────────────────────────────────────────────────────

UPDATE clanovi SET status = 'neaktivan', datum_promjene_statusa = '2026-03-28'
WHERE (prezime, ime) IN (
  ('Božić', 'Dragica'),
  ('Ćurković', 'Zdenka'),
  ('Čoti', 'Željko'),
  ('Debić', 'Dražen'),
  ('Đurić', 'Neven'),
  ('Gernhardt', 'Anita'),
  ('Ivčić', 'Davor'),
  ('Ivčić', 'Goran'),
  ('Kordić', 'Ana Marija'),
  ('Kresonja', 'Mario'),
  ('Krstić', 'Matej'),
  ('Krstić', 'Petar'),
  ('Krstin', 'Marko'),
  ('Lambreščak', 'Josip'),
  ('Lambreščak', 'Kristina'),
  ('Lambreščak', 'Marko'),
  ('Lečko', 'Michaela'),
  ('Miljatović', 'Sara'),
  ('Paripović', 'Zoran'),
  ('Paripović', 'Savo'),
  ('Pavić', 'Sanda'),
  ('Pavić', 'Tomislav'),
  ('Rejo', 'Ante'),
  ('Tkalčić', 'Ivan'),
  ('Topić', 'Domagoj'),
  ('Trgo', 'Matej'),
  ('Trgo', 'Borna'),
  ('Manojlović', 'Mirta'),
  ('Udovičić', 'Slavko'),
  ('Glumac', 'Goran'),
  ('Martan', 'Edi'),
  ('Ružić', 'Marko'),
  ('Marković', 'Luka'),
  ('Bubalo', 'Dominik')
);

-- ────────────────────────────────────────────────────────────
-- NAPOMENE:
-- ────────────────────────────────────────────────────────────
-- 1. Matični list je službeni dokument HVZ-a od 28.03.2026.
-- 2. Novi članovi imaju TEMP-001XX OIB placeholder
-- 3. 34 člana iz Excela više nije na matičnom listu -> postavljeni na 'neaktivan'
-- 4. 50 novih članova dodano iz matičnog lista
-- 5. 25 postojećih članova ima ažurirane adrese/mobitele
-- 6. Ukupno nakon pokretanja: ~84 aktivnih članova
--
-- Organizacijski podaci DVD-a (za referencu):
--   OIB: 48874677674
--   Matični broj: 02794586
--   IBAN: 2360000-1102233720
--   Adresa: Ivana Mažuranića 31, 31000 Sarvaš
--   Nadređena: Vatrogasna zajednica Grada Osijeka
--   Datum osnivanja: 16.7.2011.
--
-- Vodstvo (iz relacija matičnog lista):
--   Predsjednik: Vadoci Atila
--   Predsjednik: Korica Milenko
--   Zapovjednik: Davidović Saša
--   Zapovjednik: Ahmeti Borna
--   Zamjenik predsjednika: Davidović Ivana
--   Blagajnik: Kozarević Tatjana
-- ============================================================
