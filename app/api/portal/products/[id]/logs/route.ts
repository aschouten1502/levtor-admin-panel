import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/shared/auth/server';

/**
 * ========================================
 * PORTAL PRODUCT LOGS API
 * ========================================
 *
 * GET /api/portal/products/[id]/logs - List chat logs
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const authResult = await getAuthUser();
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

    // Verify product belongs to tenant
    const { data: product, error: productError } = await supabase
      .from('tenant_products')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', customer.tenant_id)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product niet gevonden' }, { status: 404 });
    }

    // Get logs
    const { data: logs, error: logsError, count } = await supabase
      .from('chat_logs')
      .select('id, question, answer, language, session_id, total_cost, response_time_ms, created_at', { count: 'exact' })
      .eq('tenant_id', customer.tenant_id)
      .eq('tenant_product_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (logsError) {
      console.error('❌ [Portal Logs API] Error:', logsError);
      return NextResponse.json({ error: 'Kon logs niet ophalen' }, { status: 500 });
    }

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('❌ [Portal Logs API] Error:', error);
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
  }
}
