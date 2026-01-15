/**
 * ========================================
 * QA TESTING SERVICE
 * ========================================
 *
 * Service for managing QA test runs, questions, and templates.
 * Handles all CRUD operations and test execution coordination.
 *
 * v2.3: QA Testing Module
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  QATestRun,
  QATestQuestion,
  QATestTemplate,
  QATestConfig,
  QATestProgress,
  QATestStatus,
  QACategory,
  TenantTestOverview,
  QATemplateInput,
  DEFAULT_TEST_CONFIG,
  calculateTotalQuestions,
  isTestRunning
} from './qa-types';

// ========================================
// SUPABASE CLIENT
// ========================================

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Supabase configuration missing');
    }

    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

// ========================================
// TEST RUN CRUD
// ========================================

/**
 * Create a new test run for a tenant
 */
export async function createTestRun(
  tenantId: string,
  config?: Partial<QATestConfig>
): Promise<{ testRun: QATestRun | null; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    // Merge with default config
    const fullConfig: QATestConfig = {
      ...DEFAULT_TEST_CONFIG,
      ...config
    };

    // Get document count for this tenant to calculate total questions
    const { count: documentCount } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('processing_status', 'completed');

    const totalQuestions = calculateTotalQuestions(fullConfig, documentCount || 0);

    const { data, error } = await supabase
      .from('qa_test_runs')
      .insert({
        tenant_id: tenantId,
        status: 'pending',
        config: fullConfig,
        total_questions: totalQuestions,
        questions_completed: 0
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [QAService] Error creating test run:', error);
      return { testRun: null, error: error.message };
    }

    console.log(`✅ [QAService] Created test run ${data.id} for tenant ${tenantId}`);
    return { testRun: data };
  } catch (err: any) {
    console.error('❌ [QAService] Unexpected error:', err);
    return { testRun: null, error: err.message };
  }
}

/**
 * Get a test run by ID
 */
export async function getTestRun(
  runId: string
): Promise<{ testRun: QATestRun | null; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('qa_test_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { testRun: null, error: 'Test run not found' };
      }
      console.error('❌ [QAService] Error fetching test run:', error);
      return { testRun: null, error: error.message };
    }

    return { testRun: data };
  } catch (err: any) {
    console.error('❌ [QAService] Unexpected error:', err);
    return { testRun: null, error: err.message };
  }
}

/**
 * Get all test runs for a tenant
 */
export async function getTestRunsForTenant(
  tenantId: string,
  limit: number = 20
): Promise<{ testRuns: QATestRun[]; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('qa_test_runs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ [QAService] Error fetching test runs:', error);
      return { testRuns: [], error: error.message };
    }

    return { testRuns: data || [] };
  } catch (err: any) {
    console.error('❌ [QAService] Unexpected error:', err);
    return { testRuns: [], error: err.message };
  }
}

/**
 * Update test run status and progress
 */
