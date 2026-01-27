/**
 * ========================================
 * CONVERSATION-AWARE QUERY EXPANSION
 * ========================================
 *
 * Verbetert RAG voor follow-up vragen door conversatie
 * context te gebruiken voor query expansion.
 *
 * Probleem: "wat is hun mail?" → 0 resultaten
 * Oplossing: Detecteer follow-up, expand met GPT-4o-mini
 *
 * Kosten: ~$0.0001 per expansion (GPT-4o-mini)
 */

// ========================================
// TYPES
// ========================================

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface QueryExpansionResult {
  expandedQuery: string;
  wasExpanded: boolean;
  cost: number;
  latencyMs: number;
}

// ========================================
// FOLLOW-UP DETECTION
// ========================================

/**
 * Voornaamwoorden die context nodig hebben
 * Nederlands + Engels voor meertalige support
 */
const CONTEXT_PRONOUNS = [
  // Nederlands
  'hun', 'zij', 'hij', 'het', 'dit', 'dat', 'deze', 'die',
  'hem', 'haar', 'hen', 'er', 'daar', 'hier', 'zo', 'die',
  // Engels
  'their', 'them', 'they', 'it', 'this', 'that', 'those', 'these',
  'his', 'her', 'him', 'there', 'here'
];

/**
 * Patronen die aangeven dat dit een follow-up vraag is
 */
const FOLLOWUP_PATTERNS = [
  /^en\s/i,                    // "en hoeveel kost dat?"
  /^maar\s/i,                  // "maar wat als..."
  /^hoe\s+zit/i,               // "hoe zit het met..."
  /^wat\s+is\s+(hun|zijn|haar|die|dat)/i,  // "wat is hun email?"
  /^waar\s+kan/i,              // "waar kan ik..."
  /^wie\s+is/i,                // "wie is verantwoordelijk?"
  /^wanneer\s+is/i,            // "wanneer is dat?"
  /^hoeveel\s+is/i,            // "hoeveel is dat?"
  /^kan\s+(ik|je)/i,           // "kan ik dat ook?"
  /^moet\s+ik/i,               // "moet ik dat doen?"
  /^and\s/i,                   // "and what about..."
  /^but\s/i,                   // "but how..."
  /^what\s+is\s+(their|its)/i, // "what is their email?"
];

/**
 * Detecteert of een query een follow-up vraag is die context nodig heeft
 *
 * Criteria:
 * 1. Query is kort (< 40 karakters)
 * 2. Bevat voornaamwoorden die naar eerdere context verwijzen
 * 3. Of begint met een follow-up patroon ("en...", "maar...", etc.)
 *
 * @param query - De user query
 * @returns true als dit waarschijnlijk een follow-up vraag is
 */
export function detectFollowUpQuestion(query: string): boolean {
  const lowerQuery = query.toLowerCase().trim();

  // Queries korter dan 10 karakters zijn vrijwel altijd follow-ups
  if (lowerQuery.length < 10) {
    return true;
  }

  // Check voor follow-up patronen (ongeacht lengte)
  const hasFollowupPattern = FOLLOWUP_PATTERNS.some(pattern => pattern.test(lowerQuery));
  if (hasFollowupPattern) {
    console.log(`🔍 [Context] Follow-up pattern detected in: "${query}"`);
    return true;
  }

  // Voor langere queries, check alleen als ze relatief kort zijn
  if (lowerQuery.length < 40) {
    // Check of query een context-afhankelijk voornaamwoord bevat
    const words = lowerQuery.split(/\s+/);
    const hasContextPronoun = words.some(word => CONTEXT_PRONOUNS.includes(word));

    if (hasContextPronoun) {
      console.log(`🔍 [Context] Context pronoun detected in: "${query}"`);
      return true;
    }
  }

  return false;
}

// ========================================
// QUERY EXPANSION WITH CONTEXT
// ========================================

