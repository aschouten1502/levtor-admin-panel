/**
 * ========================================
 * SERVER-SIDE AUTH UTILITIES
 * ========================================
 *
 * Server-side utilities voor Supabase Auth.
 * Gebruikt in:
 * - API routes
 * - Server Components
 * - Middleware
 *
 * BELANGRIJK: Deze functies werken alleen server-side!
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  AUTH_CONFIG,
  ADMIN_STORAGE_KEY,
  CUSTOMER_STORAGE_KEY,
  isAuthConfigured,
} from './config';

// ========================================
// AUTH CONTEXT TYPES
// ========================================

export type AuthContext = 'admin' | 'customer' | 'any';

// ========================================
// TYPES
// ========================================

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

export interface AuthResult {
  authenticated: boolean;
  user: AuthUser | null;
  error?: string;
}

// ========================================
// SERVER CLIENT CREATION
// ========================================

/**
 * Maak een Supabase client voor Server Components
 * Gebruikt cookies() van next/headers
 *
 * @param context - 'admin' | 'customer' | 'any' - determines which session to use
 *
 * Session isolation werkt via cookieOptions.name (storageKey):
 * - Supabase filtert automatisch op basis van de storage key
 * - Admin sessies gebruiken 'sb-admin-auth' cookies
 * - Customer sessies gebruiken 'sb-customer-auth' cookies
 */
export async function createServerSupabaseClient(context: AuthContext = 'any') {
  if (!isAuthConfigured()) {
    console.warn('⚠️ [Auth] Supabase auth not configured');
    return null;
  }

  const cookieStore = await cookies();
  const storageKey = context === 'admin' ? ADMIN_STORAGE_KEY :
                     context === 'customer' ? CUSTOMER_STORAGE_KEY : undefined;

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...(storageKey && {
      cookieOptions: {
        name: storageKey,
      },
    }),
    cookies: {
      getAll() {
        // Return ALL cookies - Supabase filtert zelf op basis van storageKey
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Kan falen in Server Components (read-only)
          // Dit is OK - de middleware handelt cookie updates af
        }
      },
    },
  });
}

/**
 * Maak een Supabase client voor API Routes
 * Gebruikt request/response voor cookie handling
 *
 * @param context - 'admin' | 'customer' | 'any' - determines which session to use
 */
