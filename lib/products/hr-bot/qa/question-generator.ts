/**
 * ========================================
 * QA QUESTION GENERATOR
 * ========================================
 *
 * Generates test questions for QA testing.
 * Uses LLM to create questions from document chunks.
 *
 * Question sources:
 * 1. Auto-generated from document chunks (retrieval, accuracy, citation)
 * 2. Hallucination test questions (asks about things NOT in docs)
 * 3. Out-of-scope questions (non-HR topics)
 * 4. Manual templates (admin-created)
 * 5. Consistency checks (same question multiple times)
 * 6. Multilingual variants
 *
 * v2.3: QA Testing Module
 *
 * Locatie: lib/products/hr-bot/qa/question-generator.ts
 * Dit is HR Bot product-specifieke code.
 */

import OpenAI from 'openai';
import {
  QATestRun,
  QATestQuestion,
  QATestTemplate,
  QACategory,
  QATestConfig,
  OUT_OF_SCOPE_QUESTIONS,
  OUT_OF_SCOPE_QUESTIONS_EN,
  calculateCategoryDistribution
} from './types';
import {
  updateTestRun,
  getTemplates,
  getRandomChunksForTenant,
  insertTestQuestions
} from './service';
import { generateEmbedding } from '@/lib/rag/embeddings';
import { supabase } from '@/lib/shared/supabase/supabase-client';

// ========================================
// TYPES
// ========================================

interface ChunkInfo {
  id: string;
  content: string;
  document_id: string;
  page_number: number | null;
  metadata: Record<string, any>;
  document_filename: string;
}

interface GeneratedQuestion {
  category: QACategory;
  question: string;
  expected_answer: string | null;
  source_chunk_id: string | null;
  source_document: string | null;
  source_page: number | null;
  is_auto_generated: boolean;
  language: string;
  // Phase 2: Ground truth fields for better evaluation
  ground_truth_content?: string;  // Literal chunk content (max 500 chars)
  key_facts?: string[];           // Specific facts that must be in the answer
}

interface GenerationResult {
  questions: GeneratedQuestion[];
  cost: number;
  error?: string;
}

interface VerificationResult {
  isUnique: boolean;
  similarity: number;
  matchedContent?: string;
  cost: number;
}

// ========================================
// OPENAI CLIENT
// ========================================

let openaiClient: OpenAI | null = null;

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
// COST TRACKING
// ========================================

// GPT-4o-mini pricing: $0.15 per 1M input, $0.60 per 1M output
const INPUT_COST_PER_MILLION = 0.15;
const OUTPUT_COST_PER_MILLION = 0.60;

function calculateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1000000) * INPUT_COST_PER_MILLION +
         (outputTokens / 1000000) * OUTPUT_COST_PER_MILLION;
}

// ========================================
// HALLUCINATION VERIFICATION
// ========================================

// Query expansion mappings for verification (synonyms and related terms)
const VERIFICATION_EXPANSIONS: Record<string, string[]> = {
  'teamuitje': ['afdelingsuitje', 'sociale activiteit', 'bedrijfsuitje', 'teambuilding'],
  'teamuitjes': ['afdelingsuitjes', 'sociale activiteiten', 'bedrijfsuitjes'],
  'borrel': ['afdelingsuitje', 'sociale activiteit', 'personeelsfeest', 'bedrijfsfeest'],
  'borrels': ['afdelingsuitjes', 'sociale activiteiten', 'personeelsfeesten'],
  'uitstapje': ['afdelingsuitje', 'teamuitje', 'bedrijfsuitje'],
  'feest': ['personeelsfeest', 'afdelingsuitje', 'bedrijfsfeest'],
  'feesten': ['personeelsfeesten', 'afdelingsuitjes', 'bedrijfsfeesten'],
  'activiteit': ['afdelingsuitje', 'teambuilding', 'sociale activiteit'],
  'activiteiten': ['afdelingsuitjes', 'teambuilding', 'sociale activiteiten'],
};

/**
 * Expand question with synonyms for better verification
 */
