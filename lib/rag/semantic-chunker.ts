/**
 * ========================================
 * SEMANTIC CHUNKER - AI-Powered Chunk Boundaries
 * ========================================
 *
 * Gebruikt GPT-4o-mini om optimale chunk grenzen te bepalen.
 * De AI analyseert de tekst en markeert waar nieuwe chunks
 * moeten beginnen voor optimale RAG retrieval.
 *
 * Kosten: ~$0.08 per document (50K chars)
 */

import OpenAI from 'openai';
import { SmartChunkingOptions } from './types';

// ========================================
// OPENAI CLIENT
// ========================================

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ========================================
// COST TRACKING
// ========================================

// GPT-4o-mini pricing (per 1M tokens)
const PRICING = {
  'gpt-4o-mini': {
    input: 0.15,   // $0.15 per 1M input tokens
    output: 0.60   // $0.60 per 1M output tokens
  },
  'gpt-4o': {
    input: 2.50,   // $2.50 per 1M input tokens
    output: 10.00  // $10.00 per 1M output tokens
  }
};

// ========================================
// SEMANTIC CHUNKING PROMPT
// ========================================

const SEMANTIC_CHUNKING_PROMPT = `Je bent een document-analyzer voor een HR RAG systeem. Analyseer de volgende tekst en bepaal de optimale chunk grenzen.

REGELS:
1. Houd semantisch samenhangende tekst bij elkaar
2. Split NOOIT midden in een zin
3. Split NOOIT midden in een opsomming of tabel
4. Artikelen, secties en hoofdstukken zijn natuurlijke grenzen
5. Target: chunks van 500-800 woorden (ca. 2500-4000 karakters) - GROTERE CHUNKS voor betere context
6. Markeer grenzen met de marker: |||CHUNK|||
7. Plaats de marker VOOR de tekst waar een nieuwe chunk begint
8. De eerste chunk heeft GEEN marker nodig aan het begin

BELANGRIJK:
- Output ALLEEN de tekst met markers, GEEN uitleg of commentaar
- Begin NIET met "Hier is..." of andere inleidende tekst
- Kopieer de tekst exact, voeg alleen |||CHUNK||| markers toe

VOORBEELD INPUT:
Artikel 4.3 Vakantiegeld
De werknemer heeft recht op vakantiegeld van 8%.
Artikel 4.4 Eindejaarsuitkering
De werknemer ontvangt een eindejaarsuitkering.

VOORBEELD OUTPUT:
Artikel 4.3 Vakantiegeld
De werknemer heeft recht op vakantiegeld van 8%.
|||CHUNK|||
Artikel 4.4 Eindejaarsuitkering
De werknemer ontvangt een eindejaarsuitkering.

TEKST OM TE ANALYSEREN:
`;

// ========================================
// MAIN FUNCTION
// ========================================

/**
 * Bepaalt optimale chunk grenzen met AI
 *
 * @param text - De tekst om te analyseren
 * @param options - Chunking opties
 * @returns Object met chunks, kosten en tokens
 */
