/**
 * ========================================
 * RAG Reprocess API Route
 * ========================================
 *
 * POST /api/rag/reprocess
 * Herverwerkt documenten met de nieuwste chunking logica
 *
 * Body:
 * {
 *   tenant_id: string,
 *   document_id?: string  // Optioneel: specifiek document, anders alle
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   processed: number,
 *   results: Array<{ documentId, filename, success, error?, chunksCreated }>
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { listDocuments, reprocessDocument, getDocument } from '@/lib/rag/processor';
import { getDocumentsBucket } from '@/lib/admin/storage-service';

// ========================================
// SUPABASE CLIENT
// ========================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(url, key);
}

// ========================================
// POST - Reprocess Documents
// ========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, document_id } = body;

    // Validate tenant_id
    const tenantId = tenant_id || process.env.TENANT_ID;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenant_id is required' },
        { status: 400 }
      );
    }

    console.log('\n🔄 [Reprocess API] ========== REPROCESSING DOCUMENTS ==========');
    console.log('🏢 [Reprocess API] Tenant:', tenantId);

    const supabase = getSupabaseClient();
    const bucketName = getDocumentsBucket(tenantId);

    // Get documents to process
    let documentsToProcess;
    if (document_id) {
      const doc = await getDocument(tenantId, document_id);
      if (!doc) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }
      documentsToProcess = [doc];
    } else {
      documentsToProcess = await listDocuments(tenantId);
    }

    console.log(`📄 [Reprocess API] Documents to process: ${documentsToProcess.length}`);

    const results: Array<{
      documentId: string;
      filename: string;
      success: boolean;
      error?: string;
      chunksCreated?: number;
      totalCost?: number;
    }> = [];

    // Process each document
    for (const doc of documentsToProcess) {
      console.log(`\n📄 [Reprocess API] Processing: ${doc.filename}`);

      try {
        // Check if we have a file_path to fetch from storage
        if (!doc.file_path) {
          console.warn(`⚠️ [Reprocess API] No file_path for document ${doc.id}, skipping`);
          results.push({
            documentId: doc.id,
            filename: doc.filename,
            success: false,
            error: 'No file_path stored - document needs to be re-uploaded'
          });
          continue;
        }

        // Fetch PDF from Supabase Storage
        console.log(`📥 [Reprocess API] Fetching from storage: ${bucketName}/${doc.file_path}`);
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(bucketName)
          .download(doc.file_path);

        if (downloadError || !fileData) {
          console.error(`❌ [Reprocess API] Download failed:`, downloadError);
          results.push({
            documentId: doc.id,
            filename: doc.filename,
            success: false,
            error: `Download failed: ${downloadError?.message || 'No data'}`
          });
          continue;
        }

        // Convert Blob to Buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        console.log(`📦 [Reprocess API] Downloaded ${(fileBuffer.length / 1024).toFixed(1)} KB`);

        // Reprocess the document
        const result = await reprocessDocument(tenantId, doc.id, fileBuffer);

        results.push({
          documentId: doc.id,
          filename: doc.filename,
          success: result.success,
          error: result.error,
          chunksCreated: result.chunksCreated,
          totalCost: result.totalCost
        });

        if (result.success) {
          console.log(`✅ [Reprocess API] Success: ${result.chunksCreated} chunks, $${result.totalCost?.toFixed(4)}`);
        } else {
          console.error(`❌ [Reprocess API] Failed: ${result.error}`);
        }

      } catch (docError) {
        const errorMessage = docError instanceof Error ? docError.message : 'Unknown error';
        console.error(`❌ [Reprocess API] Error processing ${doc.filename}:`, errorMessage);
        results.push({
          documentId: doc.id,
          filename: doc.filename,
          success: false,
          error: errorMessage
        });
      }
    }

    // Summary
    const successCount = results.filter(r => r.success).length;
    const totalChunks = results.reduce((sum, r) => sum + (r.chunksCreated || 0), 0);
    const totalCost = results.reduce((sum, r) => sum + (r.totalCost || 0), 0);

    console.log('\n📊 [Reprocess API] ========== SUMMARY ==========');
    console.log(`✅ Successful: ${successCount}/${results.length}`);
    console.log(`📦 Total chunks: ${totalChunks}`);
    console.log(`💵 Total cost: $${totalCost.toFixed(4)}`);

    return NextResponse.json({
      success: successCount === results.length,
      processed: results.length,
      successCount,
      totalChunks,
      totalCost,
      results
    });

  } catch (error) {
    console.error('❌ [Reprocess API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
