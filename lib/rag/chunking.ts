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
  // CAO artikelen en regelgeving hebben vaak meer context nodig
  targetChunkSize: 3500,   // Was 3000 - ruimte voor volledige artikelen
  minChunkSize: 600,       // Was 500 - voorkomt te kleine fragmenten
  maxChunkSize: 5000,      // Was 4000 - ruimte voor complete secties
  overlapPercentage: 25,   // Was 20 - meer overlap voor context continuïteit

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

  // 1. Combineer alle pagina's tot één tekst MET boundary tracking
  const { fullText, boundaries } = combinePages(pages);
  console.log(`📏 [SmartChunk] Total text: ${fullText.length} chars`);
  console.log(`📄 [SmartChunk] Page boundaries tracked: ${boundaries.length} pages`);

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
  let chunkPositions: number[] | null = null;  // Posities van semantic chunker (indien beschikbaar)
  let semanticCost = 0;
  let semanticTokens = 0;

  if (opts.enableSemanticChunking) {
    // AI-powered chunking - returns both chunks and their estimated positions
    const result = await semanticChunk(fullText, opts);
    rawChunks = result.chunks;
    chunkPositions = result.chunkPositions;
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
  // Track lastKnownPosition om sequentieel door het document te zoeken
  let lastKnownPosition = 0;
  const totalChunks = rawChunks.length;

  const structuredChunks: StructuredChunk[] = [];

  for (let idx = 0; idx < rawChunks.length; idx++) {
    const content = rawChunks[idx];
    const trimmedContent = content.trim();

    // Gebruik chunkPositions als HINT voor waar te beginnen zoeken, niet als definitieve positie
    // De semantic chunker geeft proportionele schattingen die vaak niet kloppen
    const searchHint = (chunkPositions && chunkPositions[idx] !== undefined)
      ? Math.max(0, chunkPositions[idx] - 500)  // Start zoeken 500 chars eerder dan hint
      : lastKnownPosition;

    // Zoek ALTIJD de echte positie met verbeterde fuzzy matching
    const startChar = findChunkStartPosition(
      fullText,
      trimmedContent,
      searchHint,
      idx,           // chunk index voor proportionele fallback
      totalChunks    // totaal chunks voor proportionele fallback
    );

    // Update lastKnownPosition - BELANGRIJK: altijd vooruit gaan om document sequentieel te doorlopen
    // Gebruik 80% van chunk lengte om overlap te compenseren
    lastKnownPosition = Math.max(lastKnownPosition, startChar + Math.floor(trimmedContent.length * 0.8));

    // Bepaal paginanummer op basis van positie in de gecombineerde tekst
    const pageNumber = findPageForPosition(boundaries, startChar);

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

    structuredChunks.push(chunk);
  }

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
 * Page boundary tracking voor correcte paginanummer toewijzing
 */
interface PageBoundary {
  pageNumber: number;
  startPos: number;
  endPos: number;
}

/**
 * Result type voor combinePages met boundary tracking
 */
interface CombinedPagesResult {
  fullText: string;
  boundaries: PageBoundary[];
}

/**
 * Combineert pagina's tot één tekst EN trackt de boundaries.
 * Dit is cruciaal voor correcte paginanummer toewijzing aan chunks.
 */
function combinePages(pages: Array<{ pageNumber: number; text: string }>): CombinedPagesResult {
  const boundaries: PageBoundary[] = [];
  let currentPos = 0;

  const textParts: string[] = [];

  for (const page of pages) {
    const trimmedText = page.text.trim();
    if (trimmedText.length === 0) continue;

    const startPos = currentPos;
    const endPos = currentPos + trimmedText.length;

    boundaries.push({
      pageNumber: page.pageNumber,
      startPos,
      endPos
    });

    textParts.push(trimmedText);
    currentPos = endPos + 2; // +2 voor de \n\n separator
  }

  const fullText = textParts.join('\n\n');

  return { fullText, boundaries };
}

/**
 * Vindt de start positie van een chunk in de originele tekst.
 * Gebruikt meerdere zoekstrategieën met fuzzy matching.
 * Bij falen: proportionele schatting op basis van chunk index (NIET lastKnownPosition).
 *
 * @param fullText - De volledige tekst van het document
 * @param chunkContent - De content van de chunk om te vinden
 * @param lastKnownPosition - De positie waar de vorige chunk eindigde (voor sequentiële search)
 * @param chunkIndex - Index van de huidige chunk (voor proportionele fallback)
 * @param totalChunks - Totaal aantal chunks (voor proportionele fallback)
 * @returns De startpositie van de chunk in fullText
 */
function findChunkStartPosition(
  fullText: string,
  chunkContent: string,
  lastKnownPosition: number,
  chunkIndex: number = 0,
  totalChunks: number = 1
): number {
  // Gebruik een groter fragment voor betrouwbaardere matching
  const searchFragment = chunkContent.slice(0, 150).trim();

  if (searchFragment.length < 20) {
    // Te kort om betrouwbaar te matchen - gebruik proportionele schatting
    const estimated = Math.floor((chunkIndex / Math.max(totalChunks, 1)) * fullText.length);
    console.warn(`⚠️ [Chunking] Fragment too short for chunk ${chunkIndex}, estimated position: ${estimated}`);
    return estimated;
  }

  // Zoek vanaf de laatste bekende positie (met wat marge voor overlap)
  const searchStart = Math.max(0, lastKnownPosition - 500);

  // Poging 1: Exact match vanaf lastKnownPosition
  let index = fullText.indexOf(searchFragment, searchStart);
  if (index >= 0) {
    return index;
  }

  // Poging 2: Korter fragment (80 chars) voor meer flexibiliteit
  const shortFragment = chunkContent.slice(0, 80).trim();
  index = fullText.indexOf(shortFragment, searchStart);
  if (index >= 0) {
    return index;
  }

  // Poging 3: Zoek vanaf begin document (chunk kan door overlap eerder voorkomen)
  index = fullText.indexOf(searchFragment);
  if (index >= 0) {
    return index;
  }

  // Poging 4: Nog korter fragment (50 chars) vanaf begin
  const veryShortFragment = chunkContent.slice(0, 50).trim();
  index = fullText.indexOf(veryShortFragment);
  if (index >= 0) {
    return index;
  }

  // Poging 5: Normaliseer whitespace en zoek opnieuw
  const normalizedFragment = searchFragment.replace(/\s+/g, ' ');
  const normalizedText = fullText.replace(/\s+/g, ' ');
  const normalizedStart = Math.floor(searchStart * (normalizedText.length / fullText.length));
  index = normalizedText.indexOf(normalizedFragment, normalizedStart);
  if (index >= 0) {
    // Map terug naar originele positie (geschat)
    return Math.floor(index * (fullText.length / normalizedText.length));
  }

  // Poging 6: Zoek genormaliseerd vanaf begin
  index = normalizedText.indexOf(normalizedFragment);
  if (index >= 0) {
    return Math.floor(index * (fullText.length / normalizedText.length));
  }

  // FALLBACK: Proportionele schatting op basis van chunk index
  // Dit is VEEL beter dan lastKnownPosition retourneren (die vaak 0 is)!
  const estimatedPosition = Math.floor((chunkIndex / Math.max(totalChunks, 1)) * fullText.length);
  console.warn(`⚠️ [Chunking] Could not find chunk ${chunkIndex}, estimated position: ${estimatedPosition} (of ${fullText.length})`);
  return estimatedPosition;
}

/**
 * Bepaalt paginanummer voor een positie in de gecombineerde tekst.
 * Gebruikt de pre-computed boundaries voor accurate lookup.
 */
function findPageForPosition(
  boundaries: PageBoundary[],
  position: number
): number | undefined {
  // Binary search zou efficiënter zijn, maar voor de meeste documenten
  // is linear search snel genoeg (< 1000 pagina's)
  for (const boundary of boundaries) {
    // Check of positie binnen deze pagina valt
    // We gebruiken boundary.endPos + 2 om de \n\n separator mee te nemen
    if (position >= boundary.startPos && position <= boundary.endPos + 2) {
      return boundary.pageNumber;
    }
  }

  // Fallback: als positie voorbij laatste boundary, return laatste pagina
  if (boundaries.length > 0 && position > boundaries[boundaries.length - 1].endPos) {
    return boundaries[boundaries.length - 1].pageNumber;
  }

  // Fallback: eerste pagina als er boundaries zijn
  return boundaries.length > 0 ? boundaries[0].pageNumber : undefined;
}

/**
 * Legacy wrapper voor backwards compatibility
 * @deprecated Gebruik findPageForPosition met boundaries in plaats van pages array
 */
function findPageForPositionLegacy(
  pages: Array<{ pageNumber: number; text: string }>,
  position: number
): number | undefined {
  const { boundaries } = combinePages(pages);
  return findPageForPosition(boundaries, position);
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
