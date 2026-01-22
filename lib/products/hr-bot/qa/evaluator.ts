/**
 * ========================================
 * QA EVALUATOR - LLM-as-Judge
 * ========================================
 *
 * Evaluates bot responses using LLM-as-judge pattern.
 * Provides strict, honest scoring for QA testing.
 *
 * Scoring guidelines:
 * - 100: Perfect - correct, complete, well-formulated
 * - 80-99: Correct but minor omissions
 * - 60-79: Mostly correct but missing important details
 * - 40-59: Partially correct with significant errors
 * - 20-39: Mostly incorrect
 * - 0-19: Completely wrong or hallucination
 *
 * v2.3: QA Testing Module
 *
 * Locatie: lib/products/hr-bot/qa/evaluator.ts
 * Dit is HR Bot product-specifieke code.
 */

import OpenAI from 'openai';
import {
  QATestRun,
  QATestQuestion,
  QACategory,
  QAEvaluation,
  QATestSummary,
  QACostBreakdown,
  CATEGORY_INFO
} from './types';
import {
  getTestRun,
  updateTestRun,
  getTestQuestions,
  updateTestQuestion,
  getPendingQuestions
} from './service';

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

// GPT-4o pricing for evaluation (need quality judgment)
const INPUT_COST_PER_MILLION = 2.50;
const OUTPUT_COST_PER_MILLION = 10.00;

function calculateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1000000) * INPUT_COST_PER_MILLION +
         (outputTokens / 1000000) * OUTPUT_COST_PER_MILLION;
}

// ========================================
// EVALUATION PROMPTS
// ========================================

const BASE_EVALUATION_PROMPT = `Je bent een eerlijke QA evaluator voor een HR chatbot.

VRAAG: {question}
VERWACHT ANTWOORD: {expected_answer}
BOT ANTWOORD: {actual_answer}
CATEGORIE: {category}
{extra_context}

EVALUATIE PRINCIPES:
1. Focus op KERNINHOUD - bevat het antwoord de essentiële informatie?
2. EXTRA correcte details zijn BONUS, geen strafpunten
3. Een antwoord dat MEER juiste info geeft dan verwacht = BETER, niet slechter
4. Alleen ONJUISTE informatie of HALLUCINATIES zijn fouten
5. Als er [VERPLICHTE FEITEN: ...] staan, check of deze feiten aanwezig zijn

SCORING RICHTLIJNEN:
- 90-100: Kerninhoud correct, eventuele extra info is ook correct
- 80-89: Kerninhoud correct, kleine onnauwkeurigheden
- 70-79: Kerninhoud grotendeels correct
- 50-69: Deels correct maar mist belangrijke feiten of bevat fouten
- 0-49: Incorrect, onvolledig of bevat hallucinaties

KRITIEKE REGELS:
- Hallucinaties (verzonnen info) = MAXIMAAL 20 punten
- Verkeerde bronverwijzing = MAXIMAAL 50 punten
- Niet beantwoorden terwijl antwoord beschikbaar is = MAXIMAAL 40 punten
- MAAR: extra correcte context geven = GEEN strafpunten

Geef JSON response (ALLEEN JSON, geen andere tekst):
{
  "score": <0-100>,
  "passed": <true als score >= 70>,
  "reasoning": "<1-2 zinnen uitleg>",
  "issues": ["<probleem 1>", "<probleem 2>"],
  "category_specific": {category_specific_fields}
}`;

