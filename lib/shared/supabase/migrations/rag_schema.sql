-- ================================================
-- SUPABASE RAG SCHEMA - Multi-Tenant Vector Search
-- ================================================
--
-- Dit schema vervangt Pinecone met een eigen RAG-systeem
-- gebaseerd op Supabase pgvector.
--
-- Kosten: ~$0.02 per 1M tokens (alleen embeddings)
-- vs Pinecone: ~$5 per 1M tokens
--
-- Voer dit uit in de Supabase SQL Editor
-- ================================================

-- Enable pgvector extension (gratis in Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================
-- DOCUMENTS TABLE
-- Bevat metadata over geüploade documenten
-- ================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT,                    -- Pad in Supabase Storage
  file_size INTEGER,
  mime_type TEXT DEFAULT 'application/pdf',
  total_pages INTEGER,
  total_chunks INTEGER DEFAULT 0,
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  processing_error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index voor tenant isolatie
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);

-- ================================================
-- DOCUMENT CHUNKS TABLE
-- Bevat tekst chunks met embeddings voor vector search
-- ================================================
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_length INTEGER GENERATED ALWAYS AS (LENGTH(content)) STORED,
  embedding VECTOR(1536),            -- OpenAI text-embedding-3-small dimensie
  page_number INTEGER,
  chunk_index INTEGER,               -- Volgorde binnen document
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity index (IVFFlat voor snelheid)
-- Pas 'lists' aan op basis van data volume:
-- - < 10K chunks: lists = 100
-- - 10K-100K chunks: lists = 250
-- - > 100K chunks: lists = 500
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Tenant isolatie index
CREATE INDEX IF NOT EXISTS idx_chunks_tenant ON document_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);

-- ================================================
-- VECTOR SEARCH FUNCTION
-- Zoekt relevante chunks voor een query embedding
-- ================================================
CREATE OR REPLACE FUNCTION search_documents(
  p_tenant_id TEXT,
  p_query_embedding VECTOR(1536),
  p_top_k INTEGER DEFAULT 3,
  p_similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  filename TEXT,
  content TEXT,
  page_number INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id AS chunk_id,
    dc.document_id,
    d.filename,
    dc.content,
    dc.page_number,
    (1 - (dc.embedding <=> p_query_embedding))::FLOAT AS similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE dc.tenant_id = p_tenant_id
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> p_query_embedding) >= p_similarity_threshold
  ORDER BY dc.embedding <=> p_query_embedding
  LIMIT p_top_k;
END;
$$;

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Statistieken per tenant
CREATE OR REPLACE FUNCTION get_rag_stats(p_tenant_id TEXT)
RETURNS TABLE (
  total_documents BIGINT,
  total_chunks BIGINT,
  avg_chunk_length NUMERIC,
  last_document_added TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT d.id)::BIGINT,
    COUNT(dc.id)::BIGINT,
    ROUND(AVG(dc.content_length), 0),
    MAX(d.created_at)
  FROM documents d
  LEFT JOIN document_chunks dc ON dc.document_id = d.id
  WHERE d.tenant_id = p_tenant_id;
END;
$$;

-- Cleanup incomplete documents (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_failed_documents(p_tenant_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM documents
  WHERE tenant_id = p_tenant_id
    AND processing_status = 'failed'
    AND created_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ================================================
-- ROW LEVEL SECURITY (optioneel maar aanbevolen)
-- ================================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Policy voor service role (volledige toegang)
-- Deze policies zorgen ervoor dat de service role key alles kan doen
CREATE POLICY "Service role full access to documents" ON documents
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to chunks" ON document_chunks
  FOR ALL USING (true) WITH CHECK (true);

-- ================================================
-- TRIGGER: Auto-update updated_at
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- GRANT PERMISSIONS
-- ================================================
-- Zorg dat de service role alles kan doen
GRANT ALL ON documents TO service_role;
GRANT ALL ON document_chunks TO service_role;
GRANT EXECUTE ON FUNCTION search_documents TO service_role;
GRANT EXECUTE ON FUNCTION get_rag_stats TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_failed_documents TO service_role;
