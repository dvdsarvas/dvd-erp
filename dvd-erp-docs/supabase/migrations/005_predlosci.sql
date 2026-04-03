-- ============================================================
-- MIGRACIJA 005: Predlošci za auto-generiranje
-- Plan rada i financijski plan koji se ponavljaju godišnje
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- PREDLOŠCI PLANA RADA
-- ────────────────────────────────────────────────────────────

CREATE TABLE predlosci_plan_rada (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv       TEXT NOT NULL,
  kategorija  TEXT NOT NULL,
  opis        TEXT,
  ponavljanje TEXT NOT NULL DEFAULT 'godisnje' CHECK (ponavljanje IN ('godisnje', 'mjesecno', 'jednokratno')),
  mjesec_rok  SMALLINT,  -- 1-12 ili NULL za cijelu godinu
  aktivan     BOOLEAN DEFAULT true,
  redni_broj  SMALLINT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE predlosci_plan_rada ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Svi čitaju predloške" ON predlosci_plan_rada FOR SELECT TO authenticated USING (true);
CREATE POLICY "Uprava uređuje predloške" ON predlosci_plan_rada FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik') AND korisnici.aktivan = true));

-- SEED: 23 aktivnosti iz Plan rada 2025 DVD Sarvaš
INSERT INTO predlosci_plan_rada (naziv, kategorija, opis, ponavljanje, mjesec_rok, redni_broj) VALUES
('Protupožarna prevencija i gašenje požara', 'vatrogasne aktivnosti', 'Preventivne aktivnosti, gašenje požara, spašavanje ljudi i imovine', 'godisnje', NULL, 1),
('Provedba posebnih mjera zaštite od požara RH', 'vatrogasne aktivnosti', 'Implementacija programa posebnih mjera zaštite od požara', 'godisnje', NULL, 2),
('Unapređenje operativnog rada', 'osposobljavanje', 'Vježbe i edukacije za unapređenje operativnog rada', 'godisnje', NULL, 3),
('Obilježavanje Dana Sv. Florijana', 'društvene aktivnosti', 'Obilježavanje dana zaštitnika vatrogasaca 4. svibnja', 'godisnje', 5, 4),
('Protupožarna promidžba - Mjesec zaštite od požara', 'vatrogasne aktivnosti', 'Pojačane promotivne aktivnosti tijekom mjeseca svibnja', 'godisnje', 5, 5),
('Pojačane mjere za turističku sezonu', 'vatrogasne aktivnosti', 'Pojačane mjere zaštite od požara tijekom ljeta', 'godisnje', 6, 6),
('Održavanje imovine i nabava opreme', 'održavanje opreme', 'Redovito održavanje objekata, vozila i vatrogasne opreme', 'godisnje', NULL, 7),
('Sudjelovanje na obljetnicama DVD-ova', 'društvene aktivnosti', 'Posjete prijateljskim DVD-ovima i sudjelovanje na obljetnicama', 'godisnje', NULL, 8),
('Organizacija vatrogasnih druženja', 'društvene aktivnosti', 'Organizacija i sudjelovanje na vatrogasnim susretima i druženjima', 'godisnje', NULL, 9),
('Održavanje minimalno 2 zbora članova', 'skupštine i sjednice', 'Održavanje zborova članova prema Statutu', 'godisnje', NULL, 10),
('Edukacija u školama i vrtićima', 'osposobljavanje', 'Edukacija djece o požarnoj zaštiti, spašavanju i vatrogasnom podmlatku', 'godisnje', NULL, 11),
('Formiranje muške i ženske natjecateljske ekipe', 'natjecanja', 'Formiranje ekipa A i B kategorije za natjecanja', 'godisnje', 3, 12),
('Kontinuirana obuka podmlatka (12-16 god)', 'osposobljavanje', 'Redovita obuka vatrogasnog podmlatka', 'godisnje', NULL, 13),
('Obuka vatrogasne mladeži (16+)', 'osposobljavanje', 'Redovita obuka vatrogasne mladeži', 'godisnje', NULL, 14),
('Priprema za gradsko/županijsko natjecanje', 'natjecanja', 'Priprema natjecateljskih ekipa za službena natjecanja', 'godisnje', 4, 15),
('Sudjelovanje na gradskom/županijskom natjecanju', 'natjecanja', 'Nastup na službenim vatrogasnim natjecanjima', 'godisnje', 5, 16),
('Sudjelovanje na turnirima i memorijalima', 'natjecanja', 'Nastup na pozivnim turnirima (3-kup JESSEKER/Pero Begovac i sl.)', 'godisnje', NULL, 17),
('Edukativna vježba s cjelokupnim članstvom', 'vatrogasne vježbe', 'Organizacija minimalno jedne vježbe s kompletnim članstvom', 'godisnje', 6, 18),
('Zajednička vježba s JPVP Osijek', 'vatrogasne vježbe', 'Zajednička vježba s Javnom postrojbom vatrogastva Grada Osijeka', 'godisnje', 10, 19),
('Javna pokazna vježba', 'vatrogasne vježbe', 'Organizacija javne pokazne vježbe (mjesec svibanj)', 'godisnje', 5, 20),
('Druženje podmlatka nakon ljeta', 'društvene aktivnosti', 'Organizacija druženja za vatrogasni podmladak nakon ljeta', 'godisnje', 9, 21),
('Vatrogasni kamp za podmladak', 'društvene aktivnosti', 'Organizacija ili sudjelovanje na vatrogasnom kampu', 'godisnje', 7, 22),
('Redoviti tjedni sastanci operativnih članova', 'administrativno', 'Sastanci petkom u 19:00 sati', 'godisnje', NULL, 23);

-- ────────────────────────────────────────────────────────────
-- PREDLOŠCI FINANCIJSKOG PLANA
-- ────────────────────────────────────────────────────────────

CREATE TABLE predlosci_fin_plan (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  konto           TEXT NOT NULL,
  naziv_stavke    TEXT NOT NULL,
  kategorija      TEXT NOT NULL CHECK (kategorija IN ('prihod', 'rashod', 'kapital')),
  nadredjeni_konto TEXT,
  redni_broj      SMALLINT,
  zadnji_iznos    DECIMAL(12,2) DEFAULT 0,
  aktivan         BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE predlosci_fin_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Svi čitaju fin predloške" ON predlosci_fin_plan FOR SELECT TO authenticated USING (true);
CREATE POLICY "Uprava uređuje fin predloške" ON predlosci_fin_plan FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM korisnici WHERE korisnici.id = auth.uid() AND korisnici.uloga IN ('admin','predsjednik','zamjenik','tajnik','blagajnik') AND korisnici.aktivan = true));

