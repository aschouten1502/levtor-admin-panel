/**
 * ========================================
 * SMART CHUNKING - Intelligente Document Chunking
 * ========================================
 *
 * Combineert alle 4 smart chunking opties:
 * 1. Structure Detection (regex) - $0
 * 2. Semantic Chunking (AI) - ~$0.08/doc
 * 3. Context Header Injection - $0
 * 4. Smart Boundaries - $0
 *
 * Totale kosten: ~$0.09-0.12 per document
 * Verwachte verbetering: 70% → 90-95% retrieval accuracy
 */

import {
  ChunkingOptions,
  SmartChunkingOptions,
  TextChunk,
  StructuredChunk,
  SmartChunkingResult,
  DocumentStructure
} from './types';
import {
  detectStructure,
  buildHierarchy,
  generateContextHeader,
  findStructureAtPosition,
  getStructureSummary
} from './structure-detector';
import { semanticChunk } from './semantic-chunker';

// ========================================
// DEFAULT CONFIGURATIE
// ========================================

/**
 * Default smart chunking options
 * Alle features enabled voor maximale kwaliteit
 */
const DEFAULT_SMART_OPTIONS: SmartChunkingOptions = {
  // VERHOOGD: Grotere chunks voor betere context bij juridische documenten
  // 1500 → 3000 chars (~500-800 woorden) voor CAO artikelen etc.
  targetChunkSize: 3000,
  minChunkSize: 500,       // Was 200 - voorkomt te kleine fragmenten
  maxChunkSize: 4000,      // Was 2500 - ruimte voor volledige artikelen
  overlapPercentage: 20,   // Was 15 - meer overlap voor context

  // Alle 4 opties enabled
  enableStructureDetection: true,
  enableSemanticChunking: true,
  enableContextHeaders: true,
  enableSmartBoundaries: true,

  // AI settings
  semanticModel: 'gpt-4o-mini',
  batchSize: 10
};

/**
 * Legacy chunking options (backwards compatibility)
 */
const DEFAULT_LEGACY_OPTIONS: ChunkingOptions = {
  chunkSize: 1000,
  chunkOverlap: 200,
  minChunkSize: 100
};

// ========================================
// SMART BOUNDARIES - Priority Scores
// ========================================

const BOUNDARY_SCORES = {
  articleStart: 100,      // Nieuwe artikel = perfecte grens
  chapterStart: 100,      // Nieuw hoofdstuk
  sectionStart: 90,       // Nieuwe sectie
  paragraphEnd: 70,       // Lege regel (dubbele newline)
  listEnd: 60,            // Einde van opsomming
  sentenceEnd: 40,        // Punt + spatie + hoofdletter
  colonNewline: 30,       // ":" gevolgd door newline
  clauseEnd: 10,          // Komma/puntkomma
};

// ========================================
// MAIN SMART CHUNKING FUNCTION
// ========================================

/**
 * Smart chunk een document met alle 4 opties
 *
 * @param pages - Array van pagina's met pageNumber en text
 * @param documentName - Naam van het document (voor context headers)
 * @param options - Smart chunking opties
 * @returns Chunks met metadata, kosten en tokens
 */
