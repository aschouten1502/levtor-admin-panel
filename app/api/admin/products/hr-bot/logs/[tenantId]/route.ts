/**
 * API Route: /api/admin/logs/[tenantId]
 *
 * GET - Fetch chat logs or document processing logs for a tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { getChatLogs, getDocumentProcessingLogs, LogsFilters } from '@/lib/admin/logs-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const searchParams = request.nextUrl.searchParams;

    const type = searchParams.get('type') || 'chat';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);

    if (type === 'documents') {
      // Fetch document processing logs
      const { logs, total, error } = await getDocumentProcessingLogs(tenantId, page, pageSize);

      if (error) {
        return NextResponse.json(
          { error: `Failed to fetch document logs: ${error}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ logs, total });
    }

    // Fetch chat logs with filters
    const filters: LogsFilters = {};

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const language = searchParams.get('language');
    const eventType = searchParams.get('eventType');
    const hasError = searchParams.get('hasError');
    const hasFeedback = searchParams.get('hasFeedback');
    const search = searchParams.get('search');

    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (language) filters.language = language;
    if (eventType) filters.eventType = eventType;
    if (hasError === 'true') filters.hasError = true;
    if (hasFeedback === 'true') filters.hasFeedback = true;
    if (search) filters.searchQuery = search;

    const { logs, total, error } = await getChatLogs(tenantId, page, pageSize, filters);

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch logs: ${error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ logs, total });
  } catch (err: any) {
    console.error('Error in tenant logs API:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
