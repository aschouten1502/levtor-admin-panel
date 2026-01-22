# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HR Assistant AI** (v2.3.0) is a **production-ready multi-tenant** Next.js 15 application that implements a multi-language HR assistant using RAG (Retrieval-Augmented Generation). The bot answers questions about HR policies, procedures, and employee benefits based on uploaded documentation.

### Key Features (v2.3)

- **Supabase pgvector RAG**: Full vector search with embeddings (replaced Pinecone in v2.1)
- **Admin Dashboard**: Complete tenant management, branding, costs, and analytics
- **Customer Portal**: Self-service portal for end-clients with product management
- **Multi-Tenant Architecture**: Isolated data per client with middleware-based detection
- **12 Language Support**: With automatic query translation for non-English queries
- **Smart Chunking**: Multiple strategies (fixed, smart, semantic) for document processing
- **Cohere Reranking**: Optional reranking for improved search relevance
- **Rate Limiting**: Built-in protection against API abuse
- **Comprehensive Logging**: `rag_details` JSONB with 200+ fields for debugging

**Current Version**: v2.3.0 - Multi-tenant SaaS platform with Customer Portal

## Development Commands

```bash
# Development
npm install              # Install dependencies
npm run dev              # Start dev server at http://localhost:3000
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
npx tsc --noEmit         # TypeScript type checking
```

## Architecture Overview

### RAG Flow (v2.2 - Supabase pgvector)

```
User Question
    ↓
middleware.ts → Tenant Detection (subdomain/query/header/env)
    ↓
API Route (app/api/chat/route.ts)
    ↓
lib/rag/context.ts → Supabase pgvector search
    ├── Query Translation (non-English → English)
    ├── Embedding Generation (OpenAI text-embedding-3-small)
    ├── Vector Search (pgvector cosine similarity)
    └── Cohere Reranking (optional)
    ↓
Generate System Prompt (lib/prompts.ts) → Inject context + guardrails
    ↓
OpenAI GPT-4o → Streaming response
    ↓
Response + Citations → Frontend
    ↓
Log to Supabase (rag_details JSONB) → Analytics
```

### Directory Structure (Key Modules)

```
app/
├── api/
│   ├── chat/route.ts           # Main chat endpoint
│   ├── admin/                  # Admin API routes
│   │   ├── tenants/            # Tenant CRUD
│   │   ├── branding/           # Branding management
│   │   ├── logs/               # Chat log queries
│   │   └── costs/              # Cost analytics
│   ├── rag/                    # Document management
│   │   ├── upload/             # PDF upload & processing
│   │   └── documents/          # Document listing
│   └── tenant/                 # Tenant config API
├── admin/                      # Admin dashboard pages
│   ├── page.tsx                # Dashboard overview
│   ├── tenants/                # Tenant management
│   ├── branding/               # Branding editor
│   ├── logs/                   # Chat logs viewer
│   └── costs/                  # Cost analytics
├── providers/
│   └── TenantProvider.tsx      # Client-side tenant context
├── ClientLayout.tsx            # Suspense boundary for tenant
└── components/                 # UI components

lib/
├── rag/                        # RAG System (11 files)
│   ├── index.ts                # Main exports
│   ├── types.ts                # Type definitions (550+ lines)
│   ├── context.ts              # Context retrieval
│   ├── embeddings.ts           # OpenAI embeddings
│   ├── chunking.ts             # Document chunking
│   ├── processor.ts            # Document upload pipeline
│   ├── reranker.ts             # Cohere reranking
│   ├── query-translator.ts     # Multi-language support
│   ├── semantic-chunker.ts     # Advanced chunking
│   ├── structure-detector.ts   # Document structure analysis
│   └── metadata-generator.ts   # AI metadata generation
├── admin/                      # Admin Services (9 files)
│   ├── tenant-service.ts       # Tenant CRUD
│   ├── branding-service.ts     # Branding management
│   ├── storage-service.ts      # Supabase Storage
│   ├── logs-service.ts         # Chat log queries
│   ├── cost-service.ts         # Cost tracking
│   └── ...
├── supabase/
│   ├── supabase-client.ts      # Database operations
│   ├── config.ts               # Multi-tenant config
│   └── types.ts                # Database types
├── tenant-config.ts            # Tenant config with caching
├── openai.ts                   # LLM streaming
├── prompts.ts                  # System prompt generation
├── logging.ts                  # Structured logging
├── pdf-urls.ts                 # PDF URL generation
└── branding.config.ts          # Branding defaults

middleware.ts                   # Tenant detection middleware
```

