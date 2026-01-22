'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * ========================================
 * ADMIN KLANTEN PAGE
 * ========================================
 *
 * Overzicht van alle klanten (tenants) met hun producten en stats.
 * Klant = bedrijf dat producten bij Levtor afneemt.
 */

interface Product {
  id: string;
  product_id: string;
  name: string | null;
  is_active: boolean;
}

interface Klant {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  products: Product[];
  portal_users_count: number;
  invoices_count: number;
  documents_count: number;
}

export default function AdminKlantenPage() {
  const [klanten, setKlanten] = useState<Klant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKlanten = async () => {
    try {
      const response = await fetch('/api/admin/klanten');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setKlanten(data.klanten || []);
    } catch (err) {
      setError('Kon klanten niet laden');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKlanten();
  }, []);

  const handleToggleActive = async (klant: Klant) => {
    try {
      const response = await fetch(`/api/admin/klanten/${klant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !klant.is_active }),
      });

      if (!response.ok) throw new Error('Failed to update');
      fetchKlanten();
    } catch (err) {
      setError('Kon status niet wijzigen');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getProductIcon = (productId: string) => {
    switch (productId) {
      case 'hr_bot':
        return '🤖';
      case 'voice_agent':
        return '🎙️';
      case 'app':
        return '📱';
      default:
        return '📦';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Klanten</h1>
          <p className="text-gray-500 mt-1">
            Beheer klanten en hun producten
          </p>
        </div>
        <Link
          href="/admin/klanten/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nieuwe klant
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Klanten Grid */}
      {klanten.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen klanten</h3>
          <p className="text-gray-500 mb-4">Maak je eerste klant aan om te beginnen.</p>
          <Link
            href="/admin/klanten/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Eerste klant aanmaken
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {klanten.map((klant) => (
            <div
              key={klant.id}
              className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${
                !klant.is_active ? 'opacity-60' : ''
              }`}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/klanten/${klant.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors block truncate"
                    >
                      {klant.name}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">{klant.id}</p>
                  </div>
                  <button
                    onClick={() => handleToggleActive(klant)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      klant.is_active
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {klant.is_active ? 'Actief' : 'Inactief'}
                  </button>
                </div>

                {/* Products */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {klant.products.filter(p => p.is_active).map((product) => (
                    <span
                      key={product.id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm"
                    >
                      <span>{getProductIcon(product.product_id)}</span>
                      <span>{product.name || product.product_id}</span>
                    </span>
                  ))}
                  {klant.products.filter(p => p.is_active).length === 0 && (
                    <span className="text-sm text-gray-400">Geen producten</span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="px-6 py-4 bg-gray-50 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{klant.documents_count}</p>
                  <p className="text-xs text-gray-500">Documenten</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{klant.portal_users_count}</p>
                  <p className="text-xs text-gray-500">Gebruikers</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{klant.invoices_count}</p>
                  <p className="text-xs text-gray-500">Facturen</p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  Sinds {formatDate(klant.created_at)}
                </span>
                <Link
                  href={`/admin/klanten/${klant.id}`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Beheren →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Count */}
      {klanten.length > 0 && (
        <p className="text-sm text-gray-500 text-right">
          {klanten.length} klant{klanten.length !== 1 ? 'en' : ''}
        </p>
      )}
    </div>
  );
}
