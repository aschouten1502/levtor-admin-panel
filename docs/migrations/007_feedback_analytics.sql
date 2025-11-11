-- Migration: Enhanced feedback analytics
-- Purpose: Analyze feedback patterns with performance and context metrics
-- Date: 2025-01-05

-- Create feedback analytics view with context
CREATE OR REPLACE VIEW feedback_analytics AS
SELECT
  DATE_TRUNC('day', timestamp) AS date,
  feedback,
  COUNT(*) AS feedback_count,
  AVG(response_time_seconds)::DECIMAL(10, 2) AS avg_response_time,
  AVG(total_cost)::DECIMAL(10, 6) AS avg_cost,
  AVG(citations_count)::DECIMAL(10, 2) AS avg_citations,
  AVG(conversation_history_length)::DECIMAL(10, 2) AS avg_conversation_length,
  AVG(openai_total_tokens)::INTEGER AS avg_tokens,
  -- Sample questions for qualitative analysis (limited to 5 recent ones)
  ARRAY_AGG(
    CASE
      WHEN LENGTH(question) <= 200 THEN question
      ELSE LEFT(question, 197) || '...'
    END
    ORDER BY timestamp DESC
  ) FILTER (WHERE LENGTH(question) > 0) AS sample_questions
FROM geostick_logs_data_qabothr
WHERE feedback IS NOT NULL
GROUP BY DATE_TRUNC('day', timestamp), feedback
ORDER BY date DESC, feedback;

COMMENT ON VIEW feedback_analytics IS 'Daily feedback patterns with performance metrics and sample questions for analysis';

-- Create index for faster feedback queries
CREATE INDEX IF NOT EXISTS idx_logs_feedback_timestamp
  ON geostick_logs_data_qabothr(feedback, timestamp DESC)
  WHERE feedback IS NOT NULL;

COMMENT ON INDEX idx_logs_feedback_timestamp IS 'Optimizes feedback-related queries and time-based filtering';

-- Additional view for feedback trends over time
CREATE OR REPLACE VIEW feedback_trends AS
SELECT
  DATE_TRUNC('week', timestamp) AS week,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE feedback IS NOT NULL) AS total_feedback,
  ROUND(100.0 * COUNT(*) FILTER (WHERE feedback IS NOT NULL) / NULLIF(COUNT(*), 0), 2) AS feedback_rate_percent,
  COUNT(*) FILTER (WHERE feedback = 'positive') AS positive_count,
  COUNT(*) FILTER (WHERE feedback = 'negative') AS negative_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE feedback = 'positive') /
    NULLIF(COUNT(*) FILTER (WHERE feedback IS NOT NULL), 0),
    2
  ) AS positive_feedback_percent
FROM geostick_logs_data_qabothr
WHERE event_type = 'chat_request'
  AND is_complete = TRUE
GROUP BY DATE_TRUNC('week', timestamp)
ORDER BY week DESC;

COMMENT ON VIEW feedback_trends IS 'Weekly feedback trends showing engagement rate and satisfaction levels';
