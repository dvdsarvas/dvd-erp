-- ============================================================
-- SEED: Test podaci za DVD Sarvaš ERP
-- Zakonska izvješća, financijski plan, plan rada, sjednice
-- Pokrenuti NAKON svih migracija (001-005) i seed_clanovi
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ZAKONSKA IZVJEŠĆA 2025 i 2026
-- ────────────────────────────────────────────────────────────

DELETE FROM zakonska_izvjesca;

-- 2025 — većina predana
INSERT INTO zakonska_izvjesca (naziv, primatelj, vrsta, godina, rok, status, datum_predaje, napomena) VALUES
('Godišnji financijski izvještaj (NEPROF-06)', 'FINA', 'financijsko', 2025, '2025-03-01', 'predano', '2025-02-28', 'Obrazac Neprof-06 za 2024. godinu'),
('Bilješke uz financijsko izvješće', 'FINA', 'financijsko', 2025, '2025-03-01', 'predano', '2025-02-28', NULL),
('Polugodišnji financijski izvještaj', 'FINA', 'financijsko', 2025, '2025-07-31', 'predano', '2025-07-15', 'Obrazac Neprof-06 za I-VI 2025.'),
('Izvješće o radu za 2024.', 'Skupština DVD-a', 'izvjestaj_o_radu', 2025, '2025-02-08', 'predano', '2025-02-08', 'Prezentirano na skupštini 08.02.2025.'),
('Zapisnik skupštine → Ured državne uprave OBŽ', 'Ured državne uprave OBŽ', 'zapisnik', 2025, '2025-04-08', 'predano', '2025-03-15', 'Rok: 60 dana od skupštine'),
('Upis promjena u Registar udruga', 'Ured državne uprave OBŽ', 'registar', 2025, '2025-04-08', 'predano', '2025-03-20', 'Nakon izbora na skupštini'),
('Potvrda o financijskom izvješću (SI potvrda)', 'FINA', 'financijsko', 2025, '2025-06-30', 'predano', '2025-06-15', 'SI_Potvrda_2025-6_MB_2794586.pdf'),
('Godišnja samoocjena sustava fin. upravljanja', 'Skupština DVD-a', 'financijsko', 2025, '2025-12-31', 'predano', '2025-12-21', 'Upitnik samoocjene, usvojeno na skupštini 21.12.2024.');

-- 2026 — u tijeku
INSERT INTO zakonska_izvjesca (naziv, primatelj, vrsta, godina, rok, status, napomena) VALUES
('Godišnji financijski izvještaj (NEPROF-06)', 'FINA', 'financijsko', 2026, '2026-03-01', 'nije_predano', 'Obrazac Neprof-06 za 2025. godinu'),
('Bilješke uz financijsko izvješće', 'FINA', 'financijsko', 2026, '2026-03-01', 'u_pripremi', NULL),
('Izvješće o radu za 2025.', 'Skupština DVD-a', 'izvjestaj_o_radu', 2026, '2026-02-20', 'predano', 'Prezentirano na skupštini 20.02.2026.'),
('Zapisnik skupštine → Ured državne uprave OBŽ', 'Ured državne uprave OBŽ', 'zapisnik', 2026, '2026-04-20', 'nije_predano', 'Rok: 60 dana od skupštine 20.02.2026.'),
('Upis promjena u Registar udruga', 'Ured državne uprave OBŽ', 'registar', 2026, '2026-04-20', 'nije_predano', 'Nakon izbora na skupštini'),
('Polugodišnji financijski izvještaj', 'FINA', 'financijsko', 2026, '2026-07-31', 'nije_predano', 'Obrazac Neprof-06 za I-VI 2026.'),
('Potvrda o financijskom izvješću (SI potvrda)', 'FINA', 'financijsko', 2026, '2026-06-30', 'nije_predano', NULL),
('Izvješće zapovjednika za JLS i VZ', 'Grad Osijek / VZ Osijek', 'izvjestaj_o_radu', 2026, '2026-06-30', 'nije_predano', 'Čl. 39 Zakona o vatrogastvu — rok 30.06.'),
('Godišnja samoocjena sustava fin. upravljanja', 'Skupština DVD-a', 'financijsko', 2026, '2026-12-31', 'nije_predano', NULL);

-- ────────────────────────────────────────────────────────────
-- 2. FINANCIJSKI PLAN 2025 (s realizacijom H1)
-- ────────────────────────────────────────────────────────────

DELETE FROM financijski_plan_stavke;
DELETE FROM financijski_planovi;

INSERT INTO financijski_planovi (godina, status, verzija, datum_usvajanja, napomena)
VALUES (2025, 'usvojen', '1.0', '2024-12-21', 'Usvojen na skupštini 21.12.2024.');

