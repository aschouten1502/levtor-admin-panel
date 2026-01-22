import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/shared/auth/server';

/**
 * GET /api/portal/products/[id]/documents/[docId]/download
 *
 * Download/view a document from Supabase Storage
 */

interface RouteParams {
  params: Promise<{ id: string; docId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: productId, docId } = await params;

    // Check authentication - use 'customer' context for session isolation
    const authResult = await getAuthUser('customer');
    if (!authResult.user?.email) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get customer
    const { data: customer, error: customerError } = await supabase
      .from('customer_users')
      .select('tenant_id, is_active')
      .eq('email', authResult.user.email)
      .single();

    if (customerError || !customer || !customer.is_active) {
      return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
    }

    // Get document and verify access
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, filename, file_path, mime_type')
      .eq('id', docId)
      .eq('tenant_id', customer.tenant_id)
      .eq('tenant_product_id', productId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document niet gevonden' }, { status: 404 });
    }

    if (!document.file_path) {
      return NextResponse.json({ error: 'Document heeft geen bestand' }, { status: 404 });
    }

    // Get signed URL from storage (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.file_path, 3600);

    if (urlError || !signedUrlData?.signedUrl) {
      console.error('❌ [Download] Error creating signed URL:', urlError);
      return NextResponse.json({ error: 'Kon download URL niet genereren' }, { status: 500 });
    }

    // Redirect to the signed URL
    return NextResponse.redirect(signedUrlData.signedUrl);
  } catch (error) {
    console.error('❌ [Download] Error:', error);
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
  }
}
