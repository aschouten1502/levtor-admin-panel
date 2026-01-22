import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * ========================================
 * INVOICE FILE STORAGE API
 * ========================================
 *
 * GET /api/storage/invoices/[...path] - Serve invoice PDF
 *
 * This proxies requests to Supabase Storage with proper authentication.
 */

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { path } = await params;
    const filePath = path.join('/');

    if (!filePath) {
      return NextResponse.json(
        { error: 'No file path provided' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Download file from storage
    const { data, error } = await supabase.storage
      .from('invoices')
      .download(filePath);

    if (error) {
      console.error('❌ [Storage API] Error downloading file:', error);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Get file metadata
    const { data: metadata } = await supabase.storage
      .from('invoices')
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop(),
      });

    const fileName = filePath.split('/').pop() || 'invoice.pdf';

    // Return file with proper headers
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('❌ [Storage API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
