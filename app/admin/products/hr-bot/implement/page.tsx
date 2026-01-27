/**
 * ========================================
 * ADMIN IMPLEMENT - Overzichtspagina
 * ========================================
 *
 * Toont alle tenants met navigatie naar hun embed configuratie.
 * Klanten kunnen hier de embed code genereren voor hun website.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TenantListItem {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  is_active: boolean;
}

export default function ImplementOverviewPage() {
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/products/hr-bot/branding');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tenants');
      }

      setTenants(data.tenants || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading tenants...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-800">Error</h3>
        <p className="text-red-700 mt-1">{error}</p>
        <button onClick={fetchTenants} className="mt-4 text-red-600 hover:text-red-800 font-medium">
          Probeer opnieuw
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Implementeren</h1>
        <p className="text-gray-500 mt-1">
          Genereer embed codes zodat klanten de chatbot kunnen integreren op hun website
        </p>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">Hoe werkt het?</h3>
            <ol className="mt-2 text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Selecteer een tenant hieronder</li>
              <li>Configureer de embed opties (grootte, thema, etc.)</li>
              <li>Kopieer de gegenereerde code</li>
              <li>Plak de code in de website van de klant</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Tenant Cards Grid */}
      {tenants.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen tenants gevonden</h3>
          <p className="text-gray-500 mb-6">Maak eerst een tenant aan via de Tenants sectie.</p>
          <Link
            href="/admin/products/hr-bot/tenants/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Nieuwe Tenant Aanmaken
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((tenant) => (
            <Link
              key={tenant.id}
              href={`/admin/products/hr-bot/implement/${tenant.id}`}
              className="group bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Logo/Color Preview */}
                {tenant.logo_url ? (
                  <img
                    src={tenant.logo_url}
                    alt={tenant.name}
                    className="w-12 h-12 rounded-xl object-contain bg-gray-50 border border-gray-100"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
                    style={{ backgroundColor: tenant.primary_color || '#8B5CF6' }}
                  >
                    {tenant.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                    {tenant.name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">{tenant.id}</p>

                  <div className="flex items-center gap-2 mt-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      tenant.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tenant.is_active ? 'Actief' : 'Inactief'}
                    </span>
                  </div>
                </div>

                {/* Arrow Icon */}
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
