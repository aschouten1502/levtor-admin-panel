/**
 * ========================================
 * SUPABASE RAG - Text Sanitizer
 * ========================================
 *
 * Sanitizes text before sending to OpenAI embeddings API.
 * Removes problematic characters that cause "unknown token" errors.
 *
 * Common issues fixed:
 * - Control characters (0x00-0x1F)
 * - Zero-width characters (U+200B, U+FEFF, etc.)
 * - Invalid UTF-8 sequences
 * - PDF extraction artifacts (ligatures, special chars)
 */

// ========================================
// MAIN SANITIZATION FUNCTION
// ========================================

/**
 * Sanitizes text by removing/replacing problematic characters.
 * This is the main entry point for text sanitization.
 *
 * @param text - The text to sanitize
 * @returns Sanitized text safe for OpenAI API
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return normalizeWhitespace(
    replacePDFArtifacts(
      removeZeroWidthCharacters(
        removeControlCharacters(
          fixInvalidSurrogates(
            normalizeUnicode(text)
          )
        )
      )
    )
  );
}

// ========================================
// SANITIZATION STEPS
// ========================================

/**
 * Normalizes Unicode to NFC form.
 * This ensures consistent character representation.
 */
function normalizeUnicode(text: string): string {
  try {
    return text.normalize('NFC');
  } catch {
    // If normalization fails, return original
    console.warn('⚠️ [Sanitizer] Unicode normalization failed');
    return text;
  }
}

/**
 * Removes invalid surrogate pairs (lone surrogates).
 * These can appear in corrupted text and cause API errors.
 */
function fixInvalidSurrogates(text: string): string {
  // Remove lone high surrogates (not followed by low surrogate)
  // Remove lone low surrogates (not preceded by high surrogate)
  // Using a simple character-by-character approach for reliability
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    // High surrogate (0xD800-0xDBFF)
    if (code >= 0xD800 && code <= 0xDBFF) {
      const nextCode = text.charCodeAt(i + 1);
      // Check if followed by low surrogate (0xDC00-0xDFFF)
      if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
        // Valid surrogate pair - keep both
        result += text[i] + text[i + 1];
        i++; // Skip next char as we've handled it
      }
      // else: lone high surrogate - skip it
    }
    // Low surrogate without preceding high surrogate
    else if (code >= 0xDC00 && code <= 0xDFFF) {
      // Skip lone low surrogate
    }
    // Normal character
    else {
      result += text[i];
    }
  }
  return result;
}

/**
 * Removes control characters (0x00-0x1F) except valid whitespace.
 * Keeps: \t (0x09), \n (0x0A), \r (0x0D)
 */
function removeControlCharacters(text: string): string {
  // Remove: 0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F (DEL)
  // Keep: 0x09 (tab), 0x0A (newline), 0x0D (carriage return)
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Removes zero-width and invisible characters.
 * These can cause tokenization issues.
 */
function removeZeroWidthCharacters(text: string): string {
  return text.replace(
    /[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\u00AD\u180E\u061C]/g,
    ''
  );
  // Removed characters:
  // U+200B Zero Width Space
  // U+200C Zero Width Non-Joiner
  // U+200D Zero Width Joiner
  // U+200E Left-to-Right Mark
  // U+200F Right-to-Left Mark
  // U+2028 Line Separator
  // U+2029 Paragraph Separator
  // U+202A-U+202F Directional formatting
  // U+2060-U+206F General punctuation (word joiner, invisible operators)
  // U+FEFF Byte Order Mark (BOM)
  // U+00AD Soft Hyphen
  // U+180E Mongolian Vowel Separator
  // U+061C Arabic Letter Mark
}

/**
 * Replaces common PDF extraction artifacts with standard characters.
 */
function replacePDFArtifacts(text: string): string {
  return text
    // Common ligatures from PDF fonts
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/ﬀ/g, 'ff')
    .replace(/ﬃ/g, 'ffi')
    .replace(/ﬄ/g, 'ffl')
    .replace(/ﬅ/g, 'st')  // long s + t
    .replace(/ﬆ/g, 'st')  // st ligature

    // Replacement character (indicates encoding issue) - remove
    .replace(/\uFFFD/g, '')

    // Typographic quotes to standard ASCII
    .replace(/[""„‟]/g, '"')
    .replace(/[''‚‛]/g, "'")

    // Various dashes to standard hyphen-minus
    .replace(/[–—―‐‑‒]/g, '-')

    // Ellipsis to three dots
    .replace(/…/g, '...')

    // Various spaces to regular space
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // U+00A0 Non-breaking space
    // U+2000-U+200A Various typographic spaces
    // U+202F Narrow no-break space
    // U+205F Medium mathematical space
    // U+3000 Ideographic space

    // Bullet characters to standard bullet
    .replace(/[●○◦◆◇■□▪▫•‣⁃]/g, '• ')

    // Fraction characters to ASCII
    .replace(/½/g, '1/2')
    .replace(/⅓/g, '1/3')
    .replace(/⅔/g, '2/3')
    .replace(/¼/g, '1/4')
    .replace(/¾/g, '3/4')

    // Common symbols
    .replace(/©/g, '(c)')
    .replace(/®/g, '(R)')
    .replace(/™/g, '(TM)')
    .replace(/€/g, 'EUR ')
    .replace(/£/g, 'GBP ')
    .replace(/¥/g, 'JPY ')

    // Remove other problematic Unicode blocks
    // Private Use Area characters (often from custom PDF fonts)
    .replace(/[\uE000-\uF8FF]/g, '')

    // Specials block (includes replacement char, handled above)
    .replace(/[\uFFF0-\uFFFB]/g, '');
}

