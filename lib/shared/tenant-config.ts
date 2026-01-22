/**
 * ========================================
 * TENANT CONFIGURATION
 * ========================================
 *
 * Haalt tenant configuratie (branding, kleuren, etc.) uit de database.
 * Gebruikt caching om database queries te minimaliseren.
 *
 * GEBRUIK:
 * ```typescript
 * const config = await getTenantConfig('acme-corp');
 * console.log(config.name); // "Acme Corporation"
 * console.log(config.primary_color); // "#FF5733"
 * ```
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { adjustColorBrightness } from '@/lib/ui/color-utils';

// ========================================
// TYPES
// ========================================

export interface LanguageTexts {
  appTitle: string;
  appSubtitle: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  languageHint: string;
  exampleLabel: string;
  examples: string[];
  inputPlaceholder: string;
  citationsLabel: string;
  pageLabel: string;
  viewButton: string;
}

export type LanguageCode = 'nl' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'pl' | 'tr' | 'ar' | 'zh' | 'pt' | 'ro';

export interface UITexts {
  [key: string]: LanguageTexts;
}

export interface TenantConfig {
  id: string;
  name: string;
  short_name: string | null;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  icon_url: string | null;
  primary_color: string;
  primary_dark: string | null;
  primary_light: string | null;
  secondary_color: string | null;
  background_color: string | null;
  surface_color: string | null;
  text_primary: string | null;
  text_secondary: string | null;
  text_tertiary: string | null;
  input_border_color: string | null;
  send_button_color: string | null;
  language_hint_color: string | null;
  header_gradient_start: string | null;
  header_gradient_end: string | null;
  background_pattern_type: 'text' | 'logo' | null;
  background_pattern_text: string | null;
  background_pattern_opacity: number | null;
  background_pattern_scale: 'small' | 'medium' | 'large' | null;
  background_pattern_density: 'low' | 'medium' | 'high' | null;
  background_pattern_color_mode: 'grayscale' | 'original' | 'tinted' | null;
  fun_facts_enabled: boolean;
  fun_facts_prefix: string | null;
  fun_facts: string[] | null;
  show_powered_by: boolean;
  enable_feedback: boolean;
  ui_texts: UITexts | null;
  welcome_message: string | null;
  contact_email: string | null;
  is_active: boolean;
}

export interface TenantConfigResult {
  success: boolean;
  config?: TenantConfig;
  error?: string;
  fromCache?: boolean;
}

// ========================================
// CACHE
// ========================================

interface CacheEntry {
  config: TenantConfig;
  timestamp: number;
}

// In-memory cache for tenant configurations
const tenantCache = new Map<string, CacheEntry>();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Clear the tenant config cache
 * Useful when tenant settings are updated
 */
export function clearTenantCache(tenantId?: string): void {
  if (tenantId) {
    tenantCache.delete(tenantId);
    console.log(`🗑️ [TenantConfig] Cache cleared for tenant: ${tenantId}`);
  } else {
    tenantCache.clear();
    console.log('🗑️ [TenantConfig] All tenant cache cleared');
  }
}

// ========================================
// SUPABASE CLIENT
// ========================================

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      console.warn('⚠️ [TenantConfig] Supabase not configured');
      return null;
    }

    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

// ========================================
// MAIN FUNCTION
// ========================================

/**
 * Get tenant configuration from database with caching
 *
 * @param tenantId - The tenant ID to look up
 * @param bypassCache - Force a fresh fetch from database
 * @returns TenantConfigResult with config or error
 */
