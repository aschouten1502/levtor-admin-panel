'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * ========================================
 * ADMIN KLANT DETAIL PAGE
 * ========================================
 *
 * Detail pagina voor een klant met:
 * - Overzicht: basis info + producten
 * - Portal Users: beheer portal toegang
 * - Facturen: upload en bekijk facturen
 */

interface Product {
  id: string;
  product_id: string;
  name: string | null;
  is_active: boolean;
  products?: {
    id: string;
    name: string;
    description: string;
    icon: string;
  };
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
}

interface Invoice {
  id: string;
  filename: string;
  file_path: string;
  invoice_number: string | null;
  invoice_date: string | null;
  amount: number | null;
  description: string | null;
  is_paid_by_customer: boolean;
  customer_paid_at: string | null;
  is_verified_by_admin: boolean;
  admin_verified_at: string | null;
  created_at: string;
}

type PaymentStatus = 'open' | 'pending' | 'paid';

function getPaymentStatus(invoice: Invoice): PaymentStatus {
  if (invoice.is_verified_by_admin) return 'paid';
  if (invoice.is_paid_by_customer) return 'pending';
  return 'open';
}

function getStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'open': return 'Open';
    case 'pending': return 'Wacht op verificatie';
    case 'paid': return 'Betaald';
  }
}

function getStatusColor(status: PaymentStatus): string {
  switch (status) {
    case 'open': return 'bg-yellow-100 text-yellow-700';
    case 'pending': return 'bg-orange-100 text-orange-700';
    case 'paid': return 'bg-green-100 text-green-700';
  }
}

interface Klant {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  products: Product[];
  users: User[];
  invoices: Invoice[];
  stats: {
    documents_count: number;
    chat_logs_count: number;
    users_count: number;
    invoices_count: number;
  };
}

type Tab = 'overzicht' | 'users' | 'facturen';

