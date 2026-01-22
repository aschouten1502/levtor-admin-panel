'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * ========================================
 * ADMIN KLANT FACTUREN PAGE
 * ========================================
 *
 * Upload en beheer facturen voor een klant.
 * Admin kan ook betalingen verifiëren.
 */

interface Invoice {
  id: string;
  filename: string;
  file_path: string;
  file_size: number | null;
  invoice_number: string | null;
  invoice_date: string | null;
  amount: number | null;
  description: string | null;
  is_paid_by_customer: boolean;
  customer_paid_at: string | null;
  is_verified_by_admin: boolean;
  admin_verified_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

interface Klant {
  id: string;
  name: string;
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

export default function KlantFacturenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [klant, setKlant] = useState<Klant | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload form state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // Verify state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // Fetch klant basic info
      const klantResponse = await fetch(`/api/admin/klanten/${id}`);
      if (!klantResponse.ok) {
        if (klantResponse.status === 404) {
          router.push('/admin/klanten');
          return;
        }
        throw new Error('Failed to fetch klant');
      }
      const klantData = await klantResponse.json();
      setKlant({ id: klantData.klant.id, name: klantData.klant.name });

      // Fetch invoices
      const invoicesResponse = await fetch(`/api/admin/klanten/${id}/invoices`);
      if (!invoicesResponse.ok) throw new Error('Failed to fetch invoices');
      const invoicesData = await invoicesResponse.json();
      setInvoices(invoicesData.invoices || []);
    } catch (err) {
      setError('Kon data niet laden');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Alleen PDF bestanden zijn toegestaan');
        return;
      }
      setUploadFile(file);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Selecteer een bestand');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (invoiceNumber) formData.append('invoice_number', invoiceNumber);
      if (invoiceDate) formData.append('invoice_date', invoiceDate);
      if (amount) formData.append('amount', amount);
      if (description) formData.append('description', description);

      const response = await fetch(`/api/admin/klanten/${id}/invoices`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload mislukt');
      }

      // Reset form
      setUploadFile(null);
      setInvoiceNumber('');
      setInvoiceDate('');
      setAmount('');
      setDescription('');

      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Refresh list
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kon factuur niet uploaden');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm(`Weet je zeker dat je "${invoice.filename}" wilt verwijderen?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/klanten/${id}/invoices?invoice_id=${invoice.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Delete failed');
      fetchData();
    } catch (err) {
      setError('Kon factuur niet verwijderen');
    }
  };

  const handleVerify = async (invoiceId: string) => {
    setVerifyingId(invoiceId);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/klanten/${id}/invoices/${invoiceId}/verify`,
        { method: 'PATCH' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Verificatie mislukt');
      }

      // Update local state
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? { ...inv, is_verified_by_admin: true, admin_verified_at: new Date().toISOString() }
            : inv
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kon betaling niet verifiëren');
    } finally {
      setVerifyingId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  // Count pending invoices
  const pendingCount = invoices.filter((inv) => getPaymentStatus(inv) === 'pending').length;

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
          Terug naar klanten
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm">
        <Link href="/admin/klanten" className="text-gray-500 hover:text-gray-700">
          Klanten
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <Link href={`/admin/klanten/${id}`} className="text-gray-500 hover:text-gray-700">
          {klant.name}
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-900">Facturen</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturen</h1>
          <p className="text-gray-500 mt-1">
            Upload en beheer facturen voor {klant.name}
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                {pendingCount} wacht{pendingCount > 1 ? 'en' : ''} op verificatie
              </span>
            )}
          </p>
        </div>
        <Link
          href={`/admin/klanten/${id}`}
          className="text-gray-500 hover:text-gray-700"
        >
          Terug naar overzicht
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-red-700">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700" title="Sluit melding">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Upload Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Factuur uploaden</h2>

        <form onSubmit={handleUpload} className="space-y-4">
          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PDF bestand *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                id="file-input"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {uploadFile ? (
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z" />
                  </svg>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{uploadFile.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(uploadFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadFile(null)}
                    className="ml-4 text-gray-400 hover:text-gray-600"
                    title="Verwijder bestand"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label htmlFor="file-input" className="cursor-pointer">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-gray-600">
                    <span className="text-blue-600 hover:text-blue-700">Selecteer een PDF</span>
                    {' '}of drag & drop
                  </p>
                  <p className="text-sm text-gray-500 mt-1">PDF tot 10MB</p>
                </label>
              )}
            </div>
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Factuurnummer
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="2024-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Factuurdatum
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bedrag (EUR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="500.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Omschrijving
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="HR Bot abonnement januari 2024"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!uploadFile || isUploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploaden...
                </span>
              ) : (
                'Factuur uploaden'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Geüploade facturen ({invoices.length})
          </h2>
        </div>

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
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  Nog geen facturen geüpload
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => {
                const status = getPaymentStatus(invoice);
                const isVerifying = verifyingId === invoice.id;

                return (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <svg className="w-8 h-8 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z" />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900">
                            {invoice.invoice_number || invoice.filename}
                          </p>
                          {invoice.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {invoice.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                        {getStatusLabel(status)}
                      </span>
                      {invoice.customer_paid_at && !invoice.is_verified_by_admin && (
                        <p className="text-xs text-gray-500 mt-1">
                          Betaald op {formatDate(invoice.customer_paid_at)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Verify button - for any unpaid invoice (admin override) */}
                        {status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => handleVerify(invoice.id)}
                            disabled={isVerifying}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                            title="Verifieer betaling"
                          >
                            {isVerifying ? (
                              <>
                                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Bezig...
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {status === 'pending' ? 'Verifieer' : 'Betaald'}
                              </>
                            )}
                          </button>
                        )}

                        {/* View button */}
                        <a
                          href={`/api/storage/invoices/${invoice.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Bekijken"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          PDF
                        </a>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(invoice)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          title="Verwijderen"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
