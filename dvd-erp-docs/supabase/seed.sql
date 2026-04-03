-- ============================================================
-- DVD ERP — Seed: DVD Sarvaš
-- Pokrenuti NAKON migracija 001, 002, 003
-- ============================================================

-- ============================================================
-- ADMIN KORISNIK (ažurirati email!)
-- Supabase Auth korisnik mora biti kreiran zasebno u Dashboard-u
-- ili putem API-ja — ovdje samo unos u tablicu korisnici
-- ============================================================
-- INSERT INTO korisnici (email, ime, prezime, uloga)
-- VALUES ('predsjednik@dvd-sarvas.hr', 'Ime', 'Prezime', 'predsjednik');
--
-- Odkomentiraj i prilagodi nakon kreiranja Auth korisnika.

-- ============================================================
-- INICIJALNA ZAKONSKA IZVJEŠĆA (tekuća godina 2026.)
-- ============================================================
INSERT INTO zakonska_izvjesca (naziv, vrsta, godina, kvartal, primatelj, rok, status) VALUES
  ('Financijsko izvješće FINA Q1 2026', 'fina_kvartal', 2026, 1, 'FINA', '2026-04-30', 'nije_predano'),
  ('Financijsko izvješće FINA Q2 2026', 'fina_kvartal', 2026, 2, 'FINA', '2026-07-31', 'nije_predano'),
  ('Financijsko izvješće FINA Q3 2026', 'fina_kvartal', 2026, 3, 'FINA', '2026-10-31', 'nije_predano'),
  ('Financijsko izvješće FINA Q4 2025', 'fina_kvartal', 2025, 4, 'FINA', '2026-01-31', 'u_pripremi'),
  ('Godišnje financijsko izvješće 2025', 'fina_godisnje', 2025, NULL, 'FINA', '2026-02-28', 'u_pripremi'),
  ('Samoprocjena FUK 2025', 'ostalo', 2025, NULL, 'Predsjednik (interno)', '2026-02-28', 'u_pripremi'),
  ('Izvješće o radu skupštini 2025', 'skupstina_izvjesce', 2025, NULL, 'Skupština DVD-a', '2026-06-30', 'nije_predano'),
  ('Financijsko izvješće skupštini 2025', 'skupstina_izvjesce', 2025, NULL, 'Skupština DVD-a', '2026-06-30', 'nije_predano'),
  ('Plan rada 2026. (skupština)', 'skupstina_plan', 2025, NULL, 'Skupština DVD-a', '2025-12-31', 'nije_predano'),
  ('Financijski plan 2026. (skupština)', 'skupstina_plan', 2025, NULL, 'Skupština DVD-a', '2025-12-31', 'nije_predano'),
  ('Dostava zapisnika skupštine Uredu državne uprave OBŽ', 'registar_udruga', 2025, NULL, 'Ured državne uprave OBŽ', NULL, 'nije_predano'),
  ('Prijava promjena Registar udruga', 'registar_udruga', 2025, NULL, 'Ured državne uprave OBŽ', NULL, 'nije_predano'),
  ('Izvješće o potrošnji proračunskih sredstava JLS', 'jls', 2025, NULL, 'Općina Antunovac', '2026-01-31', 'u_pripremi');

-- ============================================================
-- INICIJALNI FINANCIJSKI PLAN 2026 (prazan, za popuniti)
-- ============================================================
INSERT INTO financijski_planovi (godina, verzija, status)
VALUES (2026, 'original', 'prijedlog');

