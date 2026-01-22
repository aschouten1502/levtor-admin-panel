'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerUser, getCurrentCustomer, customerLogout, onCustomerAuthStateChange } from '@/lib/shared/auth/customer';

/**
 * ========================================
 * PORTAL AUTH GUARD
 * ========================================
 *
 * Beschermt portal pagina's en biedt customer context.
 * Vergelijkbaar met admin AuthGuard, maar voor customers.
 */

// ========================================
// CUSTOMER CONTEXT
// ========================================

interface CustomerContextType {
  customer: CustomerUser | null;
  isLoading: boolean;
}

const CustomerContext = createContext<CustomerContextType>({
  customer: null,
  isLoading: true,
});

export function useCustomer() {
  return useContext(CustomerContext);
}

// ========================================
// PORTAL AUTH GUARD
// ========================================

interface PortalAuthGuardProps {
  children: React.ReactNode;
}

export function PortalAuthGuard({ children }: PortalAuthGuardProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let isCancelled = false;

    async function checkAuth() {
      console.log('🔍 [PortalAuthGuard] Starting auth check...');
      try {
        const currentCustomer = await getCurrentCustomer();
        console.log('🔍 [PortalAuthGuard] getCurrentCustomer result:', currentCustomer);

        if (isCancelled) return;

        if (!currentCustomer) {
          console.log('🔒 [PortalAuthGuard] Not authenticated - redirecting to login');
          setIsLoading(false);
          router.push('/portal/login');
          return;
        }

        setCustomer(currentCustomer);
        setIsLoading(false);
      } catch (error) {
        console.error('❌ [PortalAuthGuard] Auth check error:', error);
        if (!isCancelled) {
          setIsLoading(false);
          router.push('/portal/login');
        }
      }
    }

    checkAuth();

    // Subscribe to auth changes
    const subscription = onCustomerAuthStateChange((newCustomer) => {
      if (isCancelled) return;

      if (!newCustomer) {
        router.push('/portal/login');
        return;
      }

      setCustomer(newCustomer);
    });

    return () => {
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, [mounted, router]);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <CustomerContext.Provider value={{ customer, isLoading }}>
      {children}
    </CustomerContext.Provider>
  );
}

// ========================================
// LOGOUT BUTTON
// ========================================

export function PortalLogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    const result = await customerLogout();

    if (result.success) {
      router.push('/portal/login');
    } else {
      console.error('Logout failed:', result.error);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full disabled:opacity-50"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      <span className="font-medium">{isLoading ? 'Uitloggen...' : 'Uitloggen'}</span>
    </button>
  );
}