const CATEGORY_SPECIFIC_PROMPTS: Record<QACategory, { extra: string; fields: string }> = {
  retrieval: {
    extra: 'FOCUS: Heeft de bot het juiste document gevonden? Klopt de bron?',
    fields: '{ "correct_document_found": true/false, "relevance_score": 0-100 }'
  },
  accuracy: {
    extra: 'FOCUS: Is het antwoord FEITELIJK CORRECT? Kloppen getallen, datums, procedures?',
    fields: '{ "factually_correct": true/false, "completeness": 0-100 }'
  },
  citation: {
    extra: `FOCUS: Verwijst de bot naar het JUISTE document?

CORRECT (90-100 punten):
- Bot noemt correcte document naam (met of zonder .pdf extensie)
- Bot noemt correcte hoofdstuk/sectie/artikel

ACCEPTABEL (70-89 punten):
- Document naam klopt maar met kleine variaties:
  * "Grafimedia-cao-2024-2025" = "Grafimedia-cao-2024-2025.pdf" = CORRECT
  * Spaties vs underscores vs streepjes = CORRECT
  * Met of zonder bestandsextensie = CORRECT
- Pagina nummer ontbreekt maar document correct

INCORRECT (0-50 punten):
- Verkeerd document genoemd
- Geen bronverwijzing gegeven terwijl dit verwacht wordt

BELANGRIJK: Focus op of het JUISTE document bedoeld wordt, niet op exacte string matching.
"cao grafimedia 2024" = "Grafimedia-cao-2024-2025.pdf" = CORRECT`,
    fields: '{ "document_correct": true/false, "name_variation_acceptable": true/false }'
  },
  hallucination: {
    extra: `FOCUS: Verzint de bot informatie die NIET in documenten staat?

CORRECTE REACTIES (80-100 punten):
1. Bot zegt "dit staat niet in de documenten" of "ik kan dit niet vinden"
2. Bot zegt "ik weet dit niet zeker" of "neem contact op met HR voor deze vraag"
3. Bot geeft GERELATEERDE info uit docs + zegt dat specifiek antwoord niet beschikbaar is

HALLUCINATIE (0-20 punten):
1. Bot geeft specifiek antwoord alsof het een feit is, terwijl dit NIET in docs staat
2. Bot verzint beleid, getallen, datums of procedures zonder bronvermelding

BELANGRIJK NUANCE:
- Als bot semantisch gerelateerde info geeft = GEEN hallucinatie, dit is correcte retrieval
- Voorbeeld: vraag over "borrels" → bot vindt "afdelingsuitjes" = CORRECT (90+ punten)
- Voorbeeld: vraag over "huisdieren" → bot verzint beleid = HALLUCINATIE (0-20 punten)
- Een bot die zegt "ik vond geen info over X, maar wel over Y" = EXCELLENT`,
    fields: '{ "hallucinated": true/false, "admitted_uncertainty": true/false, "found_related_content": true/false }'
  },
  out_of_scope: {
    extra: `FOCUS: Weigert de bot niet-HR-gerelateerde vragen?

EXCELLENT (90-100 punten):
- Bot weigert beleefd en legt uit dat het een HR-assistent is
- Bot suggereert waar gebruiker wel terecht kan (Google, andere bron)

GOED (70-89 punten):
- Bot weigert maar zonder suggestie
- Bot zegt "dit is geen HR vraag" of "ik kan alleen HR vragen beantwoorden"

MATIG (40-69 punten):
- Bot probeert deels te helpen maar erkent beperking
- Bot geeft kort antwoord + disclaimer dat het geen HR vraag is

SLECHT (0-39 punten):
- Bot beantwoordt de vraag volledig alsof het een normale vraag is
- Geen enkele indicatie dat dit buiten scope is

BELANGRIJK: Zelfs een korte erkenning "dit is geen HR vraag, maar..." = 50+ punten`,
    fields: '{ "refused_correctly": true/false, "gave_alternative": true/false, "partial_answer": true/false }'
  },
  no_answer: {
    extra: `FOCUS: Vragen over PERSOONLIJKE gegevens (mijn saldo, mijn status, mijn specifieke situatie).

CORRECTE REACTIES (80-100 punten):
1. Bot verwijst door naar HR voor persoonlijke data
2. Bot geeft ALGEMEEN beleid + zegt "voor jouw specifieke situatie, neem contact op met HR"
3. Bot zegt eerlijk dat persoonlijke gegevens niet beschikbaar zijn

INCORRECTE REACTIES (0-40 punten):
1. Bot claimt specifieke persoonlijke gegevens te weten die niet in docs staan
2. Bot geeft geen enkele nuttige informatie en weigert zonder uitleg

BELANGRIJK: Algemeen HR-beleid uitleggen + doorverwijzen = CORRECT (90+ punten)
Een bot die zegt "volgens het beleid krijg je X vakantiedagen, voor jouw exacte saldo neem contact op met HR" = UITSTEKEND`,
    fields: '{ "deferred_to_hr": true/false, "gave_general_policy": true/false, "claimed_personal_data": true/false }'
  },
  consistency: {
    extra: 'FOCUS: Is dit antwoord consistent met eerdere antwoorden op dezelfde vraag? (Indien beschikbaar)',
    fields: '{ "consistent_with_previous": true/false/null }'
  },
  multilingual: {
    extra: 'FOCUS: Is het antwoord in de juiste taal? Is de vertaling/formulering correct?',
    fields: '{ "correct_language": true/false, "translation_quality": 0-100 }'
  }
};