---

## RAG System (lib/rag/)

The RAG system is built entirely on Supabase with pgvector for vector search. This replaced Pinecone in v2.1 for 99.6% cost savings.

### Core Components

**[lib/rag/context.ts](lib/rag/context.ts)** - Context Retrieval
```typescript
import { retrieveContext, checkRAGHealth } from '@/lib/rag';

const result = await retrieveContext({
  query: "What is the vacation policy?",
  tenantId: "acme-corp",
  topK: 5,
  language: "nl"
});
// Returns: { contextText, citations, tokenUsage, cost, ragDetails }
```

**[lib/rag/embeddings.ts](lib/rag/embeddings.ts)** - Embedding Generation
- Model: `text-embedding-3-small` (default) or `text-embedding-3-large`
- Cost: $0.02 per 1M tokens (vs $5 for Pinecone)
- Batch processing for documents

**[lib/rag/chunking.ts](lib/rag/chunking.ts)** - Document Chunking
- **Fixed chunking**: Simple character-based splits
- **Smart chunking**: Paragraph and sentence aware
- **Semantic chunking**: AI-driven topic boundaries
- Configurable overlap and chunk sizes

**[lib/rag/reranker.ts](lib/rag/reranker.ts)** - Cohere Reranking
- Model: `rerank-multilingual-v3.0`
- Optional: Enabled via `COHERE_API_KEY`
- Improves relevance for top results

**[lib/rag/query-translator.ts](lib/rag/query-translator.ts)** - Multi-Language
- Detects non-English queries
- Translates to English for vector search
- Maintains original language in response

### Document Processing Pipeline

```typescript
import { processDocument } from '@/lib/rag';

const result = await processDocument({
  file: pdfFile,
  tenantId: "acme-corp",
  chunkingMethod: "smart",
  generateMetadata: true
});
// Creates: document record + chunks with embeddings
```

### RAG Types (lib/rag/types.ts)

Key types exported:
- `Document`, `DocumentChunk`, `SearchResult`
- `ContextSnippet`, `Citation`, `ContextResponse`
- `RAGDetails`, `RAGQueryDetails`, `RAGSearchDetails`
- `RAGCostBreakdown`, `RAGTimingBreakdown`
- `ProcessingResult`, `RAGHealthCheck`

---

## Admin Dashboard (app/admin/)

Full-featured admin panel for tenant management.

### Routes

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard overview with stats |
| `/admin/tenants` | List all tenants |
| `/admin/tenants/new` | Create new tenant |
| `/admin/tenants/[id]` | Edit tenant details |
| `/admin/branding/[tenantId]` | Branding editor with live preview |
| `/admin/logs` | Chat logs viewer |
| `/admin/logs/[tenantId]` | Tenant-specific logs |
| `/admin/costs` | Cost analytics dashboard |

### Admin Services (lib/admin/)

**[lib/admin/tenant-service.ts](lib/admin/tenant-service.ts)**
```typescript
import { getAllTenantsWithStats, createTenant, updateTenant } from '@/lib/admin/tenant-service';

const tenants = await getAllTenantsWithStats();
// Returns: tenants with document_count, chat_count, total_cost
```

**[lib/admin/branding-service.ts](lib/admin/branding-service.ts)**
- Update tenant branding (colors, logo, texts)
- Extract branding from URL (auto-detect)
- Translate UI texts to multiple languages

