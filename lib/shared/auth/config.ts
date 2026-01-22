/**
 * ========================================
 * AUTH CONFIGURATION
 * ========================================
 *
 * Centrale configuratie voor Supabase Auth.
 *
 * SETUP VEREISTEN:
 * 1. Voeg NEXT_PUBLIC_SUPABASE_ANON_KEY toe aan .env.local
 * 2. Maak een admin user aan in Supabase Dashboard:
 *    - Ga naar Authentication > Users > Add User
 *    - Vul email en wachtwoord in
 *
 * COOKIE CONFIGURATIE:
 * - Secure cookies in production
 * - HttpOnly voor XSS bescherming
 * - SameSite=Lax voor CSRF bescherming
 */

// ========================================
// ENVIRONMENT VARIABLES
// ========================================

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// ========================================
// AUTH CONFIGURATION
// ========================================

export const AUTH_CONFIG = {
  // Cookie naam voor de auth session
  cookieName: 'sb-auth-token',

  // Session duratie (7 dagen in seconden)
  sessionDuration: 60 * 60 * 24 * 7,

  // Routes configuratie
  routes: {
    login: '/admin/login',
    afterLogin: '/admin',
    afterLogout: '/admin/login',
  },

  // Protected route patterns
  protectedPatterns: {
    pages: ['/admin'],           // Alle /admin/* pagina's (behalve /admin/login)
    api: ['/api/admin'],         // Alle /api/admin/* routes
  },

  // Public routes binnen protected patterns
  publicRoutes: [
    '/admin/login',
  ],
} as const;

// ========================================
// VALIDATION
// ========================================

/**
 * Check of de auth configuratie compleet is
 */
export function isAuthConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Log auth configuratie status (alleen in development)
 */
export function logAuthStatus(): void {
  if (process.env.NODE_ENV !== 'development') return;

  const status = {
    supabaseUrl: SUPABASE_URL ? '✅ Set' : '❌ Missing',
    anonKey: SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    serviceKey: SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing',
  };

  console.log('🔐 [Auth Config]', status);

  if (!isAuthConfigured()) {
    console.warn(
      '⚠️ [Auth] NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. ' +
      'Admin authentication will not work. ' +
      'Get the anon key from Supabase Dashboard > Settings > API'
    );
  }
}
