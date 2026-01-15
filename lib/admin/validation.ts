/**
 * ========================================
 * ADMIN VALIDATION UTILITIES
 * ========================================
 *
 * Centralized validation constants and functions for admin forms.
 * Used in both client-side forms and server-side API routes.
 */

// ========================================
// VALIDATION PATTERNS
// ========================================

export const VALIDATION = {
  TENANT_ID: {
    pattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
    maxLength: 50,
    minLength: 1,
    message: 'Alleen kleine letters, cijfers en streepjes (max 50 karakters)',
  },
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Ongeldig e-mailadres',
  },
  COLOR: {
    pattern: /^#[0-9A-Fa-f]{6}$/,
    message: 'Gebruik formaat #RRGGBB',
  },
  NAME: {
    maxLength: 100,
    minLength: 1,
    message: 'Maximaal 100 karakters',
  },
  URL: {
    message: 'Ongeldige URL',
  },
} as const;

// ========================================
// VALIDATION FUNCTIONS
// ========================================

/**
 * Validate tenant ID format
 */
export function validateTenantId(id: string): string | null {
  if (!id || id.length === 0) {
    return 'Tenant ID is verplicht';
  }

  if (id.length > VALIDATION.TENANT_ID.maxLength) {
    return `Maximaal ${VALIDATION.TENANT_ID.maxLength} karakters`;
  }

  if (!VALIDATION.TENANT_ID.pattern.test(id)) {
    return VALIDATION.TENANT_ID.message;
  }

  return null;
}

/**
 * Validate email format (optional field)
 */
export function validateEmail(email: string): string | null {
  if (!email) return null; // Optional field

  if (!VALIDATION.EMAIL.pattern.test(email)) {
    return VALIDATION.EMAIL.message;
  }

  return null;
}

/**
 * Validate hex color format
 */
export function validateColor(color: string): string | null {
  if (!color) return null; // Optional field

  if (!VALIDATION.COLOR.pattern.test(color)) {
    return VALIDATION.COLOR.message;
  }

  return null;
}

/**
 * Validate URL format (optional field)
 */
export function validateUrl(url: string): string | null {
  if (!url) return null; // Optional field

  try {
    new URL(url);
    return null;
  } catch {
    return VALIDATION.URL.message;
  }
}

/**
 * Validate required text field
 */
export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || value.trim().length === 0) {
    return `${fieldName} is verplicht`;
  }
  return null;
}

/**
 * Validate text with max length
 */
export function validateMaxLength(value: string, maxLength: number, fieldName: string): string | null {
  if (value && value.length > maxLength) {
    return `${fieldName} mag maximaal ${maxLength} karakters zijn`;
  }
  return null;
}

// ========================================
// COMPOSITE VALIDATORS
// ========================================

export interface ValidationErrors {
  [key: string]: string;
}

/**
 * Validate all tenant creation fields
 */
export function validateTenantCreate(data: {
  id: string;
  name: string;
  contact_email?: string;
  primary_color?: string;
  secondary_color?: string;
  website_url?: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};

  // Required fields
  const idError = validateTenantId(data.id);
  if (idError) errors.id = idError;

  const nameError = validateRequired(data.name, 'Bedrijfsnaam');
  if (nameError) errors.name = nameError;

  const nameMaxError = validateMaxLength(data.name, VALIDATION.NAME.maxLength, 'Bedrijfsnaam');
  if (nameMaxError) errors.name = nameMaxError;

  // Optional fields
  if (data.contact_email) {
    const emailError = validateEmail(data.contact_email);
    if (emailError) errors.contact_email = emailError;
  }

  if (data.primary_color) {
    const colorError = validateColor(data.primary_color);
    if (colorError) errors.primary_color = colorError;
  }

  if (data.secondary_color) {
    const colorError = validateColor(data.secondary_color);
    if (colorError) errors.secondary_color = colorError;
  }

  if (data.website_url) {
    const urlError = validateUrl(data.website_url);
    if (urlError) errors.website_url = urlError;
  }

  return errors;
}

/**
 * Check if validation errors object is empty (form is valid)
 */
export function isValid(errors: ValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}
