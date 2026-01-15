/**
 * ========================================
 * LOGS SERVICE - Chat & Document Processing Logs
 * ========================================
 *
 * Handles all log-related database operations:
 * - Fetch chat logs with RAG details
 * - Fetch document processing logs
 * - Log statistics and analytics
 * - Export functionality
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DATABASE_CONFIG } from '@/lib/supabase/config';

// ========================================
// TYPES
// ========================================

export interface ChatLog {
  id: string;
  tenant_id: string;
  session_id?: string;
  question: string;
  answer: string;
  language?: string;
  response_time_seconds?: number;
  response_time_ms?: number;
  embedding_tokens?: number;
  embedding_cost?: number;
  openai_input_tokens?: number;
  openai_output_tokens?: number;
  openai_total_tokens?: number;
  openai_cost?: number;
  total_cost?: number;
  snippets_used?: number;
  citations_count?: number;
  citations?: any[];
  conversation_history_length?: number;
  is_complete?: boolean;
  completion_error?: string;
  blocked?: boolean;
  event_type?: string;
  feedback?: string;
  feedback_comment?: string;
  feedback_timestamp?: string;
  created_at: string;
  updated_at?: string;
  rag_details?: RAGDetails;
}

export interface RAGDetails {
  query?: {
    original: string;
    expanded?: string;
    alternativeQueries?: string[];
    expansionTerms?: string[];
    translation?: {
      originalLanguage?: string;
      translatedQuery?: string;
      targetLanguage?: string;
      wasTranslated?: boolean;
      translationCost?: number;
      translationLatencyMs?: number;
    };
  };
  search?: {
    type: string;
    vectorTopK: number;
    finalTopK: number;
    rerankingEnabled: boolean;
    queries: Array<{
      query: string;
      tokens: number;
      cost: number;
      resultsCount: number;
    }>;
    rawResults: Array<{
      filename: string;
      similarity: number;
      pageNumber?: number;
      chunkId?: string;
      content?: string;
      sectionTitle?: string;
    }>;
    matchedTerms?: string[];
    mergeStats?: {
      totalBeforeMerge: number;
      totalAfterMerge: number;
      duplicatesRemoved: number;
    };
  };
  reranking?: {
    enabled: boolean;
    model?: string;
    inputDocuments: number;
    outputDocuments: number;
    latencyMs: number;
    cost: number;
    results: Array<{
      filename: string;
      beforeScore: number;
      afterScore: number;
      positionBefore: number;
      positionAfter: number;
      pageNumber?: number;
    }>;
  };
  openai?: {
    model: string;
    temperature: number;
    systemPromptTokens: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    streamingDurationMs?: number;
  };
  costs?: {
    embedding: number;
    reranking: number;
    translation?: number;  // Query translation cost (GPT-4o-mini)
    openai: number;
    total: number;
  };
  timing?: {
    embeddingMs: number;
    searchMs: number;
    rerankingMs: number;
    openaiMs: number;
    totalMs: number;
  };
}

export interface DocumentProcessingLog {
  id: string;
  tenant_id: string;
  document_id?: string;
  filename: string;
  file_size_bytes?: number;
  mime_type?: string;
  processing_status: string;
  chunking_method?: string;
  chunking_options?: Record<string, any>;
  total_pages?: number;
  chunks_created?: number;
  structures_detected?: number;
  avg_chunk_size?: number;
  min_chunk_size?: number;
  max_chunk_size?: number;
  metadata_generated?: boolean;
  keywords_count?: number;
  topics_count?: number;
  parsing_cost?: number;
  chunking_cost?: number;
  embedding_cost?: number;
  embedding_tokens?: number;
  metadata_cost?: number;
  metadata_tokens?: number;
  total_cost?: number;
  upload_duration_ms?: number;
  parsing_duration_ms?: number;
  chunking_duration_ms?: number;
  embedding_duration_ms?: number;
  metadata_duration_ms?: number;
  total_duration_ms?: number;
  error_message?: string;
  error_phase?: string;
  error_details?: Record<string, any>;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

export interface LogsFilters {
  startDate?: string;
  endDate?: string;
  language?: string;
  eventType?: string;
  hasError?: boolean;
  hasFeedback?: boolean;
  minCost?: number;
  maxCost?: number;
  searchQuery?: string;
}

export interface LogsStats {
  totalLogs: number;
  completedLogs: number;
  errorLogs: number;
  totalCost: number;
  avgResponseTimeMs: number;
  avgCost: number;
  positiveFeedback: number;
  negativeFeedback: number;
}

export interface TenantLogsOverview {
  tenant_id: string;
  tenant_name?: string;
  total_logs: number;
  total_cost: number;
  avg_response_time_ms: number;
  error_rate: number;
  last_activity: string;
}

// ========================================
// SUPABASE CLIENT
// ========================================

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      console.warn('⚠️ [LogsService] Supabase not configured');
      return null;
    }

    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

// ========================================
// CHAT LOGS - LIST
// ========================================

/**
 * Get chat logs for a tenant with pagination and filters
 */
