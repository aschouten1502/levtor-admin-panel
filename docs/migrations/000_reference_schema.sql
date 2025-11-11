-- Supabase Schema for GeoStick Verkoop Bot Logging
-- This schema stores chat request logs without authentication
-- Run this in your Supabase SQL Editor

-- Table: request_logs
-- Stores detailed information about each chat request
CREATE TABLE IF NOT EXISTS request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

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

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for common queries
  CONSTRAINT valid_event_type CHECK (event_type IN ('chat_request', 'content_filter_triggered', 'error'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp ON request_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_language ON request_logs(language);
CREATE INDEX IF NOT EXISTS idx_request_logs_event_type ON request_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_request_logs_blocked ON request_logs(blocked);

-- Composite index for common analytics queries (date + language)
CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp_language
  ON request_logs(timestamp DESC, language);

-- Index for monitoring expensive requests
CREATE INDEX IF NOT EXISTS idx_request_logs_total_cost
  ON request_logs(total_cost DESC)
  WHERE total_cost > 0;

-- Index for tracking slow requests (performance monitoring)
CREATE INDEX IF NOT EXISTS idx_request_logs_response_time
  ON request_logs(response_time_seconds DESC)
  WHERE response_time_seconds IS NOT NULL;

-- Optional: Enable Row Level Security (RLS)
-- Since there's no authentication yet, we'll disable RLS for now
-- You can enable this later when adding user authentication
ALTER TABLE request_logs DISABLE ROW LEVEL SECURITY;

-- Create a view for analytics/reporting
CREATE OR REPLACE VIEW request_analytics AS
SELECT
  DATE_TRUNC('day', timestamp) AS date,
  language,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE blocked = TRUE) AS blocked_requests,
  COUNT(*) FILTER (WHERE event_type = 'error') AS error_requests,
  AVG(response_time_seconds) AS avg_response_time_seconds,
  SUM(pinecone_tokens) AS total_pinecone_tokens,
  SUM(openai_total_tokens) AS total_openai_tokens,
  SUM(pinecone_cost) AS total_pinecone_cost,
  SUM(openai_cost) AS total_openai_cost,
  SUM(total_cost) AS total_cost,
  AVG(total_cost) AS avg_cost_per_request
FROM request_logs
GROUP BY DATE_TRUNC('day', timestamp), language
ORDER BY date DESC, language;

-- Comment on table
COMMENT ON TABLE request_logs IS 'Stores detailed logs of all chat requests for analytics and monitoring';
COMMENT ON VIEW request_analytics IS 'Aggregated daily analytics by language';