function expandQuestionForVerification(question: string): string[] {
  const lowerQuestion = question.toLowerCase();
  const queries = [question];

  for (const [trigger, expansions] of Object.entries(VERIFICATION_EXPANSIONS)) {
    if (lowerQuestion.includes(trigger)) {
      // Add expanded version of the question
      for (const expansion of expansions.slice(0, 2)) {
        const expandedQ = question.replace(new RegExp(trigger, 'gi'), expansion);
        if (expandedQ !== question) {
          queries.push(expandedQ);
        }
      }
    }
  }

  return queries;
}

/**
 * Verify that a question is NOT answered in the document corpus
 * Uses vector search with query expansion to check if similar content exists
 *
 * v2.4: Added query expansion to catch synonyms (teamuitje = afdelingsuitje)
 *
 * @param tenantId - The tenant to search in
 * @param question - The candidate hallucination question
 * @returns VerificationResult with similarity score and cost
 */
async function verifyQuestionNotInDocuments(
  tenantId: string,
  question: string
): Promise<VerificationResult> {
  if (!supabase) {
    console.warn('⚠️ [QAGenerator] Supabase not configured, skipping verification');
    return { isUnique: true, similarity: 0, cost: 0 };
  }

  try {
    // QUERY EXPANSION: Check multiple variants of the question
    const queryVariants = expandQuestionForVerification(question);
    let totalCost = 0;
    let maxSimilarity = 0;
    let matchedContent: string | undefined;

    console.log(`   🔍 Verifying with ${queryVariants.length} query variant(s)`);

    // Check each variant (original + expanded)
    for (const variant of queryVariants) {
      // Generate embedding for the question variant
      const { embedding, cost } = await generateEmbedding(variant);
      totalCost += cost;

      // Search for similar content in documents with higher top_k
      const { data: results, error } = await supabase.rpc('search_documents_enhanced', {
        p_tenant_id: tenantId,
        p_query_embedding: `[${embedding.join(',')}]`,
        p_query_text: variant,
        p_top_k: 8,  // Verhoogd van 3 naar 8 voor breder zoeken
        p_similarity_threshold: 0.25,  // Verlaagd voor meer resultaten
      });

      if (error) {
        console.warn(`⚠️ [QAGenerator] Verification search error:`, error.message);
        continue;
      }

      // Check if any results have high similarity
      const topResult = results && results.length > 0 ? results[0] : null;
      const similarity = topResult?.similarity || 0;

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        matchedContent = topResult?.content?.substring(0, 200);
      }

      // Early exit if we found a good match
      if (similarity >= 0.60) {
        console.log(`   🎯 Found match via "${variant.substring(0, 30)}..." (${(similarity * 100).toFixed(1)}%)`);
        break;
      }
    }

    // Threshold: 0.60 = question is likely NOT answered in docs
    // Higher similarity = information exists in docs = REJECT this question
    // Increased from 0.50 to be even stricter about what's considered "unique"
    const UNIQUENESS_THRESHOLD = 0.60;
    const isUnique = maxSimilarity < UNIQUENESS_THRESHOLD;

    if (!isUnique) {
      console.log(`   ❌ Question rejected (max similarity: ${(maxSimilarity * 100).toFixed(1)}%): "${question.substring(0, 50)}..."`);
    }

    return {
      isUnique,
      similarity: maxSimilarity,
      matchedContent,
      cost: totalCost
    };

  } catch (error: any) {
    console.warn(`⚠️ [QAGenerator] Verification error:`, error.message);
    // On error, assume question is OK
    return { isUnique: true, similarity: 0, cost: 0 };
  }
}

// ========================================
// QUESTION GENERATION PROMPTS
// ========================================

