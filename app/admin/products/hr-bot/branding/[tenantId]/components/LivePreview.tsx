'use client';

import { useState } from 'react';
import { TenantBranding, DEFAULT_UI_TEXTS, DEFAULT_COLORS } from '@/lib/admin/branding-types';
import { adjustColorBrightness } from '@/lib/ui/color-utils';

interface LivePreviewProps {
  tenant: TenantBranding;
  onElementClick: (fieldName: string) => void;
}

// Device types for preview
type DeviceType = 'desktop' | 'tablet' | 'mobile';

// Device configurations
const DEVICE_CONFIG = {
  desktop: {
    label: 'Desktop',
    icon: '🖥️',
    width: 'w-full',
    maxWidth: 'max-w-none',
    minHeight: 'min-h-[500px]',
  },
  tablet: {
    label: 'Tablet',
    icon: '📱',
    width: 'w-[768px]',
    maxWidth: 'max-w-[768px]',
    minHeight: 'min-h-[600px]',
  },
  mobile: {
    label: 'Mobiel',
    icon: '📱',
    width: 'w-[375px]',
    maxWidth: 'max-w-[375px]',
    minHeight: 'min-h-[667px]',
  },
};

// ========================================
// BACKGROUND PATTERN MAPPING FUNCTIONS
// EXACT same values as LogoBackground.tsx, but selecting the right
// breakpoint value based on device type to simulate responsive behavior
// ========================================

type PatternScale = 'small' | 'medium' | 'large';
type PatternDensity = 'low' | 'medium' | 'high';
type PatternColorMode = 'grayscale' | 'original' | 'tinted';

/**
 * Get scale classes for logo pattern per device
 * Maps to LogoBackground.tsx responsive breakpoints:
 * - mobile: base (no prefix)
 * - tablet: sm: breakpoint
 * - desktop: lg: breakpoint
 */
function getLogoScaleClasses(scale: PatternScale, device: DeviceType): string {
  // LogoBackground.tsx values:
  // small:  'w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12'
  // medium: 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20'
  // large:  'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28'
  const scales = {
    mobile: {
      small: 'w-8 h-8',      // base
      medium: 'w-12 h-12',   // base
      large: 'w-16 h-16',    // base
    },
    tablet: {
      small: 'w-12 h-12',    // md:
      medium: 'w-16 h-16',   // md:
      large: 'w-24 h-24',    // md:
    },
    desktop: {
      small: 'w-12 h-12',    // md: (no lg for small)
      medium: 'w-20 h-20',   // lg:
      large: 'w-28 h-28',    // lg:
    },
  };
  return scales[device][scale];
}

/**
 * Get scale classes for text pattern per device
 * Maps to LogoBackground.tsx responsive breakpoints
 */
function getTextScaleClasses(scale: PatternScale, device: DeviceType): string {
  // LogoBackground.tsx values:
  // small:  'text-xl sm:text-2xl md:text-3xl'
  // medium: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl'
  // large:  'text-5xl sm:text-6xl md:text-7xl lg:text-8xl'
  const scales = {
    mobile: {
      small: 'text-xl',      // base
      medium: 'text-3xl',    // base
      large: 'text-5xl',     // base
    },
    tablet: {
      small: 'text-3xl',     // md:
      medium: 'text-5xl',    // md:
      large: 'text-7xl',     // md:
    },
    desktop: {
      small: 'text-3xl',     // md: (no lg for small)
      medium: 'text-6xl',    // lg:
      large: 'text-8xl',     // lg:
    },
  };
  return scales[device][scale];
}

/**
 * Get density configuration for logo pattern per device
 * SAME itemCount as LogoBackground.tsx, but selecting correct grid breakpoint
 */
