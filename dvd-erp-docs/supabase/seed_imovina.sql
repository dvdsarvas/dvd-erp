-- ============================================================
-- SEED: Imovina DVD Sarvaš
-- Izvor: Matični list HVZ od 28.03.2026. (str. 5-7)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- VOZILA (4 komada)
-- ────────────────────────────────────────────────────────────

INSERT INTO imovina (naziv, vrsta, marka, model, reg_oznaka, status, lokacija, opis) VALUES
('Vatrogasno vozilo za gašenje požara — Steyr', 'vozilo', 'Steyr', 'Kamion', 'OS967MD', 'u_uporabi', 'DVD Sarvaš, I. Mažuranića 31', 'Vatrogasno vozilo za gašenje požara'),
('Zapovjedno vozilo — Kia', 'vozilo', 'Kia', 'Carens', 'OS774OK', 'u_uporabi', 'DVD Sarvaš, I. Mažuranića 31', 'Zapovjedno vozilo'),
('Vozilo za prijevoz vatrogasaca — VW', 'vozilo', 'Volkswagen', 'Transporter Shuttle', 'OS809FO', 'u_uporabi', 'DVD Sarvaš, I. Mažuranića 31', 'Vozilo za prijevoz vatrogasaca'),
('Vatrogasno vozilo za gašenje požara — Dennis', 'vozilo', 'Dennis', 'DENNIS', 'OS162PO', 'u_uporabi', 'DVD Sarvaš, I. Mažuranića 31', 'Vatrogasno vozilo za gašenje požara, nabavljeno 2024.');

-- ────────────────────────────────────────────────────────────
-- VATROGASNA OPREMA — cijevi, mlaznice, spojnice
-- ────────────────────────────────────────────────────────────

INSERT INTO imovina (naziv, vrsta, status, lokacija, opis) VALUES
-- Cijevi
('Usisna vatrogasna cijev B-75 mm', 'oprema', 'u_uporabi', 'Spremište DVD-a', 'Ostala dužina, promjer B-75 mm — 6 komada'),
('Usisna vatrogasna cijev A-110 mm', 'oprema', 'u_uporabi', 'Spremište DVD-a', 'Dužina 1,5 m, promjer A-110 mm — 4 komada'),
('Tlačna vatrogasna cijev B-75 mm', 'oprema', 'u_uporabi', 'Spremište DVD-a', 'Plosnata, dužina 20 m, promjer B-75 mm — 6 komada'),
('Tlačna vatrogasna cijev C-52 mm', 'oprema', 'u_uporabi', 'Spremište DVD-a', 'Plosnata, dužina 20 m, promjer C-52 mm — 11 komada'),

-- Aparati za gašenje
('Aparat za gašenje prahom', 'oprema', 'u_uporabi', 'Spremište DVD-a', '3 + 1 komad (ukupno 4)'),
('Aparat za gašenje ugljičnim dioksidom', 'oprema', 'u_uporabi', 'Spremište DVD-a', '1 komad'),

-- Pumpe i agregati
('Agregat za električnu struju', 'oprema', 'u_uporabi', 'Spremište DVD-a', '1 komad'),
('Motorna centrifugalna pumpa za ispumpavanje vode', 'oprema', 'u_uporabi', 'Spremište DVD-a', '1 komad'),
('Uranjajuća elektropumpa', 'oprema', 'u_uporabi', 'Spremište DVD-a', '1 komad'),

-- Hidrantski pribor
('Hidrantski nastavak 2C', 'oprema', 'u_uporabi', 'Spremište DVD-a', '1 komad'),
('Ključ za podzemni hidrant', 'oprema', 'u_uporabi', 'Spremište DVD-a', '1 komad'),