-- Dohvati ID plana za INSERT stavki
-- (koristimo subquery jer ne znamo UUID)

INSERT INTO financijski_plan_stavke (plan_id, naziv_stavke, kategorija, racunski_plan_konto, redni_broj, iznos_plan, iznos_ostvareno) VALUES
-- PRIHODI
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Prihodi iz gradskog proračuna (putem VZ Osijek)', 'prihod', '33110', 1, 46456.07, 31195.60),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Prihodi od ostalih izvora', 'prihod', '33111', 2, 0, 0),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Prihodi od imovine', 'prihod', '34', 3, 0, 1.35),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Prihodi od donacija', 'prihod', '35', 4, 0, 0),
-- RASHODI
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Službena putovanja (dnevnice)', 'rashod', '4222', 10, 1990.97, 1619.44),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Stručno usavršavanje', 'rashod', '4213', 12, 1327.32, 70.34),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Usluge telefona, pošte, prijevoza', 'rashod', '4251', 15, 3185.56, 2111.42),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Tekuće održavanje', 'rashod', '4252', 16, 5508.36, 8915.06),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Usluge promocije i informiranja', 'rashod', '4253', 17, 39.82, 0),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Komunalne usluge', 'rashod', '4254', 18, 424.74, 208.73),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Zdravstvene usluge', 'rashod', '4256', 19, 398.19, 524.25),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Intelektualne usluge (računovodstvo)', 'rashod', '4257', 20, 1221.13, 700.00),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Ostale usluge', 'rashod', '4259', 21, 889.30, 619.75),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Uredski materijal', 'rashod', '4261', 25, 1327.32, 827.12),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Energija (gorivo, struja, plin)', 'rashod', '4263', 26, 5375.63, 3383.74),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Sitan inventar i auto gume', 'rashod', '4264', 27, 5309.26, 310.00),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Premije osiguranja', 'rashod', '4291', 30, 663.66, 0),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Reprezentacija', 'rashod', '4292', 31, 6238.39, 150.98),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Kotizacije i pristojbe', 'rashod', '4294', 32, 265.46, 0),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Amortizacija', 'rashod', '43', 35, 5972.92, 0),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Usluge platnog prometa', 'rashod', '4431', 40, 199.10, 0),
((SELECT id FROM financijski_planovi WHERE godina=2025 LIMIT 1), 'Ostali financijski rashodi', 'rashod', '4434', 41, 132.73, 0);

-- ────────────────────────────────────────────────────────────
-- 3. PLAN RADA 2025 (23 aktivnosti)
-- ────────────────────────────────────────────────────────────

DELETE FROM aktivnosti_plan_rada WHERE godina = 2025;

