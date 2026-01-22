import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/shared/auth/server';

/**
 * ========================================
 * PORTAL PRODUCT DETAIL API
 * ========================================
 *
 * GET /api/portal/products/[id]
 * Returns detailed product info with stats.
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get authenticated user - use 'customer' context for session isolation
    const authResult = await getAuthUser('customer');

    if (!authResult.user || !authResult.user.email) {
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get customer user
    const { data: customer, error: customerError } = await supabase
      .from('customer_users')
      .select('tenant_id, is_active')
      .eq('email', authResult.user.email)
      .single();

    if (customerError || !customer) {
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

    // Get product (verify it belongs to customer's tenant)
    const { data: product, error: productError } = await supabase
      .from('tenant_products')
      .select(`
        id,
        product_id,
        name,
        config,
        is_active,
        created_at,
        products:product_id (
          id,
          name,
          description,
          icon
        )
      `)
      .eq('id', id)
      .eq('tenant_id', customer.tenant_id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product niet gevonden' },
        { status: 404 }
      );
    }

    // Get document count
    const { count: documentsCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', customer.tenant_id)
      .eq('tenant_product_id', product.id);

    // Get chat stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: chatsLast30Days } = await supabase
      .from('chat_logs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', customer.tenant_id)
      .eq('tenant_product_id', product.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const { count: chatsTotal } = await supabase
      .from('chat_logs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', customer.tenant_id)
      .eq('tenant_product_id', product.id);

    // Get total cost this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: costData } = await supabase
      .from('chat_logs')
      .select('total_cost')
      .eq('tenant_id', customer.tenant_id)
      .eq('tenant_product_id', product.id)
      .gte('created_at', startOfMonth.toISOString());

    const totalCostThisMonth = (costData || []).reduce(
      (sum, log) => sum + (log.total_cost || 0),
      0
    );

    // Get tenant info for embed URL
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', customer.tenant_id)
      .single();

    return NextResponse.json({
      product: {
        ...product,
        stats: {
          documents_count: documentsCount || 0,
          chats_last_30_days: chatsLast30Days || 0,
          chats_total: chatsTotal || 0,
          cost_this_month: totalCostThisMonth,
        },
        tenant: tenant,
      },
    });
  } catch (error) {
    console.error('❌ [Portal Product API] Error:', error);
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    );
  }
}
