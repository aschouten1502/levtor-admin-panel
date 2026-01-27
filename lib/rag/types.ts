/**
 * ========================================
 * SUPABASE RAG - Type Definitions
 * ========================================
 *
 * Alle TypeScript types voor het RAG systeem.
 * Compatible met de bestaande Pinecone interface voor
 * eenvoudige migratie.
 */

// ========================================
// TENANT TYPES
// ========================================

/**
 * Tenant informatie uit de tenants tabel
 */
export interface TenantInfo {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  welcome_message: string | null;
  contact_email: string | null;
  is_active: boolean;
  // Multilingual RAG support (v2.2)
  document_language: string;      // Taal van HR documenten (nl, de, fr, en)
  website_url?: string | null;    // Website voor auto-branding
  created_at?: string;
  updated_at?: string;
}

/**
 * Tenant validation result
 */
export interface TenantValidationResult {
  valid: boolean;
  tenant?: TenantInfo;
  error?: string;
}

// ========================================
// DATABASE TYPES
// ========================================

/**
 * Document metadata (opgeslagen in documents tabel)
 */
export interface Document {
  id: string;
  tenant_id: string;
  filename: string;
  file_path?: string;
  file_size?: number;
  mime_type: string;
  total_pages?: number;
  total_chunks: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Document chunk met embedding (opgeslagen in document_chunks tabel)
 */
export interface DocumentChunk {
  id: string;
  tenant_id: string;
  document_id: string;
  content: string;
  content_length: number;
  embedding?: number[];
  page_number?: number;
  chunk_index: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Search result van de search_documents functie
 * Uitgebreid met section info voor betere citations
 */
export interface SearchResult {
  chunk_id: string;
  document_id: string;
  filename: string;
  file_path?: string;  // Storage path voor PDF toegang
  content: string;
  page_number?: number;
  similarity: number;
  // Enhanced citation info (from chunk metadata)
  section_title?: string;      // "Artikel 4.3 Vakantiegeld"
  section_path?: string[];     // ["CAO", "Hoofdstuk 4", "Artikel 4.3"]
  context_header?: string;     // "[CAO > Hoofdstuk 4 > Artikel 4.3]"
}

// ========================================
// PINECONE-COMPATIBLE TYPES
// ========================================

/**
 * Context snippet (compatible met Pinecone ContextSnippet)
 */
export interface ContextSnippet {
  content: string;
  score: number;
  reference?: {
    file?: {
      name: string;
    };
    pages?: number[];
  };
}

/**
 * Citation info voor weergave in de frontend
 * (Compatible met Pinecone Citation, uitgebreid met file_path en section info)
 *
 * v2.1: Enhanced met section_title, section_path, en relevance_score
 * voor enterprise-niveau bronvermeldingen
 */
export interface Citation {
  position: number;
  preview: string;
  references: Array<{
    pages: number[];
    file?: {
      name: string;
      path?: string;  // Storage path voor directe PDF toegang
    };
    // Enhanced citation fields (v2.1)
    section_title?: string;      // "Artikel 4.3 Vakantiegeld"
    section_path?: string[];     // ["CAO", "Hoofdstuk 4", "Artikel 4.3"]
  }>;
  // Relevance score from reranker (0-1)
  relevance_score?: number;
}

/**
 * Context retrieval response
 * (Compatible met Pinecone, maar met embedding cost i.p.v. pinecone cost)
 */
export interface ContextResponse {
  contextText: string;
  citations: Citation[];
  embeddingTokens: number;
  embeddingCost: number;
}

// ========================================
// CHUNKING TYPES
// ========================================

/**
 * Opties voor document chunking (legacy)
 */
export interface ChunkingOptions {
  chunkSize: number;        // Target chunk size in characters
  chunkOverlap: number;     // Overlap between chunks
  minChunkSize: number;     // Minimum chunk size
}

/**
 * Smart Chunking Options - Alle 4 opties configureerbaar
 */
export interface SmartChunkingOptions {
  // Basis settings
  targetChunkSize: number;      // 1500 karakters (groter dan legacy)
  minChunkSize: number;         // 200 karakters minimum
  maxChunkSize: number;         // 2500 karakters maximum
  overlapPercentage: number;    // 15% overlap

  // Feature flags
  enableStructureDetection: boolean;
  enableSemanticChunking: boolean;
  enableContextHeaders: boolean;
  enableSmartBoundaries: boolean;

