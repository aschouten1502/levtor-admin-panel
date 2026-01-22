/**
 * ========================================
 * ADMIN ME ENDPOINT
 * ========================================
 *
 * GET /api/admin/me
 *
 * Returns the current admin user if authenticated and authorized.
 * Used by AuthGuard to verify admin access.
 */

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/shared/auth/server';
import { getAdminUser } from '@/lib/admin/admin-auth-service';

export async function GET() {
  console.log('🔍 [API /admin/me] Request received');

  try {
    // 1. Check authentication (Supabase Auth) - use 'admin' context for session isolation
    console.log('🔍 [API /admin/me] Step 1: Calling getAuthUser("admin")...');
    const authResult = await getAuthUser('admin');
    console.log('🔍 [API /admin/me] authResult.authenticated:', authResult.authenticated);
    console.log('🔍 [API /admin/me] authResult.user:', authResult.user ? authResult.user.email : 'null');
    console.log('🔍 [API /admin/me] authResult.error:', authResult.error || 'none');

    if (!authResult.authenticated || !authResult.user) {
      console.log('❌ [API /admin/me] Not authenticated, returning 401');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // 2. Check admin authorization (admin_users table)
    console.log('🔍 [API /admin/me] Step 2: Calling getAdminUser() with userId:', authResult.user.id);
    const adminUser = await getAdminUser(authResult.user.id);
    console.log('🔍 [API /admin/me] adminUser result:', adminUser ? JSON.stringify({
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      is_active: adminUser.is_active,
      auth_user_id: adminUser.auth_user_id
    }) : 'null');

    if (!adminUser) {
      console.log('❌ [API /admin/me] User NOT in admin_users table');
      console.log('❌ [API /admin/me] Returning isAdmin: false, status: 403');
      return NextResponse.json(
        { error: 'Not an admin', isAdmin: false },
        { status: 403 }
      );
    }

    if (!adminUser.is_active) {
      console.log('❌ [API /admin/me] Admin user is DEACTIVATED');
      return NextResponse.json(
        { error: 'Admin account is deactivated', isAdmin: false },
        { status: 403 }
      );
    }

    // 3. Return admin user info
    console.log('✅ [API /admin/me] Admin verified:', adminUser.email);
    console.log('✅ [API /admin/me] Role:', adminUser.role);
    console.log('✅ [API /admin/me] Returning isAdmin: true');

    return NextResponse.json({
      isAdmin: true,
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
    });
  } catch (error: any) {
    console.error('❌ [API /admin/me] Exception:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