export async function semanticChunk(
  text: string,
  options: Partial<SmartChunkingOptions> = {}
): Promise<{
  chunks: string[];
  chunkPositions: number[];  // Start positions for each chunk (estimated)
  cost: number;
  tokensUsed: number;
}> {
  const model = options.semanticModel || 'gpt-4o-mini';

  // Voor hele korte teksten, return als één chunk
  if (text.length < 500) {
    return {
      chunks: [text.trim()],
      chunkPositions: [0],
      cost: 0,
      tokensUsed: 0
    };
  }

  console.log(`🧠 [Semantic] Analyzing ${text.length} chars with ${model}...`);

  try {
    const openai = getOpenAI();

    // Voor hele lange documenten, verwerk in batches
    const maxCharsPerRequest = 15000; // ~4K tokens
    let allChunks: string[] = [];
    let totalCost = 0;
    let totalTokens = 0;

    // Split in secties als document te lang is
    const sections = splitIntoSections(text, maxCharsPerRequest);

    // Track positions for each section
    let cumulativeSectionStart = 0;
    const allPositions: number[] = [];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      console.log(`   Processing section ${i + 1}/${sections.length} (${section.length} chars)`);

      const result = await processSection(openai, section, model);

      // Adjust chunk positions relative to full document
      const adjustedPositions = result.chunkPositions.map(pos => pos + cumulativeSectionStart);

      allChunks = [...allChunks, ...result.chunks];
      allPositions.push(...adjustedPositions);
      totalCost += result.cost;
      totalTokens += result.tokensUsed;

      // Update cumulative start for next section
      cumulativeSectionStart += section.length;
    }

    console.log(`✅ [Semantic] Created ${allChunks.length} semantic chunks`);
    console.log(`💰 [Semantic] Cost: $${totalCost.toFixed(4)}, Tokens: ${totalTokens}`);

    return {
      chunks: allChunks,
      chunkPositions: allPositions,
      cost: totalCost,
      tokensUsed: totalTokens
    };

  } catch (error) {
    console.error('❌ [Semantic] AI chunking failed:', error);

    // Fallback: return originele tekst als één chunk
    return {
      chunks: [text.trim()],
      chunkPositions: [0],
      cost: 0,
      tokensUsed: 0
    };
  }
}

/**
 * Verwerkt één sectie met de AI
 */
async function processSection(
  openai: OpenAI,
  text: string,
  model: 'gpt-4o-mini' | 'gpt-4o'
): Promise<{
  chunks: string[];
  chunkPositions: number[];
  cost: number;
  tokensUsed: number;
}> {
  const prompt = SEMANTIC_CHUNKING_PROMPT + text;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.1, // Laag voor consistentie
    max_tokens: Math.ceil(text.length / 2) + 500 // Iets meer dan input voor markers
  });

  const outputText = response.choices[0]?.message?.content || text;

  // Parse chunks uit output with positions
  const { chunks, positions } = parseChunksFromOutputWithPositions(outputText, text.length);

  // Bereken kosten
  const inputTokens = response.usage?.prompt_tokens || 0;
  const outputTokens = response.usage?.completion_tokens || 0;
  const totalTokens = inputTokens + outputTokens;

  const pricing = PRICING[model];
  const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;

  return {
    chunks,
    chunkPositions: positions,
    cost,
    tokensUsed: totalTokens
  };
}

/**
 * Splitst een lange tekst in secties voor batch processing
 */
function splitIntoSections(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const sections: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      sections.push(remaining);
      break;
    }

    // Zoek een goede split positie
    let splitIndex = findGoodSplitPoint(remaining, maxLength);
    sections.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  return sections;
}

/**
 * Vindt een goede split positie (niet mid-zin)
 */
function findGoodSplitPoint(text: string, targetIndex: number): number {
  const searchWindow = 500;
  const start = Math.max(0, targetIndex - searchWindow);

  // Zoek naar paragraaf grenzen (dubbele newline)
  let bestIndex = targetIndex;
  const paragraphMatch = text.slice(start, targetIndex).lastIndexOf('\n\n');
  if (paragraphMatch > 0) {
    bestIndex = start + paragraphMatch + 2;
    return bestIndex;
  }

  // Fallback: zoek naar zin-einde
  const sentencePattern = /[.!?]\s+[A-Z]/g;
  let lastMatch = null;
  let match;

  const searchText = text.slice(start, targetIndex);
  while ((match = sentencePattern.exec(searchText)) !== null) {
    lastMatch = match;
  }

  if (lastMatch) {
    bestIndex = start + lastMatch.index + 2; // Na de punt en spatie
  }

  return bestIndex;
}

// Patronen die wijzen op AI instructie-tekst (niet documentinhoud)
const AI_INSTRUCTION_PATTERNS = [
  /^Hier is de (geanalyseerde )?tekst.*/i,
  /^Hier zijn de chunks.*/i,
  /^De tekst is opgedeeld.*/i,
  /^Ik heb de tekst.*/i,
  /^De volgende chunks.*/i,
  /^Output:/i,
  /^Chunks:/i,
  /^Resultaat:/i,
  /^Geanalyseerde tekst:/i,
  /met de optimale chunk grenzen/i,
];

