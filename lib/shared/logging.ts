/**
 * ========================================
 * LOGGING - Gestructureerde Logs & Analytics
 * ========================================
 *
 * Dit bestand bevat alle logging functionaliteit voor:
 * - Request tracking (vraag, antwoord, timing, kosten)
 * - Error categorisatie en diagnostics
 * - Content filter events
 * - Supabase analytics integratie
 *
 * Alle logs zijn gestructureerd en makkelijk te zoeken/filteren.
 */

import { Citation } from '@/lib/rag';
import { logChatRequest, logErrorEvent, logContentFilterEvent } from '@/lib/shared/supabase/supabase-client';

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * Complete request summary voor analytics
 */
export interface RequestSummary {
  tenant_id: string;  // Required for multi-tenant
  session_id?: string;
  timestamp: string;
  question: string;
  answer: string;
  response_time_seconds: number;
  response_time_ms: number;
  embedding_tokens: number;
  embedding_cost: number;
  openai_input_tokens: number;
  openai_output_tokens: number;
  openai_total_tokens: number;
  openai_cost: number;
  total_cost: number;
  snippets_used: number;
  citations_count: number;
  conversation_history_length: number;
  language: string;
  citations: Citation[];
  rag_details?: Record<string, any>;  // RAG pipeline details for comprehensive logging
}

/**
 * Error categorieën voor betere diagnostics
 */
export type ErrorCategory =
  | 'RAG_ERROR'
  | 'OPENAI_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'CODE_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Error details voor logging
 */
export interface ErrorDetails {
  category: ErrorCategory;
  source: string;
  type: string;
  message: string;
  code?: string | null;
  status?: number | null;
  stack?: string | null;
}

// ========================================
// REQUEST LOGGING
// ========================================

/**
 * Logt een succesvolle chat request naar console en Supabase
 *
 * @param summary - Complete request summary met alle data (inclusief tenant_id)
 * @returns Promise met het log ID voor feedback tracking
 */
export async function logSuccessfulRequest(summary: RequestSummary): Promise<string | null> {
  console.log('\n📊 [Logging] ========== REQUEST SUMMARY ==========');
  console.log('🏢 [Logging] Tenant ID:', summary.tenant_id);
  console.log('🔑 [Logging] Session ID:', summary.session_id || 'NO_SESSION_ID');
  console.log('⏱️  [Logging] Timestamp:', summary.timestamp);
  console.log('❓ [Logging] Question:', summary.question);
  console.log('💬 [Logging] Answer length:', summary.answer.length, 'chars');
  console.log('⏱️  [Logging] Response time:', summary.response_time_seconds, 'seconds');
  console.log('💰 [Logging] Total cost: $' + summary.total_cost.toFixed(6));
  console.log('🌐 [Logging] Language:', summary.language);
  console.log('📎 [Logging] Citations:', summary.citations_count);
  console.log('');
  console.log('📊 [Logging] Full Summary:', JSON.stringify(summary, null, 2));
  console.log('========================================\n');

  // Log naar Supabase (non-blocking - falen mag de chat niet breken)
  try {
    // Extract tenant_id and pass separately to logChatRequest
    const { tenant_id, ...logData } = summary;
    const result = await logChatRequest(tenant_id, logData);
    if (result.success && result.data && result.data[0]) {
      const logId = result.data[0].id;
      console.log('✅ [Logging] Log ID for feedback:', logId);
      return logId;
    }
    return null;
  } catch (err: any) {
    console.error('⚠️ [Logging] Failed to log to Supabase (non-critical):', err.message || err);
    return null;
  }
}

// ========================================
// ERROR CATEGORIZATION
// ========================================

/**
 * Categoriseert een error op basis van het error object
 *
 * Dit helpt bij:
 * - Snellere diagnostics (weet meteen waar het fout ging)
 * - Betere user messages (specifieke foutmeldingen per categorie)
 * - Analytics (welke API faalt het meest?)
 *
 * @param error - Het error object
 * @returns Error category en source
 */
