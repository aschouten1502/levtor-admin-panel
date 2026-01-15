/**
 * ========================================
 * SUPABASE RAG - Context Retrieval
 * ========================================
 *
 * Drop-in replacement voor lib/pinecone.ts
 * Gebruikt Supabase pgvector voor vector search.
 *
 * Kostenvergelijking per query:
 * - Pinecone: ~$0.005 (1000 tokens @ $5/1M)
 * - Supabase RAG: ~$0.00002 (1000 tokens @ $0.02/1M)
 * - Besparing: ~99.6%
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateEmbedding } from './embeddings';
import {
  Citation,
  ContextResponse,
  SearchResult,
  RAGHealthCheck,
  TenantInfo,
  RAGDetails,
  RAGQueryDetails,
  RAGSearchDetails,
  RAGRerankingDetails,
  RAGSearchQuery,
  RAGRawSearchResult,
  RAGMergeStats,
  RAGRerankingResultItem
} from './types';
import { rerankResults, isRerankingEnabled, RerankResultWithPositions } from './reranker';
import { translateQueryOptimized, TranslationResult } from './query-translator';

// ========================================
// EXTENDED RESPONSE TYPE
// ========================================

/**
 * Extended context response that includes RAG details for logging
 */
export interface ContextResponseWithDetails extends ContextResponse {
  ragDetails: Partial<RAGDetails>;
}

// ========================================
// SUPABASE CLIENT
// ========================================

let supabaseClient: SupabaseClient | null = null;

/**
 * Krijg of maak de Supabase client
 */
function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Supabase configuration missing (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
    }

    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

// ========================================
// TENANT VALIDATION
// ========================================

/**
 * Valideert dat een tenant bestaat en actief is
 *
 * @param tenantId - Tenant identifier
 * @returns Validation result met tenant data als gevonden
 */
