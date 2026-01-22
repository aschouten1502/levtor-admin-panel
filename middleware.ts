/**
 * ========================================
 * MIDDLEWARE
 * ========================================
 *
 * Combineert tenant detectie en authenticatie.
 *
 * FUNCTIONALITEIT:
 * 1. Tenant detectie voor multi-tenant support
 * 2. Auth bescherming voor /api/admin/* en /api/portal/* routes
 * 3. Session refresh voor Supabase Auth
 *
 * TENANT DETECTIE VOLGORDE (eerste match wint):
 * 1. Subdomain: acme.localhost:3000 → tenant_id = "acme"
 * 2. Query parameter: ?tenant=acme
 * 3. Header: X-Tenant-ID: acme
 * 4. Environment variable: TENANT_ID (fallback)
 *
 * AUTH BESCHERMING:
 * - /api/admin/* routes vereisen geldige Supabase session (admin users)
 * - /api/portal/* routes vereisen geldige Supabase session (customer users)
 * - Andere routes zijn niet beschermd
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// ========================================
// CONFIGURATION
// ========================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Routes die auth bescherming nodig hebben
const PROTECTED_API_ROUTES = ['/api/admin', '/api/portal'];

// ========================================
// TENANT DETECTION FUNCTIONS
// ========================================

/**
 * Extract tenant ID from subdomain
 */
function getTenantFromSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0];
  const parts = host.split('.');

  if (host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0];
  }

  if (parts.length >= 3) {
    const subdomain = parts[0];
    const excludedSubdomains = ['www', 'api', 'app', 'admin', 'staging', 'dev'];
    if (!excludedSubdomains.includes(subdomain)) {
      return subdomain;
    }
  }

  return null;
}

/**
 * Extract tenant ID from query parameter
 */
function getTenantFromQuery(url: URL): string | null {
  return url.searchParams.get('tenant');
}

/**
 * Extract tenant ID from header
 */
function getTenantFromHeader(request: NextRequest): string | null {
  return request.headers.get('x-tenant-id');
}

/**
 * Get default tenant ID from environment
 */
function getDefaultTenant(): string | null {
  return process.env.TENANT_ID || null;
}

// ========================================
// AUTH FUNCTIONS
// ========================================

/**
 * Check of een route auth bescherming nodig heeft
 */
function isProtectedApiRoute(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Maak Supabase client voor middleware
 */
function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

// ========================================
// MAIN MIDDLEWARE
// ========================================

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const hostname = request.headers.get('host') || '';
  const pathname = url.pathname;

  // ========================================
  // 1. TENANT DETECTION
  // ========================================

  let tenantId: string | null = null;
  let tenantSource: string = 'none';

  // Try subdomain first
  tenantId = getTenantFromSubdomain(hostname);
  if (tenantId) tenantSource = 'subdomain';

  // Try query parameter
  if (!tenantId) {
    tenantId = getTenantFromQuery(url);
    if (tenantId) tenantSource = 'query';
  }

  // Try header
  if (!tenantId) {
    tenantId = getTenantFromHeader(request);
    if (tenantId) tenantSource = 'header';
  }

  // Fallback to environment variable
  if (!tenantId) {
    tenantId = getDefaultTenant();
    if (tenantId) tenantSource = 'env';
  }

  // Log tenant detection in development (maar niet voor elke static file)
  if (process.env.NODE_ENV === 'development' && !pathname.includes('.')) {
    console.log(`🏢 [Middleware] ${pathname} - Tenant: ${tenantId || 'NOT_SET'} (${tenantSource})`);
  }

  // ========================================
  // 2. PREPARE RESPONSE
  // ========================================

  // Clone headers and add tenant info
  const requestHeaders = new Headers(request.headers);

  if (tenantId) {
    requestHeaders.set('x-tenant-id', tenantId);
    requestHeaders.set('x-tenant-source', tenantSource);
  }

  // Create response with modified headers
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add tenant to response headers
  if (tenantId) {
    response.headers.set('x-tenant-id', tenantId);
  }

  // ========================================
  // 3. AUTH CHECK & SESSION REFRESH
  // ========================================

  // Refresh session voor alle requests (als auth geconfigureerd is)
  // Dit combineert auth check en session refresh in één call
  let isUserAuthenticated = false;

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const supabase = createMiddlewareClient(request, response);
      // getUser() refresht automatisch de session als nodig
      const { data: { user }, error } = await supabase.auth.getUser();
      isUserAuthenticated = !error && !!user;
    } catch {
      // Ignore errors - session refresh is niet kritiek
      isUserAuthenticated = false;
    }
  } else {
    // Auth niet geconfigureerd - FAIL CLOSED voor security
    console.error('🔒 [Middleware] SECURITY: Supabase auth not configured');

    if (isProtectedApiRoute(pathname)) {
      return NextResponse.json(
        {
          error: 'Server configuration error',
          message: 'Authentication service not available'
        },
        { status: 503 }
      );
    }
    // Niet-protected routes mogen door (public pages)
    isUserAuthenticated = false;
  }

  // Check of protected route auth vereist
  if (isProtectedApiRoute(pathname) && !isUserAuthenticated) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔒 [Middleware] Unauthorized request to ${pathname}`);
    }

    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Je moet ingelogd zijn om deze actie uit te voeren.',
      },
      { status: 401 }
    );
  }

  if (process.env.NODE_ENV === 'development' && isProtectedApiRoute(pathname)) {
    console.log(`✅ [Middleware] Authorized request to ${pathname}`);
  }

  // ========================================
  // 5. EMBED ROUTE HEADERS
  // ========================================
  // Sta iframe embedding toe voor /embed routes
  // Dit verwijdert de X-Frame-Options restrictie zodat
  // externe websites de chatbot kunnen embedden
  if (pathname.startsWith('/embed')) {
    response.headers.delete('X-Frame-Options');

    // Haal allowed domains uit environment (comma-separated)
    // Default: alleen eigen domein voor security
    const ALLOWED_EMBED_DOMAINS = process.env.ALLOWED_EMBED_DOMAINS || '';
    const frameAncestors = ALLOWED_EMBED_DOMAINS
      ? `frame-ancestors 'self' ${ALLOWED_EMBED_DOMAINS}`
      : "frame-ancestors 'self'";

    response.headers.set('Content-Security-Policy', frameAncestors);
  }

  return response;
}

// ========================================
// MIDDLEWARE CONFIG
// ========================================

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match all pages except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|sw.js|workbox-*).*)',
  ],
};
