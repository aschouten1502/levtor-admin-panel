/**
 * API Route: /api/admin/test/[tenantId]/[runId]/pdf
 *
 * GET: Download PDF or CSV report for a test run
 *
 * Query params:
 * - format: 'pdf' (default) | 'csv'
 */

import { NextResponse } from 'next/server';
import { getTestRun, getTestQuestions } from '@/lib/admin/qa-service';
import { generateQAReport, generateQACSV } from '@/lib/admin/qa-pdf-generator';
import { createClient } from '@supabase/supabase-js';

interface RouteParams {
  params: Promise<{
    tenantId: string;
    runId: string;
  }>;
}

// GET: Download report
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { tenantId, runId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';

    // Get test run
    const testRunResult = await getTestRun(runId);
    if (!testRunResult || testRunResult.error || !testRunResult.testRun) {
      return NextResponse.json(
        { error: 'Test run not found' },
        { status: 404 }
      );
    }

    const testRun = testRunResult.testRun;

    // Verify tenant matches
    if (testRun.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: 'Tenant mismatch' },
        { status: 403 }
      );
    }

    // Only completed tests can be exported
    if (testRun.status !== 'completed') {
      return NextResponse.json(
        { error: 'Test not yet completed' },
        { status: 400 }
      );
    }

    // Get questions
    const questionsResult = await getTestQuestions(runId);
    const questions = questionsResult.questions || [];

    // Get tenant name
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single();

    const tenantName = tenant?.name || tenantId;

    // Generate report
    const reportData = { testRun, questions, tenantName };

    if (format === 'csv') {
      // CSV Export
      const csv = generateQACSV(reportData);
      const fileName = `qa-report-${tenantId}-${runId.substring(0, 8)}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    } else {
      // PDF Export
      const pdfBuffer = generateQAReport(reportData);
      const fileName = `qa-report-${tenantId}-${runId.substring(0, 8)}.pdf`;

      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    }
  } catch (error) {
    console.error('[QA PDF Export] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
