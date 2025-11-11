-- Migration: Citation extraction and flattening
-- Purpose: Create a flattened view of all citations for easier querying and analysis
-- Date: 2025-01-05

-- Flattened view of all citations with document metadata
CREATE OR REPLACE VIEW citation_details AS
SELECT
  l.id AS log_id,
  l.timestamp,
  l.session_id,
  l.language,
  l.feedback,
  l.question,
  (citation->>'position')::INTEGER AS citation_position,
  citation->>'preview' AS citation_preview,
  ref->'file'->>'id' AS file_id,
  ref->'file'->>'name' AS file_name,
  (ref->'file'->>'size')::BIGINT AS file_size_bytes,
  ref->'pages' AS pages_cited,
  jsonb_array_length(COALESCE(ref->'pages', '[]'::jsonb)) AS num_pages_cited
FROM geostick_logs_data_qabothr l,
  LATERAL jsonb_array_elements(l.citations) AS citation,
  LATERAL jsonb_array_elements(citation->'references') AS ref
WHERE l.citations IS NOT NULL
  AND jsonb_array_length(l.citations) > 0
ORDER BY l.timestamp DESC, citation_position;

COMMENT ON VIEW citation_details IS 'Flattened view of all citations with document metadata for easy querying and analysis';

-- View for most cited pages within documents
CREATE OR REPLACE VIEW most_cited_pages AS
SELECT
  ref->'file'->>'name' AS file_name,
  page_num,
  COUNT(*) AS citation_count,
  COUNT(DISTINCT l.session_id) AS unique_sessions,
  ARRAY_AGG(DISTINCT l.language) AS languages,
  MIN(l.timestamp) AS first_cited,
  MAX(l.timestamp) AS last_cited
FROM geostick_logs_data_qabothr l,
  LATERAL jsonb_array_elements(l.citations) AS citation,
  LATERAL jsonb_array_elements(citation->'references') AS ref,
  LATERAL jsonb_array_elements(ref->'pages') AS page_num
WHERE l.citations IS NOT NULL
  AND ref->'file'->>'name' IS NOT NULL
GROUP BY ref->'file'->>'name', page_num
ORDER BY citation_count DESC, file_name, page_num;

COMMENT ON VIEW most_cited_pages IS 'Tracks which specific pages within documents are cited most frequently';
