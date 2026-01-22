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
  try {
    // 1. Check authentication (Supabase Auth)
    const authResult = await getAuthUser();

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // 2. Check admin authorization (admin_users table)
    const adminUser = await getAdminUser(authResult.user.id);

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Not an admin', isAdmin: false },
        { status: 403 }
      );
    }

    if (!adminUser.is_active) {
      return NextResponse.json(
        { error: 'Admin account is deactivated', isAdmin: false },
        { status: 403 }
      );
    }

    // 3. Return admin user info
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
    console.error('❌ [API] /api/admin/me error:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
