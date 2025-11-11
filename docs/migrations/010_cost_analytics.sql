-- Migration: Cost analytics and optimization insights
-- Purpose: Track costs breakdown, trends, and identify optimization opportunities
-- Date: 2025-01-05

-- Daily cost analysis view
CREATE OR REPLACE VIEW cost_analytics AS
SELECT
  DATE_TRUNC('day', timestamp) AS date,
  COUNT(*) AS total_requests,
  SUM(pinecone_cost)::DECIMAL(10, 6) AS daily_pinecone_cost,
  SUM(openai_cost)::DECIMAL(10, 6) AS daily_openai_cost,
  SUM(total_cost)::DECIMAL(10, 6) AS daily_total_cost,
  AVG(total_cost)::DECIMAL(10, 6) AS avg_cost_per_request,
  (SUM(total_cost) / NULLIF(SUM(openai_total_tokens), 0) * 1000)::DECIMAL(10, 6) AS cost_per_1k_tokens,
  -- Cost breakdown percentages
  ROUND(100.0 * SUM(pinecone_cost) / NULLIF(SUM(total_cost), 0), 2) AS pinecone_cost_percent,
  ROUND(100.0 * SUM(openai_cost) / NULLIF(SUM(total_cost), 0), 2) AS openai_cost_percent,
  -- High-cost analysis
  COUNT(*) FILTER (WHERE total_cost > 0.10) AS high_cost_requests,
  MAX(total_cost)::DECIMAL(10, 6) AS max_request_cost,
  MIN(total_cost)::DECIMAL(10, 6) AS min_request_cost,
  -- Token usage
  SUM(openai_total_tokens) AS total_tokens_used,
  AVG(openai_total_tokens)::INTEGER AS avg_tokens_per_request,
  MAX(openai_total_tokens) AS max_tokens_single_request
FROM geostick_logs_data_qabothr
WHERE event_type = 'chat_request'
  AND is_complete = TRUE
  AND total_cost IS NOT NULL
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY date DESC;

COMMENT ON VIEW cost_analytics IS 'Daily cost breakdown and optimization metrics for budget tracking';

-- Monthly cost summary for budget planning
CREATE OR REPLACE VIEW monthly_cost_summary AS
SELECT
  DATE_TRUNC('month', timestamp) AS month,
  COUNT(*) AS total_requests,
  COUNT(DISTINCT session_id) AS unique_sessions,
  SUM(total_cost)::DECIMAL(10, 2) AS monthly_total_cost,
  SUM(openai_cost)::DECIMAL(10, 2) AS monthly_openai_cost,
  SUM(pinecone_cost)::DECIMAL(10, 2) AS monthly_pinecone_cost,
  AVG(total_cost)::DECIMAL(10, 6) AS avg_cost_per_request,
  (SUM(total_cost) / NULLIF(COUNT(DISTINCT session_id), 0))::DECIMAL(10, 2) AS avg_cost_per_session,
  -- Extrapolate to full month if partial
  CASE
    WHEN DATE_TRUNC('month', CURRENT_DATE) = DATE_TRUNC('month', timestamp)
    THEN (SUM(total_cost) / EXTRACT(DAY FROM CURRENT_DATE) * DATE_PART('days', DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - DATE_TRUNC('month', CURRENT_DATE)))::DECIMAL(10, 2)
    ELSE SUM(total_cost)::DECIMAL(10, 2)
  END AS projected_monthly_cost
FROM geostick_logs_data_qabothr
WHERE event_type = 'chat_request'
  AND is_complete = TRUE
GROUP BY DATE_TRUNC('month', timestamp)
ORDER BY month DESC;

COMMENT ON VIEW monthly_cost_summary IS 'Monthly cost summary with projections for budget planning';

-- Cost per document view (which documents are most expensive to query)
CREATE OR REPLACE VIEW cost_per_document AS
SELECT
  ref->'file'->>'name' AS file_name,
  COUNT(DISTINCT l.id) AS times_cited,
  AVG(l.total_cost)::DECIMAL(10, 6) AS avg_cost_per_citation,
  SUM(l.total_cost)::DECIMAL(10, 4) AS total_cost_attributed,
  AVG(l.openai_total_tokens)::INTEGER AS avg_tokens,
  MIN(l.timestamp) AS first_used,
  MAX(l.timestamp) AS last_used
FROM geostick_logs_data_qabothr l,
  LATERAL jsonb_array_elements(l.citations) AS citation,
  LATERAL jsonb_array_elements(citation->'references') AS ref
WHERE l.citations IS NOT NULL
  AND ref->'file'->>'name' IS NOT NULL
  AND l.total_cost IS NOT NULL
  AND l.is_complete = TRUE
GROUP BY ref->'file'->>'name'
ORDER BY total_cost_attributed DESC;

COMMENT ON VIEW cost_per_document IS 'Cost analysis by document to identify expensive resources';
