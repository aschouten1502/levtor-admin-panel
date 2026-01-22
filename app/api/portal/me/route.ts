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
  try {
    // Get authenticated user - use 'customer' context for session isolation
    const authResult = await getAuthUser('customer');

    if (!authResult.user || !authResult.user.email) {
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      );
    }

    // Get customer user from database
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
      return NextResponse.json(
        { error: 'Geen toegang tot klantenportaal' },
        { status: 403 }
      );
    }

    if (!customer.is_active) {
      return NextResponse.json(
        { error: 'Account is gedeactiveerd' },
        { status: 403 }
      );
    }

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
