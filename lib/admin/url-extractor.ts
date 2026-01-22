/**
 * URL Branding Extractor Service (v3.0)
 *
 * Extracts branding information (colors, logo, company name) from a website URL.
 *
 * v3.0 Improvements:
 * - Uses Clearbit Logo API for reliable logo extraction
 * - Uses Google Favicon API as fallback
 * - Still extracts colors and metadata from HTML when possible
 * - Much more reliable for modern SPA websites
 */

import * as cheerio from 'cheerio';

// ========================================
// TYPES
// ========================================

export interface ExtractedBranding {
  name: string | null;
  tagline: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
}

export interface ExtractionResult {
  success: boolean;
  extracted: ExtractedBranding;
  source_url: string;
  errors: string[];
  error_type?: 'BOT_BLOCKED' | 'RATE_LIMITED' | 'TIMEOUT' | 'NETWORK_ERROR' | 'PARSE_ERROR' | 'UNKNOWN';
}

// ========================================
// USER-AGENT ROTATION
// ========================================

const USER_AGENTS = [
  // Chrome on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  // Chrome on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  // Chrome on Linux
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  // Firefox on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  // Safari on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getBrowserHeaders(): Record<string, string> {
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,nl;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };
}

// ========================================
// RETRY LOGIC
// ========================================

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  maxRetries: number = 3
): Promise<{ response: Response; errorType?: ExtractionResult['error_type'] }> {
  let lastError: Error | null = null;
  let errorType: ExtractionResult['error_type'] = 'UNKNOWN';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔄 [URL Extractor] Attempt ${attempt + 1}/${maxRetries} for: ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(url, {
        headers: getBrowserHeaders(),
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✅ [URL Extractor] Fetch successful: ${response.status}`);
        return { response };
      }

      // Handle specific error codes
      if (response.status === 403) {
        errorType = 'BOT_BLOCKED';
        // Don't retry 403 - bot blocking won't change
        console.error(`❌ [URL Extractor] HTTP 403 - Bot blocked, not retrying`);
        throw new Error(`HTTP 403: Access denied - site is blocking automated requests`);
      }

      if (response.status === 429) {
        errorType = 'RATE_LIMITED';
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 2000;
        console.log(`⏳ [URL Extractor] Rate limited, waiting ${waitTime}ms...`);
        await delay(waitTime);
        continue;
      }

      if (response.status === 503 || response.status === 502) {
        // Server temporarily unavailable, retry
        console.log(`⚠️ [URL Extractor] Server error ${response.status}, retrying...`);
        await delay(Math.pow(2, attempt) * 1000);
        continue;
      }

      // For other errors, don't retry
      errorType = 'NETWORK_ERROR';
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this is a non-retryable error
      if (lastError.message.includes('HTTP 403')) {
        errorType = 'BOT_BLOCKED';
        break; // Don't retry
      }

      if (lastError.name === 'AbortError') {
        errorType = 'TIMEOUT';
        console.warn(`⏱️ [URL Extractor] Request timed out`);
      } else if (lastError.message.includes('fetch failed') || lastError.message.includes('ENOTFOUND')) {
        errorType = 'NETWORK_ERROR';
        console.warn(`⚠️ [URL Extractor] Network error: ${lastError.message}`);
      }

      if (attempt < maxRetries - 1 && errorType !== 'BOT_BLOCKED') {
        const waitTime = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s
        console.log(`⏳ [URL Extractor] Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
      }
    }
  }

  throw { error: lastError, errorType };
}

// ========================================
// MAIN EXTRACTION FUNCTION
// ========================================

/**
 * Extract branding information from a website URL
 * Uses a combination of HTML scraping and external APIs for best results
 */