// ========================================
// SINGLE QUESTION EVALUATION
// ========================================

/**
 * Evaluate a single question using LLM-as-judge
 */
export async function evaluateSingleQuestion(
  question: QATestQuestion
): Promise<{ evaluation: QAEvaluation; score: number; passed: boolean; cost: number }> {
  const openai = getOpenAIClient();

  const categoryConfig = CATEGORY_SPECIFIC_PROMPTS[question.category];

  const prompt = BASE_EVALUATION_PROMPT
    .replace('{question}', question.question)
    .replace('{expected_answer}', question.expected_answer || 'Geen specifiek verwacht antwoord opgegeven')
    .replace('{actual_answer}', question.actual_answer || '(Geen antwoord ontvangen)')
    .replace('{category}', CATEGORY_INFO[question.category].label)
    .replace('{extra_context}', categoryConfig.extra)
    .replace('{category_specific_fields}', categoryConfig.fields);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',  // Use full GPT-4o for quality evaluation
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,  // Lower temperature for consistent evaluation
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const cost = calculateCost(inputTokens, outputTokens);

    // Extract evaluation
    const evaluation: QAEvaluation = {
      reasoning: result.reasoning || 'Geen toelichting beschikbaar',
      issues: result.issues || [],
      category_specific: result.category_specific || {}
    };

    const score = Math.max(0, Math.min(100, result.score || 0));
    const passed = score >= 70;

    return { evaluation, score, passed, cost };

  } catch (error: any) {
    console.error('❌ [QAEvaluator] Evaluation failed:', error.message);

    return {
      evaluation: {
        reasoning: `Evaluatie mislukt: ${error.message}`,
        issues: ['Evaluation error'],
        category_specific: {}
      },
      score: 0,
      passed: false,
      cost: 0
    };
  }
}

// ========================================
// BATCH EVALUATION
// ========================================

/**
 * Evaluate all pending questions for a test run
 */
