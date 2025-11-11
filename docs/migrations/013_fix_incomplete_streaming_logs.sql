-- =============================================
-- Migration 013: Fix Incomplete Streaming Logs
-- =============================================
-- This migration fixes logs that were stuck in "Streaming in progress..."
-- state due to streaming errors that were not properly logged.
--
-- Problem: When streaming failed, the error catch block didn't update
-- the Supabase log, leaving it with placeholder data forever.
--
-- Solution: Mark these logs as failed with appropriate error message.

-- Step 1: Update logs that are stuck in streaming state
-- These have "[Streaming in progress...]" as answer and no tokens/timing data
UPDATE geostick_logs_data_qabothr
SET
  answer = '[STREAMING FAILED]: Connection or streaming error occurred during response generation',
  is_complete = true,
  completion_error = 'Streaming never completed - connection lost or client disconnected',
  updated_at = NOW()
WHERE
  answer = '[Streaming in progress...]'
  AND response_time_ms = 0
  AND openai_total_tokens = 0
  AND is_complete = false;

-- Step 2: Get count of fixed logs
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % incomplete streaming logs', fixed_count;
END $$;

-- Step 3: Also fix any logs that have real answers but is_complete is still false
-- This can happen if the update call succeeded but is_complete wasn't properly set
UPDATE geostick_logs_data_qabothr
SET
  is_complete = true,
  updated_at = NOW()
WHERE
  answer != '[Streaming in progress...]'
  AND answer NOT LIKE '[STREAMING%'
  AND is_complete = false
  AND response_time_ms > 0
  AND openai_total_tokens > 0;

-- Step 4: Get count of fixed complete logs
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % logs with complete data but is_complete=false', fixed_count;
END $$;

-- Step 5: Verify the fix
SELECT
  COUNT(*) FILTER (WHERE is_complete = true) as complete_logs,
  COUNT(*) FILTER (WHERE is_complete = false) as incomplete_logs,
  COUNT(*) FILTER (WHERE answer LIKE '[STREAMING FAILED]%') as failed_streaming_logs
FROM geostick_logs_data_qabothr;

COMMENT ON TABLE geostick_logs_data_qabothr IS
'Chat request logs with streaming completion tracking.
Updated 2025-11-05: Fixed incomplete streaming logs from connection failures.';
