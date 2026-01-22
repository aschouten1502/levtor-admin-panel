'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

/**
 * ========================================
 * PRODUCT DOCUMENTS PAGE
 * ========================================
 *
 * Allows customers to view and manage documents.
 */

interface Document {
  id: string;
  filename: string;
  file_size: number | null;
  processing_status: string;
  total_chunks: number | null;
  created_at: string;
}

interface ProductInfo {
  id: string;
  product_id: string;
  name: string | null;
  products: {
    name: string;
  };
  tenant: {
    id: string;
  };
}

export default function ProductDocumentsPage() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [productRes, docsRes] = await Promise.all([
        fetch(`/api/portal/products/${productId}`),
        fetch(`/api/portal/products/${productId}/documents`),
      ]);

      if (!productRes.ok) {
        throw new Error('Product niet gevonden');
      }

      const productData = await productRes.json();
      setProduct(productData.product);

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData.documents || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      fetchData();
    }
  }, [productId, fetchData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !product) return;

    setIsUploading(true);
    setUploadProgress('Uploading...');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenant_id', product.tenant.id);
      formData.append('tenant_product_id', productId);

      const res = await fetch('/api/rag/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload mislukt');
      }

      setUploadProgress('Verwerken...');

      // Refresh documents
      await fetchData();
      setUploadProgress(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload mislukt');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Weet je zeker dat je dit document wilt verwijderen?')) return;

    setDeleteId(docId);
    try {
      const res = await fetch(`/api/portal/products/${productId}/documents?doc_id=${docId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Verwijderen mislukt');
      }

      // Remove from list
      setDocuments((docs) => docs.filter((d) => d.id !== docId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verwijderen mislukt');
    } finally {
      setDeleteId(null);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !product) {
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
        <Link
          href={`/portal/products/${productId}`}
          className="text-gray-500 hover:text-gray-700"
        >
          {product?.name || product?.products?.name}
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-900">Documenten</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documenten</h1>
          <p className="text-gray-500">
            Beheer de kennisbank documenten voor je chatbot
          </p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Document uploaden
          <input
            type="file"
            accept=".pdf"
            onChange={handleUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Error message */}
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

      {/* Upload progress */}
      {uploadProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <p className="text-blue-700">{uploadProgress}</p>
        </div>
      )}

      {/* Documents list */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen documenten</h3>
          <p className="text-gray-500 mb-6">
            Upload je eerste document om de chatbot te trainen.
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Document uploaden
            <input
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate" title={doc.filename}>
                    {doc.filename || 'Naamloos document'}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span>{doc.total_chunks || 0} chunks</span>
                    <span>•</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    doc.processing_status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : doc.processing_status === 'processing'
                      ? 'bg-yellow-100 text-yellow-700'
                      : doc.processing_status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {doc.processing_status === 'completed' ? 'Verwerkt' : doc.processing_status === 'processing' ? 'Verwerken...' : doc.processing_status === 'failed' ? 'Mislukt' : doc.processing_status}
                </span>
                <a
                  href={`/api/portal/products/${productId}/documents/${doc.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Document openen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleteId === doc.id}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  title="Verwijderen"
                >
                  {deleteId === doc.id ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
