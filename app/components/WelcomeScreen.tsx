'use client';

import { translations, type LanguageCode } from "../translations";

interface WelcomeScreenProps {
  selectedLanguage: string;
}

export const WelcomeScreen = ({ selectedLanguage }: WelcomeScreenProps) => {
  const t = translations[selectedLanguage as LanguageCode] || translations.nl;

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 animate-fade-in">
      <div className="relative mb-6">
        {/* Gradient Circle - Fixed colors */}
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-[#e32219] to-[#c01d15]
                        flex items-center justify-center shadow-2xl">
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

      {/* Language Hint */}
      <div className="mt-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl max-w-md">
        <p className="text-xs sm:text-sm text-blue-700 text-center">
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

      {/* Powered by Levtor + Version */}
      <div className="mt-8 mb-4 flex flex-col items-center gap-1">
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <span>Powered by</span>
          <span className="font-semibold">Levtor</span>
        </p>
        <p className="text-[10px] text-gray-300">
          v1.0.3
        </p>
      </div>
    </div>
  );
};