function getLogoDensityConfig(density: PatternDensity, device: DeviceType): {
  itemCount: number;
  gridClasses: string;
  gapClasses: string;
} {
  // LogoBackground.tsx values:
  // low:    itemCount: 48,  'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10'
  // medium: itemCount: 90,  'grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12'
  // high:   itemCount: 144, 'grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16'
  const configs = {
    mobile: {
      low:    { itemCount: 48,  gridClasses: 'grid-cols-4',  gapClasses: 'gap-8' },
      medium: { itemCount: 90,  gridClasses: 'grid-cols-6',  gapClasses: 'gap-6' },
      high:   { itemCount: 144, gridClasses: 'grid-cols-8',  gapClasses: 'gap-4' },
    },
    tablet: {
      low:    { itemCount: 48,  gridClasses: 'grid-cols-8',  gapClasses: 'gap-12' },
      medium: { itemCount: 90,  gridClasses: 'grid-cols-10', gapClasses: 'gap-10' },
      high:   { itemCount: 144, gridClasses: 'grid-cols-12', gapClasses: 'gap-8' },
    },
    desktop: {
      low:    { itemCount: 48,  gridClasses: 'grid-cols-10', gapClasses: 'gap-16' },
      medium: { itemCount: 90,  gridClasses: 'grid-cols-12', gapClasses: 'gap-12' },
      high:   { itemCount: 144, gridClasses: 'grid-cols-16', gapClasses: 'gap-10' },
    },
  };
  return configs[device][density];
}

/**
 * Get density configuration for text pattern per device
 * SAME itemCount as LogoBackground.tsx, but selecting correct grid breakpoint
 */
function getTextDensityConfig(density: PatternDensity, device: DeviceType): {
  itemCount: number;
  gridClasses: string;
  gapClasses: string;
} {
  // LogoBackground.tsx values:
  // low:    itemCount: 20, 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
  // medium: itemCount: 40, 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
  // high:   itemCount: 60, 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8'
  const configs = {
    mobile: {
      low:    { itemCount: 20, gridClasses: 'grid-cols-2', gapClasses: 'gap-16' },
      medium: { itemCount: 40, gridClasses: 'grid-cols-3', gapClasses: 'gap-12' },
      high:   { itemCount: 60, gridClasses: 'grid-cols-4', gapClasses: 'gap-8' },
    },
    tablet: {
      low:    { itemCount: 20, gridClasses: 'grid-cols-4', gapClasses: 'gap-24' },
      medium: { itemCount: 40, gridClasses: 'grid-cols-5', gapClasses: 'gap-20' },
      high:   { itemCount: 60, gridClasses: 'grid-cols-6', gapClasses: 'gap-16' },
    },
    desktop: {
      low:    { itemCount: 20, gridClasses: 'grid-cols-4', gapClasses: 'gap-28' },
      medium: { itemCount: 40, gridClasses: 'grid-cols-6', gapClasses: 'gap-24' },
      high:   { itemCount: 60, gridClasses: 'grid-cols-8', gapClasses: 'gap-20' },
    },
  };
  return configs[device][density];
}

/**
 * Convert hex color to hue rotation degree for CSS filter
 */
function hexToHueRotation(hex: string): number {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;

  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return Math.round(h * 360) - 30;
}

/**
 * Get CSS filter for logo color mode
 */
function getColorFilter(mode: PatternColorMode, primaryColor: string): string {
  switch (mode) {
    case 'original': return 'none';
    case 'tinted':
      const hueRotation = hexToHueRotation(primaryColor);
      return `grayscale(100%) sepia(100%) saturate(200%) hue-rotate(${hueRotation}deg)`;
    default: // grayscale
      return 'grayscale(100%)';
  }
}

/**
 * Get padding for pattern grids per device
 * Maps to LogoBackground.tsx responsive breakpoints
 */
function getPatternPadding(isLogo: boolean, device: DeviceType): string {
  if (isLogo) {
    // LogoBackground: p-6 sm:p-8 md:p-10 lg:p-12
    const padding = { mobile: 'p-6', tablet: 'p-10', desktop: 'p-12' };
    return padding[device];
  }
  // Text: p-8 sm:p-12 md:p-16 lg:p-20
  const padding = { mobile: 'p-8', tablet: 'p-16', desktop: 'p-20' };
  return padding[device];
}

