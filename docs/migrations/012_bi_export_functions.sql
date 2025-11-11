-- Migration: BI and analytics export functions
-- Purpose: Functions to export data for external BI tools (Power BI, Tableau, etc.)
-- Date: 2025-01-05

-- Main export function for analytics data
CREATE OR REPLACE FUNCTION export_analytics_data(
  start_date DATE DEFAULT CURRENT_DATE - 30,
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  log_id UUID,
  session_id TEXT,
  timestamp TIMESTAMPTZ,
  date DATE,
  hour INTEGER,
  question TEXT,
  answer_length INTEGER,
  language VARCHAR,
  response_time_seconds NUMERIC,
  pinecone_cost NUMERIC,
  openai_cost NUMERIC,
  total_cost NUMERIC,
  openai_input_tokens INTEGER,
  openai_output_tokens INTEGER,
  openai_total_tokens INTEGER,
  citations_count INTEGER,
  conversation_depth INTEGER,
  feedback VARCHAR,
  feedback_comment TEXT,
  event_type VARCHAR,
  is_complete BOOLEAN,
  blocked BOOLEAN,
  has_error BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.session_id,
    l.timestamp,
    l.timestamp::DATE AS date,
    EXTRACT(HOUR FROM l.timestamp)::INTEGER AS hour,
    l.question,
    LENGTH(l.answer) AS answer_length,
    l.language,
    l.response_time_seconds,
    l.pinecone_cost,
    l.openai_cost,
    l.total_cost,
    l.openai_input_tokens,
    l.openai_output_tokens,
    l.openai_total_tokens,
    l.citations_count,
    l.conversation_history_length,
    l.feedback,
    l.feedback_comment,
    l.event_type,
    l.is_complete,
    l.blocked,
    (l.event_type = 'error') AS has_error
  FROM geostick_logs_data_qabothr l
  WHERE l.timestamp::DATE BETWEEN start_date AND end_date
  ORDER BY l.timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION export_analytics_data IS 'Export flattened analytics data for BI tools (Power BI, Tableau, etc.)';

-- Export function for session-level data
CREATE OR REPLACE FUNCTION export_session_data(
  start_date DATE DEFAULT CURRENT_DATE - 30,
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  session_id TEXT,
  session_start TIMESTAMPTZ,
  session_end TIMESTAMPTZ,
  session_duration_minutes NUMERIC,
  total_requests BIGINT,
  complete_requests BIGINT,
  incomplete_requests BIGINT,
  error_requests BIGINT,
  blocked_requests BIGINT,
  avg_response_time NUMERIC,
  total_cost NUMERIC,
  positive_feedback BIGINT,
  negative_feedback BIGINT,
  session_quality_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.session_id,
    sa.session_start,
    sa.session_end,
    sa.session_duration_minutes,
    sa.total_requests,
    (sa.total_requests - sa.incomplete_requests) AS complete_requests,
    sa.incomplete_requests,
    sa.error_requests,
    sa.blocked_requests,
    sa.avg_response_time,
    sa.session_total_cost,
    sa.positive_feedback,
    sa.negative_feedback,
    sa.session_quality_score
  FROM session_analytics sa
  WHERE sa.session_start::DATE BETWEEN start_date AND end_date
  ORDER BY sa.session_start DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION export_session_data IS 'Export session-level aggregated data for BI analysis';

-- Export function for document usage
CREATE OR REPLACE FUNCTION export_document_usage()
RETURNS TABLE (
  file_name TEXT,
  times_cited BIGINT,
  unique_sessions BIGINT,
  avg_response_time NUMERIC,
  positive_feedback_count BIGINT,
  negative_feedback_count BIGINT,
  positive_feedback_percent NUMERIC,
  first_cited TIMESTAMPTZ,
  last_cited TIMESTAMPTZ,
  days_in_use NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dua.file_name,
    dua.times_cited,
    dua.unique_sessions,
    dua.avg_response_time,
    dua.positive_feedback_count,
    dua.negative_feedback_count,
    dua.positive_feedback_percent,
    dua.first_cited,
    dua.last_cited,
    dua.days_in_use
  FROM document_usage_analytics dua
  ORDER BY dua.times_cited DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION export_document_usage IS 'Export document citation statistics for content analysis';

-- Export function for cost analysis
CREATE OR REPLACE FUNCTION export_cost_data(
  start_date DATE DEFAULT CURRENT_DATE - 30,
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  total_requests BIGINT,
  total_cost NUMERIC,
  openai_cost NUMERIC,
  pinecone_cost NUMERIC,
  avg_cost_per_request NUMERIC,
  cost_per_1k_tokens NUMERIC,
  total_tokens BIGINT,
  high_cost_requests BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ca.date::DATE,
    ca.total_requests,
    ca.daily_total_cost,
    ca.daily_openai_cost,
    ca.daily_pinecone_cost,
    ca.avg_cost_per_request,
    ca.cost_per_1k_tokens,
    ca.total_tokens_used,
    ca.high_cost_requests
  FROM cost_analytics ca
  WHERE ca.date::DATE BETWEEN start_date AND end_date
  ORDER BY ca.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION export_cost_data IS 'Export daily cost data for budget tracking and analysis';

-- Comprehensive dashboard data export
CREATE OR REPLACE FUNCTION export_dashboard_summary(days_back INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'overview', (
      SELECT json_build_object(
        'total_requests', COUNT(*),
        'unique_sessions', COUNT(DISTINCT session_id),
        'avg_response_time', ROUND(AVG(response_time_seconds)::NUMERIC, 2),
        'total_cost', ROUND(SUM(total_cost)::NUMERIC, 2),
        'completion_rate', ROUND(100.0 * COUNT(*) FILTER (WHERE is_complete = TRUE) / NULLIF(COUNT(*), 0), 2),
        'error_rate', ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'error') / NULLIF(COUNT(*), 0), 2),
        'feedback_rate', ROUND(100.0 * COUNT(*) FILTER (WHERE feedback IS NOT NULL) / NULLIF(COUNT(*), 0), 2),
        'satisfaction_rate', ROUND(100.0 * COUNT(*) FILTER (WHERE feedback = 'positive') / NULLIF(COUNT(*) FILTER (WHERE feedback IS NOT NULL), 0), 2)
      )
      FROM geostick_logs_data_qabothr
      WHERE timestamp > NOW() - (days_back || ' days')::INTERVAL
    ),
    'daily_trends', (
      SELECT json_agg(
        json_build_object(
          'date', date,
          'requests', total_requests,
          'cost', daily_total_cost,
          'avg_response_time', avg_cost_per_request
        ) ORDER BY date DESC
      )
      FROM cost_analytics
      WHERE date > CURRENT_DATE - days_back
      LIMIT 30
    ),
    'top_documents', (
      SELECT json_agg(
        json_build_object(
          'name', file_name,
          'citations', times_cited,
          'satisfaction', positive_feedback_percent
        ) ORDER BY times_cited DESC
      )
      FROM document_usage_analytics
      LIMIT 10
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION export_dashboard_summary IS 'Export comprehensive dashboard data as JSON for frontend visualization';