INSERT INTO aktivnosti_plan_rada (naziv, kategorija, godina, status, rok, rok_datum, odgovoran, napomena) VALUES
('Protupožarna prevencija i gašenje požara', 'vatrogasne aktivnosti', 2025, 'zavrseno', '2025', NULL, 'Zapovjednik', '9 intervencija, 116 radnih sati'),
('Provedba posebnih mjera zaštite od požara RH', 'vatrogasne aktivnosti', 2025, 'zavrseno', '2025', NULL, 'Zapovjednik', NULL),
('Unapređenje operativnog rada (vježbe i edukacije)', 'osposobljavanje', 2025, 'zavrseno', '2025', NULL, 'Zapovjednik', NULL),
('Obilježavanje Dana Sv. Florijana - 4. svibnja', 'društvene aktivnosti', 2025, 'zavrseno', '2025-05', '2025-05-04', 'Predsjednik', 'Prikaz opreme i pokazna vježba podmlatka'),
('Protupožarna promidžba - Mjesec zaštite od požara', 'vatrogasne aktivnosti', 2025, 'zavrseno', '2025-05', '2025-05-31', 'Predsjednik', NULL),
('Pojačane mjere za turističku sezonu', 'vatrogasne aktivnosti', 2025, 'zavrseno', '2025-06', '2025-09-30', 'Zapovjednik', '2 dežurstva, 19 vatrogasaca'),
('Održavanje imovine i nabava opreme', 'održavanje opreme', 2025, 'u_tijeku', '2025', NULL, 'Predsjednik', 'Dennis vatrogasno vozilo nabavljeno'),
('Sudjelovanje na obljetnicama DVD-ova', 'društvene aktivnosti', 2025, 'zavrseno', '2025', NULL, 'Predsjednik', NULL),
('Organizacija vatrogasnih druženja', 'društvene aktivnosti', 2025, 'zavrseno', '2025', NULL, 'Predsjednik', 'Ribički kotlić i Ivanjski krijes'),
('Održavanje zborova članova', 'skupštine i sjednice', 2025, 'zavrseno', '2025', NULL, 'Tajnik', 'Skupština 08.02. + Skupština 21.12.'),
('Edukacija u školama i vrtićima', 'osposobljavanje', 2025, 'zavrseno', '2025-01', '2025-01-30', 'Zapovjednik', 'Podružna škola i vrtić RIBICA'),
('Formiranje natjecateljskih ekipa (A i B)', 'natjecanja', 2025, 'zavrseno', '2025-03', '2025-03-31', 'Zapovjednik', 'Muška i ženska ekipa'),
('Obuka podmlatka (12-16 god)', 'osposobljavanje', 2025, 'u_tijeku', '2025', NULL, 'Zapovjednik', NULL),
('Obuka vatrogasne mladeži (16+)', 'osposobljavanje', 2025, 'u_tijeku', '2025', NULL, 'Zapovjednik', NULL),
('Priprema za gradsko/županijsko natjecanje', 'natjecanja', 2025, 'zavrseno', '2025-04', '2025-04-30', 'Zapovjednik', NULL),
('Sudjelovanje na natjecanjima', 'natjecanja', 2025, 'zavrseno', '2025-05', '2025-05-31', 'Zapovjednik', NULL),
('Sudjelovanje na turnirima (3-kup JESSEKER)', 'natjecanja', 2025, 'zavrseno', '2025', NULL, 'Zapovjednik', 'Podmladak 2. mjesto'),
('Edukativna vježba s cjelokupnim članstvom', 'vatrogasne vježbe', 2025, 'zavrseno', '2025-06', '2025-06-10', 'Zapovjednik', 'Testiranje brzine reakcije'),
('Zajednička vježba s JPVP Osijek', 'vatrogasne vježbe', 2025, 'planirano', '2025-10', '2025-10-31', 'Zapovjednik', NULL),
('Javna pokazna vježba', 'vatrogasne vježbe', 2025, 'zavrseno', '2025-05', '2025-05-04', 'Zapovjednik', 'Uz Dan Sv. Florijana'),
('Druženje podmlatka nakon ljeta', 'društvene aktivnosti', 2025, 'zavrseno', '2025-09', '2025-09-30', 'Predsjednik', NULL),
('Vatrogasni kamp za podmladak', 'društvene aktivnosti', 2025, 'zavrseno', '2025-07', '2025-07-31', 'Predsjednik', NULL),
('Redoviti tjedni sastanci operativnih članova', 'administrativno', 2025, 'u_tijeku', '2025', NULL, 'Zapovjednik', 'Petkom u 19:00 sati');

-- ────────────────────────────────────────────────────────────
-- 4. SJEDNICA — Skupština 08.02.2025.
-- ────────────────────────────────────────────────────────────

INSERT INTO sjednice (vrsta, naziv, datum, sat_pocetka, sat_zavrsetka, mjesto, status, urbroj, prisutno_clanova, ukupno_clanova, kvorum_postignut, napomena)
VALUES ('skupstina_redovna', '14. izvještajna sjednica Skupštine DVD-a Sarvaš', '2025-02-08', '18:00', '19:00', 'Lovački dom Jelen, Dravska 76, Sarvaš', 'zapisnik_potpisan', 'SARV-2025-S/001', 28, 41, true, 'Izvještajna skupština za 2024. godinu');

-- Točke dnevnog reda za tu skupštinu
INSERT INTO tocke_dnevnog_reda (sjednica_id, redni_broj, naziv, vrsta, zakljucak, glasovi_za, glasovi_protiv, glasovi_uzdrzani, usvojena) VALUES
((SELECT id FROM sjednice WHERE datum='2025-02-08' AND vrsta='skupstina_redovna' LIMIT 1), 1, 'OTVARANJE SKUPŠTINE', 'razno', 'Predsjednik Vadoci pozdravio nazočne i zahvalio se na odazivu.', NULL, NULL, NULL, NULL),
((SELECT id FROM sjednice WHERE datum='2025-02-08' AND vrsta='skupstina_redovna' LIMIT 1), 2, 'IZBOR RADNIH TIJELA', 'izbori', 'Radno voditeljstvo: Vadoci, Samardžić, Davidović. Zapisničar: Ahmeti Borna. Ovjerovitelji: Živković, Golić. Verifikacijska komisija: Pic, Miljatović, Lončarić.', 28, 0, 0, true),
((SELECT id FROM sjednice WHERE datum='2025-02-08' AND vrsta='skupstina_redovna' LIMIT 1), 3, 'PODNOŠENJE IZVJEŠĆA VERIFIKACIJSKE KOMISIJE', 'izvjesce', 'Prisutno 28 od 41 člana s pravom glasa. Kvorum postignut.', NULL, NULL, NULL, NULL),
((SELECT id FROM sjednice WHERE datum='2025-02-08' AND vrsta='skupstina_redovna' LIMIT 1), 4, 'IZVJEŠĆE O RADU DRUŠTVA ZA 2024. GODINU', 'izvjesce', 'Borna Ahmeti pročitao izvješće o radu za 2024.', 28, 0, 0, true),
((SELECT id FROM sjednice WHERE datum='2025-02-08' AND vrsta='skupstina_redovna' LIMIT 1), 5, 'FINANCIJSKO IZVJEŠĆE ZA 2024. GODINU', 'izvjesce', 'Blagajnica Tatjana Kozarević iznijela financijsko izvješće.', 28, 0, 0, true),
((SELECT id FROM sjednice WHERE datum='2025-02-08' AND vrsta='skupstina_redovna' LIMIT 1), 6, 'RASPRAVA I USVAJANJE IZVJEŠĆA I PLANOVA', 'odluka', 'Izvješća prihvaćena jednoglasno.', 28, 0, 0, true),
((SELECT id FROM sjednice WHERE datum='2025-02-08' AND vrsta='skupstina_redovna' LIMIT 1), 7, 'POZDRAVNA RIJEČ GOSTIJU', 'razno', 'Pozdravnu riječ dali: Zapovjednik VZ Osijek, predsjednica VZ Osijek, predstavnica grada Osijeka.', NULL, NULL, NULL, NULL),
((SELECT id FROM sjednice WHERE datum='2025-02-08' AND vrsta='skupstina_redovna' LIMIT 1), 8, 'RAZNO', 'razno', 'Pod točkom 8 nije bilo rasprave.', NULL, NULL, NULL, NULL);