export async function extractBrandingFromUrl(url: string): Promise<ExtractionResult> {
  const errors: string[] = [];
  const extracted: ExtractedBranding = {
    name: null,
    tagline: null,
    primary_color: null,
    secondary_color: null,
    logo_url: null,
    favicon_url: null,
    og_image_url: null,
  };

  let errorType: ExtractionResult['error_type'] | undefined;

  try {
    // Validate and normalize URL
    const normalizedUrl = normalizeUrl(url);
    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname.replace(/^www\./, '');
    const baseUrl = urlObj.origin;

    console.log(`🔍 [URL Extractor] Extracting branding for domain: ${domain}`);

    // 1. FIRST: Try to get logo from Clearbit (most reliable for company logos)
    const clearbitLogo = await getClearbitLogo(domain);
    if (clearbitLogo) {
      extracted.logo_url = clearbitLogo;
      console.log(`✅ [URL Extractor] Got logo from Clearbit: ${clearbitLogo}`);
    }

    // 2. Get high-quality favicon from Google
    extracted.favicon_url = getGoogleFavicon(domain, 128);
    console.log(`✅ [URL Extractor] Got favicon from Google: ${extracted.favicon_url}`);

    // 3. Try to fetch HTML for metadata (name, colors, etc.)
    let $ : cheerio.CheerioAPI | null = null;
    try {
      console.log(`🔍 [URL Extractor] Fetching HTML: ${normalizedUrl}`);
      const { response } = await fetchWithRetry(normalizedUrl);
      const html = await response.text();
      $ = cheerio.load(html);

      // Extract company name
      extracted.name = extractCompanyName($);
      console.log(`📛 [URL Extractor] Name: ${extracted.name}`);

      // Extract tagline/description
      extracted.tagline = extractTagline($);
      console.log(`📝 [URL Extractor] Tagline: ${extracted.tagline?.substring(0, 50)}...`);

      // Extract primary color from meta theme-color
      extracted.primary_color = extractPrimaryColor($);
      console.log(`🎨 [URL Extractor] Primary color from HTML: ${extracted.primary_color}`);

      // Extract og:image
      extracted.og_image_url = extractOgImage($, baseUrl);

      // If no Clearbit logo, try HTML extraction
      if (!extracted.logo_url) {
        extracted.logo_url = extractLogo($, baseUrl);
        if (extracted.logo_url) {
          console.log(`🖼️ [URL Extractor] Logo from HTML: ${extracted.logo_url}`);
        }
      }

    } catch (htmlError: unknown) {
      const msg = htmlError instanceof Error ? htmlError.message : String(htmlError);
      console.warn(`⚠️ [URL Extractor] HTML fetch failed: ${msg}`);
      errors.push(`HTML extraction failed: ${msg}`);

      // Fallback: use domain as name
      extracted.name = formatDomainAsName(domain);
      console.log(`📛 [URL Extractor] Using domain as name: ${extracted.name}`);
    }

    // 4. Fallback: use favicon as logo if still no logo
    if (!extracted.logo_url && extracted.favicon_url) {
      console.log(`🔄 [URL Extractor] Using Google favicon as logo`);
      extracted.logo_url = extracted.favicon_url;
    }

    // 5. Compute secondary color if we have primary
    if (extracted.primary_color) {
      extracted.secondary_color = extractSecondaryColor($ as cheerio.CheerioAPI, extracted.primary_color);
      console.log(`🎨 [URL Extractor] Secondary color: ${extracted.secondary_color}`);
    }

    // 6. Generate a color from domain if no color found
    if (!extracted.primary_color) {
      extracted.primary_color = generateColorFromDomain(domain);
      extracted.secondary_color = computeSecondaryColor(extracted.primary_color);
      console.log(`🎨 [URL Extractor] Generated color from domain: ${extracted.primary_color}`);
    }

    return {
      success: true,
      extracted,
      source_url: normalizedUrl,
      errors,
    };

  } catch (error: unknown) {
    // Handle retry error with type
    if (typeof error === 'object' && error !== null && 'errorType' in error) {
      const retryError = error as { error: Error; errorType: ExtractionResult['error_type'] };
      errorType = retryError.errorType;
      const message = retryError.error?.message || 'Unknown error';
      console.error(`❌ [URL Extractor] Error (${errorType}):`, message);
      errors.push(message);
    } else {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ [URL Extractor] Error:`, message);
      errors.push(message);
      errorType = 'UNKNOWN';
    }

    return {
      success: false,
      extracted,
      source_url: url,
      errors,
      error_type: errorType,
    };
  }
}

// ========================================
// EXTERNAL API HELPERS
// ========================================

/**
 * Get logo from Clearbit Logo API (free, no API key required)
 * Returns null if logo not found
 */
async function getClearbitLogo(domain: string): Promise<string | null> {
  const logoUrl = `https://logo.clearbit.com/${domain}`;

  try {
    // Check if the logo exists with a HEAD request
    const response = await fetch(logoUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return logoUrl;
    }
    return null;
  } catch {
    console.log(`⚠️ [URL Extractor] Clearbit logo not available for ${domain}`);
    return null;
  }
}

/**
 * Get high-quality favicon from Google's favicon service
 */
function getGoogleFavicon(domain: string, size: number = 128): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

/**
 * Format domain as a readable company name
 */
function formatDomainAsName(domain: string): string {
  // Remove TLD and format
  const parts = domain.split('.');
  const name = parts[0];
  // Capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Generate a consistent color from domain name (for fallback)
 */
function generateColorFromDomain(domain: string): string {
  // Simple hash function to generate a hue from domain
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert to a pleasant color (avoid very light or very dark)
  const hue = Math.abs(hash % 360);
  const saturation = 65 + (Math.abs(hash >> 8) % 20); // 65-85%
  const lightness = 45 + (Math.abs(hash >> 16) % 15); // 45-60%

  // Convert HSL to hex
  const rgb = hslToRgb(hue / 360, saturation / 100, lightness / 100);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

// ========================================
// URL HELPERS
// ========================================

/**
 * Normalize URL (add https:// if missing)
 */
function normalizeUrl(url: string): string {
  url = url.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

/**
 * Resolve relative URLs to absolute
 */
function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('//')) {
    return 'https:' + url;
  }
  if (url.startsWith('/')) {
    return baseUrl + url;
  }
  return baseUrl + '/' + url;
}

// ========================================
// NAME & TAGLINE EXTRACTION
// ========================================

/**
 * Extract company name from various sources
 */
function extractCompanyName($: cheerio.CheerioAPI): string | null {
  // Priority order:
  // 1. og:site_name
  // 2. application-name meta
  // 3. Title tag (cleaned)
  // 4. First h1

  const ogSiteName = $('meta[property="og:site_name"]').attr('content');
  if (ogSiteName) return cleanCompanyName(ogSiteName);

  const appName = $('meta[name="application-name"]').attr('content');
  if (appName) return cleanCompanyName(appName);

  const title = $('title').text();
  if (title) return cleanCompanyName(title);

  const h1 = $('h1').first().text();
  if (h1) return cleanCompanyName(h1);

  return null;
}

/**
 * Clean company name (remove taglines, special chars)
 */
function cleanCompanyName(name: string): string {
  // Remove common separators and everything after
  name = name.split(/\s*[-|–—:]\s*/)[0];
  // Remove extra whitespace
  name = name.replace(/\s+/g, ' ').trim();
  // Limit length
  if (name.length > 50) {
    name = name.substring(0, 50);
  }
  return name;
}

/**
 * Extract tagline/description
 */
function extractTagline($: cheerio.CheerioAPI): string | null {
  // Priority: og:description > meta description > first subtitle
  const ogDesc = $('meta[property="og:description"]').attr('content');
  if (ogDesc) return ogDesc.substring(0, 200);

  const metaDesc = $('meta[name="description"]').attr('content');
  if (metaDesc) return metaDesc.substring(0, 200);

  return null;
}

// ========================================
// COLOR EXTRACTION
// ========================================

/**
 * Extract primary color from meta tags or CSS
 */
function extractPrimaryColor($: cheerio.CheerioAPI): string | null {
  // 1. Check meta theme-color (most reliable)
  const themeColor = $('meta[name="theme-color"]').attr('content');
  if (themeColor && isValidHexColor(themeColor)) {
    return normalizeHexColor(themeColor);
  }

  // 2. Check msapplication-TileColor
  const tileColor = $('meta[name="msapplication-TileColor"]').attr('content');
  if (tileColor && isValidHexColor(tileColor)) {
    return normalizeHexColor(tileColor);
  }

  // 3. Try to find color in inline styles (buttons, headers, links)
  const inlineColor = findColorInStyles($);
  if (inlineColor) return inlineColor;

  // 4. Find most common non-neutral color from CSS
  const colorCounts = countColorOccurrences($);

  // Sort by frequency and find first non-neutral color
  const sortedColors = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);

  for (const color of sortedColors) {
    if (!isNeutralColor(color)) {
      return color;
    }
  }

  return null;
}

/**
 * Count color occurrences in stylesheets
 */
function countColorOccurrences($: cheerio.CheerioAPI): Record<string, number> {
  const counts: Record<string, number> = {};

  $('style').each((_, el) => {
    const css = $(el).text();
    const hexMatches = css.match(/#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\b/g);
    if (hexMatches) {
      hexMatches.forEach(color => {
        const normalized = normalizeHexColor(color);
        counts[normalized] = (counts[normalized] || 0) + 1;
      });
    }
  });

  return counts;
}

/**
 * Check if a color is neutral (black, white, gray)
 */
function isNeutralColor(hex: string): boolean {
  const neutrals = [
    '#FFFFFF', '#FFF', '#000000', '#000',
    '#F5F5F5', '#FAFAFA', '#F0F0F0', '#E5E5E5',
    '#D4D4D4', '#A3A3A3', '#737373', '#525252',
    '#404040', '#262626', '#171717',
    '#F9FAFB', '#F3F4F6', '#E5E7EB', '#D1D5DB',
    '#9CA3AF', '#6B7280', '#4B5563', '#374151',
    '#1F2937', '#111827',
    '#ABB8C3', // WordPress gray
  ];

  const upper = hex.toUpperCase();

  // Check exact matches
  if (neutrals.includes(upper)) return true;

  // Check if it's a grayscale color (R ≈ G ≈ B)
  const rgb = hexToRgb(hex);
  if (rgb) {
    const { r, g, b } = rgb;
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    if (maxDiff < 20) return true; // Very close to gray
  }

  return false;
}

/**
 * Extract secondary color (computed from primary or found in CSS)
 */
function extractSecondaryColor($: cheerio.CheerioAPI, primaryColor: string | null): string | null {
  // Get color frequency counts
  const colorCounts = countColorOccurrences($);

  // Sort by frequency
  const sortedColors = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);

  // Find second most common non-neutral color that isn't the primary
  for (const color of sortedColors) {
    if (color !== primaryColor && !isNeutralColor(color)) {
      // Make sure it's visually different from primary
      if (primaryColor && areColorsSimilar(color, primaryColor)) {
        continue;
      }
      return color;
    }
  }

  // If we have a primary color, compute a complementary secondary
  if (primaryColor) {
    return computeSecondaryColor(primaryColor);
  }

  return null;
}

/**
 * Check if two colors are visually similar
 */
function areColorsSimilar(color1: string, color2: string): boolean {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return false;

  const diff = Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );

  // If color distance is less than 50, consider them similar
  return diff < 50;
}

/**
 * Find colors in inline styles
 */
function findColorInStyles($: cheerio.CheerioAPI): string | null {
  const selectors = [
    'header',
    'nav',
    '.header',
    '.navbar',
    '.nav',
    'button',
    '.btn',
    '.button',
    '[class*="primary"]',
    '[class*="brand"]',
    'a',
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    const style = element.attr('style') || '';

    // Check for hex colors in style attribute
    const hexMatch = style.match(/#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\b/);
    if (hexMatch) {
      return normalizeHexColor(hexMatch[0]);
    }

    // Check for rgb colors
    const rgbMatch = style.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (rgbMatch) {
      return rgbToHex(parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3]));
    }
  }

  return null;
}

