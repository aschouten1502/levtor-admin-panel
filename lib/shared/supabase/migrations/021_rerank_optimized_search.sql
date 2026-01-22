-- ================================================
-- MIGRATION: Rerank-Optimized Search
-- ================================================
--
-- Optimaliseert de search functie voor gebruik met Cohere Rerank:
-- - Verlaagt similarity threshold (0.40 → 0.35) voor meer candidates
-- - Verhoogt default top_k (5 → 30) voor reranker input
-- - Voegt file_path toe aan output voor PDF citations
--
-- Gebruik: Voer uit in Supabase SQL Editor
-- ================================================

-- ================================================
-- STAP 1: Update Enhanced Search Function
-- ================================================

CREATE OR REPLACE FUNCTION search_documents_enhanced(
  p_tenant_id TEXT,
  p_query_embedding VECTOR(1536),
  p_query_text TEXT,
  p_top_k INTEGER DEFAULT 30,              -- Verhoogd van 5 naar 30 voor reranking
  p_similarity_threshold FLOAT DEFAULT 0.35, -- Verlaagd van 0.4 naar 0.35 voor meer candidates
  p_vector_weight FLOAT DEFAULT 0.6,       -- Aangepast: 60% vector, 40% keyword
  p_keyword_weight FLOAT DEFAULT 0.4
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  filename TEXT,
  file_path TEXT,                          -- Storage path voor PDF toegang
  content TEXT,
  page_number INTEGER,
  similarity FLOAT,
  keyword_score FLOAT,
  combined_score FLOAT,
  matched_terms TEXT[],
  metadata JSONB                           -- NIEUW: Chunk metadata voor section info
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_words TEXT[];
BEGIN
  -- Split query into words for keyword matching (lowercase)
  query_words := string_to_array(lower(p_query_text), ' ');

  RETURN QUERY
  WITH vector_search AS (
    -- Stap 1: Vector similarity search
    SELECT
      dc.id,
      dc.document_id AS doc_id,
      d.filename AS doc_filename,
      d.file_path AS doc_file_path,        -- NIEUW: file_path van document
      dc.content AS doc_content,
      dc.page_number AS doc_page,
      dc.metadata,
      (1 - (dc.embedding <=> p_query_embedding))::FLOAT AS vec_similarity
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE dc.tenant_id = p_tenant_id
      AND dc.embedding IS NOT NULL
      AND 1 - (dc.embedding <=> p_query_embedding) >= p_similarity_threshold
    ORDER BY dc.embedding <=> p_query_embedding
    LIMIT p_top_k * 2  -- Extra buffer voor keyword filtering
  ),
  keyword_scores AS (
    -- Stap 2: Calculate keyword match score from metadata
    SELECT
      vs.id,
      vs.doc_id,
      vs.doc_filename,
      vs.doc_file_path,
      vs.doc_content,
      vs.doc_page,
      vs.metadata AS chunk_metadata,       -- NIEUW: Bewaar metadata voor output
      vs.vec_similarity,
      -- Tel keyword matches
      COALESCE(
        (
          SELECT COUNT(*)::FLOAT / GREATEST(array_length(query_words, 1), 1)
          FROM unnest(query_words) qw
          WHERE
            -- Match in keywords array
            EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(COALESCE(vs.metadata->'keywords', '[]'::jsonb)) kw
              WHERE lower(kw) LIKE '%' || qw || '%'
            )
            -- Match in alternativeTerms array
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(COALESCE(vs.metadata->'alternativeTerms', '[]'::jsonb)) at
              WHERE lower(at) LIKE '%' || qw || '%'
            )
            -- Match in summary
            OR lower(COALESCE(vs.metadata->>'summary', '')) LIKE '%' || qw || '%'
        ), 0
      ) AS kw_score,
      -- Collect matched terms for debugging
      ARRAY(
        SELECT DISTINCT matched
        FROM (
          SELECT kw AS matched
          FROM jsonb_array_elements_text(COALESCE(vs.metadata->'keywords', '[]'::jsonb)) kw
          WHERE EXISTS (SELECT 1 FROM unnest(query_words) qw WHERE lower(kw) LIKE '%' || qw || '%')
          UNION
          SELECT at AS matched
          FROM jsonb_array_elements_text(COALESCE(vs.metadata->'alternativeTerms', '[]'::jsonb)) at
          WHERE EXISTS (SELECT 1 FROM unnest(query_words) qw WHERE lower(at) LIKE '%' || qw || '%')
        ) matches
      ) AS matched_terms_arr
    FROM vector_search vs
  )
  -- Stap 3: Combine scores and return
  SELECT
    ks.id AS chunk_id,
    ks.doc_id AS document_id,
    ks.doc_filename AS filename,
    ks.doc_file_path AS file_path,
    ks.doc_content AS content,
    ks.doc_page AS page_number,
    ks.vec_similarity AS similarity,
    ks.kw_score AS keyword_score,
    (ks.vec_similarity * p_vector_weight + ks.kw_score * p_keyword_weight)::FLOAT AS combined_score,
    ks.matched_terms_arr AS matched_terms,
    ks.chunk_metadata AS metadata          -- NIEUW: Metadata voor section info
  FROM keyword_scores ks
  ORDER BY (ks.vec_similarity * p_vector_weight + ks.kw_score * p_keyword_weight) DESC
  LIMIT p_top_k;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_documents_enhanced TO service_role;
GRANT EXECUTE ON FUNCTION search_documents_enhanced TO authenticated;

-- ================================================
-- STAP 2: Update Basic Search Function (fallback)
-- ================================================

CREATE OR REPLACE FUNCTION search_documents(
  p_tenant_id TEXT,
  p_query_embedding VECTOR(1536),
  p_top_k INTEGER DEFAULT 30,              -- Verhoogd van 10 naar 30
  p_similarity_threshold FLOAT DEFAULT 0.35 -- Verlaagd van 0.45 naar 0.35
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  filename TEXT,
  file_path TEXT,                          -- NIEUW
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
    d.file_path,                           -- NIEUW
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_documents TO service_role;
GRANT EXECUTE ON FUNCTION search_documents TO authenticated;

-- ================================================
-- STAP 3: Verificatie
-- ================================================

-- Test de functie (uncomment om te testen):
-- SELECT chunk_id, filename, file_path, similarity
-- FROM search_documents_enhanced(
--   'demo',
--   '[0.1, 0.2, ...]'::vector,
--   'wanneer krijg ik salaris',
--   30
-- );

-- ================================================
-- ROLLBACK (indien nodig):
-- ================================================
-- Voer 020_enhanced_search.sql opnieuw uit om te herstellen
