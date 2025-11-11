-- Migration: Fix request_analytics view SECURITY DEFINER issue
-- Purpose: Remove SECURITY DEFINER to fix security advisory
-- Date: 2025-01-05
-- Impact: View will run with caller's permissions instead of definer's permissions

-- Drop existing view
DROP VIEW IF EXISTS request_analytics;

-- Recreate view WITHOUT SECURITY DEFINER (safer approach)
CREATE OR REPLACE VIEW request_analytics AS
SELECT
  DATE_TRUNC('day', timestamp) AS date,
  language,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE blocked = TRUE) AS blocked_requests,
  COUNT(*) FILTER (WHERE event_type = 'error') AS error_requests,
  COUNT(*) FILTER (WHERE is_complete = TRUE) AS complete_requests,
  COUNT(*) FILTER (WHERE is_complete = FALSE) AS incomplete_requests,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_complete = FALSE) / NULLIF(COUNT(*), 0), 2) AS incomplete_rate_percent,
  AVG(response_time_seconds) FILTER (WHERE event_type = 'chat_request') AS avg_response_time_seconds,
  SUM(pinecone_tokens) AS total_pinecone_tokens,
  SUM(openai_total_tokens) AS total_openai_tokens,
  SUM(pinecone_cost) AS total_pinecone_cost,
  SUM(openai_cost) AS total_openai_cost,
  SUM(total_cost) AS total_cost,
  AVG(total_cost) FILTER (WHERE event_type = 'chat_request') AS avg_cost_per_request,
  -- Feedback metrics
  COUNT(*) FILTER (WHERE feedback = 'positive') AS positive_feedback,
  COUNT(*) FILTER (WHERE feedback = 'negative') AS negative_feedback,
  COUNT(*) FILTER (WHERE feedback IS NOT NULL) AS total_feedback,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE feedback = 'positive') /
    NULLIF(COUNT(*) FILTER (WHERE feedback IS NOT NULL), 0),
    2
  ) AS positive_feedback_percent,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE feedback IS NOT NULL) /
    NULLIF(COUNT(*), 0),
    2
  ) AS feedback_rate_percent
FROM geostick_logs_data_qabothr
GROUP BY DATE_TRUNC('day', timestamp), language
ORDER BY date DESC, language;

-- Add updated comment
COMMENT ON VIEW request_analytics IS 'Daily analytics aggregated by language - updated to remove SECURITY DEFINER for better security';