export async function getChatLogs(
  tenantId: string,
  page: number = 1,
  pageSize: number = 50,
  filters?: LogsFilters
): Promise<{ logs: ChatLog[]; total: number; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { logs: [], total: 0, error: 'Supabase not configured' };
  }

  try {
    let query = supabase
      .from(DATABASE_CONFIG.tableName)
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters.language) {
        query = query.eq('language', filters.language);
      }
      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }
      if (filters.hasError === true) {
        query = query.not('completion_error', 'is', null);
      }
      if (filters.hasFeedback === true) {
        query = query.not('feedback', 'is', null);
      }
      if (filters.searchQuery) {
        query = query.or(`question.ilike.%${filters.searchQuery}%,answer.ilike.%${filters.searchQuery}%`);
      }
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('❌ [LogsService] Error fetching chat logs:', error);
      return { logs: [], total: 0, error: error.message };
    }

    return { logs: data || [], total: count || 0 };
  } catch (err: any) {
    console.error('❌ [LogsService] Unexpected error:', err);
    return { logs: [], total: 0, error: err.message };
  }
}

/**
 * Get a single chat log by ID
 */
export async function getChatLogById(
  logId: string
): Promise<{ log: ChatLog | null; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { log: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from(DATABASE_CONFIG.tableName)
      .select('*')
      .eq('id', logId)
      .single();

    if (error) {
      console.error('❌ [LogsService] Error fetching log:', error);
      return { log: null, error: error.message };
    }

    return { log: data };
  } catch (err: any) {
    console.error('❌ [LogsService] Unexpected error:', err);
    return { log: null, error: err.message };
  }
}

// ========================================
// CHAT LOGS - STATS
// ========================================

/**
 * Get statistics for a tenant's logs
 */
export async function getChatLogsStats(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<{ stats: LogsStats | null; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { stats: null, error: 'Supabase not configured' };
  }

  try {
    let query = supabase
      .from(DATABASE_CONFIG.tableName)
      .select('id, is_complete, completion_error, total_cost, response_time_ms, feedback')
      .eq('tenant_id', tenantId);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [LogsService] Error fetching stats:', error);
      return { stats: null, error: error.message };
    }

    const logs = data || [];
    const totalLogs = logs.length;
    const completedLogs = logs.filter(l => l.is_complete === true).length;
    const errorLogs = logs.filter(l => l.completion_error !== null).length;
    const totalCost = logs.reduce((sum, l) => sum + (l.total_cost || 0), 0);

    // Fix: Only include logs with actual response time in the average calculation
    const logsWithTiming = logs.filter(l =>
      l.response_time_ms !== null && l.response_time_ms !== undefined && l.response_time_ms > 0
    );
    const avgResponseTimeMs = logsWithTiming.length > 0
      ? logsWithTiming.reduce((sum, l) => sum + l.response_time_ms!, 0) / logsWithTiming.length
      : 0;

    const avgCost = totalLogs > 0 ? totalCost / totalLogs : 0;
    const positiveFeedback = logs.filter(l => l.feedback === 'positive').length;
    const negativeFeedback = logs.filter(l => l.feedback === 'negative').length;

    return {
      stats: {
        totalLogs,
        completedLogs,
        errorLogs,
        totalCost,
        avgResponseTimeMs,
        avgCost,
        positiveFeedback,
        negativeFeedback
      }
    };
  } catch (err: any) {
    console.error('❌ [LogsService] Unexpected error:', err);
    return { stats: null, error: err.message };
  }
}