/**
 * Expandeert een follow-up query met conversatie context
 *
 * Gebruikt GPT-4o-mini om de vraag te herschrijven naar een
 * zelfstandige zoekopdracht die zonder context begrepen kan worden.
 *
 * Kosten: ~$0.0001 per call (GPT-4o-mini: $0.15/1M input, $0.60/1M output)
 *
 * @param query - De originele (korte) follow-up query
 * @param conversationHistory - Recente conversatie berichten
 * @param maxHistoryMessages - Maximaal aantal berichten om mee te nemen (default: 4)
 * @returns Expanded query met metadata
 */
export async function expandQueryWithContext(
  query: string,
  conversationHistory: ConversationMessage[],
  maxHistoryMessages: number = 4
): Promise<QueryExpansionResult> {
  const startTime = Date.now();

  // Neem laatste N messages voor context (meest recent eerst)
  const recentHistory = conversationHistory.slice(-maxHistoryMessages);

  if (recentHistory.length === 0) {
    console.log('⚠️ [Context] No conversation history, skipping expansion');
    return {
      expandedQuery: query,
      wasExpanded: false,
      cost: 0,
      latencyMs: Date.now() - startTime
    };
  }

  // Check API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ [Context] OPENAI_API_KEY not set, skipping expansion');
    return {
      expandedQuery: query,
      wasExpanded: false,
      cost: 0,
      latencyMs: Date.now() - startTime
    };
  }

  // Bouw context string (beknopt)
  const contextString = recentHistory
    .map(m => {
      const role = m.role === 'user' ? 'Gebruiker' : 'Assistent';
      // Truncate lange berichten
      const content = m.content.length > 300
        ? m.content.substring(0, 300) + '...'
        : m.content;
      return `${role}: ${content}`;
    })
    .join('\n\n');

  const prompt = `Je bent een zoekquery optimizer voor een HR kennisbank.

CONVERSATIE CONTEXT:
${contextString}

NIEUWE VRAAG: "${query}"

TAAK: Herschrijf deze vraag naar een zelfstandige zoekopdracht die zonder context begrepen kan worden.
- Vervang voornaamwoorden (hun/zij/het/dit) door concrete termen uit de context
- Voeg relevante onderwerpen toe uit de conversatie
- Houd het beknopt (max 10 woorden)
- Antwoord ALLEEN met de herschreven zoekopdracht, geen uitleg

HERSCHREVEN ZOEKOPDRACHT:`;

  try {
    console.log('\n🔄 [Context] ========== QUERY EXPANSION ==========');
    console.log(`📝 [Context] Original: "${query}"`);
    console.log(`📊 [Context] History: ${recentHistory.length} messages`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
        temperature: 0.3  // Lage temperature voor consistente output
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Context] API error: ${response.status} - ${errorText}`);
      return {
        expandedQuery: query,
        wasExpanded: false,
        cost: 0,
        latencyMs: Date.now() - startTime
      };
    }

    const data = await response.json();
    const expandedQuery = data.choices?.[0]?.message?.content?.trim() || query;

    // Bereken kosten (GPT-4o-mini: $0.15/1M input, $0.60/1M output)
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    const cost = (inputTokens * 0.15 + outputTokens * 0.60) / 1_000_000;

    const latencyMs = Date.now() - startTime;

    console.log(`✅ [Context] Expanded: "${expandedQuery}"`);
    console.log(`⏱️  [Context] Latency: ${latencyMs}ms`);
    console.log(`💰 [Context] Cost: $${cost.toFixed(6)}`);

    return {
      expandedQuery,
      wasExpanded: true,
      cost,
      latencyMs
    };
  } catch (error) {
    console.error('❌ [Context] Query expansion failed:', error);
    return {
      expandedQuery: query,
      wasExpanded: false,
      cost: 0,
      latencyMs: Date.now() - startTime
    };
  }
}

// ========================================
// EXPORTS
// ========================================

export default {
  detectFollowUpQuestion,
  expandQueryWithContext
};
