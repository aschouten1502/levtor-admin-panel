-- ========================================
-- MIGRATION 001: Initial Schema
-- ========================================
-- Created: 2025-01-29
-- Description: Creates the main logging table for GeoStick HR QA Bot
--
-- This migration creates:
-- - Geostick_Logs_Data_QABOTHR table for storing all chat logs
-- - Indexes for performance
-- - Analytics view for reporting
--
-- Run this in your Supabase SQL Editor
-- ========================================

-- Drop existing objects if they exist (for re-running migration)
DROP VIEW IF EXISTS request_analytics;
DROP TABLE IF EXISTS "Geostick_Logs_Data_QABOTHR";

-- ========================================
-- TABLE: Geostick_Logs_Data_QABOTHR
-- ========================================
-- Stores detailed information about each chat request
CREATE TABLE "Geostick_Logs_Data_QABOTHR" (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session Tracking
  session_id VARCHAR(255),

  -- Timing
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_time_seconds DECIMAL(10, 2),
  response_time_ms INTEGER,

  -- Request/Response Data
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'nl',

  -- Pinecone Usage
  pinecone_tokens INTEGER DEFAULT 0,
  pinecone_cost DECIMAL(10, 6) DEFAULT 0,
  snippets_used INTEGER DEFAULT 0,

  -- OpenAI Usage
  openai_input_tokens INTEGER DEFAULT 0,
  openai_output_tokens INTEGER DEFAULT 0,
  openai_total_tokens INTEGER DEFAULT 0,
  openai_cost DECIMAL(10, 6) DEFAULT 0,

  -- Combined Costs
  total_cost DECIMAL(10, 6) DEFAULT 0,

  -- Citations & Context
  citations_count INTEGER DEFAULT 0,
  citations JSONB,

  -- Conversation Context
  conversation_history_length INTEGER DEFAULT 0,

  -- Error Tracking
  blocked BOOLEAN DEFAULT FALSE,
  event_type VARCHAR(50) DEFAULT 'chat_request',
  error_details TEXT,

  -- Feedback (to be implemented)
  user_feedback VARCHAR(20), -- 'helpful', 'not_helpful', null
  feedback_comment TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_event_type CHECK (event_type IN ('chat_request', 'content_filter_triggered', 'error')),
  CONSTRAINT valid_feedback CHECK (user_feedback IS NULL OR user_feedback IN ('helpful', 'not_helpful'))
);

-- ========================================
-- INDEXES for Performance
-- ========================================

-- Most common query: recent logs by timestamp
CREATE INDEX idx_logs_timestamp ON "Geostick_Logs_Data_QABOTHR"(timestamp DESC);

-- For session tracking queries
CREATE INDEX idx_logs_session_id ON "Geostick_Logs_Data_QABOTHR"(session_id) WHERE session_id IS NOT NULL;

-- For filtering by language
CREATE INDEX idx_logs_language ON "Geostick_Logs_Data_QABOTHR"(language);

-- For filtering by event type (errors, content filters)
CREATE INDEX idx_logs_event_type ON "Geostick_Logs_Data_QABOTHR"(event_type);

-- For filtering blocked requests
CREATE INDEX idx_logs_blocked ON "Geostick_Logs_Data_QABOTHR"(blocked) WHERE blocked = TRUE;

-- Composite index for date + language analytics
CREATE INDEX idx_logs_timestamp_language ON "Geostick_Logs_Data_QABOTHR"(timestamp DESC, language);

-- For monitoring expensive requests
CREATE INDEX idx_logs_total_cost ON "Geostick_Logs_Data_QABOTHR"(total_cost DESC) WHERE total_cost > 0;

-- For tracking slow requests (performance monitoring)
CREATE INDEX idx_logs_response_time ON "Geostick_Logs_Data_QABOTHR"(response_time_seconds DESC) WHERE response_time_seconds IS NOT NULL;

-- For feedback analysis
CREATE INDEX idx_logs_feedback ON "Geostick_Logs_Data_QABOTHR"(user_feedback) WHERE user_feedback IS NOT NULL;

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================
-- Disabled for now since there's no user authentication
-- Enable this later when adding user auth
ALTER TABLE "Geostick_Logs_Data_QABOTHR" DISABLE ROW LEVEL SECURITY;

-- ========================================
-- ANALYTICS VIEW
-- ========================================
-- Aggregated daily statistics by language
CREATE OR REPLACE VIEW request_analytics AS
SELECT
  DATE_TRUNC('day', timestamp) AS date,
  language,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE blocked = TRUE) AS blocked_requests,
  COUNT(*) FILTER (WHERE event_type = 'error') AS error_requests,
  COUNT(*) FILTER (WHERE event_type = 'chat_request' AND blocked = FALSE) AS successful_requests,
  AVG(response_time_seconds) FILTER (WHERE event_type = 'chat_request') AS avg_response_time_seconds,
  SUM(pinecone_tokens) AS total_pinecone_tokens,
  SUM(openai_total_tokens) AS total_openai_tokens,
  SUM(pinecone_cost) AS total_pinecone_cost,
  SUM(openai_cost) AS total_openai_cost,
  SUM(total_cost) AS total_cost,
  AVG(total_cost) FILTER (WHERE event_type = 'chat_request') AS avg_cost_per_request,
  COUNT(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL) AS unique_sessions,
  -- Feedback metrics
  COUNT(*) FILTER (WHERE user_feedback = 'helpful') AS helpful_feedback_count,
  COUNT(*) FILTER (WHERE user_feedback = 'not_helpful') AS not_helpful_feedback_count,
  ROUND(
    (COUNT(*) FILTER (WHERE user_feedback = 'helpful')::DECIMAL /
     NULLIF(COUNT(*) FILTER (WHERE user_feedback IS NOT NULL), 0)) * 100,
    2
  ) AS helpful_percentage
FROM "Geostick_Logs_Data_QABOTHR"
GROUP BY DATE_TRUNC('day', timestamp), language
ORDER BY date DESC, language;

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON TABLE "Geostick_Logs_Data_QABOTHR" IS 'Stores detailed logs of all chat requests for GeoStick HR QA Bot - includes analytics, costs, and feedback tracking';
COMMENT ON VIEW request_analytics IS 'Aggregated daily analytics by language with feedback metrics';
COMMENT ON COLUMN "Geostick_Logs_Data_QABOTHR".session_id IS 'Browser session identifier for tracking user sessions';
COMMENT ON COLUMN "Geostick_Logs_Data_QABOTHR".citations IS 'JSON array of source documents and page numbers used for the answer';
COMMENT ON COLUMN "Geostick_Logs_Data_QABOTHR".user_feedback IS 'User feedback: helpful, not_helpful, or null (no feedback yet)';
COMMENT ON COLUMN "Geostick_Logs_Data_QABOTHR".feedback_comment IS 'Optional text comment from user explaining their feedback';

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 001 completed successfully!';
  RAISE NOTICE '📊 Created table: Geostick_Logs_Data_QABOTHR';
  RAISE NOTICE '📈 Created view: request_analytics';
  RAISE NOTICE '🔍 Created % indexes', (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'Geostick_Logs_Data_QABOTHR');
END $$;