export async function getTenantConfig(
  tenantId: string,
  bypassCache: boolean = false
): Promise<TenantConfigResult> {
  if (!tenantId) {
    return { success: false, error: 'No tenant ID provided' };
  }

  // Check cache first (unless bypassing)
  if (!bypassCache) {
    const cached = tenantCache.get(tenantId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`📦 [TenantConfig] Cache hit for tenant: ${tenantId}`);
      return { success: true, config: cached.config, fromCache: true };
    }
  }

  // Fetch from database
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    console.log(`🔍 [TenantConfig] Fetching config for tenant: ${tenantId}`);

    const { data, error } = await supabase
      .from('tenants')
      .select(`
        id, name, short_name, tagline, description,
        logo_url, favicon_url, icon_url,
        primary_color, primary_dark, primary_light, secondary_color,
        background_color, surface_color,
        text_primary, text_secondary, text_tertiary,
        input_border_color, send_button_color, language_hint_color,
        header_gradient_start, header_gradient_end,
        background_pattern_type, background_pattern_text,
        background_pattern_opacity, background_pattern_scale,
        background_pattern_density, background_pattern_color_mode,
        fun_facts_enabled, fun_facts_prefix, fun_facts,
        show_powered_by, enable_feedback,
        ui_texts, welcome_message, contact_email, is_active
      `)
      .eq('id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: `Tenant '${tenantId}' not found` };
      }
      return { success: false, error: error.message };
    }

    if (!data.is_active) {
      return { success: false, error: `Tenant '${tenantId}' is not active` };
    }

    // Build config with defaults
    const config: TenantConfig = {
      id: data.id,
      name: data.name,
      short_name: data.short_name,
      tagline: data.tagline,
      description: data.description,
      logo_url: data.logo_url,
      favicon_url: data.favicon_url,
      icon_url: data.icon_url,
      primary_color: data.primary_color || '#8B5CF6',
      primary_dark: data.primary_dark,
      primary_light: data.primary_light,
      secondary_color: data.secondary_color,
      background_color: data.background_color,
      surface_color: data.surface_color,
      text_primary: data.text_primary,
      text_secondary: data.text_secondary,
      text_tertiary: data.text_tertiary,
      input_border_color: data.input_border_color,
      send_button_color: data.send_button_color,
      language_hint_color: data.language_hint_color,
      header_gradient_start: data.header_gradient_start,
      header_gradient_end: data.header_gradient_end,
      background_pattern_type: data.background_pattern_type,
      background_pattern_text: data.background_pattern_text,
      background_pattern_opacity: data.background_pattern_opacity,
      background_pattern_scale: data.background_pattern_scale,
      background_pattern_density: data.background_pattern_density,
      background_pattern_color_mode: data.background_pattern_color_mode,
      fun_facts_enabled: data.fun_facts_enabled ?? true,
      fun_facts_prefix: data.fun_facts_prefix,
      fun_facts: data.fun_facts,
      show_powered_by: data.show_powered_by ?? true,
      enable_feedback: data.enable_feedback ?? false,
      ui_texts: data.ui_texts,
      welcome_message: data.welcome_message,
      contact_email: data.contact_email,
      is_active: data.is_active
    };

    // Update cache
    tenantCache.set(tenantId, {
      config,
      timestamp: Date.now()
    });

    console.log(`✅ [TenantConfig] Config loaded for tenant: ${tenantId} (${data.name})`);

    return { success: true, config, fromCache: false };
  } catch (err: any) {
    console.error(`❌ [TenantConfig] Error fetching config:`, err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get CSS variables for tenant branding
 * Can be used to inject into HTML or React components
 */
export function getTenantCssVariables(config: TenantConfig): Record<string, string> {
  return {
    '--tenant-primary-color': config.primary_color,
    '--tenant-primary-dark': config.primary_dark || adjustColorBrightness(config.primary_color, -20),
    '--tenant-primary-light': config.primary_light || adjustColorBrightness(config.primary_color, 20),
    '--tenant-secondary-color': config.secondary_color || config.primary_color,
    '--tenant-background-color': config.background_color || '#FFFFFF',
    '--tenant-surface-color': config.surface_color || '#F9FAFB',
    '--tenant-text-primary': config.text_primary || '#111827',
    '--tenant-text-secondary': config.text_secondary || '#6B7280',
    '--tenant-text-tertiary': config.text_tertiary || '#9CA3AF',
    // Scrollbar colors - use primary color with adjusted opacity/brightness
    '--scrollbar-color': adjustColorBrightness(config.primary_color, 30),  // Lighter version
    '--scrollbar-color-hover': config.primary_color,  // Full color on hover
  };
}

/**
 * Get tenant config with fallback to environment variables
 * Useful during migration period
 */
export async function getTenantConfigWithFallback(
  tenantId: string
): Promise<TenantConfig> {
  const result = await getTenantConfig(tenantId);

  if (result.success && result.config) {
    return result.config;
  }

  // Fallback to environment variables
  console.warn(`⚠️ [TenantConfig] Using env fallback for tenant: ${tenantId}`);

  return {
    id: tenantId,
    name: process.env.NEXT_PUBLIC_COMPANY_NAME || tenantId,
    short_name: null,
    tagline: null,
    description: null,
    logo_url: process.env.NEXT_PUBLIC_LOGO_URL || null,
    favicon_url: null,
    icon_url: null,
    primary_color: process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#8B5CF6',
    primary_dark: null,
    primary_light: null,
    secondary_color: process.env.NEXT_PUBLIC_SECONDARY_COLOR || null,
    background_color: null,
    surface_color: null,
    text_primary: null,
    text_secondary: null,
    text_tertiary: null,
    input_border_color: null,
    send_button_color: null,
    language_hint_color: null,
    header_gradient_start: null,
    header_gradient_end: null,
    background_pattern_type: null,
    background_pattern_text: null,
    background_pattern_opacity: null,
    background_pattern_scale: null,
    background_pattern_density: null,
    background_pattern_color_mode: null,
    fun_facts_enabled: true,
    fun_facts_prefix: null,
    fun_facts: null,
    show_powered_by: true,
    enable_feedback: false,
    ui_texts: null,
    welcome_message: null,
    contact_email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || null,
    is_active: true
  };
}
