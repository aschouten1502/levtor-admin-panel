'use client';

import { useState, FormEvent } from "react";
import { translations, type LanguageCode } from "../translations";
import { BRANDING } from "@/lib/shared/branding.config";
import { useTenant } from "../providers/TenantProvider";
import { adjustColorBrightness } from "@/lib/ui/color-utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  selectedLanguage: string;
}

export const ChatInput = ({ onSendMessage, disabled, selectedLanguage }: ChatInputProps) => {
  const { tenant } = useTenant();
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Get translations: prefer tenant's ui_texts, fallback to static translations
  const staticT = translations[selectedLanguage as LanguageCode] || translations.nl;
  const tenantTexts = tenant?.ui_texts?.[selectedLanguage as LanguageCode] || tenant?.ui_texts?.nl;
  const t = tenantTexts ? { ...staticT, ...tenantTexts } : staticT;

  // Use tenant colors if available, fallback to BRANDING
  const primaryColor = tenant?.primary_color || BRANDING.colors.primary;
  const primaryDark = tenant?.primary_dark
    || (tenant?.primary_color ? adjustColorBrightness(tenant.primary_color, -20) : BRANDING.colors.primaryDark);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  // Dynamic styles from tenant or branding
  // Use input_border_color if set, otherwise fallback to primary colors
  const borderColor = tenant?.input_border_color
    || (isFocused ? primaryDark : primaryColor);

  const inputContainerStyle = {
    borderColor: borderColor,
  };

  // Use send_button_color if set, otherwise fallback to primary color
  const sendButtonColor = tenant?.send_button_color || primaryColor;
  const sendButtonHoverColor = tenant?.send_button_color
    ? adjustColorBrightness(tenant.send_button_color, -15)
    : primaryDark;

  const buttonStyle = {
    backgroundColor: sendButtonColor,
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-gray-200 bg-white shadow-xl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div
          className="relative flex items-center gap-2 sm:gap-3 border-2 rounded-full px-4 sm:px-6 py-3 sm:py-3.5 bg-white shadow-md transition-all duration-200"
          style={inputContainerStyle}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={t.inputPlaceholder}
            disabled={disabled}
            className="flex-1 bg-transparent outline-none text-base text-gray-800 placeholder:text-gray-400 disabled:opacity-50"
            style={{ fontSize: '16px' }}
          />
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
            style={buttonStyle}
            onMouseEnter={(e) => {
              if (!disabled && input.trim()) {
                e.currentTarget.style.backgroundColor = sendButtonHoverColor;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = sendButtonColor;
            }}
          >
            <svg className="w-5 h-5 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
};