export async function updateTestRun(
  runId: string,
  updates: Partial<QATestRun>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    const { error } = await supabase
      .from('qa_test_runs')
      .update(updates)
      .eq('id', runId);

    if (error) {
      console.error('❌ [QAService] Error updating test run:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('❌ [QAService] Unexpected error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a test run and all associated questions
 */
export async function deleteTestRun(
  runId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    // Questions are deleted automatically via ON DELETE CASCADE
    const { error } = await supabase
      .from('qa_test_runs')
      .delete()
      .eq('id', runId);

    if (error) {
      console.error('❌ [QAService] Error deleting test run:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ [QAService] Deleted test run ${runId}`);
    return { success: true };
  } catch (err: any) {
    console.error('❌ [QAService] Unexpected error:', err);
    return { success: false, error: err.message };
  }
}

// ========================================
// TEST QUESTIONS
// ========================================

/**
 * Get all questions for a test run
 */
export async function getTestQuestions(
  runId: string,
  filters?: {
    category?: QACategory;
    status?: string;
    passed?: boolean;
  }
): Promise<{ questions: QATestQuestion[]; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    let query = supabase
      .from('qa_test_questions')
      .select('*')
      .eq('test_run_id', runId)
      .order('created_at', { ascending: true });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.passed !== undefined) {
      query = query.eq('passed', filters.passed);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [QAService] Error fetching questions:', error);
      return { questions: [], error: error.message };
    }

    return { questions: data || [] };
  } catch (err: any) {
    console.error('❌ [QAService] Unexpected error:', err);
    return { questions: [], error: err.message };
  }
}

/**
 * Insert multiple questions for a test run
 */
export async function insertTestQuestions(
  questions: Array<Omit<QATestQuestion, 'id' | 'created_at'>>
): Promise<{ count: number; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('qa_test_questions')
      .insert(questions)
      .select('id');

    if (error) {
      console.error('❌ [QAService] Error inserting questions:', error);
      return { count: 0, error: error.message };
    }

    console.log(`✅ [QAService] Inserted ${data?.length || 0} questions`);
    return { count: data?.length || 0 };
  } catch (err: any) {
    console.error('❌ [QAService] Unexpected error:', err);
    return { count: 0, error: err.message };
  }
}

/**
 * Update a single question
 */
export async function updateTestQuestion(
  questionId: string,
  updates: Partial<QATestQuestion>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    const { error } = await supabase
      .from('qa_test_questions')
      .update(updates)
      .eq('id', questionId);

    if (error) {
      console.error('❌ [QAService] Error updating question:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('❌ [QAService] Unexpected error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get pending questions for execution
 */
export async function getPendingQuestions(
  runId: string,
  limit: number = 10
): Promise<QATestQuestion[]> {
  const supabase = getSupabaseClient();

  const { data } = await supabase
    .from('qa_test_questions')
    .select('*')
    .eq('test_run_id', runId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  return data || [];
}

// ========================================
// TEST TEMPLATES
// ========================================

/**
 * Get all templates for a tenant
 */
export async function getTemplates(
  tenantId: string,
  activeOnly: boolean = false
): Promise<{ templates: QATestTemplate[]; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    let query = supabase
      .from('qa_test_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [QAService] Error fetching templates:', error);
      return { templates: [], error: error.message };
    }

    return { templates: data || [] };
  } catch (err: any) {
    console.error('❌ [QAService] Unexpected error:', err);
    return { templates: [], error: err.message };
  }
}

/**
 * Create a new template
 */
export async function createTemplate(
  tenantId: string,
  input: QATemplateInput
): Promise<{ template: QATestTemplate | null; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('qa_test_templates')
      .insert({
        tenant_id: tenantId,
        category: input.category,
        question: input.question,
        expected_answer: input.expected_answer || null,
        expected_sources: input.expected_sources || null,
        language: input.language || 'nl',
        notes: input.notes || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [QAService] Error creating template:', error);
      return { template: null, error: error.message };
    }

    console.log(`✅ [QAService] Created template ${data.id}`);
    return { template: data };
  } catch (err: any) {
    console.error('❌ [QAService] Unexpected error:', err);
    return { template: null, error: err.message };
  }
}

/**
 * Update a template
 */
export async function updateTemplate(
  templateId: string,
  input: Partial<QATemplateInput> & { is_active?: boolean }
): Promise<{ template: QATestTemplate | null; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('qa_test_templates')
      .update({
        ...(input.category && { category: input.category }),
        ...(input.question && { question: input.question }),
        ...(input.expected_answer !== undefined && { expected_answer: input.expected_answer }),
        ...(input.expected_sources !== undefined && { expected_sources: input.expected_sources }),
        ...(input.language && { language: input.language }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.is_active !== undefined && { is_active: input.is_active })
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('❌ [QAService] Error updating template:', error);
      return { template: null, error: error.message };
    }

    return { template: data };
  } catch (err: any) {
    console.error('❌ [QAService] Unexpected error:', err);
    return { template: null, error: err.message };
  }
}

/**
 * Delete a template
 */
export async function deleteTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    const { error } = await supabase
      .from('qa_test_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('❌ [QAService] Error deleting template:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ [QAService] Deleted template ${templateId}`);
    return { success: true };
  } catch (err: any) {
    console.error('❌ [QAService] Unexpected error:', err);
    return { success: false, error: err.message };
  }
}

// ========================================
// PROGRESS & STATS
// ========================================

/**
 * Get progress of a running test
 */
export async function getTestRunProgress(
  runId: string
): Promise<QATestProgress | null> {
  const { testRun } = await getTestRun(runId);

  if (!testRun) return null;

  const percent = testRun.total_questions > 0
    ? Math.round((testRun.questions_completed / testRun.total_questions) * 100)
    : 0;

  return {
    status: testRun.status,
    phase: testRun.current_phase,
    completed: testRun.questions_completed,
    total: testRun.total_questions,
    percent
  };
}

/**
 * Get test summary for all tenants (admin overview)
 */
export async function getAllTenantsTestSummary(): Promise<{
  tenants: TenantTestOverview[];
  error?: string;
}> {
  const supabase = getSupabaseClient();

  try {
    // Get all tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, is_active')
      .order('name');

    if (tenantsError) {
      console.error('❌ [QAService] Error fetching tenants:', tenantsError);
      return { tenants: [], error: tenantsError.message };
    }

    // Get all completed test runs
    const { data: testRuns, error: runsError } = await supabase
      .from('qa_test_runs')
      .select('tenant_id, overall_score, total_cost, completed_at')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (runsError) {
      console.error('❌ [QAService] Error fetching test runs:', runsError);
      return { tenants: [], error: runsError.message };
    }

    // Aggregate per tenant
    const result: TenantTestOverview[] = [];

    for (const tenant of tenants || []) {
      const tenantRuns = (testRuns || []).filter(r => r.tenant_id === tenant.id);

      const lastRun = tenantRuns[0] || null;
      const totalCost = tenantRuns.reduce((sum, r) => sum + (r.total_cost || 0), 0);
      const scores = tenantRuns.map(r => r.overall_score).filter(s => s !== null);
      const avgScore = scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : null;

      result.push({
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        last_test_date: lastRun?.completed_at || null,
        last_score: lastRun?.overall_score || null,
        test_count: tenantRuns.length,
        total_test_cost: totalCost,
        avg_score: avgScore,
        is_active: tenant.is_active
      });
    }

    // Sort by last test date (most recent first), then by name
    result.sort((a, b) => {
      if (a.last_test_date && b.last_test_date) {
        return new Date(b.last_test_date).getTime() - new Date(a.last_test_date).getTime();
      }
      if (a.last_test_date) return -1;
      if (b.last_test_date) return 1;
      return a.tenant_name.localeCompare(b.tenant_name);
    });

    return { tenants: result };
  } catch (err: any) {
    console.error('❌ [QAService] Unexpected error:', err);
    return { tenants: [], error: err.message };
  }
}

/**
 * Get global QA stats for admin dashboard
 */
export async function getGlobalQAStats(): Promise<{
  total_tests: number;
  total_cost: number;
  avg_score: number | null;
  tests_this_week: number;
}> {
  const supabase = getSupabaseClient();

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data: runs } = await supabase
    .from('qa_test_runs')
    .select('overall_score, total_cost, completed_at')
    .eq('status', 'completed');

  const completedRuns = runs || [];
  const recentRuns = completedRuns.filter(
    r => r.completed_at && new Date(r.completed_at) >= oneWeekAgo
  );

  const scores = completedRuns.map(r => r.overall_score).filter(s => s !== null);
  const avgScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : null;

  return {
    total_tests: completedRuns.length,
    total_cost: completedRuns.reduce((sum, r) => sum + (r.total_cost || 0), 0),
    avg_score: avgScore,
    tests_this_week: recentRuns.length
  };
}

// ========================================
// DOCUMENT CHUNKS ACCESS
// ========================================

/**
 * Get random chunks for question generation
 */
export async function getRandomChunksForTenant(
  tenantId: string,
  count: number = 20
): Promise<Array<{
  id: string;
  content: string;
  document_id: string;
  page_number: number | null;
  metadata: Record<string, any>;
  document_filename: string;
}>> {
  const supabase = getSupabaseClient();

  // Get chunks with their document info
  const { data: chunks } = await supabase
    .from('document_chunks')
    .select(`
      id,
      content,
      document_id,
      page_number,
      metadata,
      documents!inner(filename)
    `)
    .eq('tenant_id', tenantId)
    .limit(count * 3); // Get more than needed, then randomize

  if (!chunks || chunks.length === 0) return [];

  // Shuffle and take required count
  const shuffled = chunks.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  return selected.map(c => ({
    id: c.id,
    content: c.content,
    document_id: c.document_id,
    page_number: c.page_number,
    metadata: c.metadata || {},
    document_filename: (c.documents as any)?.filename || 'Unknown'
  }));
}

/**
 * Get document count for a tenant
 */
export async function getTenantDocumentCount(tenantId: string): Promise<number> {
  const supabase = getSupabaseClient();

  const { count } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('processing_status', 'completed');

  return count || 0;
}
