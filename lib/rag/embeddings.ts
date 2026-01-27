/**
 * ========================================
 * SUPABASE RAG - OpenAI Embeddings Service
 * ========================================
 *
 * Genereert vector embeddings via OpenAI API.
 *
 * Kosten:
 * - text-embedding-3-small: $0.02 per 1M tokens
 * - text-embedding-3-large: $0.13 per 1M tokens
 *
 * Vergelijk met Pinecone: $5 per 1M tokens
 * Besparing: ~99%
 */

import OpenAI from 'openai';
import { EMBEDDING_MODELS, DEFAULT_EMBEDDING_MODEL, EmbeddingConfig } from './types';
import { sanitizeText, validateForEmbedding, exceedsTokenLimit, estimateTokenCount } from './text-sanitizer';

// ========================================
// OPENAI CLIENT
// ========================================

let openaiClient: OpenAI | null = null;

/**
 * Krijg of maak de OpenAI client
 * Hergebruikt de bestaande OPENAI_API_KEY uit de environment
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ========================================
// SINGLE EMBEDDING
// ========================================

/**
 * Genereert een embedding voor een enkele tekst
 *
 * @param text - De tekst om te embedden
 * @param modelName - Het embedding model (default: text-embedding-3-small)
 * @returns Object met embedding vector, tokens en kosten
 */
