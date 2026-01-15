'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { QATestRun, QACategory, CATEGORY_INFO } from '@/lib/admin/qa-types';

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

/**
 * Tenant QA Test Page
 *
 * Shows test history and allows starting new tests.
 */
export default function TenantTestPage({ params }: PageProps) {
  const { tenantId } = use(params);
  const router = useRouter();

  const [testRuns, setTestRuns] = useState<QATestRun[]>([]);
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch test history
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/admin/test/${tenantId}`);
        if (!res.ok) throw new Error('Failed to fetch test history');
        const data = await res.json();
        setTestRuns(data.test_runs || []);
        setDocumentCount(data.document_count || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [tenantId]);

  // Start new test
  const startTest = async () => {
    if (starting) return;

    setStarting(true);
    try {
      const res = await fetch(`/api/admin/test/${tenantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!res.ok) throw new Error('Failed to start test');

      const data = await res.json();
      router.push(`/admin/test/${tenantId}/${data.test_run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start test');
      setStarting(false);
    }
  };

  // Format helpers
  const formatCost = (cost: number | null | undefined) => {
    if (!cost) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    return `$${cost.toFixed(4)}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-600',
      generating: 'bg-blue-100 text-blue-600',
      running: 'bg-yellow-100 text-yellow-600',
      evaluating: 'bg-purple-100 text-purple-600',
      completed: 'bg-green-100 text-green-600',
      failed: 'bg-red-100 text-red-600'
    };
    const labels: Record<string, string> = {
      pending: 'Wacht',
      generating: 'Genereert',
      running: 'Uitvoeren',
      evaluating: 'Evalueren',
      completed: 'Voltooid',
      failed: 'Mislukt'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="h-48 bg-gray-200 rounded mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate estimated questions
  const estimatedQuestions = 60 + (documentCount * 2);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
          <Link href="/admin" className="hover:text-gray-700">Admin</Link>
          <span>/</span>
          <Link href="/admin/test" className="hover:text-gray-700">QA Testing</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{tenantId}</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">QA Tests: {tenantId}</h1>
            <p className="text-gray-600">{documentCount} documenten beschikbaar</p>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href={`/admin/test/${tenantId}/templates`}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
            >
              Templates beheren
            </Link>
            <button
              onClick={startTest}
              disabled={starting || documentCount === 0}
              className={`px-6 py-2 text-sm font-medium text-white rounded-lg transition ${
                starting || documentCount === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {starting ? 'Starten...' : 'Start Nieuwe Test'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Start Test Info Box */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nieuwe Test Starten</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-500">Geschatte Vragen</div>
              <div className="text-2xl font-bold text-gray-900">{estimatedQuestions}</div>
              <div className="text-xs text-gray-400">60 basis + {documentCount * 2} (docs)</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Geschatte Kosten</div>
              <div className="text-2xl font-bold text-gray-900">~${((estimatedQuestions * 0.02) + 0.30).toFixed(2)}</div>
              <div className="text-xs text-gray-400">generatie + uitvoering + evaluatie</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Geschatte Duur</div>
              <div className="text-2xl font-bold text-gray-900">~{Math.ceil(estimatedQuestions / 2)} min</div>
              <div className="text-xs text-gray-400">afhankelijk van systeem load</div>
            </div>
          </div>

          {documentCount === 0 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-700">
              Er zijn geen documenten geupload voor deze tenant. Upload eerst documenten voordat je een test start.
            </div>
          )}
        </div>

        {/* Test History */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Test Geschiedenis</h2>
          </div>

          {testRuns.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <div className="text-4xl mb-2">🧪</div>
              <p>Nog geen tests uitgevoerd voor deze tenant</p>
              <p className="text-sm">Start een test om de bot accuraatheid te meten</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vragen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kosten
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actie
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {testRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(run.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(run.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {run.overall_score !== null ? (
                        <span className={`text-lg font-bold ${getScoreColor(run.overall_score)}`}>
                          {run.overall_score.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {run.questions_completed} / {run.total_questions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatCost(run.total_cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {run.duration_seconds ? `${Math.ceil(run.duration_seconds / 60)} min` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/test/${tenantId}/${run.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Bekijk
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
