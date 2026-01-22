# RAG System Documentation

**Version**: 2.2.0
**Last Updated**: December 2024

The HR Assistant AI uses a custom RAG (Retrieval-Augmented Generation) system built entirely on Supabase with pgvector. This replaced Pinecone in v2.1 for 99.6% cost savings.

---

## Architecture Overview

```
User Query
    |
    v
Query Translation (if non-English)
    |
    v
Embedding Generation (OpenAI)
    |
    v
Vector Search (Supabase pgvector)
    |
    v
Cohere Reranking (optional)
    |
    v
Context Assembly
    |
    v
LLM Response (OpenAI GPT-4o)
```

---

## Core Components

### 1. Context Retrieval (`lib/rag/context.ts`)

Main entry point for RAG queries.

```typescript
import { retrieveContext, checkRAGHealth } from '@/lib/rag';

const result = await retrieveContext({
  query: "What is the vacation policy?",
  tenantId: "acme-corp",
  topK: 5,
  language: "nl"
});

// Returns:
// {
//   contextText: string,
//   citations: Citation[],
//   tokenUsage: { input, output },
//   cost: number,
//   ragDetails: RAGDetails
// }
```

**Features**:
- Automatic query translation for non-English queries
- Vector similarity search with pgvector
- Optional Cohere reranking
- Comprehensive cost and timing tracking

### 2. Embeddings (`lib/rag/embeddings.ts`)

Generates vector embeddings using OpenAI.

```typescript
import { generateEmbedding, generateEmbeddingsBatch } from '@/lib/rag';

// Single embedding
const embedding = await generateEmbedding("What is vacation policy?");

// Batch embeddings (for document processing)
const embeddings = await generateEmbeddingsBatch([
  "chunk 1 text",
  "chunk 2 text",
  "chunk 3 text"
]);
```

**Models**:
- `text-embedding-3-small` (default): $0.02/1M tokens, 1536 dimensions
- `text-embedding-3-large`: $0.13/1M tokens, 3072 dimensions

**Configuration**:
```typescript
// In lib/rag/embeddings.ts
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
```

### 3. Document Chunking (`lib/rag/chunking.ts`)

Splits documents into searchable chunks.

**Strategies**:

1. **Fixed Chunking**: Simple character-based splits
   ```typescript
   chunkText(text, { method: 'fixed', chunkSize: 1000, overlap: 200 });
   ```

2. **Smart Chunking**: Paragraph and sentence aware
   ```typescript
   chunkText(text, { method: 'smart', chunkSize: 1000, overlap: 200 });
   ```

3. **Semantic Chunking**: AI-driven topic boundaries
   ```typescript
   chunkText(text, { method: 'semantic', chunkSize: 1000 });
   ```

**Default Configuration**:
```typescript
export const DEFAULT_CHUNKING_OPTIONS = {
  method: 'smart',
  chunkSize: 1000,
  overlap: 200,
  minChunkSize: 100
};
```

### 4. Document Processor (`lib/rag/processor.ts`)

Complete pipeline for document upload.

```typescript
import { processDocument, deleteDocument, listDocuments } from '@/lib/rag';

// Upload and process a PDF
const result = await processDocument({
  file: pdfFile,
  tenantId: "acme-corp",
  chunkingMethod: "smart",
  generateMetadata: true
});

// Result:
// {
//   documentId: string,
//   chunkCount: number,
//   processingTime: number,
//   costs: { parsing, chunking, embedding, metadata, total }
// }

// Delete a document (and its chunks)
await deleteDocument(documentId, tenantId);

// List all documents for a tenant
const docs = await listDocuments(tenantId);
```

### 5. Reranker (`lib/rag/reranker.ts`)

Optional Cohere reranking for improved relevance.

```typescript
import { rerankResults, isRerankingEnabled } from '@/lib/rag';

if (isRerankingEnabled()) {
  const reranked = await rerankResults({
    query: "vacation policy",
    documents: searchResults,
    topK: 5
  });
}
```

**Configuration**:
- Set `COHERE_API_KEY` environment variable to enable
- Model: `rerank-multilingual-v3.0`
- Cost: $1 per 1000 searches

### 6. Query Translator (`lib/rag/query-translator.ts`)

Translates non-English queries for better vector search.

```typescript
import { translateQueryIfNeeded, detectLanguageHeuristic } from '@/lib/rag';

const translated = await translateQueryIfNeeded(
  "Wat is het vakantiebeleid?",
  "nl"
);
// Returns: "What is the vacation policy?"
```

**Supported Languages**: 12 languages (see CLAUDE.md)

---

## Database Schema

### Tables

**`documents`** - Document metadata
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT DEFAULT 'application/pdf',
  status TEXT DEFAULT 'processing',
  chunk_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**`document_chunks`** - Text chunks with embeddings