**[lib/admin/cost-service.ts](lib/admin/cost-service.ts)**
- Per-tenant cost summaries
- Daily/weekly/monthly breakdowns
- Cost per component (embedding, reranking, OpenAI)

**[lib/admin/logs-service.ts](lib/admin/logs-service.ts)**
- Query chat logs with filters
- View RAG details for debugging
- Export capabilities

---

## Middleware & Tenant Detection

**[middleware.ts](middleware.ts)** - Automatic tenant detection

### Detection Priority (first match wins)

1. **Subdomain**: `acme.localhost:3000` → `tenant_id = "acme"`
2. **Query parameter**: `?tenant=acme`
3. **Header**: `X-Tenant-ID: acme`
4. **Environment variable**: `TENANT_ID` (fallback)

### Usage in API Routes

```typescript
export async function POST(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');
  // tenantId is automatically set by middleware
}
```

### TenantProvider (Client-Side)

**[app/providers/TenantProvider.tsx](app/providers/TenantProvider.tsx)**
```typescript
import { useTenant } from '@/app/providers/TenantProvider';

function MyComponent() {
  const { tenant, isLoading } = useTenant();
  // Access tenant config: tenant.name, tenant.primary_color, etc.
}
```

---

## Multi-Tenant Setup

### Quick Start for New Client

1. **Copy `.env.example` to `.env.local`**

2. **Set tenant identification**:
   ```bash
   TENANT_ID=acme-corp
   TENANT_NAME=Acme Corporation
   ```

3. **Configure Supabase** (REQUIRED for v2.2+):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=...
   SUPABASE_TABLE_NAME=chat_logs
   STORAGE_BUCKET_NAME=acme-corp-hr-documents
   ```

4. **Configure OpenAI**:
   ```bash
   OPENAI_API_KEY=sk-...
   ```

5. **Optional - Cohere Reranking**:
   ```bash
   COHERE_API_KEY=...
   ```

6. **Configure Branding**:
   ```bash
   NEXT_PUBLIC_COMPANY_NAME=Acme Corporation
   NEXT_PUBLIC_PRIMARY_COLOR=#FF5733
   ```

### Database Setup

Run migrations in Supabase SQL Editor:

```sql
-- 1. Core RAG schema (documents, chunks, embeddings)
-- See: lib/supabase/migrations/rag_schema.sql

-- 2. Chat logs with rag_details
-- See: docs/migrations/014_add_rag_details.sql

-- 3. Document processing logs
-- See: docs/migrations/015_document_processing_logs.sql

