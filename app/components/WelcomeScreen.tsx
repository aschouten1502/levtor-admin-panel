'use client';

import { translations, type LanguageCode } from "../translations";

interface WelcomeScreenProps {
  selectedLanguage: string;
}

export const WelcomeScreen = ({ selectedLanguage }: WelcomeScreenProps) => {
  const t = translations[selectedLanguage as LanguageCode] || translations.nl;

  return (
    <div className="flex flex-col items-center justify-start pt-6 pb-4 px-4 animate-fade-in overflow-y-auto">
      <div className="relative mb-4">
        {/* Gradient Circle - Compacter */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#e32219] to-[#c01d15]
                        flex items-center justify-center shadow-2xl">
          <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      </div>

      <h2 className="mt-2 text-xl sm:text-2xl font-bold text-gray-800 text-center">
        {t.welcomeTitle}
      </h2>
      <p className="mt-2 text-sm text-gray-600 text-center max-w-md">
        {t.welcomeSubtitle}
      </p>

      {/* Language Hint - Compacter */}
      <div className="mt-3 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
        <p className="text-xs text-blue-700 text-center">
          {t.languageHint}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
        {t.examples.map((example, idx) => (
          <div key={idx} className="bg-white rounded-xl p-3 shadow-md hover:shadow-lg transition-all border border-gray-100">
            <p className="text-xs text-gray-500">{t.exampleLabel}</p>
            <p className="mt-0.5 text-sm font-medium text-gray-800">
              "{example}"
            </p>
          </div>
        ))}
      </div>

      {/* Powered by Levtor - Compacter */}
      <div className="mt-4 mb-2">
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <span>Powered by</span>
          <span className="font-semibold">Levtor</span>
        </p>
      </div>
    </div>
  );
};
