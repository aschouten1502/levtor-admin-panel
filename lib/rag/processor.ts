/**
 * ========================================
 * SUPABASE RAG - Document Processor
 * ========================================
 *
 * Verwerkt PDF uploads:
 * 1. Extraheert tekst per pagina
 * 2. Chunked de content
 * 3. Genereert embeddings
 * 4. Slaat op in Supabase
 *
 * Ondersteunde formaten:
 * - PDF (.pdf)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { smartChunkDocument, chunkDocument } from './chunking';
import { generateEmbeddingsBatch } from './embeddings';
import { generateMetadataBatch, isMetadataGenerationEnabled } from './metadata-generator';
import { Document, ProcessingResult, EnhancedChunkMetadata, SmartChunkingOptions, StructuredChunk } from './types';
import { getDocumentsBucket, ensureBucketExists } from '../admin/storage-service';
import {
  startDocumentProcessing,
  updateProcessingStatus,
  completeDocumentProcessing,
  failDocumentProcessing
} from '../admin/document-processing-logger';

// ========================================
// SMART CHUNKING CONFIG
// ========================================

/**
 * Check if smart chunking is enabled
 * Enable via environment variable or default to true
 */
function isSmartChunkingEnabled(): boolean {
  const envValue = process.env.ENABLE_SMART_CHUNKING;
  // Default to true (enabled)
  return envValue !== 'false';
}

/**
 * Get smart chunking options from environment
 */
function getSmartChunkingOptions(): Partial<SmartChunkingOptions> {
  return {
    enableStructureDetection: process.env.SMART_CHUNK_STRUCTURE !== 'false',
    enableSemanticChunking: process.env.SMART_CHUNK_SEMANTIC !== 'false',
    enableContextHeaders: process.env.SMART_CHUNK_HEADERS !== 'false',
    enableSmartBoundaries: process.env.SMART_CHUNK_BOUNDARIES !== 'false',
    semanticModel: (process.env.SMART_CHUNK_MODEL as 'gpt-4o-mini' | 'gpt-4o') || 'gpt-4o-mini'
  };
}

// ========================================
// SUPABASE CLIENT
// ========================================

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Supabase configuration missing');
    }

    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

// ========================================
// PDF TEXT EXTRACTION
// ========================================

/**
 * Result type voor PDF extractie met echte page count
 */
interface PDFExtractionResult {
  pages: Array<{ pageNumber: number; text: string }>;
  totalPages: number;  // Echte page count van de PDF
}

/**
 * Extraheert tekst uit een PDF buffer, PER PAGINA met echte paginanummers.
 *
 * Gebruikt pdf-parse met custom page rendering om tekst per pagina te extraheren.
 * Dit is compatible met Node.js/Next.js server-side rendering.
 */
async function extractTextFromPDF(
  buffer: Buffer
): Promise<PDFExtractionResult> {
  console.log('📖 [Processor] Parsing PDF with per-page extraction...');

  // Import pdf-parse dynamically to avoid issues with Next.js bundling
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');

  // Collect pages during parsing using custom page render
  const pages: Array<{ pageNumber: number; text: string }> = [];
  let currentPage = 0;

  // Custom page render function to extract text per page
  const pagerender = async (pageData: { getTextContent: () => Promise<{ items: Array<{ str?: string; transform?: number[]; hasEOL?: boolean }> }> }) => {
    currentPage++;
    const pageNum = currentPage;

    try {
      const textContent = await pageData.getTextContent();

      // Combine all text items from the page
      // Preserve spacing by checking position changes
      let pageText = '';
      let lastY: number | null = null;

      for (const item of textContent.items) {
        if (item.str !== undefined) {
          const currentY = item.transform ? item.transform[5] : 0;

          // Add newline when moving to a new line
          if (lastY !== null && Math.abs(currentY - lastY) > 5) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            pageText += ' ';
          }

          pageText += item.str;
          lastY = currentY;

          if (item.hasEOL) {
            pageText += '\n';
          }
        }
      }

      const trimmed = pageText.trim();
      if (trimmed.length > 0) {
        pages.push({
          pageNumber: pageNum,
          text: trimmed
        });
      }

      return trimmed;
    } catch (pageError) {
      console.warn(`⚠️ [Processor] Could not extract text from page ${pageNum}:`, pageError);
      return '';
    }
  };

  // Parse PDF with custom page renderer
  const pdfData = await pdfParse(buffer, { pagerender });
  const totalPages = pdfData.numpages;

  console.log(`📄 [Processor] PDF has ${totalPages} pages`);
  console.log(`✅ [Processor] Extracted text from ${pages.length} of ${totalPages} pages`);

  if (pages.length === 0) {
    throw new Error('No text content could be extracted from PDF');
  }

  return { pages, totalPages };
}