const RETRIEVAL_PROMPT = `Je bent een QA test maker. Genereer een vraag die test of een HR chatbot de juiste documenten kan vinden.

DOCUMENT CONTENT:
{content}

BRON: {filename}, pagina {page}

Genereer EEN vraag die:
1. Direct beantwoord kan worden met deze tekst
2. Specifiek genoeg is dat alleen dit document het antwoord bevat
3. In het Nederlands is
4. HR-gerelateerd is

BELANGRIJK voor expected_answer:
- Citeer LETTERLIJK uit de tekst waar mogelijk
- Gebruik exacte getallen, datums en termen uit de tekst
- Geen interpretatie of samenvatting - alleen wat ER STAAT

Geef JSON output:
{
  "question": "De vraag",
  "expected_answer": "LETTERLIJKE citaat of exacte info uit de tekst (max 2 zinnen)",
  "key_facts": ["feit1", "feit2"] // De specifieke feiten die het antwoord MOET bevatten
}`;

const ACCURACY_PROMPT = `Je bent een QA test maker. Genereer een vraag om de accuraatheid van een HR chatbot te testen.

DOCUMENT CONTENT:
{content}

BRON: {filename}, pagina {page}

Genereer EEN vraag die:
1. Test of de bot het antwoord CORRECT weergeeft
2. Specifieke details bevat (getallen, datums, procedures)
3. In het Nederlands is
4. Een feitelijk antwoord vereist

BELANGRIJK voor expected_answer:
- Neem EXACTE getallen, percentages, datums uit de tekst
- Citeer specifieke termen en namen letterlijk
- Het antwoord moet verifieerbaar zijn tegen de brontekst

Geef JSON output:
{
  "question": "De vraag",
  "expected_answer": "Het EXACTE antwoord met specifieke details uit de tekst",
  "key_facts": ["exact getal/datum", "specifieke term"] // Verplichte elementen in het antwoord
}`;

const CITATION_PROMPT = `Je bent een QA test maker. Genereer een vraag om bronverwijzingen te testen.

DOCUMENT CONTENT:
{content}

BRON: {filename}

Genereer EEN vraag die:
1. Een antwoord vereist dat naar dit document moet verwijzen
2. Expliciet vraagt "In welk document staat..." of "Waar kan ik informatie vinden over..."
3. In het Nederlands is
4. NIET vraagt naar paginanummers (deze zijn vaak niet beschikbaar)

BELANGRIJK: Focus op DOCUMENT verwijzing, niet paginanummers.

Geef JSON output:
{
  "question": "De vraag (vraag naar document, niet pagina)",
  "expected_answer": "Het antwoord moet verwijzen naar {filename}",
  "expected_document": "{filename}"
}`;

const HALLUCINATION_PROMPT = `Je bent een QA test maker. Genereer een vraag over een HR-onderwerp dat NIET in de documenten staat.

CONTEXT: Dit is voor een bedrijf met HR documenten over vakantie, ziekte, salaris, etc.

Genereer EEN vraag die:
1. Klinkt als een legitieme HR-vraag
2. Waarschijnlijk NIET in standaard HR documenten staat
3. De bot zou moeten zeggen "dit staat niet in de documenten"
4. In het Nederlands is

Voorbeelden van goede vragen:
- "Wat is het beleid voor het meenemen van huisdieren naar kantoor?"
- "Hoeveel parkeerplaatsen heeft het bedrijf?"
- "Wat is de dresscode voor videobellen?"

Geef JSON output:
{
  "question": "De vraag",
  "expected_answer": "De bot moet aangeven dat dit niet in de documenten staat"
}`;

