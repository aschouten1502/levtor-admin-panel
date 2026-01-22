'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getPdfUrlForTenant, getPdfUrlByFilenameForTenant, isPdfAvailable } from '@/lib/shared/pdf-urls';
import { BRANDING } from '@/lib/shared/branding.config';
import { useTenant } from '../providers/TenantProvider';
import { translations } from '../translations';
import { adjustColorBrightness } from '@/lib/ui/color-utils';

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  citations?: any[];
  logId?: string | null;
  selectedLanguage?: string;
}

export const ChatMessage = ({ role, content, citations, logId, selectedLanguage = 'nl' }: ChatMessageProps) => {
  const { tenant } = useTenant();
  const isUser = role === "user";

  // Feedback state
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [mounted, setMounted] = useState(false);

  // For portal rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get translations for the selected language
  const t = translations[selectedLanguage as keyof typeof translations] || translations.nl;

  // Get labels from tenant ui_texts or use defaults
  const langTexts = tenant?.ui_texts?.[selectedLanguage as keyof typeof tenant.ui_texts] || tenant?.ui_texts?.nl;
  const pageLabel = langTexts?.pageLabel || 'Pagina';
  const viewButton = langTexts?.viewButton || 'Bekijken';

  const handlePdfClick = (filename: string, filePath?: string) => {
    // Get tenant ID from context
    const tenantId = tenant?.id;
    if (!tenantId) {
      console.warn('⚠️ [ChatMessage] No tenant ID available for PDF link');
      return;
    }

    // Prioriteer storage path (nieuwe methode) over filename (legacy)
    if (filePath) {
      const pdfUrl = getPdfUrlForTenant(tenantId, filePath);
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    } else if (isPdfAvailable(filename)) {
      const pdfUrl = getPdfUrlByFilenameForTenant(tenantId, filename);
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Handle feedback submission
  const handleFeedback = async (type: 'positive' | 'negative', comment?: string) => {
    if (!logId || isSubmittingFeedback || feedback) return;

    // For negative feedback, show the modal first
    if (type === 'negative' && !showFeedbackModal) {
      setShowFeedbackModal(true);
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, feedback: type, comment }),
      });

      if (response.ok) {
        setFeedback(type);
        setShowFeedbackModal(false);
        setFeedbackComment('');
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Submit negative feedback with comment
  const submitNegativeFeedback = () => {
    handleFeedback('negative', feedbackComment);
  };

  // Cancel the feedback modal
  const cancelFeedbackModal = () => {
    setShowFeedbackModal(false);
    setFeedbackComment('');
  };

  // Use tenant colors if available, fallback to BRANDING
  const primaryColor = tenant?.primary_color || BRANDING.colors.primary;
  const primaryDark = tenant?.primary_dark
    || (tenant?.primary_color ? adjustColorBrightness(tenant.primary_color, -20) : BRANDING.colors.primaryDark);

  // Dynamic styles from tenant or branding
  const userBubbleStyle = {
    background: `linear-gradient(to bottom right, ${primaryColor}, ${primaryDark})`
  };

  const userAvatarStyle = {
    background: `linear-gradient(to bottom right, ${primaryColor}, ${primaryDark})`
  };

  const assistantIconStyle = {
    color: primaryColor
  };

  const pdfIconStyle = {
    color: primaryColor
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in w-full overflow-hidden`}>
      <div className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-lg ${!isUser ? "bg-white" : ""}`}
          style={isUser ? userAvatarStyle : undefined}
        >
          {isUser ? (
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 sm:w-5 sm:h-5" style={assistantIconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )}
        </div>

        {/* Message Bubble */}
        <div className="flex-1 min-w-0">
          <div
            className={`px-4 py-3 rounded-2xl shadow-lg text-sm sm:text-base ${!isUser ? "bg-white text-gray-800 border border-gray-100" : "text-white"}`}
            style={isUser ? userBubbleStyle : undefined}
          >
            <p className="whitespace-pre-wrap break-words overflow-hidden">{content}</p>
          </div>

          {/* Citations - Adapted for Pinecone format with file_path support */}
          {citations && citations.length > 0 && (
            <div className="mt-3 space-y-2">
              {(() => {
                // Map files with their pages and storage path
                const fileMap = new Map<string, { pages: Set<number>; filePath?: string }>();
                citations.forEach((citation: any) => {
                  citation.references?.forEach((ref: any) => {
                    const fileName = ref.file?.name || 'Onbekend';
                    const filePath = ref.file?.path;
                    const pages = ref.pages || [];
                    if (!fileMap.has(fileName)) {
                      fileMap.set(fileName, { pages: new Set(), filePath });
                    }
                    pages.forEach((page: number) => fileMap.get(fileName)!.pages.add(page));
                    // Update filePath if we get one (in case first reference didn't have it)
                    if (filePath && !fileMap.get(fileName)!.filePath) {
                      fileMap.get(fileName)!.filePath = filePath;
                    }
                  });
                });

                return Array.from(fileMap.entries()).map(([fileName, fileInfo], idx) => {
                  const sortedPages = Array.from(fileInfo.pages).sort((a: number, b: number) => a - b);
                  // Clickable if we have a storage path OR if the filename is available in legacy storage
                  const isClickable = !!fileInfo.filePath || isPdfAvailable(fileName);

                  return (
                    <div
                      key={idx}
                      onClick={() => isClickable && handlePdfClick(fileName, fileInfo.filePath)}
                      className={`group relative bg-gradient-to-br from-white to-gray-50
                                 border border-gray-200 rounded-xl p-4 text-xs sm:text-sm
                                 transition-all duration-200 shadow-sm
                                 ${isClickable ? 'cursor-pointer hover:shadow-lg hover:border-blue-300 hover:scale-[1.02]' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 flex-shrink-0" style={pdfIconStyle} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                            </svg>
                            <p className={`font-semibold text-gray-900 truncate transition-colors
                                         ${isClickable ? 'group-hover:text-blue-600' : ''}`}>
                              {fileName}
                            </p>
                          </div>
                          {sortedPages.length > 0 && (
                            <p className="text-gray-600 text-xs ml-6">
                              {pageLabel} {sortedPages.join(', ')}
                            </p>
                          )}
                        </div>
                        {isClickable && (
                          <div className="flex-shrink-0">
                            <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium
                                          group-hover:bg-blue-100 transition-colors">
                              {viewButton}
                            </div>
                          </div>
                        )}
                      </div>
                      {isClickable && (
                        <div className="absolute inset-0 bg-blue-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* Feedback Buttons - Clean professional design */}
          {!isUser && tenant?.enable_feedback && logId && (
            <div className="mt-3 flex items-center">
              {!feedback ? (
                <div className="inline-flex items-center gap-1 bg-gray-50 rounded-full px-2 py-1 border border-gray-100">
                  <span className="text-[11px] text-gray-400 px-1">{t.feedbackQuestion}</span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleFeedback('positive')}
                      disabled={isSubmittingFeedback}
                      className="p-1.5 rounded-full text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title={t.feedbackThanks}
                      aria-label={t.feedbackThanks}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFeedback('negative')}
                      disabled={isSubmittingFeedback}
                      className="p-1.5 rounded-full text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title={t.feedbackModalTitle}
                      aria-label={t.feedbackModalTitle}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium ${
                  feedback === 'positive'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                }`}>
                  {feedback === 'positive' ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                    </svg>
                  )}
                  {t.feedbackThanks}
                </div>
              )}
            </div>
          )}

          {/* Feedback Modal - Clean professional design */}
          {mounted && showFeedbackModal && createPortal(
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
              onClick={cancelFeedbackModal}
            >
              <div
                className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t.feedbackModalTitle}
                    </h3>
                    <button
                      type="button"
                      onClick={cancelFeedbackModal}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                      aria-label={t.feedbackModalCancel}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5">
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder={t.feedbackModalPlaceholder}
                    className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-lg resize-none
                               text-sm text-gray-700 placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300
                               transition-all"
                    autoFocus
                  />
                </div>

                {/* Footer */}
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                  <button
                    type="button"
                    onClick={cancelFeedbackModal}
                    className="flex-1 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200
                               hover:bg-gray-50 rounded-lg transition-colors font-medium"
                  >
                    {t.feedbackModalCancel}
                  </button>
                  <button
                    type="button"
                    onClick={submitNegativeFeedback}
                    disabled={isSubmittingFeedback}
                    className="flex-1 px-4 py-2 text-sm text-white bg-rose-600 hover:bg-rose-700
                               rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    {isSubmittingFeedback ? '...' : t.feedbackModalSubmit}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  );
};
