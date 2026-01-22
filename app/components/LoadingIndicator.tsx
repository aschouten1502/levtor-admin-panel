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
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  // Get translations for the selected language
  const t = translations[selectedLanguage as keyof typeof translations] || translations.nl;

  // Use tenant colors if available, fallback to BRANDING
  const primaryColor = tenant?.primary_color || BRANDING.colors.primary;

  // Get fun facts from tenant or fallback to BRANDING
  const funFactsEnabled = tenant?.fun_facts_enabled ?? BRANDING.funFacts.enabled;
  const funFactsList = (tenant?.fun_facts && tenant.fun_facts.length > 0)
    ? tenant.fun_facts
    : BRANDING.funFacts.facts;

  // Debug logging to identify fun facts loading issues
  console.log('🎯 [LoadingIndicator] tenantLoading:', tenantLoading);
  console.log('🎯 [LoadingIndicator] tenant?.id:', tenant?.id);
  console.log('🎯 [LoadingIndicator] tenant?.fun_facts:', tenant?.fun_facts);
  console.log('🎯 [LoadingIndicator] funFactsList (used):', funFactsList);
  // Use translated prefix, then tenant-specific, then branding default
  const funFactsPrefix = t.funFactsPrefix || tenant?.fun_facts_prefix || BRANDING.funFacts.prefix;
  const rotationInterval = BRANDING.funFacts.rotationInterval;

  // Progress bar animation
  useEffect(() => {
    if (!funFactsEnabled || funFactsList.length === 0) return;

    setProgress(0);
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 0;
        return prev + (100 / (rotationInterval / 50));
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [currentFactIndex, funFactsEnabled, funFactsList.length, rotationInterval]);

  // Rotate through facts
  useEffect(() => {
    if (!funFactsEnabled || funFactsList.length === 0) return;

    // Start with random fact
    setCurrentFactIndex(Math.floor(Math.random() * funFactsList.length));

    const interval = setInterval(() => {
      setIsVisible(false);

      setTimeout(() => {
        setCurrentFactIndex((prev) => (prev + 1) % funFactsList.length);
        setIsVisible(true);
        setProgress(0);
      }, 250);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [funFactsEnabled, funFactsList.length, rotationInterval]);

  const showFact = funFactsEnabled && funFactsList.length > 0;
  const currentFact = showFact ? funFactsList[currentFactIndex] : null;

  return (
    <div className="flex justify-start animate-fade-in">
      <div className="flex gap-3 max-w-[85%] sm:max-w-[75%]">
        {/* Bot Avatar */}
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

        {/* Loading Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Main content area */}
          <div className="px-5 py-4">
            {/* Typing indicator - sleek dots */}
            <div className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: primaryColor, animationDelay: '0ms' }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: primaryColor, opacity: 0.6, animationDelay: '150ms' }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: primaryColor, opacity: 0.3, animationDelay: '300ms' }}
              />
            </div>

            {/* Fun Fact - clean minimal design */}
            {showFact && currentFact && (
              <div
                className={`mt-3 transition-all duration-250 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
                }`}
              >
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  <span className="text-gray-400 font-medium">{funFactsPrefix}</span>{' '}
                  <span className="text-gray-600">{currentFact}</span>
                </p>
              </div>
            )}
          </div>

          {/* Progress bar - subtle bottom indicator */}
          {showFact && (
            <div className="h-0.5 bg-gray-100">
              <div
                className="h-full transition-all duration-75 ease-linear"
                style={{
                  width: `${progress}%`,
                  backgroundColor: primaryColor,
                  opacity: 0.4
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
