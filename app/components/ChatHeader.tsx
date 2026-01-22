'use client';

import { useState, useEffect, useRef } from "react";
import { translations, type LanguageCode } from "../translations";
import { BRANDING } from "@/lib/shared/branding.config";
import { useTenant } from "../providers/TenantProvider";
import { adjustColorBrightness } from "@/lib/ui/color-utils";

const LANGUAGES = [
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "ro", name: "Română", flag: "🇷🇴" },
];

interface ChatHeaderProps {
  selectedLanguage: string;
  onLanguageChange: (code: string) => void;
}

export const ChatHeader = ({ selectedLanguage, onLanguageChange }: ChatHeaderProps) => {
  const { tenant } = useTenant();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentLang = LANGUAGES.find((l) => l.code === selectedLanguage) || LANGUAGES[0];

  // Get translations: prefer tenant's ui_texts, fallback to static translations
  const staticT = translations[selectedLanguage as LanguageCode] || translations.nl;
  const tenantTexts = tenant?.ui_texts?.[selectedLanguage as LanguageCode] || tenant?.ui_texts?.nl;
  const t = tenantTexts ? { ...staticT, ...tenantTexts } : staticT;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Use tenant colors if available, fallback to BRANDING
  const primaryColor = tenant?.primary_color || BRANDING.colors.primary;
  const primaryDark = tenant?.primary_dark
    || (tenant?.primary_color ? adjustColorBrightness(tenant.primary_color, -20) : BRANDING.colors.primaryDark);

  // Header gradient colors - use dedicated fields or fallback to primary colors
  const headerGradientStart = tenant?.header_gradient_start || primaryColor;
  const headerGradientEnd = tenant?.header_gradient_end || primaryDark;

  // Dynamic styles from tenant config or branding fallback
  const headerStyle = {
    background: `linear-gradient(to right, ${headerGradientStart}, ${headerGradientEnd})`
  };

  const logoStyle = {
    color: primaryColor
  };

  // Get tenant name or fallback
  const tenantName = tenant?.name || BRANDING.shortName;
  const logoUrl = tenant?.logo_url || BRANDING.logo.main;

  return (
    <header className="shadow-2xl" style={headerStyle}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo + Title Section */}
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // Use logo image if configured (tenant or branding)
              <div className="bg-white rounded-xl p-2.5 shadow-lg">
                <img
                  src={logoUrl}
                  alt={tenantName}
                  className="h-8 w-auto"
                  style={{
                    maxHeight: '32px'
                  }}
                />
              </div>
            ) : (
              // Use text logo if no image configured
              <div className="bg-white rounded-xl px-4 py-2.5 shadow-lg">
                <h1 className="text-xl font-bold tracking-tight" style={logoStyle}>
                  {tenantName.toUpperCase()}
                </h1>
              </div>
            )}
            <div>
              <h1 className="text-white text-lg sm:text-xl font-bold">
                {t.appTitle}
              </h1>
              <p className="text-white/90 text-xs sm:text-sm hidden sm:block">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20
                         px-3 py-2 rounded-full transition-all
                         text-white text-sm border border-white/20"
            >
              <span className="text-lg">{currentLang.flag}</span>
              <span className="hidden sm:inline font-medium">{currentLang.name}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl
                              overflow-hidden z-50 animate-fade-in border border-gray-100">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onLanguageChange(lang.code);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 transition-all flex items-center gap-3 text-sm text-gray-800"
                    style={{
                      backgroundColor: lang.code === selectedLanguage
                        ? `${primaryColor}20`
                        : 'transparent',
                      fontWeight: lang.code === selectedLanguage ? 600 : 400
                    }}
                    onMouseEnter={(e) => {
                      if (lang.code !== selectedLanguage) {
                        e.currentTarget.style.backgroundColor = `${primaryColor}10`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (lang.code !== selectedLanguage) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
