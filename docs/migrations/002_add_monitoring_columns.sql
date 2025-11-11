-- Migration: Add monitoring and tracking columns
-- Purpose: Track update attempts, completion status, and errors for streaming logs
-- Date: 2025-01-05

-- Add monitoring columns to track log completion and update attempts
ALTER TABLE geostick_logs_data_qabothr
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS update_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completion_error TEXT NULL;

-- Create index for finding incomplete logs (critical for monitoring)
CREATE INDEX IF NOT EXISTS idx_logs_incomplete
  ON geostick_logs_data_qabothr(is_complete, timestamp DESC)
  WHERE is_complete = FALSE;

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_geostick_logs_updated_at ON geostick_logs_data_qabothr;
CREATE TRIGGER update_geostick_logs_updated_at
  BEFORE UPDATE ON geostick_logs_data_qabothr
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN geostick_logs_data_qabothr.updated_at IS 'Timestamp of last update (auto-updated by trigger)';
COMMENT ON COLUMN geostick_logs_data_qabothr.update_attempts IS 'Number of times update was attempted for streaming logs';
COMMENT ON COLUMN geostick_logs_data_qabothr.is_complete IS 'Whether log entry is fully populated (not placeholder)';
COMMENT ON COLUMN geostick_logs_data_qabothr.completion_error IS 'Error message if log completion failed';

-- Mark existing complete logs (where answer is not placeholder)
UPDATE geostick_logs_data_qabothr
SET is_complete = TRUE
WHERE answer IS NOT NULL
  AND answer != '[Streaming in progress...]'
  AND openai_total_tokens > 0;

-- Mark existing incomplete logs
UPDATE geostick_logs_data_qabothr
SET is_complete = FALSE
WHERE answer = '[Streaming in progress...]'
  OR openai_total_tokens = 0
  OR response_time_seconds = 0;
