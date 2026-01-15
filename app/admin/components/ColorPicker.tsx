'use client';

import { useState, useEffect, useCallback } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  error?: string;
  required?: boolean;
  id?: string;
}

// Validate hex color format
const isValidHexColor = (color: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
};

/**
 * Color picker with text input and validation
 *
 * Features:
 * - Native color picker + text input
 * - HEX validation
 * - Debounced validation (300ms)
 * - Error state styling
 * - Real-time preview
 */
export default function ColorPicker({
  label,
  value,
  onChange,
  error,
  required = false,
  id,
}: ColorPickerProps) {
  const [localValue, setLocalValue] = useState(value);
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync local value with prop value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Validate and propagate changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue === value) return;

      if (isValidHexColor(localValue)) {
        setLocalError(null);
        onChange(localValue);
      } else if (localValue.length > 0) {
        setLocalError('Gebruik formaat #RRGGBB');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, value, onChange]);

  // Handle color picker change (always valid)
  const handleColorPickerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setLocalValue(newColor);
    setLocalError(null);
    onChange(newColor);
  }, [onChange]);

  // Handle text input change
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Auto-add # if missing
    if (newValue.length > 0 && !newValue.startsWith('#')) {
      newValue = '#' + newValue;
    }

    // Convert to uppercase for consistency
    newValue = newValue.toUpperCase();

    setLocalValue(newValue);
  }, []);

  const displayError = error || localError;
  const inputId = id || `color-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const safeColorValue = isValidHexColor(localValue) ? localValue : '#000000';

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="flex items-center gap-3">
        <input
          type="color"
          id={inputId}
          value={safeColorValue}
          onChange={handleColorPickerChange}
          className="w-14 h-12 rounded-lg border border-gray-300 cursor-pointer"
          aria-label={`${label} kleurkiezer`}
        />
        <input
          type="text"
          value={localValue}
          onChange={handleTextChange}
          placeholder="#000000"
          maxLength={7}
          className={`
            flex-1 px-4 py-3 border rounded-lg font-mono text-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${displayError ? 'border-red-300 bg-red-50' : 'border-gray-300'}
          `}
          aria-invalid={!!displayError}
          aria-describedby={displayError ? `${inputId}-error` : undefined}
        />
      </div>

      {displayError && (
        <p id={`${inputId}-error`} className="text-sm text-red-600" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
}