export function categorizeError(error: any): { category: ErrorCategory; source: string } {
  let category: ErrorCategory = 'UNKNOWN_ERROR';
  let source = 'Unknown';

  // Check error message en code voor categorisatie
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code || '';

  if (errorMessage.includes('rag') || errorMessage.includes('embedding') || errorMessage.includes('vector') || errorMessage.includes('supabase')) {
    category = 'RAG_ERROR';
    source = 'RAG System';
  } else if (errorMessage.includes('openai') || errorCode === 'insufficient_quota') {
    category = 'OPENAI_ERROR';
    source = 'OpenAI API';
  } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    category = 'NETWORK_ERROR';
    source = 'Network/API Connection';
  } else if (errorMessage.includes('timeout')) {
    category = 'TIMEOUT_ERROR';
    source = 'Request Timeout';
  } else if (error?.name === 'TypeError' || error?.name === 'ReferenceError') {
    category = 'CODE_ERROR';
    source = 'Application Code';
  }

  return { category, source };
}

// ========================================
// ERROR LOGGING
// ========================================

/**
 * Logt een error met volledige context en diagnostics
 *
 * @param error - Het error object
 * @param requestStartTime - Wanneer de request begon
 * @param message - De user vraag
 * @param conversationHistory - De conversatie geschiedenis
 * @param language - De geselecteerde taal
 * @param tenantId - Tenant ID voor multi-tenant logging
 */
export function logError(
  error: any,
  requestStartTime: number,
  message: string,
  conversationHistory: any[],
  language: string,
  tenantId?: string
): void {
  const requestEndTime = Date.now();
  const responseTimeMs = requestEndTime - requestStartTime;
  const responseTimeSeconds = (responseTimeMs / 1000).toFixed(2);

  // Categoriseer de error
  const { category, source } = categorizeError(error);

  // Log naar console met duidelijke structuur
  console.error('\n❌ [Logging] ========== ERROR DETECTED ==========');
  console.error('🔴 [Logging] ERROR CATEGORY:', category);
  console.error('📍 [Logging] ERROR SOURCE:', source);
  console.error('⏱️  [Logging] Failed after:', responseTimeSeconds, 'seconds');
  console.error('');
  console.error('📋 [Logging] ERROR DETAILS:');
  console.error('   • Type:', error?.name || 'Unknown');
  console.error('   • Message:', error?.message || 'No error message');
  console.error('   • Code:', error?.code || 'N/A');
  console.error('   • Status:', error?.status || error?.statusCode || 'N/A');
  console.error('');
  console.error('📝 [Logging] REQUEST CONTEXT:');
  console.error('   • User question:', message?.substring(0, 100) + (message?.length > 100 ? '...' : '') || 'No message');
  console.error('   • Language:', language || 'nl');
  console.error('   • Conversation length:', conversationHistory?.length || 0);
  console.error('   • Timestamp:', new Date(requestStartTime).toISOString());
  console.error('');

  // Log stack trace (eerste 5 regels)
  if (error?.stack) {
    console.error('🔍 [Logging] STACK TRACE:');
    const stackLines = error.stack.split('\n').slice(0, 5);
    stackLines.forEach((line: string) => console.error('   ' + line));
    console.error('');
  }

  // Log full error object voor deep debugging
  console.error('🔬 [Logging] FULL ERROR OBJECT:');
  console.error(JSON.stringify({
    name: error?.name,
    message: error?.message,
    code: error?.code,
    status: error?.status || error?.statusCode,
    type: error?.type,
    response: error?.response?.data || error?.response
  }, null, 2));
  console.error('========================================\n');

  // Prepare error details voor Supabase
  const errorDetails: ErrorDetails = {
    category,
    source,
    type: error?.name || 'Unknown',
    message: error?.message || 'Unknown error',
    code: error?.code || null,
    status: error?.status || error?.statusCode || null,
    stack: error?.stack?.split('\n').slice(0, 3).join(' | ') || null
  };

  // Log naar Supabase (non-blocking) - only if tenantId is provided
  if (tenantId) {
    logErrorEvent(tenantId, {
      timestamp: new Date(requestStartTime).toISOString(),
      question: message || 'Unknown',
      error_details: JSON.stringify(errorDetails),
      response_time_seconds: parseFloat(responseTimeSeconds),
      response_time_ms: responseTimeMs,
      conversation_history_length: conversationHistory?.length || 0
    }).catch(err => {
      console.error('⚠️ [Logging] Failed to log error to Supabase (non-critical):', err.message || err);
    });
  } else {
    console.warn('⚠️ [Logging] Skipping Supabase error log - no tenant ID provided');
  }
}

