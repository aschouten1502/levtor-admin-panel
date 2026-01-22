import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/shared/auth/server';

/**
 * ========================================
 * PORTAL HR BOT STATS API
 * ========================================
 *
 * GET /api/portal/hr-bot/stats
 * Returns stats for the customer's tenant.
 */

export async function GET() {
  try {
    // Get authenticated user
    const authResult = await getAuthUser();

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

    // Get customer to find tenant_id
    const { data: customer, error: customerError } = await supabase
      .from('customer_users')
      .select('tenant_id')
      .eq('email', authResult.user.email)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Geen toegang' },
        { status: 403 }
      );
    }

    const tenantId = customer.tenant_id;

    // Get document count
    const { count: documentCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    // Get chat count and total cost
    const { data: chatStats } = await supabase
      .from('chat_logs')
      .select('total_cost, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    const chatCount = chatStats?.length || 0;
    const totalCost = chatStats?.reduce((sum, log) => sum + (log.total_cost || 0), 0) || 0;
    const lastChatAt = chatStats?.[0]?.created_at || null;

    return NextResponse.json({
      documentCount: documentCount || 0,
      chatCount,
      totalCost,
      lastChatAt,
    });
  } catch (error) {
    console.error('❌ [Portal Stats API] Error:', error);
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    );
  }
}
