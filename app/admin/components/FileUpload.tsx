'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface FileWithPreview extends File {
  preview?: string;
}

interface FileUploadProps {
  accept: string;
  multiple?: boolean;
  maxSize?: number; // bytes
  onSelect: (files: FileWithPreview[]) => void;
  onRemove?: (index: number) => void;
  value?: FileWithPreview[];
  disabled?: boolean;
  children?: React.ReactNode;
  error?: string;
}

/**
 * File upload component with drag & drop support
 *
 * Features:
 * - Drag & drop
 * - File type validation
 * - File size validation
 * - Preview URL management (with cleanup)
 * - Multiple file support
 */
export default function FileUpload({
  accept,
  multiple = false,
  maxSize,
  onSelect,
  onRemove,
  value = [],
  disabled = false,
  children,
  error,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      value.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);

  const validateFiles = useCallback((files: File[]): { valid: FileWithPreview[]; errors: string[] } => {
    const valid: FileWithPreview[] = [];
    const errors: string[] = [];
    const acceptedTypes = accept.split(',').map(t => t.trim());

    for (const file of files) {
      // Check file type
      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        if (type.includes('*')) {
          const [mainType] = type.split('/');
          return file.type.startsWith(mainType);
        }
        return file.type === type;
      });

      if (!isValidType) {
        errors.push(`${file.name}: ongeldig bestandstype`);
        continue;
      }

      // Check file size
      if (maxSize && file.size > maxSize) {
        const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
        errors.push(`${file.name}: te groot (max ${maxSizeMB}MB)`);
        continue;
      }

      // Create preview URL for images
      const fileWithPreview = file as FileWithPreview;
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }

      valid.push(fileWithPreview);
    }

    return { valid, errors };
  }, [accept, maxSize]);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || disabled) return;

    const files = Array.from(fileList);
    const { valid, errors } = validateFiles(files);

    if (errors.length > 0) {
      setLocalError(errors.join(', '));
      setTimeout(() => setLocalError(null), 5000);
    }

    if (valid.length > 0) {
      if (multiple) {
        onSelect([...value, ...valid]);
      } else {
        // Cleanup previous preview URL
        if (value[0]?.preview) {
          URL.revokeObjectURL(value[0].preview);
        }
        onSelect(valid.slice(0, 1));
      }
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [disabled, validateFiles, multiple, value, onSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  const handleRemove = useCallback((index: number) => {
    const file = value[index];
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
    onRemove?.(index);
  }, [value, onRemove]);

  const displayError = error || localError;

  return (
    <div className="space-y-2">
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
          ${displayError ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        <input
          type="file"
          ref={inputRef}
          onChange={handleInputChange}
          accept={accept}
          multiple={multiple}
          className="hidden"
          disabled={disabled}
        />
        {children || (
          <>
            <svg className="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-blue-600">Klik om te uploaden</span> of sleep bestanden hierheen
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {accept.replace(/\./g, '').toUpperCase()} bestanden
              {maxSize && ` (max ${(maxSize / 1024 / 1024).toFixed(0)}MB)`}
            </p>
          </>
        )}
      </div>

      {displayError && (
        <p className="text-sm text-red-600" role="alert">{displayError}</p>
      )}

      {/* File preview list */}
      {value.length > 0 && onRemove && (
        <ul className="space-y-2">
          {value.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-10 h-10 object-contain rounded-lg bg-white"
                  />
                ) : (
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-gray-400 hover:text-red-600 p-2 transition-colors"
                aria-label={`Verwijder ${file.name}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