  // AI settings
  semanticModel: 'gpt-4o-mini' | 'gpt-4o';
  batchSize: number;            // Chunks per AI call
}

/**
 * Document structuur element (artikel, hoofdstuk, sectie, etc.)
 */
export interface DocumentStructure {
  type: 'article' | 'section' | 'chapter' | 'paragraph' | 'list' | 'table' | 'header';
  identifier?: string;      // "Artikel 4.3", "Hoofdstuk 2"
  title?: string;           // "Vakantiegeld"
  level: number;            // Hiërarchie niveau (0=root, 1=chapter, 2=section, etc)
  startIndex: number;
  endIndex: number;
  parent?: DocumentStructure;
  children: DocumentStructure[];
}

/**
 * AI-gegenereerde metadata voor een chunk
 */
export interface EnhancedChunkMetadata {
  summary?: string;           // 1-2 zinnen samenvatting
  keywords?: string[];        // Belangrijke termen (3-7)
  topics?: string[];          // HR categorieën
  alternativeTerms?: string[]; // Synoniemen/informele varianten
}

/**
 * Een tekst chunk na chunking (legacy format)
 */
export interface TextChunk {
  content: string;
  pageNumber?: number;
  chunkIndex: number;
  metadata: {
    startChar: number;
    endChar: number;
    wordCount: number;
  } & EnhancedChunkMetadata;
}

/**
 * Structured Chunk - Uitgebreide chunk met context headers
 */
export interface StructuredChunk {
  content: string;
  contextHeader: string;    // "[CAO > Hoofdstuk 4 > Artikel 4.3]"
  structure?: DocumentStructure;
  pageNumber?: number;
  chunkIndex: number;
  metadata: {
    startChar: number;
    endChar: number;
    wordCount: number;
    structureType?: string;
    structurePath: string[];  // ["CAO Grafimedia", "Hoofdstuk 4", "Artikel 4.3"]
  } & EnhancedChunkMetadata;
}

/**
 * Resultaat van smart chunking
 */
export interface SmartChunkingResult {
  chunks: StructuredChunk[];
  cost: number;
  tokensUsed: number;
  structuresDetected: number;
}

// ========================================
// EMBEDDING TYPES
// ========================================

/**
 * Embedding model configuratie
 */
export interface EmbeddingConfig {
  model: 'text-embedding-3-small' | 'text-embedding-3-large';
  dimensions: number;
  costPer1MTokens: number;
}

/**
 * Beschikbare embedding modellen met hun configuratie
 */
export const EMBEDDING_MODELS: Record<string, EmbeddingConfig> = {
  'text-embedding-3-small': {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    costPer1MTokens: 0.02
  },
  'text-embedding-3-large': {
    model: 'text-embedding-3-large',
    dimensions: 3072,
    costPer1MTokens: 0.13
  }
};

/**
 * Default embedding model
 */
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

// ========================================
// PROCESSING TYPES
// ========================================

/**
 * Resultaat van document processing
 */
export interface ProcessingResult {
  success: boolean;
  documentId?: string;
  chunksCreated: number;
  totalTokens: number;
  totalCost: number;
  metadataCost?: number;   // Kosten voor AI metadata generatie
  chunkingCost?: number;   // Kosten voor semantic chunking (apart van metadata)
  error?: string;
}

/**
 * RAG health check response
 */
export interface RAGHealthCheck {
  healthy: boolean;
  documentCount: number;
  chunkCount: number;
  error?: string;
}

// ========================================
// API TYPES
// ========================================

/**
 * Upload API response
 */
export interface UploadResponse {
  success: boolean;
  documentId?: string;
  chunksCreated?: number;
  cost?: number;
  error?: string;
}

/**
 * Documents list API response
 */
export interface DocumentsListResponse {
  documents: Document[];
}

// ========================================
// RAG DETAILS TYPES (for comprehensive logging)
// ========================================

/**
 * Query processing details
 */
export interface RAGQueryDetails {
  original: string;              // Original user query
  expanded?: string;             // Query with expansion terms added
  alternativeQueries?: string[]; // Alternative queries generated
  expansionTerms?: string[];     // Terms added by query expander
  // Multilingual translation (v2.2)
  translation?: {
    originalLanguage: string;    // Detected language of query (de, fr, en, nl)
    translatedQuery: string;     // Query translated to document_language
    targetLanguage: string;      // Document language of tenant
    wasTranslated: boolean;      // Was translation needed?
    translationCost: number;     // Cost of translation API call
    translationLatencyMs: number; // Time for translation
  };
  // Conversation-aware query expansion (v2.3)
  contextExpansion?: {
    wasExpanded: boolean;        // Was query expanded with conversation context?
    expandedQuery: string;       // Query after expansion
    cost: number;                // Cost of expansion (GPT-4o-mini)
    latencyMs: number;           // Time for expansion
  };
}

/**
 * Single search query result
 */
export interface RAGSearchQuery {
  query: string;
  tokens: number;
  cost: number;
  resultsCount: number;
}

/**
 * Raw search result for logging (before reranking)
 */
export interface RAGRawSearchResult {
  filename: string;
  similarity: number;
  pageNumber?: number;
  chunkId?: string;
  content?: string;              // Truncated for storage
  matchedKeywords?: string[];
  sectionTitle?: string;
}

/**
 * Merge statistics for multi-query search
 */
export interface RAGMergeStats {
  totalBeforeMerge: number;
  totalAfterMerge: number;
  duplicatesRemoved: number;
}

/**
 * Search details for logging
 */
export interface RAGSearchDetails {
  type: 'basic' | 'enhanced_hybrid' | 'multi_query';
  vectorTopK: number;
  finalTopK: number;
  rerankingEnabled: boolean;
  queries: RAGSearchQuery[];
  rawResults: RAGRawSearchResult[];
  matchedTerms?: string[];
  mergeStats?: RAGMergeStats;
  // Relevance filtering stats (v2.4)
  relevanceFilter?: {
    minScore: number;
    beforeFilter: number;
    afterFilter: number;
    removedCount: number;
  };
}

/**
 * Single document reranking result
 */
export interface RAGRerankingResultItem {
  filename: string;
  beforeScore: number;           // Original similarity score
  afterScore: number;            // Reranker relevance score
  positionBefore: number;        // Position before reranking (0-indexed)
  positionAfter: number;         // Position after reranking (0-indexed)
  pageNumber?: number;
}

/**
 * Reranking details for logging
 */
export interface RAGRerankingDetails {
  enabled: boolean;
  model?: string;                // e.g., "rerank-v3.5"
  inputDocuments: number;
  outputDocuments: number;
  latencyMs: number;
  cost: number;
  results: RAGRerankingResultItem[];
}

/**
 * OpenAI/LLM details for logging
 */
export interface RAGOpenAIDetails {
  model: string;                 // e.g., "gpt-4o"
  temperature: number;
  systemPromptTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  streamingDurationMs?: number;
}

/**
 * Cost breakdown
 */
export interface RAGCostBreakdown {
  embedding: number;             // Query embedding cost
  reranking: number;             // Cohere reranking cost
  translation?: number;          // Query translation cost (GPT-4o-mini)
  contextExpansion?: number;     // Context expansion cost (GPT-4o-mini)
  openai: number;                // OpenAI chat completion cost
  total: number;
}

/**
 * Timing breakdown per phase (in milliseconds)
 */
export interface RAGTimingBreakdown {
  embeddingMs: number;           // Query embedding time
  searchMs: number;              // Vector search time
  rerankingMs: number;           // Reranking time
  openaiMs: number;              // OpenAI streaming time
  totalMs: number;               // Total request time
}

/**
 * Complete RAG details for logging
 * This is stored in the `rag_details` JSONB column of chat_logs
 */
export interface RAGDetails {
  query: RAGQueryDetails;
  search: RAGSearchDetails;
  reranking: RAGRerankingDetails;
  openai: RAGOpenAIDetails;
  costs: RAGCostBreakdown;
  timing: RAGTimingBreakdown;
}

// ========================================
// DOCUMENT PROCESSING LOG TYPES
// ========================================

/**
 * Chunking options used during processing
 */
export interface DocumentProcessingChunkingOptions {
  structureDetection?: boolean;
  semanticChunking?: boolean;
  contextHeaders?: boolean;
  smartBoundaries?: boolean;
  targetChunkSize?: number;
}

/**
 * Document processing log entry
 */
export interface DocumentProcessingLog {
  id: string;
  tenant_id: string;
  document_id?: string;
  filename: string;
  file_size_bytes?: number;
  mime_type?: string;
  processing_status: 'pending' | 'uploading' | 'parsing' | 'chunking' | 'embedding' | 'metadata' | 'completed' | 'failed';
  chunking_method?: 'smart' | 'legacy' | 'semantic' | 'fixed';
  chunking_options?: DocumentProcessingChunkingOptions;
  total_pages?: number;
  chunks_created?: number;
  structures_detected?: number;
  avg_chunk_size?: number;
  min_chunk_size?: number;
  max_chunk_size?: number;
  metadata_generated?: boolean;
  keywords_count?: number;
  topics_count?: number;
  parsing_cost?: number;
  chunking_cost?: number;
  embedding_cost?: number;
  embedding_tokens?: number;
  metadata_cost?: number;
  metadata_tokens?: number;
  total_cost?: number;
  upload_duration_ms?: number;
  parsing_duration_ms?: number;
  chunking_duration_ms?: number;
  embedding_duration_ms?: number;
  metadata_duration_ms?: number;
  total_duration_ms?: number;
  error_message?: string;
  error_phase?: string;
  error_details?: Record<string, unknown>;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

/**
 * Summary of document processing for a tenant
 */
export interface DocumentProcessingSummary {
  date: string;
  tenant_id: string;
  total_documents: number;
  completed: number;
  failed: number;
  in_progress: number;
  total_pages: number;
  total_chunks: number;
  avg_chunks_per_doc: number;
  total_cost: number;
  avg_duration_ms: number;
  smart_chunking_count: number;
  legacy_chunking_count: number;
  semantic_chunking_count: number;
}
