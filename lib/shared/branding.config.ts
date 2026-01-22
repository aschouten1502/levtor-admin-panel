/**
 * ========================================
 * BRANDING CONFIGURATION (MULTI-TENANT)
 * ========================================
 *
 * Centralized configuration file for branding, colors, and styling.
 * Supports environment variable overrides for multi-tenant deployments.
 *
 * CONFIGURATION PRIORITY:
 * 1. Environment variables (.env.local) - HIGHEST PRIORITY
 * 2. This config file values - FALLBACK
 *
 * DEPLOYMENT OPTIONS:
 *
 * Option A: Edit this file directly
 * - Best for: Single client deployment or demo
 * - Change values below, rebuild, redeploy
 *
 * Option B: Use environment variables (RECOMMENDED for multi-tenant)
 * - Best for: Multiple client deployments
 * - Set in .env.local or Vercel environment settings
 * - No code changes needed per client
 * - Example:
 *   NEXT_PUBLIC_COMPANY_NAME=Acme Corporation
 *   NEXT_PUBLIC_COMPANY_SHORT=Acme HR
 *   NEXT_PUBLIC_PRIMARY_COLOR=#FF5733
 *
 * This file is used by:
 * - Translations (app/translations.ts)
 * - Layout metadata (app/layout.tsx)
 * - PWA manifest (public/manifest.json)
 * - All UI Components (WelcomeScreen, ChatHeader, etc.)
 */

