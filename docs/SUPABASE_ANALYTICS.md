# 📊 Supabase Analytics Queries

Deze gids bevat handige SQL queries voor het analyseren van je GeoStick HR QA Bot data.

---

## 📋 Table of Contents

1. [Basic Queries](#basic-queries)
2. [Cost Analysis](#cost-analysis)
3. [Performance Metrics](#performance-metrics)
4. [User Behavior](#user-behavior)
5. [Error Analysis](#error-analysis)
6. [Content Filter Analysis](#content-filter-analysis)
7. [Session Analytics](#session-analytics)
8. [Daily/Weekly/Monthly Reports](#reports)

---

## Basic Queries

### Laatste 20 chat logs

```sql
SELECT
  timestamp,
  session_id,
  question,
  LEFT(answer, 100) || '...' AS answer_preview,
  language,
  total_cost,
  response_time_seconds
FROM "Geostick_Logs_Data_QABOTHR"
WHERE event_type = 'chat_request'
ORDER BY timestamp DESC
LIMIT 20;
```

### Totaal aantal requests per type

```sql
SELECT
  event_type,
  COUNT(*) AS total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM "Geostick_Logs_Data_QABOTHR"
GROUP BY event_type
ORDER BY total DESC;
```

### Requests per taal

```sql
SELECT
  language,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE event_type = 'chat_request') AS successful_chats,
  COUNT(*) FILTER (WHERE blocked = TRUE) AS blocked,
  COUNT(*) FILTER (WHERE event_type = 'error') AS errors
FROM "Geostick_Logs_Data_QABOTHR"
GROUP BY language
ORDER BY total_requests DESC;
```

---

## Cost Analysis

### Totale kosten vandaag

```sql
SELECT
  COUNT(*) AS total_requests,
  SUM(total_cost) AS total_cost_today,
  AVG(total_cost) AS avg_cost_per_request,
  SUM(embedding_cost) AS embedding_total,
  SUM(openai_cost) AS openai_total
FROM "Geostick_Logs_Data_QABOTHR"
WHERE DATE(timestamp) = CURRENT_DATE
  AND event_type = 'chat_request';
```

### Kosten per dag (laatste 30 dagen)

```sql
SELECT
  DATE(timestamp) AS date,
  COUNT(*) AS requests,
  ROUND(SUM(total_cost)::NUMERIC, 4) AS daily_cost,
  ROUND(AVG(total_cost)::NUMERIC, 6) AS avg_cost,
  ROUND(SUM(embedding_cost)::NUMERIC, 4) AS embedding_cost,
  ROUND(SUM(openai_cost)::NUMERIC, 4) AS openai_cost
FROM "Geostick_Logs_Data_QABOTHR"
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
  AND event_type = 'chat_request'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

### Top 10 duurste requests

```sql
SELECT
  timestamp,
  question,
  LEFT(answer, 100) || '...' AS answer_preview,
  total_cost,
  embedding_tokens,
  openai_total_tokens,
  response_time_seconds
FROM "Geostick_Logs_Data_QABOTHR"
WHERE event_type = 'chat_request'
ORDER BY total_cost DESC
LIMIT 10;
```

### Kosten per taal (laatste 7 dagen)

```sql
SELECT
  language,
  COUNT(*) AS requests,
  ROUND(SUM(total_cost)::NUMERIC, 4) AS total_cost,
  ROUND(AVG(total_cost)::NUMERIC, 6) AS avg_cost_per_request,
  ROUND(SUM(openai_cost)::NUMERIC, 4) AS openai_cost,
  ROUND(SUM(embedding_cost)::NUMERIC, 4) AS embedding_cost
FROM "Geostick_Logs_Data_QABOTHR"
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
  AND event_type = 'chat_request'
GROUP BY language
ORDER BY total_cost DESC;
```

### Maandelijkse kosten samenvatting

```sql
SELECT
  DATE_TRUNC('month', timestamp) AS month,
  COUNT(*) AS total_requests,
  ROUND(SUM(total_cost)::NUMERIC, 2) AS monthly_cost,
  ROUND(AVG(total_cost)::NUMERIC, 6) AS avg_per_request,
  ROUND(SUM(total_cost) / COUNT(DISTINCT DATE(timestamp))::NUMERIC, 2) AS avg_daily_cost
FROM "Geostick_Logs_Data_QABOTHR"
WHERE event_type = 'chat_request'
GROUP BY DATE_TRUNC('month', timestamp)
ORDER BY month DESC;
```

---

## Performance Metrics

### Gemiddelde response tijd per taal

```sql
SELECT
  language,
  COUNT(*) AS requests,
  ROUND(AVG(response_time_seconds)::NUMERIC, 2) AS avg_response_seconds,
  ROUND(MIN(response_time_seconds)::NUMERIC, 2) AS fastest,
  ROUND(MAX(response_time_seconds)::NUMERIC, 2) AS slowest,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_seconds)::NUMERIC, 2) AS median_seconds
FROM "Geostick_Logs_Data_QABOTHR"
WHERE event_type = 'chat_request'
  AND response_time_seconds IS NOT NULL
GROUP BY language
ORDER BY requests DESC;
```

### Trage requests (> 5 seconden)

```sql
SELECT
  timestamp,
  question,
  response_time_seconds,
  total_cost,
  embedding_tokens,
  openai_total_tokens,
  language
FROM "Geostick_Logs_Data_QABOTHR"
WHERE response_time_seconds > 5
  AND event_type = 'chat_request'
ORDER BY response_time_seconds DESC
LIMIT 20;
```

### Token usage statistieken

```sql
SELECT
  COUNT(*) AS requests,
  -- Pinecone
  ROUND(AVG(embedding_tokens)::NUMERIC, 0) AS avg_embedding_tokens,
  MAX(embedding_tokens) AS max_embedding_tokens,
  -- OpenAI
  ROUND(AVG(openai_input_tokens)::NUMERIC, 0) AS avg_openai_input,
  ROUND(AVG(openai_output_tokens)::NUMERIC, 0) AS avg_openai_output,
  ROUND(AVG(openai_total_tokens)::NUMERIC, 0) AS avg_openai_total,
  MAX(openai_total_tokens) AS max_openai_tokens
FROM "Geostick_Logs_Data_QABOTHR"
WHERE event_type = 'chat_request';
```

### Response tijd distributie

```sql
SELECT
  CASE
    WHEN response_time_seconds < 1 THEN '< 1s'
    WHEN response_time_seconds < 2 THEN '1-2s'
    WHEN response_time_seconds < 3 THEN '2-3s'
    WHEN response_time_seconds < 5 THEN '3-5s'
    WHEN response_time_seconds < 10 THEN '5-10s'
    ELSE '> 10s'
  END AS response_time_bucket,
  COUNT(*) AS requests,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM "Geostick_Logs_Data_QABOTHR"
WHERE event_type = 'chat_request'
  AND response_time_seconds IS NOT NULL
GROUP BY response_time_bucket
ORDER BY MIN(response_time_seconds);
```

---

## User Behavior

### Meest gestelde vragen (top 20)

```sql
SELECT
  question,
  COUNT(*) AS times_asked,
  ROUND(AVG(response_time_seconds)::NUMERIC, 2) AS avg_response_time,
  ROUND(AVG(total_cost)::NUMERIC, 6) AS avg_cost
FROM "Geostick_Logs_Data_QABOTHR"
WHERE event_type = 'chat_request'
GROUP BY question
HAVING COUNT(*) > 1
ORDER BY times_asked DESC
LIMIT 20;
```

### Conversatie lengtes

```sql
SELECT
  conversation_history_length,
  COUNT(*) AS requests,
  ROUND(AVG(response_time_seconds)::NUMERIC, 2) AS avg_response_time,
  ROUND(AVG(total_cost)::NUMERIC, 6) AS avg_cost
FROM "Geostick_Logs_Data_QABOTHR"
WHERE event_type = 'chat_request'
GROUP BY conversation_history_length
ORDER BY conversation_history_length;
```

### Peak hours (drukste tijden)

```sql
SELECT
  EXTRACT(HOUR FROM timestamp) AS hour_of_day,
  COUNT(*) AS requests,
  ROUND(AVG(response_time_seconds)::NUMERIC, 2) AS avg_response_time
FROM "Geostick_Logs_Data_QABOTHR"
WHERE event_type = 'chat_request'
GROUP BY hour_of_day
ORDER BY requests DESC;
```

### Requests per dag van de week

```sql
SELECT
  TO_CHAR(timestamp, 'Day') AS day_of_week,
  EXTRACT(DOW FROM timestamp) AS day_num,
  COUNT(*) AS requests,
  ROUND(AVG(total_cost)::NUMERIC, 6) AS avg_cost
FROM "Geostick_Logs_Data_QABOTHR"
WHERE event_type = 'chat_request'
GROUP BY day_of_week, day_num
ORDER BY day_num;
```

### Vraag lengte analyse

```sql
SELECT
  CASE
    WHEN LENGTH(question) < 20 THEN 'Very Short (< 20 chars)'
    WHEN LENGTH(question) < 50 THEN 'Short (20-50 chars)'
    WHEN LENGTH(question) < 100 THEN 'Medium (50-100 chars)'
    WHEN LENGTH(question) < 200 THEN 'Long (100-200 chars)'
    ELSE 'Very Long (> 200 chars)'
  END AS question_length_category,
  COUNT(*) AS requests,
  ROUND(AVG(response_time_seconds)::NUMERIC, 2) AS avg_response_time,
  ROUND(AVG(total_cost)::NUMERIC, 6) AS avg_cost
FROM "Geostick_Logs_Data_QABOTHR"
WHERE event_type = 'chat_request'
GROUP BY question_length_category
ORDER BY MIN(LENGTH(question));
```

---

## Error Analysis

### Error rate over tijd

```sql
SELECT
  DATE(timestamp) AS date,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE event_type = 'error') AS errors,
  ROUND(
    (COUNT(*) FILTER (WHERE event_type = 'error')::DECIMAL / COUNT(*)) * 100,
    2
  ) AS error_rate_percentage
FROM "Geostick_Logs_Data_QABOTHR"
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

### Error details

```sql
SELECT
  timestamp,
  question,
  error_details,
  response_time_seconds,
  language
FROM "Geostick_Logs_Data_QABOTHR"
WHERE event_type = 'error'
ORDER BY timestamp DESC
LIMIT 20;
```

### Error categorieën (als je error_details JSON is)

```sql
SELECT
  (error_details::JSON->>'category') AS error_category,
  (error_details::JSON->>'source') AS error_source,
  COUNT(*) AS occurrences
FROM "Geostick_Logs_Data_QABOTHR"
WHERE event_type = 'error'
  AND error_details IS NOT NULL
GROUP BY error_category, error_source
ORDER BY occurrences DESC;
```

---

## Content Filter Analysis

### Geblokkeerde requests

```sql
SELECT
  timestamp,
  question,
  language,
  conversation_history_length
FROM "Geostick_Logs_Data_QABOTHR"
WHERE blocked = TRUE
ORDER BY timestamp DESC
LIMIT 50;
```

### Content filter rate per taal

```sql
SELECT
  language,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE blocked = TRUE) AS blocked_count,
  ROUND(
    (COUNT(*) FILTER (WHERE blocked = TRUE)::DECIMAL / COUNT(*)) * 100,
    2
  ) AS blocked_percentage
FROM "Geostick_Logs_Data_QABOTHR"
GROUP BY language
ORDER BY blocked_count DESC;
```

---

## Session Analytics

### Aantal unieke sessies per dag

```sql
SELECT
  DATE(timestamp) AS date,
  COUNT(DISTINCT session_id) AS unique_sessions,
  COUNT(*) AS total_requests,
  ROUND(COUNT(*)::DECIMAL / COUNT(DISTINCT session_id), 2) AS avg_requests_per_session
FROM "Geostick_Logs_Data_QABOTHR"
WHERE session_id IS NOT NULL
  AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

### Langste sessies (meeste requests)

```sql
SELECT
  session_id,
  COUNT(*) AS requests_in_session,
  MIN(timestamp) AS session_start,
  MAX(timestamp) AS session_end,
  EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 60 AS session_duration_minutes,
  ROUND(SUM(total_cost)::NUMERIC, 4) AS session_total_cost
FROM "Geostick_Logs_Data_QABOTHR"
WHERE session_id IS NOT NULL
GROUP BY session_id
HAVING COUNT(*) > 5
ORDER BY requests_in_session DESC
LIMIT 20;
```

### Gemiddelde sessie statistieken

```sql
WITH session_stats AS (
  SELECT
    session_id,
    COUNT(*) AS requests,
    EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 60 AS duration_minutes,
    SUM(total_cost) AS session_cost
  FROM "Geostick_Logs_Data_QABOTHR"
  WHERE session_id IS NOT NULL
  GROUP BY session_id
)
SELECT
  COUNT(*) AS total_sessions,
  ROUND(AVG(requests)::NUMERIC, 2) AS avg_requests_per_session,
  ROUND(AVG(duration_minutes)::NUMERIC, 2) AS avg_session_duration_minutes,
  ROUND(AVG(session_cost)::NUMERIC, 6) AS avg_cost_per_session,
  ROUND(MAX(requests)::NUMERIC, 0) AS max_requests_in_session,
  ROUND(MAX(duration_minutes)::NUMERIC, 2) AS max_session_duration_minutes
FROM session_stats;
```

---

## Reports

### Dagelijks overzicht (gebruik de pre-built view)

```sql
SELECT
  date,
  language,
  total_requests,
  successful_requests,
  blocked_requests,
  error_requests,
  ROUND(avg_response_time_seconds::NUMERIC, 2) AS avg_response_seconds,
  ROUND(total_cost::NUMERIC, 4) AS daily_cost,
  ROUND(avg_cost_per_request::NUMERIC, 6) AS avg_cost,
  unique_sessions
FROM request_analytics
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, language;
```

### Wekelijks rapport

```sql
SELECT
  DATE_TRUNC('week', timestamp) AS week_start,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE event_type = 'chat_request') AS successful_chats,
  COUNT(*) FILTER (WHERE blocked = TRUE) AS blocked,
  COUNT(*) FILTER (WHERE event_type = 'error') AS errors,
  ROUND(AVG(response_time_seconds)::NUMERIC, 2) AS avg_response_time,
  ROUND(SUM(total_cost)::NUMERIC, 2) AS weekly_cost,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM "Geostick_Logs_Data_QABOTHR"
WHERE timestamp >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY week_start
ORDER BY week_start DESC;
```

### Maandelijks executive summary

```sql
SELECT
  DATE_TRUNC('month', timestamp) AS month,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE event_type = 'chat_request') AS successful_chats,
  COUNT(*) FILTER (WHERE blocked = TRUE) AS blocked,
  COUNT(*) FILTER (WHERE event_type = 'error') AS errors,
  ROUND(
    (COUNT(*) FILTER (WHERE event_type = 'error')::DECIMAL / COUNT(*)) * 100,
    2
  ) AS error_rate_percentage,
  ROUND(AVG(response_time_seconds) FILTER (WHERE event_type = 'chat_request')::NUMERIC, 2) AS avg_response_seconds,
  ROUND(SUM(total_cost)::NUMERIC, 2) AS monthly_cost,
  ROUND(AVG(total_cost) FILTER (WHERE event_type = 'chat_request')::NUMERIC, 6) AS avg_cost_per_request,
  COUNT(DISTINCT session_id) AS unique_sessions,
  ROUND(COUNT(*)::DECIMAL / COUNT(DISTINCT session_id), 2) AS avg_requests_per_session,
  COUNT(DISTINCT language) AS languages_used
FROM "Geostick_Logs_Data_QABOTHR"
WHERE timestamp >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY month
ORDER BY month DESC;
```

### Complete overzicht (all-time stats)

```sql
SELECT
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE event_type = 'chat_request') AS successful_chats,
  COUNT(*) FILTER (WHERE blocked = TRUE) AS blocked,
  COUNT(*) FILTER (WHERE event_type = 'error') AS errors,
  COUNT(DISTINCT session_id) AS unique_sessions,
  COUNT(DISTINCT language) AS languages_used,
  ROUND(SUM(total_cost)::NUMERIC, 2) AS all_time_cost,
  ROUND(AVG(total_cost) FILTER (WHERE event_type = 'chat_request')::NUMERIC, 6) AS avg_cost_per_request,
  ROUND(AVG(response_time_seconds) FILTER (WHERE event_type = 'chat_request')::NUMERIC, 2) AS avg_response_seconds,
  MIN(timestamp) AS first_request,
  MAX(timestamp) AS last_request
FROM "Geostick_Logs_Data_QABOTHR";
```

---

## 🔍 Advanced Queries

### Citation analysis (meest gebruikte documenten)

```sql
SELECT
  citation->>'file_name' AS document,
  COUNT(*) AS times_referenced,
  ARRAY_AGG(DISTINCT citation->>'page_numbers') AS page_numbers_used
FROM "Geostick_Logs_Data_QABOTHR",
  JSONB_ARRAY_ELEMENTS(citations) AS citation
WHERE event_type = 'chat_request'
  AND citations IS NOT NULL
GROUP BY document
ORDER BY times_referenced DESC
LIMIT 20;
```

### Cost efficiency: kosten per 100 requests

```sql
SELECT
  language,
  ROUND((SUM(total_cost) / COUNT(*)) * 100::NUMERIC, 2) AS cost_per_100_requests,
  COUNT(*) AS sample_size
FROM "Geostick_Logs_Data_QABOTHR"
WHERE event_type = 'chat_request'
GROUP BY language
ORDER BY cost_per_100_requests DESC;
```

---

## 💡 Tips

1. **Performance**: Gebruik WHERE filters op `timestamp` en `event_type` voor snellere queries
2. **Kosten**: Filter altijd op `event_type = 'chat_request'` bij cost analysis (errors hebben geen kosten)
3. **Indexes**: De database heeft indexes op timestamp, language, event_type voor snelle queries
4. **Export**: Gebruik `\copy` in psql of "Download as CSV" in Supabase UI voor exports
5. **Visualisatie**: Integreer met tools zoals Metabase, Grafana, of bouw een custom dashboard

---

**Made with ❤️ for GeoStick Analytics**
