-- ================================================
-- MIGRATION 024: Stats RPC Functions
-- ================================================
--
-- Deze migration voegt RPC functions toe die N+1 query patterns
-- oplossen in het admin dashboard en customer portal.
--
-- FUNCTIES:
-- 1. get_all_tenants_with_stats() - Voor admin dashboard
-- 2. get_tenant_products_with_stats() - Voor customer portal
--
-- PERFORMANCE IMPACT:
-- - Admin dashboard: 3N+1 queries → 1 query
-- - Portal products: 2N+1 queries → 1 query
--
-- Voorbeeld: 100 tenants = 301 queries → 1 query
-- ================================================

-- ================================================
-- FUNCTION 1: Get all tenants with aggregated stats
-- ================================================
-- Vervangt de N+1 pattern in getAllTenantsWithStats()
-- in lib/admin/tenant-service.ts

CREATE OR REPLACE FUNCTION get_all_tenants_with_stats()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  short_name TEXT,
  description TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  is_active BOOLEAN,
  is_demo BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  document_count BIGINT,
  chunk_count BIGINT,
  chat_count BIGINT,
  total_cost NUMERIC,
  last_chat_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.short_name,
    t.description,
    t.logo_url,
    t.primary_color,
    t.secondary_color,
    t.is_active,
    t.is_demo,
    t.created_at,
    t.updated_at,
    COALESCE(d.doc_count, 0)::BIGINT,
    COALESCE(c.chunk_count, 0)::BIGINT,
    COALESCE(ch.chat_count, 0)::BIGINT,
    COALESCE(ch.cost_sum, 0)::NUMERIC,
    ch.last_chat_at
  FROM tenants t
  LEFT JOIN (
    SELECT tenant_id, COUNT(*) as doc_count
    FROM documents
    GROUP BY tenant_id
  ) d ON d.tenant_id = t.id
  LEFT JOIN (
    SELECT tenant_id, COUNT(*) as chunk_count
    FROM document_chunks
    GROUP BY tenant_id
  ) c ON c.tenant_id = t.id
  LEFT JOIN (
    SELECT
      tenant_id,
      COUNT(*) as chat_count,
      SUM(chat_logs.total_cost) as cost_sum,
      MAX(chat_logs.created_at) as last_chat_at
    FROM chat_logs
    GROUP BY tenant_id
  ) ch ON ch.tenant_id = t.id
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- ================================================
-- FUNCTION 2: Get tenant products with stats
-- ================================================
-- Vervangt de N+1 pattern in /api/portal/products
-- Haalt producten op met document en chat counts in één query

CREATE OR REPLACE FUNCTION get_tenant_products_with_stats(
  p_tenant_id TEXT,
  p_days_ago INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  product_id TEXT,
  name TEXT,
  config JSONB,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  product_name TEXT,
  product_description TEXT,
  product_icon TEXT,
  documents_count BIGINT,
  chats_last_n_days BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tp.id,
    tp.product_id,
    tp.name,
    tp.config,
    tp.is_active,
    tp.created_at,
    p.name,
    p.description,
    p.icon,
    COALESCE(d.doc_count, 0)::BIGINT,
    COALESCE(c.chat_count, 0)::BIGINT
  FROM tenant_products tp
  JOIN products p ON p.id = tp.product_id
  LEFT JOIN (
    SELECT tenant_product_id, COUNT(*) as doc_count
    FROM documents
    WHERE documents.tenant_id = p_tenant_id
    GROUP BY tenant_product_id
  ) d ON d.tenant_product_id = tp.id
  LEFT JOIN (
    SELECT tenant_product_id, COUNT(*) as chat_count
    FROM chat_logs
    WHERE chat_logs.tenant_id = p_tenant_id
      AND chat_logs.created_at >= NOW() - (p_days_ago || ' days')::INTERVAL
    GROUP BY tenant_product_id
  ) c ON c.tenant_product_id = tp.id
  WHERE tp.tenant_id = p_tenant_id AND tp.is_active = true;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- ================================================
-- INDEXES voor optimale performance
-- ================================================
-- Deze indexes ondersteunen de aggregate queries in de RPC functions

-- Index voor document counts per tenant
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id
ON documents(tenant_id);

-- Index voor document counts per tenant_product
CREATE INDEX IF NOT EXISTS idx_documents_tenant_product_id
ON documents(tenant_product_id);

-- Index voor chat counts per tenant
CREATE INDEX IF NOT EXISTS idx_chat_logs_tenant_id
ON chat_logs(tenant_id);

-- Index voor chat counts per tenant_product met datum filter
CREATE INDEX IF NOT EXISTS idx_chat_logs_tenant_product_created
ON chat_logs(tenant_id, tenant_product_id, created_at);

-- ================================================
-- COMMENTS voor documentatie
-- ================================================

COMMENT ON FUNCTION get_all_tenants_with_stats() IS
'Haalt alle tenants op met geaggregeerde stats (documents, chunks, chats, costs) in één query. Vervangt N+1 pattern.';

COMMENT ON FUNCTION get_tenant_products_with_stats(TEXT, INTEGER) IS
'Haalt tenant producten op met stats voor het customer portal. p_days_ago bepaalt de chat count periode (default 30 dagen).';
