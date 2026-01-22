'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * ========================================
 * NIEUWE KLANT PAGE
 * ========================================
 *
 * Wizard voor het aanmaken van een nieuwe klant:
 * 1. Basis info (naam, id)
 * 2. Producten selecteren
 * 3. Optioneel: eerste portal user aanmaken
 */

interface Product {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export default function NewKlantPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic info
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [autoGenerateId, setAutoGenerateId] = useState(true);

  // Step 2: Products
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(['hr_bot']);

  // Step 3: First user (optional)
  const [createUser, setCreateUser] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userName, setUserName] = useState('');

  // Fetch available products
  useEffect(() => {
    // For now, hardcoded products (in future: fetch from API)
    setAvailableProducts([
      {
        id: 'hr_bot',
        name: 'HR Bot',
        description: 'AI-powered HR assistant voor HR-vragen',
        icon: '🤖',
      },
    ]);
  }, []);

  // Auto-generate ID from name
  useEffect(() => {
    if (autoGenerateId && name) {
      const generatedId = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      setId(generatedId);
    }
  }, [name, autoGenerateId]);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create klant
      const klantResponse = await fetch('/api/admin/klanten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name,
          products: selectedProducts,
        }),
      });

      if (!klantResponse.ok) {
        const data = await klantResponse.json();
        throw new Error(data.error || 'Kon klant niet aanmaken');
      }

      // Optionally create first user
      if (createUser && userEmail && userPassword) {
        const userResponse = await fetch('/api/admin/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: id,
            email: userEmail,
            password: userPassword,
            name: userName || undefined,
            role: 'admin',
          }),
        });

        if (!userResponse.ok) {
          // Don't fail the whole flow, just warn
          console.warn('Could not create user, but klant was created');
        }
      }

      // Redirect to klant detail page
      router.push(`/admin/klanten/${id}`);
    } catch (err: any) {
      setError(err.message || 'Er is een fout opgetreden');
      setIsLoading(false);
    }
  };

  const canProceedStep1 = name.trim().length > 0 && id.trim().length > 0;
  const canProceedStep2 = selectedProducts.length > 0;
  const canProceedStep3 = !createUser || (userEmail.length > 0 && userPassword.length >= 8);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-sm mb-6">
        <Link href="/admin/klanten" className="text-gray-500 hover:text-gray-700">
          Klanten
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-900">Nieuwe klant</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nieuwe klant aanmaken</h1>
        <p className="text-gray-500 mt-1">
          Voeg een nieuwe klant toe aan het platform
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
                step >= s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`w-20 h-1 mx-2 ${
                  step > s ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basis informatie</h2>
            <p className="text-gray-500 text-sm mb-6">
              Voer de naam van het bedrijf in. Het ID wordt automatisch gegenereerd.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bedrijfsnaam *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="GeoStick B.V."
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Klant ID *
            </label>
            <div className="relative">
              <input
                type="text"
                value={id}
                onChange={(e) => {
                  setAutoGenerateId(false);
                  setId(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="geostick"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Dit ID wordt gebruikt voor URLs en kan later niet worden gewijzigd.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Volgende
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Products */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Producten selecteren</h2>
            <p className="text-gray-500 text-sm mb-6">
              Welke producten wil je toewijzen aan {name}?
            </p>
          </div>

          <div className="space-y-3">
            {availableProducts.map((product) => (
              <label
                key={product.id}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedProducts.includes(product.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProducts([...selectedProducts, product.id]);
                    } else {
                      setSelectedProducts(selectedProducts.filter((id) => id !== product.id));
                    }
                  }}
                  className="sr-only"
                />
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-3xl">{product.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.description}</p>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedProducts.includes(product.id)
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedProducts.includes(product.id) && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Terug
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedStep2}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Volgende
            </button>
          </div>
        </div>
      )}

      {/* Step 3: First User */}
      {step === 3 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Portal gebruiker</h2>
            <p className="text-gray-500 text-sm mb-6">
              Optioneel: maak direct een portal gebruiker aan voor {name}.
            </p>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={createUser}
              onChange={(e) => setCreateUser(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">Eerste gebruiker aanmaken</span>
          </label>

          {createUser && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="admin@geostick.nl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wachtwoord *
                </label>
                <input
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Minimaal 8 karakters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Naam (optioneel)
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Jan de Vries"
                />
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Samenvatting</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Bedrijf:</span>
                <span className="font-medium text-gray-900">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ID:</span>
                <span className="font-mono text-gray-900">{id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Producten:</span>
                <span className="text-gray-900">
                  {selectedProducts.map((p) => availableProducts.find((ap) => ap.id === p)?.name || p).join(', ')}
                </span>
              </div>
              {createUser && userEmail && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Portal user:</span>
                  <span className="text-gray-900">{userEmail}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Terug
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canProceedStep3 || isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Aanmaken...
                </span>
              ) : (
                'Klant aanmaken'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
