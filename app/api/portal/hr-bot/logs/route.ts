import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/shared/auth/server';

/**
 * ========================================
 * PORTAL HR BOT LOGS API
 * ========================================
 *
 * GET /api/portal/hr-bot/logs
 * Returns chat logs for the customer's tenant.
 */

export async function GET(request: Request) {
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

    // Parse query params for pagination
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get chat logs for this tenant
    const { data: logs, error: logsError } = await supabase
      .from('chat_logs')
      .select('id, question, answer, language, total_cost, response_time_ms, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (logsError) {
      console.error('Error fetching logs:', logsError);
      return NextResponse.json(
        { error: 'Kon logs niet ophalen' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        limit,
        offset,
        hasMore: (logs?.length || 0) === limit,
      },
    });
  } catch (error) {
    console.error('❌ [Portal Logs API] Error:', error);
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    );
  }
}
