-- ========================================
-- Migration 025: Branding Logs Table
-- ========================================
-- Tracks costs for branding-related AI operations:
-- - Fun facts extraction from PDF (GPT-4o)
-- - Future: URL branding extraction with AI
-- ========================================

-- Create branding_logs table
CREATE TABLE IF NOT EXISTS branding_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Operation type
  operation_type TEXT NOT NULL CHECK (operation_type IN ('fun_facts', 'url_extraction')),

  -- Input details
  source_file TEXT,           -- PDF filename for fun_facts
  source_url TEXT,            -- URL for url_extraction

  -- Token usage
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,

  -- Cost
  cost_usd DECIMAL(10,6) DEFAULT 0,

  -- Result
  extracted_data JSONB,       -- The generated fun facts or extracted branding
  success BOOLEAN DEFAULT true,
  error_message TEXT,

  -- Timing
  duration_ms INTEGER,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_branding_logs_tenant ON branding_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branding_logs_created ON branding_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_branding_logs_operation ON branding_logs(operation_type);

-- Comment
COMMENT ON TABLE branding_logs IS 'Tracks AI costs for branding operations (fun facts extraction, etc.)';

-- Enable RLS
ALTER TABLE branding_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access
CREATE POLICY "Service role full access to branding_logs"
  ON branding_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can read logs
CREATE POLICY "Authenticated users can read branding logs"
  ON branding_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- ========================================
-- Update tenant_costs_summary view to include branding costs
-- ========================================

-- Drop existing view if it exists (we'll recreate it with branding)
DROP VIEW IF EXISTS tenant_costs_summary;

-- Recreate view with branding costs included
CREATE OR REPLACE VIEW tenant_costs_summary AS
WITH doc_costs AS (
  SELECT
    tenant_id,
    COUNT(*) as document_count,
    COUNT(*) FILTER (WHERE processing_status = 'completed') as completed_docs,
    COALESCE(SUM(total_pages), 0) as total_pages,
    COALESCE(SUM(total_chunks), 0) as total_chunks,
    COALESCE(SUM(chunking_cost), 0) as chunking_cost,
    COALESCE(SUM(embedding_cost), 0) as embedding_cost,
    COALESCE(SUM(metadata_cost), 0) as metadata_cost,
    COALESCE(SUM(total_cost), 0) as doc_total_cost
  FROM document_processing_logs
  GROUP BY tenant_id
),
chat_costs AS (
  SELECT
    tenant_id,
    COUNT(*) as chat_count,
    AVG(response_time_ms) as avg_response_time,
    COALESCE(SUM(embedding_cost), 0) as chat_embedding_cost,
    COALESCE(SUM((rag_details->'costs'->>'reranking')::DECIMAL), 0) as reranking_cost,
    COALESCE(SUM((rag_details->'costs'->>'translation')::DECIMAL), 0) as translation_cost,
    COALESCE(SUM(openai_cost), 0) as openai_cost,
    COALESCE(SUM(total_cost), 0) as chat_total_cost
  FROM chat_logs
  WHERE is_complete = true
  GROUP BY tenant_id
),
qa_costs AS (
  SELECT
    tenant_id,
    COUNT(*) as qa_count,
    COALESCE(SUM(generation_cost), 0) as generation_cost,
    COALESCE(SUM(execution_cost), 0) as execution_cost,
    COALESCE(SUM(evaluation_cost), 0) as evaluation_cost,
    COALESCE(SUM(total_cost), 0) as qa_total_cost
  FROM qa_test_runs
  GROUP BY tenant_id
),
branding_costs AS (
  SELECT
    tenant_id,
    COUNT(*) as branding_count,
    COALESCE(SUM(CASE WHEN operation_type = 'fun_facts' THEN cost_usd ELSE 0 END), 0) as fun_facts_cost,
    COALESCE(SUM(cost_usd), 0) as branding_total_cost
  FROM branding_logs
  GROUP BY tenant_id
)
SELECT
  t.id as tenant_id,
  t.name as tenant_name,
  -- Document stats
  COALESCE(d.document_count, 0) as document_count,
  COALESCE(d.completed_docs, 0) as completed_docs,
  COALESCE(d.total_pages, 0) as total_pages,
  COALESCE(d.total_chunks, 0) as total_chunks,
  -- Document costs
  COALESCE(d.chunking_cost, 0) as doc_chunking_cost,
  COALESCE(d.embedding_cost, 0) as doc_embedding_cost,
  COALESCE(d.metadata_cost, 0) as doc_metadata_cost,
  COALESCE(d.doc_total_cost, 0) as doc_total_cost,
  -- Chat stats
  COALESCE(c.chat_count, 0) as chat_count,
  COALESCE(c.avg_response_time, 0) as avg_response_time,
  -- Chat costs
  COALESCE(c.chat_embedding_cost, 0) as chat_embedding_cost,
  COALESCE(c.reranking_cost, 0) as chat_reranking_cost,
  COALESCE(c.translation_cost, 0) as chat_translation_cost,
  COALESCE(c.openai_cost, 0) as chat_openai_cost,
  COALESCE(c.chat_total_cost, 0) as chat_total_cost,
  -- QA stats
  COALESCE(q.qa_count, 0) as qa_count,
  -- QA costs
  COALESCE(q.generation_cost, 0) as qa_generation_cost,
  COALESCE(q.execution_cost, 0) as qa_execution_cost,
  COALESCE(q.evaluation_cost, 0) as qa_evaluation_cost,
  COALESCE(q.qa_total_cost, 0) as qa_total_cost,
  -- Branding stats
  COALESCE(b.branding_count, 0) as branding_count,
  -- Branding costs
  COALESCE(b.fun_facts_cost, 0) as branding_fun_facts_cost,
  COALESCE(b.branding_total_cost, 0) as branding_total_cost,
  -- Total
  COALESCE(d.doc_total_cost, 0) + COALESCE(c.chat_total_cost, 0) + COALESCE(q.qa_total_cost, 0) + COALESCE(b.branding_total_cost, 0) as total_cost
FROM tenants t
LEFT JOIN doc_costs d ON d.tenant_id = t.id
LEFT JOIN chat_costs c ON c.tenant_id = t.id
LEFT JOIN qa_costs q ON q.tenant_id = t.id
LEFT JOIN branding_costs b ON b.tenant_id = t.id
WHERE t.is_active = true;

-- Grant access
GRANT SELECT ON tenant_costs_summary TO authenticated;
GRANT SELECT ON branding_logs TO authenticated;
GRANT INSERT, UPDATE ON branding_logs TO authenticated;
