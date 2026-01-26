/**
 * ========================================
 * CUSTOMER AUTH UTILITIES
 * ========================================
 *
 * Specifieke auth functies voor het klantenportaal.
 * Combineert Supabase Auth met customer_users tabel check.
 *
 * FLOW:
 * 1. User logt in via Supabase Auth (email/password)
 * 2. Check of email in customer_users tabel staat
 * 3. Haal tenant_id op uit customer_users
 * 4. Return customer info met tenant_id
 */

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY, CUSTOMER_STORAGE_KEY, isAuthConfigured } from './config';

// ========================================
// TYPES
// ========================================

export interface CustomerUser {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'user';
  is_active: boolean;
}

export interface CustomerLoginResult {
  success: boolean;
  customer?: CustomerUser;
  error?: string;
}

export interface CustomerSession {
  user: CustomerUser;
  authUser: {
    id: string;
    email: string;
  };
}

// ========================================
// BROWSER CLIENT (reuse pattern)
// ========================================

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

function getSupabaseBrowserClient() {
  if (!isAuthConfigured()) {
    console.log('🔧 [CustomerAuth] getSupabaseBrowserClient: Auth not configured');
    return null;
  }

  if (!browserClient) {
    console.log(`🔧 [CustomerAuth] getSupabaseBrowserClient: Creating NEW client with storage key "${CUSTOMER_STORAGE_KEY}"`);
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookieOptions: {
        name: CUSTOMER_STORAGE_KEY,
      },
    });
  } else {
    console.log(`🔧 [CustomerAuth] getSupabaseBrowserClient: REUSING existing client (storage key: "${CUSTOMER_STORAGE_KEY}")`);
  }

  return browserClient;
}

// ========================================
// CUSTOMER AUTH FUNCTIONS
// ========================================

/**
 * Login voor klantenportaal
 * 1. Authenticate via Supabase Auth
 * 2. Check of user in customer_users staat
 * 3. Return customer info met tenant_id
 */
export async function customerLogin(
  email: string,
  password: string
): Promise<CustomerLoginResult> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return {
      success: false,
      error: 'Auth is niet geconfigureerd.',
    };
  }

  try {
    // Stap 1: Authenticate via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      let errorMessage = authError.message;

      if (authError.message.includes('Invalid login credentials')) {
        errorMessage = 'Ongeldige email of wachtwoord';
      } else if (authError.message.includes('Email not confirmed')) {
        errorMessage = 'Email is nog niet bevestigd';
      } else if (authError.message.includes('Too many requests')) {
        errorMessage = 'Te veel pogingen. Probeer later opnieuw.';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Login mislukt.',
      };
    }

    // Stap 2: Check of user in customer_users tabel staat via API
    // (gebruikt service key server-side, omzeilt RLS)
    const response = await fetch('/api/portal/me', {
      credentials: 'include',
    });

    if (!response.ok) {
      // User bestaat in Supabase Auth maar niet als customer
      // Log ze uit om security issues te voorkomen
      await supabase.auth.signOut();

      console.warn('⚠️ [CustomerAuth] User not in customer_users:', authData.user.email);

      return {
        success: false,
        error: 'Geen toegang tot klantenportaal. Neem contact op met support.',
      };
    }

    const data = await response.json();

    if (!data.customer) {
      await supabase.auth.signOut();

      return {
        success: false,
        error: 'Geen toegang tot klantenportaal. Neem contact op met support.',
      };
    }

    // Check of customer actief is
    if (!data.customer.is_active) {
      await supabase.auth.signOut();

      return {
        success: false,
        error: 'Dit account is gedeactiveerd. Neem contact op met support.',
      };
    }

    const customer: CustomerUser = {
      id: data.customer.id,
      tenant_id: data.customer.tenant_id,
      email: data.customer.email,
      name: data.customer.name,
      role: data.customer.role,
      is_active: data.customer.is_active,
    };

    console.log('✅ [CustomerAuth] Login successful:', customer.email, '- Tenant:', customer.tenant_id);

    return {
      success: true,
      customer,
    };
  } catch (err: any) {
    console.error('❌ [CustomerAuth] Login error:', err);
    return {
      success: false,
      error: 'Er is een onverwachte fout opgetreden.',
    };
  }
}

/**
 * Logout voor klantenportaal
 */
export async function customerLogout(): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { success: false, error: 'Auth niet geconfigureerd.' };
  }

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    console.log('✅ [CustomerAuth] Logout successful');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: 'Fout bij uitloggen.' };
  }
}

/**
 * Haal huidige customer op (client-side)
 *
 * SIMPLIFIED APPROACH (v2.3.1):
 * Skip de Supabase browser client volledig - deze hangt op page refresh.
 * Roep direct /api/portal/me aan - de server-side auth werkt wel omdat
 * cookies automatisch worden meegestuurd.
 */
export async function getCurrentCustomer(): Promise<CustomerUser | null> {
  const startTime = Date.now();
  console.log(`🔍 [CustomerAuth] getCurrentCustomer called at ${new Date().toISOString()}`);

  // Check of we in browser zijn
  if (typeof window === 'undefined') {
    console.log('❌ [CustomerAuth] Not in browser environment');
    return null;
  }

  // Quick check: is er een customer auth cookie?
  const hasCustomerCookie = document.cookie.includes(CUSTOMER_STORAGE_KEY);
  console.log(`🍪 [CustomerAuth] Has ${CUSTOMER_STORAGE_KEY} cookie: ${hasCustomerCookie ? 'YES' : 'NO'}`);

  if (!hasCustomerCookie) {
    console.log('❌ [CustomerAuth] No customer auth cookie - user not logged in');
    return null;
  }

  try {
    // Direct API call - skip Supabase browser client entirely
    // Server-side auth works because cookies are sent with the request
    console.log('🔍 [CustomerAuth] Fetching /api/portal/me (server handles auth)...');

    const response = await fetch('/api/portal/me', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    const apiDuration = Date.now() - startTime;
    console.log(`🔍 [CustomerAuth] API response in ${apiDuration}ms: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      if (response.status === 401) {
        console.log('❌ [CustomerAuth] 401 - Session invalid or expired');
      } else if (response.status === 403) {
        console.log('❌ [CustomerAuth] 403 - User not in customer_users or deactivated');
      } else {
        console.log(`❌ [CustomerAuth] API error: ${response.status}`);
      }
      return null;
    }

    const data = await response.json();

    if (!data.customer) {
      console.log('❌ [CustomerAuth] API response has no customer object');
      return null;
    }

    const totalDuration = Date.now() - startTime;
    console.log(`✅ [CustomerAuth] getCurrentCustomer SUCCESS in ${totalDuration}ms`);
    console.log(`✅ [CustomerAuth] Customer: ${data.customer.email}, Tenant: ${data.customer.tenant_id}`);

    return {
      id: data.customer.id,
      tenant_id: data.customer.tenant_id,
      email: data.customer.email,
      name: data.customer.name,
      role: data.customer.role,
      is_active: data.customer.is_active,
    };
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`❌ [CustomerAuth] Exception after ${totalDuration}ms:`, error);
    return null;
  }
}

/**
 * Subscribe op auth state changes voor portal
 */
export function onCustomerAuthStateChange(
  callback: (customer: CustomerUser | null) => void
) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { unsubscribe: () => {} };
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: { user?: { id: string } } | null) => {
    if (event === 'SIGNED_OUT' || !session?.user) {
      callback(null);
      return;
    }

    // Haal customer data op bij elke auth change
    const customer = await getCurrentCustomer();
    callback(customer);
  });

  return subscription;
}
