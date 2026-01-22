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
  isAuthConfigured,
} from './config';

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
 */
export async function createServerSupabaseClient() {
  if (!isAuthConfigured()) {
    console.warn('⚠️ [Auth] Supabase auth not configured');
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
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
 */
export function createApiSupabaseClient(
  request: NextRequest,
  response: NextResponse
) {
  if (!isAuthConfigured()) {
    return null;
  }

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

/**
 * Maak een Supabase client voor Middleware
 */
export function createMiddlewareSupabaseClient(request: NextRequest) {
  if (!isAuthConfigured()) {
    return { supabase: null, response: NextResponse.next() };
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

  return { supabase, response };
}

// ========================================
// AUTH CHECK FUNCTIONS
// ========================================

/**
 * Check of de huidige user geauthenticeerd is (Server Component)
 */
export async function getAuthUser(): Promise<AuthResult> {
  try {
    const supabase = await createServerSupabaseClient();

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
    console.error('❌ [Auth] Error getting user:', err.message);
    return {
      authenticated: false,
      user: null,
      error: err.message,
    };
  }
}

/**
 * Check of een request geauthenticeerd is (Middleware/API)
 */
export async function checkAuthFromRequest(
  request: NextRequest
): Promise<AuthResult> {
  try {
    const { supabase } = createMiddlewareSupabaseClient(request);

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
