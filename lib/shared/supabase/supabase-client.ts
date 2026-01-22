import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DATABASE_CONFIG, getConfigSummary } from './config';

// ========================================
// SUPABASE CLIENT INITIALIZATION
// ========================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ [Supabase] Missing Supabase credentials - logging will be skipped');
}

// Create Supabase client with service role key for backend operations
// Service role key bypasses RLS (Row Level Security) - safe for server-side logging
export const supabase: SupabaseClient | null = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Log configuration on startup (development only)
if (process.env.NODE_ENV === 'development' && supabase) {
  console.log('🔧 [Supabase] Multi-tenant configuration:', getConfigSummary());
}

// ========================================
// TENANT VALIDATION
// ========================================

/**
 * Validates that a tenant exists and is active
 * @param tenantId - The tenant ID to validate
 * @returns Object with validation result and tenant data if found
 */
export async function validateTenant(tenantId: string): Promise<{
  valid: boolean;
  tenant?: {
    id: string;
    name: string;
    logo_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    welcome_message: string | null;
    contact_email: string | null;
    is_active: boolean;
  };
  error?: string;
}> {
  if (!supabase) {
    return { valid: false, error: 'Supabase not configured' };
  }

  if (!tenantId) {
    return { valid: false, error: 'No tenant ID provided' };
  }

  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { valid: false, error: `Tenant '${tenantId}' not found` };
      }
      return { valid: false, error: error.message };
    }

    if (!data.is_active) {
      return { valid: false, error: `Tenant '${tenantId}' is not active` };
    }

    return { valid: true, tenant: data };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Unknown error validating tenant' };
  }
}

// ========================================
// CHAT LOGGING FUNCTIONS
// ========================================

/**
 * Log a chat request to Supabase
 * This function safely handles logging failures without breaking the chat functionality
 *
 * @param tenantId - Required tenant ID for multi-tenant isolation
 * @param data - Chat request data to log
 */
