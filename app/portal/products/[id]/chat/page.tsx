'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

/**
 * ========================================
 * PRODUCT CHAT TEST PAGE
 * ========================================
 *
 * Allows customers to test their chatbot.
 */

interface ProductInfo {
  id: string;
  product_id: string;
  name: string | null;
  products: {
    name: string;
  };
  tenant: {
    id: string;
    name: string;
  };
}

export default function ProductChatPage() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/portal/products/${productId}`);
        if (!res.ok) {
          throw new Error('Product niet gevonden');
        }
        const data = await res.json();
        setProduct(data.product);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Er is een fout opgetreden');
      } finally {
        setIsLoading(false);
      }
    }
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  if (isLoading) {
    return (
      <div className="max-w-4xl animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
        <div className="h-[600px] bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h2 className="text-lg font-medium text-red-900 mb-2">
            {error || 'Product niet gevonden'}
          </h2>
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

  const chatUrl = `/?tenant=${product.tenant?.id}`;

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
          {product.name || product.products?.name}
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-900">Test Bot</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test de Bot</h1>
          <p className="text-gray-500">
            Test de chatbot met je eigen vragen
          </p>
        </div>
        <a
          href={chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open in nieuw tabblad
        </a>
      </div>

      {/* Chat iframe */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <iframe
          src={chatUrl}
          className="w-full h-[700px] border-0"
          title="Chat Test"
        />
      </div>
    </div>
  );
}
