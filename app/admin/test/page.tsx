'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { TenantTestOverview } from '@/lib/admin/qa-types';

/**
 * QA Test Overview Page
 *
 * Shows all tenants with their latest test scores.
 * Allows navigation to tenant-specific test pages.
 */
export default function QATestPage() {
  const [tenants, setTenants] = useState<TenantTestOverview[]>([]);
  const [stats, setStats] = useState<{
    total_tests: number;
    total_cost: number;
    avg_score: number | null;
    tests_this_week: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch both in parallel
        const [tenantsRes, statsRes] = await Promise.all([
          fetch('/api/admin/test'),
          fetch('/api/admin/test?summary=true')
        ]);

        if (!tenantsRes.ok) throw new Error('Failed to fetch tenants');
        if (!statsRes.ok) throw new Error('Failed to fetch stats');

        const tenantsData = await tenantsRes.json();
        const statsData = await statsRes.json();

        setTenants(tenantsData.tenants || []);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Format cost
  const formatCost = (cost: number | undefined | null) => {
    if (cost === undefined || cost === null || cost === 0) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    return `$${cost.toFixed(4)}`;
  };

  // Format score with color
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number | null) => {
    if (score === null) return 'bg-gray-100';
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  // Format date
  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-red-800 font-semibold">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">QA Testing</h1>
            <p className="text-gray-600">Test bot accuraatheid per tenant</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Terug naar Admin
          </Link>
        </div>

        {/* Global Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Totaal Tests</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total_tests}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Gemiddelde Score</div>
              <div className={`text-2xl font-bold ${getScoreColor(stats.avg_score)}`}>
                {stats.avg_score !== null ? `${stats.avg_score.toFixed(1)}%` : '-'}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Tests Deze Week</div>
              <div className="text-2xl font-bold text-blue-600">{stats.tests_this_week}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Totale Test Kosten</div>
              <div className="text-2xl font-bold text-gray-900">{formatCost(stats.total_cost)}</div>
            </div>
          </div>
        )}

        {/* Tenants Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Tenants</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Laatste Test
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Laatste Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gem. Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test Kosten
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actie
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Geen tenants gevonden
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.tenant_id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${tenant.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{tenant.tenant_name}</div>
                          <div className="text-xs text-gray-500">{tenant.tenant_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(tenant.last_test_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tenant.last_score !== null ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getScoreBg(tenant.last_score)} ${getScoreColor(tenant.last_score)}`}>
                          {tenant.last_score.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tenant.avg_score !== null ? (
                        <span className={`text-sm ${getScoreColor(tenant.avg_score)}`}>
                          {tenant.avg_score.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tenant.test_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatCost(tenant.total_test_cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/test/${tenant.tenant_id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md text-sm font-medium transition"
                      >
                        Test
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Over QA Testing</h3>
          <p className="text-sm text-blue-700">
            QA Tests evalueren de bot op 8 categorieen: Retrieval, Accuraatheid, Bronverwijzing,
            Hallucinatie, Out-of-scope weigering, &quot;Weet niet&quot; antwoorden, Consistentie en Meertaligheid.
            Elke test genereert minimaal 60 vragen op basis van de geuploade documenten.
          </p>
        </div>
      </div>
    </div>
  );
}
