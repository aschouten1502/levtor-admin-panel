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

// ========================================
// ADMIN USER TYPES (Levtor medewerkers)
// ========================================

/**
 * Admin Users - Levtor platform administrators
 * Separate from customer_users for clear access control
 */
export interface AdminUser {
  id: string;
  auth_user_id: string;
  email: string;
  name: string | null;
  role: 'super_admin' | 'admin' | 'viewer';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserInsert {
  auth_user_id: string;
  email: string;
  name?: string | null;
  role?: 'super_admin' | 'admin' | 'viewer';
  is_active?: boolean;
}

export interface AdminUserUpdate {
  email?: string;
  name?: string | null;
  role?: 'super_admin' | 'admin' | 'viewer';
  is_active?: boolean;
}

// ========================================
// NEW TYPES FOR CUSTOMER-CENTRIC ARCHITECTURE
// ========================================

/**
 * Product catalog - what products does Levtor offer?
 */
export interface Product {
  id: string;                       // 'hr_bot', 'voice_agent', etc.
  name: string;                     // 'HR Bot', 'Voice Agent'
  description: string | null;
  icon: string | null;              // Emoji or icon name
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductInsert {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  is_active?: boolean;
}

/**
 * Tenant Products - links customers to their purchased products
 */
export interface TenantProduct {
  id: string;
  tenant_id: string;
  product_id: string;
  name: string | null;              // Custom name like "GeoStick HR Bot"
  config: Json;                     // Product-specific settings
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantProductInsert {
  tenant_id: string;
  product_id: string;
  name?: string | null;
  config?: Json;
  is_active?: boolean;
}

export interface TenantProductUpdate {
  name?: string | null;
  config?: Json;
  is_active?: boolean;
}

/**
 * Invoices - PDF invoices uploaded by admin for customers
 */
export interface Invoice {
  id: string;
  tenant_id: string;
  filename: string;
  file_path: string;                // Supabase Storage path
  file_size: number | null;
  invoice_number: string | null;
  invoice_date: string | null;      // ISO date string
  amount: number | null;            // Amount in EUR
  description: string | null;
  // Payment status fields
  is_paid_by_customer: boolean;     // Customer marked as paid
  customer_paid_at: string | null;  // When customer marked as paid
  is_verified_by_admin: boolean;    // Admin verified the payment
  admin_verified_at: string | null; // When admin verified
  admin_notes: string | null;       // Admin notes about verification
  created_at: string;
  updated_at: string;
}

export interface InvoiceInsert {
  tenant_id: string;
  filename: string;
  file_path: string;
  file_size?: number | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  amount?: number | null;
  description?: string | null;
}

export interface InvoiceUpdate {
  filename?: string;
  file_path?: string;
  file_size?: number | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  amount?: number | null;
  description?: string | null;
  // Payment status fields
  is_paid_by_customer?: boolean;
  customer_paid_at?: string | null;
  is_verified_by_admin?: boolean;
  admin_verified_at?: string | null;
  admin_notes?: string | null;
}

/**
 * Customer Users - portal users linked to a tenant
 */
export interface CustomerUser {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerUserInsert {
  tenant_id: string;
  email: string;
  name?: string | null;
  role?: 'admin' | 'user';
  is_active?: boolean;
}

export interface CustomerUserUpdate {
  email?: string;
  name?: string | null;
  role?: 'admin' | 'user';
  is_active?: boolean;
}

/**
 * Extended Tenant with product info
 */
export interface TenantWithProducts {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  products: TenantProduct[];
  customer_users_count?: number;
  invoices_count?: number;
}