-- SEED: Konta iz Financijskog plana 2025 DVD Sarvaš
-- PRIHODI
INSERT INTO predlosci_fin_plan (konto, naziv_stavke, kategorija, nadredjeni_konto, redni_broj, zadnji_iznos) VALUES
('33110', 'Prihodi iz gradskog proračuna (putem VZ Osijek)', 'prihod', NULL, 1, 46456.07),
('33111', 'Prihodi od ostalih izvora', 'prihod', NULL, 2, 0),
('34',    'Prihodi od imovine', 'prihod', NULL, 3, 0),
('35',    'Prihodi od donacija', 'prihod', NULL, 4, 0),
('36',    'Ostali prihodi', 'prihod', NULL, 5, 0);

-- RASHODI
INSERT INTO predlosci_fin_plan (konto, naziv_stavke, kategorija, nadredjeni_konto, redni_broj, zadnji_iznos) VALUES
('4222', 'Službena putovanja (dnevnice)', 'rashod', '422', 10, 1990.97),
('4224', 'Ostale naknade članovima', 'rashod', '422', 11, 0),
('4213', 'Stručno usavršavanje', 'rashod', '422', 12, 1327.32),
('4251', 'Usluge telefona, pošte, prijevoza', 'rashod', '425', 15, 3185.56),
('4252', 'Tekuće održavanje', 'rashod', '425', 16, 5508.36),
('4253', 'Usluge promocije i informiranja', 'rashod', '425', 17, 39.82),
('4254', 'Komunalne usluge', 'rashod', '425', 18, 424.74),
('4256', 'Zdravstvene usluge (liječnički pregledi)', 'rashod', '425', 19, 398.19),
('4257', 'Intelektualne usluge (računovodstvo, pravne)', 'rashod', '425', 20, 1221.13),
('4259', 'Ostale usluge (kamp, grafičke, tehnički pregled)', 'rashod', '425', 21, 889.30),
('4261', 'Uredski materijal', 'rashod', '426', 25, 1327.32),
('4263', 'Energija (gorivo, struja, plin)', 'rashod', '426', 26, 5375.63),
('4264', 'Sitan inventar i auto gume', 'rashod', '426', 27, 5309.26),
('4291', 'Premije osiguranja', 'rashod', '429', 30, 663.66),
('4292', 'Reprezentacija (catering za događanja)', 'rashod', '429', 31, 6238.39),
('4294', 'Kotizacije i pristojbe', 'rashod', '429', 32, 265.46),
('43',   'Amortizacija', 'rashod', NULL, 35, 5972.92),
('4431', 'Usluge platnog prometa', 'rashod', '44', 40, 199.10),
('4434', 'Ostali financijski rashodi', 'rashod', '44', 41, 132.73);

-- KAPITALNI RASHODI (kategorija 'rashod' jer CHECK constraint ne dozvoljava 'kapital')
INSERT INTO predlosci_fin_plan (konto, naziv_stavke, kategorija, nadredjeni_konto, redni_broj, zadnji_iznos) VALUES
('0511', 'Građevinski objekti u pripremi', 'rashod', '051', 50, 7963.90),
('0221', 'Uredska oprema i namještaj', 'rashod', '022', 51, 530.93),
('0222', 'Komunikacijska oprema', 'rashod', '022', 52, 663.66),
('0223a', 'Vatrogasna zaštitna oprema', 'rashod', '022', 53, 4645.61),
('0223b', 'Ostala vatrogasna oprema', 'rashod', '022', 54, 796.39),
('0231', 'Vatrogasna vozila', 'rashod', '023', 55, 6636.58);
