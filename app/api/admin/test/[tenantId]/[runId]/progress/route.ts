import { NextRequest, NextResponse } from 'next/server';
import { getTestRunProgress, getTestRun } from '@/lib/admin/qa-service';

interface RouteParams {
  params: Promise<{ tenantId: string; runId: string }>;
}

/**
 * GET /api/admin/test/[tenantId]/[runId]/progress
 * Get progress of a running test
 *
 * Returns:
 * - status: Test status
 * - phase: Current phase (generating, executing, evaluating)
 * - completed: Number of completed questions
 * - total: Total questions
 * - percent: Completion percentage
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId, runId } = await params;

    // Verify tenant ownership
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

    // Get progress
    const progress = await getTestRunProgress(runId);

    if (!progress) {
      return NextResponse.json(
        { error: 'Could not get progress' },
        { status: 500 }
      );
    }

    // Add extra info if completed or failed
    const response: any = {
      ...progress
    };

    if (testRun.status === 'completed') {
      response.overall_score = testRun.overall_score;
      response.scores_by_category = testRun.scores_by_category;
      response.total_cost = testRun.total_cost;
      response.duration_seconds = testRun.duration_seconds;
    }

    if (testRun.status === 'failed') {
      response.error_message = testRun.error_message;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [API] Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