export default function AdminKlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [klant, setKlant] = useState<Klant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overzicht');

  // User form state
  const [showUserForm, setShowUserForm] = useState(false);
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user' as 'admin' | 'user',
  });
  const [userFormLoading, setUserFormLoading] = useState(false);

  // Invoice verify state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [confirmingVerifyId, setConfirmingVerifyId] = useState<string | null>(null);

  const fetchKlant = async () => {
    try {
      const response = await fetch(`/api/admin/klanten/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/admin/klanten');
          return;
        }
        throw new Error('Failed to fetch');
      }
      const data = await response.json();
      setKlant(data.klant);
    } catch (err) {
      setError('Kon klant niet laden');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKlant();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm(`Weet je zeker dat je "${klant?.name}" wilt verwijderen? Dit verwijdert ook alle gerelateerde data!`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/klanten/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      router.push('/admin/klanten');
    } catch (err) {
      setError('Kon klant niet verwijderen');
    }
  };

  const handleToggleActive = async () => {
    if (!klant) return;

    try {
      const response = await fetch(`/api/admin/klanten/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !klant.is_active }),
      });

      if (!response.ok) throw new Error('Failed to update');
      fetchKlant();
    } catch (err) {
      setError('Kon status niet wijzigen');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormLoading(true);

    try {
      const response = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: id,
          ...userFormData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create user');
      }

      setShowUserForm(false);
      setUserFormData({ email: '', password: '', name: '', role: 'user' });
      fetchKlant();
    } catch (err: any) {
      setError(err.message || 'Kon gebruiker niet aanmaken');
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleToggleUserActive = async (user: User) => {
    try {
      const response = await fetch(`/api/admin/customers/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      });

      if (!response.ok) throw new Error('Failed to update');
      fetchKlant();
    } catch (err) {
      setError('Kon gebruiker niet updaten');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Weet je zeker dat je ${user.email} wilt verwijderen?`)) return;

    try {
      const response = await fetch(`/api/admin/customers/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');
      fetchKlant();
    } catch (err) {
      setError('Kon gebruiker niet verwijderen');
    }
  };

  const handleVerifyPayment = async (invoiceId: string) => {
    setVerifyingId(invoiceId);
    setConfirmingVerifyId(null);

    try {
      const response = await fetch(`/api/admin/klanten/${id}/invoices/${invoiceId}/verify`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Kon factuur niet verifiëren');
      }

      // Refresh klant data
      fetchKlant();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden');
    } finally {
      setVerifyingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!klant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Klant niet gevonden</p>
        <Link href="/admin/klanten" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
          ← Terug naar klanten
        </Link>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overzicht', label: 'Overzicht' },
    { id: 'users', label: 'Portal Users', count: klant.stats.users_count },
    { id: 'facturen', label: 'Facturen', count: klant.stats.invoices_count },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm">
        <Link href="/admin/klanten" className="text-gray-500 hover:text-gray-700">
          Klanten
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-900">{klant.name}</span>
      </nav>

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

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{klant.name}</h1>
            <p className="text-gray-500 mt-1">ID: {klant.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleActive}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                klant.is_active
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-red-100 text-red-800 hover:bg-red-200'
              }`}
            >
              {klant.is_active ? 'Actief' : 'Inactief'}
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 rounded text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              Verwijderen
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">{klant.stats.documents_count}</p>
            <p className="text-sm text-gray-500">Documenten</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">{klant.stats.chat_logs_count}</p>
            <p className="text-sm text-gray-500">Chats</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">{klant.stats.users_count}</p>
            <p className="text-sm text-gray-500">Gebruikers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">{klant.stats.invoices_count}</p>
            <p className="text-sm text-gray-500">Facturen</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overzicht' && (
        <div className="space-y-6">
          {/* Products */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Producten</h2>
            <div className="space-y-3">
              {klant.products.filter(p => p.is_active).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{product.products?.icon || '📦'}</span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {product.products?.name || product.product_id}
                      </p>
                      <p className="text-sm text-gray-500">{product.name}</p>
                    </div>
                  </div>
                  <Link
                    href={`/admin/products/hr-bot/branding/${id}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Configureren →
                  </Link>
                </div>
              ))}
              {klant.products.filter(p => p.is_active).length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  Geen actieve producten
                </p>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              href={`/admin/products/hr-bot/branding/${id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Branding</h3>
                  <p className="text-sm text-gray-500">Pas kleuren en logo aan</p>
                </div>
              </div>
            </Link>

            <Link
              href={`/admin/products/hr-bot/logs/${id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Chat Logs</h3>
                  <p className="text-sm text-gray-500">{klant.stats.chat_logs_count} gesprekken</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Portal Gebruikers</h2>
            <button
              onClick={() => setShowUserForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Gebruiker toevoegen
            </button>
          </div>

          {/* User Form */}
          {showUserForm && (
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <form onSubmit={handleCreateUser} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="gebruiker@bedrijf.nl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Minimaal 8 karakters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Naam (optioneel)</label>
                  <input
                    type="text"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Jan de Vries"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as 'admin' | 'user' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="user">Gebruiker</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={userFormLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                  >
                    {userFormLoading ? 'Aanmaken...' : 'Aanmaken'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUserForm(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Annuleren
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users Table */}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gebruiker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aangemaakt
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {klant.users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Nog geen portal gebruikers
                  </td>
                </tr>
              ) : (
                klant.users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-gray-900">{user.name || '-'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'Gebruiker'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleUserActive(user)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          user.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {user.is_active ? 'Actief' : 'Inactief'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Verwijderen"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'facturen' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Facturen</h2>
            <Link
              href={`/admin/klanten/${id}/facturen`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Factuur uploaden
            </Link>
          </div>

          {/* Invoices Table */}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Factuur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bedrag
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {klant.invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Nog geen facturen geupload
                  </td>
                </tr>
              ) : (
                klant.invoices.map((invoice) => {
                  const status = getPaymentStatus(invoice);
                  const isConfirming = confirmingVerifyId === invoice.id;
                  const isVerifying = verifyingId === invoice.id;

                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-medium text-gray-900">
                            {invoice.invoice_number || invoice.filename}
                          </p>
                          {invoice.description && (
                            <p className="text-sm text-gray-500">{invoice.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.invoice_date ? formatDate(invoice.invoice_date) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Verify button - for any unpaid invoice (admin override) */}
                          {status !== 'paid' && (
                            isConfirming ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleVerifyPayment(invoice.id)}
                                  disabled={isVerifying}
                                  className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                  {isVerifying ? 'Bezig...' : 'Bevestigen'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmingVerifyId(null)}
                                  disabled={isVerifying}
                                  className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                                >
                                  Annuleren
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmingVerifyId(invoice.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {status === 'pending' ? 'Verifieer' : 'Betaald'}
                              </button>
                            )
                          )}
                          {/* View PDF button */}
                          <a
                            href={`/api/storage/invoices/${invoice.file_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            PDF
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
