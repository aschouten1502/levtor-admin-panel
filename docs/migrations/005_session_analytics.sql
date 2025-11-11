-- Migration: Session-level analytics view
-- Purpose: Provide insights into user sessions, conversation quality, and engagement
-- Date: 2025-01-05

-- Create session analytics view
CREATE OR REPLACE VIEW session_analytics AS
SELECT
  session_id,
  MIN(timestamp) AS session_start,
  MAX(timestamp) AS session_end,
  EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 60 AS session_duration_minutes,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE blocked = TRUE) AS blocked_requests,
  COUNT(*) FILTER (WHERE event_type = 'error') AS error_requests,
  COUNT(*) FILTER (WHERE is_complete = FALSE) AS incomplete_requests,
  AVG(response_time_seconds)::DECIMAL(10, 2) AS avg_response_time,
  MAX(conversation_history_length) AS max_conversation_depth,
  SUM(total_cost)::DECIMAL(10, 6) AS session_total_cost,
  SUM(pinecone_tokens) AS total_pinecone_tokens,
  SUM(openai_total_tokens) AS total_openai_tokens,
  -- Feedback metrics
  COUNT(*) FILTER (WHERE feedback = 'positive') AS positive_feedback,
  COUNT(*) FILTER (WHERE feedback = 'negative') AS negative_feedback,
  COUNT(*) FILTER (WHERE feedback IS NOT NULL) AS total_feedback,
  -- Language diversity
  ARRAY_AGG(DISTINCT language ORDER BY language) FILTER (WHERE language IS NOT NULL) AS languages_used,
  -- Quality score (0-100)
  ROUND(
    (
      (1.0 - COALESCE(COUNT(*) FILTER (WHERE event_type = 'error')::DECIMAL / NULLIF(COUNT(*), 0), 0)) * 40 +
      (1.0 - COALESCE(COUNT(*) FILTER (WHERE blocked = TRUE)::DECIMAL / NULLIF(COUNT(*), 0), 0)) * 30 +
      (COALESCE(COUNT(*) FILTER (WHERE feedback = 'positive')::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE feedback IS NOT NULL), 0), 0.5)) * 30
    ) * 100,
    1
  ) AS session_quality_score
FROM geostick_logs_data_qabothr
WHERE session_id IS NOT NULL
GROUP BY session_id
ORDER BY session_start DESC;

COMMENT ON VIEW session_analytics IS 'Session-level analytics with quality scoring, duration, costs, and engagement metrics';

-- Create index to speed up session queries
CREATE INDEX IF NOT EXISTS idx_logs_session_timestamp
  ON geostick_logs_data_qabothr(session_id, timestamp)
  WHERE session_id IS NOT NULL;

COMMENT ON INDEX idx_logs_session_timestamp IS 'Speeds up session-level queries and time-based filtering';
