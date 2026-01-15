'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, onAuthStateChange, logout } from '@/lib/auth';

/**
 * ========================================
 * AUTH GUARD COMPONENT
 * ========================================
 *
 * Beschermt admin routes door te checken of de user ingelogd is.
 * Redirect naar login als niet geauthenticeerd.
 *
 * Gebruikt mounted state om hydration mismatches te voorkomen:
 * - Server & client renderen initieel hetzelfde (loading state)
 * - Na mount checkt client de auth status
 */

interface AuthGuardProps {
  children: React.ReactNode;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Mounted state voorkomt hydration mismatch
  const [mounted, setMounted] = useState(false);

  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    userEmail: null,
  });

  // Set mounted na eerste render (client-only)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Check huidige session
    async function checkAuth() {
      try {
        const user = await getCurrentUser();

        if (user) {
          setAuthState({
            isLoading: false,
            isAuthenticated: true,
            userEmail: user.email || null,
          });
        } else {
          // Niet ingelogd, redirect naar login
          setAuthState({
            isLoading: false,
            isAuthenticated: false,
            userEmail: null,
          });
          router.push('/admin/login');
        }
      } catch (err) {
        console.error('❌ [AuthGuard] Error checking auth:', err);
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          userEmail: null,
        });
        router.push('/admin/login');
      }
    }

    checkAuth();

    // Subscribe op auth state changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      console.log('🔐 [AuthGuard] Auth state changed:', event);

      if (event === 'SIGNED_OUT' || !session) {
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          userEmail: null,
        });
        router.push('/admin/login');
      } else if (event === 'SIGNED_IN' && session) {
        setAuthState({
          isLoading: false,
          isAuthenticated: true,
          userEmail: session.user?.email || null,
        });
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

  // Niet geauthenticeerd - toon niets (redirect gebeurt al)
  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Doorverwijzen naar login...</p>
        </div>
      </div>
    );
  }

  // Geauthenticeerd - toon children
  return <>{children}</>;
}

/**
 * Hook om de huidige auth state te krijgen
 * Gebruikt mounted state om hydration mismatches te voorkomen
 */
export function useAuth() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    async function fetchUser() {
      const currentUser = await getCurrentUser();
      setUser(currentUser ? { email: currentUser.email || '' } : null);
      setIsLoading(false);
    }

    fetchUser();

    const { data: { subscription } } = onAuthStateChange((event, session) => {
      setUser(session?.user ? { email: session.user.email || '' } : null);
    });

    return () => subscription.unsubscribe();
  }, [mounted]);

  // Return loading state until mounted to prevent hydration mismatch
  return { user: mounted ? user : null, isLoading: !mounted || isLoading };
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
