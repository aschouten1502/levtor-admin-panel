-- ================================================
-- MIGRATION: Tenant Language Support
-- ================================================
--
-- Voegt document_language kolom toe aan tenants tabel
-- voor multilingual RAG ondersteuning.
--
-- Query Translation Flow:
-- 1. User vraagt in Duits/Frans/Engels
-- 2. Systeem detecteert vraag-taal
-- 3. Vertaalt naar document_language (bijv. NL)
-- 4. Vector search met vertaalde query
-- 5. Antwoord in originele taal
--
-- ================================================

-- ================================================
-- STAP 1: Voeg document_language kolom toe
-- ================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS
  document_language VARCHAR(5) DEFAULT 'nl';

COMMENT ON COLUMN tenants.document_language IS
  'Taal waarin de HR documenten zijn geschreven (nl, de, fr, en, etc.)';

-- ================================================
-- STAP 2: Voeg website_url kolom toe
-- ================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS
  website_url TEXT;

COMMENT ON COLUMN tenants.website_url IS
  'Website URL voor automatische branding extractie';

-- ================================================
-- STAP 3: Index voor snelle lookups
-- ================================================

CREATE INDEX IF NOT EXISTS idx_tenants_document_language
  ON tenants(document_language);

-- ================================================
-- STAP 4: Update bestaande tenants naar default 'nl'
-- ================================================

UPDATE tenants
SET document_language = 'nl'
WHERE document_language IS NULL;

-- ================================================
-- VERIFICATIE
-- ================================================

-- Check de nieuwe kolommen:
-- SELECT id, name, document_language, website_url FROM tenants;

-- ================================================
-- ROLLBACK (indien nodig):
-- ================================================
-- ALTER TABLE tenants DROP COLUMN IF EXISTS document_language;
-- ALTER TABLE tenants DROP COLUMN IF EXISTS website_url;
-- DROP INDEX IF EXISTS idx_tenants_document_language;