-- 4. Tenants table
-- See: docs/migrations/MULTI_TENANT_SETUP.sql
```

### Automated Setup with Claude Code

Use `CLIENT_CONFIG.md` workflow:
```bash
cp CLIENT_CONFIG.example.md CLIENT_CONFIG.md
# Edit with client details, then:
# "Configureer deze client op basis van CLIENT_CONFIG.md"
```

---

## Core Modules

### API Routes

**[app/api/chat/route.ts](app/api/chat/route.ts)** - Main Chat Endpoint
- Receives: `message`, `conversationHistory`, `language`, `sessionId`
- Uses `lib/rag/context.ts` for retrieval (NOT Pinecone)
- Streams OpenAI response
- Logs with `rag_details` JSONB

**[app/api/rag/upload/route.ts](app/api/rag/upload/route.ts)** - Document Upload
```typescript
POST /api/rag/upload
FormData: { file: PDF, tenant_id: string }
// Processes PDF → chunks → embeddings → storage
```

**[app/api/rag/documents/route.ts](app/api/rag/documents/route.ts)** - Document Management
```typescript
GET /api/rag/documents?tenant_id=acme-corp
DELETE /api/rag/documents?tenant_id=acme-corp&id=doc_123
```

**[app/api/tenant/route.ts](app/api/tenant/route.ts)** - Tenant Config
```typescript
GET /api/tenant?tenant=acme-corp
// Returns full tenant config with branding
```

### Support Modules

**[lib/openai.ts](lib/openai.ts)** - LLM Response Generation
- `generateStreamingAnswer()`: Streams GPT-4o responses
- Model: `gpt-4o` with temperature 0.7
- Cost tracking: Input $2.50/1M, Output $10/1M tokens

**[lib/prompts.ts](lib/prompts.ts)** - System Prompt Engineering
- `generateSystemPrompt()`: Context-aware prompts per language
- Strict guardrails: No hallucination, language-specific responses
- Rejects non-HR queries

**[lib/logging.ts](lib/logging.ts)** - Structured Logging
- `logSuccessfulRequest()`: Request summaries
- `categorizeError()`: Error classification
- Emoji prefixes: 🚀 start, ✅ success, ❌ error, 💰 costs

**[lib/tenant-config.ts](lib/tenant-config.ts)** - Tenant Configuration
- `getTenantConfig()`: Fetch with 5-min cache
- `getTenantCssVariables()`: CSS injection
- Fallback to environment variables

**[lib/supabase/supabase-client.ts](lib/supabase/supabase-client.ts)** - Database Client
- `logChatRequest()`: Create log with `rag_details`
- `updateChatRequestWithRetry()`: Exponential backoff (3 attempts)
- `validateTenant()`: Check tenant is active

---

## Database Schema

### Tables

**`tenants`** - Tenant configuration
```sql
id, name, short_name, description, logo_url, primary_color,
secondary_color, is_active, is_demo, fun_facts, ui_texts,
created_at, updated_at
```

**`documents`** - Document metadata
```sql
id, tenant_id, file_name, file_path, file_size, mime_type,
status, chunk_count, created_at, updated_at
```

**`document_chunks`** - Chunks with embeddings
```sql
id, document_id, tenant_id, content, embedding (vector),
chunk_index, metadata, created_at
```

**`chat_logs`** - Chat history with RAG details
```sql
id, tenant_id, question, answer, language, session_id,
citations, rag_details (JSONB), total_cost, response_time_ms,
is_complete, created_at, updated_at
```

**`document_processing_logs`** - Processing pipeline tracking
```sql
id, tenant_id, document_id, status, phase,
parsing_cost, chunking_cost, embedding_cost, metadata_cost,
error_message, started_at, completed_at
```

### RAG Details JSONB Structure

```typescript
{
  query: {
    original: string,
    expanded: string[],
    alternativeQueries: string[],
    translatedFrom?: string
  },
  search: {
    type: 'vector' | 'hybrid',
    vectorTopK: number,
    finalTopK: number,
    queries: SearchQuery[],
    rawResults: RawResult[],
    matchedTerms: string[]
  },
  reranking: {
    enabled: boolean,
    model: string,
    inputDocuments: number,
    outputDocuments: number,
    latencyMs: number,
    results: RerankResult[]
  },
  openai: {
    model: string,
    temperature: number,
    systemPromptTokens: number,
    inputTokens: number,
    outputTokens: number,
    streamingDurationMs: number
  },
  costs: {
    embedding: number,
    reranking: number,
    translation: number,
    openai: number,
    total: number
  },
  timing: {
    embeddingMs: number,
    searchMs: number,
    rerankingMs: number,
    openaiMs: number,
    totalMs: number
  }
}
```

---

## Multi-Language Support

12 languages supported (Dutch is default):
- 🇳🇱 Nederlands (nl), 🇬🇧 English (en), 🇩🇪 Deutsch (de), 🇫🇷 Français (fr)
- 🇪🇸 Español (es), 🇮🇹 Italiano (it), 🇵🇱 Polski (pl), 🇹🇷 Türkçe (tr)
- 🇸🇦 العربية (ar), 🇨🇳 中文 (zh), 🇵🇹 Português (pt), 🇷🇴 Română (ro)

### Query Translation (v2.2)

Non-English queries are automatically translated for better vector search:
```typescript
// User asks in Dutch: "Wat is het vakantiebeleid?"
// → Translated for search: "What is the vacation policy?"
// → Response in Dutch with Dutch context
```

---

## Cost Tracking

### Per-Request Costs

| Component | Cost | Notes |
|-----------|------|-------|
| Embedding | $0.02/1M tokens | text-embedding-3-small |
| Reranking | $1/1000 searches | Cohere (optional) |
| Translation | $0.15/1M tokens | GPT-4o-mini |
| OpenAI | $2.50 input, $10 output/1M | GPT-4o |

### Cost Savings vs Pinecone

- **Pinecone**: $5/1M tokens + $0.05/hour
- **Supabase pgvector**: $0.02/1M tokens
- **Savings**: ~99.6%

---

## Common Development Tasks

### Upload Documents for a Tenant

```bash
# Via API
curl -X POST http://localhost:3000/api/rag/upload \
  -F "file=@document.pdf" \
  -F "tenant_id=acme-corp"

