import { NextRequest, NextResponse } from 'next/server';
import {
  getTestRunsForTenant,
  createTestRun,
  getTenantDocumentCount
} from '@/lib/admin/qa-service';
import { runCompleteTest } from '@/lib/admin/qa-executor';
import { QATestConfig, DEFAULT_TEST_CONFIG, calculateTotalQuestions } from '@/lib/admin/qa-types';

interface RouteParams {
  params: Promise<{ tenantId: string }>;
}

/**
 * GET /api/admin/test/[tenantId]
 * Get test history for a tenant
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await params;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const { testRuns, error } = await getTestRunsForTenant(tenantId, limit);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    // Also get document count for context
    const documentCount = await getTenantDocumentCount(tenantId);

    return NextResponse.json({
      tenant_id: tenantId,
      test_runs: testRuns,
      document_count: documentCount
    });

  } catch (error) {
    console.error('❌ [API] Error fetching test history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test history' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/test/[tenantId]
 * Start a new test run for a tenant
 *
 * Body (optional):
 * - config: Partial<QATestConfig>
 * - run_immediately: boolean (default true)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await params;
    const body = await request.json().catch(() => ({}));

    const config = body.config as Partial<QATestConfig> | undefined;
    const runImmediately = body.run_immediately !== false; // Default true

    // Calculate estimated questions
    const documentCount = await getTenantDocumentCount(tenantId);
    const fullConfig: QATestConfig = { ...DEFAULT_TEST_CONFIG, ...config };
    const estimatedQuestions = calculateTotalQuestions(fullConfig, documentCount);

    // Create test run
    const { testRun, error } = await createTestRun(tenantId, config);

    if (error || !testRun) {
      return NextResponse.json(
        { error: error || 'Failed to create test run' },
        { status: 500 }
      );
    }

    console.log(`✅ [API] Created test run ${testRun.id} for ${tenantId}`);

    // Start execution in background if requested
    if (runImmediately) {
      // Don't await - run in background
      runCompleteTest(testRun.id)
        .then(result => {
          if (result.success) {
            console.log(`✅ [API] Test run ${testRun.id} completed`);
          } else {
            console.error(`❌ [API] Test run ${testRun.id} failed:`, result.error);
          }
        })
        .catch(err => {
          console.error(`❌ [API] Test run ${testRun.id} error:`, err);
        });
    }

    return NextResponse.json({
      test_run: testRun,
      estimated_questions: estimatedQuestions,
      document_count: documentCount,
      running: runImmediately
    });

  } catch (error) {
    console.error('❌ [API] Error starting test:', error);
    return NextResponse.json(
      { error: 'Failed to start test' },
      { status: 500 }
    );
  }
}
