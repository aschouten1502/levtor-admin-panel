'use client';

import { useEffect, useRef, useState } from 'react';
import { TenantBranding, DEFAULT_UI_TEXTS, LanguageTexts } from '@/lib/admin/branding-types';
import type { ExtractedBranding } from '@/lib/admin/url-extractor';

interface SettingsFormProps {
  tenant: TenantBranding;
  onUpdate: (updates: Partial<TenantBranding>) => void;
  activeField: string | null;
  onActiveFieldClear: () => void;
}

// Section accordion component
function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  id,
  isHighlighted = false
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  id: string;
  isHighlighted?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHighlighted && sectionRef.current) {
      setIsOpen(true);
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isHighlighted]);

  return (
    <div
      ref={sectionRef}
      id={`section-${id}`}
      className={`border-b border-gray-100 ${isHighlighted ? 'ring-2 ring-yellow-400 ring-inset bg-yellow-50/50' : ''}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
            {icon}
          </div>
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 pb-6 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Form field components
function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  id,
  isHighlighted = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  id: string;
  isHighlighted?: boolean;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHighlighted && fieldRef.current) {
      fieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  return (
    <div
      ref={fieldRef}
      id={`field-${id}`}
      className={`transition-all duration-300 ${isHighlighted ? 'ring-2 ring-yellow-400 rounded-lg p-2 bg-yellow-50' : ''}`}
    >
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
        />
      )}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  id,
  isHighlighted = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
  isHighlighted?: boolean;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHighlighted && fieldRef.current) {
      fieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  return (
    <div
      ref={fieldRef}
      id={`field-${id}`}
      className={`transition-all duration-300 ${isHighlighted ? 'ring-2 ring-yellow-400 rounded-lg p-2 bg-yellow-50' : ''}`}
    >
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#8B5CF6'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#8B5CF6"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
        />
      </div>
    </div>
  );
}

function ToggleField({
  label,
  description,
  value,
  onChange,
  id,
  isHighlighted = false
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  id: string;
  isHighlighted?: boolean;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHighlighted && fieldRef.current) {
      fieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  return (
    <div
      ref={fieldRef}
      id={`field-${id}`}
      className={`flex items-center justify-between transition-all duration-300 ${isHighlighted ? 'ring-2 ring-yellow-400 rounded-lg p-2 bg-yellow-50' : ''}`}
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-purple-600' : 'bg-gray-300'}`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}

export default function SettingsForm({ tenant, onUpdate, activeField, onActiveFieldClear }: SettingsFormProps) {
  const [extractingFacts, setExtractingFacts] = useState(false);

  // Clear highlight after delay
  useEffect(() => {
    if (activeField) {
      const timer = setTimeout(() => {
        onActiveFieldClear();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeField, onActiveFieldClear]);

  // Get Dutch texts for editing
  const dutchTexts = tenant.ui_texts?.nl || DEFAULT_UI_TEXTS;

  // Update Dutch texts helper
  const updateDutchTexts = (key: keyof LanguageTexts, value: string | string[]) => {
    const newUiTexts = {
      ...tenant.ui_texts,
      nl: {
        ...dutchTexts,
        [key]: value
      }
    };
    onUpdate({ ui_texts: newUiTexts });
  };

  // Update example at specific index
  const updateExample = (index: number, value: string) => {
    const newExamples = [...dutchTexts.examples];
    newExamples[index] = value;
    updateDutchTexts('examples', newExamples);
  };

  // Handle PDF upload for fun facts extraction
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setExtractingFacts(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenant_id', tenant.id);

      const response = await fetch('/api/admin/products/hr-bot/branding/extract-facts', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract facts');
      }

      if (data.facts && data.facts.length > 0) {
        onUpdate({ fun_facts: data.facts });
        alert(`${data.facts.length} fun facts geëxtraheerd uit het document!`);
      } else {
        alert('Geen fun facts gevonden in dit document. Probeer een ander document.');
      }
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    } finally {
      setExtractingFacts(false);
      // Reset file input
      e.target.value = '';
    }
  };

  // Add new fun fact
  const addFunFact = () => {
    const newFacts = [...(tenant.fun_facts || []), ''];
    onUpdate({ fun_facts: newFacts });
  };

  // Update fun fact at index
  const updateFunFact = (index: number, value: string) => {
    const newFacts = [...(tenant.fun_facts || [])];
    newFacts[index] = value;
    onUpdate({ fun_facts: newFacts });
  };

  // Remove fun fact at index
  const removeFunFact = (index: number) => {
    const newFacts = tenant.fun_facts?.filter((_, i) => i !== index) || [];
    onUpdate({ fun_facts: newFacts });
  };

  // Check if a field should be highlighted
  const isHighlighted = (fieldId: string) => activeField === fieldId;

  // Check if a section contains the highlighted field
  const sectionContainsHighlight = (sectionFields: string[]) =>
    activeField ? sectionFields.includes(activeField) : false;

  // URL Import state
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedData, setImportedData] = useState<ExtractedBranding | null>(null);

  // Handle URL import
  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) return;

    setIsImporting(true);
    setImportError(null);
    setImportedData(null);

    try {
      const response = await fetch('/api/admin/products/hr-bot/branding/extract-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract branding');
      }

      setImportedData(data.extracted);
    } catch (error: any) {
      setImportError(error.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Apply imported branding
  const applyImportedBranding = () => {
    if (!importedData) return;

    const updates: Partial<TenantBranding> = {};

    if (importedData.name && !tenant.name) {
      updates.name = importedData.name;
    }
    if (importedData.tagline && !tenant.tagline) {
      updates.tagline = importedData.tagline;
    }
    if (importedData.primary_color) {
      updates.primary_color = importedData.primary_color;
    }
    if (importedData.secondary_color) {
      updates.secondary_color = importedData.secondary_color;
    }
    if (importedData.logo_url) {
      updates.logo_url = importedData.logo_url;
    }
    if (importedData.favicon_url) {
      updates.favicon_url = importedData.favicon_url;
    }

    onUpdate(updates);
    setImportedData(null);
    setImportUrl('');
  };

  return (
    <div className="divide-y divide-gray-100">
      {/* Quick Import Section */}
      <Section
        title="Quick Import"
        id="quick_import"
        defaultOpen={false}
        isHighlighted={false}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        }
      >
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-3">
            Plak een website URL om automatisch kleuren en logo te importeren
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleImportFromUrl()}
            />
            <button
              type="button"
              onClick={handleImportFromUrl}
              disabled={isImporting || !importUrl.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isImporting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Laden...
                </span>
              ) : 'Importeer'}
            </button>
          </div>

          {/* Error message */}
          {importError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{importError}</p>
            </div>
          )}

          {/* Preview imported data */}
          {importedData && (
            <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg space-y-3">
              <h4 className="font-medium text-gray-900">Gevonden branding:</h4>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {importedData.name && (
                  <div>
                    <span className="text-gray-500">Naam:</span>
                    <span className="ml-2 font-medium">{importedData.name}</span>
                  </div>
                )}
                {importedData.primary_color && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Primary:</span>
                    <div
                      className="w-6 h-6 rounded border border-gray-300"
                      style={{ backgroundColor: importedData.primary_color }}
                    />
                    <span className="font-mono text-xs">{importedData.primary_color}</span>
                  </div>
                )}
                {importedData.secondary_color && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Secondary:</span>
                    <div
                      className="w-6 h-6 rounded border border-gray-300"
                      style={{ backgroundColor: importedData.secondary_color }}
                    />
                    <span className="font-mono text-xs">{importedData.secondary_color}</span>
                  </div>
                )}
                {importedData.logo_url && (
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-gray-500">Logo:</span>
                    <img
                      src={importedData.logo_url}
                      alt="Logo preview"
                      className="h-8 w-auto object-contain bg-gray-100 rounded"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={applyImportedBranding}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Toepassen
                </button>
                <button
                  type="button"
                  onClick={() => setImportedData(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Bedrijfsinfo Section */}
      <Section
        title="Bedrijfsinfo"
        id="bedrijfsinfo"
        isHighlighted={sectionContainsHighlight(['name', 'short_name', 'tagline', 'description', 'header'])}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        }
      >
        <TextField
          label="Bedrijfsnaam"
          value={tenant.name}
          onChange={(v) => onUpdate({ name: v })}
          placeholder="Acme Corporation"
          id="name"
          isHighlighted={isHighlighted('name') || isHighlighted('header')}
        />
        <TextField
          label="Korte naam"
          value={tenant.short_name || ''}
          onChange={(v) => onUpdate({ short_name: v })}
          placeholder="Acme"
          id="short_name"
          isHighlighted={isHighlighted('short_name')}
        />
        <TextField
          label="Tagline"
          value={tenant.tagline || ''}
          onChange={(v) => onUpdate({ tagline: v })}
          placeholder="Your Intelligent HR Assistant"
          id="tagline"
          isHighlighted={isHighlighted('tagline')}
        />
        <TextField
          label="Beschrijving"
          value={tenant.description || ''}
          onChange={(v) => onUpdate({ description: v })}
          placeholder="AI-powered HR assistant..."
          multiline
          id="description"
          isHighlighted={isHighlighted('description')}
        />
      </Section>

      {/* Kleuren Section */}
      <Section
        title="Kleuren"
        id="kleuren"
        isHighlighted={sectionContainsHighlight(['primary_color', 'primary_dark', 'primary_light', 'secondary_color', 'background_color', 'surface_color', 'text_primary', 'text_secondary', 'text_tertiary', 'input_border_color', 'send_button_color', 'language_hint_color', 'header_gradient_start', 'header_gradient_end'])}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        }
      >
        <ColorField
          label="Primary kleur"
          value={tenant.primary_color || ''}
          onChange={(v) => onUpdate({ primary_color: v })}
          id="primary_color"
          isHighlighted={isHighlighted('primary_color')}
        />
        <ColorField
          label="Primary donker"
          value={tenant.primary_dark || ''}
          onChange={(v) => onUpdate({ primary_dark: v })}
          id="primary_dark"
          isHighlighted={isHighlighted('primary_dark')}
        />
        <ColorField
          label="Secondary kleur"
          value={tenant.secondary_color || ''}
          onChange={(v) => onUpdate({ secondary_color: v })}
          id="secondary_color"
          isHighlighted={isHighlighted('secondary_color')}
        />
        <ColorField
          label="Achtergrond"
          value={tenant.background_color || ''}
          onChange={(v) => onUpdate({ background_color: v })}
          id="background_color"
          isHighlighted={isHighlighted('background_color')}
        />
        <ColorField
          label="Surface (cards)"
          value={tenant.surface_color || ''}
          onChange={(v) => onUpdate({ surface_color: v })}
          id="surface_color"
          isHighlighted={isHighlighted('surface_color')}
        />
        <ColorField
          label="Input border"
          value={tenant.input_border_color || ''}
          onChange={(v) => onUpdate({ input_border_color: v })}
          id="input_border_color"
          isHighlighted={isHighlighted('input_border_color')}
        />
        <ColorField
          label="Verstuurknop"
          value={tenant.send_button_color || ''}
          onChange={(v) => onUpdate({ send_button_color: v })}
          id="send_button_color"
          isHighlighted={isHighlighted('send_button_color')}
        />
        <ColorField
          label="Taal hint box"
          value={tenant.language_hint_color || ''}
          onChange={(v) => onUpdate({ language_hint_color: v })}
          id="language_hint_color"
          isHighlighted={isHighlighted('language_hint_color')}
        />
        <ColorField
          label="Header gradient start"
          value={tenant.header_gradient_start || ''}
          onChange={(v) => onUpdate({ header_gradient_start: v })}
          id="header_gradient_start"
          isHighlighted={isHighlighted('header_gradient_start')}
        />
        <ColorField
          label="Header gradient einde"
          value={tenant.header_gradient_end || ''}
          onChange={(v) => onUpdate({ header_gradient_end: v })}
          id="header_gradient_end"
          isHighlighted={isHighlighted('header_gradient_end')}
        />
      </Section>

      {/* Logo's Section */}
      <Section
        title="Logo's & Afbeeldingen"
        id="logos"
        isHighlighted={sectionContainsHighlight(['logo_url', 'favicon_url', 'icon_url'])}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
      >
        <TextField
          label="Logo URL"
          value={tenant.logo_url || ''}
          onChange={(v) => onUpdate({ logo_url: v })}
          placeholder="https://example.com/logo.png"
          id="logo_url"
          isHighlighted={isHighlighted('logo_url')}
        />
        <TextField
          label="Favicon URL"
          value={tenant.favicon_url || ''}
          onChange={(v) => onUpdate({ favicon_url: v })}
          placeholder="https://example.com/favicon.ico"
          id="favicon_url"
          isHighlighted={isHighlighted('favicon_url')}
        />
        <p className="text-xs text-gray-500">
          Tip: Upload afbeeldingen naar Supabase Storage en plak de URL hier.
        </p>
      </Section>

      {/* Achtergrond Patroon Section */}
      <Section
        title="Achtergrond Patroon"
        id="background_pattern"
        isHighlighted={sectionContainsHighlight(['background_pattern', 'background_pattern_type', 'background_pattern_text', 'background_pattern_opacity', 'background_pattern_scale', 'background_pattern_density', 'background_pattern_color_mode'])}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        }
      >
        <div id="field-background_pattern" className={isHighlighted('background_pattern') ? 'ring-2 ring-yellow-400 rounded-lg p-2 bg-yellow-50' : ''}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patroon type</label>
          <select
            value={tenant.background_pattern_type || 'text'}
            onChange={(e) => onUpdate({ background_pattern_type: e.target.value as 'text' | 'logo' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
          >
            <option value="text">Tekst watermark</option>
            <option value="logo">Logo watermark</option>
          </select>
        </div>
        <TextField
          label="Watermark tekst"
          value={tenant.background_pattern_text || ''}
          onChange={(v) => onUpdate({ background_pattern_text: v })}
          placeholder="DEMO"
          id="background_pattern_text"
          isHighlighted={isHighlighted('background_pattern_text')}
        />

        {/* Opacity Slider */}
        <div
          id="field-background_pattern_opacity"
          className={`transition-all duration-300 ${isHighlighted('background_pattern_opacity') ? 'ring-2 ring-yellow-400 rounded-lg p-2 bg-yellow-50' : ''}`}
        >
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Zichtbaarheid ({tenant.background_pattern_opacity ?? (tenant.background_pattern_type === 'logo' ? 8 : 15)}%)
          </label>
          <input
            type="range"
            min="1"
            max="30"
            value={tenant.background_pattern_opacity ?? (tenant.background_pattern_type === 'logo' ? 8 : 15)}
            onChange={(e) => onUpdate({ background_pattern_opacity: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Lichter</span>
            <span>Donkerder</span>
          </div>
        </div>

        {/* Scale Select */}
        <div
          id="field-background_pattern_scale"
          className={`transition-all duration-300 ${isHighlighted('background_pattern_scale') ? 'ring-2 ring-yellow-400 rounded-lg p-2 bg-yellow-50' : ''}`}
        >
          <label className="block text-sm font-medium text-gray-700 mb-1">Grootte</label>
          <select
            value={tenant.background_pattern_scale || 'medium'}
            onChange={(e) => onUpdate({ background_pattern_scale: e.target.value as 'small' | 'medium' | 'large' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
          >
            <option value="small">Klein</option>
            <option value="medium">Normaal</option>
            <option value="large">Groot</option>
          </select>
        </div>

        {/* Density Select */}
        <div
          id="field-background_pattern_density"
          className={`transition-all duration-300 ${isHighlighted('background_pattern_density') ? 'ring-2 ring-yellow-400 rounded-lg p-2 bg-yellow-50' : ''}`}
        >
          <label className="block text-sm font-medium text-gray-700 mb-1">Dichtheid</label>
          <select
            value={tenant.background_pattern_density || 'medium'}
            onChange={(e) => onUpdate({ background_pattern_density: e.target.value as 'low' | 'medium' | 'high' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
          >
            <option value="low">Weinig</option>
            <option value="medium">Normaal</option>
            <option value="high">Veel</option>
          </select>
        </div>

        {/* Color Mode Select - alleen voor logo pattern */}
        {tenant.background_pattern_type === 'logo' && (
          <div
            id="field-background_pattern_color_mode"
            className={`transition-all duration-300 ${isHighlighted('background_pattern_color_mode') ? 'ring-2 ring-yellow-400 rounded-lg p-2 bg-yellow-50' : ''}`}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo kleur</label>
            <select
              value={tenant.background_pattern_color_mode || 'grayscale'}
              onChange={(e) => onUpdate({ background_pattern_color_mode: e.target.value as 'grayscale' | 'original' | 'tinted' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
            >
              <option value="grayscale">Zwart-wit</option>
              <option value="original">Originele kleuren</option>
              <option value="tinted">Met huiskleur</option>
            </select>
          </div>
        )}
      </Section>

      {/* UI Teksten Section */}
      <Section
        title="UI Teksten (Nederlands)"
        id="ui_texts"
        isHighlighted={sectionContainsHighlight(['appTitle', 'appSubtitle', 'welcomeTitle', 'welcomeSubtitle', 'languageHint', 'exampleLabel', 'examples', 'inputPlaceholder'])}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
        }
      >
        <p className="text-xs text-gray-500 -mt-2 mb-4">
          Vul de teksten in het Nederlands in. Bij opslaan worden ze automatisch vertaald naar 11 andere talen.
        </p>
        <TextField
          label="App titel"
          value={dutchTexts.appTitle}
          onChange={(v) => updateDutchTexts('appTitle', v)}
          placeholder="HR Assistent"
          id="appTitle"
          isHighlighted={isHighlighted('appTitle')}
        />
        <TextField
          label="App subtitel"
          value={dutchTexts.appSubtitle}
          onChange={(v) => updateDutchTexts('appSubtitle', v)}
          placeholder="Stel al je HR vragen"
          id="appSubtitle"
          isHighlighted={isHighlighted('appSubtitle')}
        />
        <TextField
          label="Welkomst titel"
          value={dutchTexts.welcomeTitle}
          onChange={(v) => updateDutchTexts('welcomeTitle', v)}
          placeholder="Welkom bij je HR Assistent"
          id="welcomeTitle"
          isHighlighted={isHighlighted('welcomeTitle')}
        />
        <TextField
          label="Welkomst subtitel"
          value={dutchTexts.welcomeSubtitle}
          onChange={(v) => updateDutchTexts('welcomeSubtitle', v)}
          placeholder="Stel al je vragen over HR beleid..."
          multiline
          id="welcomeSubtitle"
          isHighlighted={isHighlighted('welcomeSubtitle')}
        />
        <TextField
          label="Taal hint"
          value={dutchTexts.languageHint}
          onChange={(v) => updateDutchTexts('languageHint', v)}
          placeholder="Tip: Ik antwoord automatisch..."
          id="languageHint"
          isHighlighted={isHighlighted('languageHint')}
        />
        <TextField
          label="Voorbeeld label"
          value={dutchTexts.exampleLabel}
          onChange={(v) => updateDutchTexts('exampleLabel', v)}
          placeholder="Bijvoorbeeld:"
          id="exampleLabel"
          isHighlighted={isHighlighted('exampleLabel')}
        />

        {/* Example Questions */}
        <div id="field-examples" className={`space-y-2 ${isHighlighted('examples') ? 'ring-2 ring-yellow-400 rounded-lg p-2 bg-yellow-50' : ''}`}>
          <label className="block text-sm font-medium text-gray-700">Voorbeeldvragen (4)</label>
          {dutchTexts.examples.map((example, idx) => (
            <input
              key={idx}
              type="text"
              value={example}
              onChange={(e) => updateExample(idx, e.target.value)}
              placeholder={`Voorbeeldvraag ${idx + 1}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
            />
          ))}
        </div>

        <TextField
          label="Input placeholder"
          value={dutchTexts.inputPlaceholder}
          onChange={(v) => updateDutchTexts('inputPlaceholder', v)}
          placeholder="Stel je vraag..."
          id="inputPlaceholder"
          isHighlighted={isHighlighted('inputPlaceholder')}
        />
      </Section>

      {/* Fun Facts Section */}
      <Section
        title="Fun Facts"
        id="fun_facts"
        isHighlighted={sectionContainsHighlight(['fun_facts', 'fun_facts_enabled', 'fun_facts_prefix'])}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        }
      >
        <ToggleField
          label="Fun facts inschakelen"
          description="Toon fun facts tijdens het laden"
          value={tenant.fun_facts_enabled}
          onChange={(v) => onUpdate({ fun_facts_enabled: v })}
          id="fun_facts_enabled"
          isHighlighted={isHighlighted('fun_facts_enabled')}
        />

        <TextField
          label="Prefix"
          value={tenant.fun_facts_prefix || ''}
          onChange={(v) => onUpdate({ fun_facts_prefix: v })}
          placeholder="Wist je dat"
          id="fun_facts_prefix"
          isHighlighted={isHighlighted('fun_facts_prefix')}
        />

        {/* PDF Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <input
            type="file"
            accept=".pdf"
            onChange={handlePdfUpload}
            className="hidden"
            id="pdf-upload"
            disabled={extractingFacts}
          />
          <label
            htmlFor="pdf-upload"
            className={`cursor-pointer ${extractingFacts ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {extractingFacts ? (
              <div className="flex items-center justify-center gap-2 text-purple-600">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Fun facts extraheren...</span>
              </div>
            ) : (
              <>
                <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">Upload een PDF om fun facts te extraheren</p>
                <p className="text-xs text-gray-400">AI extraheert automatisch interessante feiten</p>
              </>
            )}
          </label>
        </div>

        {/* Fun Facts List */}
        <div id="field-fun_facts" className={`space-y-2 ${isHighlighted('fun_facts') ? 'ring-2 ring-yellow-400 rounded-lg p-2 bg-yellow-50' : ''}`}>
          <label className="block text-sm font-medium text-gray-700">
            Fun facts ({tenant.fun_facts?.length || 0})
          </label>
          {tenant.fun_facts?.map((fact, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={fact}
                onChange={(e) => updateFunFact(idx, e.target.value)}
                placeholder="...wij al 25 jaar bestaan?"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
              <button
                onClick={() => removeFunFact(idx)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            onClick={addFunFact}
            className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
          >
            + Fun fact toevoegen
          </button>
        </div>
      </Section>

      {/* Features Section */}
      <Section
        title="Features"
        id="features"
        isHighlighted={sectionContainsHighlight(['show_powered_by', 'enable_feedback'])}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
      >
        <ToggleField
          label="Powered by Levtor"
          description="Toon 'Powered by Levtor' in footer"
          value={tenant.show_powered_by}
          onChange={(v) => onUpdate({ show_powered_by: v })}
          id="show_powered_by"
          isHighlighted={isHighlighted('show_powered_by')}
        />
        <ToggleField
          label="Feedback knoppen"
          description="Toon feedback knoppen bij antwoorden"
          value={tenant.enable_feedback}
          onChange={(v) => onUpdate({ enable_feedback: v })}
          id="enable_feedback"
          isHighlighted={isHighlighted('enable_feedback')}
        />
      </Section>
    </div>
  );
}