/**
 * Get overview of all tenants' logs
 *
 * FIX v2.2: Nu worden ALLE tenants getoond, ook als ze nog geen chats hebben.
 * Dit lost het probleem op dat nieuwe tenants pas zichtbaar werden na eerste chat.
 */
export async function getAllTenantsLogsOverview(): Promise<{
  tenants: TenantLogsOverview[];
  error?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { tenants: [], error: 'Supabase not configured' };
  }

  try {
    // STAP 1: Haal ALLE tenants op (ook zonder logs)
    const { data: allTenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, created_at, is_active')
      .order('created_at', { ascending: false });

    if (tenantsError) {
      console.error('❌ [LogsService] Error fetching tenants:', tenantsError);
      return { tenants: [], error: tenantsError.message };
    }

    // STAP 2: Haal chat logs op
    const { data: chatLogs } = await supabase
      .from(DATABASE_CONFIG.tableName)
      .select('tenant_id, total_cost, response_time_ms, completion_error, created_at')
      .order('created_at', { ascending: false });

    // STAP 3: Haal document processing logs op voor laatste activiteit
    const { data: docLogs } = await supabase
      .from('document_processing_logs')
      .select('tenant_id, total_cost, completed_at')
      .eq('processing_status', 'completed')
      .order('completed_at', { ascending: false });

    // Group chat logs by tenant
    const chatsByTenant = new Map<string, any[]>();
    for (const log of chatLogs || []) {
      if (!log.tenant_id) continue;
      if (!chatsByTenant.has(log.tenant_id)) {
        chatsByTenant.set(log.tenant_id, []);
      }
      chatsByTenant.get(log.tenant_id)!.push(log);
    }

    // Group doc logs by tenant
    const docsByTenant = new Map<string, any[]>();
    for (const log of docLogs || []) {
      if (!log.tenant_id) continue;
      if (!docsByTenant.has(log.tenant_id)) {
        docsByTenant.set(log.tenant_id, []);
      }
      docsByTenant.get(log.tenant_id)!.push(log);
    }

    // Calculate stats per tenant
    const result: TenantLogsOverview[] = [];

    for (const tenant of allTenants || []) {
      const tenantChats = chatsByTenant.get(tenant.id) || [];
      const tenantDocs = docsByTenant.get(tenant.id) || [];

      const totalLogs = tenantChats.length;
      const chatCost = tenantChats.reduce((sum, l) => sum + (l.total_cost || 0), 0);
      const docCost = tenantDocs.reduce((sum, d) => sum + (d.total_cost || 0), 0);
      const totalCost = chatCost + docCost;

      const avgResponseTimeMs = totalLogs > 0
        ? tenantChats.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / totalLogs
        : 0;
      const errorCount = tenantChats.filter(l => l.completion_error !== null).length;
      const errorRate = totalLogs > 0 ? (errorCount / totalLogs) * 100 : 0;

      // Bepaal laatste activiteit (chat of document)
      const lastChatAt = tenantChats.length > 0 ? tenantChats[0].created_at : null;
      const lastDocAt = tenantDocs.length > 0 ? tenantDocs[0].completed_at : null;

      let lastActivity = tenant.created_at;
      if (lastChatAt && lastDocAt) {
        lastActivity = new Date(lastChatAt) > new Date(lastDocAt) ? lastChatAt : lastDocAt;
      } else if (lastChatAt) {
        lastActivity = lastChatAt;
      } else if (lastDocAt) {
        lastActivity = lastDocAt;
      }

      result.push({
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        total_logs: totalLogs,
        total_cost: totalCost,
        avg_response_time_ms: avgResponseTimeMs,
        error_rate: errorRate,
        last_activity: lastActivity
      });
    }

    // Sort by total cost (descending) - tenants met kosten eerst
    result.sort((a, b) => b.total_cost - a.total_cost);

    return { tenants: result };
  } catch (err: any) {
    console.error('❌ [LogsService] Unexpected error:', err);
    return { tenants: [], error: err.message };
  }
}

