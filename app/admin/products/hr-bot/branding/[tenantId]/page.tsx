'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TenantBranding, DEFAULT_UI_TEXTS } from '@/lib/admin/branding-types';
import LivePreview from './components/LivePreview';
import SettingsForm from './components/SettingsForm';

/**
 * Branding Editor - Split View
 * Left: Live preview of chatbot
 * Right: Settings form with all branding options
 */

export default function BrandingEditorPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [tenant, setTenant] = useState<TenantBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  // Fetch tenant on mount
  useEffect(() => {
    fetchTenant();
  }, [tenantId]);

  const fetchTenant = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/products/hr-bot/branding/${tenantId}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          router.push('/admin/products/hr-bot/branding');
          return;
        }
        throw new Error(data.error || 'Failed to fetch tenant');
      }

      // Ensure ui_texts has at least Dutch texts
      if (!data.tenant.ui_texts?.nl) {
        data.tenant.ui_texts = { nl: DEFAULT_UI_TEXTS };
      }

      setTenant(data.tenant);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Update tenant state (local)
  const updateTenant = useCallback((updates: Partial<TenantBranding>) => {
    setTenant(prev => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
    setHasChanges(true);
  }, []);

  // Handle click on preview element
  const handlePreviewClick = useCallback((fieldName: string) => {
    setActiveField(fieldName);
    // The SettingsForm will scroll to this field
  }, []);

  // Save changes (with translation)
  const saveChanges = async (withTranslation: boolean = true) => {
    if (!tenant) return;

    try {
      if (withTranslation) {
        setTranslating(true);
        // First translate Dutch texts to all languages
        const dutchTexts = tenant.ui_texts?.nl || DEFAULT_UI_TEXTS;

        const translateResponse = await fetch('/api/admin/products/hr-bot/branding/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dutchTexts })
        });

        if (!translateResponse.ok) {
          const translateData = await translateResponse.json();
          throw new Error(translateData.error || 'Translation failed');
        }

        const { translations } = await translateResponse.json();
        tenant.ui_texts = translations;
        setTranslating(false);
      }

      setSaving(true);

      // Save to database
      const response = await fetch(`/api/admin/products/hr-bot/branding/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenant)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setTenant(data.tenant);
      setHasChanges(false);
      alert('Branding succesvol opgeslagen!');
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    } finally {
      setSaving(false);
      setTranslating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Branding laden...</span>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-800">Error</h3>
          <p className="text-red-700 mt-1">{error || 'Tenant niet gevonden'}</p>
          <Link
            href="/admin/products/hr-bot/branding"
            className="mt-4 inline-block text-red-600 hover:text-red-800 font-medium"
          >
            ← Terug naar overzicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/products/hr-bot/branding"
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-sm text-gray-500">Branding Configurator</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                Niet-opgeslagen wijzigingen
              </span>
            )}

            <a
              href={`/?tenant=${tenantId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Chat
            </a>

            <button
              onClick={() => saveChanges(true)}
              disabled={saving || translating || !hasChanges}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {translating ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Vertalen...
                </>
              ) : saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Opslaan...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Opslaan & Vertalen
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Live Preview */}
        <div className="w-1/2 border-r border-gray-200 bg-gray-50 overflow-hidden flex flex-col">
          <div className="p-4 bg-white border-b border-gray-200">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Live Preview
            </h2>
            <p className="text-sm text-gray-500 mt-1">Klik op een element om naar de instelling te gaan</p>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <LivePreview
              tenant={tenant}
              onElementClick={handlePreviewClick}
            />
          </div>
        </div>

        {/* Right: Settings Form */}
        <div className="w-1/2 overflow-auto bg-white">
          <SettingsForm
            tenant={tenant}
            onUpdate={updateTenant}
            activeField={activeField}
            onActiveFieldClear={() => setActiveField(null)}
          />
        </div>
      </div>
    </div>
  );
}
