'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateTenantSlug } from '@/lib/admin/tenant-service';
import { validateTenantCreate, isValid, validateColor, type ValidationErrors } from '@/lib/admin/validation';

/**
 * New Tenant Onboarding Form
 * Comprehensive form to create a new tenant with branding and documents
 */

interface FileWithPreview extends File {
  preview?: string;
}

export default function NewTenantPage() {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const documentsInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null);

  // Validation state
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});

  // Upload tracking for better feedback
  interface UploadResult {
    success: boolean;
    name: string;
    error?: string;
  }
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    id: '',
    contact_email: '',
    primary_color: '#0066CC',
    secondary_color: '#666666',
    welcome_message: '',
    is_demo: false,
    // Multilingual RAG support (v2.2)
    document_language: 'nl',
    website_url: '',
  });

  // Supported document languages
  const DOCUMENT_LANGUAGES = [
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
  ];

  // Files
  const [logoFile, setLogoFile] = useState<FileWithPreview | null>(null);
  const [documentFiles, setDocumentFiles] = useState<FileWithPreview[]>([]);

  // Ref to track current preview URL for cleanup (avoids stale closure issues)
  const logoPreviewRef = useRef<string | null>(null);

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      id: generateTenantSlug(name),
    }));
  };

  // Handle logo selection - with memory leak fix
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Revoke previous URL to prevent memory leak
      if (logoPreviewRef.current) {
        URL.revokeObjectURL(logoPreviewRef.current);
      }
      const preview = URL.createObjectURL(file);
      logoPreviewRef.current = preview; // Track for cleanup
      setLogoFile(Object.assign(file, { preview }) as FileWithPreview);
    }
  };

  // Handle logo removal - with memory cleanup (uses ref, no stale closure)
  const handleLogoRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (logoPreviewRef.current) {
      URL.revokeObjectURL(logoPreviewRef.current);
      logoPreviewRef.current = null;
    }
    setLogoFile(null);
  }, []); // Empty deps - uses ref instead of state

  // Cleanup preview URLs on unmount (uses ref for stable reference)
  useEffect(() => {
    return () => {
      if (logoPreviewRef.current) {
        URL.revokeObjectURL(logoPreviewRef.current);
      }
    };
  }, []); // Empty deps is correct - ref cleanup on unmount

  // Handle document selection
  const handleDocumentsSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const pdfFiles = files.filter((f) => f.type === 'application/pdf');

    setDocumentFiles((prev) => [...prev, ...pdfFiles]);
  };

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter((f) => f.type === 'application/pdf');

    setDocumentFiles((prev) => [...prev, ...pdfFiles]);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Remove document
  const removeDocument = (index: number) => {
    setDocumentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit form with improved upload feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setUploadResults([]);
    setUploadProgress(null);

    const results: UploadResult[] = [];

    try {
      // Step 1: Create tenant
      setUploadProgress('Tenant aanmaken...');
      const tenantResponse = await fetch('/api/admin/products/hr-bot/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          name: formData.name,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          welcome_message: formData.welcome_message,
          contact_email: formData.contact_email,
          is_demo: formData.is_demo,
          document_language: formData.document_language,
          website_url: formData.website_url || null,
        }),
      });

      const tenantResult = await tenantResponse.json();

      if (!tenantResponse.ok) {
        throw new Error(tenantResult.error || 'Failed to create tenant');
      }

      const tenantId = tenantResult.tenant.id;

      // Step 2: Upload logo if provided
      if (logoFile) {
        setUploadProgress('Logo uploaden...');
        try {
          const logoFormData = new FormData();
          logoFormData.append('logo', logoFile);

          const logoResponse = await fetch(`/api/admin/products/hr-bot/tenants/${tenantId}`, {
            method: 'PATCH',
            body: logoFormData,
          });

          if (!logoResponse.ok) {
            const errorData = await logoResponse.json().catch(() => ({}));
            results.push({ success: false, name: 'Logo', error: errorData.error || 'Upload mislukt' });
          } else {
            results.push({ success: true, name: 'Logo' });
          }
        } catch {
          results.push({ success: false, name: 'Logo', error: 'Netwerkfout' });
        }
      }

      // Step 3: Upload documents with progress
      for (let i = 0; i < documentFiles.length; i++) {
        const doc = documentFiles[i];
        setUploadProgress(`Document uploaden (${i + 1}/${documentFiles.length}): ${doc.name}`);

        try {
          const docFormData = new FormData();
          docFormData.append('file', doc);

          const docResponse = await fetch(`/api/admin/products/hr-bot/tenants/${tenantId}/documents`, {
            method: 'POST',
            body: docFormData,
          });

          if (!docResponse.ok) {
            const errorData = await docResponse.json().catch(() => ({}));
            results.push({ success: false, name: doc.name, error: errorData.error || 'Upload mislukt' });
          } else {
            results.push({ success: true, name: doc.name });
          }
        } catch {
          results.push({ success: false, name: doc.name, error: 'Netwerkfout' });
        }
      }

      setUploadResults(results);
      setCreatedTenantId(tenantId);
      setStep(4); // Success step

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is iets misgegaan');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  // Step indicators
  const steps = [
    { number: 1, label: 'Basic Info' },
    { number: 2, label: 'Branding' },
    { number: 3, label: 'Documents' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/products/hr-bot/tenants"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tenants
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New Tenant</h1>
        <p className="text-gray-500 mt-1">
          Set up a new organization with custom branding and documents
        </p>
      </div>

      {/* Success State */}
      {step === 4 && createdTenantId && (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Tenant Created!</h2>
            <p className="text-gray-500 mb-6">
              {formData.name} has been successfully created.
              {documentFiles.length > 0 && ' Documents are being processed.'}
            </p>
          </div>

          {/* Upload Results - Show any failures */}
          {uploadResults.length > 0 && (
            <div className="mb-6">
              {uploadResults.some(r => !r.success) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-yellow-800">
                        Sommige uploads zijn mislukt
                      </h4>
                      <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                        {uploadResults.filter(r => !r.success).map((r, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="font-medium">{r.name}:</span> {r.error}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-yellow-600">
                        Je kunt deze bestanden later opnieuw uploaden via de tenant instellingen.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Show successful uploads */}
              {uploadResults.some(r => r.success) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-800 mb-2">
                    Succesvol geüpload ({uploadResults.filter(r => r.success).length})
                  </h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    {uploadResults.filter(r => r.success).map((r, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {r.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <Link
              href={`/admin/products/hr-bot/tenants/${createdTenantId}`}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Manage Tenant
            </Link>
            <a
              href={`/?tenant=${createdTenantId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Open Chat
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Form Steps */}
      {step < 4 && (
        <>
          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((s, index) => (
              <div key={s.number} className="flex items-center">
                <div className="flex items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                      ${step >= s.number
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-500'
                      }
                    `}
                  >
                    {step > s.number ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      s.number
                    )}
                  </div>
                  <span className={`ml-3 text-sm font-medium ${step >= s.number ? 'text-gray-900' : 'text-gray-500'}`}>
                    {s.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-24 h-0.5 mx-4 ${step > s.number ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="Acme Corporation"
                    required
                    aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      fieldErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {fieldErrors.name && (
                    <p id="name-error" className="text-sm text-red-600 mt-1" role="alert">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant ID *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="id"
                      value={formData.id}
                      onChange={(e) => setFormData((prev) => ({ ...prev, id: e.target.value.toLowerCase() }))}
                      pattern="^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$"
                      placeholder="acme-corp"
                      required
                      aria-describedby={fieldErrors.id ? 'id-error' : 'id-hint'}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${
                        fieldErrors.id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {fieldErrors.id ? (
                      <p id="id-error" className="text-sm text-red-600 mt-1" role="alert">{fieldErrors.id}</p>
                    ) : (
                      <p id="id-hint" className="text-xs text-gray-400 mt-1">
                        Lowercase letters, numbers, and dashes only
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    id="contact_email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contact_email: e.target.value }))}
                    placeholder="hr@acme-corp.com"
                    aria-describedby={fieldErrors.contact_email ? 'email-error' : undefined}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      fieldErrors.contact_email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {fieldErrors.contact_email && (
                    <p id="email-error" className="text-sm text-red-600 mt-1" role="alert">{fieldErrors.contact_email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="welcome_message" className="block text-sm font-medium text-gray-700 mb-2">
                    Welcome Message
                  </label>
                  <textarea
                    id="welcome_message"
                    value={formData.welcome_message}
                    onChange={(e) => setFormData((prev) => ({ ...prev, welcome_message: e.target.value }))}
                    placeholder="Welcome to our HR Assistant! Ask me anything about company policies, benefits, or procedures."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Document Language - Multilingual RAG (v2.2) */}
                <div>
                  <label htmlFor="document_language" className="block text-sm font-medium text-gray-700 mb-2">
                    Document Language *
                  </label>
                  <select
                    id="document_language"
                    value={formData.document_language}
                    onChange={(e) => setFormData((prev) => ({ ...prev, document_language: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    {DOCUMENT_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    In welke taal zijn de HR documenten geschreven? Dit zorgt voor betere zoekresultaten bij meertalige vragen.
                  </p>
                </div>

                {/* Website URL for Auto-Branding */}
                <div>
                  <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 mb-2">
                    Website URL
                  </label>
                  <input
                    type="url"
                    id="website_url"
                    value={formData.website_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, website_url: e.target.value }))}
                    placeholder="https://www.company.com"
                    aria-describedby={fieldErrors.website_url ? 'url-error' : 'url-hint'}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      fieldErrors.website_url ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {fieldErrors.website_url ? (
                    <p id="url-error" className="text-sm text-red-600 mt-1" role="alert">{fieldErrors.website_url}</p>
                  ) : (
                    <p id="url-hint" className="text-xs text-gray-400 mt-1">
                      Optioneel: Voor automatische branding extractie in de volgende stap
                    </p>
                  )}
                </div>

                {/* Demo toggle */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <input
                    type="checkbox"
                    id="is_demo"
                    checked={formData.is_demo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_demo: e.target.checked }))}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="is_demo" className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">Dit is een demo/test tenant</span>
                    <span className="text-xs text-gray-500">Demo tenants worden apart weergegeven in het overzicht</span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 2: Branding */}
            {step === 2 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Logo
                  </label>
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoSelect}
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      aria-label="Upload company logo"
                    />
                    {logoFile ? (
                      <div className="flex flex-col items-center gap-3">
                        <img
                          src={logoFile.preview}
                          alt="Logo preview"
                          className="w-20 h-20 object-contain"
                        />
                        <p className="text-sm text-gray-600">{logoFile.name}</p>
                        <button
                          type="button"
                          onClick={handleLogoRemove}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <svg className="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium text-blue-600">Click to upload</span> a logo
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG, or WebP (max 2MB)</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="primary_color" className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="primary_color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, primary_color: e.target.value }))}
                        className={`w-14 h-12 rounded-lg border cursor-pointer ${
                          fieldErrors.primary_color ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      <input
                        type="text"
                        value={formData.primary_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, primary_color: e.target.value }))}
                        className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${
                          fieldErrors.primary_color ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        aria-label="Primary color hex value"
                        aria-describedby={fieldErrors.primary_color ? 'primary-color-error' : undefined}
                        placeholder="#000000"
                      />
                    </div>
                    {fieldErrors.primary_color && (
                      <p id="primary-color-error" className="text-sm text-red-600 mt-1" role="alert">{fieldErrors.primary_color}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="secondary_color" className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="secondary_color"
                        value={formData.secondary_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, secondary_color: e.target.value }))}
                        className={`w-14 h-12 rounded-lg border cursor-pointer ${
                          fieldErrors.secondary_color ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      <input
                        type="text"
                        value={formData.secondary_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, secondary_color: e.target.value }))}
                        className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${
                          fieldErrors.secondary_color ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        aria-label="Secondary color hex value"
                        aria-describedby={fieldErrors.secondary_color ? 'secondary-color-error' : undefined}
                        placeholder="#000000"
                      />
                    </div>
                    {fieldErrors.secondary_color && (
                      <p id="secondary-color-error" className="text-sm text-red-600 mt-1" role="alert">{fieldErrors.secondary_color}</p>
                    )}
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                  <div
                    className="rounded-lg p-6 text-white"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    <div className="flex items-center gap-4">
                      {logoFile ? (
                        <img
                          src={logoFile.preview}
                          alt="Preview"
                          className="w-12 h-12 rounded-lg object-contain bg-white"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-xl font-bold">
                          {formData.name.charAt(0) || 'A'}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold">{formData.name || 'Company Name'}</h3>
                        <p className="text-sm opacity-80">HR Assistant</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Documents */}
            {step === 3 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HR Documents
                  </label>
                  <p className="text-sm text-gray-500 mb-4">
                    Upload PDF documents that the AI will use to answer questions.
                    These can include handbooks, policies, procedures, and more.
                  </p>

                  {/* Drag & Drop Area */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => documentsInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="file"
                      ref={documentsInputRef}
                      onChange={handleDocumentsSelect}
                      accept=".pdf"
                      multiple
                      className="hidden"
                      aria-label="Upload HR documents"
                    />
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PDF files only (max 50MB each)</p>
                  </div>
                </div>

                {/* Document List */}
                {documentFiles.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Selected Documents ({documentFiles.length})
                    </h4>
                    <ul className="space-y-2">
                      {documentFiles.map((file, index) => (
                        <li
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{file.name}</p>
                              <p className="text-xs text-gray-400">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDocument(index)}
                            className="text-gray-400 hover:text-red-600 p-2"
                            aria-label={`Remove ${file.name}`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {documentFiles.length === 0 && (
                  <p className="text-center text-sm text-gray-500 py-4">
                    No documents selected. You can add them later from the tenant settings.
                  </p>
                )}
              </div>
            )}

            {/* Upload Progress */}
            {isSubmitting && uploadProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6" role="status" aria-live="polite">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span className="text-sm text-blue-700">{uploadProgress}</span>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    // Validate current step using centralized validation
                    if (step === 1) {
                      const errors = validateTenantCreate(formData);
                      if (!isValid(errors)) {
                        setFieldErrors(errors);
                        setError('Controleer de gemarkeerde velden');
                        return;
                      }
                    }
                    if (step === 2) {
                      // Validate colors
                      const errors: ValidationErrors = {};
                      const primaryError = validateColor(formData.primary_color);
                      if (primaryError) errors.primary_color = primaryError;
                      const secondaryError = validateColor(formData.secondary_color);
                      if (secondaryError) errors.secondary_color = secondaryError;
                      if (!isValid(errors)) {
                        setFieldErrors(errors);
                        setError('Controleer de kleurcodes (formaat #RRGGBB)');
                        return;
                      }
                    }
                    setError(null);
                    setFieldErrors({});
                    setStep((s) => s + 1);
                  }}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Continue
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Tenant
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}
