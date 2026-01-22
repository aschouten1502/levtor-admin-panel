import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/shared/auth/server';

/**
 * ========================================
 * PORTAL PRODUCT DOCUMENTS API
 * ========================================
 *
 * GET    /api/portal/products/[id]/documents - List documents
 * DELETE /api/portal/products/[id]/documents?doc_id=xxx - Delete document
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function verifyProductAccess(email: string, productId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get customer
  const { data: customer, error: customerError } = await supabase
    .from('customer_users')
    .select('tenant_id, is_active')
    .eq('email', email)
    .single();

  if (customerError || !customer || !customer.is_active) {
    return { error: 'Geen toegang', status: 403 };
  }

  // Verify product belongs to tenant
  const { data: product, error: productError } = await supabase
    .from('tenant_products')
    .select('id, tenant_id')
    .eq('id', productId)
    .eq('tenant_id', customer.tenant_id)
    .single();

  if (productError || !product) {
    return { error: 'Product niet gevonden', status: 404 };
  }

  return { customer, product, supabase };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authResult = await getAuthUser();
    if (!authResult.user?.email) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
    }

    const access = await verifyProductAccess(authResult.user.email, id);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { customer, supabase } = access;

    // Get documents for this product
    // Note: columns are filename, processing_status, total_chunks (not file_name, status, chunk_count)
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, filename, file_size, processing_status, total_chunks, created_at, updated_at')
      .eq('tenant_id', customer.tenant_id)
      .eq('tenant_product_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [Portal Documents API] Error:', error);
      return NextResponse.json({ error: 'Kon documenten niet ophalen' }, { status: 500 });
    }

    return NextResponse.json({ documents: documents || [] });
  } catch (error) {
    console.error('❌ [Portal Documents API] Error:', error);
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('doc_id');

    if (!docId) {
      return NextResponse.json({ error: 'Document ID is verplicht' }, { status: 400 });
    }

    const authResult = await getAuthUser();
    if (!authResult.user?.email) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
    }

    const access = await verifyProductAccess(authResult.user.email, id);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { customer, supabase } = access;

    // Verify document belongs to this product
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_path')
      .eq('id', docId)
      .eq('tenant_id', customer.tenant_id)
      .eq('tenant_product_id', id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document niet gevonden' }, { status: 404 });
    }

    // Delete chunks first
    await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', docId);

    // Delete document record
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', docId);

    if (deleteError) {
      console.error('❌ [Portal Documents API] Delete error:', deleteError);
      return NextResponse.json({ error: 'Kon document niet verwijderen' }, { status: 500 });
    }

    // Try to delete from storage (ignore errors)
    if (document.file_path) {
      await supabase.storage
        .from('documents')
        .remove([document.file_path]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [Portal Documents API] Error:', error);
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
  }
}