const NO_ANSWER_PROMPT = `Je bent een QA test maker. Genereer een vraag over PERSOONLIJKE HR-gegevens die de bot NIET kan weten.

GOEDE VOORBEELDEN (echt persoonlijk - GEBRUIK DEZE STIJL):
- "Hoeveel vakantiedagen heb IK nog over dit jaar?"
- "Wat is MIJN huidige salaris?"
- "Wanneer is MIJN beoordelingsgesprek gepland?"
- "Wat was MIJN bonus vorig jaar?"
- "Hoeveel ziektedagen heb IK dit jaar opgenomen?"
- "Wat is MIJN persoonlijke ontwikkelbudget?"
- "Wanneer loopt MIJN contract af?"
- "Wat is MIJN functieniveau/schaal?"

SLECHTE VOORBEELDEN (algemeen beleid - VERMIJD!):
- "Hoeveel vakantiedagen krijg je per jaar?" (= algemeen, staat in docs)
- "Wat is het salaris voor functieniveau H?" (= algemeen beleid)
- "Hoe werkt het bonussysteem?" (= algemeen beleid)

De vraag MOET:
1. Het woord "mijn", "ik", "mij" of "me" bevatten
2. Vragen naar PERSOONLIJKE situatie/gegevens
3. Iets zijn dat alleen HR-systemen met personeelsdata kunnen beantwoorden
4. NIET beantwoordbaar zijn uit algemene HR documentatie

Geef JSON output:
{
  "question": "De vraag met IK/MIJN erin",
  "expected_answer": "De bot moet doorverwijzen naar HR of het personeelssysteem"
}`;

// Phase 5: Dynamic out-of-scope question categories
const OUT_OF_SCOPE_CATEGORIES = [
  { category: 'weather', description: 'weer, temperatuur, regen' },
  { category: 'sports', description: 'voetbal, Eredivisie, sport, wedstrijden' },
  { category: 'politics', description: 'politiek, verkiezingen, Tweede Kamer' },
  { category: 'entertainment', description: 'films, series, muziek, celebrity nieuws' },
  { category: 'cooking', description: 'recepten, koken, eten bereiden' },
  { category: 'travel', description: 'vakanties, vluchten, hotels, reizen' },
  { category: 'technology', description: 'computers, smartphones, gadgets, software' },
  { category: 'finance_personal', description: 'aandelenkoersen, crypto, beleggen' },
  { category: 'trivia', description: 'algemene kennis, quiz, feiten' },
  { category: 'science', description: 'wetenschap, ruimte, natuurkunde' }
];

const DYNAMIC_OUT_OF_SCOPE_PROMPT = `Je bent een QA test maker. Genereer een vraag die NIETS met HR te maken heeft.

CATEGORIE: {category}
BESCHRIJVING: {description}

Genereer EEN vraag in het Nederlands die:
1. Over {category} gaat ({description})
2. NIETS met HR, werk of arbeidsvoorwaarden te maken heeft
3. Klinkt als een normale vraag aan een chatbot
4. Een HR chatbot zou moeten weigeren

Geef JSON output:
{
  "question": "De vraag",
  "subcategory": "{category}"
}`;

// ========================================
// MAIN GENERATION FUNCTION
// ========================================

/**
 * Generate all questions for a test run
 */