export function createApiSupabaseClient(
  request: NextRequest,
  response: NextResponse,
  context: AuthContext = 'any'
) {
  if (!isAuthConfigured()) {
    return null;
  }

  const storageKey = context === 'admin' ? ADMIN_STORAGE_KEY :
                     context === 'customer' ? CUSTOMER_STORAGE_KEY : undefined;

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...(storageKey && {
      cookieOptions: {
        name: storageKey,
      },
    }),
    cookies: {
      getAll() {
        // Return ALL cookies - Supabase filtert zelf op basis van storageKey
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

/**
 * Maak een Supabase client voor Middleware
 *
 * @param context - 'admin' | 'customer' | 'any' - determines which session to use
 */
export function createMiddlewareSupabaseClient(request: NextRequest, context: AuthContext = 'any') {
  if (!isAuthConfigured()) {
    return { supabase: null, response: NextResponse.next() };
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const storageKey = context === 'admin' ? ADMIN_STORAGE_KEY :
                     context === 'customer' ? CUSTOMER_STORAGE_KEY : undefined;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...(storageKey && {
      cookieOptions: {
        name: storageKey,
      },
    }),
    cookies: {
      getAll() {
        // Return ALL cookies - Supabase filtert zelf op basis van storageKey
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

  return { supabase, response };
}

// ========================================
// AUTH CHECK FUNCTIONS
// ========================================

/**
 * Check of de huidige user geauthenticeerd is (Server Component)
 *
 * @param context - 'admin' | 'customer' | 'any' - which session to check
 *                  Default is 'any' for backward compatibility
 */
export async function getAuthUser(context: AuthContext = 'any'): Promise<AuthResult> {
  const startTime = Date.now();
  const storageKey = context === 'admin' ? ADMIN_STORAGE_KEY :
                     context === 'customer' ? CUSTOMER_STORAGE_KEY : 'any';
  console.log(`🔐 [ServerAuth] getAuthUser() called - context: ${context}, storageKey: ${storageKey}`);

  try {
    // Log cookies voor debug
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const authCookies = allCookies.filter(c => c.name.includes('sb-') || c.name.includes('auth'));
    console.log(`🔐 [ServerAuth] Available cookies: ${allCookies.length} total, ${authCookies.length} auth-related`);
    console.log(`🔐 [ServerAuth] Auth cookie names: ${authCookies.map(c => c.name).join(', ') || 'NONE'}`);

    // Check specifiek voor de verwachte storage key
    if (context !== 'any') {
      const expectedCookiePrefix = context === 'admin' ? ADMIN_STORAGE_KEY : CUSTOMER_STORAGE_KEY;
      const hasCookie = allCookies.some(c => c.name.includes(expectedCookiePrefix));
      console.log(`🔐 [ServerAuth] Expected cookie (${expectedCookiePrefix}): ${hasCookie ? 'FOUND' : 'NOT FOUND'}`);
    }

    const supabase = await createServerSupabaseClient(context);

    if (!supabase) {
      console.log('❌ [ServerAuth] Supabase client not created (auth not configured)');
      return {
        authenticated: false,
        user: null,
        error: 'Auth not configured',
      };
    }

    const getUserStartTime = Date.now();
    console.log('🔐 [ServerAuth] Calling supabase.auth.getUser()...');
    const { data: { user }, error } = await supabase.auth.getUser();
    const getUserDuration = Date.now() - getUserStartTime;

    console.log(`🔐 [ServerAuth] getUser() completed in ${getUserDuration}ms`);

    if (error) {
      console.log(`❌ [ServerAuth] getUser error: ${error.message}`);
      console.log(`❌ [ServerAuth] Error status: ${error.status || 'unknown'}`);
      return {
        authenticated: false,
        user: null,
        error: error.message,
      };
    }

    if (!user) {
      const totalDuration = Date.now() - startTime;
      console.log(`❌ [ServerAuth] No user in session after ${totalDuration}ms`);
      console.log('❌ [ServerAuth] This means: valid cookies but no active session, or session expired');
      return {
        authenticated: false,
        user: null,
      };
    }

    const totalDuration = Date.now() - startTime;
    console.log(`✅ [ServerAuth] User found in ${totalDuration}ms: ${user.email}`);
    console.log(`✅ [ServerAuth] User ID: ${user.id}`);

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email || '',
        role: user.role,
      },
    };
  } catch (err: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`❌ [ServerAuth] Exception after ${totalDuration}ms:`, err.message);
    return {
      authenticated: false,
      user: null,
      error: err.message,
    };
  }
}

/**
 * Convenience function to get admin user
 */
export async function getAdminAuthUser(): Promise<AuthResult> {
  return getAuthUser('admin');
}

/**
 * Convenience function to get customer user
 */
export async function getCustomerAuthUser(): Promise<AuthResult> {
  return getAuthUser('customer');
}

/**
 * Check of een request geauthenticeerd is (Middleware/API)
 *
 * @param context - 'admin' | 'customer' | 'any' - which session to check
 */
export async function checkAuthFromRequest(
  request: NextRequest,
  context: AuthContext = 'any'
): Promise<AuthResult> {
  try {
    const { supabase } = createMiddlewareSupabaseClient(request, context);

    if (!supabase) {
      return {
        authenticated: false,
        user: null,
        error: 'Auth not configured',
      };
    }

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        authenticated: false,
        user: null,
        error: error?.message,
      };
    }

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email || '',
        role: user.role,
      },
    };
  } catch (err: any) {
    return {
      authenticated: false,
      user: null,
      error: err.message,
    };
  }
}

// ========================================
// ROUTE PROTECTION HELPERS
// ========================================

/**
 * Check of een path beschermd moet worden
 */
export function isProtectedPath(pathname: string): boolean {
  // Check of het een public route is
  if ((AUTH_CONFIG.publicRoutes as readonly string[]).includes(pathname)) {
    return false;
  }

  // Check of het een protected page is
  const isProtectedPage = AUTH_CONFIG.protectedPatterns.pages.some(
    pattern => pathname.startsWith(pattern)
  );

  // Check of het een protected API route is
  const isProtectedApi = AUTH_CONFIG.protectedPatterns.api.some(
    pattern => pathname.startsWith(pattern)
  );

  return isProtectedPage || isProtectedApi;
}

/**
 * Check of een path een API route is
 */
export function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}