export async function logChatRequest(
  tenantId: string,
  data: {
    session_id?: string;
    timestamp: string;
    question: string;
    answer: string;
    language?: string;
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
    citations?: any[];
    conversation_history_length: number;
    blocked?: boolean;
    event_type?: string;
    error_details?: string;
    rag_details?: Record<string, any>;  // RAG pipeline details for comprehensive logging
  }
) {
  // Skip if Supabase is not configured
  if (!supabase) {
    console.log('⏩ [Supabase] Logging skipped - Supabase not configured');
    return { success: false, error: 'Supabase not configured' };
  }

  // Validate tenant_id is provided
  if (!tenantId) {
    console.error('❌ [Supabase] Cannot log without tenant_id');
    return { success: false, error: 'tenant_id is required' };
  }

  try {
    console.log(`💾 [Supabase] Logging request to table: ${DATABASE_CONFIG.tableName}`);
    console.log(`🏢 [Supabase] Tenant: ${tenantId}`);

    // Build insert payload - tenant_id is now required
    const insertPayload = {
      tenant_id: tenantId,
      session_id: data.session_id || null,
      question: data.question,
      answer: data.answer,
      language: data.language || 'nl',
      response_time_seconds: data.response_time_seconds,
      response_time_ms: data.response_time_ms,
      embedding_tokens: data.embedding_tokens,
      embedding_cost: data.embedding_cost,
      openai_input_tokens: data.openai_input_tokens,
      openai_output_tokens: data.openai_output_tokens,
      openai_total_tokens: data.openai_total_tokens,
      openai_cost: data.openai_cost,
      total_cost: data.total_cost,
      snippets_used: data.snippets_used,
      citations_count: data.citations_count,
      citations: data.citations || null,
      conversation_history_length: data.conversation_history_length,
      blocked: data.blocked || false,
      event_type: data.event_type || 'chat_request',
      is_complete: data.answer !== '[Streaming in progress...]',
      rag_details: data.rag_details || null,  // RAG pipeline details
    };

    const { data: insertedData, error } = await supabase
      .from(DATABASE_CONFIG.tableName)
      .insert([insertPayload])
      .select();

    if (error) {
      console.error('❌ [Supabase] Failed to log request:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [Supabase] Request logged successfully');
    return { success: true, data: insertedData };
  } catch (error: any) {
    console.error('❌ [Supabase] Unexpected error while logging:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a chat request log in Supabase
 * Used to update placeholder logs after streaming completes
 */
export async function updateChatRequest(
  logId: string,
  data: {
    answer: string;
    response_time_seconds: number;
    response_time_ms: number;
    openai_input_tokens: number;
    openai_output_tokens: number;
    openai_total_tokens: number;
    openai_cost: number;
    total_cost: number;
    rag_details?: Record<string, any>;  // RAG pipeline details (can be updated with OpenAI timing)
  },
  incrementAttempts: boolean = false
) {
  // Skip if Supabase is not configured
  if (!supabase) {
    console.log('⏩ [Supabase] Update skipped - Supabase not configured');
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    console.log('🔄 [Supabase] Updating log entry:', logId);

    const updatePayload: any = {
      answer: data.answer,
      response_time_seconds: data.response_time_seconds,
      response_time_ms: data.response_time_ms,
      openai_input_tokens: data.openai_input_tokens,
      openai_output_tokens: data.openai_output_tokens,
      openai_total_tokens: data.openai_total_tokens,
      openai_cost: data.openai_cost,
      total_cost: data.total_cost,
      is_complete: true, // Mark as complete when successfully updated
      ...(data.rag_details && { rag_details: data.rag_details }),  // Include rag_details if provided
    };

    const { data: updatedData, error } = await supabase
      .from(DATABASE_CONFIG.tableName)
      .update(updatePayload)
      .eq('id', logId)
      .select();

    if (error) {
      console.error('❌ [Supabase] Failed to update log:', error);

      // Log the error in the database if we can
      if (incrementAttempts) {
        await supabase
          .from(DATABASE_CONFIG.tableName)
          .update({
            completion_error: error.message,
          })
          .eq('id', logId)
          .select();
      }

      return { success: false, error: error.message };
    }

    console.log('✅ [Supabase] Log updated successfully');
    return { success: true, data: updatedData };
  } catch (error: any) {
    console.error('❌ [Supabase] Unexpected error while updating log:', error);

    // Try to log the error in the database
    if (incrementAttempts) {
      try {
        await supabase
          .from(DATABASE_CONFIG.tableName)
          .update({
            completion_error: error.message,
          })
          .eq('id', logId)
          .select();
      } catch (innerError) {
        console.error('❌ [Supabase] Failed to log error:', innerError);
      }
    }

    return { success: false, error: error.message };
  }
}

/**
 * Update a chat request log with retry logic and exponential backoff
 * Handles transient failures that occur after streaming completes
 */
export async function updateChatRequestWithRetry(
  logId: string,
  data: {
    answer: string;
    response_time_seconds: number;
    response_time_ms: number;
    openai_input_tokens: number;
    openai_output_tokens: number;
    openai_total_tokens: number;
    openai_cost: number;
    total_cost: number;
    rag_details?: Record<string, any>;  // RAG pipeline details (can be updated with OpenAI timing)
  },
  maxRetries: number = 3
): Promise<{ success: boolean; error?: string; attempts?: number }> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await updateChatRequest(logId, data, true);

    if (result.success) {
      console.log(`✅ [Supabase] Log updated successfully on attempt ${attempt}/${maxRetries}`);
      return { success: true, attempts: attempt };
    }

    lastError = result.error;

    if (attempt < maxRetries) {
      // Exponential backoff: 500ms, 1000ms, 2000ms
      const delayMs = 500 * Math.pow(2, attempt - 1);
      console.warn(
        `⚠️ [Supabase] Update failed (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.error(
    `❌ [Supabase] Failed to update log after ${maxRetries} attempts:`,
    lastError
  );

  // Mark as permanently failed
  try {
    await supabase
      ?.from(DATABASE_CONFIG.tableName)
      .update({
        completion_error: `Failed after ${maxRetries} retry attempts: ${lastError}`,
      })
      .eq('id', logId);
  } catch (error) {
    console.error('❌ [Supabase] Failed to mark log as failed:', error);
  }

  return { success: false, error: lastError, attempts: maxRetries };
}

/**
 * Log a content filter event to Supabase
 * @param tenantId - Required tenant ID
 * @param data - Content filter event data
 */
export async function logContentFilterEvent(
  tenantId: string,
  data: {
    timestamp: string;
    question: string;
    answer: string;
    response_time_seconds: number;
    response_time_ms: number;
    conversation_history_length: number;
  }
) {
  return logChatRequest(tenantId, {
    ...data,
    language: 'nl',
    embedding_tokens: 0,
    embedding_cost: 0,
    openai_input_tokens: 0,
    openai_output_tokens: 0,
    openai_total_tokens: 0,
    openai_cost: 0,
    total_cost: 0,
    snippets_used: 0,
    citations_count: 0,
    citations: [],
    blocked: true,
    event_type: 'content_filter_triggered',
  });
}

/**
 * Log an error event to Supabase
 * @param tenantId - Required tenant ID
 * @param data - Error event data
 */
export async function logErrorEvent(
  tenantId: string,
  data: {
    timestamp: string;
    question: string;
    error_details: string;
    response_time_seconds: number;
    response_time_ms: number;
    conversation_history_length: number;
  }
) {
  return logChatRequest(tenantId, {
    ...data,
    answer: 'Error occurred',
    language: 'nl',
    embedding_tokens: 0,
    embedding_cost: 0,
    openai_input_tokens: 0,
    openai_output_tokens: 0,
    openai_total_tokens: 0,
    openai_cost: 0,
    total_cost: 0,
    snippets_used: 0,
    citations_count: 0,
    citations: [],
    blocked: false,
    event_type: 'error',
  });
}
