'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

/**
 * ========================================
 * PRODUCT LOGS PAGE
 * ========================================
 *
 * Shows chat logs for the product.
 */

interface ChatLog {
  id: string;
  question: string;
  answer: string;
  language: string;
  session_id: string | null;
  total_cost: number | null;
  response_time_ms: number | null;
  created_at: string;
}

interface ProductInfo {
  id: string;
  product_id: string;
  name: string | null;
  products: {
    name: string;
  };
}

export default function ProductLogsPage() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const limit = 20;

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [productRes, logsRes] = await Promise.all([
        fetch(`/api/portal/products/${productId}`),
        fetch(`/api/portal/products/${productId}/logs?limit=${limit}&offset=${offset}`),
      ]);

      if (!productRes.ok) {
        throw new Error('Product niet gevonden');
      }

      const productData = await productRes.json();
      setProduct(productData.product);

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
        setTotal(logsData.total || 0);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden');
    } finally {
      setIsLoading(false);
    }
  }, [productId, offset]);

  useEffect(() => {
    if (productId) {
      fetchData();
    }
  }, [productId, fetchData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 4,
    }).format(amount);
  };

  const languageNames: Record<string, string> = {
    nl: 'Nederlands',
    en: 'English',
    de: 'Deutsch',
    fr: 'Français',
    es: 'Español',
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (isLoading && logs.length === 0) {
    return (
      <div className="max-w-5xl animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="max-w-5xl">
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
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <nav className="text-sm mb-6">
        <Link href="/portal" className="text-gray-500 hover:text-gray-700">
          Dashboard
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <Link
          href={`/portal/products/${productId}`}
          className="text-gray-500 hover:text-gray-700"
        >
          {product?.name || product?.products?.name}
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-900">Chat Logs</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chat Logs</h1>
          <p className="text-gray-500">
            {total} gesprekken gevonden
          </p>
        </div>
      </div>

      {/* Logs list */}
      {logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen chat logs</h3>
          <p className="text-gray-500">
            Er zijn nog geen gesprekken gevoerd met de chatbot.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4">
                <div
                  className="cursor-pointer"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-medium text-gray-900 truncate">
                        {log.question}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 whitespace-nowrap">
                      <span>{languageNames[log.language] || log.language}</span>
                      <span>{formatDate(log.created_at)}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${expandedLog === log.id ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {log.response_time_ms && (
                      <span>{(log.response_time_ms / 1000).toFixed(2)}s</span>
                    )}
                    {log.total_cost !== null && (
                      <span>{formatCurrency(log.total_cost)}</span>
                    )}
                  </div>
                </div>

                {/* Expanded view */}
                {expandedLog === log.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Vraag</p>
                      <p className="text-gray-900 bg-gray-50 rounded-lg p-3">{log.question}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Antwoord</p>
                      <p className="text-gray-900 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                        {log.answer}
                      </p>
                    </div>
                    {log.session_id && (
                      <div className="text-xs text-gray-500">
                        Session: {log.session_id}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Pagina {currentPage} van {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Vorige
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Volgende
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