// ========================================
// FAVICON EXTRACTION
// ========================================

/**
 * Extract favicon URL
 */
function extractFavicon($: cheerio.CheerioAPI, baseUrl: string): string | null {
  // Priority order for favicons
  const selectors = [
    'link[rel="icon"][type="image/svg+xml"]',
    'link[rel="icon"][sizes="32x32"]',
    'link[rel="icon"][sizes="16x16"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
  ];

  for (const selector of selectors) {
    const href = $(selector).attr('href');
    if (href) {
      return resolveUrl(href, baseUrl);
    }
  }

  // Default fallback
  return `${baseUrl}/favicon.ico`;
}

// ========================================
// LOGO EXTRACTION (with SVG support)
// ========================================

/**
 * Extract logo URL - supports img tags, SVG elements, and CSS backgrounds
 */
function extractLogo($: cheerio.CheerioAPI, baseUrl: string): string | null {
  // 1. Try to find explicit logo images
  const imgLogo = extractLogoFromImg($, baseUrl);
  if (imgLogo) return imgLogo;

  // 2. Try to find SVG logos
  const svgLogo = extractLogoFromSvg($);
  if (svgLogo) return svgLogo;

  // 3. Try to find logos in CSS background-image
  const cssLogo = extractLogoFromCss($, baseUrl);
  if (cssLogo) return cssLogo;

  // 4. Fall back to og:image if no explicit logo found
  return extractOgImage($, baseUrl);
}

