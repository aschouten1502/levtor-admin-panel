/**
 * ========================================
 * ADMIN BRANDING API - List & Create Tenants
 * ========================================
 * GET  /api/admin/branding - Lijst alle tenants
 * POST /api/admin/branding - Maak nieuwe tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllTenants,
  createTenant,
  isTenantIdAvailable,
  CreateTenantInput
} from '@/lib/admin/branding-service';

/**
 * GET /api/admin/branding
 * Haal alle tenants op voor het overzicht
 */
export async function GET() {
  try {
    console.log('📋 [API] GET /api/admin/branding - Fetching all tenants');

    const tenants = await getAllTenants();

    console.log(`✅ [API] Found ${tenants.length} tenants`);
    return NextResponse.json({ tenants });

  } catch (error) {
    console.error('❌ [API] Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenants', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/branding
 * Maak een nieuwe tenant aan
 */
export async function POST(request: NextRequest) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('➕ [API] POST /api/admin/branding - START');

  try {
    // Step 1: Parse request body
    console.log('📥 [API] Step 1: Parsing request body...');
    let body;
    try {
      body = await request.json();
      console.log('📥 [API] Request body:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('❌ [API] Failed to parse JSON body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { id, name, primary_color } = body as CreateTenantInput;
    console.log(`📥 [API] Extracted: id="${id}", name="${name}", primary_color="${primary_color}"`);

    // Step 2: Validate required fields
    console.log('🔍 [API] Step 2: Validating required fields...');
    if (!id || !name) {
      console.log('❌ [API] Validation failed: missing id or name');
      return NextResponse.json(
        { error: 'Missing required fields: id and name are required' },
        { status: 400 }
      );
    }
    console.log('✅ [API] Required fields present');

    // Step 3: Validate ID format
    console.log('🔍 [API] Step 3: Validating ID format...');
    if (!/^[a-z0-9-]+$/.test(id)) {
      console.log(`❌ [API] Invalid ID format: "${id}"`);
      return NextResponse.json(
        { error: 'Invalid tenant ID format. Use only lowercase letters, numbers, and hyphens.' },
        { status: 400 }
      );
    }
    console.log('✅ [API] ID format valid');

    // Step 4: Check if ID is available
    console.log('🔍 [API] Step 4: Checking if tenant ID is available...');
    try {
      const isAvailable = await isTenantIdAvailable(id);
      console.log(`🔍 [API] ID "${id}" available: ${isAvailable}`);
      if (!isAvailable) {
        console.log(`❌ [API] Tenant ID "${id}" already exists`);
        return NextResponse.json(
          { error: 'Tenant ID already exists' },
          { status: 409 }
        );
      }
    } catch (checkError) {
      console.error('❌ [API] Error checking tenant ID availability:', checkError);
      throw checkError;
    }
    console.log('✅ [API] Tenant ID is available');

    // Step 5: Create tenant
    console.log('💾 [API] Step 5: Creating tenant in database...');
    let tenant;
    try {
      tenant = await createTenant({ id, name, primary_color });
      console.log('✅ [API] Tenant created successfully:', JSON.stringify(tenant, null, 2));
    } catch (createError) {
      console.error('❌ [API] Error in createTenant:', createError);
      throw createError;
    }

    console.log(`✅ [API] POST /api/admin/branding - SUCCESS - Tenant: ${id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return NextResponse.json({ tenant }, { status: 201 });

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ [API] POST /api/admin/branding - FAILED');
    console.error('❌ [API] Error type:', (error as Error).constructor.name);
    console.error('❌ [API] Error message:', (error as Error).message);
    console.error('❌ [API] Error stack:', (error as Error).stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return NextResponse.json(
      { error: 'Failed to create tenant', details: (error as Error).message },
      { status: 500 }
    );
  }
}
