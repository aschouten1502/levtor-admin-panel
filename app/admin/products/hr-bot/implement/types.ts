/**
 * Types for embed configuration
 */

export interface EmbedConfig {
  width: string;
  widthUnit: 'px' | '%';
  height: string;
  heightUnit: 'px' | 'vh';
  language: string;
  borderRadius: number;
  shadow: boolean;
  hideHeader: boolean;
  hidePoweredBy: boolean;
}

export const DEFAULT_EMBED_CONFIG: EmbedConfig = {
  width: '400',
  widthUnit: 'px',
  height: '600',
  heightUnit: 'px',
  language: 'nl',
  borderRadius: 16,
  shadow: true,
  hideHeader: false,
  hidePoweredBy: false,
};
