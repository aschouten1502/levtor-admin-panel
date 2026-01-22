/**
 * ========================================
 * RAG Upload API Route
 * ========================================
 *
 * POST /api/rag/upload
 * Upload een PDF document voor RAG indexering
 *
 * Request:
 * - Content-Type: multipart/form-data
 * - file: PDF bestand (required)
 * - tenant_id: Tenant identifier (optional, uses env default)
 * - tenant_product_id: Product identifier (optional, links doc to product)
 *
 * Response:
 * {
 *   success: boolean,
 *   documentId: string,
 *   chunksCreated: number,
 *   cost: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { processDocument } from '@/lib/rag/processor';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  console.log('\n📤 [Upload API] ========== UPLOAD REQUEST ==========');

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const tenantIdFromForm = formData.get('tenant_id') as string | null;
    const tenantProductId = formData.get('tenant_product_id') as string | null;

    // Use tenant_id from form or fallback to environment variable
    const tenantId = tenantIdFromForm || process.env.TENANT_ID;

    // Validation
    if (!file) {
      console.log('❌ [Upload API] No file provided');
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!tenantId) {
      console.log('❌ [Upload API] No tenant_id provided');
      return NextResponse.json(
        { success: false, error: 'tenant_id is required (provide in form or set TENANT_ID env var)' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      console.log('❌ [Upload API] Invalid file type:', file.type);
      return NextResponse.json(
        { success: false, error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.log('❌ [Upload API] File too large:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    console.log('📁 [Upload API] File:', file.name);
    console.log('📦 [Upload API] Size:', (file.size / 1024).toFixed(1), 'KB');
    console.log('🏢 [Upload API] Tenant:', tenantId);
    if (tenantProductId) console.log('📦 [Upload API] Product:', tenantProductId);

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process document
    const result = await processDocument(tenantId, file.name, buffer, undefined, tenantProductId || undefined);

    if (!result.success) {
      console.log('❌ [Upload API] Processing failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    console.log('✅ [Upload API] Upload successful');
    console.log('📄 [Upload API] Document ID:', result.documentId);
    console.log('📊 [Upload API] Chunks:', result.chunksCreated);
    console.log('💵 [Upload API] Cost: $' + result.totalCost.toFixed(4));

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      chunksCreated: result.chunksCreated,
      tokensUsed: result.totalTokens,
      cost: result.totalCost
    });

  } catch (error) {
    console.error('❌ [Upload API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      },
      { status: 500 }
    );
  }
}

// Increase body size limit for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