export async function generateQuestionsForTestRun(
  testRun: QATestRun
): Promise<GenerationResult> {
  console.log(`\n🔧 [QAGenerator] Starting question generation for run ${testRun.id}`);

  // Update status
  await updateTestRun(testRun.id, {
    status: 'generating',
    current_phase: 'generating',
    started_at: new Date().toISOString()
  });

  const allQuestions: GeneratedQuestion[] = [];
  let totalCost = 0;

  try {
    const config = testRun.config as QATestConfig;
    const distribution = calculateCategoryDistribution(
      testRun.total_questions,
      config.categories
    );

    console.log(`📊 [QAGenerator] Question distribution:`, distribution);

    // 1. Get templates for this tenant
    const { templates } = await getTemplates(testRun.tenant_id, true);
    console.log(`📋 [QAGenerator] Found ${templates.length} active templates`);

    // Add template questions
    for (const template of templates) {
      allQuestions.push({
        category: template.category,
        question: template.question,
        expected_answer: template.expected_answer,
        source_chunk_id: null,
        source_document: template.expected_sources?.[0]?.document || null,
        source_page: template.expected_sources?.[0]?.page || null,
        is_auto_generated: false,
        language: template.language
      });
    }

    // 2. Get random chunks for auto-generation
    const chunks = await getRandomChunksForTenant(
      testRun.tenant_id,
      Math.max(30, testRun.total_questions)
    );
    console.log(`📄 [QAGenerator] Retrieved ${chunks.length} chunks for generation`);

    // 3. Generate questions per category
    const categoriesToGenerate: QACategory[] = [
      'retrieval',
      'accuracy',
      'citation',
      'hallucination',
      'out_of_scope',
      'no_answer',
      'consistency',
      'multilingual'
    ];

    for (const category of categoriesToGenerate) {
      const targetCount = distribution[category] || 0;
      const existingCount = allQuestions.filter(q => q.category === category).length;
      const toGenerate = Math.max(0, targetCount - existingCount);

      if (toGenerate === 0) continue;

      console.log(`\n🎯 [QAGenerator] Generating ${toGenerate} ${category} questions...`);

      const result = await generateCategoryQuestions(
        category,
        toGenerate,
        chunks,
        config.languages,
        testRun.tenant_id
      );

      allQuestions.push(...result.questions);
      totalCost += result.cost;

      if (result.error) {
        console.warn(`⚠️ [QAGenerator] Error generating ${category}:`, result.error);
      }
    }

    // 4. Trim to exact total if needed
    const finalQuestions = allQuestions.slice(0, testRun.total_questions);

    // 5. Insert questions into database
    const questionsToInsert = finalQuestions.map(q => ({
      test_run_id: testRun.id,
      tenant_id: testRun.tenant_id,
      category: q.category,
      question: q.question,
      expected_answer: q.expected_answer,
      source_chunk_id: q.source_chunk_id,
      source_document: q.source_document,
      source_page: q.source_page,
      is_auto_generated: q.is_auto_generated,
      language: q.language,
      status: 'pending' as const,
      execution_cost: 0,
      evaluation_cost: 0,
      actual_answer: null,
      citations: null,
      rag_details: null,
      response_time_ms: null,
      score: null,
      passed: null,
      evaluation: null,
      error_message: null,
      executed_at: null,
      evaluated_at: null
    }));

    const { count, error: insertError } = await insertTestQuestions(questionsToInsert);

    if (insertError) {
      throw new Error(`Failed to insert questions: ${insertError}`);
    }

    // Update test run with generation complete
    await updateTestRun(testRun.id, {
      status: 'running',
      current_phase: 'executing',
      total_questions: count,
      cost_breakdown: {
        generation: totalCost,
        execution: 0,
        evaluation: 0
      }
    });

    console.log(`\n✅ [QAGenerator] Generated ${count} questions, cost: $${totalCost.toFixed(4)}`);

    return {
      questions: finalQuestions,
      cost: totalCost
    };

  } catch (error: any) {
    console.error('❌ [QAGenerator] Generation failed:', error);

    await updateTestRun(testRun.id, {
      status: 'failed',
      error_message: error.message,
      error_details: { phase: 'generation', error: error.toString() }
    });

    return {
      questions: [],
      cost: totalCost,
      error: error.message
    };
  }
}

// ========================================
// CATEGORY-SPECIFIC GENERATION
// ========================================

async function generateCategoryQuestions(
  category: QACategory,
  count: number,
  chunks: ChunkInfo[],
  languages: string[],
  tenantId: string  // Added for hallucination verification
): Promise<GenerationResult> {
  const questions: GeneratedQuestion[] = [];
  let totalCost = 0;

  switch (category) {
    case 'retrieval':
      return generateFromChunks(chunks, count, RETRIEVAL_PROMPT, 'retrieval');

    case 'accuracy':
      return generateFromChunks(chunks, count, ACCURACY_PROMPT, 'accuracy');

    case 'citation':
      return generateFromChunks(chunks, count, CITATION_PROMPT, 'citation');

    case 'hallucination':
      return generateHallucinationQuestions(count, tenantId);

    case 'out_of_scope':
      return generateOutOfScopeQuestions(count, languages);

    case 'no_answer':
      return generateNoAnswerQuestions(count);

    case 'consistency':
      // Pick random questions from other categories and duplicate them
      return generateConsistencyQuestions(chunks, count);

    case 'multilingual':
      return generateMultilingualQuestions(chunks, count, languages);

    default:
      return { questions: [], cost: 0 };
  }
}

