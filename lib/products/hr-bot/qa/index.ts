/**
 * ========================================
 * QA Testing Module for HR Bot
 * ========================================
 *
 * Complete QA testing system for HR Bot deployments.
 * Tests bot accuracy across 8 categories using LLM-as-judge.
 *
 * Module exports:
 * - types: All type definitions and constants
 * - service: CRUD operations for test runs, questions, templates
 * - executor: Question execution and test orchestration
 * - evaluator: LLM-as-judge evaluation
 * - question-generator: Automated question generation
 * - pdf-generator: Professional PDF reports
 *
 * Locatie: lib/products/hr-bot/qa/index.ts
 * Dit is HR Bot product-specifieke code.
 */

// ========================================
// TYPE EXPORTS
// ========================================
export {
  // Types
  type QACategory,
  type QATestConfig,
  type QATestStatus,
  type QATestRun,
  type QATestSummary,
  type QACostBreakdown,
  type QAQuestionStatus,
  type QATestQuestion,
  type QAEvaluation,
  type QATestTemplate,
  type QAExpectedSource,
  type QATemplateInput,
  type TenantTestOverview,
  type QATestProgress,

  // Constants
  CATEGORY_INFO,
  DEFAULT_CATEGORY_DISTRIBUTION,
  DEFAULT_TEST_CONFIG,
  OUT_OF_SCOPE_QUESTIONS,
  OUT_OF_SCOPE_QUESTIONS_EN,

  // Helper functions
  calculateTotalQuestions,
  calculateCategoryDistribution,
  getScoreColor,
  formatScore,
  isTestRunning
} from './types';

// ========================================
// SERVICE EXPORTS
// ========================================
export {
  // Test Run CRUD
  createTestRun,
  getTestRun,
  getTestRunsForTenant,
  updateTestRun,
  deleteTestRun,

  // Test Questions
  getTestQuestions,
  insertTestQuestions,
  updateTestQuestion,
  getPendingQuestions,

  // Templates
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,

  // Progress & Stats
  getTestRunProgress,
  getAllTenantsTestSummary,
  getGlobalQAStats,

  // Document Access
  getRandomChunksForTenant,
  getTenantDocumentCount
} from './service';

// ========================================
// EXECUTOR EXPORTS
// ========================================
export {
  executeSingleQuestion,
  executeTestRunQuestions,
  runCompleteTest
} from './executor';

// ========================================
// EVALUATOR EXPORTS
// ========================================
export {
  evaluateSingleQuestion,
  evaluateTestRunQuestions,
  calculateFinalScores,
  finalizeTestRun
} from './evaluator';

// ========================================
// QUESTION GENERATOR EXPORTS
// ========================================
export {
  generateQuestionsForTestRun
} from './question-generator';

// ========================================
// PDF GENERATOR EXPORTS
// ========================================
export {
  generateQAReport,
  generateQACSV,
  type PDFReportData
} from './pdf-generator';
