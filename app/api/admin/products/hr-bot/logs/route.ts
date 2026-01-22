/**
 * API Route: /api/admin/logs
 *
 * GET - Fetch logs overview for all tenants with global stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllTenantsLogsOverview, TenantLogsOverview } from '@/lib/admin/logs-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // Get tenants overview
    const { tenants, error } = await getAllTenantsLogsOverview();

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch logs: ${error}` },
        { status: 500 }
      );
    }

    // Filter by date if provided (basic filtering for now)
    let filteredTenants = tenants;
    if (startDate) {
      const startTimestamp = new Date(startDate).getTime();
      filteredTenants = filteredTenants.filter(
        t => new Date(t.last_activity).getTime() >= startTimestamp
      );
    }
    if (endDate) {
      const endTimestamp = new Date(endDate).getTime() + 86400000; // Include end day
      filteredTenants = filteredTenants.filter(
        t => new Date(t.last_activity).getTime() <= endTimestamp
      );
    }

    // Calculate global stats
    const globalStats = calculateGlobalStats(filteredTenants);

    return NextResponse.json({
      tenants: filteredTenants,
      globalStats
    });
  } catch (err: any) {
    console.error('Error in logs API:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate global statistics from tenant data
 */
function calculateGlobalStats(tenants: TenantLogsOverview[]) {
  if (tenants.length === 0) {
    return {
      totalLogs: 0,
      totalCost: 0,
      avgResponseTimeMs: 0,
      completeRate: 100,
      tenantsWithLogs: 0
    };
  }

  const totalLogs = tenants.reduce((sum, t) => sum + t.total_logs, 0);
  const totalCost = tenants.reduce((sum, t) => sum + t.total_cost, 0);

  // Weighted average response time
  const weightedResponseTime = tenants.reduce(
    (sum, t) => sum + (t.avg_response_time_ms * t.total_logs), 0
  );
  const avgResponseTimeMs = totalLogs > 0 ? weightedResponseTime / totalLogs : 0;

  // Calculate complete rate (100% - weighted error rate)
  const weightedErrorRate = tenants.reduce(
    (sum, t) => sum + (t.error_rate * t.total_logs), 0
  );
  const avgErrorRate = totalLogs > 0 ? weightedErrorRate / totalLogs : 0;
  const completeRate = 100 - avgErrorRate;

  return {
    totalLogs,
    totalCost,
    avgResponseTimeMs,
    completeRate,
    tenantsWithLogs: tenants.length
  };
}
