# Multi-Tenant Architecture Guide

Complete technical guide for the multi-tenant HR Assistant AI platform.

---

## Overview

This HR Assistant AI is **fully multi-tenant**, designed to be deployed for multiple clients simultaneously. Each client gets their own isolated instance with:

- ✅ Unique Pinecone Assistant (with client-specific HR documents)
- ✅ Custom branding (company name, colors, logo)
- ✅ Isolated data storage (tenant-based logging)
- ✅ Independent deployment (separate Vercel project OR shared infrastructure)

**Cost per Client**: €8-53/month (Pinecone + OpenAI + optional Supabase/Vercel)

---

## Architecture Strategies

### Strategy 1: Separate Vercel Projects (RECOMMENDED)

**Best for**: 1-50 clients, complete isolation

```
Client A → Vercel Project A → .env.local (Client A config)
                            → Pinecone Assistant A
                            → Supabase (shared or separate)

Client B → Vercel Project B → .env.local (Client B config)
                            → Pinecone Assistant B
                            → Supabase (shared or separate)
```

**Pros**:
- Complete isolation (security, performance, stability)
- Independent scaling per client
- Client-specific domains (e.g., `hr.acme-corp.com`)
- Different deployment schedules
- Easy rollback per client
- Simple troubleshooting

**Cons**:
- Manual updates across projects (can be automated with CI/CD)
- More Vercel projects (free tier: 3 projects)

**Recommended when**:
- Starting with 1-20 clients
- Clients want complete isolation
- Different update schedules needed
- White-label deployments

---

### Strategy 2: Shared Infrastructure with Tenant Routing

**Best for**: 50+ clients, SaaS model

```
All Clients → Single Vercel Deployment
           → Tenant routing by domain/subdomain
           → Each client: unique Pinecone Assistant
           → Shared Supabase with tenant_id isolation
```

**Pros**:
- Centralized updates (deploy once → all clients updated)
- Lower infrastructure cost
- Easier maintenance
- Shared caching and performance optimizations