/**
 * Extract logo from img tags
 */
function extractLogoFromImg($: cheerio.CheerioAPI, baseUrl: string): string | null {
  const logoSelectors = [
    // High priority: explicit logo classes/ids
    'img[class*="logo" i]',
    'img[id*="logo" i]',
    '.logo img',
    '#logo img',
    '[class*="logo" i] img',
    '[id*="logo" i] img',
    // Medium priority: alt text
    'img[alt*="logo" i]',
    // Brand-related
    '.brand img',
    '[class*="brand" i] img',
    '.site-branding img',
    // Lower priority: header/nav images
    'header img:first-of-type',
    'nav img:first-of-type',
    '.header img:first-of-type',
    '.navbar img:first-of-type',
  ];

  for (const selector of logoSelectors) {
    try {
      const src = $(selector).first().attr('src');
      if (src && !src.includes('gravatar') && !src.includes('avatar')) {
        // Allow data URIs for inline images
        if (src.startsWith('data:image/')) {
          return src;
        }
        return resolveUrl(src, baseUrl);
      }
    } catch {
      // Selector might be invalid, continue
    }
  }

  // Check for images with 'logo' in the URL
  let logoFromUrl: string | null = null;
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src && src.toLowerCase().includes('logo') && !src.includes('gravatar')) {
      if (!logoFromUrl) {
        if (src.startsWith('data:image/')) {
          logoFromUrl = src;
        } else {
          logoFromUrl = resolveUrl(src, baseUrl);
        }
      }
    }
  });

  return logoFromUrl;
}