export async function generateEmbedding(
  text: string,
  modelName: string = DEFAULT_EMBEDDING_MODEL
): Promise<{
  embedding: number[];
  tokens: number;
  cost: number;
}> {
  const config = EMBEDDING_MODELS[modelName];
  if (!config) {
    throw new Error(`Unknown embedding model: ${modelName}`);
  }

  // Validate and sanitize input text
  const { valid, issues, sanitized } = validateForEmbedding(text);

  if (!valid && issues.length > 0) {
    console.warn(`⚠️ [Embeddings] Text had issues: ${issues.join(', ')}`);
  }

  const cleanText = sanitized;

  if (cleanText.length === 0) {
    throw new Error('Text is empty after sanitization');
  }

  // Check token limit before API call
  if (exceedsTokenLimit(cleanText)) {
    const estimated = estimateTokenCount(cleanText);
    throw new Error(`Text exceeds token limit (estimated ${estimated} tokens, limit is 8191)`);
  }

  const client = getOpenAIClient();

  console.log(`🔢 [Embeddings] Generating embedding for ${cleanText.length} chars (sanitized from ${text.length})`);

  try {
    const response = await client.embeddings.create({
      model: config.model,
      input: cleanText,
      dimensions: config.dimensions
    });

    const tokens = response.usage?.total_tokens || 0;
    const cost = (tokens / 1_000_000) * config.costPer1MTokens;

    console.log(`✅ [Embeddings] Generated: ${tokens} tokens, $${cost.toFixed(6)}`);

    return {
      embedding: response.data[0].embedding,
      tokens,
      cost
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ [Embeddings] API error: ${errorMessage}`);
    throw new Error(`Embedding generation failed: ${errorMessage}`);
  }
}

// ========================================
// BATCH EMBEDDINGS
// ========================================

/**
 * Genereert embeddings voor meerdere teksten in batch
 * Efficiënter voor document processing
 *
 * @param texts - Array van teksten om te embedden
 * @param modelName - Het embedding model (default: text-embedding-3-small)
 * @returns Object met embedding vectors, totale tokens en kosten
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  modelName: string = DEFAULT_EMBEDDING_MODEL
): Promise<{
  embeddings: number[][];
  totalTokens: number;
  totalCost: number;
  failedIndices: number[];
}> {
  const config = EMBEDDING_MODELS[modelName];
  if (!config) {
    throw new Error(`Unknown embedding model: ${modelName}`);
  }

  if (texts.length === 0) {
    return {
      embeddings: [],
      totalTokens: 0,
      totalCost: 0,
      failedIndices: []
    };
  }

  const client = getOpenAIClient();

  console.log(`🔢 [Embeddings] Batch processing ${texts.length} texts`);

  // Pre-sanitize all texts and track issues
  const sanitizedTexts: string[] = [];
  const textIssues: Map<number, string[]> = new Map();
  let totalSanitizationIssues = 0;

  for (let i = 0; i < texts.length; i++) {
    const { valid, issues, sanitized } = validateForEmbedding(texts[i]);
    sanitizedTexts.push(sanitized);

    if (!valid && issues.length > 0) {
      textIssues.set(i, issues);
      totalSanitizationIssues++;
    }
  }

  if (totalSanitizationIssues > 0) {
    console.warn(`⚠️ [Embeddings] ${totalSanitizationIssues}/${texts.length} texts had sanitization issues`);
  }

  // OpenAI ondersteunt max 2048 inputs per request
  // We gebruiken kleinere batches voor stabiliteit
  const BATCH_SIZE = 100;
  const embeddings: (number[] | null)[] = new Array(texts.length).fill(null);
  const failedIndices: number[] = [];
  let totalTokens = 0;

  for (let i = 0; i < sanitizedTexts.length; i += BATCH_SIZE) {
    const batchStartIndex = i;
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(sanitizedTexts.length / BATCH_SIZE);

    // Build batch with only non-empty sanitized texts
    const batchItems: { text: string; originalIndex: number }[] = [];
    for (let j = i; j < Math.min(i + BATCH_SIZE, sanitizedTexts.length); j++) {
      const sanitized = sanitizedTexts[j];
      if (sanitized.length > 0 && !exceedsTokenLimit(sanitized)) {
        batchItems.push({ text: sanitized, originalIndex: j });
      } else if (sanitized.length === 0) {
        console.warn(`⚠️ [Embeddings] Skipping empty text at index ${j}`);
        failedIndices.push(j);
      } else {
        console.warn(`⚠️ [Embeddings] Skipping text at index ${j} (exceeds token limit)`);
        failedIndices.push(j);
      }
    }

    if (batchItems.length === 0) {
      console.warn(`⚠️ [Embeddings] Entire batch ${batchNumber} was empty after sanitization`);
      continue;
    }

    console.log(`   Batch ${batchNumber}/${totalBatches}: ${batchItems.length} texts (of ${BATCH_SIZE} max)`);

    try {
      const response = await client.embeddings.create({
        model: config.model,
        input: batchItems.map(item => item.text),
        dimensions: config.dimensions
      });

      totalTokens += response.usage?.total_tokens || 0;

      // Map embeddings back to original positions
      response.data
        .sort((a, b) => a.index - b.index)
        .forEach((item, idx) => {
          const originalIndex = batchItems[idx].originalIndex;
          embeddings[originalIndex] = item.embedding;
        });

    } catch (batchError) {
      const errorMessage = batchError instanceof Error ? batchError.message : String(batchError);
      console.error(`❌ [Embeddings] Batch ${batchNumber} failed: ${errorMessage}`);
      console.log(`   Retrying batch ${batchNumber} one-by-one...`);

      // Fallback: process each text individually
      for (const { text, originalIndex } of batchItems) {
        try {
          const singleResponse = await client.embeddings.create({
            model: config.model,
            input: text,
            dimensions: config.dimensions
          });

          totalTokens += singleResponse.usage?.total_tokens || 0;
          embeddings[originalIndex] = singleResponse.data[0].embedding;
          console.log(`   ✓ Recovered chunk ${originalIndex}`);

        } catch (singleError) {
          const singleErrorMessage = singleError instanceof Error ? singleError.message : String(singleError);
          console.error(`   ✗ Failed chunk ${originalIndex}: ${singleErrorMessage}`);
          failedIndices.push(originalIndex);
        }
      }
    }
  }

  // Replace null embeddings with placeholder zeros for failed chunks
  const finalEmbeddings: number[][] = embeddings.map((emb, idx) => {
    if (emb === null) {
      if (!failedIndices.includes(idx)) {
        failedIndices.push(idx);
      }
      // Return zero vector as placeholder
      return new Array(config.dimensions).fill(0);
    }
    return emb;
  });

  const totalCost = (totalTokens / 1_000_000) * config.costPer1MTokens;

  if (failedIndices.length > 0) {
    console.warn(`⚠️ [Embeddings] ${failedIndices.length} chunks failed and have placeholder embeddings`);
  }

  console.log(`✅ [Embeddings] Batch complete: ${totalTokens} tokens, $${totalCost.toFixed(6)}, ${failedIndices.length} failures`);

  return {
    embeddings: finalEmbeddings,
    totalTokens,
    totalCost,
    failedIndices
  };
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Schat het aantal tokens in een tekst (voor cost estimation)
 *
 * @param text - De tekst om te schatten
 * @returns Geschat aantal tokens
 */
export function estimateTokens(text: string): number {
  // Ruwe schatting: ~4 characters per token voor Engelse tekst
  // Nederlandse tekst is vaak iets langer per token (~3.5 chars)
  return Math.ceil(text.length / 4);
}

/**
 * Schat de kosten voor het embedden van tekst
 *
 * @param text - De tekst om te embedden
 * @param modelName - Het embedding model
 * @returns Geschatte kosten in USD
 */
export function estimateEmbeddingCost(
  text: string,
  modelName: string = DEFAULT_EMBEDDING_MODEL
): number {
  const config = EMBEDDING_MODELS[modelName];
  if (!config) {
    throw new Error(`Unknown embedding model: ${modelName}`);
  }

  const estimatedTokens = estimateTokens(text);
  return (estimatedTokens / 1_000_000) * config.costPer1MTokens;
}

/**
 * Krijg de configuratie van een embedding model
 *
 * @param modelName - De naam van het model
 * @returns Model configuratie of undefined
 */
export function getModelConfig(modelName: string): EmbeddingConfig | undefined {
  return EMBEDDING_MODELS[modelName];
}