// ========================================
// DOCUMENT PROCESSING LOGS
// ========================================

/**
 * Get document processing logs for a tenant
 */
export async function getDocumentProcessingLogs(
  tenantId: string,
  page: number = 1,
  pageSize: number = 50
): Promise<{ logs: DocumentProcessingLog[]; total: number; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { logs: [], total: 0, error: 'Supabase not configured' };
  }

  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await supabase
      .from('document_processing_logs')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('❌ [LogsService] Error fetching document logs:', error);
      return { logs: [], total: 0, error: error.message };
    }

    return { logs: data || [], total: count || 0 };
  } catch (err: any) {
    console.error('❌ [LogsService] Unexpected error:', err);
    return { logs: [], total: 0, error: err.message };
  }
}

// ========================================
// EXPORT
// ========================================

/**
 * Export chat logs as JSON
 */
export async function exportChatLogsAsJson(
  tenantId: string,
  filters?: LogsFilters
): Promise<{ data: string; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: '', error: 'Supabase not configured' };
  }

  try {
    let query = supabase
      .from(DATABASE_CONFIG.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [LogsService] Error exporting logs:', error);
      return { data: '', error: error.message };
    }

    return { data: JSON.stringify(data, null, 2) };
  } catch (err: any) {
    console.error('❌ [LogsService] Unexpected error:', err);
    return { data: '', error: err.message };
  }
}

/**
 * Export chat logs as CSV
 */
export async function exportChatLogsAsCsv(
  tenantId: string,
  filters?: LogsFilters
): Promise<{ data: string; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: '', error: 'Supabase not configured' };
  }

  try {
    let query = supabase
      .from(DATABASE_CONFIG.tableName)
      .select('id, created_at, question, answer, language, response_time_ms, total_cost, feedback, event_type')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [LogsService] Error exporting logs:', error);
      return { data: '', error: error.message };
    }

    // Convert to CSV
    if (!data || data.length === 0) {
      return { data: '' };
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          const val = (row as any)[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
          return val;
        }).join(',')
      )
    ];

    return { data: csvRows.join('\n') };
  } catch (err: any) {
    console.error('❌ [LogsService] Unexpected error:', err);
    return { data: '', error: err.message };
  }
}

// ========================================
// RAG DETAILS HELPERS
// ========================================

/**
 * Check if a log has RAG details
 */
export function hasRagDetails(log: ChatLog): boolean {
  return !!(log.rag_details && Object.keys(log.rag_details).length > 0);
}

/**
 * Get position change summary from reranking results
 */
export function getRerankingSummary(ragDetails: RAGDetails): {
  moved_up: number;
  moved_down: number;
  stayed_same: number;
  avg_position_change: number;
} {
  if (!ragDetails.reranking?.results || ragDetails.reranking.results.length === 0) {
    return { moved_up: 0, moved_down: 0, stayed_same: 0, avg_position_change: 0 };
  }

  const results = ragDetails.reranking.results;
  let movedUp = 0;
  let movedDown = 0;
  let stayedSame = 0;
  let totalChange = 0;

  for (const r of results) {
    const change = r.positionBefore - r.positionAfter;
    totalChange += change;

    if (change > 0) movedUp++;
    else if (change < 0) movedDown++;
    else stayedSame++;
  }

  return {
    moved_up: movedUp,
    moved_down: movedDown,
    stayed_same: stayedSame,
    avg_position_change: results.length > 0 ? totalChange / results.length : 0
  };
}
