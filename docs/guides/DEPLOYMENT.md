# Deployment Guide - HR Assistant AI

**Version**: 2.2.0
**Last Updated**: December 2024

Complete guide for deploying HR Assistant AI to production.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Vercel Deployment (Recommended)](#vercel-deployment)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Post-Deployment](#post-deployment)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Code & Dependencies

- [ ] `npm run build` succeeds locally
- [ ] `npm run lint` no errors
- [ ] All environment variables documented in `.env.example`
- [ ] No hardcoded API keys in code
- [ ] TypeScript errors resolved

### API Keys & Services

- [ ] **Supabase**: Production project created
- [ ] **Supabase**: Database schema installed (RAG + tenants)
- [ ] **Supabase**: pgvector extension enabled
- [ ] **OpenAI**: Production API key with sufficient credits
- [ ] **Cohere** (optional): API key for reranking

### Testing

- [ ] Chat functionality works locally
- [ ] Multiple languages tested (NL, EN, DE minimum)
- [ ] Error handling tested
- [ ] Citations appear correctly
- [ ] Costs tracked correctly
- [ ] Admin dashboard functional

### Security

- [ ] Service role keys server-side only
- [ ] No credentials committed to git
- [ ] Content filters tested
- [ ] Input validation implemented

---

## Vercel Deployment

**Recommended** for Next.js applications.

### Step 1: Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub/GitLab account
3. Verify email

### Step 2: Connect Project

#### Via CLI (fastest)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (first time)
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Project name? hr-assistant-ai
# - Auto-detect settings? Y
```

#### Via Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Project"
3. Select your Git repository
4. Framework: Next.js (auto-detected)
5. Click "Deploy"

### Step 3: Environment Variables

1. Go to project dashboard on Vercel
2. Click **Settings** > **Environment Variables**
3. Add variables:

| Name | Value | Required |
|------|-------|----------|
| `TENANT_ID` | `your-tenant-id` | Yes |
| `TENANT_NAME` | `Your Company` | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | Yes |
| `OPENAI_API_KEY` | `sk-...` | Yes |
| `COHERE_API_KEY` | `...` | No |
| `NEXT_PUBLIC_COMPANY_NAME` | `Your Company` | No |
| `NEXT_PUBLIC_PRIMARY_COLOR` | `#0066CC` | No |

**Note**: Check Production, Preview, and Development environments.

### Step 4: Redeploy

1. Go to **Deployments** tab
2. Click latest deployment
3. Click **"..."** > **"Redeploy"**
4. Wait for green checkmark

### Step 5: Verify

1. Open deployment URL
2. Ask a test question
3. Check browser console for errors
4. Verify Supabase logs are created

### Custom Domain (Optional)

1. Go to **Settings** > **Domains**
2. Add your domain
3. Update DNS records per Vercel instructions
4. Wait for SSL certificate

---

## Environment Variables

### Required Variables

```bash
# Tenant
TENANT_ID=acme-corp
TENANT_NAME=Acme Corporation

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_TABLE_NAME=chat_logs
STORAGE_BUCKET_NAME=acme-corp-hr-documents

# OpenAI
OPENAI_API_KEY=sk-...
```

### Optional Variables

```bash
# Reranking
COHERE_API_KEY=...

# Branding
NEXT_PUBLIC_COMPANY_NAME=Acme Corporation
NEXT_PUBLIC_PRIMARY_COLOR=#0066CC
NEXT_PUBLIC_LOGO_URL=/logo.svg
```

### Development vs Production

Use different values per environment:

**.env.local** (Development):
```bash
TENANT_ID=dev-tenant
OPENAI_API_KEY=sk-dev-...
```

**Vercel Production**:
```bash
TENANT_ID=prod-tenant
OPENAI_API_KEY=sk-prod-...
```

---

## Database Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Name: `hr-assistant-production`
4. Region: Closest to your users
5. Plan: Free tier for testing, Pro for production

### 2. Enable pgvector

In SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Run Migrations

Run these in order:

```sql
-- 1. RAG Schema (documents, chunks, embeddings)
-- Copy from: lib/supabase/migrations/rag_schema.sql

-- 2. Tenants table
-- Copy from: docs/migrations/MULTI_TENANT_SETUP.sql

-- 3. RAG details logging
-- Copy from: docs/migrations/014_add_rag_details.sql

-- 4. Document processing logs
-- Copy from: docs/migrations/015_document_processing_logs.sql
```

### 4. Verify Setup

```sql
-- Check tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected: tenants, documents, document_chunks, chat_logs, etc.

-- Check pgvector
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### 5. Get API Keys

1. Go to Settings > API
2. Copy `URL` and `service_role` key
3. Add to Vercel environment variables

---

## Post-Deployment

### Immediate Checks

1. **Smoke test**:
   - Open production URL
   - Ask 3 test questions (NL, EN, DE)
   - Verify citations appear
   - Check costs in console

2. **Database verification**:
   - Go to Supabase Table Editor
   - Open `chat_logs` table
   - Verify test questions logged

3. **Admin dashboard**:
   - Navigate to `/admin`
   - Verify tenant appears
   - Check statistics update

### First Week

**Daily**:
```sql
-- Check for errors
SELECT * FROM chat_logs
WHERE rag_details->>'error' IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Monitor costs
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS queries,
  ROUND(SUM(total_cost)::NUMERIC, 4) AS daily_cost
FROM chat_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Weekly**:
```sql
-- Most asked questions
SELECT
  question,
  COUNT(*) AS times_asked
FROM chat_logs
GROUP BY question
HAVING COUNT(*) > 1
ORDER BY times_asked DESC
LIMIT 20;
```

---

## Monitoring

### Key Metrics

1. **Usage**: Requests per day, unique sessions
2. **Costs**: Daily cost, cost per request
3. **Performance**: Response time (P50, P90, P95)
4. **Quality**: Error rate, content filter rate

### Using Admin Dashboard

Navigate to `/admin/costs` for:
- Per-tenant cost breakdown
- Daily trends
- Component breakdown (embedding, reranking, OpenAI)

### SQL Queries

See [SUPABASE_ANALYTICS.md](./SUPABASE_ANALYTICS.md) for detailed analytics queries.

---

## Troubleshooting

### Build Failures

**Error**: `Module not found`
```bash
# Verify tsconfig.json paths
# Check import statements
npm run build
```

**Error**: `Type error`
```bash
npm run lint
npx tsc --noEmit
# Fix all TypeScript errors
```

### Runtime Errors

**Error**: "Missing environment variables"
1. Check Vercel environment variables
2. Verify exact key names
3. Redeploy after adding

**Error**: "Failed to connect to Supabase"
1. Verify URL and key
2. Check Supabase project is active
3. Verify pgvector extension enabled

**Error**: "OpenAI rate limit"
1. Check OpenAI dashboard limits
2. Upgrade plan if needed
3. Consider implementing rate limiting

### Database Issues

**Error**: "relation does not exist"
```sql
-- Verify table exists
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- If missing, run migrations again
```

**Error**: "permission denied"
```sql
-- Check RLS is disabled for service role
ALTER TABLE chat_logs DISABLE ROW LEVEL SECURITY;
```

### Vector Search Issues

**No results returned**
1. Check documents are uploaded
2. Verify embeddings exist
3. Try lowering similarity threshold

```sql
-- Check document status
SELECT id, file_name, status, chunk_count
FROM documents
WHERE tenant_id = 'your-tenant';

-- Check embeddings
SELECT COUNT(*)
FROM document_chunks
WHERE tenant_id = 'your-tenant'
AND embedding IS NOT NULL;
```

---

## Rollback

### Vercel

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

Or via dashboard:
1. Go to Deployments
2. Click previous successful deployment
3. Click "Promote to Production"

---

## Cost Optimization

### Tips

1. **Embeddings**:
   - Use `text-embedding-3-small` (default)
   - Only re-embed when documents change

2. **OpenAI**:
   - Consider `gpt-4o-mini` for 90% cost reduction
   - Lower `max_tokens` if responses too long

3. **Reranking**:
   - Disable if not needed (`COHERE_API_KEY` not set)
   - Reduce `topK` for fewer reranking calls

4. **Supabase**:
   - Free tier: 500MB (enough for ~500k logs)
   - Archive old data (> 90 days)

---

## Security Checklist

- [ ] All API keys via environment variables
- [ ] `.env.local` not in git
- [ ] HTTPS enabled (automatic via Vercel)
- [ ] Service role key server-side only
- [ ] Content filters tested
- [ ] Error messages don't leak details
- [ ] Logs don't contain sensitive data
- [ ] Admin routes protected (consider adding auth)

---

## Multi-Tenant Deployment

For deploying multiple tenants:

### Option 1: Separate Vercel Projects

1. Create new Vercel project per client
2. Configure unique `TENANT_ID` and `STORAGE_BUCKET_NAME`
3. Deploy independently

### Option 2: Subdomain Routing

1. Deploy once with middleware
2. Configure subdomains: `acme.hr-assistant.vercel.app`
3. Middleware auto-detects tenant from subdomain

### Option 3: Shared Database

1. Single Supabase project
2. All tenants share `chat_logs` table
3. Filter by `tenant_id` column

See [CLAUDE.md](../CLAUDE.md) for detailed multi-tenant setup.

---

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Project Docs**: [README.md](../README.md)

---

**Deployment Version**: 2.2.0
**Status**: Production Ready