// ========================================
// CHUNK-BASED GENERATION
// ========================================

async function generateFromChunks(
  chunks: ChunkInfo[],
  count: number,
  promptTemplate: string,
  category: QACategory
): Promise<GenerationResult> {
  const questions: GeneratedQuestion[] = [];
  let totalCost = 0;
  const openai = getOpenAIClient();

  // Shuffle chunks
  const shuffledChunks = [...chunks].sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(count, shuffledChunks.length); i++) {
    const chunk = shuffledChunks[i];

    // Skip very short chunks
    if (chunk.content.length < 100) continue;

    // Truncate long chunks
    const content = chunk.content.slice(0, 2000);

    const prompt = promptTemplate
      .replace('{content}', content)
      .replace('{filename}', chunk.document_filename)
      .replace(/{page}/g, String(chunk.page_number || 1));

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      if (result.question) {
        // Phase 2: Store literal chunk content and key facts as ground truth
        // This allows evaluation to check against actual document content
        const groundTruthContent = chunk.content.slice(0, 500);
        const keyFacts = Array.isArray(result.key_facts) ? result.key_facts : [];

        // Combine expected_answer with key_facts for better evaluation
        let enrichedExpectedAnswer = result.expected_answer || '';
        if (keyFacts.length > 0) {
          enrichedExpectedAnswer += `\n\n[VERPLICHTE FEITEN: ${keyFacts.join('; ')}]`;
        }

        questions.push({
          category,
          question: result.question,
          expected_answer: enrichedExpectedAnswer || null,
          source_chunk_id: chunk.id,
          source_document: chunk.document_filename,
          source_page: chunk.page_number,
          is_auto_generated: true,
          language: 'nl',
          ground_truth_content: groundTruthContent,
          key_facts: keyFacts
        });
      }

      // Calculate cost
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      totalCost += calculateCost(inputTokens, outputTokens);

    } catch (error: any) {
      console.warn(`⚠️ [QAGenerator] Failed to generate question from chunk:`, error.message);
    }
  }

  return { questions, cost: totalCost };
}

// ========================================
// HALLUCINATION QUESTIONS (WITH VERIFICATION)
// ========================================

/**
 * Generate hallucination test questions with corpus verification
 *
 * Each candidate question is verified against the document corpus.
 * Only questions that are NOT answered in the documents are accepted.
 * This prevents false failures where the bot correctly answers a question
 * that was incorrectly assumed to not be in the docs.
 *
 * @param count - Number of questions to generate
 * @param tenantId - Tenant to verify against
 */