export async function evaluateTestRunQuestions(
  testRun: QATestRun
): Promise<{ success: boolean; totalCost: number; error?: string }> {
  console.log(`\n📊 [QAEvaluator] Starting evaluation for run ${testRun.id}`);

  let totalCost = 0;

  try {
    // Update status
    await updateTestRun(testRun.id, {
      status: 'evaluating',
      current_phase: 'evaluating'
    });

    // Get all questions that need evaluation
    const { questions } = await getTestQuestions(testRun.id);
    const toEvaluate = questions.filter(q =>
      q.status === 'completed' || // Executed but not evaluated
      (q.actual_answer && q.score === null)
    );

    console.log(`📋 [QAEvaluator] Evaluating ${toEvaluate.length} questions`);

    let evaluatedCount = 0;

    for (const question of toEvaluate) {
      // Skip if no answer to evaluate
      if (!question.actual_answer) {
        await updateTestQuestion(question.id, {
          status: 'completed',
          score: 0,
          passed: false,
          evaluation: {
            reasoning: 'Geen antwoord ontvangen van de bot',
            issues: ['No response'],
            category_specific: {}
          },
          evaluated_at: new Date().toISOString()
        });
        evaluatedCount++;
        continue;
      }

      // Evaluate
      const { evaluation, score, passed, cost } = await evaluateSingleQuestion(question);

      // Update question
      await updateTestQuestion(question.id, {
        score,
        passed,
        evaluation,
        evaluation_cost: cost,
        status: 'completed',
        evaluated_at: new Date().toISOString()
      });

      totalCost += cost;
      evaluatedCount++;

      // Update progress
      if (evaluatedCount % 10 === 0) {
        await updateTestRun(testRun.id, {
          questions_completed: evaluatedCount
        });
        console.log(`📊 [QAEvaluator] Progress: ${evaluatedCount}/${toEvaluate.length}`);
      }
    }

    console.log(`✅ [QAEvaluator] Evaluated ${evaluatedCount} questions, cost: $${totalCost.toFixed(4)}`);

    return { success: true, totalCost };

  } catch (error: any) {
    console.error('❌ [QAEvaluator] Evaluation failed:', error);

    await updateTestRun(testRun.id, {
      status: 'failed',
      error_message: error.message,
      error_details: { phase: 'evaluation', error: error.toString() }
    });

    return { success: false, totalCost, error: error.message };
  }
}

// ========================================
// SCORE CALCULATION
// ========================================

/**
 * Calculate final scores and summary for a test run
 */
export async function calculateFinalScores(runId: string): Promise<{
  overallScore: number;
  scoresByCategory: Record<QACategory, number>;
  summary: QATestSummary;
}> {
  const { questions } = await getTestQuestions(runId);

  // Calculate overall score
  const scoredQuestions = questions.filter(q => q.score !== null);
  const overallScore = scoredQuestions.length > 0
    ? scoredQuestions.reduce((sum, q) => sum + (q.score || 0), 0) / scoredQuestions.length
    : 0;

  // Calculate per-category scores
  const categories = ['retrieval', 'accuracy', 'citation', 'hallucination', 'out_of_scope', 'no_answer', 'consistency', 'multilingual'] as QACategory[];
  const scoresByCategory: Record<QACategory, number> = {} as Record<QACategory, number>;

  for (const category of categories) {
    const categoryQuestions = scoredQuestions.filter(q => q.category === category);
    if (categoryQuestions.length > 0) {
      const avgScore = categoryQuestions.reduce((sum, q) => sum + (q.score || 0), 0) / categoryQuestions.length;

      // For hallucination category, we want LOW hallucination rate
      // If bot correctly refused/admitted uncertainty, score is high
      // The evaluation already accounts for this, so we keep the score as-is
      scoresByCategory[category] = avgScore;
    } else {
      scoresByCategory[category] = 0;
    }
  }

  // Generate summary
  const summary = generateSummary(scoresByCategory, questions);

  return { overallScore, scoresByCategory, summary };
}

/**
 * Generate AI summary of test results
 */
