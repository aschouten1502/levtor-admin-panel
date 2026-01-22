/**
 * ========================================
 * EMBED PREVIEW COMPONENT
 * ========================================
 *
 * Live preview van de embed in een gesimuleerde browser chrome.
 */

'use client';

import { EmbedConfig } from '../../types';

interface EmbedPreviewProps {
  config: EmbedConfig;
  embedUrl: string;
}

export default function EmbedPreview({ config, embedUrl }: EmbedPreviewProps) {
  const width = `${config.width}${config.widthUnit}`;
  const height = `${config.height}${config.heightUnit}`;

  // Voor de preview, limiteren we de grootte zodat het in de view past
  const getPreviewStyle = () => {
    // Bereken maximale preview grootte
    const maxWidth = config.widthUnit === '%'
      ? '100%'
      : `min(${config.width}px, 100%)`;

    const maxHeight = config.heightUnit === 'vh'
      ? '70vh'
      : `min(${config.height}px, 70vh)`;

    return {
      width: maxWidth,
      height: maxHeight,
      minWidth: '280px',
      minHeight: '400px',
      borderRadius: `${config.borderRadius}px`,
      boxShadow: config.shadow
        ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        : 'none',
      border: '1px solid #e5e7eb',
    };
  };

  return (
    <div className="w-full max-w-lg">
      {/* Simulated Browser Chrome */}
      <div className="bg-gray-800 rounded-t-xl px-4 py-2.5 flex items-center gap-3">
        {/* Traffic lights */}
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>

        {/* URL Bar */}
        <div className="flex-1 bg-gray-700 rounded px-3 py-1.5 text-xs text-gray-400 truncate ml-2 font-mono">
          website-van-klant.nl/contact
        </div>
      </div>

      {/* Simulated Page with Embed */}
      <div className="bg-gradient-to-b from-gray-100 to-gray-50 p-6 rounded-b-xl border border-t-0 border-gray-200 min-h-[450px] flex items-center justify-center">
        <div className="relative">
          {/* The actual iframe preview */}
          <iframe
            src={embedUrl}
            style={getPreviewStyle()}
            title="Embed Preview"
            className="transition-all duration-300 bg-white"
          />

          {/* Size overlay indicator */}
          <div className="absolute -bottom-8 left-0 right-0 text-center">
            <span className="inline-flex items-center gap-2 text-xs text-gray-500 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              {width} x {height}
            </span>
          </div>
        </div>
      </div>

      {/* Tip */}
      <p className="text-center text-xs text-gray-400 mt-6">
        Dit is een live preview. De embed werkt al en je kunt ermee chatten.
      </p>
    </div>
  );
}
