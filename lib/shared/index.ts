/**
 * ========================================
 * SHARED MODULE - Gedeelde Utilities
 * ========================================
 *
 * Dit module bevat alle gedeelde functionaliteit:
 * - Database (Supabase)
 * - Authenticatie (Admin + Portal)
 * - Logging en analytics
 * - Tenant configuratie
 * - PDF URL generatie
 * - Branding configuratie
 *
 * Gebruikt door alle andere modules.
 */

// Database (Supabase)
export * from './supabase/supabase-client';
export * from './supabase/config';
export type * from './supabase/types';

// Authenticatie
export * from './auth';

// Logging
export * from './logging';

// Tenant configuratie
export * from './tenant-config';

// PDF URLs
export * from './pdf-urls';

// Branding
export { BRANDING } from './branding.config';
