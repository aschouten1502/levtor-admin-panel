import { NextRequest, NextResponse } from 'next/server';
import {
  getTestRun,
  getTestQuestions,
  deleteTestRun
} from '@/lib/admin/qa-service';

interface RouteParams {
  params: Promise<{ tenantId: string; runId: string }>;
}

/**
 * GET /api/admin/test/[tenantId]/[runId]
 * Get test run details with questions
 *
 * Query params:
 * - include_questions: "true" to include all questions (default false for performance)
 * - category: Filter questions by category
 * - passed: Filter by passed status ("true" or "false")
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId, runId } = await params;

    const { searchParams } = new URL(request.url);
    const includeQuestions = searchParams.get('include_questions') === 'true';
    const category = searchParams.get('category');
    const passedFilter = searchParams.get('passed');

    // Get test run
    const { testRun, error } = await getTestRun(runId);

    if (error || !testRun) {
      return NextResponse.json(
        { error: error || 'Test run not found' },
        { status: 404 }
      );
    }

    // Verify tenant matches
    if (testRun.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: 'Test run does not belong to this tenant' },
        { status: 403 }
      );
    }

    let questions = null;

    if (includeQuestions) {
      const filters: any = {};
      if (category) filters.category = category;
      if (passedFilter !== null) filters.passed = passedFilter === 'true';

      const result = await getTestQuestions(runId, filters);
      questions = result.questions;
    }

    return NextResponse.json({
      test_run: testRun,
      questions,
      question_count: questions?.length
    });

  } catch (error) {
    console.error('❌ [API] Error fetching test run:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test run' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/test/[tenantId]/[runId]
 * Delete a test run
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId, runId } = await params;

    // First verify the run belongs to this tenant
    const { testRun, error: fetchError } = await getTestRun(runId);

    if (fetchError || !testRun) {
      return NextResponse.json(
        { error: fetchError || 'Test run not found' },
        { status: 404 }
      );
    }

    if (testRun.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: 'Test run does not belong to this tenant' },
        { status: 403 }
      );
    }

    // Don't allow deletion of running tests
    if (['generating', 'running', 'evaluating'].includes(testRun.status)) {
      return NextResponse.json(
        { error: 'Cannot delete a running test' },
        { status: 400 }
      );
    }

    const { success, error } = await deleteTestRun(runId);

    if (!success) {
      return NextResponse.json(
        { error: error || 'Failed to delete test run' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ [API] Error deleting test run:', error);
    return NextResponse.json(
      { error: 'Failed to delete test run' },
      { status: 500 }
    );
  }
}