/**
 * Extract logo from inline SVG elements
 */
function extractLogoFromSvg($: cheerio.CheerioAPI): string | null {
  const svgSelectors = [
    // Explicit logo SVGs
    'svg[class*="logo" i]',
    'svg[id*="logo" i]',
    '[class*="logo" i] svg',
    '[id*="logo" i] svg',
    // Brand SVGs
    '.brand svg',
    '[class*="brand" i] svg',
    '.site-branding svg',
    // Header/nav SVGs (often logos)
    'header svg:first-of-type',
    'nav svg:first-of-type',
    '.header svg:first-of-type',
    '.navbar svg:first-of-type',
    // Link with logo class containing SVG
    'a[class*="logo" i] svg',
    'a[id*="logo" i] svg',
  ];

  for (const selector of svgSelectors) {
    try {
      const svgElement = $(selector).first();
      if (svgElement.length > 0) {
        // Get the SVG's outer HTML
        const svgHtml = $.html(svgElement);
        if (svgHtml && svgHtml.length > 50 && svgHtml.length < 50000) {
          // Convert to data URI
          const base64 = Buffer.from(svgHtml).toString('base64');
          console.log(`🎨 [URL Extractor] Found inline SVG logo (${svgHtml.length} chars)`);
          return `data:image/svg+xml;base64,${base64}`;
        }
      }
    } catch {
      // Selector might be invalid, continue
    }
  }

  return null;
}

