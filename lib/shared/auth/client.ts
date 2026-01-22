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
import { SUPABASE_URL, SUPABASE_ANON_KEY, isAuthConfigured } from './config';

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
 * Get of maak de browser Supabase client
 */
export function getSupabaseBrowserClient() {
  if (!isAuthConfigured()) {
    console.warn('⚠️ [Auth] Supabase auth not configured - check environment variables');
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return {
      success: false,
      error: 'Auth is niet geconfigureerd. Check de environment variables.',
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
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
      return {
        success: false,
        error: 'Login mislukt. Probeer opnieuw.',
      };
    }

    console.log('✅ [Auth] Login successful for:', data.user.email);

    return {
      success: true,
    };
  } catch (err: any) {
    console.error('❌ [Auth] Login error:', err);
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
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
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