// ========================================
// MAIN PROCESSING FUNCTION
// ========================================

/**
 * Verwerkt een PDF bestand en indexeert het in de RAG database
 *
 * @param tenantId - Tenant identifier
 * @param filename - Naam van het bestand
 * @param fileBuffer - Buffer met de file content
 * @param filePath - Optioneel pad in Supabase Storage
 * @returns Processing resultaat met document ID en stats
 */
export async function processDocument(
  tenantId: string,
  filename: string,
  fileBuffer: Buffer,
  filePath?: string,
  tenantProductId?: string
): Promise<ProcessingResult> {
  const supabase = getSupabaseClient();

  console.log('\n📄 [Processor] ========== PROCESSING DOCUMENT ==========');
  console.log('📁 [Processor] File:', filename);
  console.log('🏢 [Processor] Tenant:', tenantId);
  if (tenantProductId) console.log('📦 [Processor] Product:', tenantProductId);
  console.log('📦 [Processor] Size:', (fileBuffer.length / 1024).toFixed(1), 'KB');

  let documentId: string | undefined;
  let processingLogId: string | null = null;

  // Start document processing log
  const smartChunkingEnabled = isSmartChunkingEnabled();
  const smartOptions = smartChunkingEnabled ? getSmartChunkingOptions() : undefined;

  processingLogId = await startDocumentProcessing({
    tenantId,
    filename,
    fileSizeBytes: fileBuffer.length,
    mimeType: 'application/pdf',
    chunkingMethod: smartChunkingEnabled ? 'smart' : 'legacy',
    chunkingOptions: smartOptions ? {
      structureDetection: smartOptions.enableStructureDetection,
      semanticChunking: smartOptions.enableSemanticChunking,
      contextHeaders: smartOptions.enableContextHeaders,
      smartBoundaries: smartOptions.enableSmartBoundaries
    } : undefined
  });

  try {
    // 1. Maak document record aan
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        tenant_id: tenantId,
        tenant_product_id: tenantProductId || null,
        filename,
        file_path: filePath,
        file_size: fileBuffer.length,
        processing_status: 'processing'
      })
      .select()
      .single();

    if (docError) throw docError;
    documentId = doc.id;

    console.log('✅ [Processor] Document record created:', documentId);

    // Update log with document ID
    if (processingLogId) {
      await updateProcessingStatus(processingLogId, 'parsing');
    }

    // 1b. Upload PDF to Supabase Storage (tenant-specific bucket)
    const bucketName = getDocumentsBucket(tenantId);
    const storagePath = `documents/${documentId}/${filename}`;
    console.log(`📤 [Processor] Uploading PDF to Storage: bucket=${bucketName}, path=${storagePath}`);

    // Ensure bucket exists before uploading
    await ensureBucketExists(bucketName, true);

    const { error: storageError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (storageError) {
      console.warn('⚠️ [Processor] Storage upload failed:', storageError.message);
      // Continue processing - storage is optional enhancement
    } else {
      console.log('✅ [Processor] PDF uploaded to Storage');
      // Update document with file_path
      await supabase
        .from('documents')
        .update({ file_path: storagePath })
        .eq('id', documentId);
    }

    // 2. Extract text from PDF
    const { pages, totalPages } = await extractTextFromPDF(fileBuffer);

    if (pages.length === 0) {
      throw new Error('No text content could be extracted from PDF');
    }

    // 3. Chunk de content (Smart Chunking of Legacy)
    console.log('\n✂️  [Processor] Chunking content...');

    // Update log status to chunking - use REAL page count
    if (processingLogId) {
      await updateProcessingStatus(processingLogId, 'chunking', {
        totalPages: totalPages  // Echte page count, niet gefilterde
      });
    }

    let chunkContents: string[];
    let chunkMetadata: Array<{
      pageNumber?: number;
      chunkIndex: number;
      startChar: number;
      endChar: number;
      wordCount: number;
      structureType?: string;
      structurePath?: string[];
      contextHeader?: string;
    }>;
    let chunkingCost = 0;
    let chunkingTokens = 0;

    if (isSmartChunkingEnabled()) {
      // Smart Chunking met alle 4 opties
      console.log('🧠 [Processor] Using SMART CHUNKING (all 4 options)');
      const smartOptions = getSmartChunkingOptions();

      const smartResult = await smartChunkDocument(pages, filename, smartOptions);

      if (smartResult.chunks.length === 0) {
        throw new Error('No chunks could be created from PDF content');
      }

      // Extract content met context header prepended
      chunkContents = smartResult.chunks.map(chunk => {
        if (chunk.contextHeader) {
          return `${chunk.contextHeader}\n\n${chunk.content}`;
        }
        return chunk.content;
      });

      chunkMetadata = smartResult.chunks.map(chunk => ({
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
        startChar: chunk.metadata.startChar,
        endChar: chunk.metadata.endChar,
        wordCount: chunk.metadata.wordCount,
        structureType: chunk.metadata.structureType,
        structurePath: chunk.metadata.structurePath,
        contextHeader: chunk.contextHeader
      }));

      chunkingCost = smartResult.cost;
      chunkingTokens = smartResult.tokensUsed;

      console.log(`✅ [Processor] Smart chunking: ${smartResult.chunks.length} chunks, ${smartResult.structuresDetected} structures`);
      console.log(`💵 [Processor] Semantic chunking cost: $${chunkingCost.toFixed(4)}`);

    } else {
      // Legacy chunking
      console.log('📦 [Processor] Using LEGACY chunking');
      const legacyChunks = chunkDocument(pages);

      if (legacyChunks.length === 0) {
        throw new Error('No chunks could be created from PDF content');
      }

      chunkContents = legacyChunks.map(c => c.content);
      chunkMetadata = legacyChunks.map(chunk => ({
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
        startChar: chunk.metadata.startChar,
        endChar: chunk.metadata.endChar,
        wordCount: chunk.metadata.wordCount
      }));

      console.log(`✅ [Processor] Legacy chunking: ${legacyChunks.length} chunks`);
    }

    // 4. Genereer AI metadata (optioneel - additioneel aan smart chunking)
    let chunkMetadataMap = new Map<number, EnhancedChunkMetadata>();
    let metadataCost = 0;

    if (isMetadataGenerationEnabled()) {
      console.log('\n🧠 [Processor] Generating AI metadata...');

      const chunksWithIndex = chunkContents.map((content, idx) => ({
        content,
        index: idx
      }));

      const metadataResult = await generateMetadataBatch(
        chunksWithIndex,
        filename  // Document context
      );

      chunkMetadataMap = metadataResult.results;
      metadataCost = metadataResult.totalCost;

      console.log(`✅ [Processor] Generated metadata for ${chunkMetadataMap.size} chunks`);
      console.log(`💵 [Processor] Metadata cost: $${metadataCost.toFixed(4)}`);
    } else {
      console.log('\n⏭️  [Processor] Skipping AI metadata (disabled)');
    }

    // 5. Genereer embeddings
    console.log('\n🔢 [Processor] Generating embeddings...');

    // Update log status to embedding
    if (processingLogId) {
      await updateProcessingStatus(processingLogId, 'embedding', {
        chunksCreated: chunkContents.length,
        metadataGenerated: isMetadataGenerationEnabled()
      });
    }

    const { embeddings, totalTokens, totalCost } = await generateEmbeddingsBatch(
      chunkContents
    );

    // 6. Sla chunks op in database
    console.log('\n💾 [Processor] Saving to database...');

    const chunkRecords = chunkContents.map((content, idx) => {
      const enhancedMetadata = chunkMetadataMap.get(idx) || {};
      const meta = chunkMetadata[idx];

      return {
        tenant_id: tenantId,
        document_id: documentId,
        content: content,
        embedding: `[${embeddings[idx].join(',')}]`,
        page_number: meta.pageNumber,
        chunk_index: meta.chunkIndex,
        metadata: {
          startChar: meta.startChar,
          endChar: meta.endChar,
          wordCount: meta.wordCount,
          structureType: meta.structureType,
          structurePath: meta.structurePath,
          contextHeader: meta.contextHeader,
          ...enhancedMetadata     // summary, keywords, topics, alternativeTerms
        }
      };
    });

    // Insert in batches van 50 (Supabase heeft limiet)
    const BATCH_SIZE = 50;
    for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
      const batch = chunkRecords.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(chunkRecords.length / BATCH_SIZE);

      const { error: insertError } = await supabase
        .from('document_chunks')
        .insert(batch);

      if (insertError) throw insertError;

      console.log(`   Saved batch ${batchNum}/${totalBatches}`);
    }

    // 7. Update document status - use REAL page count
    await supabase
      .from('documents')
      .update({
        total_pages: totalPages,  // Echte page count van PDF
        total_chunks: chunkContents.length,
        processing_status: 'completed'
      })
      .eq('id', documentId);

    const finalCost = totalCost + metadataCost + chunkingCost;

    console.log('\n✅ [Processor] ========== PROCESSING COMPLETE ==========');
    console.log('📄 [Processor] Document ID:', documentId);
    console.log('📊 [Processor] Pages:', totalPages);
    console.log('📊 [Processor] Chunks created:', chunkContents.length);
    console.log('🔢 [Processor] Tokens used:', totalTokens + chunkingTokens);
    console.log('💵 [Processor] Smart chunking cost: $' + chunkingCost.toFixed(4));
    console.log('💵 [Processor] Embedding cost: $' + totalCost.toFixed(4));
    console.log('💵 [Processor] Metadata cost: $' + metadataCost.toFixed(4));
    console.log('💵 [Processor] Total cost: $' + finalCost.toFixed(4));

    // Complete document processing log with properly separated costs
    if (processingLogId) {
      const chunkSizes = chunkContents.map(c => c.length);
      await completeDocumentProcessing(processingLogId, {
        totalPages: totalPages,  // Echte page count van PDF
        chunksCreated: chunkContents.length,
        structuresDetected: smartChunkingEnabled ? (chunkMetadata.filter(m => m.structureType).length) : 0,
        avgChunkSize: Math.round(chunkSizes.reduce((sum, size) => sum + size, 0) / chunkSizes.length),
        minChunkSize: Math.min(...chunkSizes),
        maxChunkSize: Math.max(...chunkSizes),
        embeddingTokens: totalTokens,
        embeddingCost: totalCost,
        chunkingTokens: chunkingTokens,  // Semantic chunking tokens (separate from metadata)
        chunkingCost: chunkingCost,      // Semantic chunking cost (separate from metadata)
        metadataTokens: 0,               // TODO: Track actual metadata tokens from generateMetadataBatch
        metadataCost: metadataCost,      // Only metadata generation cost (no chunking)
        metadataGenerated: isMetadataGenerationEnabled()
      });
    }

    return {
      success: true,
      documentId,
      chunksCreated: chunkContents.length,
      totalTokens: totalTokens + chunkingTokens,
      totalCost: finalCost,
      metadataCost: metadataCost,   // Only metadata cost (chunking is separate)
      chunkingCost: chunkingCost    // Semantic chunking cost (separate)
    };

  } catch (error) {
    console.error('❌ [Processor] Processing failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failure to document processing logs
    if (processingLogId) {
      await failDocumentProcessing(processingLogId, errorMessage, 'processing');
    }

    // Update document status to failed
    if (documentId) {
      await supabase
        .from('documents')
        .update({
          processing_status: 'failed',
          processing_error: errorMessage
        })
        .eq('id', documentId);
    }

    return {
      success: false,
      documentId,
      chunksCreated: 0,
      totalTokens: 0,
      totalCost: 0,
      error: errorMessage
    };
  }
}

