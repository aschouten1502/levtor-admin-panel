-- ================================================
-- Migration 023: Unified Tenant Costs View
-- ================================================
--
-- Maakt een view die ALLE kosten per tenant samenbrengt:
-- - Document processing kosten (chunking, embedding, metadata)
-- - Chat kosten (embedding, reranking, translation, openai)
--
-- Dit lost het probleem op dat tenants pas zichtbaar waren
-- in admin na hun eerste chat. Nu zien we alle tenants
-- met hun totale kosten (documents + chats).
--
-- v2.2: Cost Tracking Improvement
-- ================================================

-- View: Unified tenant costs (chat + document processing)
CREATE OR REPLACE VIEW tenant_costs_summary AS
WITH chat_costs AS (
  SELECT
    tenant_id,
    COUNT(*) as chat_count,
    COALESCE(SUM(total_cost), 0) as chat_total_cost,
    COALESCE(SUM(embedding_cost), 0) as embedding_cost,
    COALESCE(SUM(openai_cost), 0) as openai_cost,
    -- Extract rerank cost from rag_details if available
    COALESCE(SUM((rag_details->'costs'->>'reranking')::numeric), 0) as rerank_cost,
    -- Extract translation cost from rag_details if available
    COALESCE(SUM((rag_details->'query'->'translation'->>'translationCost')::numeric), 0) as translation_cost,
    MAX(created_at) as last_chat_at
  FROM chat_logs
  WHERE tenant_id IS NOT NULL
  GROUP BY tenant_id
),
doc_costs AS (
  SELECT
    tenant_id,
    COUNT(*) as document_count,
    COALESCE(SUM(total_pages), 0) as total_pages,
    COALESCE(SUM(chunks_created), 0) as total_chunks,
    COALESCE(SUM(chunking_cost), 0) as chunking_cost,
    COALESCE(SUM(embedding_cost), 0) as doc_embedding_cost,
    COALESCE(SUM(metadata_cost), 0) as metadata_cost,
    COALESCE(SUM(total_cost), 0) as doc_total_cost,
    MAX(completed_at) as last_doc_at
  FROM document_processing_logs
  WHERE tenant_id IS NOT NULL
    AND processing_status = 'completed'
  GROUP BY tenant_id
)
SELECT
  t.id as tenant_id,
  t.name as tenant_name,
  t.created_at,
  t.is_active,

  -- Document stats
  COALESCE(d.document_count, 0) as document_count,
  COALESCE(d.total_pages, 0) as total_pages,
  COALESCE(d.total_chunks, 0) as total_chunks,

  -- Document costs breakdown
  COALESCE(d.chunking_cost, 0) as doc_chunking_cost,
  COALESCE(d.doc_embedding_cost, 0) as doc_embedding_cost,
  COALESCE(d.metadata_cost, 0) as doc_metadata_cost,
  COALESCE(d.doc_total_cost, 0) as doc_total_cost,

  -- Chat stats
  COALESCE(c.chat_count, 0) as chat_count,

  -- Chat costs breakdown
  COALESCE(c.embedding_cost, 0) as chat_embedding_cost,
  COALESCE(c.rerank_cost, 0) as chat_rerank_cost,
  COALESCE(c.translation_cost, 0) as chat_translation_cost,
  COALESCE(c.openai_cost, 0) as chat_openai_cost,
  COALESCE(c.chat_total_cost, 0) as chat_total_cost,

  -- Totals
  COALESCE(d.doc_total_cost, 0) + COALESCE(c.chat_total_cost, 0) as total_cost,

  -- Averages
  CASE WHEN COALESCE(c.chat_count, 0) > 0
    THEN COALESCE(c.chat_total_cost, 0) / c.chat_count
    ELSE 0
  END as avg_cost_per_chat,
  CASE WHEN COALESCE(d.document_count, 0) > 0
    THEN COALESCE(d.doc_total_cost, 0) / d.document_count
    ELSE 0
  END as avg_cost_per_document,

  -- Activity timestamps
  GREATEST(d.last_doc_at, c.last_chat_at) as last_activity,
  d.last_doc_at as last_document_upload,
  c.last_chat_at as last_chat

