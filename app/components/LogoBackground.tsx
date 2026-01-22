'use client';

import { BRANDING } from '@/lib/shared/branding.config';
import { useTenant } from '../providers/TenantProvider';

// ========================================
// MAPPING FUNCTIONS
// ========================================

type PatternScale = 'small' | 'medium' | 'large';
type PatternDensity = 'low' | 'medium' | 'high';
type PatternColorMode = 'grayscale' | 'original' | 'tinted';

/**
 * Get scale classes for logo pattern
 */
function getLogoScaleClasses(scale: PatternScale): string {
  switch (scale) {
    case 'small':
      return 'w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12';
    case 'large':
      return 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28';
    default: // medium
      return 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20';
  }
}

/**
 * Get scale classes for text pattern
 */
function getTextScaleClasses(scale: PatternScale): string {
  switch (scale) {
    case 'small':
      return 'text-xl sm:text-2xl md:text-3xl';
    case 'large':
      return 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl';
    default: // medium
      return 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl';
  }
}

/**
 * Get density configuration for logo pattern
 */
function getLogoDensityConfig(density: PatternDensity): {
  itemCount: number;
  gridClasses: string;
  gapClasses: string;
} {
  switch (density) {
    case 'low':
      return {
        itemCount: 48,
        gridClasses: 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10',
        gapClasses: 'gap-8 sm:gap-10 md:gap-12 lg:gap-16'
      };
    case 'high':
      return {
        itemCount: 144,
        gridClasses: 'grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16',
        gapClasses: 'gap-4 sm:gap-6 md:gap-8 lg:gap-10'
      };
    default: // medium
      return {
        itemCount: 90,
        gridClasses: 'grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12',
        gapClasses: 'gap-6 sm:gap-8 md:gap-10 lg:gap-12'
      };
  }
}

/**
 * Get density configuration for text pattern
 */
function getTextDensityConfig(density: PatternDensity): {
  itemCount: number;
  gridClasses: string;
  gapClasses: string;
} {
  switch (density) {
    case 'low':
      return {
        itemCount: 20,
        gridClasses: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
        gapClasses: 'gap-16 sm:gap-20 md:gap-24 lg:gap-28'
      };
    case 'high':
      return {
        itemCount: 60,
        gridClasses: 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8',
        gapClasses: 'gap-8 sm:gap-12 md:gap-16 lg:gap-20'
      };
    default: // medium
      return {
        itemCount: 40,
        gridClasses: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6',
        gapClasses: 'gap-12 sm:gap-16 md:gap-20 lg:gap-24'
      };
  }
}

/**
 * Convert hex color to hue rotation degree for CSS filter
 */
function hexToHueRotation(hex: string): number {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Convert to HSL
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;

  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Convert to degrees and adjust for sepia base (which is ~30deg)
  return Math.round(h * 360) - 30;
}

/**
 * Get CSS filter for logo color mode
 */
function getColorFilter(mode: PatternColorMode, primaryColor: string): string {
  switch (mode) {
    case 'original':
      return 'none';
    case 'tinted':
      const hueRotation = hexToHueRotation(primaryColor);
      return `grayscale(100%) sepia(100%) saturate(200%) hue-rotate(${hueRotation}deg)`;
    default: // grayscale
      return 'grayscale(100%)';
  }
}

// ========================================
// COMPONENT
// ========================================

export const LogoBackground = () => {
  const { tenant } = useTenant();

  // Get background pattern settings from tenant or defaults
  const patternType = tenant?.background_pattern_type || 'text';
  const patternText = tenant?.background_pattern_text || tenant?.name || 'DEMO';
  const logoUrl = tenant?.logo_url || BRANDING.logo.main;
  const primaryColor = tenant?.primary_color || BRANDING.colors.primary;

  // New configurable settings with defaults
  const scale = (tenant?.background_pattern_scale || 'medium') as PatternScale;
  const density = (tenant?.background_pattern_density || 'medium') as PatternDensity;
  const colorMode = (tenant?.background_pattern_color_mode || 'grayscale') as PatternColorMode;

  // Opacity: use tenant value or default (15 for text, 8 for logo)
  const isLogoPattern = patternType === 'logo' && logoUrl;
  const defaultOpacity = isLogoPattern ? 8 : 15;
  const opacity = (tenant?.background_pattern_opacity ?? defaultOpacity) / 100;

  // For logo pattern
  if (isLogoPattern) {
    const densityConfig = getLogoDensityConfig(density);
    const scaleClasses = getLogoScaleClasses(scale);
    const colorFilter = getColorFilter(colorMode, primaryColor);
    const items = Array.from({ length: densityConfig.itemCount }, (_, i) => i);

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}15 0%, #ffffff 50%, ${primaryColor}10 100%)`
          }}
        />

        {/* Logo pattern grid */}
        <div className={`absolute inset-0 grid ${densityConfig.gridClasses} ${densityConfig.gapClasses}
                        p-6 sm:p-8 md:p-10 lg:p-12 place-items-center`}>
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
                src={logoUrl}
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

  // Text pattern (default) - watermark style
  const densityConfig = getTextDensityConfig(density);
  const scaleClasses = getTextScaleClasses(scale);
  const items = Array.from({ length: densityConfig.itemCount }, (_, i) => i);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Clean white background */}
      <div className="absolute inset-0 bg-white" />

      {/* Text watermark pattern */}
      <div className={`absolute inset-0 grid ${densityConfig.gridClasses} ${densityConfig.gapClasses}
                      p-8 sm:p-12 md:p-16 lg:p-20 place-items-center`}>
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
              {patternText.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
