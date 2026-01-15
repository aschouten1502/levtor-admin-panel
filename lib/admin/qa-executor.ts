/**
 * ========================================
 * QA EXECUTOR - Run Questions Through Bot
 * ========================================
 *
 * Executes test questions by calling the RAG pipeline directly.
 * Captures bot responses, citations, and RAG details for evaluation.
 *
 * Uses the same RAG pipeline as the chat API but bypasses HTTP
 * for efficiency during batch testing.
 *
 * v2.3: QA Testing Module
 */

import OpenAI from 'openai';
import { QATestRun, QATestQuestion, QACostBreakdown } from './qa-types';
import {
  getTestRun,
  updateTestRun,
  getTestQuestions,
  updateTestQuestion,
  getPendingQuestions
} from './qa-service';
import { retrieveContext } from '@/lib/rag/context';
import { generateSystemPrompt } from '@/lib/prompts';

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

// GPT-4o pricing
const GPT4O_INPUT_COST = 2.50 / 1000000;
const GPT4O_OUTPUT_COST = 10.00 / 1000000;

// Embedding cost (text-embedding-3-small)
const EMBEDDING_COST = 0.02 / 1000000;

function calculateOpenAICost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * GPT4O_INPUT_COST) + (outputTokens * GPT4O_OUTPUT_COST);
}

// ========================================
// SINGLE QUESTION EXECUTION
// ========================================

interface ExecutionResult {
  answer: string;
  citations: any[];
  ragDetails: Record<string, any>;
  responseTimeMs: number;
  cost: number;
  error?: string;
}

/**
 * Execute a single question through the RAG pipeline
 */
export async function executeSingleQuestion(
  question: QATestQuestion,
  tenantId: string
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const openai = getOpenAIClient();

  try {
    // Step 1: Retrieve context from RAG
    console.log(`🔍 [QAExecutor] Retrieving context for: "${question.question.substring(0, 50)}..."`);

    const {
      contextText,
      citations,
      embeddingTokens,
      embeddingCost,
      ragDetails
    } = await retrieveContext(tenantId, question.question);

    // Step 2: Generate system prompt
    const systemPrompt = generateSystemPrompt(contextText, question.language);

    // Step 3: Call OpenAI to generate answer
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: question.question }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7
    });

    const answer = completion.choices[0].message.content || '';

    // Calculate costs
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const openaiCost = calculateOpenAICost(inputTokens, outputTokens);
    const totalCost = embeddingCost + openaiCost;

    const responseTimeMs = Date.now() - startTime;

    console.log(`✅ [QAExecutor] Got answer (${answer.length} chars) in ${responseTimeMs}ms`);

    return {
      answer,
      citations,
      ragDetails: {
        ...ragDetails,
        openai: {
          model: 'gpt-4o',
          inputTokens,
          outputTokens,
          cost: openaiCost
        }
      },
      responseTimeMs,
      cost: totalCost
    };

  } catch (error: any) {
    console.error('❌ [QAExecutor] Execution failed:', error.message);

    return {
      answer: '',
      citations: [],
      ragDetails: { error: error.message },
      responseTimeMs: Date.now() - startTime,
      cost: 0,
      error: error.message
    };
  }
}

// ========================================
// BATCH EXECUTION
// ========================================

/**
 * Execute all pending questions for a test run
 */
