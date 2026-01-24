import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/shared/auth/server';

/**
 * ========================================
 * PORTAL ME API
 * ========================================
 *
 * GET /api/portal/me
 * Returns current customer user info including tenant_id.
 */

export async function GET() {
  console.log('🔍 [API /portal/me] Request received');

  try {
    // Get authenticated user - use 'customer' context for session isolation
    console.log('🔍 [API /portal/me] Calling getAuthUser("customer")...');
    const authResult = await getAuthUser('customer');
    console.log('🔍 [API /portal/me] authResult.authenticated:', authResult.authenticated);
    console.log('🔍 [API /portal/me] authResult.user:', authResult.user ? authResult.user.email : 'null');
    console.log('🔍 [API /portal/me] authResult.error:', authResult.error || 'none');

    if (!authResult.user || !authResult.user.email) {
      console.log('❌ [API /portal/me] Not authenticated, returning 401');
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      );
    }

    // Get customer user from database
    console.log('🔍 [API /portal/me] Step 2: Querying customer_users for:', authResult.user.email);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: customer, error } = await supabase
      .from('customer_users')
      .select('*')
      .eq('email', authResult.user.email)
      .single();

    if (error || !customer) {
      console.log('❌ [API /portal/me] Customer not found in customer_users');
      console.log('❌ [API /portal/me] Error:', error?.message || 'No customer record');
      return NextResponse.json(
        { error: 'Geen toegang tot klantenportaal' },
        { status: 403 }
      );
    }

    console.log('✅ [API /portal/me] Customer found:', customer.email);
    console.log('✅ [API /portal/me] Tenant:', customer.tenant_id);
    console.log('✅ [API /portal/me] is_active:', customer.is_active);

    if (!customer.is_active) {
      console.log('❌ [API /portal/me] Customer is DEACTIVATED');
      return NextResponse.json(
        { error: 'Account is gedeactiveerd' },
        { status: 403 }
      );
    }

    console.log('✅ [API /portal/me] Returning customer data');
    return NextResponse.json({
      customer: {
        id: customer.id,
        tenant_id: customer.tenant_id,
        email: customer.email,
        name: customer.name,
        role: customer.role,
        is_active: customer.is_active,
      },
    });
  } catch (error) {
    console.error('❌ [Portal ME API] Error:', error);
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    );
  }
}
