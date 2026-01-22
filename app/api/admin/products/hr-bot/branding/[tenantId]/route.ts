/**
 * ========================================
 * ADMIN BRANDING API - Single Tenant CRUD
 * ========================================
 * GET  /api/admin/branding/[tenantId] - Haal tenant branding op
 * PUT  /api/admin/branding/[tenantId] - Update tenant branding
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTenantBranding,
  updateTenantBranding,
  UpdateTenantBrandingInput
} from '@/lib/admin/branding-service';

interface RouteParams {
  params: Promise<{ tenantId: string }>;
}

/**
 * GET /api/admin/branding/[tenantId]
 * Haal alle branding details van een tenant op
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { tenantId } = await params;
    console.log(`📋 [API] GET /api/admin/branding/${tenantId}`);

    const tenant = await getTenantBranding(tenantId);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    console.log(`✅ [API] Tenant found: ${tenantId}`);
    return NextResponse.json({ tenant });

  } catch (error) {
    console.error('❌ [API] Error fetching tenant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/branding/[tenantId]
 * Update tenant branding
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { tenantId } = await params;
    console.log(`📝 [API] PUT /api/admin/branding/${tenantId}`);

    const body = await request.json() as UpdateTenantBrandingInput;

    // Check of tenant bestaat
    const existing = await getTenantBranding(tenantId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Update tenant
    const tenant = await updateTenantBranding(tenantId, body);

    console.log(`✅ [API] Tenant updated: ${tenantId}`);
    return NextResponse.json({ tenant });

  } catch (error) {
    console.error('❌ [API] Error updating tenant:', error);
    return NextResponse.json(
      { error: 'Failed to update tenant', details: (error as Error).message },
      { status: 500 }
    );
  }
}
