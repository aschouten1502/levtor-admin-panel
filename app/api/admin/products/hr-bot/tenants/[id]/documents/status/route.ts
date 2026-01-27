import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTenantById } from '@/lib/admin/tenant-service';

/**
 * Processing status response per document
 */
interface DocumentProcessingStatus {
  documentId: string;
  filename: string;
  phase: 'uploading' | 'parsing' | 'chunking' | 'embedding' | 'metadata' | 'completed' | 'failed';
  chunksCreated?: number;
  totalPages?: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * GET /api/admin/products/hr-bot/tenants/[id]/documents/status
 * Get detailed processing status for all documents of a tenant
 * Used for polling during document processing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify tenant exists
    const tenant = await getTenantById(id);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get processing logs for this tenant
    // Join with documents to get the document_id
    const { data: logs, error } = await supabase
      .from('document_processing_logs')
      .select(`
        id,
        document_id,
        filename,
        processing_status,
        chunks_created,
        total_pages,
        error_message,
        started_at,
        completed_at
      `)
      .eq('tenant_id', id)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('❌ [API] Error fetching processing logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch processing status' },
        { status: 500 }
      );
    }

    // Also get documents that might be processing but don't have logs yet
    const { data: documents } = await supabase
      .from('documents')
      .select('id, filename, processing_status')
      .eq('tenant_id', id)
      .in('processing_status', ['pending', 'processing']);

    // Build status map - use logs for detailed phase, documents as fallback
    const statusMap: Record<string, DocumentProcessingStatus> = {};

    // Add logs (most detailed info)
    if (logs) {
      for (const log of logs) {
        // Only include if we have a document_id and it's not already completed
        if (log.document_id) {
          statusMap[log.document_id] = {
            documentId: log.document_id,
            filename: log.filename,
            phase: log.processing_status as DocumentProcessingStatus['phase'],
            chunksCreated: log.chunks_created || undefined,
            totalPages: log.total_pages || undefined,
            errorMessage: log.error_message || undefined,
            startedAt: log.started_at || undefined,
            completedAt: log.completed_at || undefined,
          };
        }
      }
    }

    // Add documents without logs (fallback)
    if (documents) {
      for (const doc of documents) {
        if (!statusMap[doc.id]) {
          statusMap[doc.id] = {
            documentId: doc.id,
            filename: doc.filename,
            phase: doc.processing_status === 'pending' ? 'uploading' : 'parsing',
          };
        }
      }
    }

    // Return only documents that are still processing
    const processingDocs = Object.values(statusMap).filter(
      status => !['completed', 'failed'].includes(status.phase)
    );

    return NextResponse.json({
      processingDocuments: processingDocs,
      hasProcessing: processingDocs.length > 0,
    });
  } catch (error) {
    console.error('❌ [API] Error in status endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch processing status' },
      { status: 500 }
    );
  }
}
