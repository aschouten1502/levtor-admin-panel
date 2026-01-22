-- ================================================
-- MIGRATION: Enhanced Search with Metadata Matching
-- ================================================
--
-- Voegt hybrid search toe: vector similarity + keyword matching in metadata
-- Dit verbetert zoekresultaten voor informele queries.
--
-- Gebruik: Voer uit in Supabase SQL Editor
-- ================================================

-- ================================================
-- STAP 1: GIN Index voor JSONB metadata zoeken
-- ================================================

-- Index voor snelle JSONB queries
CREATE INDEX IF NOT EXISTS idx_chunks_metadata_gin
ON document_chunks USING gin(metadata jsonb_path_ops);

-- ================================================
-- STAP 2: Enhanced Search Function
-- ================================================

CREATE OR REPLACE FUNCTION search_documents_enhanced(
  p_tenant_id TEXT,
  p_query_embedding VECTOR(1536),
  p_query_text TEXT,
  p_top_k INTEGER DEFAULT 5,
  p_similarity_threshold FLOAT DEFAULT 0.4,
  p_vector_weight FLOAT DEFAULT 0.7,
  p_keyword_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  filename TEXT,
  content TEXT,
  page_number INTEGER,
  similarity FLOAT,
  keyword_score FLOAT,
  combined_score FLOAT,
  matched_terms TEXT[]
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
    LIMIT p_top_k * 3  -- Fetch meer voor re-ranking
  ),
  keyword_scores AS (
    -- Stap 2: Calculate keyword match score from metadata
    SELECT
      vs.id,
      vs.doc_id,
      vs.doc_filename,
      vs.doc_content,
      vs.doc_page,
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
  -- Stap 3: Combine scores
  SELECT
    ks.id AS chunk_id,
    ks.doc_id AS document_id,
    ks.doc_filename AS filename,
    ks.doc_content AS content,
    ks.doc_page AS page_number,
    ks.vec_similarity AS similarity,
    ks.kw_score AS keyword_score,
    (ks.vec_similarity * p_vector_weight + ks.kw_score * p_keyword_weight)::FLOAT AS combined_score,
    ks.matched_terms_arr AS matched_terms
  FROM keyword_scores ks
  ORDER BY (ks.vec_similarity * p_vector_weight + ks.kw_score * p_keyword_weight) DESC
  LIMIT p_top_k;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_documents_enhanced TO service_role;
GRANT EXECUTE ON FUNCTION search_documents_enhanced TO authenticated;

-- ================================================
-- STAP 3: Verificatie
-- ================================================

-- Test de functie (uncomment om te testen):
-- SELECT * FROM search_documents_enhanced(
--   'demo',
--   '[0.1, 0.2, ...]'::vector,
--   '1% regeling bonus',
--   5
-- );

-- ================================================
-- ROLLBACK (indien nodig):
-- ================================================
-- DROP FUNCTION IF EXISTS search_documents_enhanced;
-- DROP INDEX IF EXISTS idx_chunks_metadata_gin;
