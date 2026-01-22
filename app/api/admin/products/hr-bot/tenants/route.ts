import { NextRequest, NextResponse } from 'next/server';
import { createTenant, getAllTenants, TenantCreateInput } from '@/lib/admin/tenant-service';

/**
 * GET /api/admin/tenants
 * List all tenants
 */
export async function GET() {
  try {
    const tenants = await getAllTenants();
    return NextResponse.json({ tenants });
  } catch (error) {
    console.error('❌ [API] Error listing tenants:', error);
    return NextResponse.json(
      { error: 'Failed to list tenants' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tenants
 * Create a new tenant
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.id || !body.name) {
      return NextResponse.json(
        { error: 'Tenant ID and name are required' },
        { status: 400 }
      );
    }

    // Validate ID format
    const idRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
    if (!idRegex.test(body.id)) {
      return NextResponse.json(
        { error: 'Tenant ID must be lowercase letters, numbers, and dashes' },
        { status: 400 }
      );
    }

    // Server-side validation
    // Email validation
    if (body.contact_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.contact_email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Color validation
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (body.primary_color && !colorRegex.test(body.primary_color)) {
      return NextResponse.json(
        { error: 'Invalid primary color format (use #RRGGBB)' },
        { status: 400 }
      );
    }
    if (body.secondary_color && !colorRegex.test(body.secondary_color)) {
      return NextResponse.json(
        { error: 'Invalid secondary color format (use #RRGGBB)' },
        { status: 400 }
      );
    }

    // URL validation
    if (body.website_url) {
      try {
        new URL(body.website_url);
      } catch {
        return NextResponse.json(
          { error: 'Invalid website URL' },
          { status: 400 }
        );
      }
    }

    const input: TenantCreateInput = {
      id: body.id,
      name: body.name,
      logo_url: body.logo_url,
      primary_color: body.primary_color,
      secondary_color: body.secondary_color,
      welcome_message: body.welcome_message,
      contact_email: body.contact_email,
      is_demo: body.is_demo ?? false,  // FIX: was missing!
      // Multilingual RAG support (v2.2)
      document_language: body.document_language || 'nl',
      website_url: body.website_url || null,
    };

    const result = await createTenant(input);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { tenant: result.tenant },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ [API] Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    );
  }
}