/**
 * Live Preview Component
 * Shows a static preview of the chatbot with clickable elements
 * Each element has a data-field attribute that maps to the settings form
 * Supports device preview tabs (Desktop | Tablet | Mobile)
 */
export default function LivePreview({ tenant, onElementClick }: LivePreviewProps) {
  // Device preview state
  const [activeDevice, setActiveDevice] = useState<DeviceType>('desktop');

  // Get colors with fallbacks
  const colors = {
    primary: tenant.primary_color || DEFAULT_COLORS.primary,
    primaryDark: tenant.primary_dark || adjustColorBrightness(tenant.primary_color || DEFAULT_COLORS.primary, -15),
    secondary: tenant.secondary_color || DEFAULT_COLORS.secondary,
    background: tenant.background_color || DEFAULT_COLORS.background,
    surface: tenant.surface_color || DEFAULT_COLORS.surface,
    textPrimary: tenant.text_primary || DEFAULT_COLORS.textPrimary,
    textSecondary: tenant.text_secondary || DEFAULT_COLORS.textSecondary,
  };

  // Get texts with fallbacks
  const texts = tenant.ui_texts?.nl || DEFAULT_UI_TEXTS;

  // Click handler wrapper
  const handleClick = (fieldName: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onElementClick(fieldName);
  };

  return (
    <div className="flex flex-col">
      {/* Device Preview Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {(['desktop', 'tablet', 'mobile'] as DeviceType[]).map((device) => (
          <button
            key={device}
            type="button"
            onClick={() => setActiveDevice(device)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all
              ${activeDevice === device
                ? 'bg-white shadow text-purple-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            <span className="mr-1.5">{DEVICE_CONFIG[device].icon}</span>
            {DEVICE_CONFIG[device].label}
          </button>
        ))}
      </div>

      {/* Preview Container - centered with device-specific width */}
      <div className="flex justify-center bg-gray-100 rounded-xl p-4 min-h-[550px]">
        <div
          className={`${DEVICE_CONFIG[activeDevice].width} ${DEVICE_CONFIG[activeDevice].maxWidth} transition-all duration-300 ease-in-out`}
        >
          {/* Actual Preview */}
          <div
            className="rounded-xl overflow-hidden shadow-2xl border border-gray-200"
            style={{ backgroundColor: colors.background }}
          >
      {/* Header */}
      <div
        className="preview-element p-4 cursor-pointer hover:ring-2 hover:ring-purple-400 hover:ring-offset-2 transition-all"
        style={{ background: `linear-gradient(to right, ${tenant.header_gradient_start || colors.primary}, ${tenant.header_gradient_end || colors.primaryDark})` }}
        onClick={handleClick('header_gradient_start')}
        data-field="header_gradient_start"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div
              className="preview-element bg-white rounded-lg p-2 cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all"
              onClick={handleClick('logo_url')}
              data-field="logo_url"
            >
              {tenant.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="h-6 w-auto"
                  style={{ maxHeight: '24px' }}
                />
              ) : (
                <span
                  className="text-sm font-bold px-2"
                  style={{ color: colors.primary }}
                >
                  {tenant.short_name || tenant.name.substring(0, 10)}
                </span>
              )}
            </div>

            {/* App Title */}
            <div
              className="preview-element cursor-pointer hover:ring-2 hover:ring-yellow-400 rounded px-1 transition-all"
              onClick={handleClick('appTitle')}
              data-field="appTitle"
            >
              <h1 className="text-white text-sm font-bold">{texts.appTitle}</h1>
              <p className="text-white/80 text-xs">{texts.appSubtitle}</p>
            </div>
          </div>

          {/* Language Selector (static) */}
          <div className="bg-white/20 rounded-full px-3 py-1 text-white text-xs flex items-center gap-1">
            <span>🇳🇱</span>
            <span className="hidden sm:inline">NL</span>
          </div>
        </div>
      </div>

      {/* Background Pattern Preview */}
      <div
        className="preview-element relative p-6 min-h-[400px] cursor-pointer hover:ring-2 hover:ring-purple-400 hover:ring-inset transition-all"
        style={{ backgroundColor: colors.surface }}
        onClick={handleClick('background_pattern_type')}
        data-field="background_pattern_type"
      >
        {/* Watermark Pattern - device-specific rendering */}
        {(() => {
          const patternType = tenant.background_pattern_type || 'text';
          const isLogo = patternType === 'logo' && tenant.logo_url;
          const scale = (tenant.background_pattern_scale || 'medium') as PatternScale;
          const density = (tenant.background_pattern_density || 'medium') as PatternDensity;
          const colorMode = (tenant.background_pattern_color_mode || 'grayscale') as PatternColorMode;

          // Opacity: use tenant value or default (15 for text, 8 for logo)
          const defaultOpacity = isLogo ? 8 : 15;
          const opacity = (tenant.background_pattern_opacity ?? defaultOpacity) / 100;

          if (isLogo) {
            const densityConfig = getLogoDensityConfig(density, activeDevice);
            const scaleClasses = getLogoScaleClasses(scale, activeDevice);
            const colorFilter = getColorFilter(colorMode, colors.primary);
            const items = Array.from({ length: densityConfig.itemCount }, (_, i) => i);

            return (
              <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {/* Gradient background - same as LogoBackground.tsx */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}15 0%, #ffffff 50%, ${colors.primary}10 100%)`
                  }}
                />

                {/* Logo pattern grid - device-specific */}
                <div className={`absolute inset-0 grid ${densityConfig.gridClasses} ${densityConfig.gapClasses} ${getPatternPadding(true, activeDevice)} place-items-center`}>
                  {items.map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-center"
                      style={{
                        opacity: opacity,
                        transform: `rotate(${(i % 2) * 5 - 2.5}deg)`
                      }}
                    >
                      <img
                        src={tenant.logo_url!}
                        alt=""
                        className={`${scaleClasses} object-contain`}
                        style={{ filter: colorFilter }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Text pattern (default) - device-specific
          const densityConfig = getTextDensityConfig(density, activeDevice);
          const scaleClasses = getTextScaleClasses(scale, activeDevice);
          const items = Array.from({ length: densityConfig.itemCount }, (_, i) => i);

          return (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              {/* Clean white background - same as LogoBackground.tsx */}
              <div className="absolute inset-0 bg-white" />

              {/* Text watermark pattern - device-specific */}
              <div className={`absolute inset-0 grid ${densityConfig.gridClasses} ${densityConfig.gapClasses} ${getPatternPadding(false, activeDevice)} place-items-center`}>
                {items.map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center"
                  >
                    <div
                      className={`${scaleClasses} font-black text-gray-200 select-none`}
                      style={{
                        opacity: opacity,
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        letterSpacing: '0.1em'
                      }}
                    >
                      {(tenant.background_pattern_text || tenant.name || 'DEMO').toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Welcome Screen */}
        <div className="relative flex flex-col items-center text-center">
          {/* Avatar Circle */}
          <div
            className="preview-element w-20 h-20 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all"
            style={{ background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.primaryDark})` }}
            onClick={handleClick('primary_color')}
            data-field="primary_color"
          >
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>

          {/* Welcome Title */}
          <div
            className="preview-element mt-4 cursor-pointer hover:ring-2 hover:ring-yellow-400 rounded px-2 py-1 transition-all"
            onClick={handleClick('welcomeTitle')}
            data-field="welcomeTitle"
          >
            <h2
              className="text-xl font-bold"
              style={{ color: colors.textPrimary }}
            >
              {texts.welcomeTitle}
            </h2>
          </div>

          {/* Welcome Subtitle */}
          <div
            className="preview-element mt-2 cursor-pointer hover:ring-2 hover:ring-yellow-400 rounded px-2 py-1 transition-all max-w-xs"
            onClick={handleClick('welcomeSubtitle')}
            data-field="welcomeSubtitle"
          >
            <p
              className="text-xs"
              style={{ color: colors.textSecondary }}
            >
              {texts.welcomeSubtitle}
            </p>
          </div>

          {/* Language Hint - Box kleur apart klikbaar van tekst */}
          <div
            className="preview-element mt-3 px-3 py-2 rounded-lg cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all"
            style={{
              backgroundColor: `${tenant.language_hint_color || colors.primary}10`,
              border: `1px solid ${tenant.language_hint_color || colors.primary}30`
            }}
            onClick={handleClick('language_hint_color')}
            data-field="language_hint_color"
          >
            <p
              className="preview-element text-xs cursor-pointer hover:bg-yellow-50 rounded px-1 transition-all"
              style={{ color: tenant.language_hint_color || colors.primary }}
              onClick={handleClick('languageHint')}
              data-field="languageHint"
            >
              {texts.languageHint}
            </p>
          </div>

          {/* Example Questions */}
          <div className="mt-4 grid grid-cols-2 gap-2 w-full max-w-sm">
            {texts.examples.slice(0, 4).map((example, idx) => (
              <div
                key={idx}
                className="preview-element bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all"
                onClick={handleClick(`examples`)}
                data-field="examples"
              >
                <p className="text-[10px] text-gray-400">{texts.exampleLabel}</p>
                <p className="text-xs mt-1" style={{ color: colors.textPrimary }}>
                  "{example}"
                </p>
              </div>
            ))}
          </div>

          {/* Powered By */}
          {tenant.show_powered_by && (
            <div
              className="preview-element mt-4 cursor-pointer hover:ring-2 hover:ring-yellow-400 rounded px-2 py-1 transition-all"
              onClick={handleClick('show_powered_by')}
              data-field="show_powered_by"
            >
              <p className="text-[10px] text-gray-400">
                Powered by <span className="font-semibold">Levtor</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Split in twee clickable zones */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div
          className="preview-element flex items-center gap-2 border-2 rounded-full px-4 py-2 cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all"
          style={{ borderColor: tenant.input_border_color || colors.primary }}
          onClick={handleClick('input_border_color')}
          data-field="input_border_color"
        >
          {/* Input placeholder - aparte click zone */}
          <span
            className="preview-element flex-1 text-sm text-gray-400 cursor-pointer hover:bg-yellow-50 rounded px-1 transition-all"
            onClick={handleClick('inputPlaceholder')}
            data-field="inputPlaceholder"
          >
            {texts.inputPlaceholder}
          </span>
          {/* Send button - aparte click zone */}
          <div
            className="preview-element w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all"
            style={{ backgroundColor: tenant.send_button_color || colors.primary }}
            onClick={handleClick('send_button_color')}
            data-field="send_button_color"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
        </div>
      </div>

      {/* Fun Facts Preview (Loading State) */}
      {tenant.fun_facts_enabled && tenant.fun_facts && tenant.fun_facts.length > 0 && (
        <div
          className="preview-element p-4 bg-gray-50 border-t border-gray-200 cursor-pointer hover:ring-2 hover:ring-purple-400 hover:ring-inset transition-all"
          onClick={handleClick('fun_facts')}
          data-field="fun_facts"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.primary, animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.secondary, animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.primary, animationDelay: '300ms' }} />
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm">
              <p className="text-xs text-gray-600">
                <span style={{ color: colors.primary }} className="font-medium">
                  💡 {tenant.fun_facts_prefix || 'Wist je dat'}
                </span>{' '}
                {tenant.fun_facts[0]}
              </p>
            </div>
          </div>
        </div>
      )}
          </div>
          {/* End of Actual Preview */}
        </div>
        {/* End of Device Width Container */}
      </div>
      {/* End of Preview Container */}
    </div>
  );
}
