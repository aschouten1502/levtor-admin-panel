-- Migration: Disable RLS for internal logging table
-- Purpose: Fix RLS security advisory - this is an internal server-side logging table
-- Date: 2025-01-05
-- Rationale: This table is only accessed server-side using service role key,
--            not exposed to client. RLS adds unnecessary overhead without security benefit.

-- Disable Row Level Security
ALTER TABLE geostick_logs_data_qabothr DISABLE ROW LEVEL SECURITY;

-- Add comment explaining RLS decision
COMMENT ON TABLE geostick_logs_data_qabothr IS 'Internal logging table for HR QA Bot - RLS disabled as this is server-side only with service role key. Never expose to client-side code.';

-- Note: If you later need to expose this table to clients (anon/authenticated roles),
-- re-enable RLS and add appropriate policies:
-- ALTER TABLE geostick_logs_data_qabothr ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "policy_name" ON geostick_logs_data_qabothr FOR SELECT TO authenticated USING (true);