export const BRANDING = {
  // ========================================
  // COMPANY INFORMATION
  // ========================================
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || "Levtor HR Assistant",
  shortName: process.env.NEXT_PUBLIC_COMPANY_SHORT || "Levtor HR",
  tagline: process.env.NEXT_PUBLIC_TAGLINE || "Demo: Your Intelligent HR Assistant",
  description: process.env.NEXT_PUBLIC_DESCRIPTION || "Demo: AI-powered HR assistant that answers questions about HR policies, benefits, and procedures based on your company documentation.",

  // ========================================
  // COLORS & STYLING
  // ========================================
  colors: {
    // Primary brand color (used for buttons, links, accents)
    // Override with NEXT_PUBLIC_PRIMARY_COLOR
    primary: process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#8B5CF6",

    // Darker variant (used for hover states, gradients)
    // Override with NEXT_PUBLIC_PRIMARY_DARK
    primaryDark: process.env.NEXT_PUBLIC_PRIMARY_DARK || "#7C3AED",

    // Lighter variant (used for backgrounds, highlights)
    // Override with NEXT_PUBLIC_PRIMARY_LIGHT
    primaryLight: process.env.NEXT_PUBLIC_PRIMARY_LIGHT || "#A78BFA",

    // Secondary color (optional, for accents and highlights)
    // Override with NEXT_PUBLIC_SECONDARY_COLOR
    secondary: process.env.NEXT_PUBLIC_SECONDARY_COLOR || "#10B981",

    // Background color (main app background)
    // Override with NEXT_PUBLIC_BG_COLOR
    background: process.env.NEXT_PUBLIC_BG_COLOR || "#FFFFFF",

    // Surface color (cards, panels)
    // Override with NEXT_PUBLIC_SURFACE_COLOR
    surface: process.env.NEXT_PUBLIC_SURFACE_COLOR || "#F9FAFB",

    // Text colors
    text: {
      primary: process.env.NEXT_PUBLIC_TEXT_PRIMARY || "#111827",
      secondary: process.env.NEXT_PUBLIC_TEXT_SECONDARY || "#6B7280",
      tertiary: process.env.NEXT_PUBLIC_TEXT_TERTIARY || "#9CA3AF",
    },

    // Tailwind gradient classes (used in UI components)
    // Auto-generated from primary and primaryDark
    gradient: `from-[${process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#8B5CF6"}] to-[${process.env.NEXT_PUBLIC_PRIMARY_DARK || "#7C3AED"}]`,

    // Theme color for browser UI
    themeColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#8B5CF6"
  },

  // ========================================
  // LOGO & ASSETS
  // ========================================
  logo: {
    // Main logo URL (displayed in header/welcome screen)
    // Can be:
    // 1. Absolute URL: "https://yourdomain.com/logo.png"
    // 2. Relative path: "/images/logo.png"
    // 3. Data URL: "data:image/svg+xml;base64,..."
    // 4. Empty string: Uses company name as text
    main: process.env.NEXT_PUBLIC_LOGO_URL || "",

    // Square icon (used for PWA, favicons)
    // Recommended: 192x192px PNG
    icon: process.env.NEXT_PUBLIC_ICON_URL || "/icons/icon-192x192.png",

    // Large icon for high-res displays
    // Recommended: 512x512px PNG
    iconLarge: process.env.NEXT_PUBLIC_ICON_LARGE_URL || "/icons/icon-512x512.png",

    // Favicon (shown in browser tab)
    favicon: process.env.NEXT_PUBLIC_FAVICON_URL || "/favicon.ico",

    // Background logo/watermark (optional, subtle background effect)
    // Use for branded watermark effect
    background: process.env.NEXT_PUBLIC_BACKGROUND_LOGO_URL || "",

    // Logo dimensions for proper scaling
    dimensions: {
      // Width in pixels (optional, for aspect ratio)
      width: process.env.NEXT_PUBLIC_LOGO_WIDTH
        ? parseInt(process.env.NEXT_PUBLIC_LOGO_WIDTH)
        : undefined,
      // Height in pixels (optional, for aspect ratio)
      height: process.env.NEXT_PUBLIC_LOGO_HEIGHT
        ? parseInt(process.env.NEXT_PUBLIC_LOGO_HEIGHT)
        : undefined,
    }
  },

  // ========================================
  // PWA SETTINGS
  // ========================================
  pwa: {
    name: process.env.NEXT_PUBLIC_PWA_NAME || "Levtor HR Assistant (DEMO)",
    shortName: process.env.NEXT_PUBLIC_COMPANY_SHORT || "Levtor HR",
    description: process.env.NEXT_PUBLIC_DESCRIPTION || "Demo: AI-powered HR assistant for your company",
    themeColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#8B5CF6",
    backgroundColor: "#ffffff",
    orientation: "portrait-primary" as const,
    display: "standalone" as const
  },

  // ========================================
  // URLS & METADATA
  // ========================================
  urls: {
    // Base URL for your deployment (used for SEO, social sharing)
    base: process.env.NEXT_PUBLIC_APP_URL || "https://hr-assistant.vercel.app",

    // Company website (for links)
    website: process.env.NEXT_PUBLIC_COMPANY_WEBSITE || "",

    // Support/contact email
    support: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || ""
  },

  // ========================================
  // FEATURES
  // ========================================
  features: {
    // Show "Powered by Levtor" in footer
    showPoweredBy: process.env.NEXT_PUBLIC_SHOW_POWERED_BY !== 'false',

    // Enable feedback buttons
    enableFeedback: process.env.NEXT_PUBLIC_ENABLE_FEEDBACK === 'true',

    // Enable analytics/logging
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'false',

    // Show cost tracking in developer mode
    showCostTracking: process.env.NEXT_PUBLIC_SHOW_COST_TRACKING === 'true'
  },

  // ========================================
  // LOCALE & LANGUAGE
  // ========================================
  locale: {
    // Default language code
    defaultLanguage: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "nl",

    // Locale for SEO (Open Graph)
    ogLocale: process.env.NEXT_PUBLIC_OG_LOCALE || "nl_NL"
  },

  // ========================================
  // FUN FACTS (shown during loading)
  // ========================================
  funFacts: {
    // Enable/disable fun facts during loading
    enabled: process.env.NEXT_PUBLIC_FUN_FACTS_ENABLED !== 'false',

    // Prefix shown before each fact (e.g., "Wist je dat...")
    prefix: process.env.NEXT_PUBLIC_FUN_FACTS_PREFIX || "Wist je dat",

    // Array of fun facts - parsed from JSON env var or defaults
    facts: (() => {
      const envFacts = process.env.NEXT_PUBLIC_FUN_FACTS;
      if (envFacts) {
        try {
          return JSON.parse(envFacts) as string[];
        } catch {
          return [];
        }
      }
      // Default demo facts (replace per client)
      return [
        "deze HR Assistent in 12 talen kan antwoorden?",
        "je hier 24/7 terecht kunt met HR vragen?",
        "de antwoorden gebaseerd zijn op officiële HR documenten?",
        "je verlof digitaal kunt aanvragen via het HR portaal?",
      ];
    })(),

    // Rotation interval in milliseconds
    rotationInterval: 4000,
  },

  // ========================================
  // VERSION
  // ========================================
  version: "2.0.0"
};

export type BrandingConfig = typeof BRANDING;
