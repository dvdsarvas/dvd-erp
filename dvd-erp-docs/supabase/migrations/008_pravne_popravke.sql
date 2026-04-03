-- ============================================================
-- MIGRACIJA 008: Pravne popravke za zakonsku usklađenost
-- Dostava zapisnika, strukturirani izbori
-- ============================================================

-- Dodaj stupce za praćenje dostave zapisnika skupštine
ALTER TABLE sjednice ADD COLUMN IF NOT EXISTS zapisnik_dostavljen_datum DATE;
ALTER TABLE sjednice ADD COLUMN IF NOT EXISTS zapisnik_potvrda_url TEXT;

-- Ažuriraj status_sjednice CHECK da uključi 'dostavljen'
-- (ne možemo ALTER CHECK, pa dodajemo novi status kroz existing workflow:
--  zapisnik_potpisan → arhivirana znači da je dostavljen)
