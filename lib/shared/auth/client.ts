/**
 * ========================================
 * CLIENT-SIDE AUTH UTILITIES
 * ========================================
 *
 * Browser-side utilities voor Supabase Auth.
 * Gebruikt in:
 * - Login pagina
 * - Client Components die auth nodig hebben
 *
 * BELANGRIJK: Deze functies werken alleen client-side!
 */

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_STORAGE_KEY, isAuthConfigured } from './config';

// ========================================
// TYPES
// ========================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  error?: string;
}

export interface LogoutResult {
  success: boolean;
  error?: string;
}

// ========================================
// BROWSER CLIENT
// ========================================

/**
 * Singleton browser client
 * Hergebruikt dezelfde instantie voor alle requests
 */
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get of maak de browser Supabase client voor admin
 * Uses a separate storageKey to prevent session conflicts with customer portal
 */
export function getSupabaseBrowserClient() {
  if (!isAuthConfigured()) {
    console.warn('⚠️ [Auth] Supabase auth not configured - check environment variables');
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookieOptions: {
        name: ADMIN_STORAGE_KEY,
      },
    });
  }

  return browserClient;
}

// ========================================
// AUTH FUNCTIONS
// ========================================

/**
 * Login met email en password
 */
export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  console.log('🔐 [AuthClient] login() called for:', credentials.email);

  const supabase = getSupabaseBrowserClient();
  console.log('🔐 [AuthClient] Browser client created with storageKey:', ADMIN_STORAGE_KEY);

  if (!supabase) {
    console.log('❌ [AuthClient] Supabase client is null (auth not configured)');
    return {
      success: false,
      error: 'Auth is niet geconfigureerd. Check de environment variables.',
    };
  }

  try {
    console.log('🔐 [AuthClient] Calling signInWithPassword...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      console.error('❌ [AuthClient] signInWithPassword error:', error.message);
      // Vertaal bekende errors naar Nederlandse berichten
      let errorMessage = error.message;

      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Ongeldige email of wachtwoord';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Email is nog niet bevestigd';
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'Te veel pogingen. Probeer later opnieuw.';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    if (!data.user) {
      console.log('❌ [AuthClient] No user in response data');
      return {
        success: false,
        error: 'Login mislukt. Probeer opnieuw.',
      };
    }

    console.log('✅ [AuthClient] signInWithPassword success');
    console.log('✅ [AuthClient] User ID:', data.user.id);
    console.log('✅ [AuthClient] User email:', data.user.email);
    console.log('✅ [AuthClient] Session stored in cookies with prefix:', ADMIN_STORAGE_KEY);

    return {
      success: true,
    };
  } catch (err: any) {
    console.error('❌ [AuthClient] Exception during login:', err);
    return {
      success: false,
      error: 'Er is een onverwachte fout opgetreden.',
    };
  }
}

/**
 * Logout de huidige user
 */
export async function logout(): Promise<LogoutResult> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return {
      success: false,
      error: 'Auth is niet geconfigureerd.',
    };
  }

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('❌ [Auth] Logout error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('✅ [Auth] Logout successful');

    return {
      success: true,
    };
  } catch (err: any) {
    console.error('❌ [Auth] Logout error:', err);
    return {
      success: false,
      error: 'Er is een fout opgetreden bij uitloggen.',
    };
  }
}

/**
 * Get de huidige user (client-side)
 */
export async function getCurrentUser() {
  console.log('🔍 [AuthClient] getCurrentUser() called');
  console.log('🔍 [AuthClient] Using storageKey:', ADMIN_STORAGE_KEY);

  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    console.log('❌ [AuthClient] Supabase client is null');
    return null;
  }

  try {
    console.log('🔍 [AuthClient] Calling supabase.auth.getUser()...');
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.log('❌ [AuthClient] getUser error:', error.message);
      return null;
    }

    console.log('🔍 [AuthClient] getUser result:', user ? user.email : 'null');
    if (user) {
      console.log('🔍 [AuthClient] User ID:', user.id);
    }
    return user;
  } catch (err) {
    console.error('❌ [AuthClient] Exception in getCurrentUser:', err);
    return null;
  }
}

/**
 * Subscribe op auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: any) => void
) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }

  return supabase.auth.onAuthStateChange(callback);
}
