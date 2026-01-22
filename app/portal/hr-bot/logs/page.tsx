'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCustomer } from '../../components/PortalAuthGuard';

/**
 * ========================================
 * HR BOT CHAT LOGS PAGE
 * ========================================
 *
 * Bekijk chat logs voor de HR Bot.
 * Klant kan alleen bekijken, niet aanpassen.
 */

interface ChatLog {
  id: string;
  question: string;
  answer: string;
  language: string;
  total_cost: number;
  response_time_ms: number;
  created_at: string;
}

export default function HrBotLogsPage() {
  const { customer } = useCustomer();
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!customer?.tenant_id) return;

    try {
      const response = await fetch(`/api/portal/hr-bot/logs`);

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Kon chat logs niet laden');
    } finally {
      setIsLoading(false);
    }
  }, [customer?.tenant_id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chat Logs</h1>
        <p className="text-gray-500 mt-1">
          Bekijk alle gesprekken met de HR Bot
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Logs List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Recente gesprekken ({logs.length})
          </h2>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p>Nog geen chat gesprekken</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {logs.map((log) => (
              <div key={log.id} className="px-6 py-4">
                {/* Log Header */}
                <button
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {truncateText(log.question, 80)}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>{formatDate(log.created_at)}</span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                          {log.language?.toUpperCase() || 'NL'}
                        </span>
                        <span>{log.response_time_ms}ms</span>
                        <span>€{log.total_cost?.toFixed(4) || '0.0000'}</span>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedLog === log.id ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedLog === log.id && (
                  <div className="mt-4 space-y-4">
                    {/* Question */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Vraag
                      </p>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-gray-800 whitespace-pre-wrap">{log.question}</p>
                      </div>
                    </div>

                    {/* Answer */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Antwoord
                      </p>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-800 whitespace-pre-wrap">{log.answer}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