**Cons**:
- More complex setup (tenant routing, domain management)
- Shared resources (one client's spike affects others)
- Requires advanced DevOps

**Recommended when**:
- Managing 50+ clients
- Building SaaS product
- Centralized management priority
- Tight budget per client

---

## Multi-Tenant Components

### 1. Tenant Identification

**Environment Variable**:
```bash
TENANT_ID=acme-corp           # Unique identifier (lowercase-with-dashes)
TENANT_NAME=Acme Corporation  # Human-readable name
```

**Used for**:
- Database row isolation (`tenant_id` column)
- Analytics filtering
- Cost tracking per client
- Logging and monitoring

**Configuration**: [`lib/supabase/config.ts`](lib/supabase/config.ts)

---

### 2. Pinecone Assistants (Per-Tenant)

Each client has their **own Pinecone Assistant** with their own documents.

**Configuration**:
```bash
PINECONE_API_KEY=pcsk_xxxxx                     # Shared API key (or per-tenant)
PINECONE_ASSISTANT_NAME=acme-corp-hr-assistant  # Unique per client
```

**Naming Convention**:
```
{tenant-id}-hr-assistant
```

**Examples**:
- `acme-corp-hr-assistant`
- `techstart-hr-assistant`
- `demo-client-hr-assistant`

**Implementation**: [`lib/pinecone.ts`](lib/pinecone.ts)

**Benefits**:
- Complete document isolation
- Client uploads their own HR docs
- No cross-contamination of data
- Independent scaling

---

### 3. Supabase Database (Multi-Tenant)

#### Option A: Shared Database with Tenant ID (RECOMMENDED)

**Single Supabase project for all clients**

**Configuration**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://shared.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
SUPABASE_TABLE_NAME=chat_logs    # Generic table name
TENANT_ID=acme-corp              # Client identifier
```

**Schema**:
```sql
CREATE TABLE chat_logs (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR(100),  -- Client identifier
  question TEXT,
  answer TEXT,
  -- ... other columns
);

-- Index for tenant isolation
CREATE INDEX idx_tenant_timestamp
  ON chat_logs(tenant_id, timestamp DESC);
```

**Querying**:
```sql
-- Get all logs for specific client
SELECT * FROM chat_logs
WHERE tenant_id = 'acme-corp'
ORDER BY timestamp DESC;

-- Analytics per tenant
SELECT
  tenant_id,
  COUNT(*) as total_requests,
  SUM(total_cost) as total_cost
FROM chat_logs
GROUP BY tenant_id;
```

**Pros**:
- Single Supabase project (lower cost)
- Easier analytics across tenants
- Centralized backups

**Cons**:
- Requires careful query filtering
- Shared database resources

**Implementation**: [`lib/supabase/supabase-client.ts`](lib/supabase/supabase-client.ts)

---

#### Option B: Separate Supabase Projects

**One Supabase project per client**

**Configuration**:
```bash
# Client A
NEXT_PUBLIC_SUPABASE_URL=https://acme-corp.supabase.co
SUPABASE_TABLE_NAME=chat_logs

# Client B
NEXT_PUBLIC_SUPABASE_URL=https://techstart.supabase.co
SUPABASE_TABLE_NAME=chat_logs
```

**Pros**:
- Complete data isolation
- Easier GDPR compliance
- Independent backups and scaling

**Cons**:
- Higher cost (€25/month per project)
- More complex to manage
- Harder to aggregate analytics

---

### 4. PDF Storage (Per-Tenant Buckets)

Each client has their **own Supabase Storage bucket** for HR PDFs.

**Configuration**:
```bash
STORAGE_BUCKET_NAME=acme-corp-hr-documents
```

**Naming Convention**:
```
{tenant-id}-hr-documents
```

**Examples**:
- `acme-corp-hr-documents`
- `techstart-hr-documents`
- `demo-client-hr-documents`

**Setup**:
1. Create bucket in Supabase dashboard
2. Set to **PUBLIC** (required for citation links)
3. Upload client PDFs
4. Configure environment variable

**Implementation**: [`lib/pdf-urls.ts`](lib/pdf-urls.ts)

**Benefits**:
- Document isolation
- Client controls their own PDFs
- Independent access policies

---

### 5. Branding (Per-Tenant)

#### Option A: Environment Variables (RECOMMENDED)

**Configuration**:
```bash
NEXT_PUBLIC_COMPANY_NAME=Acme Corporation
NEXT_PUBLIC_COMPANY_SHORT=Acme HR
NEXT_PUBLIC_PRIMARY_COLOR=#FF5733
NEXT_PUBLIC_PRIMARY_DARK=#D64525
```

**Pros**:
- No code changes per client
- Easy to manage in Vercel dashboard
- Instant redeployment with new branding

**Implementation**: [`lib/branding.config.ts`](lib/branding.config.ts)

---

#### Option B: Edit Config File

**Direct edit**:
```typescript
// lib/branding.config.ts
export const BRANDING = {
  companyName: "Acme Corporation",
  shortName: "Acme HR",
  colors: {
    primary: "#FF5733",
    primaryDark: "#D64525",
  },
  // ...
};
```

**Pros**:
- Type-safe configuration
- IDE autocomplete

**Cons**:
- Requires code changes per client
- Needs rebuild and redeploy

---

## Deployment Workflows

### Workflow 1: New Client with Separate Project

**Time**: 30-45 minutes

1. **Pinecone**: Create assistant, upload docs
2. **Supabase** (optional): Create bucket, upload PDFs
3. **Vercel**: Create new project
4. **Environment**: Set all variables
5. **Test**: Verify functionality
6. **Domain**: Configure custom domain (optional)

**See**: [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md)

---

### Workflow 2: Update Existing Client

**Time**: 5-10 minutes

1. Update documents in Pinecone Assistant
2. Replace PDFs in Supabase Storage bucket
3. Update environment variables (if needed)
4. Vercel auto-redeploys on git push

---

### Workflow 3: Bulk Update All Clients

**Time**: Varies (automated with CI/CD)

**Manual**:
1. Update main codebase
2. Push to git
3. Trigger deployment on each Vercel project

**Automated** (CI/CD):
1. Update main codebase
2. Push to git
3. GitHub Actions triggers deployments for all projects

**Example GitHub Action** (`.github/workflows/deploy-all.yml`):
```yaml
name: Deploy All Clients
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        project: [acme-corp, techstart, demo-client]
    steps:
      - uses: actions/checkout@v2
      - run: vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_PROJECT_ID: ${{ secrets[format('VERCEL_PROJECT_{0}', matrix.project)] }}
```

---

## Cost Analysis

### Per-Client Monthly Costs

| Service | Shared | Per-Client | Notes |
|---------|--------|------------|-------|
| **Pinecone** | - | $5-10 | Based on usage (context retrieval) |
| **OpenAI** | - | $3-8 | ~$0.003-0.010 per question |
| **Supabase** | $0-25 | $0-25 | Free tier or Pro ($25/mo) |
| **Vercel** | $20 | $0-20 | Free tier (3 projects) or Pro ($20/mo) |
| **Total** | $20-55 | $8-53 | Per client per month |

**Optimization Tips**:
1. **Shared Supabase**: Use 1 project for all clients → $25 total (not per client)
2. **Vercel Pro**: Unlimited projects → $20 total (not per client)
3. **OpenAI**: Use `gpt-4o-mini` → 90% cost reduction
4. **Pinecone**: Lower `topK` → fewer tokens per request

**Example**: 10 clients with shared infrastructure
- Pinecone: 10 × $5 = $50/mo
- OpenAI: 10 × $3 = $30/mo
- Supabase: $25/mo (shared)
- Vercel: $20/mo (shared)
- **Total**: $125/mo = **$12.50 per client**

---

## Configuration Files

| File | Purpose | Multi-Tenant Ready |
|------|---------|-------------------|
| [`lib/supabase/config.ts`](lib/supabase/config.ts) | Tenant/database config | ✅ YES |
| [`lib/supabase/supabase-client.ts`](lib/supabase/supabase-client.ts) | Dynamic table names | ✅ YES |
| [`lib/supabase/types.ts`](lib/supabase/types.ts) | Generic table types | ✅ YES |
| [`lib/pdf-urls.ts`](lib/pdf-urls.ts) | Dynamic bucket names | ✅ YES |
| [`lib/branding.config.ts`](lib/branding.config.ts) | Env var overrides | ✅ YES |
| [`lib/prompts.ts`](lib/prompts.ts) | Generic prompts | ✅ YES |
| [`.env.example`](.env.example) | Template with all vars | ✅ YES |

---

## Environment Variables Reference

### Required for All Deployments

```bash
# Tenant identification
TENANT_ID=acme-corp
TENANT_NAME=Acme Corporation

# Pinecone (per-tenant assistant)
PINECONE_API_KEY=pcsk_xxxxx
PINECONE_ASSISTANT_NAME=acme-corp-hr-assistant

# OpenAI (shared or per-tenant)
OPENAI_API_KEY=sk-proj-xxxxx
```

### Optional: Supabase Logging

```bash
# Database connection
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Multi-tenant configuration
SUPABASE_TABLE_NAME=chat_logs              # Generic table for shared DB
STORAGE_BUCKET_NAME=acme-corp-hr-documents # Per-tenant bucket
```

### Optional: Branding Overrides

```bash
NEXT_PUBLIC_COMPANY_NAME=Acme Corporation
NEXT_PUBLIC_COMPANY_SHORT=Acme HR
NEXT_PUBLIC_PRIMARY_COLOR=#FF5733
NEXT_PUBLIC_PRIMARY_DARK=#D64525
NEXT_PUBLIC_TAGLINE=Your AI HR Assistant
```

---

## Security & Isolation

### Data Isolation

**Pinecone**:
- ✅ Each client = separate assistant
- ✅ Documents never mixed
- ✅ Context retrieval scoped to client

**Supabase** (Shared Database):
- ✅ `tenant_id` column on all rows
- ✅ Application-level filtering
- ⚠️ Optional: Row-level security (RLS)

**Supabase** (Separate Databases):
- ✅ Complete database isolation
- ✅ No shared data whatsoever

**Storage**:
- ✅ Per-tenant buckets
- ✅ Public access (required for citations)
- ✅ Client uploads their own PDFs

### API Key Management

**Recommended Approach**:
- **Shared OpenAI key**: Use 1 key for all clients (easier billing)
- **Shared Pinecone key**: Use 1 key for all clients
- **Separate Supabase projects** (if using Option B): Per-client keys

**Alternative** (higher security):
- Per-client OpenAI keys (tracked separately)
- Per-client Pinecone keys

### GDPR Compliance

**Data Storage**:
- All chat logs stored with `tenant_id`
- Easy to delete all client data: `DELETE FROM chat_logs WHERE tenant_id = 'acme-corp'`

**Data Retention**:
- Utility function: `cleanup_old_logs(90)` (delete logs older than 90 days)
- Configurable per client if needed

**Data Export**:
```sql
-- Export all client data
SELECT * FROM chat_logs
WHERE tenant_id = 'acme-corp'
ORDER BY timestamp DESC;
```

---

## Monitoring & Analytics

### Per-Tenant Metrics

**Query** (`docs/migrations/MULTI_TENANT_SETUP.sql`):
```sql
SELECT * FROM get_tenant_stats('acme-corp');
```

**Returns**:
- Total requests
- Total cost
- Average response time
- First/last request timestamps

### Cross-Tenant Analytics

```sql
SELECT
  tenant_id,
  COUNT(*) as total_requests,
  ROUND(SUM(total_cost)::numeric, 4) as total_cost,
  ROUND(AVG(response_time_seconds)::numeric, 3) as avg_response_time
FROM chat_logs
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
  AND is_complete = true
GROUP BY tenant_id
ORDER BY total_requests DESC;
```

### Cost Tracking Dashboard

**Recommended**: Export to CSV and visualize in Excel/Google Sheets

```sql
-- Monthly costs per tenant
SELECT
  tenant_id,
  DATE_TRUNC('month', timestamp) as month,
  SUM(total_cost) as monthly_cost
FROM chat_logs
GROUP BY tenant_id, month
ORDER BY month DESC, monthly_cost DESC;
```

---

## Troubleshooting Multi-Tenant Issues

### Tenant Logs Not Showing

**Symptoms**: Logs appear in console but not in Supabase

**Causes**:
1. `TENANT_ID` not set
2. Table name mismatch

**Solutions**:
1. Verify `TENANT_ID` in Vercel environment variables
2. Check `SUPABASE_TABLE_NAME=chat_logs`
3. Verify table exists in Supabase

---

### Wrong Tenant Data Showing

**Symptoms**: Client A sees Client B's data

**This should NEVER happen**. If it does:

**Immediate Action**:
1. Check Vercel environment variables (separate projects should have different `TENANT_ID`)
2. Verify Pinecone assistant names are unique
3. Check storage bucket names

**Prevention**:
- Always use separate Vercel projects
- Never share Pinecone assistants
- Use tenant naming convention consistently

---

### Cross-Tenant Cost Attribution

**Symptoms**: Can't determine which client caused high costs

**Solutions**:
1. Ensure `TENANT_ID` is set for all clients
2. Query Supabase logs filtered by `tenant_id`
3. Use OpenAI API keys with usage tracking (optional)

---

## Scaling Strategies

### 1-10 Clients
- ✅ Separate Vercel projects
- ✅ Shared Supabase database
- ✅ Manual deployments
- ✅ Cost: ~$10-20/client/month

### 10-50 Clients
- ✅ Separate Vercel projects
- ✅ Shared Supabase database
- ✅ Automated deployments (CI/CD)
- ✅ Monitoring dashboard
- ✅ Cost: ~$8-15/client/month

### 50-200 Clients
- ⚠️ Consider shared infrastructure (Strategy 2)
- ✅ Tenant routing by domain
- ✅ Advanced caching
- ✅ Load balancing
- ✅ Cost: ~$5-10/client/month

### 200+ Clients
- ⚠️ SaaS architecture required
- ✅ Multi-region deployment
- ✅ Advanced analytics
- ✅ Dedicated support team
- ✅ Cost: ~$3-8/client/month

---

## Future Enhancements

### Short-Term (Next 3-6 months)

1. **Admin Dashboard**
   - Manage all tenants from single UI
   - View costs per client
   - Update branding without redeployment

2. **Automated Provisioning**
   - API endpoint to create new client
   - Automatically creates Pinecone assistant
   - Automatically creates Supabase bucket
   - Automatically deploys to Vercel

3. **White-Label Customization**
   - Upload custom logos via UI
   - Live branding preview
   - Per-tenant feature toggles

### Long-Term (6-12 months)

1. **Multi-Language Document Support**
   - Automatically translate HR docs
   - Language detection per client region

2. **Advanced Analytics**
   - Usage patterns per tenant
   - Predictive cost modeling
   - Performance benchmarks

3. **Self-Service Portal**
   - Clients upload their own documents
   - Clients configure branding
   - Clients view analytics

---

## Conclusion

This HR Assistant AI is **production-ready for multi-tenant deployments**.

**Key Advantages**:
- ✅ Complete tenant isolation (Pinecone, Storage, optional Database)
- ✅ Flexible deployment (separate projects OR shared infrastructure)
- ✅ Cost-effective ($8-53/client/month)
- ✅ Scalable (1-200+ clients)
- ✅ Easy to deploy (30-45 minutes per client)

**Recommended Approach**:
- Start with **Separate Vercel Projects** (Strategy 1)
- Use **Shared Supabase Database** with `tenant_id`
- Automate deployments after 10-20 clients
- Migrate to **Shared Infrastructure** (Strategy 2) after 50+ clients

**See Also**:
- [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md) - Step-by-step deployment guide
- [`.env.example`](.env.example) - Complete environment variable reference
- [`docs/migrations/MULTI_TENANT_SETUP.sql`](docs/migrations/MULTI_TENANT_SETUP.sql) - Database schema
- [`lib/supabase/config.ts`](lib/supabase/config.ts) - Multi-tenant configuration

---

**Questions?** Contact Levtor support team.
