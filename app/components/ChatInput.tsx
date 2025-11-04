'use client';

import { useState, FormEvent } from "react";
import { translations, type LanguageCode } from "../translations";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  selectedLanguage: string;
}

export const ChatInput = ({ onSendMessage, disabled, selectedLanguage }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const t = translations[selectedLanguage as LanguageCode] || translations.nl;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-gray-200 bg-white shadow-xl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="relative flex items-center gap-2 sm:gap-3
                        border-2 border-[#ece31e] rounded-full px-4 sm:px-6 py-3 sm:py-3.5
                        bg-white shadow-md
                        focus-within:shadow-xl focus-within:border-[#ddd319]
                        transition-all duration-200">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.inputPlaceholder}
            disabled={disabled}
            className="flex-1 bg-transparent outline-none text-base text-gray-800
                       placeholder:text-gray-400 disabled:opacity-50"
            style={{ fontSize: '16px' }}
          />
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full
                       bg-[#ece31e] hover:bg-[#ddd319]
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center
                       transition-all duration-200 hover:scale-105 active:scale-95
                       shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5 sm:w-5 sm:h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
};
