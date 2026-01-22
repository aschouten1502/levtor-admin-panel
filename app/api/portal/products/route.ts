import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/shared/auth/server';

/**
 * ========================================
 * PORTAL PRODUCTS API
 * ========================================
 *
 * GET /api/portal/products
 * Returns products for the current customer's tenant.
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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get customer user with tenant
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

    // Get tenant products with product details
    const { data: products, error: productsError } = await supabase
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
      .eq('tenant_id', customer.tenant_id)
      .eq('is_active', true);

    if (productsError) {
      console.error('❌ [Portal Products API] Error fetching products:', productsError);
      return NextResponse.json(
        { error: 'Kon producten niet ophalen' },
        { status: 500 }
      );
    }

    // Get stats for each product
    const productsWithStats = await Promise.all(
      (products || []).map(async (product) => {
        // Get document count
        const { count: documentsCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', customer.tenant_id)
          .eq('tenant_product_id', product.id);

        // Get chat logs count (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: chatsCount } = await supabase
          .from('chat_logs')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', customer.tenant_id)
          .eq('tenant_product_id', product.id)
          .gte('created_at', thirtyDaysAgo.toISOString());

        return {
          ...product,
          stats: {
            documents_count: documentsCount || 0,
            chats_last_30_days: chatsCount || 0,
          },
        };
      })
    );

    return NextResponse.json({
      products: productsWithStats,
    });
  } catch (error) {
    console.error('❌ [Portal Products API] Error:', error);
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    );
  }
}
