'use client';

import { useState, useEffect } from 'react';
import { BRANDING } from '@/lib/shared/branding.config';
import { useTenant } from '../providers/TenantProvider';
import { translations } from '../translations';

interface LoadingIndicatorProps {
  selectedLanguage?: string;
}

export const LoadingIndicator = ({ selectedLanguage = 'nl' }: LoadingIndicatorProps) => {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);

  const t = translations[selectedLanguage as keyof typeof translations] || translations.nl;

  // Use tenant colors if available, fallback to BRANDING
  const primaryColor = tenant?.primary_color || BRANDING.colors.primary;

  // Get fun facts from tenant or fallback to BRANDING
  const funFactsEnabled = tenant?.fun_facts_enabled ?? BRANDING.funFacts.enabled;
  const funFactsList = (tenant?.fun_facts && tenant.fun_facts.length > 0)
    ? tenant.fun_facts
    : BRANDING.funFacts.facts;

  const funFactsPrefix = t.funFactsPrefix || tenant?.fun_facts_prefix || BRANDING.funFacts.prefix;
  const rotationInterval = BRANDING.funFacts.rotationInterval;

  const showFact = funFactsEnabled && funFactsList.length > 0;
  const currentFact = showFact ? funFactsList[currentFactIndex] : null;

  // Rotate through facts
  useEffect(() => {
    if (!showFact) return;

    // Start with random fact
    setCurrentFactIndex(Math.floor(Math.random() * funFactsList.length));

    const interval = setInterval(() => {
      setIsTransitioning(true);

      setTimeout(() => {
        setCurrentFactIndex((prev) => (prev + 1) % funFactsList.length);
        setIsTransitioning(false);
        setProgress(0);
      }, 300);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [showFact, funFactsList.length, rotationInterval]);

  // Progress animation
  useEffect(() => {
    if (!showFact) return;

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + (100 / (rotationInterval / 30)), 100));
    }, 30);

    return () => clearInterval(progressInterval);
  }, [currentFactIndex, showFact, rotationInterval]);

  return (
    <div className="flex justify-start animate-fade-in">
      <div className="flex gap-3 max-w-[85%] sm:max-w-[75%]">
        {/* Bot Avatar - EXACT same as ChatMessage */}
        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-lg bg-white">
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            style={{ color: primaryColor }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>

        {/* Message Bubble - EXACT same styling as ChatMessage */}
        <div className="flex-1 min-w-0">
          <div className="bg-white text-gray-800 border border-gray-100 rounded-2xl shadow-lg overflow-hidden">

            {/* Thinking Section */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                {/* Wave Animation Dots */}
                <div className="flex items-end gap-[3px] h-5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: primaryColor,
                        animation: 'typing-wave 1.4s ease-in-out infinite',
                        animationDelay: `${i * 0.16}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Status Text */}
                <span
                  className="text-sm font-medium"
                  style={{ color: primaryColor }}
                >
                  Even denken...
                </span>
              </div>
            </div>

            {/* Fun Fact Section */}
            {showFact && currentFact && (
              <>
                {/* Gradient Divider */}
                <div
                  className="h-px"
                  style={{
                    background: `linear-gradient(to right, transparent, ${primaryColor}25, transparent)`
                  }}
                />

                {/* Fun Fact Content */}
                <div className="relative px-4 py-3 bg-gradient-to-br from-gray-50/50 to-white">
                  <div
                    className={`flex items-start gap-3 transition-all duration-300 ease-out ${
                      isTransitioning
                        ? 'opacity-0 translate-y-2'
                        : 'opacity-100 translate-y-0'
                    }`}
                  >
                    {/* Lightbulb Icon */}
                    <div
                      className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}12` }}
                    >
                      <svg
                        className="w-4 h-4"
                        style={{ color: primaryColor }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                    </div>

                    {/* Fact Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                        {funFactsPrefix}
                      </p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {currentFact}
                      </p>
                    </div>
                  </div>

                  {/* Circular Progress Indicator */}
                  <div className="absolute top-3 right-3">
                    <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        fill="none"
                        stroke={`${primaryColor}15`}
                        strokeWidth="2"
                      />
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        fill="none"
                        stroke={primaryColor}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray={`${progress * 0.502} 50.2`}
                        className="transition-all duration-75 ease-linear"
                        style={{ opacity: 0.5 }}
                      />
                    </svg>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