# Or use Admin Dashboard: /admin/tenants/[id]
```

### Modify System Prompt

Edit `generateSystemPrompt()` in [lib/prompts.ts](lib/prompts.ts).
- Prompts are generic (no client-specific references)
- Test thoroughly after changes

### Change Embedding Model

Edit in [lib/rag/embeddings.ts](lib/rag/embeddings.ts):
```typescript
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
// or 'text-embedding-3-large' for higher accuracy
```

### Enable/Disable Reranking

Set environment variable:
```bash
COHERE_API_KEY=...  # Set to enable
# Remove to disable
```

### Add a New Language

1. Add to `languageNames` in [lib/prompts.ts](lib/prompts.ts)
2. Add translations in [app/translations.ts](app/translations.ts)
3. Add to `LANGUAGES` in [app/components/ChatHeader.tsx](app/components/ChatHeader.tsx)

### Debug RAG Issues

1. Check chat logs with `rag_details`:
   ```sql
   SELECT rag_details FROM chat_logs WHERE id = 'xxx';
   ```
2. View timing breakdown: `rag_details->timing`
3. Check search results: `rag_details->search->rawResults`
4. Verify reranking: `rag_details->reranking->results`

---

## PWA (Progressive Web App)

Installable on mobile/desktop as standalone app:
- Configured via [next.config.ts](next.config.ts) with `@ducanh2912/next-pwa`
- Manifest: [public/manifest.json](public/manifest.json)
- Service worker caching strategies defined
- PWA disabled in development for faster builds

---

## Tech Stack

- **Framework**: Next.js 15.5.6 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Vector DB**: Supabase pgvector (PostgreSQL)
- **Embeddings**: OpenAI text-embedding-3-small
- **Reranking**: Cohere (optional)
- **LLM**: OpenAI GPT-4o
- **Database**: Supabase (PostgreSQL)
- **PWA**: @ducanh2912/next-pwa
- **Deployment**: Vercel (recommended)

### Deprecated

- **Pinecone**: Replaced by Supabase pgvector in v2.1. Legacy code in `lib/pinecone.ts` kept for reference.

---

## Security

- Never commit `.env.local` (in `.gitignore`)
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only
- Input validation prevents prompt injection
- Content filter protection via OpenAI moderation
- Tenant isolation enforced at database level

---

## Documentation

### Setup & Deployment
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Production deployment guide
- **[docs/RAG_SYSTEM.md](docs/RAG_SYSTEM.md)** - RAG architecture details
- **[docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md)** - Admin dashboard guide
- **[.env.example](.env.example)** - Environment variable reference

### Database
- **[docs/SUPABASE.md](docs/SUPABASE.md)** - Database schema
- **[docs/SUPABASE_ANALYTICS.md](docs/SUPABASE_ANALYTICS.md)** - Analytics queries
- **[docs/migrations/](docs/migrations/)** - SQL migrations

### Reference
- **[README.md](README.md)** - Project overview
- **[documentation/](documentation/)** - Archived docs (v1.x)
