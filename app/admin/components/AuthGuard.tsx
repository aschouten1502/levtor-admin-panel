'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, onAuthStateChange, logout } from '@/lib/shared/auth';

/**
 * ========================================
 * AUTH GUARD COMPONENT
 * ========================================
 *
 * Beschermt admin routes door te checken:
 * 1. Of de user ingelogd is (Supabase Auth)
 * 2. Of de user een admin is (admin_users tabel)
 *
 * Redirect naar:
 * - /admin/login als niet ingelogd
 * - /portal/login als ingelogd maar geen admin (klant probeert /admin)
 *
 * Gebruikt mounted state om hydration mismatches te voorkomen.
 */

interface AuthGuardProps {
  children: React.ReactNode;
}

interface AdminInfo {
  id: string;
  email: string;
  name: string | null;
  role: 'super_admin' | 'admin' | 'viewer';
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userEmail: string | null;
  adminInfo: AdminInfo | null;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Mounted state voorkomt hydration mismatch
  const [mounted, setMounted] = useState(false);

  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    isAdmin: false,
    userEmail: null,
    adminInfo: null,
  });

  // Set mounted na eerste render (client-only)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Check huidige session en admin status
    async function checkAuth() {
      try {
        // Stap 1: Check of user ingelogd is
        const user = await getCurrentUser();

        if (!user) {
          // Niet ingelogd, redirect naar admin login
          setAuthState({
            isLoading: false,
            isAuthenticated: false,
            isAdmin: false,
            userEmail: null,
            adminInfo: null,
          });
          router.push('/admin/login');
          return;
        }

        // Stap 2: Check of user een admin is via API
        const response = await fetch('/api/admin/me');
        const data = await response.json();

        if (!response.ok || !data.isAdmin) {
          // Ingelogd maar geen admin - redirect naar portal
          console.warn('⚠️ [AuthGuard] User is not an admin, redirecting to portal');
          setAuthState({
            isLoading: false,
            isAuthenticated: true,
            isAdmin: false,
            userEmail: user.email || null,
            adminInfo: null,
          });
          router.push('/portal/login');
          return;
        }

        // Stap 3: User is admin - toegang verlenen
        setAuthState({
          isLoading: false,
          isAuthenticated: true,
          isAdmin: true,
          userEmail: user.email || null,
          adminInfo: data.admin,
        });
      } catch (err) {
        console.error('❌ [AuthGuard] Error checking auth:', err);
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          isAdmin: false,
          userEmail: null,
          adminInfo: null,
        });
        router.push('/admin/login');
      }
    }

    checkAuth();

    // Subscribe op auth state changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      console.log('🔐 [AuthGuard] Auth state changed:', event);

      if (event === 'SIGNED_OUT' || !session) {
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          isAdmin: false,
          userEmail: null,
          adminInfo: null,
        });
        router.push('/admin/login');
      } else if (event === 'SIGNED_IN' && session) {
        // Re-check admin status after sign in
        try {
          const response = await fetch('/api/admin/me');
          const data = await response.json();

          if (!response.ok || !data.isAdmin) {
            // Signed in but not admin
            setAuthState({
              isLoading: false,
              isAuthenticated: true,
              isAdmin: false,
              userEmail: session.user?.email || null,
              adminInfo: null,
            });
            router.push('/portal/login');
          } else {
            setAuthState({
              isLoading: false,
              isAuthenticated: true,
              isAdmin: true,
              userEmail: session.user?.email || null,
              adminInfo: data.admin,
            });
          }
        } catch {
          router.push('/admin/login');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  // Loading state - ook tonen als nog niet gemount (voorkomt hydration mismatch)
  if (!mounted || authState.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Sessie controleren...</p>
        </div>
      </div>
    );
  }

  // Niet geauthenticeerd of geen admin - toon niets (redirect gebeurt al)
  if (!authState.isAuthenticated || !authState.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Doorverwijzen...</p>
        </div>
      </div>
    );
  }

  // Geauthenticeerd en admin - toon children
  return <>{children}</>;
}

/**
 * Hook om de huidige auth state te krijgen (inclusief admin info)
 * Gebruikt mounted state om hydration mismatches te voorkomen
 */
export function useAuth() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    async function fetchUser() {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser({ email: currentUser.email || '' });

        // Fetch admin info
        try {
          const response = await fetch('/api/admin/me');
          const data = await response.json();
          if (response.ok && data.isAdmin) {
            setAdminInfo(data.admin);
          }
        } catch {
          // Not an admin or error
        }
      } else {
        setUser(null);
        setAdminInfo(null);
      }
      setIsLoading(false);
    }

    fetchUser();

    const { data: { subscription } } = onAuthStateChange((event, session) => {
      setUser(session?.user ? { email: session.user.email || '' } : null);
      if (!session?.user) {
        setAdminInfo(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [mounted]);

  // Return loading state until mounted to prevent hydration mismatch
  return {
    user: mounted ? user : null,
    adminInfo: mounted ? adminInfo : null,
    isLoading: !mounted || isLoading,
    isAdmin: !!adminInfo,
  };
}

/**
 * Logout button component
 */
export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      await logout();
      router.push('/admin/login');
    } catch (err) {
      console.error('❌ [LogoutButton] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      <span className="font-medium">
        {isLoading ? 'Uitloggen...' : 'Uitloggen'}
      </span>
    </button>
  );
}
