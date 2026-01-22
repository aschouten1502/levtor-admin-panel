import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * ========================================
 * ADMIN KLANT DETAIL API
 * ========================================
 *
 * GET    /api/admin/klanten/[id] - Haal klant details
 * PUT    /api/admin/klanten/[id] - Update klant
 * DELETE /api/admin/klanten/[id] - Verwijder klant
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Haal klant details met producten, users, en invoices
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    // Haal tenant op
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Klant niet gevonden' },
        { status: 404 }
      );
    }

    // Haal producten op
    const { data: products } = await supabase
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
      .eq('tenant_id', id);

    // Haal portal users op
    const { data: users } = await supabase
      .from('customer_users')
      .select('id, email, name, role, is_active, created_at')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false });

    // Haal invoices op
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, filename, file_path, invoice_number, invoice_date, amount, description, is_paid_by_customer, customer_paid_at, is_verified_by_admin, admin_verified_at, created_at')
      .eq('tenant_id', id)
      .order('invoice_date', { ascending: false });

    // Haal documenten count op
    const { count: documentsCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', id);

    // Haal chat logs count op
    const { count: chatLogsCount } = await supabase
      .from('chat_logs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', id);

    return NextResponse.json({
      klant: {
        ...tenant,
        products: products || [],
        users: users || [],
        invoices: invoices || [],
        stats: {
          documents_count: documentsCount || 0,
          chat_logs_count: chatLogsCount || 0,
          users_count: users?.length || 0,
          invoices_count: invoices?.length || 0,
        },
      },
    });
  } catch (error) {
    console.error('❌ [Klant API] GET error:', error);
    return NextResponse.json(
      { error: 'Kon klant niet ophalen' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update klant
 *
 * Body: {
 *   name?: string,
 *   is_active?: boolean,
 *   products?: string[] // Product IDs to assign
 * }
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabase();

    // Check of klant bestaat
    const { data: existing, error: existingError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: 'Klant niet gevonden' },
        { status: 404 }
      );
    }

    // Update tenant basics
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('❌ [Klant API] Error updating tenant:', updateError);
        return NextResponse.json(
          { error: 'Kon klant niet updaten' },
          { status: 500 }
        );
      }
    }

    // Update products if specified
    if (body.products && Array.isArray(body.products)) {
      // Get current products
      const { data: currentProducts } = await supabase
        .from('tenant_products')
        .select('product_id')
        .eq('tenant_id', id);

      const currentProductIds = (currentProducts || []).map((p) => p.product_id);
      const newProductIds = body.products as string[];

      // Add new products
      for (const productId of newProductIds) {
        if (!currentProductIds.includes(productId)) {
          await supabase.from('tenant_products').insert({
            tenant_id: id,
            product_id: productId,
            name: `${body.name || existing.id} ${productId === 'hr_bot' ? 'HR Bot' : productId}`,
            is_active: true,
          });
        }
      }

      // Deactivate removed products (don't delete, for data preservation)
      for (const productId of currentProductIds) {
        if (!newProductIds.includes(productId)) {
          await supabase
            .from('tenant_products')
            .update({ is_active: false })
            .eq('tenant_id', id)
            .eq('product_id', productId);
        }
      }

      // Reactivate previously deactivated products
      for (const productId of newProductIds) {
        if (currentProductIds.includes(productId)) {
          await supabase
            .from('tenant_products')
            .update({ is_active: true })
            .eq('tenant_id', id)
            .eq('product_id', productId);
        }
      }
    }

    // Fetch updated klant
    const { data: updatedTenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json({ klant: updatedTenant });
  } catch (error) {
    console.error('❌ [Klant API] PUT error:', error);
    return NextResponse.json(
      { error: 'Kon klant niet updaten' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Verwijder klant
 *
 * WARNING: This will cascade delete all related data!
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    // Check of klant bestaat
    const { data: existing, error: existingError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: 'Klant niet gevonden' },
        { status: 404 }
      );
    }

    // Delete tenant (cascade will handle related data)
    const { error: deleteError } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ [Klant API] Error deleting tenant:', deleteError);
      return NextResponse.json(
        { error: 'Kon klant niet verwijderen' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Klant "${existing.name}" is verwijderd`,
    });
  } catch (error) {
    console.error('❌ [Klant API] DELETE error:', error);
    return NextResponse.json(
      { error: 'Kon klant niet verwijderen' },
      { status: 500 }
    );
  }
}