FROM tenants t
LEFT JOIN chat_costs c ON t.id = c.tenant_id
LEFT JOIN doc_costs d ON t.id = d.tenant_id
ORDER BY total_cost DESC;

-- Grant access
GRANT SELECT ON tenant_costs_summary TO authenticated, service_role;

-- ================================================
-- Function: Get detailed costs for a single tenant
-- ================================================
-- Returns complete cost breakdown including per-document details

CREATE OR REPLACE FUNCTION get_tenant_cost_details(p_tenant_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'tenant_id', p_tenant_id,
    'tenant_name', (SELECT name FROM tenants WHERE id = p_tenant_id),
    'documents', (
      SELECT json_build_object(
        'count', COUNT(*),
        'total_pages', COALESCE(SUM(total_pages), 0),
        'total_chunks', COALESCE(SUM(chunks_created), 0),
        'costs', json_build_object(
          'chunking', COALESCE(SUM(chunking_cost), 0),
          'embedding', COALESCE(SUM(embedding_cost), 0),
          'metadata', COALESCE(SUM(metadata_cost), 0),
          'total', COALESCE(SUM(total_cost), 0)
        ),
        'documents', (
          SELECT COALESCE(json_agg(json_build_object(
            'filename', filename,
            'pages', total_pages,
            'chunks', chunks_created,
            'costs', json_build_object(
              'chunking', chunking_cost,
              'embedding', embedding_cost,
              'metadata', metadata_cost,
              'total', total_cost
            ),
            'processed_at', completed_at,
            'duration_seconds', ROUND(total_duration_ms / 1000.0, 1)
          ) ORDER BY completed_at DESC), '[]'::json)
          FROM document_processing_logs
          WHERE tenant_id = p_tenant_id AND processing_status = 'completed'
        )
      )
      FROM document_processing_logs
      WHERE tenant_id = p_tenant_id AND processing_status = 'completed'
    ),
    'chats', (
      SELECT json_build_object(
        'count', COUNT(*),
        'costs', json_build_object(
          'embedding', COALESCE(SUM(embedding_cost), 0),
          'reranking', COALESCE(SUM((rag_details->'costs'->>'reranking')::numeric), 0),
          'translation', COALESCE(SUM((rag_details->'query'->'translation'->>'translationCost')::numeric), 0),
          'openai', COALESCE(SUM(openai_cost), 0),
          'total', COALESCE(SUM(total_cost), 0)
        ),
        'avg_response_time_ms', COALESCE(AVG(response_time_ms), 0),
        'last_chat', MAX(created_at)
      )
      FROM chat_logs
      WHERE tenant_id = p_tenant_id
    ),
    'total_cost', (
      SELECT COALESCE(
        (SELECT SUM(total_cost) FROM document_processing_logs WHERE tenant_id = p_tenant_id AND processing_status = 'completed'),
        0
      ) + COALESCE(
        (SELECT SUM(total_cost) FROM chat_logs WHERE tenant_id = p_tenant_id),
        0
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tenant_cost_details TO service_role;

-- ================================================
-- Function: Get all tenants costs summary
-- ================================================
-- Handig voor admin overview zonder direct view te queryen

CREATE OR REPLACE FUNCTION get_all_tenant_costs()
RETURNS TABLE (
  tenant_id TEXT,
  tenant_name TEXT,
  document_count BIGINT,
  chat_count BIGINT,
  doc_total_cost NUMERIC,
  chat_total_cost NUMERIC,
  total_cost NUMERIC,
  last_activity TIMESTAMPTZ,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tcs.tenant_id::TEXT,
    tcs.tenant_name::TEXT,
    tcs.document_count,
    tcs.chat_count,
    tcs.doc_total_cost,
    tcs.chat_total_cost,
    tcs.total_cost,
    tcs.last_activity,
    tcs.is_active
  FROM tenant_costs_summary tcs
  ORDER BY tcs.total_cost DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_tenant_costs TO service_role;

-- ================================================
-- ROLLBACK (indien nodig):
-- ================================================
-- DROP FUNCTION IF EXISTS get_all_tenant_costs();
-- DROP FUNCTION IF EXISTS get_tenant_cost_details(TEXT);
-- DROP VIEW IF EXISTS tenant_costs_summary;
