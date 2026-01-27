/**
 * ========================================
 * SUPABASE RAG - Main Exports
 * ========================================
 *
 * Central export file for the RAG module.
 * Import from '@/lib/rag' for convenience.
 */

// Context retrieval (main entry point for chat)
export {
  retrieveContext,
  checkRAGHealth,
  extractSnippetPreview
} from './context';

// Document processing
export {
  processDocument,
  deleteDocument,
  listDocuments,
  getDocument,
  reprocessDocument
} from './processor';

// Embeddings
export {
  generateEmbedding,
  generateEmbeddingsBatch,
  estimateTokens,
  estimateEmbeddingCost,
  getModelConfig
} from './embeddings';

// Chunking
export {
  chunkText,
  chunkDocument,
  DEFAULT_CHUNKING_OPTIONS
} from './chunking';

// Text Sanitization (for handling problematic PDF characters)
export {
  sanitizeText,
  validateForEmbedding,
  estimateTokenCount,
  exceedsTokenLimit,
  sanitizeBatch
} from './text-sanitizer';

export type {
  TextValidationResult,
  BatchSanitizationResult
} from './text-sanitizer';

// Reranking
export {
  rerankResults,
  isRerankingEnabled,
  estimateRerankCost,
  COHERE_MODEL,
  COST_PER_1000_SEARCHES
} from './reranker';

export type { RerankResult } from './reranker';

// Query Translation (Multilingual RAG)
export {
  translateQueryIfNeeded,
  translateQueryOptimized,
  detectLanguageHeuristic,
  SUPPORTED_LANGUAGES
} from './query-translator';

export type { TranslationResult } from './query-translator';

// Conversation-Aware Query Expansion (v2.3)
export {
  detectFollowUpQuestion,
  expandQueryWithContext
} from './conversation-context';

export type {
  ConversationMessage,
  QueryExpansionResult
} from './conversation-context';

// Types
export type {
  Document,
  DocumentChunk,
  SearchResult,
  ContextSnippet,
  Citation,
  ContextResponse,
  ChunkingOptions,
  TextChunk,
  EmbeddingConfig,
  ProcessingResult,
  RAGHealthCheck,
  UploadResponse,
  DocumentsListResponse
} from './types';

export {
  EMBEDDING_MODELS,
  DEFAULT_EMBEDDING_MODEL
} from './types';
