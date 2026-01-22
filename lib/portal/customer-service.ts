/**
 * ========================================
 * CUSTOMER SERVICE - CRUD Operations
 * ========================================
 *
 * Handles customer_users table operations:
 * - Create, Read, Update, Delete customer users
 * - Used by Admin to manage portal access
 *
 * NOTE: Customer users authenticate via Supabase Auth,
 * this table links them to a tenant.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ========================================
// TYPES
// ========================================

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

export interface CustomerUserCreateInput {
  tenant_id: string;
  email: string;
  name?: string;
  role?: 'admin' | 'user';
  password: string;  // For creating Supabase Auth user
}

export interface CustomerUserUpdateInput {
  name?: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
}

export interface CustomerUserWithTenant extends CustomerUser {
  tenant_name: string;
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
      console.warn('⚠️ [CustomerService] Supabase not configured');
      return null;
    }

    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

// ========================================
// CRUD OPERATIONS
// ========================================

/**
 * Create a new customer user
 * 1. Creates Supabase Auth user
 * 2. Creates customer_users record linking to tenant
 */
export async function createCustomerUser(
  input: CustomerUserCreateInput
): Promise<{ success: boolean; customer?: CustomerUser; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'Database niet geconfigureerd' };
  }

  try {
    // Step 1: Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,  // Auto-confirm email
    });

    if (authError) {
      console.error('❌ [CustomerService] Auth user creation failed:', authError);

      if (authError.message.includes('already been registered')) {
        return { success: false, error: 'Dit emailadres is al in gebruik' };
      }

      return { success: false, error: authError.message };
    }

    // Step 2: Create customer_users record
    const { data: customerData, error: customerError } = await supabase
      .from('customer_users')
      .insert({
        tenant_id: input.tenant_id,
        email: input.email,
        name: input.name || null,
        role: input.role || 'user',
        is_active: true,
      })
      .select()
      .single();

    if (customerError) {
      // Rollback: delete auth user if customer_users insert fails
      console.error('❌ [CustomerService] customer_users insert failed:', customerError);

      if (authData.user) {
        await supabase.auth.admin.deleteUser(authData.user.id);
      }

      return { success: false, error: 'Fout bij aanmaken klant account' };
    }

    console.log('✅ [CustomerService] Created customer user:', customerData.email, 'for tenant:', customerData.tenant_id);

    return {
      success: true,
      customer: customerData as CustomerUser,
    };
  } catch (err: any) {
    console.error('❌ [CustomerService] Create error:', err);
    return { success: false, error: 'Onverwachte fout' };
  }
}

/**
 * Get customer user by ID
 */
export async function getCustomerUserById(id: string): Promise<CustomerUser | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('customer_users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('❌ [CustomerService] Get by ID error:', error);
    return null;
  }

  return data as CustomerUser;
}

/**
 * Get customer user by email
 */
export async function getCustomerUserByEmail(email: string): Promise<CustomerUser | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('customer_users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is not an error
      console.error('❌ [CustomerService] Get by email error:', error);
    }
    return null;
  }

  return data as CustomerUser;
}

/**
 * Get all customer users for a tenant
 */
export async function getCustomerUsersByTenant(tenantId: string): Promise<CustomerUser[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('customer_users')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ [CustomerService] Get by tenant error:', error);
    return [];
  }

  return data as CustomerUser[];
}

/**
 * Get all customer users (admin only)
 */
export async function getAllCustomerUsers(): Promise<CustomerUserWithTenant[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('customer_users')
    .select(`
      *,
      tenants!inner(name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ [CustomerService] Get all error:', error);
    return [];
  }

  return data.map((row: any) => ({
    ...row,
    tenant_name: row.tenants?.name || row.tenant_id,
  })) as CustomerUserWithTenant[];
}

/**
 * Update customer user
 */
export async function updateCustomerUser(
  id: string,
  input: CustomerUserUpdateInput
): Promise<{ success: boolean; customer?: CustomerUser; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'Database niet geconfigureerd' };
  }

  const { data, error } = await supabase
    .from('customer_users')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ [CustomerService] Update error:', error);
    return { success: false, error: 'Fout bij updaten' };
  }

  console.log('✅ [CustomerService] Updated customer user:', data.email);

  return {
    success: true,
    customer: data as CustomerUser,
  };
}

/**
 * Delete customer user
 * Also deletes the Supabase Auth user
 */
export async function deleteCustomerUser(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'Database niet geconfigureerd' };
  }

  try {
    // Get customer first to find their auth user
    const customer = await getCustomerUserById(id);
    if (!customer) {
      return { success: false, error: 'Klant niet gevonden' };
    }

    // Find and delete Supabase Auth user by email
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(u => u.email === customer.email);

    if (authUser) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(authUser.id);
      if (authDeleteError) {
        console.warn('⚠️ [CustomerService] Could not delete auth user:', authDeleteError);
      }
    }

    // Delete customer_users record
    const { error } = await supabase
      .from('customer_users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ [CustomerService] Delete error:', error);
      return { success: false, error: 'Fout bij verwijderen' };
    }

    console.log('✅ [CustomerService] Deleted customer user:', customer.email);

    return { success: true };
  } catch (err: any) {
    console.error('❌ [CustomerService] Delete error:', err);
    return { success: false, error: 'Onverwachte fout' };
  }
}

/**
 * Check if email is available (not already used)
 */
export async function isEmailAvailable(email: string): Promise<boolean> {
  const customer = await getCustomerUserByEmail(email);
  return customer === null;
}

/**
 * Deactivate customer user (soft delete)
 */
export async function deactivateCustomerUser(
  id: string
): Promise<{ success: boolean; error?: string }> {
  return updateCustomerUser(id, { is_active: false });
}

/**
 * Reactivate customer user
 */
export async function reactivateCustomerUser(
  id: string
): Promise<{ success: boolean; error?: string }> {
  return updateCustomerUser(id, { is_active: true });
}
