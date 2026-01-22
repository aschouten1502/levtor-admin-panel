'use client';

/**
 * ========================================
 * TENANT PROVIDER
 * ========================================
 *
 * React context provider for multi-tenant configuration.
 * Fetches tenant branding from the API and provides it to all components.
 *
 * FEATURES:
 * - Automatic tenant detection from URL query params
 * - CSS variables injection for dynamic theming
 * - Loading state handling
 * - Error state with fallback branding
 *
 * USAGE:
 * ```tsx
 * // In layout.tsx
 * <TenantProvider>
 *   {children}
 * </TenantProvider>
 *
 * // In any component
 * const { tenant, isLoading } = useTenant();
 * ```
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import type { TenantConfig, LanguageTexts, UITexts, LanguageCode } from '@/lib/shared/tenant-config';
import { adjustColorBrightness } from '@/lib/ui/color-utils';

// Re-export types for backwards compatibility
export type { TenantConfig, LanguageTexts, UITexts, LanguageCode };

interface TenantContextValue {
  tenant: TenantConfig | null;
  tenantId: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Default tenant config (fallback)
const DEFAULT_TENANT: TenantConfig = {
  id: 'default',
  name: 'HR Assistant',
  short_name: null,
  tagline: null,
  description: null,
  logo_url: null,
  favicon_url: null,
  icon_url: null,
  primary_color: '#8B5CF6',
  primary_dark: null,
  primary_light: null,
  secondary_color: null,
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
  contact_email: null,
  is_active: true
};

// ========================================
// CONTEXT
// ========================================

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  tenantId: null,
  isLoading: true,
  error: null,
  refetch: async () => {}
});

// ========================================
// CSS VARIABLES INJECTION
// ========================================

function injectCssVariables(config: TenantConfig): void {
  const root = document.documentElement;

  // Primary colors
  root.style.setProperty('--tenant-primary-color', config.primary_color);
  root.style.setProperty('--tenant-secondary-color', config.secondary_color || config.primary_color);

  // Computed variants (use tenant values or compute from primary)
  const primaryDark = config.primary_dark || adjustColorBrightness(config.primary_color, -20);
  const primaryLight = config.primary_light || adjustColorBrightness(config.primary_color, 20);

  root.style.setProperty('--tenant-primary-dark', primaryDark);
  root.style.setProperty('--tenant-primary-light', primaryLight);

  // Background and surface colors
  root.style.setProperty('--tenant-background-color', config.background_color || '#FFFFFF');
  root.style.setProperty('--tenant-surface-color', config.surface_color || '#F9FAFB');

  // Text colors
  root.style.setProperty('--tenant-text-primary', config.text_primary || '#111827');
  root.style.setProperty('--tenant-text-secondary', config.text_secondary || '#6B7280');
  root.style.setProperty('--tenant-text-tertiary', config.text_tertiary || '#9CA3AF');

  // Scrollbar colors - subtle version of primary color
  root.style.setProperty('--scrollbar-color', adjustColorBrightness(config.primary_color, 30));
  root.style.setProperty('--scrollbar-color-hover', config.primary_color);

  console.log(`[TenantProvider] CSS variables injected for ${config.name}`);
}

// ========================================
// PROVIDER COMPONENT
// ========================================

interface TenantProviderProps {
  children: ReactNode;
  initialTenantId?: string;
}

export function TenantProvider({ children, initialTenantId }: TenantProviderProps) {
  const searchParams = useSearchParams();
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(initialTenantId || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detect tenant ID from URL or props
  useEffect(() => {
    const queryTenantId = searchParams.get('tenant');
    if (queryTenantId) {
      setTenantId(queryTenantId);
    } else if (initialTenantId) {
      setTenantId(initialTenantId);
    }
  }, [searchParams, initialTenantId]);

  // Fetch tenant config
  const fetchTenantConfig = async () => {
    if (!tenantId) {
      // No tenant ID - use defaults
      setTenant(DEFAULT_TENANT);
      injectCssVariables(DEFAULT_TENANT);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Add cache-busting timestamp to ensure fresh data
      const response = await fetch(`/api/tenant?tenant=${encodeURIComponent(tenantId)}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tenant config');
      }

      const config = data.tenant as TenantConfig;
      setTenant(config);
      injectCssVariables(config);

      console.log(`[TenantProvider] Loaded tenant: ${config.name} (${config.id})`);
    } catch (err: any) {
      console.error('[TenantProvider] Error loading tenant:', err);
      setError(err.message);

      // Use default config on error
      setTenant(DEFAULT_TENANT);
      injectCssVariables(DEFAULT_TENANT);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount and when tenantId changes
  useEffect(() => {
    fetchTenantConfig();
  }, [tenantId]);

  const value: TenantContextValue = {
    tenant,
    tenantId,
    isLoading,
    error,
    refetch: fetchTenantConfig
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

// ========================================
// HOOK
// ========================================

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

// ========================================
// HELPER COMPONENTS
// ========================================

/**
 * Component that shows content only when tenant is loaded
 */
export function TenantReady({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const { isLoading, tenant } = useTenant();

  if (isLoading) {
    return fallback || null;
  }

  if (!tenant) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Component that displays tenant-branded logo
 */
export function TenantLogo({ className }: { className?: string }) {
  const { tenant, isLoading } = useTenant();

  if (isLoading || !tenant) {
    return null;
  }

  if (tenant.logo_url) {
    return (
      <img
        src={tenant.logo_url}
        alt={tenant.name}
        className={className}
      />
    );
  }

  // Fallback to text
  return (
    <span className={className} style={{ color: tenant.primary_color }}>
      {tenant.name}
    </span>
  );
}
