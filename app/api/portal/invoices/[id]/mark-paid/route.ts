import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/shared/auth/server';

/**
 * ========================================
 * PORTAL INVOICE MARK-PAID API
 * ========================================
 *
 * PATCH /api/portal/invoices/[id]/mark-paid - Customer marks invoice as paid
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id: invoiceId } = await params;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is verplicht' }, { status: 400 });
    }

    // Use 'customer' context for session isolation
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

    // Verify invoice belongs to customer's tenant
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, tenant_id, is_paid_by_customer, is_verified_by_admin')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Factuur niet gevonden' }, { status: 404 });
    }

    if (invoice.tenant_id !== customer.tenant_id) {
      return NextResponse.json({ error: 'Geen toegang tot deze factuur' }, { status: 403 });
    }

    // Check if already marked as paid
    if (invoice.is_paid_by_customer) {
      return NextResponse.json({ error: 'Factuur is al gemarkeerd als betaald' }, { status: 400 });
    }

    // Mark as paid
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        is_paid_by_customer: true,
        customer_paid_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select('id, is_paid_by_customer, customer_paid_at')
      .single();

    if (updateError) {
      console.error('❌ [Portal Mark-Paid API] Error:', updateError);
      return NextResponse.json({ error: 'Kon factuur niet bijwerken' }, { status: 500 });
    }

    console.log(`✅ [Portal Mark-Paid API] Invoice ${invoiceId} marked as paid by customer`);

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('❌ [Portal Mark-Paid API] Error:', error);
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
  }
}
