# Database Migrations

All Supabase database migrations are stored here in chronological order.

## Migration List

| # | File | Description | Date |
|---|------|-------------|------|
| 001 | `001_initial_schema.sql` | Initial database schema with logs table | 2025-11-03 |
| 002 | `002_add_monitoring_columns.sql` | Add monitoring columns (updated_at, update_attempts, is_complete) | 2025-11-05 |
| 003 | `003_disable_rls_for_internal_use.sql` | Disable RLS for internal service use | 2025-11-05 |
| 004 | `004_fix_analytics_view_security.sql` | Fix SECURITY DEFINER view issues | 2025-11-05 |
| 005 | `005_session_analytics.sql` | Session analytics view with quality scoring | 2025-11-05 |
| 006 | `006_document_analytics.sql` | Document usage analytics | 2025-11-05 |
| 007 | `007_feedback_analytics.sql` | Enhanced feedback analytics with trends | 2025-11-05 |
| 008 | `008_citation_extraction_view.sql` | Citation extraction and flattening views | 2025-11-05 |
| 009 | `009_performance_monitoring.sql` | Performance monitoring with percentiles | 2025-11-05 |
| 010 | `010_cost_analytics.sql` | Cost analytics and optimization insights | 2025-11-05 |
| 011 | `011_stale_log_cleanup.sql` | Stale log cleanup functions | 2025-11-05 |
| 012 | `012_bi_export_functions.sql` | BI export functions | 2025-11-05 |
| 013 | `013_fix_incomplete_streaming_logs.sql` | Fix incomplete streaming logs from connection failures | 2025-11-05 |

## How to Apply Migrations

### Using Supabase MCP (Recommended)

Migrations are automatically applied via the Supabase MCP server when using Claude Code.

### Manual Application

1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of the migration file
3. Execute the SQL
4. Verify results in the database

## Migration Guidelines

- Never modify existing migration files
- Always create new migration files for changes
- Use sequential numbering (001, 002, etc.)
- Include descriptive comments in SQL
- Test migrations in development first

## See Also

- [MIGRATION_GUIDE.md](../guides/MIGRATION_GUIDE.md) - Detailed migration implementation guide
- [SUPABASE.md](../SUPABASE.md) - Database schema documentation
- [SUPABASE_ANALYTICS.md](../SUPABASE_ANALYTICS.md) - Analytics query examples