async function generateHallucinationQuestions(
  count: number,
  tenantId: string
): Promise<GenerationResult> {
  const questions: GeneratedQuestion[] = [];
  let totalCost = 0;
  const openai = getOpenAIClient();

  const MAX_RETRIES_PER_SLOT = 3;  // Max attempts to find a unique question per slot
  const usedTopics = new Set<string>(); // Track used topics to avoid duplicates

  console.log(`   🔍 [Hallucination] Generating ${count} verified questions for tenant ${tenantId}`);

  for (let i = 0; i < count; i++) {
    let accepted = false;
    let attempts = 0;

    while (!accepted && attempts < MAX_RETRIES_PER_SLOT) {
      attempts++;

      try {
        // Generate candidate question
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: HALLUCINATION_PROMPT }],
          temperature: 0.9 + (attempts * 0.05), // Increase creativity on retries
          response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');

        // Track generation cost
        const inputTokens = response.usage?.prompt_tokens || 0;
        const outputTokens = response.usage?.completion_tokens || 0;
        totalCost += calculateCost(inputTokens, outputTokens);

        if (!result.question) {
          console.warn(`   ⚠️ Attempt ${attempts}: No question generated`);
          continue;
        }

        // Skip if we've already used a similar topic
        const topicKey = result.question.toLowerCase().substring(0, 30);
        if (usedTopics.has(topicKey)) {
          console.log(`   ⏭️ Attempt ${attempts}: Duplicate topic, retrying...`);
          continue;
        }

        // VERIFICATION: Check if this question IS answered in docs
        const verification = await verifyQuestionNotInDocuments(tenantId, result.question);
        totalCost += verification.cost;

        if (verification.isUnique) {
          // Question is NOT in documents - accept it
          questions.push({
            category: 'hallucination',
            question: result.question,
            expected_answer: 'De bot moet aangeven dat dit niet in de documenten staat',
            source_chunk_id: null,
            source_document: null,
            source_page: null,
            is_auto_generated: true,
            language: 'nl'
          });

          usedTopics.add(topicKey);
          accepted = true;
          console.log(`   ✅ Question ${i + 1}/${count} accepted (similarity: ${(verification.similarity * 100).toFixed(1)}%)`);
        } else {
          // Question IS answered in documents - reject it
          console.log(`   ❌ Attempt ${attempts}: Question found in docs (similarity: ${(verification.similarity * 100).toFixed(1)}%), retrying...`);
        }

      } catch (error: any) {
        console.warn(`   ⚠️ Attempt ${attempts}: Error - ${error.message}`);
      }
    }

    if (!accepted) {
      console.warn(`   ⚠️ Could not generate verified question for slot ${i + 1} after ${MAX_RETRIES_PER_SLOT} attempts`);
    }
  }

  console.log(`   📊 [Hallucination] Generated ${questions.length}/${count} verified questions, cost: $${totalCost.toFixed(4)}`);

  return { questions, cost: totalCost };
}

// ========================================
// OUT-OF-SCOPE QUESTIONS
// ========================================

/**
 * Phase 5: Generate DYNAMIC out-of-scope questions
 *
 * Instead of using static predefined questions, we generate diverse
 * out-of-scope questions from different categories to prevent
 * the bot from memorizing specific questions.
 */
async function generateOutOfScopeQuestions(
  count: number,
  languages: string[]
): Promise<GenerationResult> {
  const questions: GeneratedQuestion[] = [];
  let totalCost = 0;
  const openai = getOpenAIClient();

  // Shuffle categories for variety
  const shuffledCategories = [...OUT_OF_SCOPE_CATEGORIES].sort(() => Math.random() - 0.5);

  console.log(`   🚫 [Out-of-Scope] Generating ${count} dynamic questions`);

  // Generate dynamic questions
  for (let i = 0; i < count; i++) {
    // Pick a category (cycling through shuffled list)
    const categoryInfo = shuffledCategories[i % shuffledCategories.length];

    const prompt = DYNAMIC_OUT_OF_SCOPE_PROMPT
      .replace(/{category}/g, categoryInfo.category)
      .replace('{description}', categoryInfo.description);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,  // High creativity for diverse questions
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      if (result.question) {
        questions.push({
          category: 'out_of_scope',
          question: result.question,
          expected_answer: 'De bot moet deze vraag weigeren omdat het geen HR-vraag is',
          source_chunk_id: null,
          source_document: null,
          source_page: null,
          is_auto_generated: true,
          language: 'nl'
        });
      }

      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      totalCost += calculateCost(inputTokens, outputTokens);

    } catch (error: any) {
      console.warn(`   ⚠️ Failed to generate out-of-scope question:`, error.message);
      // Fall back to a static question if generation fails
      const fallbackQuestions = OUT_OF_SCOPE_QUESTIONS;
      if (fallbackQuestions.length > i) {
        questions.push({
          category: 'out_of_scope',
          question: fallbackQuestions[i % fallbackQuestions.length],
          expected_answer: 'De bot moet deze vraag weigeren omdat het geen HR-vraag is',
          source_chunk_id: null,
          source_document: null,
          source_page: null,
          is_auto_generated: true,
          language: 'nl'
        });
      }
    }
  }

  console.log(`   📊 [Out-of-Scope] Generated ${questions.length}/${count} questions, cost: $${totalCost.toFixed(4)}`);

  return { questions, cost: totalCost };
}

