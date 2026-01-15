export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Generic Chat Logs Row Type
 *
 * This type defines the schema for chat request logs.
 * Compatible with multiple table names:
 * - "chat_logs" (default/generic)
 * - "geostick_logs_data_qabothr" (legacy)
 * - "{tenant-id}_chat_logs" (client-specific)
 *
 * NOTE: The tenant_id field is optional for backwards compatibility.
 * New deployments should include tenant_id in shared database scenarios.
 */
export interface ChatLogRow {
  answer: string
  blocked: boolean | null
  citations: Json | null
  citations_count: number | null
  completion_error: string | null
  conversation_history_length: number | null
  created_at: string | null
  error_details: string | null
  event_type: string | null
  feedback: string | null
  feedback_comment: string | null
  feedback_timestamp: string | null
  id: string
  is_complete: boolean | null
  language: string | null
  openai_cost: number | null
  openai_input_tokens: number | null
  openai_output_tokens: number | null
  openai_total_tokens: number | null
  embedding_cost: number | null
  embedding_tokens: number | null
  question: string
  response_time_ms: number | null
  response_time_seconds: number | null
  session_id: string | null
  snippets_used: number | null
  timestamp: string
  total_cost: number | null
  update_attempts: number | null
  updated_at: string | null
  tenant_id?: string | null  // Optional: for multi-tenant shared database
  rag_details?: Json | null  // RAG pipeline details for comprehensive logging
}

export interface ChatLogInsert {
  answer: string
  blocked?: boolean | null
  citations?: Json | null
  citations_count?: number | null
  completion_error?: string | null
  conversation_history_length?: number | null
  created_at?: string | null
  error_details?: string | null
  event_type?: string | null
  feedback?: string | null
  feedback_comment?: string | null
  feedback_timestamp?: string | null
  id?: string
  is_complete?: boolean | null
  language?: string | null
  openai_cost?: number | null
  openai_input_tokens?: number | null
  openai_output_tokens?: number | null
  openai_total_tokens?: number | null
  embedding_cost?: number | null
  embedding_tokens?: number | null
  question: string
  response_time_ms?: number | null
  response_time_seconds?: number | null
  session_id?: string | null
  snippets_used?: number | null
  timestamp?: string
  total_cost?: number | null
  update_attempts?: number | null
  updated_at?: string | null
  tenant_id?: string | null  // Optional: for multi-tenant shared database
  rag_details?: Json | null  // RAG pipeline details for comprehensive logging
}

export interface ChatLogUpdate {
  answer?: string
  blocked?: boolean | null
  citations?: Json | null
  citations_count?: number | null
  completion_error?: string | null
  conversation_history_length?: number | null
  created_at?: string | null
  error_details?: string | null
  event_type?: string | null
  feedback?: string | null
  feedback_comment?: string | null
  feedback_timestamp?: string | null
  id?: string
  is_complete?: boolean | null
  language?: string | null
  openai_cost?: number | null
  openai_input_tokens?: number | null
  openai_output_tokens?: number | null
  openai_total_tokens?: number | null
  embedding_cost?: number | null
  embedding_tokens?: number | null
  question?: string
  response_time_ms?: number | null
  response_time_seconds?: number | null
  session_id?: string | null
  snippets_used?: number | null
  timestamp?: string
  total_cost?: number | null
  update_attempts?: number | null
  updated_at?: string | null
  tenant_id?: string | null  // Optional: for multi-tenant shared database
  rag_details?: Json | null  // RAG pipeline details for comprehensive logging
}

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      // Legacy table name (backwards compatible)
      geostick_logs_data_qabothr: {
        Row: ChatLogRow
        Insert: ChatLogInsert
        Update: ChatLogUpdate
        Relationships: []
      }
      // Generic table name (recommended for new deployments)
      chat_logs: {
        Row: ChatLogRow
        Insert: ChatLogInsert
        Update: ChatLogUpdate
        Relationships: []
      }
    }
    Views: {
      request_analytics: {
        Row: {
          avg_cost_per_request: number | null
          avg_response_time_seconds: number | null
          blocked_requests: number | null
          date: string | null
          error_requests: number | null
          language: string | null
          total_cost: number | null
          total_openai_cost: number | null
          total_openai_tokens: number | null
          total_embedding_cost: number | null
          total_embedding_tokens: number | null
          total_requests: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
