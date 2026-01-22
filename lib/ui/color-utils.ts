/**
 * ========================================
 * COLOR UTILITIES
 * ========================================
 *
 * Gecentraliseerde color utility functions.
 * Vervangt 7 duplicaat implementaties van adjustColorBrightness
 * verspreid door de codebase.
 *
 * GEBRUIK:
 * ```typescript
 * import { adjustColorBrightness, isLightColor } from '@/lib/ui/color-utils';
 *
 * const lighter = adjustColorBrightness('#336699', 40);  // #5b8ebd
 * const darker = adjustColorBrightness('#336699', -40);  // #0b4075
 * const isLight = isLightColor('#FFFFFF');               // true
 * ```
 */

// ========================================
// BRIGHTNESS ADJUSTMENT
// ========================================

/**
 * Past de helderheid van een hex kleur aan.
 *
 * @param hex - Kleur in hex formaat (#RRGGBB of RRGGBB)
 * @param amount - Positief = lichter, negatief = donkerder
 * @returns Aangepaste hex kleur met # prefix
 *
 * @example
 * adjustColorBrightness('#336699', 40)   // Returns: '#5b8ebd'
 * adjustColorBrightness('#336699', -40)  // Returns: '#0b4075'
 */
export function adjustColorBrightness(hex: string, amount: number): string {
  // Remove # if present
  const color = hex.replace('#', '');

  // Validate hex format
  if (!/^[0-9A-Fa-f]{6}$/.test(color)) {
    console.warn(`[ColorUtils] Invalid hex color: ${hex}, returning original`);
    return hex.startsWith('#') ? hex : `#${hex}`;
  }

  // Parse RGB values
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Adjust brightness with clamping to 0-255
  const newR = Math.max(0, Math.min(255, r + amount));
  const newG = Math.max(0, Math.min(255, g + amount));
  const newB = Math.max(0, Math.min(255, b + amount));

  // Convert back to hex with padding
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// ========================================
// COLOR ANALYSIS
// ========================================

/**
 * Bepaalt of een kleur licht of donker is.
 * Gebruikt de YIQ luminance formule.
 *
 * @param hex - Kleur in hex formaat (#RRGGBB of RRGGBB)
 * @returns true als de kleur licht is (luminance > 0.5)
 *
 * @example
 * isLightColor('#FFFFFF')  // Returns: true
 * isLightColor('#000000')  // Returns: false
 * isLightColor('#336699')  // Returns: false
 */
export function isLightColor(hex: string): boolean {
  // Remove # if present
  const color = hex.replace('#', '');

  // Validate hex format
  if (!/^[0-9A-Fa-f]{6}$/.test(color)) {
    return true; // Default to light for invalid colors
  }

  // Parse RGB values
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Calculate YIQ luminance
  // Formula: (0.299 * R + 0.587 * G + 0.114 * B) / 255
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5;
}

/**
 * Bepaalt de beste tekstkleur (zwart of wit) voor een achtergrondkleur.
 *
 * @param backgroundColor - Achtergrondkleur in hex formaat
 * @returns '#000000' voor lichte achtergronden, '#FFFFFF' voor donkere
 *
 * @example
 * getContrastTextColor('#FFFFFF')  // Returns: '#000000'
 * getContrastTextColor('#000000')  // Returns: '#FFFFFF'
 */
export function getContrastTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#000000' : '#FFFFFF';
}

// ========================================
// COLOR CONVERSION
// ========================================

/**
 * Converteert een hex kleur naar RGB object.
 *
 * @param hex - Kleur in hex formaat (#RRGGBB of RRGGBB)
 * @returns Object met r, g, b waarden (0-255)
 *
 * @example
 * hexToRgb('#336699')  // Returns: { r: 51, g: 102, b: 153 }
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const color = hex.replace('#', '');

  if (!/^[0-9A-Fa-f]{6}$/.test(color)) {
    return null;
  }

  return {
    r: parseInt(color.substring(0, 2), 16),
    g: parseInt(color.substring(2, 4), 16),
    b: parseInt(color.substring(4, 6), 16)
  };
}

/**
 * Converteert RGB waarden naar hex string.
 *
 * @param r - Rood (0-255)
 * @param g - Groen (0-255)
 * @param b - Blauw (0-255)
 * @returns Hex kleur met # prefix
 *
 * @example
 * rgbToHex(51, 102, 153)  // Returns: '#336699'
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

/**
 * Converteert een hex kleur naar rgba CSS string.
 *
 * @param hex - Kleur in hex formaat
 * @param alpha - Transparantie (0-1)
 * @returns CSS rgba() string
 *
 * @example
 * hexToRgba('#336699', 0.5)  // Returns: 'rgba(51, 102, 153, 0.5)'
 */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return `rgba(0, 0, 0, ${alpha})`; // Fallback
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
