/**
 * ========================================
 * ADMIN AUTH SERVICE
 * ========================================
 *
 * Service voor het beheren van Levtor admin gebruikers.
 * Admin users zijn gescheiden van customer_users voor
 * duidelijke toegangscontrole.
 *
 * Rollen:
 * - super_admin: Volledige toegang, kan andere admins beheren
 * - admin: Volledige toegang tot tenant beheer
 * - viewer: Alleen lezen, geen wijzigingen
 */

import { supabase } from '@/lib/shared/supabase/supabase-client';
import type { AdminUser, AdminUserInsert, AdminUserUpdate } from '@/lib/shared/supabase/types';

// ========================================
// ADMIN USER QUERIES
// ========================================

/**
 * Haal admin user op basis van auth_user_id (Supabase Auth ID)
 */
export async function getAdminUser(authUserId: string): Promise<AdminUser | null> {
  console.log('🔍 [AdminAuthService] getAdminUser() called with authUserId:', authUserId);

  if (!supabase) {
    console.warn('⚠️ [AdminAuthService] Supabase not configured');
    return null;
  }

  try {
    console.log('🔍 [AdminAuthService] Querying admin_users table...');
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();

    if (error) {
      console.log('❌ [AdminAuthService] Query error:', error.message);
      console.log('❌ [AdminAuthService] Error code:', error.code);
      if (error.code === 'PGRST116') {
        console.log('❌ [AdminAuthService] No matching record found in admin_users for auth_user_id:', authUserId);
        return null;
      }
      console.error('❌ [AdminAuthService] Error fetching admin user:', error.message);
      return null;
    }

    console.log('✅ [AdminAuthService] Admin user found:');
    console.log('✅ [AdminAuthService] - id:', data.id);
    console.log('✅ [AdminAuthService] - email:', data.email);
    console.log('✅ [AdminAuthService] - auth_user_id:', data.auth_user_id);
    console.log('✅ [AdminAuthService] - role:', data.role);
    console.log('✅ [AdminAuthService] - is_active:', data.is_active);

    return data as AdminUser;
  } catch (err: any) {
    console.error('❌ [AdminAuthService] Unexpected error:', err.message);
    return null;
  }
}

/**
 * Haal admin user op basis van email
 */
export async function getAdminUserByEmail(email: string): Promise<AdminUser | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('❌ [AdminAuth] Error fetching admin by email:', error.message);
      return null;
    }

    return data as AdminUser;
  } catch (err: any) {
    console.error('❌ [AdminAuth] Unexpected error:', err.message);
    return null;
  }
}

/**
 * Check of een user een actieve admin is
 */
export async function isAdmin(authUserId: string): Promise<boolean> {
  const adminUser = await getAdminUser(authUserId);
  return adminUser !== null && adminUser.is_active;
}

/**
 * Haal de rol van een admin user
 */
export async function getAdminRole(
  authUserId: string
): Promise<'super_admin' | 'admin' | 'viewer' | null> {
  const adminUser = await getAdminUser(authUserId);
  if (!adminUser || !adminUser.is_active) {
    return null;
  }
  return adminUser.role;
}

/**
 * Haal alle admin users op
 */
export async function getAllAdminUsers(): Promise<AdminUser[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [AdminAuth] Error fetching all admins:', error.message);
      return [];
    }

    return (data || []) as AdminUser[];
  } catch (err: any) {
    console.error('❌ [AdminAuth] Unexpected error:', err.message);
    return [];
  }
}

// ========================================
// ADMIN USER MUTATIONS
// ========================================

/**
 * Maak een nieuwe admin user aan
 * Let op: De user moet al bestaan in Supabase Auth (auth.users)
 */
export async function createAdminUser(
  data: AdminUserInsert
): Promise<{ success: boolean; adminUser?: AdminUser; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data: insertedData, error } = await supabase
      .from('admin_users')
      .insert([{
        ...data,
        email: data.email.toLowerCase(),
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ [AdminAuth] Error creating admin:', error.message);
      return { success: false, error: error.message };
    }

    console.log('✅ [AdminAuth] Admin user created:', insertedData.email);
    return { success: true, adminUser: insertedData as AdminUser };
  } catch (err: any) {
    console.error('❌ [AdminAuth] Unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Update een admin user
 */
export async function updateAdminUser(
  id: string,
  data: AdminUserUpdate
): Promise<{ success: boolean; adminUser?: AdminUser; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const updateData = {
      ...data,
      ...(data.email && { email: data.email.toLowerCase() }),
    };

    const { data: updatedData, error } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ [AdminAuth] Error updating admin:', error.message);
      return { success: false, error: error.message };
    }

    console.log('✅ [AdminAuth] Admin user updated:', updatedData.email);
    return { success: true, adminUser: updatedData as AdminUser };
  } catch (err: any) {
    console.error('❌ [AdminAuth] Unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Deactiveer een admin user (soft delete)
 */
export async function deactivateAdminUser(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('❌ [AdminAuth] Error deactivating admin:', error.message);
      return { success: false, error: error.message };
    }

    console.log('✅ [AdminAuth] Admin user deactivated');
    return { success: true };
  } catch (err: any) {
    console.error('❌ [AdminAuth] Unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Reactiveer een admin user
 */
export async function reactivateAdminUser(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: true })
      .eq('id', id);

    if (error) {
      console.error('❌ [AdminAuth] Error reactivating admin:', error.message);
      return { success: false, error: error.message };
    }

    console.log('✅ [AdminAuth] Admin user reactivated');
    return { success: true };
  } catch (err: any) {
    console.error('❌ [AdminAuth] Unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}

// ========================================
// PERMISSION HELPERS
// ========================================

/**
 * Check of een admin een specifieke actie mag uitvoeren
 */
export function canPerformAction(
  role: 'super_admin' | 'admin' | 'viewer' | null,
  action: 'read' | 'write' | 'delete' | 'manage_admins'
): boolean {
  if (!role) return false;

  switch (action) {
    case 'read':
      // Alle rollen kunnen lezen
      return true;

    case 'write':
    case 'delete':
      // Admin en super_admin kunnen schrijven/verwijderen
      return role === 'admin' || role === 'super_admin';

    case 'manage_admins':
      // Alleen super_admin kan andere admins beheren
      return role === 'super_admin';

    default:
      return false;
  }
}
