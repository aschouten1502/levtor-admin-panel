/**
 * API Route: /api/admin/logs/[tenantId]/stats
 *
 * GET - Fetch statistics for a tenant's logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getChatLogsStats } from '@/lib/admin/logs-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const searchParams = request.nextUrl.searchParams;

    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const { stats, error } = await getChatLogsStats(tenantId, startDate, endDate);

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch stats: ${error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ stats });
  } catch (err: any) {
    console.error('Error in stats API:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
