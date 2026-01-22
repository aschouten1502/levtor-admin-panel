import { NextRequest, NextResponse } from 'next/server';
import {
  getTenantById,
  updateTenant,
  deleteTenant,
  TenantUpdateInput,
} from '@/lib/admin/tenant-service';
import { uploadLogo, deleteTenantStorage } from '@/lib/admin/storage-service';
import { clearTenantCache } from '@/lib/shared/tenant-config';

/**
 * GET /api/admin/tenants/[id]
 * Get a single tenant by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await getTenantById(id);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error('❌ [API] Error getting tenant:', error);
    return NextResponse.json(
      { error: 'Failed to get tenant' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/tenants/[id]
 * Update a tenant's settings
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const input: TenantUpdateInput = {};

    // Only include fields that are provided
    if (body.name !== undefined) input.name = body.name;
    if (body.logo_url !== undefined) input.logo_url = body.logo_url;
    if (body.primary_color !== undefined) input.primary_color = body.primary_color;
    if (body.secondary_color !== undefined) input.secondary_color = body.secondary_color;
    if (body.welcome_message !== undefined) input.welcome_message = body.welcome_message;
    if (body.contact_email !== undefined) input.contact_email = body.contact_email;
    if (body.is_active !== undefined) input.is_active = body.is_active;

    const result = await updateTenant(id, input);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Clear tenant cache so changes are immediately visible
    clearTenantCache(id);

    return NextResponse.json({ tenant: result.tenant });
  } catch (error) {
    console.error('❌ [API] Error updating tenant:', error);
    return NextResponse.json(
      { error: 'Failed to update tenant' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/tenants/[id]
 * Upload/update tenant logo (multipart form data)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify tenant exists
    const tenant = await getTenantById(id);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const logoFile = formData.get('logo') as File | null;

    if (!logoFile) {
      return NextResponse.json(
        { error: 'No logo file provided' },
        { status: 400 }
      );
    }

    // Upload logo
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    const uploadResult = await uploadLogo(id, buffer, logoFile.name, logoFile.type);

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error },
        { status: 400 }
      );
    }

    // Update tenant with logo URL
    const updateResult = await updateTenant(id, {
      logo_url: uploadResult.publicUrl,
    });

    if (!updateResult.success) {
      return NextResponse.json(
        { error: updateResult.error },
        { status: 400 }
      );
    }

    // Clear tenant cache so logo changes are immediately visible
    clearTenantCache(id);

    return NextResponse.json({
      tenant: updateResult.tenant,
      logo_url: uploadResult.publicUrl,
    });
  } catch (error) {
    console.error('❌ [API] Error uploading logo:', error);
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tenants/[id]
 * Delete a tenant and all associated data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete storage first
    await deleteTenantStorage(id);

    // Delete tenant from database
    const result = await deleteTenant(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [API] Error deleting tenant:', error);
    return NextResponse.json(
      { error: 'Failed to delete tenant' },
      { status: 500 }
    );
  }
}