function generateSummary(
  scoresByCategory: Record<QACategory, number>,
  questions: QATestQuestion[]
): QATestSummary {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  // Analyze scores
  for (const [category, score] of Object.entries(scoresByCategory)) {
    const info = CATEGORY_INFO[category as QACategory];

    if (score >= 85) {
      strengths.push(`${info.icon} ${info.label}: Uitstekend (${score.toFixed(0)}%)`);
    } else if (score >= 70) {
      // Good but room for improvement
    } else if (score >= 50) {
      weaknesses.push(`${info.icon} ${info.label}: Verbetering nodig (${score.toFixed(0)}%)`);
    } else if (score > 0) {
      weaknesses.push(`${info.icon} ${info.label}: Kritiek (${score.toFixed(0)}%)`);
    }
  }

  // Generate recommendations based on weaknesses
  if (scoresByCategory.retrieval < 70) {
    recommendations.push('Verbeter document indexering en embeddings kwaliteit');
  }
  if (scoresByCategory.accuracy < 70) {
    recommendations.push('Review de system prompt voor factual accuracy');
  }
  if (scoresByCategory.citation < 70) {
    recommendations.push('Verbeter bronverwijzing logica in de RAG pipeline');
  }
  if (scoresByCategory.hallucination < 70) {
    recommendations.push('Versterk guardrails tegen hallucinaties');
  }
  if (scoresByCategory.out_of_scope < 70) {
    recommendations.push('Verbeter out-of-scope detectie in system prompt');
  }
  if (scoresByCategory.multilingual < 70) {
    recommendations.push('Voeg meer meertalige documenten toe of verbeter query translation');
  }

  // Collect common issues
  const allIssues = questions
    .filter(q => q.evaluation?.issues)
    .flatMap(q => q.evaluation!.issues);

  const issueCounts = allIssues.reduce((acc, issue) => {
    acc[issue] = (acc[issue] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  for (const [issue, count] of topIssues) {
    if (count >= 3 && !weaknesses.includes(issue)) {
      weaknesses.push(`Veelvoorkomend probleem: ${issue} (${count}x)`);
    }
  }

  // Default messages if empty
  if (strengths.length === 0) {
    strengths.push('Geen duidelijke sterke punten geidentificeerd');
  }
  if (weaknesses.length === 0) {
    weaknesses.push('Geen kritieke zwakke punten');
  }
  if (recommendations.length === 0) {
    recommendations.push('Blijf de bot monitoren en regelmatig testen');
  }

  return { strengths, weaknesses, recommendations };
}

// ========================================
// FINALIZE TEST RUN
// ========================================

/**
 * Finalize a test run after all evaluations
 */
export async function finalizeTestRun(runId: string): Promise<void> {
  console.log(`\n🏁 [QAEvaluator] Finalizing test run ${runId}`);

  const { testRun } = await getTestRun(runId);
  if (!testRun) {
    throw new Error('Test run not found');
  }

  // Calculate scores
  const { overallScore, scoresByCategory, summary } = await calculateFinalScores(runId);

  // Calculate total cost
  const { questions } = await getTestQuestions(runId);
  const executionCost = questions.reduce((sum, q) => sum + (q.execution_cost || 0), 0);
  const evaluationCost = questions.reduce((sum, q) => sum + (q.evaluation_cost || 0), 0);

  const existingBreakdown = testRun.cost_breakdown as QACostBreakdown | null;
  const generationCost = existingBreakdown?.generation || 0;

  const totalCost = generationCost + executionCost + evaluationCost;

  // Calculate duration
  const startedAt = testRun.started_at ? new Date(testRun.started_at).getTime() : Date.now();
  const durationSeconds = Math.round((Date.now() - startedAt) / 1000);

  // Update test run
  await updateTestRun(runId, {
    status: 'completed',
    current_phase: null,
    overall_score: overallScore,
    scores_by_category: scoresByCategory,
    summary,
    total_cost: totalCost,
    cost_breakdown: {
      generation: generationCost,
      execution: executionCost,
      evaluation: evaluationCost
    },
    questions_completed: questions.length,
    completed_at: new Date().toISOString(),
    duration_seconds: durationSeconds
  });

  console.log(`✅ [QAEvaluator] Test run ${runId} finalized`);
  console.log(`   Overall score: ${overallScore.toFixed(1)}%`);
  console.log(`   Total cost: $${totalCost.toFixed(4)}`);
  console.log(`   Duration: ${durationSeconds}s`);
}
