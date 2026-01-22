'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChatLog,
  DocumentProcessingLog,
  LogsStats,
  hasRagDetails
} from '@/lib/admin/logs-service';

/**
 * Tenant Logs Page
 * Shows chat logs and document processing logs in tabs
 */

// RAG Details types for the modal
interface RawSearchResult {
  filename: string;
  similarity: number;
  pageNumber?: number;
  chunkId?: string;
  content?: string;
  sectionTitle?: string;
}

interface RerankingResult {
  filename: string;
  beforeScore: number;
  afterScore: number;
  positionBefore: number;
  positionAfter: number;
  pageNumber?: number;
}

interface TimingPhase {
  label: string;
  ms: number;
  color: string;
}

type TabType = 'chat' | 'documents';

export default function TenantLogsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  // State
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [documentLogs, setDocumentLogs] = useState<DocumentProcessingLog[]>([]);
  const [stats, setStats] = useState<LogsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [chatPage, setChatPage] = useState(1);
  const [chatTotal, setChatTotal] = useState(0);
  const [docPage, setDocPage] = useState(1);
  const [docTotal, setDocTotal] = useState(0);
  const pageSize = 25;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterHasError, setFilterHasError] = useState(false);

  // Selected log for modal
  const [selectedLog, setSelectedLog] = useState<ChatLog | null>(null);

  // Fetch data on mount and when filters change
  useEffect(() => {
    if (activeTab === 'chat') {
      fetchChatLogs();
    } else {
      fetchDocumentLogs();
    }
  }, [tenantId, activeTab, chatPage, docPage]);

  // Fetch stats once
  useEffect(() => {
    fetchStats();
  }, [tenantId]);

  const fetchChatLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: chatPage.toString(),
        pageSize: pageSize.toString()
      });
      if (searchQuery) params.set('search', searchQuery);
      if (filterLanguage) params.set('language', filterLanguage);
      if (filterHasError) params.set('hasError', 'true');

      const response = await fetch(`/api/admin/products/hr-bot/logs/${tenantId}?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch logs');
      }

      setChatLogs(data.logs || []);
      setChatTotal(data.total || 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: docPage.toString(),
        pageSize: pageSize.toString(),
        type: 'documents'
      });

      const response = await fetch(`/api/admin/products/hr-bot/logs/${tenantId}?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch document logs');
      }

      setDocumentLogs(data.logs || []);
      setDocTotal(data.total || 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/admin/products/hr-bot/logs/${tenantId}/stats`);
      const data = await response.json();

      if (response.ok) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleSearch = () => {
    setChatPage(1);
    fetchChatLogs();
  };

  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800',
      pending: 'bg-gray-100 text-gray-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const hasRagDetails = (log: ChatLog) => {
    return log.rag_details && Object.keys(log.rag_details).length > 0;
  };

  const totalChatPages = Math.ceil(chatTotal / pageSize);
  const totalDocPages = Math.ceil(docTotal / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products/hr-bot/logs"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Logs: {tenantId}</h1>
            <p className="text-gray-500 mt-1">Chat en document processing logs</p>
          </div>
        </div>
        <button
          onClick={() => activeTab === 'chat' ? fetchChatLogs() : fetchDocumentLogs()}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Logs</p>
            <p className="text-xl font-bold text-gray-900">{stats.totalLogs.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Complete</p>
            <p className="text-xl font-bold text-green-600">{stats.completedLogs.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Errors</p>
            <p className="text-xl font-bold text-red-600">{stats.errorLogs}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Kosten</p>
            <p className="text-xl font-bold text-gray-900">{formatCost(stats.totalCost)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Gem. Response</p>
            <p className="text-xl font-bold text-gray-900">{formatResponseTime(stats.avgResponseTimeMs)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Gem. Kost</p>
            <p className="text-xl font-bold text-gray-900">{formatCost(stats.avgCost)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Positief</p>
            <p className="text-xl font-bold text-green-600">{stats.positiveFeedback}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Negatief</p>
            <p className="text-xl font-bold text-red-600">{stats.negativeFeedback}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'chat'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Chat Logs ({chatTotal})
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Document Uploads ({docTotal})
            </button>
          </nav>
        </div>

        {/* Chat Logs Tab */}
        {activeTab === 'chat' && (
          <div>
            {/* Filters */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Zoek in vraag of antwoord..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterLanguage}
                  onChange={(e) => {
                    setFilterLanguage(e.target.value);
                    setChatPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Alle talen</option>
                  <option value="nl">Nederlands</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                  <option value="fr">Français</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={filterHasError}
                    onChange={(e) => {
                      setFilterHasError(e.target.checked);
                      setChatPage(1);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Alleen errors
                </label>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Zoeken
                </button>
              </div>
            </div>

            {/* Logs Table */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-3 text-gray-500">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading...
                </div>
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-600">{error}</div>
            ) : chatLogs.length === 0 ? (
              <div className="p-12 text-center text-gray-500">Geen logs gevonden</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Timestamp</th>
                      <th className="px-4 py-3 text-left">Vraag</th>
                      <th className="px-4 py-3 text-center">Taal</th>
                      <th className="px-4 py-3 text-right">Response</th>
                      <th className="px-4 py-3 text-right">Kosten</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Feedback</th>
                      <th className="px-4 py-3 text-center">RAG</th>
                      <th className="px-4 py-3 text-center">Acties</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {chatLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-sm text-gray-900 truncate" title={log.question}>
                            {log.question}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-medium text-gray-600 uppercase">
                            {log.language || 'nl'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {log.response_time_ms ? formatResponseTime(log.response_time_ms) : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {log.total_cost ? formatCost(log.total_cost) : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {log.completion_error ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Error
                            </span>
                          ) : log.blocked ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Blocked
                            </span>
                          ) : log.is_complete ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {log.feedback === 'positive' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700" title={log.feedback_comment || 'Positief'}>
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                            </span>
                          ) : log.feedback === 'negative' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700" title={log.feedback_comment || 'Negatief'}>
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                              </svg>
                              {log.feedback_comment && <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {hasRagDetails(log) ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Details
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Bekijk
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalChatPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {((chatPage - 1) * pageSize) + 1} - {Math.min(chatPage * pageSize, chatTotal)} van {chatTotal}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChatPage(p => Math.max(1, p - 1))}
                    disabled={chatPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Vorige
                  </button>
                  <span className="text-sm text-gray-600">
                    Pagina {chatPage} van {totalChatPages}
                  </span>
                  <button
                    onClick={() => setChatPage(p => Math.min(totalChatPages, p + 1))}
                    disabled={chatPage === totalChatPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Volgende
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Document Uploads Tab */}
        {activeTab === 'documents' && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-3 text-gray-500">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading...
                </div>
              </div>
            ) : documentLogs.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p>Geen document processing logs gevonden</p>
                <p className="text-sm text-gray-400 mt-1">Upload documenten om hier logs te zien</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Datum</th>
                      <th className="px-4 py-3 text-left">Bestand</th>
                      <th className="px-4 py-3 text-right">Grootte</th>
                      <th className="px-4 py-3 text-center">Methode</th>
                      <th className="px-4 py-3 text-right">Pagina's</th>
                      <th className="px-4 py-3 text-right">Chunks</th>
                      <th className="px-4 py-3 text-right">Structuren</th>
                      <th className="px-4 py-3 text-right">Kosten</th>
                      <th className="px-4 py-3 text-right">Duur</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {documentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(log.created_at || log.started_at || '')}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-sm text-gray-900 truncate" title={log.filename}>
                            {log.filename}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-sm text-gray-500">
                          {formatFileSize(log.file_size_bytes)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            log.chunking_method === 'smart' ? 'bg-purple-100 text-purple-800' :
                            log.chunking_method === 'semantic' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.chunking_method || 'legacy'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-sm text-gray-900">
                          {log.total_pages !== null && log.total_pages !== undefined ? log.total_pages : '-'}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-sm text-gray-900">
                          {log.chunks_created !== null && log.chunks_created !== undefined ? log.chunks_created : '-'}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-sm text-gray-900">
                          {log.structures_detected !== null && log.structures_detected !== undefined ? log.structures_detected : '-'}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-sm text-gray-900">
                          {log.total_cost ? formatCost(log.total_cost) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-sm text-gray-900">
                          {log.total_duration_ms ? formatResponseTime(log.total_duration_ms) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(log.processing_status)}`}>
                            {log.processing_status}
                          </span>
                          {log.error_message && (
                            <p className="text-xs text-red-600 mt-1 max-w-[150px] truncate" title={log.error_message}>
                              {log.error_message}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalDocPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {((docPage - 1) * pageSize) + 1} - {Math.min(docPage * pageSize, docTotal)} van {docTotal}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDocPage(p => Math.max(1, p - 1))}
                    disabled={docPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Vorige
                  </button>
                  <span className="text-sm text-gray-600">
                    Pagina {docPage} van {totalDocPages}
                  </span>
                  <button
                    onClick={() => setDocPage(p => Math.min(totalDocPages, p + 1))}
                    disabled={docPage === totalDocPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Volgende
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <LogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}

// ========================================
// LOG DETAIL MODAL COMPONENT
// ========================================

interface LogDetailModalProps {
  log: ChatLog;
  onClose: () => void;
}

type ModalTab = 'overview' | 'query' | 'search' | 'reranking' | 'openai' | 'timing' | 'raw';

function LogDetailModal({ log, onClose }: LogDetailModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('overview');
  const ragDetails = log.rag_details;

  const formatCost = (cost: number) => `$${cost.toFixed(6)}`;
  const formatTime = (ms: number) => `${Math.round(ms)}ms`;

  const tabs: { id: ModalTab; label: string; available: boolean }[] = [
    { id: 'overview', label: 'Overzicht', available: true },
    { id: 'query', label: 'Query Expansion', available: !!ragDetails?.query },
    { id: 'search', label: 'Search Results', available: !!ragDetails?.search },
    { id: 'reranking', label: 'Reranking', available: !!ragDetails?.reranking },
    { id: 'openai', label: 'OpenAI', available: !!ragDetails?.openai },
    { id: 'timing', label: 'Timing', available: !!ragDetails?.timing },
    { id: 'raw', label: 'Raw JSON', available: true },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Log Detail</h2>
            <p className="text-sm text-gray-500">{log.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.filter(t => t.available).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Timestamp</p>
                  <p className="font-medium text-gray-900">{new Date(log.created_at).toLocaleString('nl-NL')}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Language</p>
                  <p className="font-medium text-gray-900 uppercase">{log.language || 'nl'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Response Time</p>
                  <p className="font-medium text-gray-900">{log.response_time_ms ? `${log.response_time_ms}ms` : '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Total Cost</p>
                  <p className="font-medium text-gray-900">{log.total_cost ? formatCost(log.total_cost) : '-'}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Vraag</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-900">{log.question}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Antwoord</h3>
                <div className="bg-green-50 rounded-lg p-4 max-h-64 overflow-auto">
                  <p className="text-gray-900 whitespace-pre-wrap">{log.answer}</p>
                </div>
              </div>

              {log.completion_error && (
                <div>
                  <h3 className="text-sm font-medium text-red-700 mb-2">Error</h3>
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-red-900">{log.completion_error}</p>
                  </div>
                </div>
              )}

              {/* Feedback Section */}
              {log.feedback && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Gebruiker Feedback</h3>
                  <div className={`rounded-lg p-4 ${log.feedback === 'positive' ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      {log.feedback === 'positive' ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                          Positief
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                          </svg>
                          Negatief
                        </span>
                      )}
                      {log.feedback_timestamp && (
                        <span className="text-xs text-gray-500">
                          {new Date(log.feedback_timestamp).toLocaleString('nl-NL')}
                        </span>
                      )}
                    </div>
                    {log.feedback_comment && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Opmerking van gebruiker</p>
                        <p className={`text-sm ${log.feedback === 'positive' ? 'text-green-900' : 'text-red-900'}`}>
                          "{log.feedback_comment}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Query Expansion Tab */}
          {activeTab === 'query' && ragDetails?.query && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Originele Query</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900">{ragDetails.query.original}</p>
                </div>
              </div>

              {ragDetails.query.expanded && ragDetails.query.expanded !== ragDetails.query.original && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Expanded Query</h3>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-gray-900">{ragDetails.query.expanded}</p>
                  </div>
                </div>
              )}

              {ragDetails.query.expansionTerms && ragDetails.query.expansionTerms.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Expansion Terms</h3>
                  <div className="flex flex-wrap gap-2">
                    {ragDetails.query.expansionTerms.map((term: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {ragDetails.query.alternativeQueries && ragDetails.query.alternativeQueries.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Alternative Queries</h3>
                  <ul className="space-y-2">
                    {ragDetails.query.alternativeQueries.map((q: string, i: number) => (
                      <li key={i} className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Search Results Tab */}
          {activeTab === 'search' && ragDetails?.search && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Search Type</p>
                  <p className="font-medium text-gray-900">{ragDetails.search.type}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Vector TopK</p>
                  <p className="font-medium text-gray-900">{ragDetails.search.vectorTopK}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Final TopK</p>
                  <p className="font-medium text-gray-900">{ragDetails.search.finalTopK}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Reranking</p>
                  <p className="font-medium text-gray-900">{ragDetails.search.rerankingEnabled ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>

              {ragDetails.search.mergeStats && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Merge Statistics</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{ragDetails.search.mergeStats.totalBeforeMerge}</p>
                      <p className="text-xs text-blue-600">Before Merge</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{ragDetails.search.mergeStats.duplicatesRemoved}</p>
                      <p className="text-xs text-blue-600">Duplicates Removed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{ragDetails.search.mergeStats.totalAfterMerge}</p>
                      <p className="text-xs text-blue-600">After Merge</p>
                    </div>
                  </div>
                </div>
              )}

              {ragDetails.search.rawResults && ragDetails.search.rawResults.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Raw Search Results ({ragDetails.search.rawResults.length})
                  </h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs text-gray-500">#</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-500">Filename</th>
                          <th className="px-3 py-2 text-right text-xs text-gray-500">Page</th>
                          <th className="px-3 py-2 text-right text-xs text-gray-500">Similarity</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-500">Section</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {ragDetails.search.rawResults.map((result: RawSearchResult, i: number) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                            <td className="px-3 py-2 text-gray-900 max-w-xs truncate">{result.filename}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{result.pageNumber || '-'}</td>
                            <td className="px-3 py-2 text-right">
                              <span className={`font-mono ${result.similarity >= 0.7 ? 'text-green-600' : result.similarity >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {result.similarity.toFixed(3)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{result.sectionTitle || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reranking Tab */}
          {activeTab === 'reranking' && ragDetails?.reranking && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Model</p>
                  <p className="font-medium text-gray-900">{ragDetails.reranking.model || 'rerank-v3.5'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Input Docs</p>
                  <p className="font-medium text-gray-900">{ragDetails.reranking.inputDocuments}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Output Docs</p>
                  <p className="font-medium text-gray-900">{ragDetails.reranking.outputDocuments}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Latency</p>
                  <p className="font-medium text-gray-900">{formatTime(ragDetails.reranking.latencyMs)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Cost</p>
                  <p className="font-medium text-gray-900">{formatCost(ragDetails.reranking.cost)}</p>
                </div>
              </div>

              {ragDetails.reranking.results && ragDetails.reranking.results.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Reranking Results</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs text-gray-500">Filename</th>
                          <th className="px-3 py-2 text-right text-xs text-gray-500">Page</th>
                          <th className="px-3 py-2 text-center text-xs text-gray-500">Pos Before</th>
                          <th className="px-3 py-2 text-center text-xs text-gray-500">Pos After</th>
                          <th className="px-3 py-2 text-center text-xs text-gray-500">Change</th>
                          <th className="px-3 py-2 text-right text-xs text-gray-500">Score Before</th>
                          <th className="px-3 py-2 text-right text-xs text-gray-500">Score After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {ragDetails.reranking.results.map((result: RerankingResult, i: number) => {
                          const posChange = result.positionBefore - result.positionAfter;
                          return (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-900 max-w-xs truncate">{result.filename}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{result.pageNumber || '-'}</td>
                              <td className="px-3 py-2 text-center text-gray-600">{result.positionBefore + 1}</td>
                              <td className="px-3 py-2 text-center font-medium text-gray-900">{result.positionAfter + 1}</td>
                              <td className="px-3 py-2 text-center">
                                {posChange > 0 ? (
                                  <span className="text-green-600 font-medium">+{posChange}</span>
                                ) : posChange < 0 ? (
                                  <span className="text-red-600 font-medium">{posChange}</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-gray-600">{result.beforeScore.toFixed(3)}</td>
                              <td className="px-3 py-2 text-right font-mono text-green-600">{result.afterScore.toFixed(3)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OpenAI Tab */}
          {activeTab === 'openai' && ragDetails?.openai && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Model</p>
                  <p className="font-medium text-gray-900">{ragDetails.openai.model}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Temperature</p>
                  <p className="font-medium text-gray-900">{ragDetails.openai.temperature}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Streaming Duration</p>
                  <p className="font-medium text-gray-900">{ragDetails.openai.streamingDurationMs ? formatTime(ragDetails.openai.streamingDurationMs) : '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Total Tokens</p>
                  <p className="font-medium text-gray-900">{ragDetails.openai.totalTokens?.toLocaleString() || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-blue-600 uppercase">System Prompt Tokens</p>
                  <p className="text-2xl font-bold text-blue-900">{ragDetails.openai.systemPromptTokens?.toLocaleString() || '-'}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-xs text-green-600 uppercase">Input Tokens</p>
                  <p className="text-2xl font-bold text-green-900">{ragDetails.openai.inputTokens?.toLocaleString() || '-'}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-xs text-purple-600 uppercase">Output Tokens</p>
                  <p className="text-2xl font-bold text-purple-900">{ragDetails.openai.outputTokens?.toLocaleString() || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Timing Tab */}
          {activeTab === 'timing' && ragDetails?.timing && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-blue-600 uppercase">Embedding</p>
                  <p className="text-2xl font-bold text-blue-900">{formatTime(ragDetails.timing.embeddingMs)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-green-600 uppercase">Search</p>
                  <p className="text-2xl font-bold text-green-900">{formatTime(ragDetails.timing.searchMs)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-purple-600 uppercase">Reranking</p>
                  <p className="text-2xl font-bold text-purple-900">{formatTime(ragDetails.timing.rerankingMs)}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-amber-600 uppercase">OpenAI</p>
                  <p className="text-2xl font-bold text-amber-900">{formatTime(ragDetails.timing.openaiMs)}</p>
                </div>
                <div className="bg-gray-100 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-600 uppercase">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{formatTime(ragDetails.timing.totalMs)}</p>
                </div>
              </div>

              {/* Timing Waterfall */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Timing Waterfall</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Embedding', ms: ragDetails.timing?.embeddingMs || 0, color: 'bg-blue-500' },
                    { label: 'Search', ms: ragDetails.timing?.searchMs || 0, color: 'bg-green-500' },
                    { label: 'Reranking', ms: ragDetails.timing?.rerankingMs || 0, color: 'bg-purple-500' },
                    { label: 'OpenAI', ms: ragDetails.timing?.openaiMs || 0, color: 'bg-amber-500' },
                  ].map((item: TimingPhase) => {
                    const pct = ragDetails.timing?.totalMs ? (item.ms / ragDetails.timing.totalMs) * 100 : 0;
                    return (
                      <div key={item.label} className="flex items-center gap-4">
                        <span className="text-sm text-gray-600 w-24">{item.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                          <div
                            className={`${item.color} h-full rounded-full flex items-center justify-end pr-2`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          >
                            <span className="text-xs text-white font-medium">
                              {formatTime(item.ms)}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500 w-12 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cost Breakdown */}
              {ragDetails.costs && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Cost Breakdown</h3>
                  <div className="grid grid-cols-5 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{formatCost(ragDetails.costs.embedding)}</p>
                      <p className="text-xs text-gray-500">Embedding</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{formatCost(ragDetails.costs.reranking)}</p>
                      <p className="text-xs text-gray-500">Reranking</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{formatCost(ragDetails.costs?.translation ?? ragDetails.query?.translation?.translationCost ?? 0)}</p>
                      <p className="text-xs text-gray-500">Translation</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{formatCost(ragDetails.costs.openai)}</p>
                      <p className="text-xs text-gray-500">OpenAI</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">{formatCost(ragDetails.costs.total)}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Raw JSON Tab */}
          {activeTab === 'raw' && (
            <div>
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-auto text-xs max-h-[60vh]">
                {JSON.stringify(log, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
