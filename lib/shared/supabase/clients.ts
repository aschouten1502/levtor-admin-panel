/**
 * ========================================
 * CENTRALIZED SUPABASE CLIENTS
 * ========================================
 *
 * Gecentraliseerde Supabase client factory.
 * Vervangt 10+ duplicaat singleton patterns verspreid door de codebase.
 *
 * GEBRUIK:
 * - Server-side: getSupabaseAdminClient() - met SERVICE_ROLE_KEY
 * - Browser: Gebruik @supabase/ssr createBrowserClient direct
 *
 * Deze module zorgt voor:
 * - Singleton pattern (één instantie per client type)
 * - Consistente error logging
 * - Veilige configuratie checks
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ========================================
// SINGLETON INSTANCES
// ========================================

let adminClient: SupabaseClient | null = null;

// ========================================
// CONFIGURATION
// ========================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// ========================================
// ADMIN CLIENT (Server-side only)
// ========================================

/**
 * Haal de Supabase admin client op (met service role key).
 * Gebruik ALLEEN server-side - nooit in client components!
 *
 * @returns SupabaseClient of null als niet geconfigureerd
 *
 * @example
 * ```typescript
 * import { getSupabaseAdminClient } from '@/lib/shared/supabase/clients';
 *
 * const supabase = getSupabaseAdminClient();
 * if (!supabase) {
 *   throw new Error('Supabase not configured');
 * }
 *
 * const { data } = await supabase.from('tenants').select('*');
 * ```
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  // Return cached instance if available
  if (adminClient) {
    return adminClient;
  }

  // Check configuration
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ [Supabase] Admin client not configured - missing URL or SERVICE_ROLE_KEY');
    return null;
  }

  // Create and cache client
  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return adminClient;
}

/**
 * Alias voor backwards compatibility.
 * @deprecated Gebruik getSupabaseAdminClient() in nieuwe code.
 */
export const getSupabaseClient = getSupabaseAdminClient;

// ========================================
// UTILITIES
// ========================================

/**
 * Check of Supabase correct geconfigureerd is.
 */
export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Haal de Supabase URL op (voor diagnostics).
 */
export function getSupabaseUrl(): string {
  return SUPABASE_URL;
}