// ========================================
// CONTENT FILTER LOGGING
// ========================================

/**
 * Check of een error een content filter error is
 *
 * @param error - Het error object
 * @returns true als het een content filter error is
 */
export function isContentFilterError(error: any): boolean {
  const errorMessage = error?.message || '';
  return errorMessage.includes('content_filter') ||
         errorMessage.includes('ResponsibleAIPolicyViolation') ||
         errorMessage.includes('content management policy');
}

/**
 * Logt een content filter event
 *
 * Deze errors zijn speciaal omdat ze niet technisch zijn,
 * maar ontstaan door keywords die geblokkeerd worden door OpenAI.
 *
 * @param requestStartTime - Wanneer de request begon
 * @param message - De geblokkeerde vraag
 * @param conversationHistory - De conversatie geschiedenis
 * @param tenantId - Tenant ID voor multi-tenant logging
 */
export function logContentFilter(
  requestStartTime: number,
  message: string,
  conversationHistory: any[],
  tenantId?: string
): void {
  const requestEndTime = Date.now();
  const responseTimeMs = requestEndTime - requestStartTime;
  const responseTimeSeconds = (responseTimeMs / 1000).toFixed(2);

  console.log('\n⚠️  [Logging] ========== CONTENT FILTER TRIGGERED ==========');
  console.log('⚠️  [Logging] Question blocked by content filter');
  console.log('⚠️  [Logging] User will receive friendly message to contact HR directly');
  console.log('⏱️  [Logging] Response time:', responseTimeSeconds, 'seconds');

  const filterMessage = 'Je vraag bevat termen die automatisch worden geblokkeerd om misbruik te voorkomen. Als je vraag echt HR-gerelateerd is, neem dan contact op met je leidinggevende of de HR-afdeling voor een persoonlijk gesprek.';

  // Log voor Supabase
  console.log('\n📊 [Logging] ========== CONTENT FILTER EVENT ==========');
  const filterEventSummary = {
    timestamp: new Date(requestStartTime).toISOString(),
    event_type: 'content_filter_triggered',
    question: message,
    answer: filterMessage,
    response_time_seconds: parseFloat(responseTimeSeconds),
    response_time_ms: responseTimeMs,
    blocked: true,
    conversation_history_length: conversationHistory?.length || 0
  };
  console.log('📊 [Logging] Summary:', JSON.stringify(filterEventSummary, null, 2));
  console.log('========================================\n');

  // Log naar Supabase (non-blocking) - only if tenantId is provided
  if (tenantId) {
    logContentFilterEvent(tenantId, {
      timestamp: new Date(requestStartTime).toISOString(),
      question: message,
      answer: filterMessage,
      response_time_seconds: parseFloat(responseTimeSeconds),
      response_time_ms: responseTimeMs,
      conversation_history_length: conversationHistory?.length || 0
    }).catch(err => {
      console.error('⚠️ [Logging] Failed to log content filter to Supabase (non-critical):', err.message || err);
    });
  } else {
    console.warn('⚠️ [Logging] Skipping Supabase content filter log - no tenant ID provided');
  }
}

// ========================================
// USER-FRIENDLY ERROR MESSAGES
// ========================================

/**
 * Geeft een user-friendly error message op basis van de error category
 *
 * @param category - De error category
 * @returns User-friendly message in Nederlands
 */
export function getUserFriendlyErrorMessage(category: ErrorCategory): string {
  switch (category) {
    case 'RAG_ERROR':
      return 'Er is een probleem met het ophalen van HR documentatie. Probeer het over een moment opnieuw.';
    case 'OPENAI_ERROR':
      return 'Er is een probleem met het genereren van een antwoord. Probeer het opnieuw.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT_ERROR':
      return 'De verbinding is verloren. Controleer je internetverbinding en probeer opnieuw.';
    default:
      return 'Er is een fout opgetreden. Probeer het opnieuw.';
  }
}