-- ────────────────────────────────────────────────────────────
-- 5. SJEDNICA — Skupština 21.12.2024.
-- ────────────────────────────────────────────────────────────

INSERT INTO sjednice (vrsta, naziv, datum, sat_pocetka, sat_zavrsetka, mjesto, status, urbroj, prisutno_clanova, ukupno_clanova, kvorum_postignut, napomena)
VALUES ('skupstina_redovna', 'Skupština DVD-a Sarvaš — usvajanje plana i financijskog plana za 2025.', '2024-12-21', '18:00', '19:00', 'Sala MO, Osječka 64, Sarvaš', 'zapisnik_potpisan', 'SARV-2024-S/002', 39, 49, true, 'Usvajanje plana rada i financijskog plana za 2025.');

INSERT INTO tocke_dnevnog_reda (sjednica_id, redni_broj, naziv, vrsta, zakljucak, glasovi_za, glasovi_protiv, glasovi_uzdrzani, usvojena) VALUES
((SELECT id FROM sjednice WHERE datum='2024-12-21' LIMIT 1), 1, 'IZBOR RADNIH TIJELA', 'izbori', 'Voditeljstvo: Vadoci, Samardžić, Davidović Ivana. Zapisničar: Ahmeti Borna. Ovjerovitelji: Ahmeti Igor, Kozarević Tatjana. Verif. komisija: Pic, Miljatović, Lončarić.', 39, 0, 0, true),
((SELECT id FROM sjednice WHERE datum='2024-12-21' LIMIT 1), 2, 'IZVJEŠĆE VERIFIKACIJSKE KOMISIJE', 'izvjesce', 'Prisutno 39 od 49 članova. Kvorum postignut.', NULL, NULL, NULL, NULL),
((SELECT id FROM sjednice WHERE datum='2024-12-21' LIMIT 1), 3, 'SAMOOCJENA SUSTAVA FINANCIJSKOG UPRAVLJANJA', 'izvjesce', 'Upitnik samoocjene za 2024. usvojen.', 39, 0, 0, true),
((SELECT id FROM sjednice WHERE datum='2024-12-21' LIMIT 1), 4, 'USVAJANJE FINANCIJSKOG PLANA I PLANA RADA ZA 2025.', 'plan', 'Financijski plan i plan rada za 2025. godinu usvojeni jednoglasno.', 39, 0, 0, true),
((SELECT id FROM sjednice WHERE datum='2024-12-21' LIMIT 1), 5, 'RAZNO', 'razno', 'Bez rasprave.', NULL, NULL, NULL, NULL);

-- ============================================================
-- NAPOMENE:
-- 1. Financijski podaci su iz stvarnih dokumenata DVD Sarvaš
--    (NEPROF-06 2024, Financijski plan 2025, Izvješće o radu 2024)
-- 2. Plan rada 2025 je iz stvarnog dokumenta (23 aktivnosti)
-- 3. Skupština 08.02.2025 — podaci iz Zapisnika sa skupštine
-- 4. Skupština 21.12.2024 — podaci iz Zapisnika (plan+fin.plan)
-- 5. Zakonska izvješća 2025 su označena kao predana
-- 6. Zakonska izvješća 2026 su u tijeku (za testiranje semafora)
-- ============================================================