export async function executeTestRunQuestions(
  testRun: QATestRun
): Promise<{ success: boolean; totalCost: number; error?: string }> {
  console.log(`\n🎯 [QAExecutor] Starting execution for run ${testRun.id}`);

  let totalCost = 0;

  try {
    // Update status
    await updateTestRun(testRun.id, {
      status: 'running',
      current_phase: 'executing'
    });

    // Get all pending questions
    const { questions } = await getTestQuestions(testRun.id, { status: 'pending' });

    console.log(`📋 [QAExecutor] Executing ${questions.length} questions`);

    let executedCount = 0;
    let errorCount = 0;

    for (const question of questions) {
      // Update question status to executing
      await updateTestQuestion(question.id, {
        status: 'executing'
      });

      // Execute
      const result = await executeSingleQuestion(question, testRun.tenant_id);

      // Update question with results
      if (result.error) {
        await updateTestQuestion(question.id, {
          status: 'failed',
          error_message: result.error,
          execution_cost: result.cost,
          response_time_ms: result.responseTimeMs,
          executed_at: new Date().toISOString()
        });
        errorCount++;
      } else {
        await updateTestQuestion(question.id, {
          status: 'evaluating', // Ready for evaluation
          actual_answer: result.answer,
          citations: result.citations,
          rag_details: result.ragDetails,
          execution_cost: result.cost,
          response_time_ms: result.responseTimeMs,
          executed_at: new Date().toISOString()
        });
      }

      totalCost += result.cost;
      executedCount++;

      // Update progress every 5 questions
      if (executedCount % 5 === 0) {
        await updateTestRun(testRun.id, {
          questions_completed: executedCount
        });
        console.log(`📊 [QAExecutor] Progress: ${executedCount}/${questions.length} (${errorCount} errors)`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\n✅ [QAExecutor] Executed ${executedCount} questions, ${errorCount} errors, cost: $${totalCost.toFixed(4)}`);

    // Update test run cost
    const { testRun: currentRun } = await getTestRun(testRun.id);
    const existingBreakdown = currentRun?.cost_breakdown as QACostBreakdown | null;

    await updateTestRun(testRun.id, {
      questions_completed: executedCount,
      cost_breakdown: {
        generation: existingBreakdown?.generation || 0,
        execution: totalCost,
        evaluation: existingBreakdown?.evaluation || 0
      }
    });

    return { success: true, totalCost };

  } catch (error: any) {
    console.error('❌ [QAExecutor] Execution failed:', error);

    await updateTestRun(testRun.id, {
      status: 'failed',
      error_message: error.message,
      error_details: { phase: 'execution', error: error.toString() }
    });

    return { success: false, totalCost, error: error.message };
  }
}

// ========================================
// FULL TEST RUN ORCHESTRATION
// ========================================

import { generateQuestionsForTestRun } from './qa-question-generator';
import { evaluateTestRunQuestions, finalizeTestRun } from './qa-evaluator';

/**
 * Run complete test: generate → execute → evaluate → finalize
 */
export async function runCompleteTest(runId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log(`\n🚀 [QAExecutor] Starting complete test run ${runId}`);

  try {
    // Get test run
    const { testRun, error: fetchError } = await getTestRun(runId);
    if (!testRun || fetchError) {
      throw new Error(fetchError || 'Test run not found');
    }

    // Phase 1: Generate questions
    console.log('\n📝 PHASE 1: Generating questions...');
    const genResult = await generateQuestionsForTestRun(testRun);
    if (genResult.error) {
      throw new Error(`Generation failed: ${genResult.error}`);
    }
    console.log(`✅ Generated ${genResult.questions.length} questions`);

    // Refresh test run
    const { testRun: updatedRun } = await getTestRun(runId);
    if (!updatedRun) {
      throw new Error('Test run not found after generation');
    }

    // Phase 2: Execute questions
    console.log('\n🎯 PHASE 2: Executing questions...');
    const execResult = await executeTestRunQuestions(updatedRun);
    if (!execResult.success) {
      throw new Error(`Execution failed: ${execResult.error}`);
    }
    console.log(`✅ Executed questions, cost: $${execResult.totalCost.toFixed(4)}`);

    // Phase 3: Evaluate questions
    console.log('\n📊 PHASE 3: Evaluating answers...');
    const { testRun: runForEval } = await getTestRun(runId);
    if (!runForEval) {
      throw new Error('Test run not found before evaluation');
    }
    const evalResult = await evaluateTestRunQuestions(runForEval);
    if (!evalResult.success) {
      throw new Error(`Evaluation failed: ${evalResult.error}`);
    }
    console.log(`✅ Evaluated answers, cost: $${evalResult.totalCost.toFixed(4)}`);

    // Phase 4: Finalize
    console.log('\n🏁 PHASE 4: Finalizing...');
    await finalizeTestRun(runId);

    console.log('\n✅ Test run completed successfully!');
    return { success: true };

  } catch (error: any) {
    console.error('\n❌ Test run failed:', error.message);

    // Make sure we mark it as failed
    await updateTestRun(runId, {
      status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString()
    });

    return { success: false, error: error.message };
  }
}
