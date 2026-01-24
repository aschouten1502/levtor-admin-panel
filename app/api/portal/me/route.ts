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

export async function GET(request: Request) {
  const startTime = Date.now();
  console.log(`🔍 [API /portal/me] ========== REQUEST START ==========`);
  console.log(`🔍 [API /portal/me] Timestamp: ${new Date().toISOString()}`);

  // Log request headers voor debug
  const cookieHeader = request.headers.get('cookie') || '';
  const authCookies = cookieHeader.split(';')
    .map(c => c.trim())
    .filter(c => c.includes('sb-') || c.includes('auth'));
  console.log(`🔍 [API /portal/me] Auth-related cookies in request: ${authCookies.length > 0 ? authCookies.map(c => c.split('=')[0]).join(', ') : 'NONE'}`);

  // Check specifiek voor customer storage key
  const hasCustomerCookie = cookieHeader.includes('sb-customer-auth');
  console.log(`🔍 [API /portal/me] Has sb-customer-auth cookie: ${hasCustomerCookie ? 'YES' : 'NO'}`);

  try {
    // Get authenticated user - use 'customer' context for session isolation
    const authStartTime = Date.now();
    console.log('🔍 [API /portal/me] Step 1: Calling getAuthUser("customer")...');
    const authResult = await getAuthUser('customer');
    const authDuration = Date.now() - authStartTime;

    console.log(`🔍 [API /portal/me] getAuthUser completed in ${authDuration}ms`);
    console.log('🔍 [API /portal/me] authResult.authenticated:', authResult.authenticated);
    console.log('🔍 [API /portal/me] authResult.user:', authResult.user ? authResult.user.email : 'null');
    console.log('🔍 [API /portal/me] authResult.error:', authResult.error || 'none');

    if (!authResult.user || !authResult.user.email) {
      const totalDuration = Date.now() - startTime;
      console.log(`❌ [API /portal/me] Not authenticated after ${totalDuration}ms, returning 401`);
      console.log(`❌ [API /portal/me] Reason: ${!authResult.user ? 'No user in auth result' : 'No email in user'}`);
      console.log(`❌ [API /portal/me] ========== REQUEST END (401) ==========`);
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      );
    }

    // Get customer user from database
    const dbStartTime = Date.now();
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

    const dbDuration = Date.now() - dbStartTime;
    console.log(`🔍 [API /portal/me] DB query completed in ${dbDuration}ms`);

    if (error || !customer) {
      const totalDuration = Date.now() - startTime;
      console.log('❌ [API /portal/me] Customer not found in customer_users');
      console.log('❌ [API /portal/me] Error:', error?.message || 'No customer record');
      console.log(`❌ [API /portal/me] ========== REQUEST END (403) after ${totalDuration}ms ==========`);
      return NextResponse.json(
        { error: 'Geen toegang tot klantenportaal' },
        { status: 403 }
      );
    }

    console.log('✅ [API /portal/me] Customer found:', customer.email);
    console.log('✅ [API /portal/me] Tenant:', customer.tenant_id);
    console.log('✅ [API /portal/me] is_active:', customer.is_active);

    if (!customer.is_active) {
      const totalDuration = Date.now() - startTime;
      console.log('❌ [API /portal/me] Customer is DEACTIVATED');
      console.log(`❌ [API /portal/me] ========== REQUEST END (403) after ${totalDuration}ms ==========`);
      return NextResponse.json(
        { error: 'Account is gedeactiveerd' },
        { status: 403 }
      );
    }

    const totalDuration = Date.now() - startTime;
    console.log(`✅ [API /portal/me] Returning customer data after ${totalDuration}ms`);
    console.log(`✅ [API /portal/me] Timing breakdown: auth=${Date.now() - startTime - dbDuration}ms, db=${dbDuration}ms`);
    console.log(`✅ [API /portal/me] ========== REQUEST END (200) ==========`);
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
    const totalDuration = Date.now() - startTime;
    console.error(`❌ [API /portal/me] Exception after ${totalDuration}ms:`, error);
    console.error('❌ [API /portal/me] ========== REQUEST END (500) ==========');
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    );
  }
}