// ========================================
// DOCUMENT MANAGEMENT
// ========================================

/**
 * Verwijdert een document en alle chunks
 *
 * @param tenantId - Tenant identifier
 * @param documentId - Document ID om te verwijderen
 * @returns True als succesvol
 */
export async function deleteDocument(
  tenantId: string,
  documentId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  console.log('🗑️  [Processor] Deleting document:', documentId);

  // CASCADE delete verwijdert automatisch de chunks
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('❌ [Processor] Delete failed:', error);
    return false;
  }

  console.log('✅ [Processor] Document deleted:', documentId);
  return true;
}

/**
 * Lijst alle documenten voor een tenant
 *
 * @param tenantId - Tenant identifier
 * @returns Array van Document objecten
 */
export async function listDocuments(tenantId: string): Promise<Document[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ [Processor] List failed:', error);
    return [];
  }

  return data || [];
}

/**
 * Haalt een enkel document op
 *
 * @param tenantId - Tenant identifier
 * @param documentId - Document ID
 * @returns Document of null
 */
export async function getDocument(
  tenantId: string,
  documentId: string
): Promise<Document | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    console.error('❌ [Processor] Get document failed:', error);
    return null;
  }

  return data;
}

/**
 * Herverwerkt een document (verwijder chunks en maak opnieuw)
 *
 * @param tenantId - Tenant identifier
 * @param documentId - Document ID
 * @param fileBuffer - Nieuwe file buffer
 * @returns Processing resultaat
 */
