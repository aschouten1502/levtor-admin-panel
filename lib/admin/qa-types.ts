/**
 * ========================================
 * QA TESTING TYPES
 * ========================================
 *
 * Type definitions for the QA Testing module.
 * Used for testing bot accuracy per tenant.
 *
 * v2.3: QA Testing Module
 */

// ========================================
// TEST CATEGORIES
// ========================================

/**
 * The 8 test categories for evaluating bot accuracy
 */
export type QACategory =
  | 'retrieval'      // Does bot find correct documents?
  | 'accuracy'       // Is the answer correct?
  | 'citation'       // Are source references correct?
  | 'hallucination'  // Does bot make things up?
  | 'out_of_scope'   // Does bot refuse non-HR questions?
  | 'no_answer'      // Does bot admit when it doesn't know?
  | 'consistency'    // Same question = same answer?
  | 'multilingual';  // Does it work in other languages?

/**
 * Category descriptions for UI
 */
export const CATEGORY_INFO: Record<QACategory, {
  label: string;
  description: string;
  icon: string;
  invertScore?: boolean; // For hallucination: lower is better
}> = {
  retrieval: {
    label: 'Retrieval',
    description: 'Vindt de bot de juiste documenten?',
    icon: '🔍'
  },
  accuracy: {
    label: 'Accuraatheid',
    description: 'Is het antwoord inhoudelijk correct?',
    icon: '✓'
  },
  citation: {
    label: 'Bronverwijzing',
    description: 'Kloppen de bronverwijzingen?',
    icon: '📎'
  },
  hallucination: {
    label: 'Hallucinatie',
    description: 'Verzint de bot informatie?',
    icon: '👻',
    invertScore: true // Lower hallucination rate is better
  },
  out_of_scope: {
    label: 'Out-of-scope',
    description: 'Weigert de bot niet-HR vragen?',
    icon: '🚫'
  },
  no_answer: {
    label: 'Geen antwoord',
    description: 'Geeft de bot eerlijk "weet niet"?',
    icon: '❓'
  },
  consistency: {
    label: 'Consistentie',
    description: 'Zelfde vraag = zelfde antwoord?',
    icon: '🔄'
  },
  multilingual: {
    label: 'Meertalig',
    description: 'Werkt in andere talen?',
    icon: '🌐'
  }
};

/**
 * Default question distribution percentages
 */
export const DEFAULT_CATEGORY_DISTRIBUTION: Record<QACategory, number> = {
  retrieval: 25,
  accuracy: 20,
  citation: 15,
  hallucination: 15,
  out_of_scope: 10,
  no_answer: 5,
  consistency: 5,
  multilingual: 5
};

// ========================================
// TEST CONFIGURATION
// ========================================

/**
 * Configuration for a test run
 */
export interface QATestConfig {
  minQuestions: number;          // Default 60
  questionsPerDocument: number;  // Extra questions per doc (default 2)
  categories: QACategory[];      // Which categories to include
  languages: string[];           // Languages to test (default ['nl'])
  strictness: 'strict' | 'moderate' | 'lenient';
}

/**
 * Default test configuration
 */
export const DEFAULT_TEST_CONFIG: QATestConfig = {
  minQuestions: 60,
  questionsPerDocument: 2,
  categories: ['retrieval', 'accuracy', 'citation', 'hallucination', 'out_of_scope', 'no_answer', 'consistency', 'multilingual'],
  languages: ['nl'],
  strictness: 'strict'
};

// ========================================
// TEST RUN
// ========================================

/**
 * Status of a test run
 */
export type QATestStatus = 'pending' | 'generating' | 'running' | 'evaluating' | 'completed' | 'failed';

/**
 * Main test run record
 */
export interface QATestRun {
  id: string;
  tenant_id: string;
  status: QATestStatus;

  // Configuration
  config: QATestConfig;

  // Progress
  total_questions: number;
  questions_completed: number;
  current_phase: 'generating' | 'executing' | 'evaluating' | null;

  // Results
  overall_score: number | null;
  scores_by_category: Record<QACategory, number> | null;
  summary: QATestSummary | null;

  // Costs
  total_cost: number;
  cost_breakdown: QACostBreakdown | null;

  // Timing
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  created_at: string;

  // Error handling
  error_message: string | null;
  error_details: Record<string, any> | null;
}

/**
 * Test summary with AI-generated insights
 */
export interface QATestSummary {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

/**
 * Cost breakdown for a test run
 */
export interface QACostBreakdown {
  generation: number;   // Cost of generating questions
  execution: number;    // Cost of running questions through bot
  evaluation: number;   // Cost of LLM-as-judge evaluation
}

// ========================================
// TEST QUESTION
// ========================================

/**
 * Status of a test question
 */
export type QAQuestionStatus = 'pending' | 'executing' | 'evaluating' | 'completed' | 'failed';

/**
 * Individual test question
 */
export interface QATestQuestion {
  id: string;
  test_run_id: string;
  tenant_id: string;

