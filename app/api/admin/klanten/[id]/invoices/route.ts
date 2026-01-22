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
 * ADMIN KLANT INVOICES API
 * ========================================
 *
 * GET    /api/admin/klanten/[id]/invoices - Lijst facturen
 * POST   /api/admin/klanten/[id]/invoices - Upload factuur
 * DELETE /api/admin/klanten/[id]/invoices?invoice_id=xxx - Verwijder factuur
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Lijst alle facturen voor een klant
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', id)
      .order('invoice_date', { ascending: false });

    if (error) {
      console.error('❌ [Invoices API] Error fetching invoices:', error);
      return NextResponse.json(
        { error: 'Kon facturen niet ophalen' },
        { status: 500 }
      );
    }

    return NextResponse.json({ invoices: invoices || [] });
  } catch (error) {
    console.error('❌ [Invoices API] GET error:', error);
    return NextResponse.json(
      { error: 'Kon facturen niet ophalen' },
      { status: 500 }
    );
  }
}

/**
 * POST - Upload een factuur
 *
 * FormData:
 * - file: PDF bestand
 * - invoice_number?: string
 * - invoice_date?: string (YYYY-MM-DD)
 * - amount?: string (number as string)
 * - description?: string
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    // Check of klant bestaat
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Klant niet gevonden' },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const invoiceNumber = formData.get('invoice_number') as string | null;
    const invoiceDateStr = formData.get('invoice_date') as string | null;
    const amountStr = formData.get('amount') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Geen bestand geupload' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Alleen PDF bestanden zijn toegestaan' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${id}/${timestamp}_${sanitizedFilename}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ [Invoices API] Upload error:', uploadError);

      // Check if bucket doesn't exist
      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json(
          { error: 'Storage bucket "invoices" niet gevonden. Maak deze aan in Supabase.' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: 'Kon bestand niet uploaden' },
        { status: 500 }
      );
    }

    // Parse optional fields
    const invoiceDate = invoiceDateStr || null;
    const amount = amountStr ? parseFloat(amountStr) : null;

    // Create invoice record
    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        tenant_id: id,
        filename: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        invoice_number: invoiceNumber || null,
        invoice_date: invoiceDate,
        amount: amount,
        description: description || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ [Invoices API] Insert error:', insertError);

      // Cleanup uploaded file on error
      await supabase.storage.from('invoices').remove([storagePath]);

      return NextResponse.json(
        { error: 'Kon factuur niet opslaan' },
        { status: 500 }
      );
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error('❌ [Invoices API] POST error:', error);
    return NextResponse.json(
      { error: 'Kon factuur niet uploaden' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Verwijder een factuur
 *
 * Query params:
 * - invoice_id: UUID van de factuur
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoice_id');

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'invoice_id is verplicht' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Get invoice to find file path
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, file_path, tenant_id')
      .eq('id', invoiceId)
      .eq('tenant_id', id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: 'Factuur niet gevonden' },
        { status: 404 }
      );
    }

    // Delete from storage
    if (invoice.file_path) {
      const { error: storageError } = await supabase.storage
        .from('invoices')
        .remove([invoice.file_path]);

      if (storageError) {
        console.warn('⚠️ [Invoices API] Could not delete file from storage:', storageError);
        // Continue anyway - record deletion is more important
      }
    }

    // Delete record
    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (deleteError) {
      console.error('❌ [Invoices API] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Kon factuur niet verwijderen' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [Invoices API] DELETE error:', error);
    return NextResponse.json(
      { error: 'Kon factuur niet verwijderen' },
      { status: 500 }
    );
  }
}
