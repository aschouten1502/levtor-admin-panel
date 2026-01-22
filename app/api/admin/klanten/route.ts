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
 * ADMIN KLANTEN API
 * ========================================
 *
 * GET  /api/admin/klanten - Lijst alle klanten met producten en stats
 * POST /api/admin/klanten - Maak nieuwe klant
 */

export interface KlantWithStats {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  products: {
    id: string;
    product_id: string;
    name: string | null;
    is_active: boolean;
  }[];
  portal_users_count: number;
  invoices_count: number;
  documents_count: number;
}

/**
 * GET - Lijst alle klanten met producten en stats
 */
export async function GET() {
  try {
    const supabase = getSupabase();

    // Haal alle tenants op
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, is_active, created_at')
      .order('name');

    if (tenantsError) {
      console.error('❌ [Klanten API] Error fetching tenants:', tenantsError);
      return NextResponse.json(
        { error: 'Kon klanten niet ophalen' },
        { status: 500 }
      );
    }

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({
        klanten: [],
        count: 0,
      });
    }

    // Haal alle tenant_products op
    const { data: products, error: productsError } = await supabase
      .from('tenant_products')
      .select('id, tenant_id, product_id, name, is_active');

    if (productsError) {
      console.error('❌ [Klanten API] Error fetching products:', productsError);
    }

    // Haal customer_users counts op
    const { data: userCounts, error: usersError } = await supabase
      .from('customer_users')
      .select('tenant_id');

    if (usersError) {
      console.error('❌ [Klanten API] Error fetching users:', usersError);
    }

    // Haal invoices counts op
    const { data: invoiceCounts, error: invoicesError } = await supabase
      .from('invoices')
      .select('tenant_id');

    if (invoicesError) {
      console.error('❌ [Klanten API] Error fetching invoices:', invoicesError);
    }

    // Haal documents counts op
    const { data: documentCounts, error: documentsError } = await supabase
      .from('documents')
      .select('tenant_id');

    if (documentsError) {
      console.error('❌ [Klanten API] Error fetching documents:', documentsError);
    }

    // Count per tenant
    const userCountByTenant = (userCounts || []).reduce((acc, u) => {
      acc[u.tenant_id] = (acc[u.tenant_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const invoiceCountByTenant = (invoiceCounts || []).reduce((acc, i) => {
      acc[i.tenant_id] = (acc[i.tenant_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const documentCountByTenant = (documentCounts || []).reduce((acc, d) => {
      acc[d.tenant_id] = (acc[d.tenant_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Combineer data
    const klanten: KlantWithStats[] = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      is_active: tenant.is_active,
      created_at: tenant.created_at,
      products: (products || [])
        .filter((p) => p.tenant_id === tenant.id)
        .map((p) => ({
          id: p.id,
          product_id: p.product_id,
          name: p.name,
          is_active: p.is_active,
        })),
      portal_users_count: userCountByTenant[tenant.id] || 0,
      invoices_count: invoiceCountByTenant[tenant.id] || 0,
      documents_count: documentCountByTenant[tenant.id] || 0,
    }));

    return NextResponse.json({
      klanten,
      count: klanten.length,
    });
  } catch (error) {
    console.error('❌ [Klanten API] GET error:', error);
    return NextResponse.json(
      { error: 'Kon klanten niet ophalen' },
      { status: 500 }
    );
  }
}

/**
 * POST - Maak nieuwe klant
 *
 * Body: {
 *   id: string,         // Unique identifier (slug)
 *   name: string,       // Display name
 *   products?: string[] // Product IDs to assign (default: ['hr_bot'])
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validatie
    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json(
        { error: 'ID is verplicht (bijv. "acme-corp")' },
        { status: 400 }
      );
    }

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Naam is verplicht' },
        { status: 400 }
      );
    }

    // Normalize ID (lowercase, no spaces)
    const tenantId = body.id.toLowerCase().trim().replace(/\s+/g, '-');

    // Validate ID format
    if (!/^[a-z0-9-]+$/.test(tenantId)) {
      return NextResponse.json(
        { error: 'ID mag alleen letters, cijfers en koppeltekens bevatten' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Check of ID al bestaat
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Een klant met dit ID bestaat al' },
        { status: 400 }
      );
    }

    // Maak tenant aan
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        id: tenantId,
        name: body.name.trim(),
        is_active: true,
      })
      .select()
      .single();

    if (tenantError) {
      console.error('❌ [Klanten API] Error creating tenant:', tenantError);
      return NextResponse.json(
        { error: 'Kon klant niet aanmaken' },
        { status: 500 }
      );
    }

    // Wijs producten toe (default: hr_bot)
    const productIds = body.products || ['hr_bot'];

    for (const productId of productIds) {
      const { error: productError } = await supabase
        .from('tenant_products')
        .insert({
          tenant_id: tenantId,
          product_id: productId,
          name: `${body.name.trim()} ${productId === 'hr_bot' ? 'HR Bot' : productId}`,
          is_active: true,
        });

      if (productError) {
        console.error('❌ [Klanten API] Error assigning product:', productError);
        // Don't fail the whole request, just log
      }
    }

    return NextResponse.json(
      { klant: tenant },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ [Klanten API] POST error:', error);
    return NextResponse.json(
      { error: 'Kon klant niet aanmaken' },
      { status: 500 }
    );
  }
}
