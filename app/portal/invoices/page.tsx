'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * ========================================
 * PORTAL INVOICES PAGE
 * ========================================
 *
 * Shows all invoices for the customer with payment status.
 * Customers can mark invoices as paid.
 */

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

export default function PortalInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const res = await fetch('/api/portal/invoices');
        if (!res.ok) {
          throw new Error('Kon facturen niet ophalen');
        }
        const data = await res.json();
        setInvoices(data.invoices || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Er is een fout opgetreden');
      } finally {
        setIsLoading(false);
      }
    }
    fetchInvoices();
  }, []);

  const handleMarkAsPaid = async (invoiceId: string) => {
    setMarkingPaidId(invoiceId);
    setConfirmingId(null);

    try {
      const res = await fetch(`/api/portal/invoices/${invoiceId}/mark-paid`, {
        method: 'PATCH',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Kon factuur niet markeren als betaald');
      }

      // Update local state
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? { ...inv, is_paid_by_customer: true, customer_paid_at: new Date().toISOString() }
            : inv
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden');
    } finally {
      setMarkingPaidId(null);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Calculate total amount
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  // Count open invoices
  const openCount = invoices.filter((inv) => getPaymentStatus(inv) === 'open').length;

  if (isLoading) {
    return (
      <div className="max-w-4xl animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && invoices.length === 0) {
    return (
      <div className="max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h2 className="text-lg font-medium text-red-900 mb-2">{error}</h2>
          <Link
            href="/portal"
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Terug naar dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <nav className="text-sm mb-6">
        <Link href="/portal" className="text-gray-500 hover:text-gray-700">
          Dashboard
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-900">Facturen</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturen</h1>
          <p className="text-gray-500">
            {invoices.length} facturen
            {openCount > 0 && (
              <span className="ml-2 text-yellow-600">
                ({openCount} openstaand)
              </span>
            )}
          </p>
        </div>
        {invoices.length > 0 && (
          <div className="text-right">
            <p className="text-sm text-gray-500">Totaal</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <p className="text-red-700">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700" title="Sluit melding">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Invoices list */}
      {invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen facturen</h3>
          <p className="text-gray-500">
            Er zijn nog geen facturen beschikbaar.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Factuur
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Bedrag
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((invoice) => {
                const status = getPaymentStatus(invoice);
                const isConfirming = confirmingId === invoice.id;
                const isMarking = markingPaidId === invoice.id;

                return (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 block">
                            {invoice.invoice_number || invoice.filename}
                          </span>
                          {invoice.description && (
                            <span className="text-sm text-gray-500 truncate max-w-[200px] block">
                              {invoice.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                        {getStatusLabel(status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Mark as paid button - only for open invoices */}
                        {status === 'open' && (
                          isConfirming ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleMarkAsPaid(invoice.id)}
                                disabled={isMarking}
                                className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                              >
                                {isMarking ? 'Bezig...' : 'Bevestigen'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingId(null)}
                                disabled={isMarking}
                                className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                              >
                                Annuleren
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingId(invoice.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Betaald
                            </button>
                          )
                        )}

                        {/* Download button */}
                        <a
                          href={`/api/storage/invoices/${invoice.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
