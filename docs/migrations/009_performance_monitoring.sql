-- Migration: Performance monitoring and metrics
-- Purpose: Track performance metrics with percentiles for SLA monitoring
-- Date: 2025-01-05

-- Hourly performance metrics view with percentiles
CREATE OR REPLACE VIEW performance_metrics AS
SELECT
  DATE_TRUNC('hour', timestamp) AS hour,
  COUNT(*) AS requests_per_hour,
  AVG(response_time_seconds)::DECIMAL(10, 2) AS avg_response_time,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_seconds)::DECIMAL(10, 2) AS median_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_seconds)::DECIMAL(10, 2) AS p95_response_time,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_seconds)::DECIMAL(10, 2) AS p99_response_time,
  MIN(response_time_seconds)::DECIMAL(10, 2) AS min_response_time,
  MAX(response_time_seconds)::DECIMAL(10, 2) AS max_response_time,
  AVG(openai_total_tokens)::INTEGER AS avg_tokens,
  AVG(citations_count)::DECIMAL(10, 2) AS avg_citations,
  COUNT(*) FILTER (WHERE event_type = 'error') AS error_count,
  COUNT(*) FILTER (WHERE is_complete = FALSE) AS incomplete_count,
  COUNT(*) FILTER (WHERE blocked = TRUE) AS blocked_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'error') / NULLIF(COUNT(*), 0), 2) AS error_rate_percent,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_complete = TRUE) / NULLIF(COUNT(*), 0), 2) AS completion_rate_percent
FROM geostick_logs_data_qabothr
WHERE response_time_seconds IS NOT NULL
  AND event_type = 'chat_request'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

COMMENT ON VIEW performance_metrics IS 'Hourly performance metrics with percentiles for SLA monitoring and performance analysis';

-- Daily performance summary
CREATE OR REPLACE VIEW daily_performance_summary AS
SELECT
  DATE_TRUNC('day', timestamp) AS date,
  COUNT(*) AS total_requests,
  COUNT(DISTINCT session_id) AS unique_sessions,
  AVG(response_time_seconds)::DECIMAL(10, 2) AS avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_seconds)::DECIMAL(10, 2) AS p95_response_time,
  MIN(response_time_seconds)::DECIMAL(10, 2) AS fastest_response,
  MAX(response_time_seconds)::DECIMAL(10, 2) AS slowest_response,
  COUNT(*) FILTER (WHERE response_time_seconds > 5) AS slow_requests_over_5s,
  COUNT(*) FILTER (WHERE response_time_seconds > 10) AS very_slow_requests_over_10s,
  ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'error') / NULLIF(COUNT(*), 0), 2) AS error_rate_percent,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_complete = TRUE) / NULLIF(COUNT(*), 0), 2) AS completion_rate_percent,
  ROUND(100.0 * COUNT(*) FILTER (WHERE feedback = 'positive') / NULLIF(COUNT(*) FILTER (WHERE feedback IS NOT NULL), 0), 2) AS satisfaction_percent
FROM geostick_logs_data_qabothr
WHERE event_type = 'chat_request'
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY date DESC;

COMMENT ON VIEW daily_performance_summary IS 'Daily performance overview with SLA metrics, error rates, and user satisfaction';
