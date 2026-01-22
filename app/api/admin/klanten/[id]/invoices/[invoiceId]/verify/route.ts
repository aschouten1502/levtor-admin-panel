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
 * ADMIN VERIFY INVOICE PAYMENT API
 * ========================================
 *
 * PATCH /api/admin/klanten/[id]/invoices/[invoiceId]/verify
 * Admin verifies that payment has been received
 */

interface RouteParams {
  params: Promise<{ id: string; invoiceId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id: tenantId, invoiceId } = await params;
    const supabase = getSupabase();

    // Optional: parse notes from request body
    let notes: string | null = null;
    try {
      const body = await request.json();
      notes = body.notes || null;
    } catch {
      // No body or invalid JSON - that's fine, notes is optional
    }

    // Get invoice and verify it belongs to this tenant
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, tenant_id, is_paid_by_customer, is_verified_by_admin')
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Factuur niet gevonden' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (invoice.is_verified_by_admin) {
      return NextResponse.json(
        { error: 'Factuur is al geverifieerd' },
        { status: 400 }
      );
    }

    // Verify the payment
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        is_verified_by_admin: true,
        admin_verified_at: new Date().toISOString(),
        admin_notes: notes,
      })
      .eq('id', invoiceId)
      .select('id, is_paid_by_customer, customer_paid_at, is_verified_by_admin, admin_verified_at, admin_notes')
      .single();

    if (updateError) {
      console.error('❌ [Admin Verify API] Error:', updateError);
      return NextResponse.json(
        { error: 'Kon factuur niet bijwerken' },
        { status: 500 }
      );
    }

    console.log(`✅ [Admin Verify API] Invoice ${invoiceId} verified by admin`);

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('❌ [Admin Verify API] Error:', error);
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    );
  }
}
