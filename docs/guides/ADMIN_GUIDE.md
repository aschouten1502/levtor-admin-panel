# Admin Dashboard Guide

**Version**: 2.2.0
**Last Updated**: December 2024

The Admin Dashboard provides a complete interface for managing tenants, branding, documents, costs, and chat logs.

---

## Accessing the Dashboard

Navigate to `/admin` in your browser:
- **Local**: http://localhost:3000/admin
- **Production**: https://your-domain.com/admin

> **Note**: The admin panel requires Supabase to be configured. Without it, you'll see a configuration warning.

---

## Dashboard Overview (`/admin`)

The main dashboard shows aggregate statistics:

- **Total Tenants**: Number of configured tenants
- **Active Tenants**: Tenants with `is_active = true`
- **Total Documents**: Sum of all uploaded documents
- **Total Chats**: Sum of all chat sessions
- **Total Cost**: Combined cost across all tenants

### Tenant Table

Lists all tenants with:
- Logo and name
- Type (Demo/Client)
- Status (Active/Inactive)
- Document count
- Chat count
- Total cost
- Manage link

---

## Tenant Management

### List Tenants (`/admin/tenants`)

View all tenants with filtering and sorting options.

### Create Tenant (`/admin/tenants/new`)

Required fields:
- **Tenant ID**: Unique identifier (lowercase, no spaces)
- **Name**: Display name
- **Short Name**: Abbreviated name

Optional fields:
- Description
- Logo URL
- Primary/Secondary colors
- Is Demo (for testing)
- Is Active

### Edit Tenant (`/admin/tenants/[id]`)

Full tenant editing with sections:

1. **Basic Info**: Name, description, status
2. **Branding**: Colors, logo, favicon
3. **Documents**: Upload/manage HR documents
4. **Settings**: Feature toggles

### Delete Tenant

Deletes tenant and all associated data:
- Documents and chunks
- Chat logs
- Branding settings

> **Warning**: This action is irreversible!

---

## Branding Editor (`/admin/branding/[tenantId]`)

Visual editor for tenant branding with live preview.

### Available Settings

**Colors**:
- Primary Color (buttons, links)
- Primary Dark (hover states)
- Secondary Color (accents)
- Background Color
- Text Color

**Logo & Icons**:
- Logo URL (header)
- Favicon URL
- App Icon URL (PWA)

**UI Texts** (per language):
- Welcome message
- Placeholder text
- Error messages
- Loading text

**Fun Facts**:
- Enable/disable
- Prefix text ("Wist je dat...")
- Facts list (JSON array)

### Live Preview

The right panel shows a real-time preview of:
- Header with logo
- Chat interface
- Color scheme
- Loading indicators

### Auto-Extract from URL

Click "Extract from URL" to automatically detect:
- Logo from website
- Brand colors
- Company name

---

## Document Management

### Upload Documents

Via tenant edit page (`/admin/tenants/[id]`):

1. Click "Upload Document"
2. Select PDF file
3. Choose chunking method:
   - **Fixed**: Simple splits
   - **Smart**: Paragraph-aware (recommended)
   - **Semantic**: AI-driven boundaries
4. Click "Upload"

Processing pipeline:
1. PDF parsing
2. Text extraction
3. Chunking
4. Embedding generation
5. Storage in Supabase

### View Documents

Document list shows:
- File name
- Upload date
- Status (Processing/Completed/Failed)
- Chunk count
- Actions (View/Delete)

### Delete Documents

Deleting a document removes:
- Document record
- All associated chunks
- Embeddings

---

## Chat Logs (`/admin/logs`)

### Log Viewer

View all chat interactions with:
- Question text
- Answer preview
- Language
- Response time
- Cost
- Timestamp

### Filters

- **Tenant**: Filter by tenant
- **Language**: Filter by language
- **Date Range**: Start/end dates
- **Status**: Complete/Incomplete

### Log Details

Click a log to see:
- Full question and answer
- Citations used
- RAG details (expandable)
- Cost breakdown
- Timing metrics

### RAG Details Viewer

Expandable section showing:
- Query translation info
- Search parameters
- Raw search results
- Reranking scores
- Token usage
- Timing breakdown

---

## Cost Analytics (`/admin/costs`)

### Overview

Aggregate cost metrics:
- Total cost (all time)
- Monthly cost
- Daily average
- Cost per query average

### Per-Tenant Breakdown

Table showing each tenant's:
- Document cost (embedding)
- Query cost (search + reranking)
- Chat cost (OpenAI)
- Total cost

### Cost Trends

Charts showing:
- Daily cost over time
- Cost by component
- Cost per tenant

### Export

Download cost data as CSV for accounting.

---

## API Routes

### Tenant APIs (`/api/admin/tenants`)

```typescript
// List all tenants
GET /api/admin/tenants

// Get single tenant
GET /api/admin/tenants/[id]

// Create tenant
POST /api/admin/tenants
Body: { id, name, short_name, ... }

// Update tenant
PUT /api/admin/tenants/[id]
Body: { name, description, ... }

// Delete tenant
DELETE /api/admin/tenants/[id]
```

