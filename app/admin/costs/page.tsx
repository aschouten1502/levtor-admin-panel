'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { TenantCostSummary, TenantCostDetails } from '@/lib/admin/cost-service';

/**
 * Admin Costs Page
 *
 * Toont alle kosten per tenant:
 * - Document processing kosten (chunking, embedding, metadata)
 * - Chat kosten (embedding, reranking, translation, openai)
 * - Totale kosten en gemiddeldes
 */
export default function CostsPage() {
  const [costs, setCosts] = useState<TenantCostSummary[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [tenantDetails, setTenantDetails] = useState<TenantCostDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all tenant costs
  useEffect(() => {
    async function fetchCosts() {
      try {
        const res = await fetch('/api/admin/costs');
        if (!res.ok) throw new Error('Failed to fetch costs');
        const data = await res.json();
        setCosts(data.costs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchCosts();
  }, []);

  // Fetch tenant details when selected
  useEffect(() => {
    if (!selectedTenant) {
      setTenantDetails(null);
      return;
    }

    async function fetchDetails() {
      setDetailsLoading(true);
      try {
        const res = await fetch(`/api/admin/costs?tenant_id=${selectedTenant}`);
        if (!res.ok) throw new Error('Failed to fetch tenant details');
        const data = await res.json();
        setTenantDetails(data);
      } catch (err) {
        console.error('Failed to fetch details:', err);
      } finally {
        setDetailsLoading(false);
      }
    }
    fetchDetails();
  }, [selectedTenant]);

  // Format currency (null-safe)
  const formatCost = (cost: number | undefined | null) => {
    if (cost === undefined || cost === null) return '$0.00';
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    return `$${cost.toFixed(4)}`;
  };

  // Calculate totals
  const totalCost = costs.reduce((sum, t) => sum + t.total_cost, 0);
  const totalDocCost = costs.reduce((sum, t) => sum + t.doc_costs.total, 0);
  const totalChatCost = costs.reduce((sum, t) => sum + t.chat_costs.total, 0);
  const totalQACost = costs.reduce((sum, t) => sum + (t.qa_costs?.total || 0), 0);
  const totalBrandingCost = costs.reduce((sum, t) => sum + (t.branding_costs?.total || 0), 0);
  const totalDocs = costs.reduce((sum, t) => sum + t.document_count, 0);
  const totalChats = costs.reduce((sum, t) => sum + t.chat_count, 0);
  const totalQATests = costs.reduce((sum, t) => sum + (t.qa_test_count || 0), 0);
  const totalBranding = costs.reduce((sum, t) => sum + (t.branding_count || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
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
            <h1 className="text-2xl font-bold text-gray-900">Tenant Costs Overview</h1>
            <p className="text-gray-600">Alle kosten per tenant (documents + chats)</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Terug naar Admin
          </Link>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Totale Kosten</div>
            <div className="text-2xl font-bold text-gray-900">{formatCost(totalCost)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Document Kosten</div>
            <div className="text-2xl font-bold text-blue-600">{formatCost(totalDocCost)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Chat Kosten</div>
            <div className="text-2xl font-bold text-green-600">{formatCost(totalChatCost)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">QA Test Kosten</div>
            <div className="text-2xl font-bold text-purple-600">{formatCost(totalQACost)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Branding Kosten</div>
            <div className="text-2xl font-bold text-pink-600">{formatCost(totalBrandingCost)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Documenten</div>
            <div className="text-2xl font-bold text-gray-900">{totalDocs}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Chats</div>
            <div className="text-2xl font-bold text-gray-900">{totalChats}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">QA Tests</div>
            <div className="text-2xl font-bold text-gray-900">{totalQATests}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Branding Ops</div>
            <div className="text-2xl font-bold text-gray-900">{totalBranding}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tenant List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Docs
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chats
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      QA
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doc Cost
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chat Cost
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      QA Cost
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {costs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                        Geen tenants gevonden
                      </td>
                    </tr>
                  ) : (
                    costs.map((tenant) => (
                      <tr
                        key={tenant.tenant_id}
                        onClick={() => setSelectedTenant(tenant.tenant_id)}
                        className={`cursor-pointer hover:bg-gray-50 transition ${
                          selectedTenant === tenant.tenant_id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${tenant.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{tenant.tenant_name}</div>
                              <div className="text-xs text-gray-500">{tenant.tenant_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{tenant.document_count}</div>
                          <div className="text-xs text-gray-500">{tenant.total_pages} pag</div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tenant.chat_count}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{tenant.qa_test_count || 0}</div>
                          {tenant.qa_latest_score !== null && (
                            <div className={`text-xs font-medium ${
                              (tenant.qa_latest_score || 0) >= 80 ? 'text-green-600' :
                              (tenant.qa_latest_score || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {tenant.qa_latest_score?.toFixed(0)}%
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm text-blue-600 font-medium">{formatCost(tenant.doc_costs.total)}</div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm text-green-600 font-medium">{formatCost(tenant.chat_costs.total)}</div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm text-purple-600 font-medium">{formatCost(tenant.qa_costs?.total || 0)}</div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{formatCost(tenant.total_cost)}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedTenant && (
              <div className="bg-white rounded-lg shadow p-6 sticky top-8">
                {detailsLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                  </div>
                ) : tenantDetails ? (
                  <>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">
                      {tenantDetails.tenant_name}
                    </h2>

                    {/* Document Costs */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <span className="mr-2">📄</span> Document Processing
                      </h3>
                      <div className="bg-blue-50 rounded-lg p-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Documents:</span>
                          <span className="font-medium">{tenantDetails.documents.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pages:</span>
                          <span className="font-medium">{tenantDetails.documents.total_pages}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Chunks:</span>
                          <span className="font-medium">{tenantDetails.documents.total_chunks}</span>
                        </div>
                        <hr className="my-2 border-blue-200" />
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Chunking:</span>
                          <span>{formatCost(tenantDetails.documents.costs.chunking)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Embeddings:</span>
                          <span>{formatCost(tenantDetails.documents.costs.embedding)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Metadata:</span>
                          <span>{formatCost(tenantDetails.documents.costs.metadata)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-blue-700 pt-1">
                          <span>Total:</span>
                          <span>{formatCost(tenantDetails.documents.costs.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Chat Costs */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <span className="mr-2">💬</span> Chat Operations
                      </h3>
                      <div className="bg-green-50 rounded-lg p-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Chats:</span>
                          <span className="font-medium">{tenantDetails.chats.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Response:</span>
                          <span className="font-medium">{Math.round(tenantDetails.chats.avg_response_time_ms || 0)}ms</span>
                        </div>
                        <hr className="my-2 border-green-200" />
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Embedding:</span>
                          <span>{formatCost(tenantDetails.chats.costs.embedding)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Reranking:</span>
                          <span>{formatCost(tenantDetails.chats.costs.reranking)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Translation:</span>
                          <span>{formatCost(tenantDetails.chats.costs.translation)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">OpenAI:</span>
                          <span>{formatCost(tenantDetails.chats.costs.openai)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-green-700 pt-1">
                          <span>Total:</span>
                          <span>{formatCost(tenantDetails.chats.costs.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* QA Tests Costs */}
                    {tenantDetails.qa_tests && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                          <span className="mr-2">🧪</span> QA Testing
                        </h3>
                        <div className="bg-purple-50 rounded-lg p-3 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Tests:</span>
                            <span className="font-medium">{tenantDetails.qa_tests.count}</span>
                          </div>
                          {tenantDetails.qa_tests.latest_score !== null && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Latest Score:</span>
                              <span className={`font-medium ${
                                (tenantDetails.qa_tests.latest_score || 0) >= 80 ? 'text-green-600' :
                                (tenantDetails.qa_tests.latest_score || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {tenantDetails.qa_tests.latest_score?.toFixed(1)}%
                              </span>
                            </div>
                          )}
                          <hr className="my-2 border-purple-200" />
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Generation:</span>
                            <span>{formatCost(tenantDetails.qa_tests.costs.generation)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Execution:</span>
                            <span>{formatCost(tenantDetails.qa_tests.costs.execution)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Evaluation:</span>
                            <span>{formatCost(tenantDetails.qa_tests.costs.evaluation)}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-purple-700 pt-1">
                            <span>Total:</span>
                            <span>{formatCost(tenantDetails.qa_tests.costs.total)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Branding Costs */}
                    {tenantDetails.branding && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                          <span className="mr-2">🎨</span> Branding
                        </h3>
                        <div className="bg-pink-50 rounded-lg p-3 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Extractions:</span>
                            <span className="font-medium">{tenantDetails.branding.count}</span>
                          </div>
                          <hr className="my-2 border-pink-200" />
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Fun Facts:</span>
                            <span>{formatCost(tenantDetails.branding.costs.fun_facts)}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-pink-700 pt-1">
                            <span>Total:</span>
                            <span>{formatCost(tenantDetails.branding.costs.total)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Total */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900">Total Cost:</span>
                        <span className="text-xl font-bold text-gray-900">{formatCost(tenantDetails.total_cost)}</span>
                      </div>
                    </div>

                    {/* Recent Documents */}
                    {(() => {
                      // Support both DB function format (recent_documents) and fallback format (documents)
                      const docs = (tenantDetails.documents as any).recent_documents || tenantDetails.documents.documents || [];
                      return docs.length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Documents</h3>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {docs.slice(0, 5).map((doc: any, idx: number) => (
                              <div key={idx} className="bg-gray-50 rounded p-2 text-xs">
                                <div className="font-medium text-gray-900 truncate">{doc.filename}</div>
                                <div className="flex justify-between text-gray-500">
                                  <span>{doc.pages || 0} pag, {doc.chunks || 0} chunks</span>
                                  <span>{formatCost(doc.cost ?? doc.costs?.total)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    Selecteer een tenant om details te zien
                  </div>
                )}
              </div>
            )}

            {!selectedTenant && (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                <div className="text-4xl mb-2">👈</div>
                <p>Klik op een tenant voor gedetailleerde kosten</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