export async function validateTenant(tenantId: string): Promise<{
  valid: boolean;
  tenant?: TenantInfo;
  error?: string;
}> {
  const supabase = getSupabaseClient();

  if (!tenantId) {
    return { valid: false, error: 'No tenant ID provided' };
  }

  try {
    console.log(`🔍 [RAG] Validating tenant: ${tenantId}`);

    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.error(`❌ [RAG] Tenant '${tenantId}' not found`);
        return { valid: false, error: `Tenant '${tenantId}' not found` };
      }
      console.error(`❌ [RAG] Error validating tenant:`, error);
      return { valid: false, error: error.message };
    }

    if (!data.is_active) {
      console.warn(`⚠️ [RAG] Tenant '${tenantId}' is not active`);
      return { valid: false, error: `Tenant '${tenantId}' is not active` };
    }

    console.log(`✅ [RAG] Tenant validated: ${data.name}`);
    return { valid: true, tenant: data as TenantInfo };
  } catch (err: any) {
    console.error(`❌ [RAG] Unexpected error validating tenant:`, err);
    return { valid: false, error: err.message || 'Unknown error' };
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Haalt de eerste 3 en laatste 3 woorden uit een tekst als preview
 * (Exact dezelfde functie als in pinecone.ts voor compatibiliteit)
 */
export function extractSnippetPreview(text: string): string {
  if (!text) return '';

  const cleaned = text.trim().replace(/\s+/g, ' ');
  const words = cleaned.split(' ');

  if (words.length <= 6) {
    return cleaned;
  }

  const firstThree = words.slice(0, 3).join(' ');
  const lastThree = words.slice(-3).join(' ');

  return `${firstThree} ... ${lastThree}`;
}

// ========================================
// QUERY EXPANSION
// ========================================

/**
 * Mapping van informele vragen naar formele zoektermen
 * Dit verbetert de vector search voor alledaags taalgebruik
 */
const QUERY_EXPANSIONS: Record<string, string[]> = {
  // Salaris / betaling
  'geld': ['salaris', 'betaaldata', 'loon', 'uitbetaling', 'betaling'],
  'betaald': ['salaris', 'betaaldata', 'loon', 'uitbetaling'],
  'krijg': ['salaris', 'betaaldata', 'uitbetaling', 'ontvangen'],
  'wanneer krijg': ['betaaldata', 'salarisbetaling', 'uitbetaling', 'betaaldatum'],
  'salaris': ['betaaldata', 'loon', 'uitbetaling', 'salarisstrook', 'functie-indeling'],
  'loon': ['salaris', 'betaaldata', 'uitbetaling', 'functie-indeling'],
  'inkomen': ['salaris', 'loon', 'betaling', 'uitbetaling'],

  // Bonus / Extra uitkeringen / 1% regeling (CAO artikel 2.7)
  'bonus': ['eenmalige bruto uitkering', '1%', 'extra uitkering', 'winstdeling', 'eindejaarsuitkering', 'artikel 2.7'],
  '1%': ['eenmalige bruto uitkering', 'jaarlijkse uitkering', 'bonus', 'november oktober', 'artikel 2.7'],
  '1 procent': ['eenmalige bruto uitkering', '1%', 'jaarlijkse uitkering', 'artikel 2.7'],
  'extra': ['bonus', 'eenmalige bruto uitkering', 'toeslag', 'extra uitkering'],
  'november': ['eenmalige bruto uitkering', '1%', 'oktober', 'jaarlijkse uitkering'],
  'uitkering': ['eenmalige bruto uitkering', '1%', 'bonus', 'vakantietoeslag'],
  'bruto': ['eenmalige bruto uitkering', 'salaris', 'loon', 'uitkering'],

  // Verlof / vakantie (CAO hoofdstuk 4)
  'vrij': ['verlof', 'vakantie', 'vrije dagen', 'vakantiedagen', 'roostervrije dagen'],
  'vakantie': ['verlof', 'vakantiedagen', 'verlofaanvraag', 'vakantieplanning', 'vakantierechten'],
  'snipperdag': ['verlof', 'vakantiedagen', 'vrije dag', 'roostervrije dag'],
  'verlof': ['vakantie', 'vakantiedagen', 'vrije dagen', 'geboorteverlof', 'ouderschapsverlof'],
  'vakantiegeld': ['vakantietoeslag', '8%', 'vakantie uitkering', 'artikel 2.6'],
  'vakantietoeslag': ['vakantiegeld', '8%', 'vakantie uitkering'],
  'feestdag': ['feestdagen', 'vrije dag', 'roostervrije dag', 'artikel 4.3'],
  'feestdagen': ['nationale feestdag', 'vrije dagen', 'roostervrij'],

  // Ziekte (CAO hoofdstuk 5)
  'ziek': ['ziekmelding', 'ziekteverzuim', 'arbeidsongeschikt', 'verzuim', 'loondoorbetaling'],
  'griep': ['ziekmelding', 'ziekteverzuim'],
  'ziekmelden': ['ziekmelding', 'verzuimprotocol', 'ziektemelding'],
  'arbeidsongeschikt': ['ziekte', 'WGA', 'verzuim', 'loondoorbetaling'],
  'herstel': ['hersteld', 'betermelden', 're-integratie'],

  // Contract / arbeidsovereenkomst (CAO hoofdstuk 1)
  'contract': ['arbeidsovereenkomst', 'arbeidscontract', 'dienstverband'],
  'ontslag': ['beëindiging', 'opzegtermijn', 'ontslagprocedure', 'einde dienstverband'],
  'stoppen': ['opzegging', 'ontslag', 'beëindiging', 'einde arbeidsovereenkomst'],
  'opzeggen': ['opzegtermijn', 'beëindiging', 'ontslag'],
  'proeftijd': ['proefperiode', 'arbeidsovereenkomst', 'contract'],

  // Werktijden / arbeidsduur (CAO hoofdstuk 3)
  'werktijd': ['arbeidsduur', 'werkuren', 'arbeidstijd', 'dagdienstvenster'],
  'werkuren': ['arbeidsduur', 'werktijd', 'arbeidstijd'],
  'uren': ['arbeidsduur', 'werktijd', 'werkuren', 'overwerk'],
  'overwerk': ['overuren', 'meeruren', 'toeslagen', 'compensatie'],
  'toeslag': ['toeslagen', 'overwerkvergoeding', 'onregelmatigheid'],
  'nachtdienst': ['nachtwerk', 'toeslagen', 'onregelmatige werktijden'],

  // Pensioen (CAO hoofdstuk 5/11)
  'pensioen': ['pensioenregeling', 'AOW', 'pensioenfonds', 'pensioenopbouw'],
  'oud': ['pensioen', 'AOW', 'stoppen met werken', 'vervroegd uittreden'],
  'aow': ['pensioen', 'AOW-gerechtigde leeftijd', 'pensioenfonds'],
  'vroegpensioen': ['vervroegd uittreden', 'RVU', 'eerder stoppen'],

  // Lease / auto / mobiliteit
  'auto': ['leaseauto', 'lease regeling', 'mobiliteit'],
  'lease': ['leaseauto', 'mobiliteitsregeling', 'lease a bike'],
  'fiets': ['lease a bike', 'fietsregeling', 'mobiliteit', 'fietsplan'],
  'reiskosten': ['reiskostenvergoeding', 'woon-werkverkeer', 'kilometervergoeding'],
  'kilometer': ['reiskostenvergoeding', 'woon-werkverkeer', 'kilometervergoeding'],
  'ov': ['openbaar vervoer', 'reiskosten', 'woon-werkverkeer'],

  // Thuiswerken / hybride werken
  'thuis': ['thuiswerken', 'hybride werken', 'remote', 'thuiswerkvergoeding'],
  'remote': ['thuiswerken', 'hybride werken', 'op afstand werken'],
  'thuiswerkvergoeding': ['thuiswerken', 'vergoeding', 'hybride werken'],

  // CAO en arbeidsvoorwaarden
  'cao': ['collectieve arbeidsovereenkomst', 'arbeidsvoorwaarden', 'grafimedia'],
  'regeling': ['beleid', 'procedure', 'richtlijn'],
  'grafimedia': ['cao', 'collectieve arbeidsovereenkomst', 'grafische sector'],
  'werkingssfeer': ['cao', 'van toepassing', 'grafimedia'],

  // Functies en inschaling (CAO hoofdstuk 2)
  'functie': ['functie-indeling', 'inschaling', 'functieschaal', 'functieniveau'],
  'inschaling': ['functie-indeling', 'salaris', 'schaal', 'functieschaal'],
  'schaal': ['salarisschaal', 'functie-indeling', 'inschaling'],
  'promotie': ['functiewijziging', 'inschaling', 'salarisverhoging'],

  // Sociale activiteiten / borrels / afdelingsuitjes
  'borrel': ['afdelingsuitje', 'sociale activiteit', 'teamuitje', 'bedrijfsuitje', 'personeelsfeest'],
  'borrels': ['afdelingsuitjes', 'sociale activiteiten', 'teamuitjes', 'bedrijfsuitjes'],
  'drinks': ['borrel', 'afdelingsuitje', 'sociale activiteit'],
  'na werktijd': ['buiten werktijd', 'afdelingsuitje', 'sociale activiteit'],
  'feest': ['personeelsfeest', 'afdelingsuitje', 'bedrijfsfeest', 'sociale activiteit'],
  'teamuitje': ['afdelingsuitje', 'sociale activiteit', 'teambuilding', 'bedrijfsuitje'],
  'teambuilding': ['afdelingsuitje', 'teamuitje', 'sociale activiteit'],

  // Opleiding / ontwikkeling (CAO hoofdstuk 7)
  'opleiding': ['studie', 'ontwikkeling', 'cursus', 'loopbaanontwikkeling'],
  'studie': ['opleiding', 'studiekosten', 'ontwikkeling'],
  'training': ['opleiding', 'cursus', 'ontwikkeling'],
  'cursus': ['opleiding', 'training', 'ontwikkeling'],

  // Zwangerschap / ouderschap
  'zwanger': ['zwangerschapsverlof', 'bevallingsverlof', 'ouderschapsverlof'],
  'baby': ['geboorteverlof', 'ouderschapsverlof', 'bevallingsverlof'],
  'kind': ['ouderschapsverlof', 'geboorteverlof', 'kinderopvang'],
  'ouderschapsverlof': ['ouderschapsverlof', 'geboorteverlof', 'verlof'],

  // Specifieke CAO artikelen als zoekterm
  'artikel': ['cao', 'bepaling', 'regeling'],
  'hoofdstuk': ['cao', 'onderdeel', 'sectie'],
};

/**
 * Genereert alternatieve zoekvragen voor multi-query retrieval
 * Dit verbetert de kans dat we het juiste document vinden
 */
function generateAlternativeQueries(question: string): string[] {
  const lowerQuestion = question.toLowerCase();
  const alternatives: string[] = [];

  // Direct mapping van informele naar formele queries
  const QUERY_REWRITES: Record<string, string> = {
    // Salaris / betaling - DIRECT naar betaaldata
    'wanneer krijg ik': 'betaaldata salaris uitbetaling',
    'wanneer krijg ik geld': 'betaaldata 2025 salarisbetaling',
    'wanneer krijg ik me geld': 'betaaldata 2025 salarisbetaling',
    'wanneer krijg ik mijn geld': 'betaaldata 2025 salarisbetaling',
    'wanneer word ik betaald': 'betaaldata salaris uitbetaling',
    'wanneer salaris': 'betaaldata salaris uitbetaling',
    'geld krijgen': 'betaaldata salaris uitbetaling',
    'me geld': 'betaaldata salaris uitbetaling',
    'mijn geld': 'betaaldata salaris uitbetaling',
    'betaald krijgen': 'betaaldata salarisbetaling',
    'loon krijgen': 'betaaldata salaris uitbetaling',

    // Verlof
    'kan ik vrij': 'verlofaanvraag vakantie procedure',
    'wil vrij': 'verlofaanvraag vakantie',
    'vrij nemen': 'verlofaanvraag vakantiedagen',
    'dag vrij': 'verlofaanvraag vakantiedag',
    'vakantie opnemen': 'verlofaanvraag vakantiedagen procedure',

    // Ziekte
    'ben ziek': 'ziekmelding procedure verzuim',
    'ik ben ziek': 'ziekmelding procedure',
    'ziek melden': 'ziekmelding verzuimprotocol',
    'niet werken ziek': 'ziekmelding verzuim procedure',

    // Pensioen
    'wanneer pensioen': 'pensioenregeling AOW stoppen werken',
    'met pensioen': 'pensioenregeling AOW',

    // Auto/lease
    'auto van werk': 'leaseauto mobiliteit regeling',
    'lease auto': 'leaseauto mobiliteitsregeling',

    // Bonus / Extra uitkeringen / 1% regeling (CAO artikel 2.7)
    'bonus': 'eenmalige bruto uitkering 1% jaarlijkse uitkering',
    '1% regeling': 'eenmalige bruto uitkering jaarlijkse uitkering november oktober',
    '1 procent': 'eenmalige bruto uitkering 1% jaarlijkse',
    'extra geld': 'eenmalige bruto uitkering bonus toeslag',
    'in november': 'eenmalige bruto uitkering 1% jaarlijkse uitkering oktober',
    'eindejaarsuitkering': 'eenmalige bruto uitkering 1% december',
    'uitkering': 'eenmalige bruto uitkering 1% jaarlijkse',
  };

  // Check for direct rewrites
  for (const [trigger, rewrite] of Object.entries(QUERY_REWRITES)) {
    if (lowerQuestion.includes(trigger)) {
      alternatives.push(rewrite);
    }
  }

  // Check for expansion terms
  for (const [trigger, terms] of Object.entries(QUERY_EXPANSIONS)) {
    if (lowerQuestion.includes(trigger)) {
      // Voeg een specifieke HR query toe
      alternatives.push(terms.slice(0, 3).join(' '));
    }
  }

  return [...new Set(alternatives)]; // Deduplicate
}

/**
 * Expandeert een user query met relevante HR termen
 * Dit verbetert de embedding match voor informele vragen
 */
function expandQuery(question: string): string {
  const lowerQuestion = question.toLowerCase();
  const expansions: string[] = [];

  // Check elke trigger en voeg expansies toe
  for (const [trigger, terms] of Object.entries(QUERY_EXPANSIONS)) {
    if (lowerQuestion.includes(trigger)) {
      expansions.push(...terms);
    }
  }

  // Als er expansies zijn, voeg ze toe aan de query
  if (expansions.length > 0) {
    // Deduplicate
    const uniqueExpansions = [...new Set(expansions)];
    const expandedQuery = `${question} ${uniqueExpansions.join(' ')}`;
    console.log(`🔄 [RAG] Query expanded with HR terms`);
    console.log(`   Original: "${question}"`);
    console.log(`   Expanded: "${expandedQuery}"`);
    return expandedQuery;
  }

  return question;
}

// ========================================
// SEARCH FUNCTIONS
// ========================================

/**
 * Enhanced vector search met metadata keyword matching
 * Gebruikt search_documents_enhanced RPC voor hybrid search
 */
async function enhancedVectorSearch(
  supabase: SupabaseClient,
  tenantId: string,
  queryText: string,
  topK: number
): Promise<{
  results: SearchResult[];
  tokens: number;
  cost: number;
  matchedTerms: string[];
}> {
  const { embedding, tokens, cost } = await generateEmbedding(queryText);

  const { data: results, error } = await supabase.rpc('search_documents_enhanced', {
    p_tenant_id: tenantId,
    p_query_embedding: `[${embedding.join(',')}]`,
    p_query_text: queryText,
    p_top_k: topK,
    p_similarity_threshold: 0.30,
    p_vector_weight: 0.6,
    p_keyword_weight: 0.4
  });

  if (error) {
    console.warn('⚠️ [RAG] Enhanced search failed, falling back to basic search:', error.message);
    // Fallback naar basic search
    const basicResult = await singleVectorSearch(supabase, tenantId, queryText, topK);
    return { ...basicResult, matchedTerms: [] };
  }

  // Collect all matched terms for logging
  const allMatchedTerms = results?.flatMap((r: { matched_terms?: string[] }) => r.matched_terms || []) || [];

  if (allMatchedTerms.length > 0) {
    console.log('🎯 [RAG] Metadata keyword matches:', [...new Set(allMatchedTerms)]);
  }

  return {
    results: (results || []).map((r: {
      chunk_id: string;
      document_id: string;
      filename: string;
      file_path?: string;
      content: string;
      page_number: number;
      combined_score: number;
      // Metadata fields from chunk (returned by SQL function)
      metadata?: {
        structurePath?: string[];
        summary?: string;
        section_title?: string;
        contextHeader?: string;
      } | null;
    }) => {
      // Extract section info from metadata if available
      // Metadata kan null zijn als chunk geen enhanced metadata heeft
      const metadata = r.metadata || {};
      const sectionPath = metadata.structurePath;
      const sectionTitle = metadata.section_title ||
        (sectionPath && sectionPath.length > 0 ? sectionPath[sectionPath.length - 1] : undefined);
      const contextHeader = metadata.contextHeader ||
        (sectionPath ? `[${sectionPath.join(' > ')}]` : undefined);

      return {
        chunk_id: r.chunk_id,
        document_id: r.document_id,
        filename: r.filename,
        file_path: r.file_path,  // Storage path voor PDF toegang
        content: r.content,
        page_number: r.page_number,
        similarity: r.combined_score,  // Gebruik combined score
        // Enhanced citation info (v2.1)
        section_title: sectionTitle,
        section_path: sectionPath,
        context_header: contextHeader
      };
    }) as SearchResult[],
    tokens,
    cost,
    matchedTerms: [...new Set(allMatchedTerms)] as string[]
  };
}

/**
 * Voert een enkele vector search uit en retourneert resultaten
 * (Fallback voor als enhanced search niet beschikbaar is)
 */
async function singleVectorSearch(
  supabase: SupabaseClient,
  tenantId: string,
  queryText: string,
  topK: number
): Promise<{ results: SearchResult[]; tokens: number; cost: number }> {
  const { embedding, tokens, cost } = await generateEmbedding(queryText);

  const { data: results, error } = await supabase.rpc('search_documents', {
    p_tenant_id: tenantId,
    p_query_embedding: `[${embedding.join(',')}]`,
    p_top_k: topK,
    p_similarity_threshold: 0.30  // Verlaagd van 0.45 om meer resultaten te vinden
  });

  if (error) {
    console.error(`❌ [RAG] Search error for "${queryText}":`, error);
    return { results: [], tokens, cost };
  }

  return {
    results: (results || []) as SearchResult[],
    tokens,
    cost
  };
}

// ========================================
// MULTI-QUERY SEARCH
// ========================================

/**
 * Combineert en dedupliceert resultaten van meerdere queries
 * Geeft hogere score aan resultaten die in meerdere queries voorkomen
 */
function mergeAndRankResults(
  allResults: Array<{ query: string; results: SearchResult[] }>,
  maxResults: number
): SearchResult[] {
  // Map om resultaten te tracken per chunk_id (of content hash als fallback)
  const resultMap = new Map<string, {
    result: SearchResult;
    queryCount: number;
    maxSimilarity: number;
    queries: string[];
  }>();

  for (const { query, results } of allResults) {
    for (const result of results) {
      // Gebruik content als key (chunk_id is niet beschikbaar in SearchResult)
      const key = result.content.substring(0, 100);

      if (resultMap.has(key)) {
        const existing = resultMap.get(key)!;
        existing.queryCount++;
        existing.maxSimilarity = Math.max(existing.maxSimilarity, result.similarity);
        existing.queries.push(query);
      } else {
        resultMap.set(key, {
          result,
          queryCount: 1,
          maxSimilarity: result.similarity,
          queries: [query]
        });
      }
    }
  }

  // Sorteer op: (1) aantal queries dat het resultaat vond, (2) max similarity
  const ranked = Array.from(resultMap.values())
    .sort((a, b) => {
      // Eerst op queryCount (meer = beter)
      if (b.queryCount !== a.queryCount) {
        return b.queryCount - a.queryCount;
      }
      // Dan op similarity
      return b.maxSimilarity - a.maxSimilarity;
    });

  // Log ranking info
  console.log('\n🏆 [RAG] ========== MULTI-QUERY RANKING ==========');
  ranked.slice(0, maxResults).forEach((item, idx) => {
    console.log(`   ${idx + 1}. Found by ${item.queryCount} queries (${(item.maxSimilarity * 100).toFixed(1)}%): ${item.result.filename}`);
  });

  return ranked.slice(0, maxResults).map(item => ({
    ...item.result,
    similarity: item.maxSimilarity // Gebruik hoogste similarity
  }));
}

// ========================================
// MAIN RETRIEVAL FUNCTION
// ========================================

/**
 * Haalt relevante context op uit de document database
 *
 * MULTI-QUERY RETRIEVAL:
 * Voor informele vragen genereert dit meerdere zoekqueries
 * om de kans te vergroten dat we het juiste document vinden.
 *
 * @param tenantId - Tenant identifier voor multi-tenant isolatie
 * @param userQuestion - De vraag van de gebruiker
 * @param topK - Aantal resultaten na reranking (default: 8)
 * @param skipTenantValidation - Skip tenant validation (default: false)
 * @returns Object met contextText, citations, cost info EN ragDetails voor logging
 * @throws Error als tenant niet bestaat of niet actief is
 */
export async function retrieveContext(
  tenantId: string,
  userQuestion: string,
  topK: number = 12,  // Verhoogd van 8 voor meer context
  skipTenantValidation: boolean = false
): Promise<ContextResponseWithDetails> {
  const supabase = getSupabaseClient();

  // Timing tracking
  const startTime = Date.now();
  let embeddingStartTime = 0;
  let embeddingEndTime = 0;
  let searchStartTime = 0;
  let searchEndTime = 0;
  let rerankStartTime = 0;
  let rerankEndTime = 0;

  // RAG Details tracking
  const searchQueries: RAGSearchQuery[] = [];
  const rawResults: RAGRawSearchResult[] = [];
  let mergeStats: RAGMergeStats | undefined;
  let rerankingDetails: RAGRerankingDetails = {
    enabled: false,
    inputDocuments: 0,
    outputDocuments: 0,
    latencyMs: 0,
    cost: 0,
    results: []
  };

  // Configuratie voor reranking
  const VECTOR_SEARCH_TOP_K = 30; // Haal 30 candidates op voor reranking
  const rerankingEnabled = isRerankingEnabled();

  console.log('\n📚 [RAG] ========== FETCHING CONTEXT ==========');
  console.log('🔍 [RAG] Original query:', userQuestion);
  console.log('🏢 [RAG] Tenant:', tenantId);
  console.log(`⚙️  [RAG] Settings: vectorTopK=${VECTOR_SEARCH_TOP_K}, finalTopK=${topK}, reranking=${rerankingEnabled ? 'ON' : 'OFF'}`);

  // Valideer tenant en haal document_language op
  let tenantInfo: TenantInfo | undefined;
  let documentLanguage = 'nl'; // Default

  if (!skipTenantValidation) {
    const validation = await validateTenant(tenantId);
    if (!validation.valid) {
      throw new Error(`Tenant validation failed: ${validation.error}`);
    }
    tenantInfo = validation.tenant;
    documentLanguage = tenantInfo?.document_language || 'nl';
  }

  console.log(`🌐 [RAG] Document language: ${documentLanguage}`);

  // ========================================
  // MULTILINGUAL: Vertaal query indien nodig
  // ========================================
  let translationResult: TranslationResult | undefined;
  let searchQuery = userQuestion; // Default: originele query
  let translationStartTime = Date.now();
  let translationEndTime = translationStartTime;

  try {
    translationResult = await translateQueryOptimized(userQuestion, documentLanguage);
    translationEndTime = Date.now();

    if (translationResult.wasTranslated) {
      searchQuery = translationResult.translatedQuery;
      console.log(`🌐 [RAG] Query translated: "${userQuestion}" → "${searchQuery}"`);
    }
  } catch (translationError) {
    console.error('⚠️ [RAG] Translation failed, using original query:', translationError);
    // Continue with original query
  }

  // 1. Genereer alternatieve queries voor multi-query retrieval
  // Gebruik de (mogelijk vertaalde) searchQuery voor betere resultaten
  const alternativeQueries = generateAlternativeQueries(searchQuery);
  const expandedOriginal = expandQuery(searchQuery);

  // Alle queries die we gaan uitvoeren
  const allQueries = [expandedOriginal, ...alternativeQueries];

  console.log('\n🔄 [RAG] ========== MULTI-QUERY RETRIEVAL ==========');
  console.log(`📝 [RAG] Original: "${userQuestion}"`);
  console.log(`📝 [RAG] Expanded: "${expandedOriginal}"`);
  if (alternativeQueries.length > 0) {
    console.log(`📝 [RAG] Alternative queries (${alternativeQueries.length}):`);
    alternativeQueries.forEach((q, i) => console.log(`   ${i + 1}. "${q}"`));
  } else {
    console.log(`📝 [RAG] No alternative queries generated (query seems formal)`);
  }

  // 2. Probeer eerst enhanced search (hybrid: vector + metadata)
  console.log('\n🔎 [RAG] Running enhanced hybrid search...');

  let totalTokens = 0;
  let totalCost = 0;
  let rerankCost = 0;

  // Start timing for embedding + search
  embeddingStartTime = Date.now();
  searchStartTime = Date.now();

  // Enhanced search met (mogelijk vertaalde) query
  // Haal VECTOR_SEARCH_TOP_K candidates op voor reranking
  const enhancedResult = await enhancedVectorSearch(
    supabase,
    tenantId,
    searchQuery,  // Vertaalde query voor betere vector match
    VECTOR_SEARCH_TOP_K  // Haal 30 candidates op voor reranking
  );

  embeddingEndTime = Date.now();
  totalTokens += enhancedResult.tokens;
  totalCost += enhancedResult.cost;

  // Track search query for logging
  searchQueries.push({
    query: userQuestion,
    tokens: enhancedResult.tokens,
    cost: enhancedResult.cost,
    resultsCount: enhancedResult.results.length
  });

  // Track raw results for logging (all candidates before reranking)
  enhancedResult.results.forEach((r, idx) => {
    rawResults.push({
      filename: r.filename,
      similarity: r.similarity,
      pageNumber: r.page_number,
      chunkId: r.chunk_id,
      content: r.content.substring(0, 200), // Truncate for storage
      sectionTitle: r.section_title
    });
  });

  let mergedResults = enhancedResult.results;

  console.log(`   ✅ Enhanced search: ${mergedResults.length} results`);
  if (enhancedResult.matchedTerms.length > 0) {
    console.log(`   🎯 Matched terms: ${enhancedResult.matchedTerms.join(', ')}`);
  }

  // 3. Als enhanced search weinig resultaten geeft, supplement met multi-query
  // AGRESSIEVER: Altijd multi-query gebruiken als er alternatieven zijn
  const totalResultsBeforeMerge = rawResults.length;

  if (mergedResults.length < VECTOR_SEARCH_TOP_K && alternativeQueries.length > 0) {
    console.log('\n🔄 [RAG] Supplementing with multi-query search...');

    const supplementPromises = alternativeQueries.slice(0, 2).map(async (query) => {
      const { results, tokens, cost } = await singleVectorSearch(
        supabase,
        tenantId,
        query,
        VECTOR_SEARCH_TOP_K / 2
      );
      totalTokens += tokens;
      totalCost += cost;

      // Track this query for logging
      searchQueries.push({
        query,
        tokens,
        cost,
        resultsCount: results.length
      });

      return { query, results };
    });

    const supplementResults = await Promise.all(supplementPromises);

    // Log supplement resultaten and add to raw results
    supplementResults.forEach(({ query, results }) => {
      console.log(`   ✅ "${query.substring(0, 40)}..." → ${results.length} results`);

      // Add supplement results to raw results tracking
      results.forEach(r => {
        rawResults.push({
          filename: r.filename,
          similarity: r.similarity,
          pageNumber: r.page_number,
          chunkId: r.chunk_id,
          content: r.content.substring(0, 200),
          sectionTitle: r.section_title
        });
      });
    });

    // Merge alle resultaten
    const allResults = [
      { query: userQuestion, results: mergedResults },
      ...supplementResults
    ];

    mergedResults = mergeAndRankResults(allResults, VECTOR_SEARCH_TOP_K);

    // Track merge stats
    mergeStats = {
      totalBeforeMerge: rawResults.length,
      totalAfterMerge: mergedResults.length,
      duplicatesRemoved: rawResults.length - mergedResults.length
    };
  }

  searchEndTime = Date.now();

  // 4. RERANKING - De belangrijkste kwaliteitsboost
  // Store pre-rerank order for position comparison
  const preRerankOrder = mergedResults.map((r, idx) => ({
    filename: r.filename,
    originalPosition: idx,
    originalScore: r.similarity,
    pageNumber: r.page_number
  }));

  rerankStartTime = Date.now();

  if (rerankingEnabled && mergedResults.length > 0) {
    console.log('\n🔄 [RAG] ========== RERANKING ==========');
    const rerankResult = await rerankResults(userQuestion, mergedResults, topK) as RerankResultWithPositions;
    mergedResults = rerankResult.results;
    rerankCost = rerankResult.cost;
    console.log(`   ✅ Reranked to top ${mergedResults.length} results`);

    // Build reranking details for logging
    rerankingDetails = {
      enabled: true,
      model: 'rerank-v3.5',
      inputDocuments: preRerankOrder.length,
      outputDocuments: mergedResults.length,
      latencyMs: rerankResult.latencyMs,
      cost: rerankResult.cost,
      results: mergedResults.map((r, newIdx) => {
        // Find the original position of this result
        const original = preRerankOrder.find(o => o.filename === r.filename && o.pageNumber === r.page_number);
        return {
          filename: r.filename,
          beforeScore: original?.originalScore || 0,
          afterScore: r.similarity,
          positionBefore: original?.originalPosition || 0,
          positionAfter: newIdx,
          pageNumber: r.page_number
        };
      })
    };
  } else {
    // Fallback: trim naar topK zonder reranking
    mergedResults = mergedResults.slice(0, topK);
    console.log(`\n⚠️ [RAG] Reranking disabled, using top ${mergedResults.length} by similarity`);

    rerankingDetails = {
      enabled: false,
      inputDocuments: preRerankOrder.length,
      outputDocuments: mergedResults.length,
      latencyMs: 0,
      cost: 0,
      results: []
    };
  }

  rerankEndTime = Date.now();

  console.log(`\n✅ [RAG] Final results: ${mergedResults.length} chunks`);

  // 4. Bouw context en citations
  let contextText = '';
  const citations: Citation[] = [];

  if (mergedResults.length > 0) {
    console.log('\n📄 [RAG] ========== FINAL SEARCH RESULTS ==========');

    mergedResults.forEach((result, idx) => {
      console.log(`📄 [RAG] Result ${idx + 1}:`);
      console.log(`   - Relevance: ${(result.similarity * 100).toFixed(1)}%`);
      console.log(`   - Source: ${result.filename}`);
      console.log(`   - Page: ${result.page_number || 'N/A'}`);
      if (result.section_title) {
        console.log(`   - Section: ${result.section_title}`);
      }
      if (result.context_header) {
        console.log(`   - Path: ${result.context_header}`);
      }
      console.log(`   - Length: ${result.content.length} chars`);

      // Voeg toe aan citations (uitgebreid met section info voor enterprise citations)
      citations.push({
        position: idx,
        preview: extractSnippetPreview(result.content),
        references: [{
          pages: result.page_number ? [result.page_number] : [],
          file: {
            name: result.filename,
            path: result.file_path  // Storage path voor directe PDF toegang
          },
          // Enhanced citation fields (v2.1)
          section_title: result.section_title,
          section_path: result.section_path
        }],
        // Include relevance score from reranker
        relevance_score: result.similarity
      });
    });

    // Bouw context string met enhanced metadata voor betere bronvermeldingen
    // Format: Document naam + pagina + sectie (indien beschikbaar)
    contextText = mergedResults.map((result, idx) => {
      // Bouw header met alle beschikbare informatie
      const parts = [`[Document ${idx + 1}: ${result.filename}`];

      if (result.page_number) {
        parts.push(`pagina ${result.page_number}`);
      }

      if (result.section_title) {
        parts.push(result.section_title);
      } else if (result.context_header) {
        parts.push(result.context_header);
      }

      const header = parts.join(' | ') + ']';

      return `${header}\n${result.content}\n`;
    }).join('\n');
  }

  // 6. Log cost comparison
  const translationCost = translationResult?.cost || 0;
  const totalRAGCost = totalCost + rerankCost + translationCost;

  console.log('\n📊 [RAG] ========== CONTEXT SUMMARY ==========');
  console.log('📄 [RAG] Total context characters:', contextText.length);
  if (translationCost > 0) {
    console.log(`💵 [RAG] Translation cost: $${translationCost.toFixed(6)} (GPT-4o-mini)`);
  }
  console.log(`💵 [RAG] Embedding cost: $${totalCost.toFixed(6)} (${allQueries.length} queries)`);
  console.log(`💵 [RAG] Rerank cost: $${rerankCost.toFixed(6)} (Cohere)`);
  console.log('💵 [RAG] Search cost: $0.000000 (pgvector is free)');
  console.log(`💵 [RAG] Total RAG cost: $${totalRAGCost.toFixed(6)}`);

  // Cost comparison met Pinecone
  const pineconeCostEstimate = (totalTokens / 1_000_000) * 5 + 0.01; // +$0.01 for Pinecone Assistant overhead
  const savings = pineconeCostEstimate - totalRAGCost;
  const savingsPercent = pineconeCostEstimate > 0
    ? ((savings / pineconeCostEstimate) * 100).toFixed(1)
    : '0';

  console.log('\n💰 [RAG] ========== COST COMPARISON ==========');
  console.log(`📊 [RAG] This request:`);
  console.log(`   - Supabase RAG + Rerank: $${totalRAGCost.toFixed(6)}`);
  console.log(`   - If Pinecone Assistant: $${pineconeCostEstimate.toFixed(6)}`);
  console.log(`   - Savings: $${savings.toFixed(6)} (${savingsPercent}%)`);

  // Build RAG details for logging
  const endTime = Date.now();

  // Extract expansion terms from the expanded query
  const expansionTerms: string[] = [];
  for (const [trigger, terms] of Object.entries(QUERY_EXPANSIONS)) {
    if (userQuestion.toLowerCase().includes(trigger)) {
      expansionTerms.push(...terms.slice(0, 3));
    }
  }

  const ragDetails: Partial<RAGDetails> = {
    query: {
      original: userQuestion,
      expanded: expandedOriginal !== searchQuery ? expandedOriginal : undefined,
      alternativeQueries: alternativeQueries.length > 0 ? alternativeQueries : undefined,
      expansionTerms: expansionTerms.length > 0 ? [...new Set(expansionTerms)] : undefined,
      // Multilingual translation info (v2.2)
      translation: translationResult ? {
        originalLanguage: translationResult.originalLanguage,
        translatedQuery: translationResult.translatedQuery,
        targetLanguage: translationResult.targetLanguage,
        wasTranslated: translationResult.wasTranslated,
        translationCost: translationResult.cost,
        translationLatencyMs: translationResult.latencyMs
      } : undefined
    },
    search: {
      type: alternativeQueries.length > 0 ? 'multi_query' : 'enhanced_hybrid',
      vectorTopK: VECTOR_SEARCH_TOP_K,
      finalTopK: topK,
      rerankingEnabled,
      queries: searchQueries,
      rawResults,
      matchedTerms: enhancedResult.matchedTerms.length > 0 ? enhancedResult.matchedTerms : undefined,
      mergeStats
    },
    reranking: rerankingDetails,
    costs: {
      embedding: totalCost,
      reranking: rerankCost,
      translation: translationCost,  // Translation cost (GPT-4o-mini)
      openai: 0, // Will be set by route.ts
      total: totalRAGCost
    },
    timing: {
      embeddingMs: embeddingEndTime - embeddingStartTime,
      searchMs: searchEndTime - searchStartTime,
      rerankingMs: rerankEndTime - rerankStartTime,
      openaiMs: 0, // Will be set by route.ts
      totalMs: endTime - startTime
    }
  };

  return {
    contextText,
    citations,
    embeddingTokens: totalTokens,
    embeddingCost: totalRAGCost,  // Include rerank cost in total
    ragDetails
  };
}

// ========================================
// HEALTH CHECK
// ========================================

/**
 * Controleert of RAG beschikbaar is voor een tenant
 *
 * @param tenantId - Tenant identifier
 * @returns Health check resultaat met document en chunk counts
 */
export async function checkRAGHealth(tenantId: string): Promise<RAGHealthCheck> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc('get_rag_stats', {
      p_tenant_id: tenantId
    });

    if (error) throw error;

    const stats = data?.[0] || { total_documents: 0, total_chunks: 0 };

    return {
      healthy: true,
      documentCount: Number(stats.total_documents),
      chunkCount: Number(stats.total_chunks)
    };
  } catch (err) {
    return {
      healthy: false,
      documentCount: 0,
      chunkCount: 0,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

// ========================================
// COMPATIBILITY EXPORTS
// ========================================

// Export voor backwards compatibility met code die Pinecone types verwacht
export type { Citation, ContextResponse };