### Branding APIs (`/api/admin/branding`)

```typescript
// Get tenant branding
GET /api/admin/branding/[tenantId]

// Update branding
PUT /api/admin/branding/[tenantId]
Body: { primary_color, logo_url, ... }

// Extract branding from URL
POST /api/admin/branding/extract-from-url
Body: { url: "https://example.com" }

// Translate UI texts
POST /api/admin/branding/translate
Body: { texts: {...}, targetLanguage: "nl" }
```

### Document APIs (`/api/admin/tenants/[id]/documents`)

```typescript
// List documents
GET /api/admin/tenants/[id]/documents

// Upload document
POST /api/admin/tenants/[id]/documents
FormData: { file: PDF }

// Delete document
DELETE /api/admin/tenants/[id]/documents/[docId]
```

### Log APIs (`/api/admin/logs`)

```typescript
// Query logs
GET /api/admin/logs?tenant_id=x&limit=100&offset=0

// Get single log with RAG details
GET /api/admin/logs/[id]
```

### Cost APIs (`/api/admin/costs`)

```typescript
// Get cost summary
GET /api/admin/costs?tenant_id=x&period=month

// Get cost breakdown
GET /api/admin/costs/breakdown?tenant_id=x
```

---

## Admin Services (`lib/admin/`)

### tenant-service.ts

```typescript
import {
  getAllTenantsWithStats,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  isSupabaseConfigured
} from '@/lib/admin/tenant-service';

// Get all tenants with statistics
const tenants = await getAllTenantsWithStats();
// Returns: TenantWithStats[]

// Create new tenant
await createTenant({
  id: 'acme-corp',
  name: 'Acme Corporation',
  short_name: 'Acme'
});
```

### branding-service.ts

```typescript
import {
  getTenantBranding,
  updateTenantBranding,
  extractBrandingFromUrl
} from '@/lib/admin/branding-service';

// Get branding
const branding = await getTenantBranding('acme-corp');

// Update branding
await updateTenantBranding('acme-corp', {
  primary_color: '#FF5733',
  logo_url: '/logo.svg'
});

// Auto-extract from website
const extracted = await extractBrandingFromUrl('https://acme.com');
```

### logs-service.ts

```typescript
import {
  getChatLogs,
  getChatLogById,
  getChatLogStats
} from '@/lib/admin/logs-service';

// Query logs
const logs = await getChatLogs({
  tenantId: 'acme-corp',
  limit: 100,
  offset: 0
});

// Get log with RAG details
const log = await getChatLogById(logId);
```

### cost-service.ts

```typescript
import {
  getCostSummary,
  getCostBreakdown,
  getTenantCosts
} from '@/lib/admin/cost-service';

// Get summary
const summary = await getCostSummary('acme-corp', 'month');

// Get detailed breakdown
const breakdown = await getCostBreakdown('acme-corp');
```

---

## Database Tables

### tenants

```sql
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  description TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0066CC',
  secondary_color TEXT,
  is_active BOOLEAN DEFAULT true,
  is_demo BOOLEAN DEFAULT false,
  fun_facts JSONB,
  ui_texts JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Useful Queries

```sql
-- Tenant statistics
SELECT
  t.id,
  t.name,
  COUNT(DISTINCT d.id) as document_count,
  COUNT(DISTINCT c.id) as chat_count,
  COALESCE(SUM(c.total_cost), 0) as total_cost
FROM tenants t
LEFT JOIN documents d ON d.tenant_id = t.id
LEFT JOIN chat_logs c ON c.tenant_id = t.id
GROUP BY t.id, t.name;

-- Daily costs per tenant
SELECT
  tenant_id,
  DATE(created_at) as date,
  COUNT(*) as queries,
  SUM(total_cost) as daily_cost
FROM chat_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY tenant_id, DATE(created_at)
ORDER BY date DESC;
```

---

## Security Considerations

1. **Admin routes are not protected by default**
   - Add authentication middleware for production
   - Consider Vercel Authentication or custom auth

2. **Service Role Key**
   - Never expose to client-side
   - Used only in server-side admin APIs

3. **Tenant Isolation**
   - All queries filter by `tenant_id`
   - Cross-tenant access is prevented at DB level

4. **Audit Logging**
   - Consider logging admin actions
   - Track who made changes and when

---

## Customization

### Adding Admin Pages

1. Create page in `app/admin/[feature]/page.tsx`
2. Add API route in `app/api/admin/[feature]/route.ts`
3. Create service in `lib/admin/[feature]-service.ts`
4. Add navigation link in admin layout

### Styling

Admin dashboard uses Tailwind CSS. Key classes:
- `bg-white rounded-xl border border-gray-200` - Cards
- `text-blue-600 hover:text-blue-800` - Links
- `bg-blue-600 text-white rounded-lg` - Primary buttons

### Adding Metrics

To add new metrics to dashboard:

1. Add query in `lib/admin/tenant-service.ts`
2. Update `TenantWithStats` type
3. Add display in `app/admin/page.tsx`