-- Standardne stavke financijskog plana za DVD
-- Kategorije sukladno Računskom planu za NP organizacije
WITH plan AS (
  SELECT id FROM financijski_planovi WHERE godina = 2026 AND verzija = 'original'
)
INSERT INTO financijski_plan_stavke (plan_id, kategorija, naziv_stavke, iznos_plan, redni_broj)
SELECT plan.id, kategorija, naziv, iznos, rb
FROM plan, (VALUES
  -- PRIHODI
  ('prihod', 'Dotacija Općina Antunovac', 0, 1),
  ('prihod', 'Dotacija Vatrogasna zajednica OBŽ', 0, 2),
  ('prihod', 'Donacije pravnih osoba', 0, 3),
  ('prihod', 'Donacije fizičkih osoba', 0, 4),
  ('prihod', 'Članarine', 0, 5),
  ('prihod', 'Vlastiti prihodi (priredbe i sl.)', 0, 6),
  ('prihod', 'Ostali prihodi', 0, 7),
  -- RASHODI
  ('rashod', 'Osobna zaštitna oprema (OZS)', 0, 10),
  ('rashod', 'Vatrogasna oprema i alati', 0, 11),
  ('rashod', 'Gorivo za vozila', 0, 12),
  ('rashod', 'Servis i registracija vozila', 0, 13),
  ('rashod', 'Osiguranje vozila', 0, 14),
  ('rashod', 'Osposobljavanje i tečajevi', 0, 15),
  ('rashod', 'Zdravstveni pregledi vatrogasaca', 0, 16),
  ('rashod', 'Natjecanja i vatrogasni skupovi', 0, 17),
  ('rashod', 'Tekuće poslovanje (ured, pošta, telefon)', 0, 18),
  ('rashod', 'Reprezentacija i obilježavanje obljetnica', 0, 19),
  ('rashod', 'Ostali rashodi', 0, 20)
) AS v(kategorija, naziv, iznos, rb);

-- ============================================================
-- PRIMJERI AKTIVNOSTI PLANA RADA 2026 (koristiti kao predložak)
-- ============================================================
INSERT INTO aktivnosti_plan_rada (godina, kategorija, naziv, rok, odgovoran, status) VALUES
  (2026, 'upravljanje', 'Redovna godišnja skupština (izvješća za 2025.)', 'Lipanj 2026', 'Predsjednik', 'planirano'),
  (2026, 'upravljanje', 'Redovna skupština - usvajanje planova 2027.', 'Prosinac 2026', 'Predsjednik', 'planirano'),
  (2026, 'upravljanje', 'Sjednice Upravnog odbora (min. 6 u godini)', 'Kontinuirano', 'Predsjednik', 'planirano'),
  (2026, 'upravljanje', 'Sjednice Zapovjedništva (min. 4 u godini)', 'Kontinuirano', 'Zapovjednik', 'planirano'),
  (2026, 'vatrogasna', 'Godišnja vatrogasna vježba postrojbe', 'Lipanj 2026', 'Zapovjednik', 'planirano'),
  (2026, 'vatrogasna', 'Osposobljavanje novih vatrogasaca', 'Travanj 2026', 'Zapovjednik', 'planirano'),
  (2026, 'vatrogasna', 'Periodički zdravstveni pregledi vatrogasaca', 'Kolovoz 2026', 'Predsjednik', 'planirano'),
  (2026, 'vatrogasna', 'Sudjelovanje na vatrogasnim natjecanjima', 'Prema kalendaru VZ OBŽ', 'Zapovjednik', 'planirano'),
  (2026, 'opremanje', 'Preventivni pregled svih vozila', 'Veljača 2026', 'Zapovjednik', 'planirano'),
  (2026, 'opremanje', 'Obnova OZS opreme prema planu nabave', 'Prema planu nabave', 'Zapovjednik', 'planirano'),
  (2026, 'drustveno', 'Obilježavanje Dana zaštite od požara (4. 5.)', 'Svibanj 2026', 'Predsjednik', 'planirano'),
  (2026, 'drustveno', 'Obuka vatrogasnog podmlatka', 'Kontinuirano', 'Vodnik podmlatka', 'planirano'),
  (2026, 'projekti', 'Prijava na natječaje za sufinanciranje opreme', 'Prema objavi natječaja', 'Predsjednik', 'planirano');
