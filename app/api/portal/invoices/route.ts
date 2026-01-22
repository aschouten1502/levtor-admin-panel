import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/shared/auth/server';

/**
 * ========================================
 * PORTAL INVOICES API
 * ========================================
 *
 * GET /api/portal/invoices - List invoices for customer's tenant
 */

export async function GET() {
  try {
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

    // Get invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, filename, file_path, invoice_number, invoice_date, amount, description, is_paid_by_customer, customer_paid_at, is_verified_by_admin, admin_verified_at, created_at')
      .eq('tenant_id', customer.tenant_id)
      .order('invoice_date', { ascending: false });

    if (invoicesError) {
      console.error('❌ [Portal Invoices API] Error:', invoicesError);
      return NextResponse.json({ error: 'Kon facturen niet ophalen' }, { status: 500 });
    }

    return NextResponse.json({ invoices: invoices || [] });
  } catch (error) {
    console.error('❌ [Portal Invoices API] Error:', error);
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
  }
}
