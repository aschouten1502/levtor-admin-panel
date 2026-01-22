/**
 * Supabase Multi-Tenant Configuration
 *
 * This file centralizes all Supabase-related configuration for multi-tenant deployments.
 * It reads from environment variables to support different deployment strategies:
 *
 * DEPLOYMENT STRATEGIES:
 *
 * 1. Shared Database with Tenant ID (Recommended for SaaS)
 *    - Single Supabase project for all clients
 *    - Generic table name: "chat_logs"
 *    - Each row has tenant_id column for isolation
 *    - Lower cost, easier analytics across tenants
 *    - Example .env:
 *      TENANT_ID=acme-corp
 *      SUPABASE_TABLE_NAME=chat_logs
 *
 * 2. Separate Tables per Tenant
 *    - Single Supabase project
 *    - Client-specific tables: "acme_corp_chat_logs", "techstart_chat_logs"
 *    - Complete table isolation
 *    - Example .env:
 *      TENANT_ID=acme-corp
 *      SUPABASE_TABLE_NAME=acme_corp_chat_logs
 *
 * 3. Separate Supabase Projects per Tenant
 *    - Different Supabase URL/keys per client
 *    - Complete infrastructure isolation
 *    - Higher cost, simpler security
 *    - Example .env:
 *      TENANT_ID=acme-corp
 *      NEXT_PUBLIC_SUPABASE_URL=https://acme-corp.supabase.co
 *      SUPABASE_TABLE_NAME=chat_logs
 */

/**
 * Tenant Configuration
 */
export const TENANT_CONFIG = {
  /**
   * Unique identifier for this tenant/client
   * Format: lowercase-with-dashes (e.g., "acme-corp", "techstart-bv")
   * Used for:
   * - Database logging (tenant_id column)
   * - Analytics filtering
   * - Multi-tenant row-level security
   */
  tenantId: process.env.TENANT_ID || null,

  /**
   * Human-readable tenant name
   * Used in logs and analytics dashboards
   */
  tenantName: process.env.TENANT_NAME || null,
} as const;

/**
 * Database Configuration
 */
export const DATABASE_CONFIG = {
  /**
   * Table name for chat request logs
   *
   * Options:
   * - "chat_logs" (default): Generic name for shared database
   * - "{tenant-id}_chat_logs": Client-specific table
   * - "geostick_logs_data_qabothr": Legacy GeoStick table (backwards compatible)
   *
   * Default: "chat_logs" for new deployments
   */
  tableName: process.env.SUPABASE_TABLE_NAME || 'chat_logs',

  /**
   * Whether to include tenant_id in all database operations
   * Automatically enabled if TENANT_ID is set
   */
  enableTenantId: !!process.env.TENANT_ID,
} as const;

/**
 * Storage Configuration
 */
export const STORAGE_CONFIG = {
  /**
   * Supabase Storage bucket name for HR document PDFs
   *
   * Format: {tenant-id}-hr-documents
   * Examples:
   * - "acme-corp-hr-documents"
   * - "techstart-hr-documents"
   * - "demo-client-hr-documents"
   *
   * Legacy: "Geostick-HR-documenten" (backwards compatible)
   *
   * Used for generating clickable PDF citation links
   */
  bucketName: process.env.STORAGE_BUCKET_NAME || 'hr-documents',

  /**
   * Whether to dynamically fetch available PDFs from storage
   * If false, uses hardcoded PDF list (legacy mode)
   */
  useDynamicPdfList: process.env.USE_DYNAMIC_PDF_LIST !== 'false', // Default: true
} as const;

/**
 * Configuration validation
 * Logs warnings for missing or misconfigured values
 */
export function validateConfig(): void {
  const warnings: string[] = [];

  // Check for tenant configuration in multi-tenant mode
  if (!TENANT_CONFIG.tenantId && process.env.NODE_ENV === 'production') {
    warnings.push(
      '⚠️ TENANT_ID not set in production environment. ' +
      'Set TENANT_ID in .env.local for multi-tenant deployments.'
    );
  }

  // Check for storage bucket configuration
  if (STORAGE_CONFIG.bucketName === 'hr-documents') {
    warnings.push(
      '⚠️ Using default STORAGE_BUCKET_NAME. ' +
      'Set STORAGE_BUCKET_NAME={tenant-id}-hr-documents in .env.local for client-specific documents.'
    );
  }

  // Check for table name configuration
  if (DATABASE_CONFIG.tableName === 'chat_logs' && !TENANT_CONFIG.tenantId) {
    warnings.push(
      'ℹ️ Using shared table "chat_logs" without TENANT_ID. ' +
      'This is OK for single-tenant deployments, but set TENANT_ID for multi-tenant mode.'
    );
  }

  // Log warnings if any
  if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.log('\n🔧 [Supabase Config] Configuration Warnings:');
    warnings.forEach(warning => console.log(`   ${warning}`));
    console.log('');
  }
}

/**
 * Export summary of current configuration
 * Useful for debugging and deployment verification
 */
export function getConfigSummary(): Record<string, any> {
  return {
    tenant: {
      id: TENANT_CONFIG.tenantId || '(not set)',
      name: TENANT_CONFIG.tenantName || '(not set)',
    },
    database: {
      table: DATABASE_CONFIG.tableName,
      tenantIdEnabled: DATABASE_CONFIG.enableTenantId,
    },
    storage: {
      bucket: STORAGE_CONFIG.bucketName,
      dynamicPdfList: STORAGE_CONFIG.useDynamicPdfList,
    },
    environment: process.env.NODE_ENV,
  };
}

// Validate configuration on module load (development only)
if (process.env.NODE_ENV === 'development') {
  validateConfig();
}
