/**
 * ========================================
 * BRANDING SERVICE (SERVER-ONLY)
 * ========================================
 * CRUD operaties voor tenant branding configuratie.
 * Gebruikt door de admin panel voor het beheren van
 * tenant-specifieke UI aanpassingen.
 *
 * ⚠️ WARNING: This file uses SUPABASE_SERVICE_ROLE_KEY
 * and should ONLY be imported in server-side code (API routes).
 * For types and defaults, import from './branding-types' instead.
 */

import { createClient } from '@supabase/supabase-js';

// Re-export types and defaults for backwards compatibility
export * from './branding-types';
import {
  TenantBranding,
  TenantListItem,
  CreateTenantInput,
  UpdateTenantBrandingInput,
  DEFAULT_COLORS,
  DEFAULT_UI_TEXTS
} from './branding-types';

// ========================================
// SUPABASE CLIENT (SERVER-ONLY)
// ========================================

// Lazy initialization to avoid errors when imported accidentally on client
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        '[BrandingService] Missing Supabase credentials. ' +
        'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set. ' +
        'Note: This service should only be used server-side (in API routes).'
      );
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

// ========================================
// SERVICE FUNCTIONS
// ========================================

/**
 * Haal alle tenants op voor het overzicht
 */
export async function getAllTenants(): Promise<TenantListItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabase()
    .from('tenants') as any)
    .select('id, name, primary_color, logo_url, is_active, is_demo, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ [BrandingService] Error fetching tenants:', error);
    throw new Error(`Failed to fetch tenants: ${error.message}`);
  }

  return data || [];
}

/**
 * Haal één tenant op met alle branding details
 */