// ========================================
// NO-ANSWER QUESTIONS
// ========================================

async function generateNoAnswerQuestions(count: number): Promise<GenerationResult> {
  const questions: GeneratedQuestion[] = [];
  let totalCost = 0;
  const openai = getOpenAIClient();

  for (let i = 0; i < count; i++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: NO_ANSWER_PROMPT }],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      if (result.question) {
        questions.push({
          category: 'no_answer',
          question: result.question,
          expected_answer: result.expected_answer || 'De bot moet doorverwijzen naar HR',
          source_chunk_id: null,
          source_document: null,
          source_page: null,
          is_auto_generated: true,
          language: 'nl'
        });
      }

      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      totalCost += calculateCost(inputTokens, outputTokens);

    } catch (error: any) {
      console.warn(`⚠️ [QAGenerator] Failed to generate no-answer question:`, error.message);
    }
  }

  return { questions, cost: totalCost };
}

// ========================================
// CONSISTENCY QUESTIONS
// ========================================

async function generateConsistencyQuestions(
  chunks: ChunkInfo[],
  count: number
): Promise<GenerationResult> {
  // Generate base questions, each will be asked 3 times
  const baseCount = Math.ceil(count / 3);
  const result = await generateFromChunks(chunks, baseCount, RETRIEVAL_PROMPT, 'consistency');

  // Duplicate each question 3 times
  const questions: GeneratedQuestion[] = [];
  for (const q of result.questions) {
    for (let i = 0; i < 3; i++) {
      questions.push({ ...q, category: 'consistency' });
    }
  }

  return {
    questions: questions.slice(0, count),
    cost: result.cost
  };
}

// ========================================
// MULTILINGUAL QUESTIONS
// ========================================

async function generateMultilingualQuestions(
  chunks: ChunkInfo[],
  count: number,
  languages: string[]
): Promise<GenerationResult> {
  const questions: GeneratedQuestion[] = [];
  let totalCost = 0;
  const openai = getOpenAIClient();

  // Languages to test (excluding nl which is default)
  const testLanguages = languages.length > 1
    ? languages.filter(l => l !== 'nl')
    : ['en', 'de']; // Default to English and German

  const questionsPerLang = Math.ceil(count / testLanguages.length);
  const shuffledChunks = [...chunks].sort(() => Math.random() - 0.5);

  for (const lang of testLanguages) {
    for (let i = 0; i < Math.min(questionsPerLang, shuffledChunks.length); i++) {
      const chunk = shuffledChunks[i];
      if (chunk.content.length < 100) continue;

      const content = chunk.content.slice(0, 1500);
      const langName = {
        en: 'English',
        de: 'German',
        fr: 'French',
        es: 'Spanish'
      }[lang] || 'English';

      const prompt = `Generate a question in ${langName} that can be answered from this Dutch HR document content:

CONTENT:
${content}

Generate ONE question in ${langName} that:
1. Is about the same topic as the content
2. Can be answered with information from the content
3. Is grammatically correct in ${langName}

Return JSON:
{
  "question": "The question in ${langName}",
  "expected_answer": "The expected answer in ${langName}"
}`;

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');

        if (result.question) {
          questions.push({
            category: 'multilingual',
            question: result.question,
            expected_answer: result.expected_answer || null,
            source_chunk_id: chunk.id,
            source_document: chunk.document_filename,
            source_page: chunk.page_number,
            is_auto_generated: true,
            language: lang
          });
        }

        const inputTokens = response.usage?.prompt_tokens || 0;
        const outputTokens = response.usage?.completion_tokens || 0;
        totalCost += calculateCost(inputTokens, outputTokens);

      } catch (error: any) {
        console.warn(`⚠️ [QAGenerator] Failed to generate ${lang} question:`, error.message);
      }
    }
  }

  return { questions: questions.slice(0, count), cost: totalCost };
}
