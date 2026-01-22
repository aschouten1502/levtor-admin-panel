/**
 * ========================================
 * TENANT API ROUTE
 * ========================================
 *
 * GET /api/tenant
 * Returns tenant configuration (branding, colors, etc.)
 *
 * Tenant ID detection priority:
 * 1. Query param: ?tenant=acme (highest - for embed pages)
 * 2. Header: X-Tenant-ID (set by middleware)
 * 3. Environment variable: TENANT_ID (fallback)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantConfig, getTenantCssVariables } from '@/lib/shared/tenant-config';

export async function GET(request: NextRequest) {
  // Get tenant ID - query param takes priority for embed pages
  const tenantId = request.nextUrl.searchParams.get('tenant')
    || request.headers.get('x-tenant-id')
    || process.env.TENANT_ID;

  if (!tenantId) {
    return NextResponse.json(
      {
        error: 'No tenant ID provided',
        message: 'Provide tenant via subdomain, ?tenant=xxx query param, or X-Tenant-ID header'
      },
      { status: 400 }
    );
  }

  // Fetch tenant config from database
  const result = await getTenantConfig(tenantId);

  if (!result.success || !result.config) {
    return NextResponse.json(
      {
        error: result.error || 'Tenant not found',
        tenantId
      },
      { status: 404 }
    );
  }

  // Build response with CSS variables included
  const response = {
    tenant: result.config,
    cssVariables: getTenantCssVariables(result.config),
    fromCache: result.fromCache
  };

  return NextResponse.json(response, {
    headers: {
      // No caching - always fetch fresh tenant config
      // This ensures changes in admin panel are immediately visible
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    }
  });
}