/**
 * Normalizes whitespace for consistent text.
 */
function normalizeWhitespace(text: string): string {
  return text
    // Convert Windows line endings to Unix
    .replace(/\r\n/g, '\n')
    // Remove standalone carriage returns
    .replace(/\r/g, '\n')
    // Convert tabs to spaces
    .replace(/\t/g, ' ')
    // Collapse multiple spaces to single space
    .replace(/ +/g, ' ')
    // Remove spaces at start/end of lines
    .replace(/^ +/gm, '')
    .replace(/ +$/gm, '')
    // Collapse multiple blank lines to max 2
    .replace(/\n{3,}/g, '\n\n')
    // Trim the whole string
    .trim();
}

// ========================================
// VALIDATION FUNCTIONS
// ========================================

export interface TextValidationResult {
  valid: boolean;
  issues: string[];
  sanitized: string;
  originalLength: number;
  sanitizedLength: number;
  removedChars: number;
}

/**
 * Validates text before sending to OpenAI API.
 * Returns issues found and sanitized version.
 *
 * @param text - The text to validate
 * @returns Validation result with issues and sanitized text
 */
export function validateForEmbedding(text: string): TextValidationResult {
  const issues: string[] = [];
  const originalLength = text?.length || 0;

  if (!text || typeof text !== 'string') {
    return {
      valid: false,
      issues: ['Text is empty or not a string'],
      sanitized: '',
      originalLength: 0,
      sanitizedLength: 0,
      removedChars: 0
    };
  }

  // Check for common problems
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text)) {
    issues.push('Contains control characters');
  }
  if (/[\u200B-\u200F\u2060-\u206F\uFEFF]/.test(text)) {
    issues.push('Contains zero-width characters');
  }
  if (/\uFFFD/.test(text)) {
    issues.push('Contains replacement characters (encoding issues)');
  }
  if (/[\uE000-\uF8FF]/.test(text)) {
    issues.push('Contains Private Use Area characters (custom PDF fonts)');
  }
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(text) ||
      /(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text)) {
    issues.push('Contains invalid surrogate pairs');
  }

  const sanitized = sanitizeText(text);
  const sanitizedLength = sanitized.length;
  const removedChars = originalLength - sanitizedLength;

  if (sanitized.length === 0) {
    issues.push('Text is empty after sanitization');
  }

  return {
    valid: issues.length === 0,
    issues,
    sanitized,
    originalLength,
    sanitizedLength,
    removedChars
  };
}

// ========================================
// TOKEN ESTIMATION
// ========================================

/**
 * Estimates the number of tokens in a text.
 * More accurate than simple length/4 for Dutch/German text.
 *
 * @param text - The text to estimate
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;

  // Base estimate: ~3.5 chars per token for Dutch/German
  // English is ~4 chars per token
  // But we use 3.5 to be conservative (overestimate)
  let estimate = Math.ceil(text.length / 3.5);

  // Adjust for special patterns that affect tokenization:

  // Numbers tokenize roughly 1-3 digits per token
  const numberMatches = text.match(/\d+/g);
  if (numberMatches) {
    const totalDigits = numberMatches.join('').length;
    // Adjust: numbers take more tokens than average text
    estimate += Math.ceil(totalDigits / 2);
  }

  // URLs and technical strings tokenize poorly
  const urlMatches = text.match(/https?:\/\/[^\s]+/g);
  if (urlMatches) {
    const totalUrlChars = urlMatches.join('').length;
    // URLs can be 1-2 chars per token
    estimate += Math.ceil(totalUrlChars / 2);
  }

  return estimate;
}

/**
 * Checks if text exceeds the OpenAI embedding token limit.
 *
 * @param text - The text to check
 * @param limit - Token limit (default: 8191 for embeddings API)
 * @returns True if text exceeds limit
 */
export function exceedsTokenLimit(text: string, limit: number = 8191): boolean {
  return estimateTokenCount(text) > limit;
}

// ========================================
// BATCH SANITIZATION
// ========================================

export interface BatchSanitizationResult {
  sanitizedTexts: string[];
  validIndices: number[];
  invalidIndices: number[];
  totalIssues: number;
  issuesByIndex: Map<number, string[]>;
}

/**
 * Sanitizes a batch of texts and reports issues.
 * Useful for document processing pipelines.
 *
 * @param texts - Array of texts to sanitize
 * @returns Batch sanitization result with valid/invalid indices
 */
export function sanitizeBatch(texts: string[]): BatchSanitizationResult {
  const sanitizedTexts: string[] = [];
  const validIndices: number[] = [];
  const invalidIndices: number[] = [];
  const issuesByIndex = new Map<number, string[]>();
  let totalIssues = 0;

  for (let i = 0; i < texts.length; i++) {
    const result = validateForEmbedding(texts[i]);
    sanitizedTexts.push(result.sanitized);

    if (result.sanitized.length > 0) {
      validIndices.push(i);
    } else {
      invalidIndices.push(i);
    }

    if (result.issues.length > 0) {
      issuesByIndex.set(i, result.issues);
      totalIssues += result.issues.length;
    }
  }

  return {
    sanitizedTexts,
    validIndices,
    invalidIndices,
    totalIssues,
    issuesByIndex
  };
}
