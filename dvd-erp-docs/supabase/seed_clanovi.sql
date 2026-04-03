-- ============================================================
-- SEED: Članovi DVD Sarvaš
-- Izvor: Članstvo.xlsx (sheet NOVO - REDOVNI ČLANOVI)
-- Napomena: ulica i kucni_broj razdvojeni, OIB samo gdje postoji
-- Svi su kategorija 'dobrovoljni_vatrogasac', status 'aktivan'
-- Zadnjih 6 redaka (62-67) imaju samo ime/prezime/adresu
-- ============================================================

INSERT INTO clanovi (prezime, ime, oib, datum_rodenja, ulica, kucni_broj, mjesto, postanski_broj, mobitel, email, kategorija, status, datum_uclanivanja, vatrogasno_zvanje, ime_oca, jmbg, skolska_sprema, vozacka_dozvola, broj_knjizice)
VALUES
-- Napomena: tablica clanovi nema stupce ime_oca, jmbg, skolska_sprema, vozacka_dozvola, broj_knjizice
-- Koristimo samo postojeće stupce iz baze
;

-- Čistimo i unosimo samo s postojećim stupcima
DELETE FROM clanovi;

INSERT INTO clanovi (prezime, ime, oib, datum_rodenja, ulica, kucni_broj, mjesto, postanski_broj, mobitel, email, kategorija, status, datum_uclanivanja, vatrogasno_zvanje) VALUES
('Ahmeti', 'Igor', '95856591540', '1975-09-08', 'Riječka', '35', 'Sarvaš', '31207', '0919736951', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', 'vatrogasac'),
('Ahmeti', 'Borna', 'TEMP-00002', '2000-10-03', 'Riječka', '35', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Andrašek', 'Maja', '99064180355', '1986-08-23', 'Ljudevita Gaja', '29', 'Sarvaš', '31207', '0977932161', 'majaandrasek@gmail.com', 'dobrovoljni_vatrogasac', 'aktivan', '2011-11-02', 'časnik'),
('Bubalo', 'Dominik', 'TEMP-00004', '1999-05-02', 'V. Celestina', '54', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Božić', 'Dragica', 'TEMP-00005', NULL, 'Dravska', '21', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Ćurković', 'Zdenka', '191441198241', '1959-11-14', 'Dravska', '74', 'Sarvaš', '31207', '0919026375', 'zdenka.curkovic@os.t-com.hr', 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Čoti', 'Željko', 'TEMP-00007', '1959-01-02', 'I. Mažuranića', '14', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Davidović', 'Saša', 'TEMP-00008', '1978-04-19', 'Riječka', '47', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Davidović', 'Ivana', 'TEMP-00009', '1982-05-25', 'Riječka', '47', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Debić', 'Dražen', 'TEMP-00010', '1967-01-01', 'Dravska', '7A', 'Sarvaš', '31207', '977514471', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Đurić', 'Neven', 'TEMP-00011', '1990-08-06', 'Riječka', '39', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Gernhardt', 'Anita', 'TEMP-00012', '1987-01-14', 'Nikole Tesle', '1', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Golić', 'Andrija', '27686749514', '1962-11-30', 'Dravska', '30', 'Sarvaš', '31207', '98682506', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Ivčić', 'Davor', '48217988567', '1977-08-30', 'Ljudevita Gaja', '37', 'Sarvaš', '31207', '0951999376', 'davor.ivcic@gmail.com', 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', 'viši vatrogasni časnik'),
('Ivčić', 'Goran', 'TEMP-00015', '1999-07-19', 'Ljudevita Gaja', '37', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Jošović', 'Boris', 'TEMP-00016', '1987-05-31', 'Hrvatskih junaka', '41', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Jurkin', 'Ivica', '35521637080', '1967-06-05', 'V. Celestina', '43B', 'Sarvaš', '31207', '588393', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', 'vatrogasac'),
('Jurkin', 'Sandra', '72822883415', '1970-01-05', 'V. Celestina', '43B', 'Sarvaš', '31207', '588393', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2013-03-29', 'vatrogasac'),
('Kordić', 'Ana Marija', 'TEMP-00019', '1999-02-25', 'Kolodvorska', '8', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Korica', 'Milenko', '70010941382', '1991-07-23', 'Osječka', '32', 'Sarvaš', '31207', '0919507093', 'mile91@gmail.com', 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', 'vatrogasac 1. klase'),
('Kozarević', 'Tatjana', 'TEMP-00021', '1987-10-16', 'Dugog otoka', '7', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Kresonja', 'Mario', '11501921623', '1985-09-02', 'Lovre Matačića', '14', 'Sarvaš', '31207', '0989067820', 'kresonjamario@gmail.com', 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', 'vatrogasac 1. klase'),
('Krstić', 'Matej', '39337011573', '1993-02-13', 'M. Gupca', '17', 'Josipovac', '31215', '098842682', 'matej0krstic@gmail.com', 'dobrovoljni_vatrogasac', 'aktivan', '2014-04-12', 'vatrogasac'),
('Krstić', 'Petar', 'TEMP-00024', '1962-03-10', NULL, NULL, 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Krstin', 'Marko', 'TEMP-00025', '1997-03-06', NULL, NULL, 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Lambreščak', 'Biljana', '67012378246', '1973-11-10', 'Dravska', '5', 'Sarvaš', '31207', '0981855417', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2013-03-29', NULL),
('Lambreščak', 'Josip', 'TEMP-00027', '1960-09-27', 'Dravska', '5', 'Sarvaš', '31207', '0989808342', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Lambreščak', 'Kristina', '17902765988', '1997-05-06', 'Dravska', '5', 'Sarvaš', '31207', '0994003864', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2013-03-29', NULL),
('Lambreščak', 'Marko', 'TEMP-00029', '1999-06-18', 'Dravska', '5', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Lečko', 'Michaela', 'TEMP-00030', '1992-01-01', NULL, NULL, 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Lončarić', 'Martina', '26377750929', '1981-06-22', 'Dravska', '20A', 'Sarvaš', '31207', '958235666', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', 'vatrogasac 1. klase'),
('Mihaljević', 'Ivica', 'TEMP-00032', '1990-09-15', 'V. Celestina', '15', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Milanković', 'Mario', 'TEMP-00033', '1981-12-08', NULL, NULL, 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Miljatović', 'Dino', 'TEMP-00034', '1999-09-22', 'Dravska', '17', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Miljatović', 'Milorad', 'TEMP-00035', '1990-01-15', 'Dravska', '48', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Miljatović', 'Tin', 'TEMP-00036', '1997-09-22', 'Dravska', '48', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Miljatović', 'Sara', 'TEMP-00037', '1996-09-22', 'Dravska', '17', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Orešćanin', 'Dominik', '69885488522', '1992-07-18', 'Osječka', '23', 'Sarvaš', '31207', '0913396975', 'domac9264@gmail.com', 'dobrovoljni_vatrogasac', 'aktivan', '2014-04-12', 'vatrogasac'),
('Paripović', 'Darko', '56617405475', '1991-11-25', 'Osječka', '3', 'Sarvaš', '31207', '0914244509', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Paripović', 'Zoran', '21432830377', '1993-10-05', 'Osječka', '3', 'Sarvaš', '31207', '0919422193', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', 'vatrogasac 1. klase'),
('Paripović', 'Savo', 'TEMP-00041', '1960-01-01', 'Osječka', '3', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Pic', 'Dario', 'TEMP-00042', '1997-07-23', 'Dravska', '5A', 'Sarvaš', '31207', '588005', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Pic', 'Josip', 'TEMP-00043', '1960-03-20', 'Dravska', '5A', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Pavić', 'Sanda', 'TEMP-00044', '1978-01-01', 'Riječka', '36', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Pavić', 'Tomislav', 'TEMP-00045', '1975-01-01', 'Riječka', '36', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Rejo', 'Ante', 'TEMP-00046', '1941-08-01', 'Kolodvorska', '54', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Samardžić', 'Ratko', '04615902012', '1985-01-17', 'Dravska', '14', 'Sarvaš', '31207', '0955859837', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', 'vatrogasac'),
('Suhić', 'Loreta', '65182712148', '1993-10-21', 'Osječka', '48A', 'Sarvaš', '31207', '0955328201', 'loretasuhic93@gmail.com', 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', 'vatrogasac 1. klase'),
('Tkalčić', 'Ivan', 'TEMP-00049', '1993-05-15', NULL, NULL, 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Topić', 'Domagoj', 'TEMP-00050', '1998-02-13', 'Kolodvorska', '14', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Trgo', 'Matej', 'TEMP-00051', '1991-05-25', 'Kolodvorska', '14', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Trgo', 'Borna', 'TEMP-00052', '1998-02-04', 'Kolodvorska', '14', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Manojlović', 'Mirta', 'TEMP-00053', NULL, NULL, NULL, 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Tramičak', 'Arijana', 'TEMP-00054', '1997-12-04', 'Kolodvorska', '14', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Udovičić', 'Slavko', 'TEMP-00055', '1961-08-14', 'V. Celestina', '22', 'Sarvaš', '31207', '588306', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Uglješić', 'Milan', 'TEMP-00056', '1985-03-03', 'Osječka', '79', 'Sarvaš', '31207', '98506361', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Vadoci', 'Atila', 'TEMP-00057', '1984-09-15', 'Kolodvorska', '58', 'Sarvaš', '31207', '953996265', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', 'vatrogasac 1. klase'),
('Vadoci', 'Milena', 'TEMP-00058', '1985-08-12', 'Kolodvorska', '58', 'Sarvaš', '31207', '996920901', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Vidmar', 'Josip', '52563979809', '1992-04-28', 'V. Celestina', '9', 'Sarvaš', '31207', '0958295475', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2012-08-17', 'vatrogasac 1. klase'),
('Vuleta', 'Pero', 'TEMP-00060', '1971-11-12', 'I. Mažuranića', '6', 'Sarvaš', '31207', '09152969693', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Živković', 'Martina', 'TEMP-00061', '1983-03-16', 'M. P. Miškine', '54', 'Sarvaš', '31207', '588369', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Živković', 'Mihael', '27185284145', '1980-12-24', 'M. P. Miškine', '54', 'Sarvaš', '31207', '588369', NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', 'vatrogasac 1. klase'),
('Glumac', 'Goran', 'TEMP-00063', NULL, 'Osječka', NULL, 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Martan', 'Edi', 'TEMP-00064', NULL, 'Kolodvorska', '42A', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Čeleda', 'Josip', 'TEMP-00065', NULL, 'Dravska', NULL, 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Špoljarić', 'Dorijan', 'TEMP-00066', NULL, 'Dravska', '7', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Ružić', 'Marko', 'TEMP-00067', NULL, 'M. P. Miškine', '19', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL),
('Marković', 'Luka', 'TEMP-00068', NULL, 'Riječka', '47', 'Sarvaš', '31207', NULL, NULL, 'dobrovoljni_vatrogasac', 'aktivan', '2011-07-16', NULL);

-- ============================================================
-- NAPOMENE:
-- 1. Članovi kojima OIB nije naveden u Excelu imaju TEMP-XXXXX placeholder
--    Te OIB-ove treba zamijeniti stvarnim kad se prikupe
-- 2. Svi su uneseni kao 'dobrovoljni_vatrogasac' i 'aktivan'
-- 3. Mjesto je pretpostavljeno 'Sarvaš', poštanski broj '31207'
--    (osim Krstić Matej koji je iz Josipovca)
-- 4. datum_uclanivanja je uzet iz stupca ČLAN OD gdje postoji,
--    inače postavljen na 16.07.2011. (datum osnivanja/reorganizacije)
-- 5. Vatrogasna zvanja su normalizirana na male tipke:
--    vatrogasac, vatrogasac 1. klase, časnik, viši vatrogasni časnik
-- 6. Redovi 62-67 iz Excela imali su prezime/ime zamijenjene — ispravljeno
-- ============================================================
