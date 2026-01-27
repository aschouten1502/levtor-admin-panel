'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import type { QATestRun, QATestQuestion, QACategory, CATEGORY_INFO } from '@/lib/products/hr-bot/qa/types';

interface PageProps {
  params: Promise<{ tenantId: string; runId: string }>;
}

// Category info for display
const CATEGORY_LABELS: Record<QACategory, { label: string; icon: string }> = {
  retrieval: { label: 'Retrieval', icon: '🔍' },
  accuracy: { label: 'Accuraatheid', icon: '✓' },
  citation: { label: 'Bronverwijzing', icon: '📎' },
  hallucination: { label: 'Hallucinatie', icon: '👻' },
  out_of_scope: { label: 'Out-of-scope', icon: '🚫' },
  no_answer: { label: 'Geen antwoord', icon: '❓' },
  consistency: { label: 'Consistentie', icon: '🔄' },
  multilingual: { label: 'Meertalig', icon: '🌐' }
};

/**
 * Test Results Page
 *
 * Shows detailed results for a completed test run.
 * Includes progress for running tests.
 */
export default function TestResultsPage({ params }: PageProps) {
  const { tenantId, runId } = use(params);

  const [testRun, setTestRun] = useState<QATestRun | null>(null);
  const [questions, setQuestions] = useState<QATestQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/admin/products/hr-bot/test/${tenantId}/${runId}?include_questions=true`);
        if (!res.ok) throw new Error('Failed to fetch test results');
        const data = await res.json();
        setTestRun(data.test_run);
        setQuestions(data.questions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    // Poll for progress if running
    const interval = setInterval(async () => {
      if (testRun && ['pending', 'generating', 'running', 'evaluating'].includes(testRun.status)) {
        try {
          const res = await fetch(`/api/admin/products/hr-bot/test/${tenantId}/${runId}/progress`);
          if (res.ok) {
            const progress = await res.json();
            setTestRun(prev => prev ? { ...prev, ...progress } : prev);

            // If completed, fetch full data
            if (progress.status === 'completed' || progress.status === 'failed') {
              fetchData();
            }
          }
        } catch (err) {
          console.error('Failed to fetch progress:', err);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [tenantId, runId, testRun?.status]);

  // Format helpers
  const formatCost = (cost: number | null | undefined) => {
    if (!cost) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    return `$${cost.toFixed(4)}`;
  };

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

  // Filter questions by category
  const filteredQuestions = selectedCategory
    ? questions.filter(q => q.category === selectedCategory)
    : questions;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="h-32 bg-gray-200 rounded mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !testRun) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-red-800 font-semibold">Error</h2>
            <p className="text-red-600">{error || 'Test not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Running state
  const isRunning = ['pending', 'generating', 'running', 'evaluating'].includes(testRun.status);
  const progressPercent = testRun.total_questions > 0
    ? Math.round((testRun.questions_completed / testRun.total_questions) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
          <Link href="/admin" className="hover:text-gray-700">Admin</Link>
          <span>/</span>
          <Link href="/admin/products/hr-bot/test" className="hover:text-gray-700">QA Testing</Link>
          <span>/</span>
          <Link href={`/admin/products/hr-bot/test/${tenantId}`} className="hover:text-gray-700">{tenantId}</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Resultaten</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Test Resultaten</h1>
            <p className="text-gray-600">
              {new Date(testRun.created_at).toLocaleDateString('nl-NL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Export buttons - only show when completed */}
            {testRun.status === 'completed' && (
              <>
                <a
                  href={`/api/admin/products/hr-bot/test/${tenantId}/${runId}/pdf?format=pdf`}
                  download
                  className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF
                </a>
                <a
                  href={`/api/admin/products/hr-bot/test/${tenantId}/${runId}/pdf?format=csv`}
                  download
                  className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  CSV
                </a>
              </>
            )}
            <Link
              href={`/admin/products/hr-bot/test/${tenantId}`}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Terug
            </Link>
          </div>
        </div>

        {/* Running Progress */}
        {isRunning && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Test Loopt...</h2>
                <p className="text-sm text-gray-500">
                  Fase: {testRun.current_phase === 'generating' ? 'Vragen genereren' :
                         testRun.current_phase === 'executing' ? 'Vragen uitvoeren' :
                         testRun.current_phase === 'evaluating' ? 'Antwoorden evalueren' :
                         'Wachten'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{progressPercent}%</div>
                <div className="text-sm text-gray-500">
                  {testRun.questions_completed} / {testRun.total_questions} vragen
                </div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Failed State */}
        {testRun.status === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <h2 className="text-red-800 font-semibold">Test Mislukt</h2>
            <p className="text-red-600">{testRun.error_message || 'Unknown error'}</p>
          </div>
        )}

        {/* Completed Results */}
        {testRun.status === 'completed' && (
          <>
            {/* Overall Score */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="col-span-1 text-center">
                  <div className="text-sm text-gray-500 mb-2">Overall Score</div>
                  <div className={`text-5xl font-bold ${getScoreColor(testRun.overall_score)}`}>
                    {testRun.overall_score?.toFixed(1)}%
                  </div>
                </div>
                <div className="col-span-3 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Totaal Vragen</div>
                    <div className="text-2xl font-bold text-gray-900">{testRun.total_questions}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Totale Kosten</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCost(testRun.total_cost)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Duur</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {testRun.duration_seconds ? `${Math.ceil(testRun.duration_seconds / 60)} min` : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Scores */}
            {testRun.scores_by_category && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Scores per Categorie</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(Object.entries(testRun.scores_by_category) as [QACategory, number][]).map(([cat, score]) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      className={`p-4 rounded-lg text-left transition ${
                        selectedCategory === cat ? 'ring-2 ring-blue-500' : ''
                      } ${getScoreBg(score)}`}
                    >
                      <div className="flex items-center mb-1">
                        <span className="mr-2">{CATEGORY_LABELS[cat]?.icon}</span>
                        <span className="text-sm font-medium text-gray-700">
                          {CATEGORY_LABELS[cat]?.label || cat}
                        </span>
                      </div>
                      <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                        {score.toFixed(1)}%
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {testRun.summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">Sterke Punten</h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    {testRun.summary.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">Verbeterpunten</h3>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {testRun.summary.weaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Aanbevelingen</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {testRun.summary.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}

        {/* Questions List */}
        {questions.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Vragen {selectedCategory && `- ${CATEGORY_LABELS[selectedCategory as QACategory]?.label}`}
              </h2>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Toon alle
                </button>
              )}
            </div>

            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {filteredQuestions.map((question) => (
                <div key={question.id} className="p-4 hover:bg-gray-50">
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedQuestion(
                      expandedQuestion === question.id ? null : question.id
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-lg">{CATEGORY_LABELS[question.category]?.icon}</span>
                        <span className="text-xs text-gray-500 uppercase">
                          {CATEGORY_LABELS[question.category]?.label}
                        </span>
                        {question.passed !== null && (
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            question.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {question.passed ? 'Passed' : 'Failed'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 truncate">{question.question}</p>
                    </div>
                    <div className="ml-4 flex items-center space-x-4">
                      {question.score !== null && (
                        <span className={`text-lg font-bold ${getScoreColor(question.score)}`}>
                          {question.score.toFixed(0)}
                        </span>
                      )}
                      <span className="text-gray-400">
                        {expandedQuestion === question.id ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedQuestion === question.id && (
                    <div className="mt-4 pl-8 space-y-4">
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase mb-1">Vraag</div>
                        <p className="text-sm text-gray-900">{question.question}</p>
                      </div>

                      {question.expected_answer && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase mb-1">Verwacht Antwoord</div>
                          <p className="text-sm text-gray-700">{question.expected_answer}</p>
                        </div>
                      )}

                      {question.actual_answer && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase mb-1">Bot Antwoord</div>
                          <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                            {question.actual_answer.substring(0, 500)}
                            {question.actual_answer.length > 500 && '...'}
                          </p>
                        </div>
                      )}

                      {question.evaluation && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase mb-1">Evaluatie</div>
                          <p className="text-sm text-gray-700">{question.evaluation.reasoning}</p>
                          {question.evaluation.issues && question.evaluation.issues.length > 0 && (
                            <ul className="mt-2 text-xs text-red-600">
                              {question.evaluation.issues.map((issue, i) => (
                                <li key={i}>• {issue}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {question.source_document && (
                        <div className="text-xs text-gray-500">
                          Bron: {question.source_document}
                          {question.source_page && ` (p. ${question.source_page})`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