export async function getTenantBranding(tenantId: string): Promise<TenantBranding | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabase()
    .from('tenants') as any)
    .select('*')
    .eq('id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('❌ [BrandingService] Error fetching tenant:', error);
    throw new Error(`Failed to fetch tenant: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantData = data as any;

  // Parse fun_facts if it's a string
  if (typeof tenantData.fun_facts === 'string') {
    try {
      tenantData.fun_facts = JSON.parse(tenantData.fun_facts);
    } catch {
      tenantData.fun_facts = [];
    }
  }

  // Parse ui_texts if it's a string
  if (typeof tenantData.ui_texts === 'string') {
    try {
      tenantData.ui_texts = JSON.parse(tenantData.ui_texts);
    } catch {
      tenantData.ui_texts = {};
    }
  }

  return tenantData as TenantBranding;
}

/**
 * Maak een nieuwe tenant aan
 */
export async function createTenant(input: CreateTenantInput): Promise<TenantBranding> {
  console.log('🔧 [BrandingService] createTenant() called with:', JSON.stringify(input, null, 2));

  // Valideer tenant ID format (lowercase, alleen letters, cijfers, hyphens)
  if (!/^[a-z0-9-]+$/.test(input.id)) {
    console.error('❌ [BrandingService] Invalid tenant ID format:', input.id);
    throw new Error('Tenant ID mag alleen kleine letters, cijfers en hyphens bevatten');
  }
  console.log('✅ [BrandingService] Tenant ID format valid');

  // Prepare insert data
  const insertData = {
    id: input.id,
    name: input.name,
    primary_color: input.primary_color || DEFAULT_COLORS.primary,
    // Set defaults
    primary_dark: DEFAULT_COLORS.primaryDark,
    primary_light: DEFAULT_COLORS.primaryLight,
    secondary_color: DEFAULT_COLORS.secondary,
    background_color: DEFAULT_COLORS.background,
    surface_color: DEFAULT_COLORS.surface,
    text_primary: DEFAULT_COLORS.textPrimary,
    text_secondary: DEFAULT_COLORS.textSecondary,
    text_tertiary: DEFAULT_COLORS.textTertiary,
    fun_facts: [],
    ui_texts: { nl: DEFAULT_UI_TEXTS },
    is_active: true,
    is_demo: false
  };
  console.log('📋 [BrandingService] Insert data prepared:', JSON.stringify(insertData, null, 2));

  console.log('💾 [BrandingService] Executing Supabase insert...');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabase()
    .from('tenants') as any)
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('❌ [BrandingService] Supabase error:', JSON.stringify(error, null, 2));
    console.error('❌ [BrandingService] Error code:', error.code);
    console.error('❌ [BrandingService] Error message:', error.message);
    console.error('❌ [BrandingService] Error details:', error.details);
    console.error('❌ [BrandingService] Error hint:', error.hint);
    if (error.code === '23505') {
      throw new Error('Een tenant met dit ID bestaat al');
    }
    throw new Error(`Failed to create tenant: ${error.message}`);
  }

  console.log('✅ [BrandingService] Supabase insert successful');
  console.log('✅ [BrandingService] Returned data:', JSON.stringify(data, null, 2));
  console.log('✅ [BrandingService] Tenant created:', input.id);
  return data as TenantBranding;
}

/**
 * Update tenant branding
 */
export async function updateTenantBranding(
  tenantId: string,
  input: UpdateTenantBrandingInput
): Promise<TenantBranding> {
  // Prepare update object, removing undefined values
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  // Copy all defined values
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) {
      updateData[key] = value;
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabase()
    .from('tenants') as any)
    .update(updateData)
    .eq('id', tenantId)
    .select()
    .single();

  if (error) {
    console.error('❌ [BrandingService] Error updating tenant:', error);
    throw new Error(`Failed to update tenant: ${error.message}`);
  }

  console.log('✅ [BrandingService] Tenant updated:', tenantId);
  return data as TenantBranding;
}

/**
 * Verwijder een tenant (soft delete via is_active)
 */
export async function deactivateTenant(tenantId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabase()
    .from('tenants') as any)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', tenantId);

  if (error) {
    console.error('❌ [BrandingService] Error deactivating tenant:', error);
    throw new Error(`Failed to deactivate tenant: ${error.message}`);
  }

  console.log('✅ [BrandingService] Tenant deactivated:', tenantId);
}

/**
 * Check of een tenant ID beschikbaar is
 */
export async function isTenantIdAvailable(tenantId: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabase()
    .from('tenants') as any)
    .select('id')
    .eq('id', tenantId)
    .maybeSingle();

  if (error) {
    console.error('❌ [BrandingService] Error checking tenant ID:', error);
    throw new Error(`Failed to check tenant ID: ${error.message}`);
  }

  return data === null;
}

/**
 * Helper: Genereer donkere kleurvariant
 */
export function generateDarkColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Darken by 15%
  const factor = 0.85;
  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Helper: Genereer lichte kleurvariant
 */
export function generateLightColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Lighten by mixing with white (30%)
  const factor = 0.3;
  const newR = Math.round(r + (255 - r) * factor);
  const newG = Math.round(g + (255 - g) * factor);
  const newB = Math.round(b + (255 - b) * factor);

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// ========================================
// BRANDING COST LOGGING (v2.4)
// ========================================

export interface BrandingOperationLog {
  tenantId: string;
  operationType: 'fun_facts' | 'url_extraction';
  sourceFile?: string;
  sourceUrl?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  extractedData: unknown;
  durationMs: number;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Log een branding operatie (bijv. fun facts extractie) naar de database
 * voor kosten tracking
 */
export async function logBrandingOperation(params: BrandingOperationLog): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (getSupabase()
      .from('branding_logs') as any)
      .insert({
        tenant_id: params.tenantId,
        operation_type: params.operationType,
        source_file: params.sourceFile || null,
        source_url: params.sourceUrl || null,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
        cost_usd: params.costUsd,
        extracted_data: params.extractedData,
        duration_ms: params.durationMs,
        success: params.success ?? true,
        error_message: params.errorMessage || null,
      });

    if (error) {
      console.error('❌ [BrandingService] Failed to log branding operation:', error);
      // Don't throw - logging failures shouldn't break the main flow
    } else {
      console.log(`💰 [BrandingService] Logged ${params.operationType} operation: $${params.costUsd.toFixed(6)}`);
    }
  } catch (err) {
    console.error('❌ [BrandingService] Error logging branding operation:', err);
    // Don't throw - logging failures shouldn't break the main flow
  }
}

/**
 * Bereken de kosten voor een GPT-4o API call
 * Prijzen: $2.50 per 1M input tokens, $10 per 1M output tokens
 */
export function calculateGPT4oCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens * 2.5) / 1_000_000;
  const outputCost = (outputTokens * 10) / 1_000_000;
  return inputCost + outputCost;
}

/**
 * Schat het aantal tokens in een tekst (ruwe schatting: ~4 chars per token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
