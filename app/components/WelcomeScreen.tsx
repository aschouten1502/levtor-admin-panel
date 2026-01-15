'use client';

import { translations, type LanguageCode } from "../translations";
import { BRANDING } from "@/lib/branding.config";
import { useTenant } from "../providers/TenantProvider";

interface WelcomeScreenProps {
  selectedLanguage: string;
}

export const WelcomeScreen = ({ selectedLanguage }: WelcomeScreenProps) => {
  const { tenant } = useTenant();

  // Get translations: prefer tenant's ui_texts, fallback to static translations
  const staticT = translations[selectedLanguage as LanguageCode] || translations.nl;
  const tenantTexts = tenant?.ui_texts?.[selectedLanguage as LanguageCode] || tenant?.ui_texts?.nl;

  // Merge tenant texts with static translations (tenant takes priority)
  const t = tenantTexts ? {
    ...staticT,
    ...tenantTexts,
  } : staticT;

  // Use tenant colors if available, fallback to BRANDING
  const primaryColor = tenant?.primary_color || BRANDING.colors.primary;
  const primaryDark = tenant?.primary_dark
    || (tenant?.primary_color ? adjustColorBrightness(tenant.primary_color, -20) : BRANDING.colors.primaryDark);

  // Language hint color (glass box) - separate from primary color
  const languageHintColor = tenant?.language_hint_color || primaryColor;

  // Dynamic gradient style from tenant config or branding
  const gradientStyle = {
    background: `linear-gradient(to bottom right, ${primaryColor}, ${primaryDark})`
  };

  // Check if "Powered by" should be shown
  const showPoweredBy = tenant?.show_powered_by ?? BRANDING.features.showPoweredBy;

  return (
    <div className="relative flex flex-col items-center justify-center h-full px-4 animate-fade-in z-10">
      <div className="relative mb-6">
        {/* Gradient Circle - Dynamic color from tenant */}
        <div
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center shadow-2xl"
          style={gradientStyle}
        >
          <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      </div>

      <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-800 text-center">
        {t.welcomeTitle}
      </h2>
      <p className="mt-3 text-sm sm:text-base text-gray-600 text-center max-w-md">
        {t.welcomeSubtitle}
      </p>

      {/* Language Hint - use language_hint_color with glass effect */}
      <div
        className="mt-4 px-4 py-2 rounded-xl max-w-md"
        style={{
          backgroundColor: `${languageHintColor}10`,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: `${languageHintColor}30`
        }}
      >
        <p className="text-xs sm:text-sm text-center" style={{ color: languageHintColor }}>
          {t.languageHint}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {t.examples.map((example, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all border border-gray-100">
            <p className="text-xs text-gray-500">{t.exampleLabel}</p>
            <p className="mt-1 text-sm sm:text-base font-medium text-gray-800">
              "{example}"
            </p>
          </div>
        ))}
      </div>

      {/* Powered by + Version - Conditional based on tenant setting or feature flag */}
      {showPoweredBy && (
        <div className="mt-8 mb-4 flex flex-col items-center gap-1 welcome-powered-by" data-powered-by="true">
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <span>Powered by</span>
            <span className="font-semibold">Levtor</span>
          </p>
          <p className="text-[10px] text-gray-300">
            v{BRANDING.version}
          </p>
        </div>
      )}
    </div>
  );
};

// Helper function to adjust color brightness
function adjustColorBrightness(hex: string, percent: number): string {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const adjust = (value: number) => {
    const adjusted = Math.round(value + (255 * percent) / 100);
    return Math.max(0, Math.min(255, adjusted));
  };

  const toHex = (value: number) => value.toString(16).padStart(2, '0');

  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}
