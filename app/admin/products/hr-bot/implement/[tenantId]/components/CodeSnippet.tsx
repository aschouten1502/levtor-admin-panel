/**
 * ========================================
 * CODE SNIPPET COMPONENT
 * ========================================
 *
 * Toont code snippets met copy-to-clipboard functionaliteit.
 */

'use client';

import { useState } from 'react';

interface CodeSnippetProps {
  title: string;
  description: string;
  code: string;
  language: 'html' | 'javascript' | 'text';
}

export default function CodeSnippet({ title, description, code, language }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Syntax highlighting hint color
  const getLanguageColor = () => {
    switch (language) {
      case 'html': return 'bg-orange-100 text-orange-700';
      case 'javascript': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${getLanguageColor()}`}>
            {language.toUpperCase()}
          </span>
          <div>
            <h4 className="font-medium text-gray-900 text-sm">{title}</h4>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Gekopieerd!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Kopieer
            </>
          )}
        </button>
      </div>

      {/* Code Block */}
      <div className="bg-gray-900 p-4 overflow-x-auto">
        <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap break-all">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
