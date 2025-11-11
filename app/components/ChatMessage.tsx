'use client';

import { getPdfUrl, isPdfAvailable } from '@/lib/pdf-urls';

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  citations?: any[];
  logId?: string | null;
}

export const ChatMessage = ({ role, content, citations, logId }: ChatMessageProps) => {
  const isUser = role === "user";

  const handlePdfClick = (filename: string) => {
    if (isPdfAvailable(filename)) {
      const pdfUrl = getPdfUrl(filename);
      // Open PDF directly in new tab
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in w-full overflow-hidden`}>
      <div className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-lg
                        ${isUser ? "bg-gradient-to-br from-primary to-primary-dark" : "bg-white"}`}>
          {isUser ? (
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )}
        </div>

        {/* Message Bubble */}
        <div className="flex-1 min-w-0">
          <div
            className={`px-4 py-3 rounded-2xl shadow-lg text-sm sm:text-base
                       ${
                         isUser
                           ? "bg-gradient-to-br from-[#e32219] to-[#c01d15] text-white"
                           : "bg-white text-gray-800 border border-gray-100"
                       }`}
          >
            <p className="whitespace-pre-wrap break-words overflow-hidden">{content}</p>
          </div>

          {/* Citations - Adapted for Pinecone format */}
          {citations && citations.length > 0 && (
            <div className="mt-3 space-y-2">
              {(() => {
                const fileMap = new Map();
                citations.forEach((citation: any) => {
                  citation.references?.forEach((ref: any) => {
                    const fileName = ref.file?.name || 'Onbekend';
                    const pages = ref.pages || [];
                    if (!fileMap.has(fileName)) {
                      fileMap.set(fileName, new Set());
                    }
                    pages.forEach((page: number) => fileMap.get(fileName).add(page));
                  });
                });

                return Array.from(fileMap.entries()).map(([fileName, pagesSet], idx) => {
                  const sortedPages = Array.from(pagesSet).sort((a: any, b: any) => a - b);
                  const isClickable = isPdfAvailable(fileName);

                  return (
                    <div
                      key={idx}
                      onClick={() => isClickable && handlePdfClick(fileName)}
                      className={`group relative bg-gradient-to-br from-white to-gray-50
                                 border border-gray-200 rounded-xl p-4 text-xs sm:text-sm
                                 transition-all duration-200 shadow-sm
                                 ${isClickable ? 'cursor-pointer hover:shadow-lg hover:border-blue-300 hover:scale-[1.02]' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                            </svg>
                            <p className={`font-semibold text-gray-900 truncate transition-colors
                                         ${isClickable ? 'group-hover:text-blue-600' : ''}`}>
                              {fileName}
                            </p>
                          </div>
                          {sortedPages.length > 0 && (
                            <p className="text-gray-600 text-xs ml-6">
                              📄 Pagina {sortedPages.join(', ')}
                            </p>
                          )}
                        </div>
                        {isClickable && (
                          <div className="flex-shrink-0">
                            <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium
                                          group-hover:bg-blue-100 transition-colors">
                              Bekijken
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

          {/* Feedback buttons - TODO: Implementeer feedback functionaliteit */}
          {/* {!isUser && (
            <FeedbackButtons logId={logId || null} />
          )} */}
        </div>
      </div>
    </div>
  );
};
