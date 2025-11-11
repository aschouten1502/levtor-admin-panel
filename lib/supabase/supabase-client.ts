import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// This is a server-side only client for logging (no authentication)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ [Supabase] Missing Supabase credentials - logging will be skipped');
}

// Create Supabase client with service role key for backend operations
// Service role key bypasses RLS (Row Level Security) - safe for server-side logging
export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Log a chat request to Supabase
 * This function safely handles logging failures without breaking the chat functionality
 */
export async function logChatRequest(data: {
  session_id?: string;
  timestamp: string;
  question: string;
  answer: string;
  language?: string;
  response_time_seconds: number;
  response_time_ms: number;
  pinecone_tokens: number;
  pinecone_cost: number;
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
}) {
  // Skip if Supabase is not configured
  if (!supabase) {
    console.log('⏩ [Supabase] Logging skipped - Supabase not configured');
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    console.log('💾 [Supabase] Logging request to database...');

    const { data: insertedData, error } = await supabase
      .from('geostick_logs_data_qabothr')
      .insert([
        {
          session_id: data.session_id || null,
          timestamp: data.timestamp,
          question: data.question,
          answer: data.answer,
          language: data.language || 'nl',
          response_time_seconds: data.response_time_seconds,
          response_time_ms: data.response_time_ms,
          pinecone_tokens: data.pinecone_tokens,
          pinecone_cost: data.pinecone_cost,
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
          error_details: data.error_details || null,
          is_complete: data.answer !== '[Streaming in progress...]', // Mark placeholder logs as incomplete
        },
      ])
      .select();

    if (error) {
      console.error('❌ [Supabase] Failed to log request:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [Supabase] Request logged successfully');
    return { success: true, data: insertedData };
  } catch (error: any) {
    // Catch and log any errors, but don't break the chat functionality
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
    };

    const { data: updatedData, error } = await supabase
      .from('geostick_logs_data_qabothr')
      .update(updatePayload)
      .eq('id', logId)
      .select();

    if (error) {
      console.error('❌ [Supabase] Failed to update log:', error);

      // Log the error in the database if we can
      if (incrementAttempts) {
        await supabase
          .from('geostick_logs_data_qabothr')
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
          .from('geostick_logs_data_qabothr')
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
      ?.from('geostick_logs_data_qabothr')
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
 */
export async function logContentFilterEvent(data: {
  timestamp: string;
  question: string;
  answer: string;
  response_time_seconds: number;
  response_time_ms: number;
  conversation_history_length: number;
}) {
  return logChatRequest({
    ...data,
    language: 'nl',
    pinecone_tokens: 0,
    pinecone_cost: 0,
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
 */
export async function logErrorEvent(data: {
  timestamp: string;
  question: string;
  error_details: string;
  response_time_seconds: number;
  response_time_ms: number;
  conversation_history_length: number;
}) {
  return logChatRequest({
    ...data,
    answer: 'Error occurred',
    language: 'nl',
    pinecone_tokens: 0,
    pinecone_cost: 0,
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
