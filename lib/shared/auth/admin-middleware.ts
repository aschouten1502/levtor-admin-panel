/**
 * ========================================
 * ADMIN API MIDDLEWARE
 * ========================================
 *
 * Middleware functies voor het beschermen van admin API routes.
 * Controleert zowel authenticatie (Supabase Auth) als autorisatie (admin_users).
 *
 * Gebruik:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const adminResult = await requireAdmin(request);
 *   if (!adminResult.success) {
 *     return adminResult.response;
 *   }
 *   const { admin } = adminResult;
 *   // ... rest of handler
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAuthFromRequest } from './server';
import { getAdminUser, canPerformAction } from '@/lib/admin/admin-auth-service';
import type { AdminUser } from '@/lib/shared/supabase/types';

// ========================================
// TYPES
// ========================================

export interface AdminAuthSuccess {
  success: true;
  admin: AdminUser;
}

export interface AdminAuthFailure {
  success: false;
  response: NextResponse;
  error: string;
}

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

// ========================================
// MIDDLEWARE FUNCTIONS
// ========================================

/**
 * Require admin authentication for API routes
 * Returns admin user if authenticated, or error response if not
 */
export async function requireAdmin(request: NextRequest): Promise<AdminAuthResult> {
  try {
    // 1. Check Supabase Auth
    const authResult = await checkAuthFromRequest(request);

    if (!authResult.authenticated || !authResult.user) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        ),
        error: 'Not authenticated',
      };
    }

    // 2. Check admin_users table
    const adminUser = await getAdminUser(authResult.user.id);

    if (!adminUser) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        ),
        error: 'Not an admin',
      };
    }

    if (!adminUser.is_active) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Admin account is deactivated' },
          { status: 403 }
        ),
        error: 'Admin deactivated',
      };
    }

    // 3. Return success with admin info
    return {
      success: true,
      admin: adminUser,
    };
  } catch (error: any) {
    console.error('❌ [AdminMiddleware] Error:', error.message);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
      error: error.message,
    };
  }
}

/**
 * Require admin with specific permission
 */
export async function requireAdminWithPermission(
  request: NextRequest,
  action: 'read' | 'write' | 'delete' | 'manage_admins'
): Promise<AdminAuthResult> {
  const result = await requireAdmin(request);

  if (!result.success) {
    return result;
  }

  // Check permission
  if (!canPerformAction(result.admin.role, action)) {
    return {
      success: false,
      response: NextResponse.json(
        { error: `Permission denied: ${action} requires higher privileges` },
        { status: 403 }
      ),
      error: `Missing permission: ${action}`,
    };
  }

  return result;
}

/**
 * Require super_admin role
 */
export async function requireSuperAdmin(request: NextRequest): Promise<AdminAuthResult> {
  const result = await requireAdmin(request);

  if (!result.success) {
    return result;
  }

  if (result.admin.role !== 'super_admin') {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      ),
      error: 'Not a super admin',
    };
  }

  return result;
}
