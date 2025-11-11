'use client';

import { X } from 'lucide-react';

interface PdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  filename: string;
}

export default function PdfModal({ isOpen, onClose, pdfUrl, filename }: PdfModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Header - Geostick Red Theme */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-[#e32219] to-[#c01d15]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white truncate pr-4">
              {filename}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 hover:bg-white/20 rounded-full transition-all duration-200"
            aria-label="Sluiten"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title={filename}
          />
        </div>

        {/* Footer with download link - Modern Geostick Style */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#e32219] hover:text-white
                       bg-red-50 hover:bg-gradient-to-r hover:from-[#e32219] hover:to-[#c01d15]
                       rounded-xl transition-all duration-200 hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in nieuw tabblad
          </a>
        </div>
      </div>
    </div>
  );
}
