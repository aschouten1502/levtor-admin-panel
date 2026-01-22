import { NextRequest, NextResponse } from 'next/server';
import { getAllTenantsTestSummary, getGlobalQAStats } from '@/lib/products/hr-bot/qa';

/**
 * GET /api/admin/test
 * Get QA test overview for all tenants
 *
 * Query params:
 * - summary: If "true", return only global stats
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const summaryOnly = searchParams.get('summary') === 'true';

    // Global stats only
    if (summaryOnly) {
      const stats = await getGlobalQAStats();
      return NextResponse.json(stats);
    }

    // All tenants overview
    const { tenants, error } = await getAllTenantsTestSummary();

    if (error) {
      return NextResponse.json(
        { error },
        { status: 500 }
      );
    }

    return NextResponse.json({ tenants });

  } catch (error) {
    console.error('❌ [API] Error fetching test overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test overview' },
      { status: 500 }
    );
  }
}