export async function smartChunkDocument(
  pages: Array<{ pageNumber: number; text: string }>,
  documentName: string,
  options: Partial<SmartChunkingOptions> = {}
): Promise<SmartChunkingResult> {
  const opts = { ...DEFAULT_SMART_OPTIONS, ...options };

  console.log('\n✂️ [SmartChunk] ========== SMART CHUNKING ==========');
  console.log(`📄 [SmartChunk] Document: ${documentName}`);
  console.log(`📄 [SmartChunk] Pages: ${pages.length}`);
  console.log(`⚙️ [SmartChunk] Options:`, {
    structure: opts.enableStructureDetection,
    semantic: opts.enableSemanticChunking,
    headers: opts.enableContextHeaders,
    smart: opts.enableSmartBoundaries
  });

  // 1. Combineer alle pagina's tot één tekst
  const fullText = combinePages(pages);
  console.log(`📏 [SmartChunk] Total text: ${fullText.length} chars`);

  if (fullText.length === 0) {
    return {
      chunks: [],
      cost: 0,
      tokensUsed: 0,
      structuresDetected: 0
    };
  }

  // 2. Detecteer document structuur
  let structures: DocumentStructure[] = [];
  if (opts.enableStructureDetection) {
    structures = detectStructure(fullText);
    console.log(`🏗️ [SmartChunk] Detected: ${getStructureSummary(structures)}`);
  }

  // 3. Maak chunks
  let rawChunks: string[];
  let semanticCost = 0;
  let semanticTokens = 0;

  if (opts.enableSemanticChunking) {
    // AI-powered chunking
    const result = await semanticChunk(fullText, opts);
    rawChunks = result.chunks;
    semanticCost = result.cost;
    semanticTokens = result.tokensUsed;
  } else if (opts.enableSmartBoundaries) {
    // Smart boundaries zonder AI
    rawChunks = smartBoundaryChunk(fullText, structures, opts);
  } else {
    // Fallback naar legacy chunking
    rawChunks = legacyChunk(fullText, opts);
  }

  console.log(`📦 [SmartChunk] Created ${rawChunks.length} raw chunks`);

  // 4. Converteer naar StructuredChunks met metadata
  const structuredChunks = rawChunks.map((content, idx) => {
    const trimmedContent = content.trim();
    const startChar = findChunkStartPosition(fullText, trimmedContent, idx);
    const pageNumber = findPageForPosition(pages, startChar);

    // Zoek structuur voor deze chunk
    const structure = opts.enableStructureDetection
      ? findStructureAtPosition(structures, startChar)
      : undefined;

    // Genereer context header
    const contextHeader = opts.enableContextHeaders
      ? generateContextHeader(documentName, structure, structures, startChar)
      : '';

    // Bouw structuur pad
    const structurePath = structure
      ? buildStructurePath(structure)
      : [];

    const chunk: StructuredChunk = {
      content: trimmedContent,
      contextHeader,
      structure,
      pageNumber,
      chunkIndex: idx,
      metadata: {
        startChar,
        endChar: startChar + trimmedContent.length,
        wordCount: countWords(trimmedContent),
        structureType: structure?.type,
        structurePath
      }
    };

    return chunk;
  });

  // 5. Filter te kleine chunks (merge met vorige)
  const finalChunks = mergeSmallChunks(structuredChunks, opts.minChunkSize);

  console.log(`✅ [SmartChunk] Final: ${finalChunks.length} chunks`);
  console.log(`💰 [SmartChunk] Semantic cost: $${semanticCost.toFixed(4)}`);

  return {
    chunks: finalChunks,
    cost: semanticCost,
    tokensUsed: semanticTokens,
    structuresDetected: structures.length
  };
}

// ========================================
// SMART BOUNDARY CHUNKING (No AI)
// ========================================

/**
 * Chunk met smart boundaries maar zonder AI
 */
