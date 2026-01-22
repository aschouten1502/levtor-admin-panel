'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, getCurrentUser, isAuthConfigured } from '@/lib/shared/auth';

/**
 * ========================================
 * ADMIN LOGIN PAGE
 * ========================================
 *
 * Login pagina voor admin toegang.
 * Gebruikt Supabase Auth voor authenticatie.
 */

export default function AdminLoginPage() {
  const router = useRouter();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // Check of user al ingelogd is
    async function checkExistingSession() {
      console.log('🔍 [AdminLogin] Checking existing session...');
      try {
        const user = await getCurrentUser();
        console.log('🔍 [AdminLogin] getCurrentUser result:', user ? user.email : 'null');
        if (user) {
          console.log('✅ [AdminLogin] User found, redirecting to /admin');
          router.push('/admin');
          return;
        }
        console.log('ℹ️ [AdminLogin] No existing session, showing login form');
      } catch (err) {
        console.error('❌ [AdminLogin] Error checking session:', err);
      }
      setIsCheckingSession(false);
    }

    checkExistingSession();
  }, [router]);

  // Handle form submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    console.log('🔑 [AdminLogin] Login attempt for:', email);

    try {
      const result = await login({ email, password });
      console.log('🔑 [AdminLogin] Login result:', result);

      if (result.success) {
        console.log('✅ [AdminLogin] Login successful, redirecting to /admin');
        router.push('/admin');
        router.refresh(); // Force refresh om nieuwe session te laden
      } else {
        console.log('❌ [AdminLogin] Login failed:', result.error);
        setError(result.error || 'Login mislukt');
      }
    } catch (err: any) {
      console.error('❌ [AdminLogin] Exception during login:', err);
      setError(err.message || 'Er is een fout opgetreden');
    } finally {
      setIsLoading(false);
    }
  }

  // Loading state tijdens session check
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Laden...</div>
      </div>
    );
  }

  // Check of auth geconfigureerd is
  if (!isAuthConfigured()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Auth niet geconfigureerd
            </h1>
            <p className="text-gray-600 text-sm mb-4">
              Voeg de volgende environment variable toe:
            </p>
            <code className="block bg-gray-100 p-3 rounded text-sm text-left mb-4 overflow-x-auto">
              NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
            </code>
            <p className="text-gray-500 text-xs">
              Je vindt de anon key in Supabase Dashboard &gt; Settings &gt; API
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <img
              src="/icons/icon-96x96.png"
              alt="Levtor"
              className="w-10 h-10 rounded-lg"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          <p className="text-gray-500 mt-1">HR Assistant beheer</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="admin@example.com"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Wachtwoord
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className={`
                w-full py-3 px-4 rounded-lg font-medium text-white
                transition-all duration-200
                ${isLoading || !email || !password
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                }
              `}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Inloggen...
                </span>
              ) : (
                'Inloggen'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-6">
          Alleen voor beheerders
        </p>
      </div>
    </div>
  );
}
