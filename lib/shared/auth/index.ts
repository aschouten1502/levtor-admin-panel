/**
 * ========================================
 * AUTH MODULE - CLIENT EXPORTS
 * ========================================
 *
 * Dit bestand exporteert alleen client-safe code.
 * Server code moet apart worden geïmporteerd.
 *
 * GEBRUIK:
 *
 * Client-side (login pagina, client components):
 * ```typescript
 * import { login, logout, getCurrentUser, isAuthConfigured } from '@/lib/shared/auth';
 * ```
 *
 * Server-side (API routes, Server Components, middleware):
 * ```typescript
 * import { getAuthUser, checkAuthFromRequest } from '@/lib/shared/auth/server';
 * ```
 */

// Config exports (client-safe)
export {
  AUTH_CONFIG,
  isAuthConfigured,
  logAuthStatus,
} from './config';

// Client exports (browser-side)
export {
  login,
  logout,
  getCurrentUser,
  onAuthStateChange,
  getSupabaseBrowserClient,
} from './client';

// Types (client-side)
export type {
  LoginCredentials,
  LoginResult,
  LogoutResult,
} from './client';

// NOTE: Server exports zijn NIET hier opgenomen om bundle errors te voorkomen.
// Importeer server functies direct:
//   import { getAuthUser, checkAuthFromRequest } from '@/lib/shared/auth/server';