function smartBoundaryChunk(
  text: string,
  structures: DocumentStructure[],
  opts: SmartChunkingOptions
): string[] {
  const chunks: string[] = [];
  let currentStart = 0;

  while (currentStart < text.length) {
    // Bepaal target eind positie
    const targetEnd = currentStart + opts.targetChunkSize;

    if (targetEnd >= text.length) {
      // Laatste chunk
      chunks.push(text.slice(currentStart).trim());
      break;
    }

    // Zoek beste boundary rond target
    const bestBoundary = findBestBoundary(
      text,
      structures,
      targetEnd,
      opts.minChunkSize,
      opts.maxChunkSize
    );

    chunks.push(text.slice(currentStart, bestBoundary).trim());

    // Begin nieuwe chunk met overlap
    const overlapChars = Math.floor(opts.targetChunkSize * opts.overlapPercentage / 100);
    currentStart = Math.max(bestBoundary - overlapChars, bestBoundary);

    // Zorg dat we niet in het midden van een woord beginnen
    while (currentStart < text.length && !/\s/.test(text[currentStart - 1] || '')) {
      currentStart++;
    }
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Vindt de beste boundary positie rond een target index
 */
function findBestBoundary(
  text: string,
  structures: DocumentStructure[],
  targetIndex: number,
  minSize: number,
  maxSize: number
): number {
  const searchStart = Math.max(minSize, targetIndex - 300);
  const searchEnd = Math.min(text.length, targetIndex + 300);

  let bestIndex = targetIndex;
  let bestScore = 0;

  // Check voor structure boundaries
  for (const struct of structures) {
    if (struct.startIndex > searchStart && struct.startIndex < searchEnd) {
      const score = struct.type === 'article' || struct.type === 'chapter'
        ? BOUNDARY_SCORES.articleStart
        : BOUNDARY_SCORES.sectionStart;

      if (score > bestScore) {
        bestScore = score;
        bestIndex = struct.startIndex;
      }
    }
  }

  // Check voor paragraaf grenzen
  const searchWindow = text.slice(searchStart, searchEnd);
  const paragraphMatches = [...searchWindow.matchAll(/\n\n+/g)];
  for (const match of paragraphMatches) {
    if (match.index !== undefined) {
      const absoluteIndex = searchStart + match.index + match[0].length;
      if (BOUNDARY_SCORES.paragraphEnd > bestScore) {
        bestScore = BOUNDARY_SCORES.paragraphEnd;
        bestIndex = absoluteIndex;
      }
    }
  }

  // Check voor zin-eindes
  if (bestScore < BOUNDARY_SCORES.sentenceEnd) {
    const sentenceMatches = [...searchWindow.matchAll(/[.!?]\s+(?=[A-Z])/g)];
    const lastMatch = sentenceMatches[sentenceMatches.length - 1];
    if (lastMatch?.index !== undefined) {
      bestIndex = searchStart + lastMatch.index + lastMatch[0].length;
    }
  }

  return Math.min(bestIndex, maxSize);
}

// ========================================
// LEGACY CHUNKING (Backwards Compatible)
// ========================================

/**
 * Legacy chunking voor backwards compatibility
 */
function legacyChunk(text: string, opts: SmartChunkingOptions): string[] {
  const chunks: string[] = [];
  const chunkSize = opts.targetChunkSize;
  const overlap = Math.floor(chunkSize * opts.overlapPercentage / 100);

  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // Zoek zin-einde
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      if (lastPeriod > start + opts.minChunkSize) {
        end = lastPeriod + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());

    start = end - overlap;
    if (start >= text.length - opts.minChunkSize) {
      break;
    }
  }

  return chunks.filter(c => c.length > 0);
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Combineert pagina's tot één tekst met page markers
 */
function combinePages(pages: Array<{ pageNumber: number; text: string }>): string {
  return pages
    .map(p => p.text.trim())
    .filter(t => t.length > 0)
    .join('\n\n');
}

/**
 * Vindt de start positie van een chunk in de originele tekst
 */
function findChunkStartPosition(fullText: string, chunkContent: string, chunkIndex: number): number {
  // Simpele substring search
  const searchStart = chunkIndex === 0 ? 0 : Math.max(0, fullText.length / 2 - 5000);
  const index = fullText.indexOf(chunkContent.slice(0, 100), searchStart);
  return index >= 0 ? index : 0;
}

/**
 * Bepaalt paginanummer voor een positie in de gecombineerde tekst
 */
function findPageForPosition(
  pages: Array<{ pageNumber: number; text: string }>,
  position: number
): number | undefined {
  let currentPos = 0;

  for (const page of pages) {
    const pageEnd = currentPos + page.text.length + 2; // +2 voor \n\n
    if (position < pageEnd) {
      return page.pageNumber;
    }
    currentPos = pageEnd;
  }

  return pages.length > 0 ? pages[pages.length - 1].pageNumber : undefined;
}

/**
 * Bouwt het structuur pad als array
 */
function buildStructurePath(structure: DocumentStructure): string[] {
  const path: string[] = [];
  let current: DocumentStructure | undefined = structure;

  while (current) {
    const label = current.identifier
      ? (current.title ? `${current.identifier} ${current.title}` : current.identifier)
      : current.title;

    if (label) {
      path.unshift(label);
    }

    current = current.parent;
  }

  return path;
}

/**
 * Merged te kleine chunks met de vorige
 */
function mergeSmallChunks(
  chunks: StructuredChunk[],
  minSize: number
): StructuredChunk[] {
  const result: StructuredChunk[] = [];

  for (const chunk of chunks) {
    if (chunk.content.length < minSize && result.length > 0) {
      // Merge met vorige chunk
      const prev = result[result.length - 1];
      prev.content = `${prev.content}\n\n${chunk.content}`;
      prev.metadata.endChar = chunk.metadata.endChar;
      prev.metadata.wordCount = countWords(prev.content);
    } else {
      result.push(chunk);
    }
  }

  // Re-index
  result.forEach((chunk, idx) => {
    chunk.chunkIndex = idx;
  });

  return result;
}

/**
 * Telt woorden in tekst
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

// ========================================
// LEGACY EXPORTS (Backwards Compatible)
// ========================================

/**
 * Legacy chunkText functie - gebruikt smart chunking intern
 * Maar zonder async (voor backwards compatibility)
 */
export function chunkText(
  text: string,
  pageNumber?: number,
  options: Partial<ChunkingOptions> = {}
): TextChunk[] {
  const opts = { ...DEFAULT_LEGACY_OPTIONS, ...options };
  const chunks: TextChunk[] = [];

  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ')
    .trim();

  if (normalizedText.length === 0) {
    return [];
  }

  // Simpele chunking voor legacy interface
  const paragraphs = normalizedText.split(/\n\s*\n/);
  let currentChunk = '';
  let chunkStartChar = 0;
  let currentPosition = 0;

  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    if (trimmedPara.length === 0) continue;

    if (currentChunk.length + trimmedPara.length + 2 <= opts.chunkSize) {
      currentChunk = currentChunk
        ? `${currentChunk}\n\n${trimmedPara}`
        : trimmedPara;
    } else {
      if (currentChunk.length >= opts.minChunkSize) {
        chunks.push({
          content: currentChunk,
          pageNumber,
          chunkIndex: chunks.length,
          metadata: {
            startChar: chunkStartChar,
            endChar: chunkStartChar + currentChunk.length,
            wordCount: countWords(currentChunk)
          }
        });
      }

      currentChunk = trimmedPara;
      chunkStartChar = currentPosition;
    }

    currentPosition += trimmedPara.length + 2;
  }

  // Laatste chunk
  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk,
      pageNumber,
      chunkIndex: chunks.length,
      metadata: {
        startChar: chunkStartChar,
        endChar: chunkStartChar + currentChunk.length,
        wordCount: countWords(currentChunk)
      }
    });
  }

  return chunks;
}

/**
 * Legacy chunkDocument functie
 */
export function chunkDocument(
  pages: Array<{ pageNumber: number; text: string }>,
  options: Partial<ChunkingOptions> = {}
): TextChunk[] {
  const allChunks: TextChunk[] = [];

  for (const page of pages) {
    const pageChunks = chunkText(page.text, page.pageNumber, options);
    pageChunks.forEach(chunk => {
      chunk.chunkIndex = allChunks.length;
      allChunks.push(chunk);
    });
  }

  console.log(`📚 [Chunking] Document: ${pages.length} pages → ${allChunks.length} chunks`);

  return allChunks;
}

// ========================================
// EXPORTS
// ========================================

export { DEFAULT_SMART_OPTIONS, DEFAULT_LEGACY_OPTIONS as DEFAULT_CHUNKING_OPTIONS };
export type { TextChunk, StructuredChunk };