/**
 * Parse chunks uit AI output met |||CHUNK||| markers
 * Retourneert ook geschatte posities voor elke chunk
 *
 * @param output - AI output met |||CHUNK||| markers
 * @param originalTextLength - Lengte van de originele input tekst (voor proportionele positie mapping)
 * @returns Object met chunks en hun geschatte start posities
 */
function parseChunksFromOutputWithPositions(
  output: string,
  originalTextLength: number
): { chunks: string[]; positions: number[] } {
  const marker = '|||CHUNK|||';

  // Track posities in de AI output
  const parts = output.split(marker);
  const chunks: string[] = [];
  const positions: number[] = [];

  let currentOutputPosition = 0;

  for (const part of parts) {
    let cleaned = part.trim();

    // Verwijder AI instructie-tekst aan het begin van de chunk
    for (const pattern of AI_INSTRUCTION_PATTERNS) {
      const match = cleaned.match(pattern);
      if (match && cleaned.indexOf(match[0]) === 0) {
        const newlineIndex = cleaned.indexOf('\n');
        if (newlineIndex > 0) {
          cleaned = cleaned.slice(newlineIndex + 1).trim();
        }
      }
    }

    // Filter lege of instructie-only chunks
    if (cleaned.length === 0) {
      currentOutputPosition += part.length + marker.length;
      continue;
    }

    if (cleaned.length < 50) {
      let isInstruction = false;
      for (const pattern of AI_INSTRUCTION_PATTERNS) {
        if (pattern.test(cleaned)) {
          isInstruction = true;
          break;
        }
      }
      if (isInstruction) {
        currentOutputPosition += part.length + marker.length;
        continue;
      }
    }

    // Schat positie in originele tekst proportioneel
    // De AI output zou ongeveer even lang moeten zijn als de input (minus/plus markers)
    const outputTotalLength = output.length;
    const proportionalPosition = Math.floor(
      (currentOutputPosition / outputTotalLength) * originalTextLength
    );

    chunks.push(cleaned);
    positions.push(proportionalPosition);

    currentOutputPosition += part.length + marker.length;
  }

  return { chunks, positions };
}

/**
 * Parse chunks uit AI output met |||CHUNK||| markers (legacy, without positions)
 * @deprecated Use parseChunksFromOutputWithPositions instead
 */
function parseChunksFromOutput(output: string): string[] {
  return parseChunksFromOutputWithPositions(output, output.length).chunks;
}

// ========================================
// ALTERNATIVE: BOUNDARY DETECTION
// ========================================

/**
 * Alternatieve methode: vraag AI alleen om boundary indices
 * (Efficiënter voor hele lange documenten)
 */
export async function detectBoundaries(
  text: string,
  options: Partial<SmartChunkingOptions> = {}
): Promise<{
  boundaries: number[];
  cost: number;
  tokensUsed: number;
}> {
  const model = options.semanticModel || 'gpt-4o-mini';

  const prompt = `Analyseer deze tekst en geef de character indices waar nieuwe chunks moeten beginnen.

REGELS:
- Chunks moeten 300-500 woorden zijn
- Split op natuurlijke grenzen (artikelen, secties, paragrafen)
- Nooit mid-zin splitsen

TEKST (${text.length} karakters):
${text.slice(0, 3000)}${text.length > 3000 ? '...[truncated]' : ''}

OUTPUT: JSON array van indices, bijv: [0, 1523, 3045, 4567]
Alleen de array, geen uitleg.`;

  try {
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 500
    });

    const outputText = response.choices[0]?.message?.content || '[]';

    // Parse JSON array
    const jsonMatch = outputText.match(/\[[\d,\s]+\]/);
    const boundaries: number[] = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : [0];

    // Bereken kosten
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const pricing = PRICING[model];
    const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;

    return {
      boundaries,
      cost,
      tokensUsed: inputTokens + outputTokens
    };

  } catch (error) {
    console.error('❌ [Semantic] Boundary detection failed:', error);
    return {
      boundaries: [0],
      cost: 0,
      tokensUsed: 0
    };
  }
}

// ========================================
// EXPORTS
// ========================================

export { PRICING as SEMANTIC_CHUNKING_PRICING };
