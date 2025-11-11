-- Migration: Document usage analytics
-- Purpose: Track which documents are cited most frequently and their effectiveness
-- Date: 2025-01-05

-- Create document usage analytics view
-- Extracts file names from the nested citation structure and aggregates usage stats
CREATE OR REPLACE VIEW document_usage_analytics AS
SELECT
  cite.file_name,
  COUNT(DISTINCT l.id) AS times_cited,
  COUNT(DISTINCT l.session_id) AS unique_sessions,
  AVG(l.response_time_seconds)::DECIMAL(10, 2) AS avg_response_time,
  MIN(l.response_time_seconds)::DECIMAL(10, 2) AS min_response_time,
  MAX(l.response_time_seconds)::DECIMAL(10, 2) AS max_response_time,
  COUNT(*) FILTER (WHERE l.feedback = 'positive') AS positive_feedback_count,
  COUNT(*) FILTER (WHERE l.feedback = 'negative') AS negative_feedback_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE l.feedback = 'positive') /
    NULLIF(COUNT(*) FILTER (WHERE l.feedback IS NOT NULL), 0),
    2
  ) AS positive_feedback_percent,
  MIN(l.timestamp) AS first_cited,
  MAX(l.timestamp) AS last_cited,
  EXTRACT(DAY FROM (MAX(l.timestamp) - MIN(l.timestamp))) AS days_in_use
FROM geostick_logs_data_qabothr l,
  LATERAL (
    SELECT DISTINCT
      (ref->'file'->>'name') AS file_name
    FROM jsonb_array_elements(l.citations) AS citation,
         jsonb_array_elements(citation->'references') AS ref
    WHERE ref->'file'->>'name' IS NOT NULL
  ) AS cite
WHERE l.citations IS NOT NULL
  AND jsonb_array_length(l.citations) > 0
GROUP BY cite.file_name
ORDER BY times_cited DESC;

COMMENT ON VIEW document_usage_analytics IS 'Analytics on document citation frequency, effectiveness (via feedback), and usage patterns';

-- Create materialized view for faster queries (optional, refresh periodically)
-- Uncomment if you want better performance for large datasets
-- CREATE MATERIALIZED VIEW document_usage_analytics_mv AS
-- SELECT * FROM document_usage_analytics;
--
-- COMMENT ON MATERIALIZED VIEW document_usage_analytics_mv IS 'Materialized version of document analytics - refresh with: REFRESH MATERIALIZED VIEW document_usage_analytics_mv;';
