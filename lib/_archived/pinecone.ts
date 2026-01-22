/**
 * ========================================
 * PINECONE ASSISTANT - Context Retrieval
 * ========================================
 *
 * Dit bestand bevat alle logica voor het ophalen van relevante context
 * uit de HR documentatie via Pinecone Assistant.
 *
 * Pinecone Assistant is een vector database die:
 * - HR documenten opslaat als "embeddings" (vectoren)
 * - Relevante passages vindt bij een vraag (semantic search)
 * - De beste 3 snippets teruggeeft met bron en paginanummers
 */

import { Pinecone } from '@pinecone-database/pinecone';

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * Een enkel snippet uit de HR documentatie
 */
export interface ContextSnippet {
  content: string;           // De tekst van het snippet
  score?: number;           // Hoe relevant dit snippet is (0-1)
  reference?: {
    file?: {
      name: string;         // Naam van het bronbestand
    };
    pages?: number[];       // Paginanummers waar dit snippet voorkomt
  };
}

/**
 * Response van Pinecone Assistant met alle snippets en usage info
 */
export interface PineconeContextResponse {
  snippets: ContextSnippet[];
  usage?: {
    promptTokens: number;      // Aantal tokens gebruikt voor de query
    completionTokens: number;  // Altijd 0 bij context retrieval
    totalTokens: number;       // Totaal aantal tokens
  };
}

/**
 * Citation info voor weergave in de frontend
 */
export interface Citation {
  position: number;           // Positie van het snippet (0, 1, 2)
  preview: string;           // Eerste en laatste 3 woorden als preview
  references: Array<{
    pages: number[];         // Paginanummers
    file?: {
      name: string;          // Bestandsnaam
    };
  }>;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Haalt de eerste 3 en laatste 3 woorden uit een tekst als preview
 *
 * @param text - De volledige tekst
 * @returns Preview string (bijv. "Artikel 1 regelt ... conform de CAO")
 */
export function extractSnippetPreview(text: string): string {
  if (!text) return '';

  // Verwijder extra whitespace en newlines
  const cleaned = text.trim().replace(/\s+/g, ' ');

  // Split in woorden
  const words = cleaned.split(' ');

  // Als tekst heel kort is, return alles
  if (words.length <= 6) {
    return cleaned;
  }

  // Pak eerste 3 en laatste 3 woorden
  const firstThree = words.slice(0, 3).join(' ');
  const lastThree = words.slice(-3).join(' ');

  return `${firstThree} ... ${lastThree}`;
}

// ========================================
// PINECONE CLIENT
// ========================================

/**
 * Initialiseert de Pinecone client
 *
 * @param apiKey - Pinecone API key uit environment variabelen
 * @returns Pinecone client instance
 * @throws Error als API key ontbreekt
 */
export function initializePinecone(apiKey: string): Pinecone {
  if (!apiKey) {
    throw new Error('PINECONE_API_KEY is not configured');
  }

  return new Pinecone({ apiKey });
}

// ========================================
// CONTEXT RETRIEVAL
// ========================================

/**
 * Haalt relevante context op uit de HR documentatie
 *
 * Deze functie:
 * 1. Zoekt de 3 meest relevante snippets voor de vraag
 * 2. Bouwt een context string met alle snippets
 * 3. Extraheert citations voor weergave in de UI
 * 4. Berekent de kosten van de Pinecone query
 *
 * @param assistantName - Naam van de Pinecone Assistant instance
 * @param pineconeClient - Geïnitialiseerde Pinecone client
 * @param userQuestion - De vraag van de gebruiker
 * @returns Object met contextText, citations en cost info
 */
export async function retrieveContext(
  assistantName: string,
  pineconeClient: Pinecone,
  userQuestion: string
): Promise<{
  contextText: string;
  citations: Citation[];
  pineconeTokens: number;
  pineconeCost: number;
}> {
  // Haal de assistant instance op
  const assistant = pineconeClient.Assistant(assistantName);

  console.log('\n📚 [Pinecone] ========== FETCHING CONTEXT ==========');
  console.log('🔍 [Pinecone] Query:', userQuestion);
  console.log('⚙️  [Pinecone] Settings: topK=3 (reduced from 5 to lower costs)');

  // Vraag de context op (topK=3 betekent: geef de 3 beste matches)
  const contextResp = await assistant.context({
    query: userQuestion,
    topK: 3  // Verlaagd van 5 naar 3 voor ~40% kostenbesparing
  });

  console.log('✅ [Pinecone] Context received successfully');
  console.log('📎 [Pinecone] Number of snippets returned:', contextResp.snippets?.length || 0);

  // Log usage informatie
  console.log('\n💰 [Pinecone] ========== USAGE STATS ==========');
  const pineconeTokens = contextResp.usage?.promptTokens || 0;
  console.log('🔢 [Pinecone] Context tokens processed:', pineconeTokens);
  console.log('🔢 [Pinecone] Completion tokens:', contextResp.usage?.completionTokens || 0, '(always 0 for context retrieval)');
  console.log('🔢 [Pinecone] Total tokens:', contextResp.usage?.totalTokens || 0);

  // Bereken kosten (Standard plan: $5 per million tokens)
  const pineconeCost = (pineconeTokens / 1000000) * 5;
  console.log('💵 [Pinecone] Context cost: $' + pineconeCost.toFixed(6));
  console.log('ℹ️  [Pinecone] Note: Hourly rate of $0.05/hour not included in per-request calculation');

  // Build context en citations
  let contextText = '';
  const citations: Citation[] = [];
  let totalSnippetTokensEstimate = 0;

  if (contextResp.snippets && contextResp.snippets.length > 0) {
    console.log('\n📄 [Pinecone] ========== SNIPPET DETAILS ==========');

    contextResp.snippets.forEach((snippet: any, idx: number) => {
      const snippetLength = snippet.content?.length || 0;
      const estimatedTokens = Math.ceil(snippetLength / 4); // Ruwe schatting: 4 chars ≈ 1 token
      totalSnippetTokensEstimate += estimatedTokens;

      // Log snippet info
      console.log(`📄 [Pinecone] Snippet ${idx + 1}:`);
      console.log(`   - Characters: ${snippetLength}`);
      console.log(`   - Est. tokens: ~${estimatedTokens}`);
      console.log(`   - Score: ${snippet.score?.toFixed(4) || 'N/A'}`);
      if (snippet.reference?.file) {
        console.log(`   - Source: ${snippet.reference.file.name}`);
        console.log(`   - Pages: ${snippet.reference.pages?.join(', ') || 'N/A'}`);
      }

      // Voeg toe aan citations array
      if (snippet.reference) {
        citations.push({
          position: idx,
          preview: extractSnippetPreview(snippet.content),
          references: [{
            pages: snippet.reference.pages || [],
            file: snippet.reference.file
          }]
        });
      }
    });

    // Bouw de context string voor de AI
    contextText = contextResp.snippets.map((snippet: any, idx: number) => {
      return `[Document ${idx + 1}]\n${snippet.content}\n`;
    }).join('\n');
  }

  console.log('\n📊 [Pinecone] ========== CONTEXT SUMMARY ==========');
  console.log('📄 [Pinecone] Total context characters:', contextText.length);
  console.log('🔢 [Pinecone] Estimated context tokens:', `~${totalSnippetTokensEstimate}`);

  return {
    contextText,
    citations,
    pineconeTokens,
    pineconeCost
  };
}