-- Mlaznice i spojnice
('Obična mlaznica B-75 mm', 'oprema', 'u_uporabi', 'Spremište DVD-a', '4 komada'),
('Obična mlaznica C-52 mm', 'oprema', 'u_uporabi', 'Spremište DVD-a', '4 komada'),
('Mlaznica sa slavinom C-52 mm', 'oprema', 'u_uporabi', 'Spremište DVD-a', '2 komada'),
('Ublaživač reakcije vodenog mlaza', 'oprema', 'u_uporabi', 'Spremište DVD-a', '2 komada'),
('Prijelazna spojnica B-75 / C-52 mm', 'oprema', 'u_uporabi', 'Spremište DVD-a', '2 komada'),
('Prijelazna spojnica A-110 / B-75 mm', 'oprema', 'u_uporabi', 'Spremište DVD-a', '1 komad'),
('Trodjelna razdjelnica', 'oprema', 'u_uporabi', 'Spremište DVD-a', '2 komada'),
('Sabirnica', 'oprema', 'u_uporabi', 'Spremište DVD-a', '2 komada'),
('Cijevna povezica', 'oprema', 'u_uporabi', 'Spremište DVD-a', '3 komada'),
('Usisna košara', 'oprema', 'u_uporabi', 'Spremište DVD-a', '3 komada'),

-- Alati
('Lopata', 'oprema', 'u_uporabi', 'Spremište DVD-a', '3 komada'),
('Šumska sjekira', 'oprema', 'u_uporabi', 'Spremište DVD-a', '3 komada'),
('Škare za željezo', 'oprema', 'u_uporabi', 'Spremište DVD-a', '1 komad'),
('Metalna poluga — montirač', 'oprema', 'u_uporabi', 'Spremište DVD-a', '1 komad'),
('Pijuk', 'oprema', 'u_uporabi', 'Spremište DVD-a', '1 komad'),
('Vile', 'oprema', 'u_uporabi', 'Spremište DVD-a', '1 komad'),
('Komplet za otvaranje vrata', 'oprema', 'u_uporabi', 'Spremište DVD-a', '1 komad'),
('Ljestva sastavljača', 'oprema', 'u_uporabi', 'Spremište DVD-a', '1 komad'),
('Penjačko uže', 'oprema', 'u_uporabi', 'Spremište DVD-a', '2 komada'),

-- Rasvjeta i elektronika
('Reflektor s diodama', 'oprema', 'u_uporabi', 'Spremište DVD-a', '1 komad'),
('Računala i računalna oprema', 'oprema', 'u_uporabi', 'Prostorije DVD-a', '2 komada'),

-- Sigurnosna oprema
('Izolacijski aparat sa stlačenim kisikom', 'oprema', 'u_uporabi', 'Spremište DVD-a', '4 komada'),
('Kutija prve pomoći', 'oprema', 'u_uporabi', 'Spremište DVD-a', '2 komada');

-- ────────────────────────────────────────────────────────────
-- ZAŠTITNA OPREMA — odjeća, obuća, kacige
-- ────────────────────────────────────────────────────────────

INSERT INTO imovina (naziv, vrsta, status, lokacija, opis) VALUES
('Vatrogasni kombinezon za šumske požare (EN 15614)', 'oprema', 'u_uporabi', 'Garderoba DVD-a', '12 komada'),
('Vatrogasna zaštitna jakna (EN 469)', 'oprema', 'u_uporabi', 'Garderoba DVD-a', '19 komada'),
('Vatrogasne zaštitne hlače', 'oprema', 'u_uporabi', 'Garderoba DVD-a', '19 komada'),
('Vatrogasna zaštitna kaciga', 'oprema', 'u_uporabi', 'Garderoba DVD-a', '22 komada'),
('Vatrogasna zaštitna kaciga za šumske požare', 'oprema', 'u_uporabi', 'Garderoba DVD-a', '4 komada'),
('Vatrogasne zaštitne čizme', 'oprema', 'u_uporabi', 'Garderoba DVD-a', '5 komada'),
('Gumene niske čizme', 'oprema', 'u_uporabi', 'Garderoba DVD-a', '5 komada'),
('Zaštitni vatrogasni opasač TIP A', 'oprema', 'u_uporabi', 'Garderoba DVD-a', '7 komada'),
('Rukavice za zaštitu od topline', 'oprema', 'u_uporabi', 'Garderoba DVD-a', '5 komada'),
('Vatrogasna potkapa', 'oprema', 'u_uporabi', 'Garderoba DVD-a', '19 komada'),
('Zaštitno odijelo za prilaz vatri', 'oprema', 'u_uporabi', 'Garderoba DVD-a', '5 komada');

-- ============================================================
-- UKUPNO: 4 vozila + 45 stavki opreme = 49 stavki
-- Izvor: Matični list HVZ, str. 5-7 (Oprema + Vozila)
-- ============================================================