/**
 * Extract logo from CSS background-image
 */
function extractLogoFromCss($: cheerio.CheerioAPI, baseUrl: string): string | null {
  // Check elements with background-image in style attribute
  const bgSelectors = [
    '[class*="logo" i][style*="background"]',
    '[id*="logo" i][style*="background"]',
    '.brand[style*="background"]',
    '.site-branding[style*="background"]',
  ];

  for (const selector of bgSelectors) {
    try {
      const element = $(selector).first();
      const style = element.attr('style') || '';
      const urlMatch = style.match(/url\(['"]?([^'")\s]+)['"]?\)/i);
      if (urlMatch && urlMatch[1]) {
        const url = urlMatch[1];
        if (url.startsWith('data:image/')) {
          return url;
        }
        if (url.toLowerCase().includes('logo') || selector.includes('logo')) {
          return resolveUrl(url, baseUrl);
        }
      }
    } catch {
      // Continue
    }
  }

  // Check style tags for logo background URLs
  let cssLogoUrl: string | null = null;
  $('style').each((_, el) => {
    if (cssLogoUrl) return;

    const css = $(el).text();
    // Look for classes containing "logo" with background-image
    const logoPattern = /\.[\w-]*logo[\w-]*\s*\{[^}]*background(?:-image)?:\s*url\(['"]?([^'")\s]+)['"]?\)/gi;
    const matches = css.matchAll(logoPattern);

    for (const match of matches) {
      if (match[1] && !cssLogoUrl) {
        const url = match[1];
        if (url.startsWith('data:image/')) {
          cssLogoUrl = url;
        } else {
          cssLogoUrl = resolveUrl(url, baseUrl);
        }
      }
    }
  });

  return cssLogoUrl;
}

/**
 * Extract og:image URL
 */
function extractOgImage($: cheerio.CheerioAPI, baseUrl: string): string | null {
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) {
    return resolveUrl(ogImage, baseUrl);
  }

  const twitterImage = $('meta[name="twitter:image"]').attr('content');
  if (twitterImage) {
    return resolveUrl(twitterImage, baseUrl);
  }

  return null;
}

// ========================================
// COLOR UTILITIES
// ========================================

/**
 * Validate hex color
 */
function isValidHexColor(color: string): boolean {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

/**
 * Normalize hex color to #RRGGBB format
 */
function normalizeHexColor(color: string): string {
  color = color.replace('#', '').toUpperCase();
  if (color.length === 3) {
    color = color.split('').map(c => c + c).join('');
  }
  return '#' + color;
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

/**
 * Compute a complementary secondary color
 */
function computeSecondaryColor(primaryHex: string): string {
  // Simple approach: shift hue by ~120 degrees
  const rgb = hexToRgb(primaryHex);
  if (!rgb) return '#10B981'; // Default green

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // Shift hue by 120 degrees (complementary-ish)
  hsl.h = (hsl.h + 0.33) % 1;

  const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

/**
 * Hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h, s, l };
}

/**
 * HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}
