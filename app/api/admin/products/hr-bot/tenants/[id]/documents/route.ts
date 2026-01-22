import { NextRequest, NextResponse } from 'next/server';
import { getTenantById } from '@/lib/admin/tenant-service';
import { uploadDocument, deleteDocument } from '@/lib/admin/storage-service';
import { processDocument, listDocuments, deleteDocument as deleteDocumentFromDB } from '@/lib/rag/processor';

/**
 * GET /api/admin/tenants/[id]/documents
 * List all documents for a tenant
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

    const documents = await listDocuments(id);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('❌ [API] Error listing documents:', error);
    return NextResponse.json(
      { error: 'Failed to list documents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tenants/[id]/documents
 * Upload and process a new document
 */
export async function POST(
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    console.log(`📄 [API] Processing document: ${file.name} for tenant: ${id}`);

    // Upload to storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await uploadDocument(id, buffer, file.name, file.type);

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error },
        { status: 400 }
      );
    }

    // Process document (extract text, chunk, embed)
    const processResult = await processDocument(
      id,
      file.name,
      buffer,
      uploadResult.path
    );

    if (!processResult.success) {
      // Clean up storage on processing failure
      if (uploadResult.path) {
        await deleteDocument(id, uploadResult.path);
      }

      return NextResponse.json(
        { error: processResult.error || 'Document processing failed' },
        { status: 400 }
      );
    }

    console.log(`✅ [API] Document processed: ${file.name}`);
    console.log(`   Chunks: ${processResult.chunksCreated}, Tokens: ${processResult.totalTokens}`);

    return NextResponse.json({
      success: true,
      documentId: processResult.documentId,
      filename: file.name,
      chunksCreated: processResult.chunksCreated,
      totalTokens: processResult.totalTokens,
      processingCost: processResult.totalCost,
      storageUrl: uploadResult.publicUrl,
    }, { status: 201 });
  } catch (error) {
    console.error('❌ [API] Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tenants/[id]/documents?documentId=xxx
 * Delete a document and its chunks
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const tenant = await getTenantById(id);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Delete from database (includes chunks via CASCADE)
    const deleted = await deleteDocumentFromDB(id, documentId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 400 }
      );
    }

    console.log(`🗑️  [API] Document deleted: ${documentId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [API] Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
