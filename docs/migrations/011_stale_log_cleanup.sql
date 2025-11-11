-- Migration: Stale log identification and cleanup functions
-- Purpose: Functions to identify and handle incomplete logs that will never be updated
-- Date: 2025-01-05

-- Function to identify stale incomplete logs
CREATE OR REPLACE FUNCTION identify_stale_logs(age_hours INTEGER DEFAULT 24)
RETURNS TABLE (
  id UUID,
  timestamp TIMESTAMPTZ,
  question TEXT,
  update_attempts INTEGER,
  age_hours NUMERIC,
  completion_error TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.timestamp,
    l.question,
    l.update_attempts,
    EXTRACT(EPOCH FROM (NOW() - l.timestamp)) / 3600 AS age_hours,
    l.completion_error
  FROM geostick_logs_data_qabothr l
  WHERE l.is_complete = FALSE
    AND l.timestamp < NOW() - (age_hours || ' hours')::INTERVAL
  ORDER BY l.timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION identify_stale_logs IS 'Identifies incomplete logs older than specified hours that may need attention';

-- Function to mark stale logs as failed
CREATE OR REPLACE FUNCTION mark_stale_logs_failed(age_hours INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE geostick_logs_data_qabothr
  SET
    completion_error = COALESCE(
      completion_error,
      'Marked as failed - no update received within ' || age_hours || ' hours'
    ),
    is_complete = TRUE  -- Mark as complete so they don't keep appearing in reports
  WHERE is_complete = FALSE
    AND timestamp < NOW() - (age_hours || ' hours')::INTERVAL;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_stale_logs_failed IS 'Marks stale incomplete logs as failed after specified hours';

-- View to monitor stale logs
CREATE OR REPLACE VIEW stale_logs_monitor AS
SELECT
  DATE_TRUNC('day', timestamp) AS date,
  COUNT(*) AS stale_log_count,
  AVG(EXTRACT(EPOCH FROM (NOW() - timestamp)) / 3600)::DECIMAL(10, 2) AS avg_age_hours,
  MIN(timestamp) AS oldest_log,
  MAX(timestamp) AS newest_log,
  ARRAY_AGG(id ORDER BY timestamp DESC) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - timestamp)) / 3600 > 48) AS critical_stale_ids
FROM geostick_logs_data_qabothr
WHERE is_complete = FALSE
  AND timestamp < NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY date DESC;

COMMENT ON VIEW stale_logs_monitor IS 'Monitors incomplete logs older than 24 hours that need attention';

-- Function to get summary of incomplete logs
CREATE OR REPLACE FUNCTION incomplete_logs_summary()
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  oldest_timestamp TIMESTAMPTZ,
  avg_age_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN EXTRACT(EPOCH FROM (NOW() - l.timestamp)) / 3600 < 1 THEN '< 1 hour'
      WHEN EXTRACT(EPOCH FROM (NOW() - l.timestamp)) / 3600 < 24 THEN '1-24 hours'
      WHEN EXTRACT(EPOCH FROM (NOW() - l.timestamp)) / 3600 < 168 THEN '1-7 days'
      ELSE '> 7 days'
    END AS status,
    COUNT(*) AS count,
    MIN(l.timestamp) AS oldest_timestamp,
    AVG(EXTRACT(EPOCH FROM (NOW() - l.timestamp)) / 3600)::DECIMAL(10, 2) AS avg_age_hours
  FROM geostick_logs_data_qabothr l
  WHERE l.is_complete = FALSE
  GROUP BY status
  ORDER BY
    CASE status
      WHEN '< 1 hour' THEN 1
      WHEN '1-24 hours' THEN 2
      WHEN '1-7 days' THEN 3
      ELSE 4
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION incomplete_logs_summary IS 'Provides a summary of incomplete logs grouped by age';

-- Optional: Create a scheduled job to automatically mark stale logs
-- Uncomment and adjust the schedule as needed
-- This requires the pg_cron extension to be enabled

/*
-- Enable pg_cron extension (run once as superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 2 AM UTC
SELECT cron.schedule(
  'mark-stale-logs-daily',
  '0 2 * * *',  -- At 02:00 every day
  $$SELECT mark_stale_logs_failed(48)$$  -- Mark logs older than 48 hours as failed
);

COMMENT ON EXTENSION pg_cron IS 'Scheduled job to automatically mark stale logs as failed';
*/
