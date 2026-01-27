'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Document } from '@/lib/rag/types';
import ConfirmModal from '@/app/admin/components/ConfirmModal';

// ========================================
// TYPES
// ========================================

interface DocumentsSectionProps {
  tenantId: string;
  documents: Document[];
}

interface FileUploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

interface ProcessingStatus {
  documentId: string;
  filename: string;
  phase: 'uploading' | 'parsing' | 'chunking' | 'embedding' | 'metadata' | 'completed' | 'failed';
  chunksCreated?: number;
  totalPages?: number;
  errorMessage?: string;
}

interface DeleteModalState {
  isOpen: boolean;
  document: Document | null;
}

// ========================================
// CONSTANTS
// ========================================

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ========================================
// UTILITIES
// ========================================

const formatFileSize = (bytes: number | undefined): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// ========================================
// COMPONENT
// ========================================

export default function DocumentsSection({ tenantId, documents }: DocumentsSectionProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [uploadQueue, setUploadQueue] = useState<FileUploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Processing status from polling
  const [processingStatuses, setProcessingStatuses] = useState<Record<string, ProcessingStatus>>({});

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    document: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if any documents are processing
  const hasProcessingDocuments = documents.some(
    doc => doc.processing_status === 'processing' || doc.processing_status === 'pending'
  );

  // ========================================
  // POLLING FOR PROCESSING STATUS
  // ========================================

  useEffect(() => {
    if (!hasProcessingDocuments) {
      setProcessingStatuses({});
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(
          `/api/admin/products/hr-bot/tenants/${tenantId}/documents/status`
        );
        if (response.ok) {
          const data = await response.json();
          const statusMap: Record<string, ProcessingStatus> = {};
          for (const status of data.processingDocuments || []) {
            statusMap[status.documentId] = status;
          }
          setProcessingStatuses(statusMap);

          // Refresh page when all processing is done
          if (!data.hasProcessing) {
            router.refresh();
          }
        }
      } catch (err) {
        console.error('Failed to poll processing status:', err);
      }
    };

    // Initial poll
    pollStatus();

    // Poll every 2 seconds
    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [tenantId, hasProcessingDocuments, router]);

  // ========================================
  // DRAG AND DROP HANDLERS
  // ========================================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadQueue.some(item => item.status === 'uploading')) return;
    setIsDragging(true);
  }, [uploadQueue]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFilesSelected(files);
  }, []);

  // ========================================
  // FILE SELECTION AND VALIDATION
  // ========================================

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    handleFilesSelected(Array.from(files));
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFilesSelected = (files: File[]) => {
    const validFiles: FileUploadItem[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Validate PDF type
      if (file.type !== 'application/pdf') {
        errors.push(`${file.name}: Geen PDF bestand`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: Groter dan 50MB`);
        continue;
      }

      validFiles.push({
        id: generateId(),
        file,
        status: 'pending',
        progress: 0,
      });
    }

    if (errors.length > 0) {
      setError(errors.join('. '));
      setTimeout(() => setError(null), 5000);
    }

    if (validFiles.length > 0) {
      setUploadQueue(prev => [...prev, ...validFiles]);
      // Start uploading
      for (const item of validFiles) {
        uploadFile(item);
      }
    }
  };

  // ========================================
  // UPLOAD WITH PROGRESS
  // ========================================

  const uploadFile = (item: FileUploadItem) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', item.file);

    // Update status to uploading
    setUploadQueue(prev =>
      prev.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i)
    );

    // Progress handler
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        setUploadQueue(prev =>
          prev.map(i => i.id === item.id ? { ...i, progress } : i)
        );
      }
    };

    // Upload complete - now processing server-side
    xhr.upload.onload = () => {
      setUploadQueue(prev =>
        prev.map(i => i.id === item.id ? { ...i, status: 'processing', progress: 100 } : i)
      );
    };

    // Response handler
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Success - remove from queue and refresh
        setUploadQueue(prev => prev.filter(i => i.id !== item.id));
        router.refresh();
      } else {
        let errorMsg = 'Upload mislukt';
        try {
          const result = JSON.parse(xhr.responseText);
          errorMsg = result.error || errorMsg;
        } catch {
          // Ignore parse error
        }
        setUploadQueue(prev =>
          prev.map(i => i.id === item.id
            ? { ...i, status: 'failed', error: errorMsg }
            : i
          )
        );
      }
    };

    xhr.onerror = () => {
      setUploadQueue(prev =>
        prev.map(i => i.id === item.id
          ? { ...i, status: 'failed', error: 'Netwerkfout' }
          : i
        )
      );
    };

    xhr.open('POST', `/api/admin/products/hr-bot/tenants/${tenantId}/documents`);
    xhr.send(formData);
  };

  const removeFromQueue = (id: string) => {
    setUploadQueue(prev => prev.filter(i => i.id !== id));
  };

  // ========================================
  // DELETE HANDLERS
  // ========================================

  const openDeleteModal = (document: Document) => {
    setDeleteModal({ isOpen: true, document });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, document: null });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.document) return;

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/admin/products/hr-bot/tenants/${tenantId}/documents?documentId=${deleteModal.document.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Verwijderen mislukt');
      }

      router.refresh();
      closeDeleteModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verwijderen mislukt');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  // ========================================
  // DOCUMENT URL
  // ========================================

  const getDocumentUrl = (document: Document): string | null => {
    if (!document.file_path) return null;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const bucketName = `${tenantId}-hr-documents`;
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${document.file_path}`;
  };

  // ========================================
  // STATUS BADGE
  // ========================================

  const getStatusBadge = (document: Document) => {
    const processingStatus = processingStatuses[document.id];

    // Use detailed phase if available
    if (processingStatus && !['completed', 'failed'].includes(processingStatus.phase)) {
      const phaseLabels: Record<string, { label: string; color: string }> = {
        uploading: { label: 'Uploaden...', color: 'bg-blue-100 text-blue-700' },
        parsing: { label: 'PDF lezen...', color: 'bg-yellow-100 text-yellow-700' },
        chunking: { label: 'Opsplitsen...', color: 'bg-yellow-100 text-yellow-700' },
        embedding: { label: 'Embeddings...', color: 'bg-yellow-100 text-yellow-700' },
        metadata: { label: 'Metadata...', color: 'bg-yellow-100 text-yellow-700' },
      };

      const phase = phaseLabels[processingStatus.phase] || { label: 'Verwerken...', color: 'bg-yellow-100 text-yellow-700' };

      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${phase.color}`}>
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {phase.label}
        </span>
      );
    }

    // Fallback to document status
    const statusConfig: Record<string, { label: string; color: string }> = {
      completed: { label: 'Gereed', color: 'bg-green-100 text-green-700' },
      processing: { label: 'Verwerken...', color: 'bg-yellow-100 text-yellow-700' },
      pending: { label: 'Wachten...', color: 'bg-gray-100 text-gray-600' },
      failed: { label: 'Mislukt', color: 'bg-red-100 text-red-700' },
    };

    const status = statusConfig[document.processing_status] || statusConfig.pending;
    const isProcessing = document.processing_status === 'processing' || document.processing_status === 'pending';

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
        {isProcessing && (
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {status.label}
      </span>
    );
  };

  // ========================================
  // RENDER
  // ========================================

  const isUploading = uploadQueue.some(item => item.status === 'uploading' || item.status === 'processing');

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={!isUploading ? handleFileSelect : undefined}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-all
          ${isDragging
            ? 'border-blue-500 bg-blue-50 scale-[1.02]'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
          ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          disabled={isUploading}
          aria-label="Upload PDF bestanden"
        />

        <svg className="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-blue-600">Klik om te uploaden</span> of sleep bestanden
        </p>
        <p className="text-xs text-gray-400 mt-1">Alleen PDF bestanden (max 50MB)</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <div className="space-y-2">
          {uploadQueue.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                <div className="mt-1.5 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      item.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {item.status === 'uploading' && `Uploaden... ${item.progress}%`}
                  {item.status === 'processing' && 'Verwerken op server...'}
                  {item.status === 'failed' && <span className="text-red-600">{item.error}</span>}
                </p>
              </div>
              {item.status === 'failed' && (
                <button
                  type="button"
                  onClick={() => removeFromQueue(item.id)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Verwijder uit wachtrij"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">Nog geen documenten</p>
          <p className="text-xs text-gray-400 mt-1">Upload PDF bestanden om te beginnen</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {documents.map((doc) => {
            const url = getDocumentUrl(doc);
            const isReady = doc.processing_status === 'completed';

            return (
              <li key={doc.id} className="group py-3 flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.filename}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                      {doc.file_size && <span>•</span>}
                      <span>{formatDate(doc.created_at)}</span>
                      {doc.total_chunks > 0 && (
                        <>
                          <span>•</span>
                          <span>{doc.total_chunks} chunks</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status Badge */}
                  {getStatusBadge(doc)}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isReady && url && (
                      <>
                        {/* View */}
                        <button
                          type="button"
                          onClick={() => window.open(url, '_blank')}
                          title="Bekijken"
                          aria-label="Bekijk document"
                          className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {/* Download */}
                        <a
                          href={url}
                          download={doc.filename}
                          title="Downloaden"
                          className="text-gray-400 hover:text-green-600 p-1.5 rounded hover:bg-green-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                      </>
                    )}
                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => openDeleteModal(doc)}
                      title="Verwijderen"
                      aria-label="Verwijder document"
                      className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        title="Document verwijderen?"
        message={
          <p>
            Weet je zeker dat je <strong>{deleteModal.document?.filename}</strong> wilt verwijderen?
            Dit verwijdert ook alle chunks en embeddings.
          </p>
        }
        confirmLabel="Verwijderen"
        cancelLabel="Annuleren"
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