```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  chunk_index INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for vector search
CREATE INDEX idx_chunks_embedding ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### Vector Search Function

```sql
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  p_tenant_id TEXT,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  WHERE dc.tenant_id = p_tenant_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## RAG Details Logging

Every query logs comprehensive details to `chat_logs.rag_details`:

```typescript
interface RAGDetails {
  query: {
    original: string;
    expanded: string[];
    alternativeQueries: string[];
    translatedFrom?: string;
    translatedQuery?: string;
  };
  search: {
    type: 'vector' | 'hybrid';
    vectorTopK: number;
    finalTopK: number;
    queries: Array<{
      query: string;
      embeddingMs: number;
      searchMs: number;
      resultCount: number;
    }>;
    rawResults: Array<{
      chunkId: string;
      documentId: string;
      similarity: number;
      preview: string;
    }>;
    matchedTerms: string[];
  };
  reranking: {
    enabled: boolean;
    model: string;
    inputDocuments: number;
    outputDocuments: number;
    latencyMs: number;
    results: Array<{
      chunkId: string;
      originalRank: number;
      newRank: number;
      score: number;
    }>;
  };
  openai: {
    model: string;
    temperature: number;
    systemPromptTokens: number;
    inputTokens: number;
    outputTokens: number;
    streamingDurationMs: number;
  };
  costs: {
    embedding: number;
    reranking: number;
    translation: number;
    openai: number;
    total: number;
  };
  timing: {
    translationMs: number;
    embeddingMs: number;
    searchMs: number;
    rerankingMs: number;
    openaiMs: number;
    totalMs: number;
  };
}
```

---

## Cost Breakdown

| Operation | Cost | Model |
|-----------|------|-------|
| Embedding | $0.02/1M tokens | text-embedding-3-small |
| Embedding (large) | $0.13/1M tokens | text-embedding-3-large |
| Reranking | $1/1000 searches | rerank-multilingual-v3.0 |
| Translation | $0.15/1M tokens | gpt-4o-mini |
| Chat | $2.50 input, $10 output/1M | gpt-4o |

### Cost Comparison (Pinecone vs Supabase)

| Metric | Pinecone | Supabase pgvector |
|--------|----------|-------------------|
| Embedding | $5/1M tokens | $0.02/1M tokens |
| Hourly rate | $0.05/hour | Included |
| Storage | Paid | Included |
| **Savings** | - | **99.6%** |

---

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional
COHERE_API_KEY=...  # Enable reranking
```

### Tuning Parameters

Edit in respective files:

```typescript
// lib/rag/context.ts
const DEFAULT_TOP_K = 5;
const SIMILARITY_THRESHOLD = 0.7;

// lib/rag/chunking.ts
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP = 200;

// lib/rag/embeddings.ts
const DEFAULT_MODEL = 'text-embedding-3-small';
```

---

## Troubleshooting

### No results returned

1. Check similarity threshold (try lowering to 0.5)
2. Verify documents are processed (`documents.status = 'completed'`)
3. Check embeddings exist (`document_chunks.embedding IS NOT NULL`)

### Slow search performance

1. Ensure pgvector index exists
2. Check `lists` parameter in index (higher = faster but less accurate)
3. Consider reducing `topK`

### Poor relevance

1. Enable Cohere reranking
2. Try semantic chunking instead of fixed
3. Reduce chunk size for more precise matches

### Debug queries

```sql
-- Check document status
SELECT id, file_name, status, chunk_count
FROM documents
WHERE tenant_id = 'your-tenant';

-- Check chunk embeddings
SELECT id, LENGTH(content), embedding IS NOT NULL
FROM document_chunks
WHERE tenant_id = 'your-tenant'
LIMIT 10;

-- Test vector search
SELECT * FROM match_document_chunks(
  '[0.1, 0.2, ...]'::vector,
  'your-tenant',
  0.5,
  10
);
```

---

## Migration from Pinecone

If migrating from Pinecone (v1.x):

1. Run RAG schema migration
2. Re-upload all documents via Admin Dashboard
3. Update environment variables (remove Pinecone keys)
4. Test queries thoroughly

See [documentation/archive/MIGRATION_TO_V2.md](../documentation/archive/MIGRATION_TO_V2.md) for detailed steps.

---

## API Reference

### Main Exports (`lib/rag/index.ts`)

```typescript
// Context retrieval
export { retrieveContext, checkRAGHealth } from './context';

// Document processing
export { processDocument, deleteDocument, listDocuments } from './processor';

// Embeddings
export { generateEmbedding, generateEmbeddingsBatch } from './embeddings';

// Chunking
export { chunkText, chunkDocument } from './chunking';

// Reranking
export { rerankResults, isRerankingEnabled } from './reranker';

// Query translation
export { translateQueryIfNeeded, detectLanguageHeuristic } from './query-translator';

// Types
export type {
  Document,
  DocumentChunk,
  SearchResult,
  ContextSnippet,
  Citation,
  ContextResponse,
  RAGDetails
} from './types';
```