export async function reprocessDocument(
  tenantId: string,
  documentId: string,
  fileBuffer: Buffer
): Promise<ProcessingResult> {
  const supabase = getSupabaseClient();

  // Haal document metadata op
  const document = await getDocument(tenantId, documentId);
  if (!document) {
    return {
      success: false,
      chunksCreated: 0,
      totalTokens: 0,
      totalCost: 0,
      error: 'Document not found'
    };
  }

  console.log('🔄 [Processor] Reprocessing document:', documentId);

  // Verwijder bestaande chunks
  const { error: deleteError } = await supabase
    .from('document_chunks')
    .delete()
    .eq('document_id', documentId);

  if (deleteError) {
    console.error('❌ [Processor] Failed to delete existing chunks:', deleteError);
  }

  // Update status naar processing
  await supabase
    .from('documents')
    .update({
      processing_status: 'processing',
      processing_error: null
    })
    .eq('id', documentId);

  // Verwerk opnieuw (hergebruik bestaande logic met smart chunking)
  try {
    const { pages, totalPages } = await extractTextFromPDF(fileBuffer);

    // Smart Chunking of Legacy
    let chunkContents: string[];
    let chunkMetadata: Array<{
      pageNumber?: number;
      chunkIndex: number;
      startChar: number;
      endChar: number;
      wordCount: number;
      structureType?: string;
      structurePath?: string[];
      contextHeader?: string;
    }>;
    let chunkingCost = 0;

    if (isSmartChunkingEnabled()) {
      console.log('🧠 [Processor] Using SMART CHUNKING for reprocess...');
      const smartOptions = getSmartChunkingOptions();
      const smartResult = await smartChunkDocument(pages, document.filename, smartOptions);

      chunkContents = smartResult.chunks.map(chunk =>
        chunk.contextHeader ? `${chunk.contextHeader}\n\n${chunk.content}` : chunk.content
      );

      chunkMetadata = smartResult.chunks.map(chunk => ({
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
        startChar: chunk.metadata.startChar,
        endChar: chunk.metadata.endChar,
        wordCount: chunk.metadata.wordCount,
        structureType: chunk.metadata.structureType,
        structurePath: chunk.metadata.structurePath,
        contextHeader: chunk.contextHeader
      }));

      chunkingCost = smartResult.cost;
    } else {
      const legacyChunks = chunkDocument(pages);
      chunkContents = legacyChunks.map(c => c.content);
      chunkMetadata = legacyChunks.map(chunk => ({
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
        startChar: chunk.metadata.startChar,
        endChar: chunk.metadata.endChar,
        wordCount: chunk.metadata.wordCount
      }));
    }

    // Genereer AI metadata (optioneel)
    let chunkMetadataMap = new Map<number, EnhancedChunkMetadata>();
    let metadataCost = 0;

    if (isMetadataGenerationEnabled()) {
      console.log('🧠 [Processor] Generating AI metadata for reprocess...');

      const chunksWithIndex = chunkContents.map((content, idx) => ({
        content,
        index: idx
      }));

      const metadataResult = await generateMetadataBatch(
        chunksWithIndex,
        document.filename
      );

      chunkMetadataMap = metadataResult.results;
      metadataCost = metadataResult.totalCost;
    }

    const { embeddings, totalTokens, totalCost } = await generateEmbeddingsBatch(
      chunkContents
    );

    const chunkRecords = chunkContents.map((content, idx) => {
      const enhancedMetadata = chunkMetadataMap.get(idx) || {};
      const meta = chunkMetadata[idx];

      return {
        tenant_id: tenantId,
        document_id: documentId,
        content: content,
        embedding: `[${embeddings[idx].join(',')}]`,
        page_number: meta.pageNumber,
        chunk_index: meta.chunkIndex,
        metadata: {
          startChar: meta.startChar,
          endChar: meta.endChar,
          wordCount: meta.wordCount,
          structureType: meta.structureType,
          structurePath: meta.structurePath,
          contextHeader: meta.contextHeader,
          ...enhancedMetadata
        }
      };
    });

    const BATCH_SIZE = 50;
    for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
      const batch = chunkRecords.slice(i, i + BATCH_SIZE);
      await supabase.from('document_chunks').insert(batch);
    }

    await supabase
      .from('documents')
      .update({
        total_pages: totalPages,  // Echte page count van PDF
        total_chunks: chunkContents.length,
        processing_status: 'completed'
      })
      .eq('id', documentId);

    const finalCost = totalCost + metadataCost + chunkingCost;
    console.log('✅ [Processor] Reprocessing complete');

    return {
      success: true,
      documentId,
      chunksCreated: chunkContents.length,
      totalTokens,
      totalCost: finalCost,
      metadataCost: metadataCost + chunkingCost
    };

  } catch (error) {
    await supabase
      .from('documents')
      .update({
        processing_status: 'failed',
        processing_error: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', documentId);

    return {
      success: false,
      documentId,
      chunksCreated: 0,
      totalTokens: 0,
      totalCost: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