  // Question details
  category: QACategory;
  question: string;
  expected_answer: string | null;
  source_chunk_id: string | null;
  source_document: string | null;
  source_page: number | null;
  is_auto_generated: boolean;
  language: string;

  // Bot response
  actual_answer: string | null;
  citations: any[] | null;
  rag_details: Record<string, any> | null;
  response_time_ms: number | null;

  // Evaluation
  score: number | null;
  passed: boolean | null;
  evaluation: QAEvaluation | null;

  // Costs
  execution_cost: number;
  evaluation_cost: number;

  // Status
  status: QAQuestionStatus;
  error_message: string | null;
  executed_at: string | null;
  evaluated_at: string | null;
  created_at: string;
}

/**
 * LLM-as-judge evaluation result
 */
export interface QAEvaluation {
  reasoning: string;
  issues: string[];
  category_specific: Record<string, any>;
}

// ========================================
// TEST TEMPLATE
// ========================================

/**
 * Reusable manual test question template
 */
export interface QATestTemplate {
  id: string;
  tenant_id: string;

  // Template details
  category: QACategory;
  question: string;
  expected_answer: string | null;
  expected_sources: QAExpectedSource[] | null;
  language: string;

  // Metadata
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Expected source for a template
 */
export interface QAExpectedSource {
  document: string;
  page?: number;
}

/**
 * Input for creating/updating a template
 */
export interface QATemplateInput {
  category: QACategory;
  question: string;
  expected_answer?: string;
  expected_sources?: QAExpectedSource[];
  language?: string;
  notes?: string;
}

// ========================================
// OVERVIEW & STATS
// ========================================

/**
 * Tenant test overview for admin list
 */
export interface TenantTestOverview {
  tenant_id: string;
  tenant_name: string;
  last_test_date: string | null;
  last_score: number | null;
  test_count: number;
  total_test_cost: number;
  avg_score: number | null;
  is_active: boolean;
}

/**
 * Progress info for a running test
 */
export interface QATestProgress {
  status: QATestStatus;
  phase: string | null;
  completed: number;
  total: number;
  percent: number;
}

// ========================================
// OUT-OF-SCOPE QUESTIONS
// ========================================

/**
 * Standard out-of-scope questions (non-HR topics)
 */
export const OUT_OF_SCOPE_QUESTIONS: string[] = [
  "Wat wordt het weer morgen?",
  "Wie won de laatste Eredivisie?",
  "Wat is de hoofdstad van Australië?",
  "Hoe maak ik spaghetti carbonara?",
  "Wat is het laatste nieuws?",
  "Kun je een gedicht voor me schrijven?",
  "Wat is de aandelenkoers van Apple?",
  "Vertel een mop",
  "Wat is 2 + 2?",
  "Wie is de president van Amerika?"
];

/**
 * English out-of-scope questions for multilingual testing
 */
export const OUT_OF_SCOPE_QUESTIONS_EN: string[] = [
  "What will the weather be like tomorrow?",
  "Who won the last World Cup?",
  "What is the capital of Australia?",
  "How do I make spaghetti carbonara?",
  "What is the latest news?",
  "Can you write a poem for me?",
  "What is Apple's stock price?",
  "Tell me a joke",
  "What is 2 + 2?",
  "Who is the president of America?"
];

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Calculate total questions based on config and document count
 */
export function calculateTotalQuestions(
  config: QATestConfig,
  documentCount: number
): number {
  return config.minQuestions + (documentCount * config.questionsPerDocument);
}

/**
 * Calculate question distribution by category
 */
export function calculateCategoryDistribution(
  totalQuestions: number,
  categories: QACategory[]
): Record<QACategory, number> {
  const distribution: Record<QACategory, number> = {} as Record<QACategory, number>;
  const activeCategories = categories.filter(c => DEFAULT_CATEGORY_DISTRIBUTION[c] > 0);

  // Calculate total percentage of active categories
  const totalPercent = activeCategories.reduce(
    (sum, cat) => sum + DEFAULT_CATEGORY_DISTRIBUTION[cat],
    0
  );

  // Distribute questions proportionally
  let assigned = 0;
  for (let i = 0; i < activeCategories.length; i++) {
    const cat = activeCategories[i];
    const percent = DEFAULT_CATEGORY_DISTRIBUTION[cat] / totalPercent;

    if (i === activeCategories.length - 1) {
      // Last category gets remaining questions
      distribution[cat] = totalQuestions - assigned;
    } else {
      distribution[cat] = Math.round(totalQuestions * percent);
      assigned += distribution[cat];
    }
  }

  return distribution;
}

/**
 * Get score color based on value (for UI)
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  return 'red';
}

/**
 * Format score for display
 */
export function formatScore(score: number | null): string {
  if (score === null) return '-';
  return `${score.toFixed(1)}%`;
}

/**
 * Check if a test is still running
 */
export function isTestRunning(status: QATestStatus): boolean {
  return ['pending', 'generating', 'running', 'evaluating'].includes(status);
}
