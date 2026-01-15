/**
 * ========================================
 * QA TEST PDF REPORT GENERATOR v2.4
 * ========================================
 *
 * Professional PDF reports for QA test results.
 * Features:
 * - Executive Summary with GO/NO-GO status
 * - Category breakdown with pass/fail analysis
 * - Performance metrics and response time analysis
 * - Complete question list (ALL questions)
 * - Detailed failure analysis
 * - Appendix with test configuration
 *
 * v2.4: Production-ready professional reports
 */

import { jsPDF } from 'jspdf';
import type {
  QATestRun,
  QATestQuestion,
  QACategory,
  QACostBreakdown
} from './qa-types';

// ========================================
// TYPES
// ========================================

export interface PDFReportData {
  testRun: QATestRun;
  questions: QATestQuestion[];
  tenantName: string;
}

interface CategoryStats {
  category: QACategory;
  label: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  avgScore: number;
  avgResponseTime: number;
}

interface PerformanceMetrics {
  fastest: number;
  slowest: number;
  average: number;
  median: number;
  p95: number;
}

interface StatusIndicator {
  status: 'PRODUCTION READY' | 'NEEDS IMPROVEMENT' | 'NOT READY';
  color: string;
  bgColor: string;
  description: string;
}

// ========================================
// CONSTANTS
// ========================================

const COLORS = {
  primary: '#1e40af',
  secondary: '#6b7280',
  success: '#16a34a',
  successBg: '#dcfce7',
  warning: '#ca8a04',
  warningBg: '#fef9c3',
  error: '#dc2626',
  errorBg: '#fef2f2',
  text: '#1f2937',
  textLight: '#4b5563',
  lightGray: '#e5e7eb',
  veryLightGray: '#f9fafb',
  white: '#ffffff',
  black: '#000000'
};

const CATEGORY_LABELS: Record<QACategory, string> = {
  retrieval: 'Retrieval',
  accuracy: 'Accuraatheid',
  citation: 'Bronverwijzing',
  hallucination: 'Hallucinatie Detectie',
  out_of_scope: 'Out-of-scope',
  no_answer: 'Doorverwijzing',
  consistency: 'Consistentie',
  multilingual: 'Meertalig'
};

const CATEGORY_DESCRIPTIONS: Record<QACategory, string> = {
  retrieval: 'Vindt de bot de juiste documenten?',
  accuracy: 'Zijn de antwoorden feitelijk correct?',
  citation: 'Worden bronnen correct genoemd?',
  hallucination: 'Weigert de bot niet-bestaande info te verzinnen?',
  out_of_scope: 'Weigert de bot niet-HR vragen?',
  no_answer: 'Verwijst de bot door bij persoonlijke vragen?',
  consistency: 'Zijn antwoorden consistent bij herhaling?',
  multilingual: 'Werkt de bot in meerdere talen?'
};

// ========================================
// HELPERS
// ========================================

function getScoreColor(score: number): string {
  if (score >= 80) return COLORS.success;
  if (score >= 60) return COLORS.warning;
  return COLORS.error;
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return COLORS.successBg;
  if (score >= 60) return COLORS.warningBg;
  return COLORS.errorBg;
}

function getStatusIndicator(score: number): StatusIndicator {
  if (score >= 80) {
    return {
      status: 'PRODUCTION READY',
      color: COLORS.success,
      bgColor: COLORS.successBg,
      description: 'De bot voldoet aan de kwaliteitseisen voor productie'
    };
  }
  if (score >= 60) {
    return {
      status: 'NEEDS IMPROVEMENT',
      color: COLORS.warning,
      bgColor: COLORS.warningBg,
      description: 'De bot heeft verbeteringen nodig voor productie'
    };
  }
  return {
    status: 'NOT READY',
    color: COLORS.error,
    bgColor: COLORS.errorBg,
    description: 'De bot is niet gereed voor productie'
  };
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatShortDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function calculateCategoryStats(questions: QATestQuestion[]): CategoryStats[] {
  const categories: QACategory[] = [
    'retrieval', 'accuracy', 'citation', 'hallucination',
    'out_of_scope', 'no_answer', 'consistency', 'multilingual'
  ];

  return categories.map(category => {
    const categoryQuestions = questions.filter(q => q.category === category);
    const total = categoryQuestions.length;
    const passed = categoryQuestions.filter(q => q.passed === true).length;
    const failed = categoryQuestions.filter(q => q.passed === false).length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    const scoredQuestions = categoryQuestions.filter(q => q.score !== null);
    const avgScore = scoredQuestions.length > 0
      ? scoredQuestions.reduce((sum, q) => sum + (q.score || 0), 0) / scoredQuestions.length
      : 0;

    const timedQuestions = categoryQuestions.filter(q => q.response_time_ms);
    const avgResponseTime = timedQuestions.length > 0
      ? timedQuestions.reduce((sum, q) => sum + (q.response_time_ms || 0), 0) / timedQuestions.length
      : 0;

    return {
      category,
      label: CATEGORY_LABELS[category],
      total,
      passed,
      failed,
      passRate,
      avgScore,
      avgResponseTime
    };
  }).filter(s => s.total > 0);
}

function calculatePerformanceMetrics(questions: QATestQuestion[]): PerformanceMetrics {
  const times = questions
    .filter(q => q.response_time_ms && q.response_time_ms > 0)
    .map(q => q.response_time_ms as number)
    .sort((a, b) => a - b);

  if (times.length === 0) {
    return { fastest: 0, slowest: 0, average: 0, median: 0, p95: 0 };
  }

  const sum = times.reduce((a, b) => a + b, 0);
  const median = times[Math.floor(times.length / 2)];
  const p95Index = Math.floor(times.length * 0.95);

  return {
    fastest: times[0],
    slowest: times[times.length - 1],
    average: Math.round(sum / times.length),
    median,
    p95: times[p95Index] || times[times.length - 1]
  };
}

// ========================================
// PDF GENERATOR
// ========================================

export function generateQAReport(data: PDFReportData): Buffer {
  const { testRun, questions, tenantName } = data;
  const doc = new jsPDF();

  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);

  // Calculate stats
  const categoryStats = calculateCategoryStats(questions);
  const performanceMetrics = calculatePerformanceMetrics(questions);
  const overallScore = testRun.overall_score || 0;
  const statusIndicator = getStatusIndicator(overallScore);

  // ========================================
  // PAGE 1: EXECUTIVE SUMMARY
  // ========================================

  let y = renderExecutiveSummary(doc, testRun, tenantName, statusIndicator, questions, margin, contentWidth);

  // ========================================
  // PAGE 2: CATEGORY BREAKDOWN
  // ========================================

  doc.addPage();
  y = renderCategoryBreakdown(doc, categoryStats, margin, contentWidth);

  // ========================================
  // PAGE 3: AI SUMMARY
  // ========================================

  if (testRun.summary) {
    doc.addPage();
    y = renderAISummary(doc, testRun, margin, contentWidth);
  }

  // ========================================
  // PAGE 4: PERFORMANCE METRICS
  // ========================================

  doc.addPage();
  y = renderPerformanceMetrics(doc, performanceMetrics, testRun, categoryStats, margin, contentWidth);

  // ========================================
  // PAGES 5+: COMPLETE QUESTION LIST
  // ========================================

  renderAllQuestions(doc, questions, margin, contentWidth, pageHeight);

  // ========================================
  // DETAILED FAILURES
  // ========================================

  const failedQuestions = questions.filter(q => q.passed === false);
  if (failedQuestions.length > 0) {
    renderDetailedFailures(doc, failedQuestions, categoryStats, margin, contentWidth, pageHeight);
  }

  // ========================================
  // APPENDIX
  // ========================================

  renderAppendix(doc, testRun, questions, tenantName, margin, contentWidth);

  // ========================================
  // FOOTER ON ALL PAGES
  // ========================================

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(COLORS.secondary);
    doc.text(
      `Pagina ${i} van ${pageCount} | ${tenantName} | Test ID: ${testRun.id.substring(0, 8)}`,
      margin,
      pageHeight - 10
    );
    doc.text(
      `Gegenereerd: ${new Date().toLocaleDateString('nl-NL')}`,
      pageWidth - margin - 50,
      pageHeight - 10
    );
  }

  return Buffer.from(doc.output('arraybuffer'));
}

// ========================================
// PAGE RENDERERS
// ========================================

function renderExecutiveSummary(
  doc: jsPDF,
  testRun: QATestRun,
  tenantName: string,
  statusIndicator: StatusIndicator,
  questions: QATestQuestion[],
  margin: number,
  contentWidth: number
): number {
  let y = 20;

  // Header
  doc.setFontSize(24);
  doc.setTextColor(COLORS.primary);
  doc.text('QA Test Rapport', margin, y);
  y += 12;

  doc.setFontSize(16);
  doc.setTextColor(COLORS.text);
  doc.text(tenantName, margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(COLORS.secondary);
  doc.text(`Testdatum: ${formatDate(testRun.completed_at)}`, margin, y);
  y += 18;

  // GO/NO-GO Status Box
  doc.setFillColor(statusIndicator.bgColor);
  doc.roundedRect(margin, y, contentWidth, 40, 4, 4, 'F');

  doc.setFontSize(24);
  doc.setTextColor(statusIndicator.color);
  doc.text(statusIndicator.status, margin + 10, y + 18);

  doc.setFontSize(10);
  doc.setTextColor(COLORS.textLight);
  doc.text(statusIndicator.description, margin + 10, y + 30);

  // Overall Score (right side of status box)
  const overallScore = testRun.overall_score || 0;
  doc.setFontSize(36);
  doc.setTextColor(statusIndicator.color);
  doc.text(`${overallScore.toFixed(1)}%`, contentWidth - 30, y + 25);

  y += 50;

  // Key Metrics Grid (2x2)
  const boxWidth = (contentWidth - 10) / 2;
  const boxHeight = 35;

  const passedCount = questions.filter(q => q.passed === true).length;
  const failedCount = questions.filter(q => q.passed === false).length;
  const passRate = questions.length > 0 ? (passedCount / questions.length) * 100 : 0;

  // Box 1: Total Questions
  doc.setFillColor(COLORS.veryLightGray);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.secondary);
  doc.text('Totaal Vragen', margin + 5, y + 10);
  doc.setFontSize(20);
  doc.setTextColor(COLORS.text);
  doc.text(`${testRun.total_questions}`, margin + 5, y + 26);

  // Box 2: Pass Rate
  doc.setFillColor(COLORS.veryLightGray);
  doc.roundedRect(margin + boxWidth + 10, y, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.secondary);
  doc.text('Slaagpercentage', margin + boxWidth + 15, y + 10);
  doc.setFontSize(20);
  doc.setTextColor(getScoreColor(passRate));
  doc.text(`${passRate.toFixed(1)}%`, margin + boxWidth + 15, y + 26);

  y += boxHeight + 5;

  // Box 3: Response Time
  const avgResponseTime = calculatePerformanceMetrics(questions).average;
  doc.setFillColor(COLORS.veryLightGray);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.secondary);
  doc.text('Gem. Response Tijd', margin + 5, y + 10);
  doc.setFontSize(20);
  doc.setTextColor(COLORS.text);
  doc.text(`${avgResponseTime}ms`, margin + 5, y + 26);

  // Box 4: Test Costs
  doc.setFillColor(COLORS.veryLightGray);
  doc.roundedRect(margin + boxWidth + 10, y, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.secondary);
  doc.text('Test Kosten', margin + boxWidth + 15, y + 10);
  doc.setFontSize(20);
  doc.setTextColor(COLORS.text);
  doc.text(formatCost(testRun.total_cost), margin + boxWidth + 15, y + 26);

  y += boxHeight + 15;

  // Quick Stats Row
  doc.setFontSize(11);
  doc.setTextColor(COLORS.text);
  doc.text('Resultaat Overzicht:', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(COLORS.success);
  doc.text(`Geslaagd: ${passedCount}`, margin, y);
  doc.setTextColor(COLORS.error);
  doc.text(`Gefaald: ${failedCount}`, margin + 60, y);
  doc.setTextColor(COLORS.secondary);
  doc.text(`Duur: ${formatDuration(testRun.duration_seconds || 0)}`, margin + 120, y);

  y += 15;

  // Top 3 Findings
  doc.setFontSize(11);
  doc.setTextColor(COLORS.text);
  doc.text('Top 3 Bevindingen:', margin, y);
  y += 8;

  const categoryStats = calculateCategoryStats(questions);
  const sortedByScore = [...categoryStats].sort((a, b) => a.avgScore - b.avgScore);

  doc.setFontSize(9);
  const findings: string[] = [];

  // Find worst categories
  for (const stat of sortedByScore.slice(0, 3)) {
    if (stat.avgScore < 80) {
      const indicator = stat.avgScore >= 70 ? '!' : '!!';
      findings.push(`${indicator} ${stat.label}: ${stat.avgScore.toFixed(0)}% (${stat.failed} gefaald)`);
    }
  }

  // If all good, show positive findings
  if (findings.length === 0) {
    const bestCategories = [...categoryStats].sort((a, b) => b.avgScore - a.avgScore).slice(0, 3);
    for (const stat of bestCategories) {
      findings.push(`+ ${stat.label}: ${stat.avgScore.toFixed(0)}% (uitstekend)`);
    }
  }

  for (const finding of findings) {
    const isNegative = finding.startsWith('!');
    doc.setTextColor(isNegative ? COLORS.error : COLORS.success);
    doc.text(`  ${finding}`, margin, y);
    y += 6;
  }

  return y;
}

function renderCategoryBreakdown(
  doc: jsPDF,
  categoryStats: CategoryStats[],
  margin: number,
  contentWidth: number
): number {
  let y = 20;

  doc.setFontSize(16);
  doc.setTextColor(COLORS.primary);
  doc.text('Categorie Analyse', margin, y);
  y += 15;

  // Table header
  const colWidths = [55, 25, 25, 25, 30, 30];
  const headers = ['Categorie', 'Totaal', 'OK', 'Fout', 'Score', 'Status'];

  doc.setFillColor(COLORS.primary);
  doc.rect(margin, y, contentWidth, 10, 'F');

  doc.setFontSize(9);
  doc.setTextColor(COLORS.white);
  let xPos = margin + 3;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], xPos, y + 7);
    xPos += colWidths[i];
  }
  y += 12;

  // Table rows
  for (const stat of categoryStats) {
    const rowBg = stat.avgScore >= 80 ? '#f0fdf4' : stat.avgScore >= 60 ? '#fefce8' : '#fef2f2';
    doc.setFillColor(rowBg);
    doc.rect(margin, y, contentWidth, 14, 'F');

    doc.setFontSize(9);
    xPos = margin + 3;

    // Category name + description
    doc.setTextColor(COLORS.text);
    doc.text(stat.label, xPos, y + 6);
    doc.setFontSize(7);
    doc.setTextColor(COLORS.secondary);
    doc.text(CATEGORY_DESCRIPTIONS[stat.category] || '', xPos, y + 11);
    xPos += colWidths[0];

    // Numbers
    doc.setFontSize(9);
    doc.setTextColor(COLORS.text);
    doc.text(`${stat.total}`, xPos, y + 8);
    xPos += colWidths[1];

    doc.setTextColor(COLORS.success);
    doc.text(`${stat.passed}`, xPos, y + 8);
    xPos += colWidths[2];

    doc.setTextColor(stat.failed > 0 ? COLORS.error : COLORS.success);
    doc.text(`${stat.failed}`, xPos, y + 8);
    xPos += colWidths[3];

    // Score with bar
    const scoreColor = getScoreColor(stat.avgScore);
    doc.setTextColor(scoreColor);
    doc.text(`${stat.avgScore.toFixed(0)}%`, xPos, y + 8);
    xPos += colWidths[4];

    // Status indicator
    const statusText = stat.avgScore >= 80 ? 'OK' : stat.avgScore >= 60 ? 'LET OP' : 'ACTIE';
    doc.setTextColor(scoreColor);
    doc.text(statusText, xPos, y + 8);

    y += 16;
  }

  y += 10;

  // Visual bars section
  doc.setFontSize(11);
  doc.setTextColor(COLORS.text);
  doc.text('Visuele Score Verdeling', margin, y);
  y += 10;

  const barHeight = 12;
  const barMaxWidth = 100;
  const labelWidth = 60;

  for (const stat of categoryStats) {
    const scoreColor = getScoreColor(stat.avgScore);

    // Label
    doc.setFontSize(9);
    doc.setTextColor(COLORS.text);
    doc.text(stat.label, margin, y + 8);

    // Background bar
    doc.setFillColor(COLORS.lightGray);
    doc.rect(margin + labelWidth, y, barMaxWidth, barHeight, 'F');

    // Score bar
    doc.setFillColor(scoreColor);
    const barWidth = (stat.avgScore / 100) * barMaxWidth;
    doc.rect(margin + labelWidth, y, barWidth, barHeight, 'F');

    // Score text
    doc.setFontSize(9);
    doc.setTextColor(COLORS.text);
    doc.text(`${stat.avgScore.toFixed(0)}%`, margin + labelWidth + barMaxWidth + 5, y + 8);

    // Pass/fail count
    doc.setFontSize(8);
    doc.setTextColor(COLORS.secondary);
    doc.text(`(${stat.passed}/${stat.total})`, margin + labelWidth + barMaxWidth + 25, y + 8);

    y += barHeight + 4;
  }

  return y;
}

function renderAISummary(
  doc: jsPDF,
  testRun: QATestRun,
  margin: number,
  contentWidth: number
): number {
  let y = 20;

  doc.setFontSize(16);
  doc.setTextColor(COLORS.primary);
  doc.text('AI Analyse & Aanbevelingen', margin, y);
  y += 15;

  const summary = testRun.summary;
  if (!summary) return y;

  // Strengths
  if (summary.strengths && summary.strengths.length > 0) {
    doc.setFillColor(COLORS.successBg);
    doc.roundedRect(margin, y, contentWidth, 8 + summary.strengths.length * 8, 3, 3, 'F');

    doc.setFontSize(10);
    doc.setTextColor(COLORS.success);
    doc.text('Sterke Punten', margin + 5, y + 7);
    y += 12;

    doc.setFontSize(9);
    doc.setTextColor(COLORS.text);
    for (const strength of summary.strengths) {
      const lines = doc.splitTextToSize(`+ ${strength}`, contentWidth - 15);
      doc.text(lines, margin + 8, y);
      y += lines.length * 5;
    }
    y += 10;
  }

  // Weaknesses
  if (summary.weaknesses && summary.weaknesses.length > 0) {
    const boxHeight = 8 + summary.weaknesses.length * 8;
    doc.setFillColor(COLORS.warningBg);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'F');

    doc.setFontSize(10);
    doc.setTextColor(COLORS.warning);
    doc.text('Verbeterpunten', margin + 5, y + 7);
    y += 12;

    doc.setFontSize(9);
    doc.setTextColor(COLORS.text);
    for (const weakness of summary.weaknesses) {
      const lines = doc.splitTextToSize(`! ${weakness}`, contentWidth - 15);
      doc.text(lines, margin + 8, y);
      y += lines.length * 5;
    }
    y += 10;
  }

  // Recommendations
  if (summary.recommendations && summary.recommendations.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.primary);
    doc.text('Aanbevelingen:', margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setTextColor(COLORS.text);
    for (let i = 0; i < summary.recommendations.length; i++) {
      const lines = doc.splitTextToSize(`${i + 1}. ${summary.recommendations[i]}`, contentWidth - 10);
      doc.text(lines, margin + 5, y);
      y += lines.length * 5 + 3;
    }
  }

  return y;
}

function renderPerformanceMetrics(
  doc: jsPDF,
  metrics: PerformanceMetrics,
  testRun: QATestRun,
  categoryStats: CategoryStats[],
  margin: number,
  contentWidth: number
): number {
  let y = 20;

  doc.setFontSize(16);
  doc.setTextColor(COLORS.primary);
  doc.text('Performance Metrics', margin, y);
  y += 15;

  // Response Time Box
  doc.setFillColor(COLORS.veryLightGray);
  doc.roundedRect(margin, y, contentWidth, 50, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setTextColor(COLORS.text);
  doc.text('Response Tijd Analyse', margin + 5, y + 10);

  const timeBoxWidth = (contentWidth - 30) / 5;
  const timeLabels = ['Snelste', 'Gemiddeld', 'Mediaan', 'P95', 'Langzaamste'];
  const timeValues = [metrics.fastest, metrics.average, metrics.median, metrics.p95, metrics.slowest];

  for (let i = 0; i < 5; i++) {
    const x = margin + 10 + (i * timeBoxWidth);
    doc.setFontSize(8);
    doc.setTextColor(COLORS.secondary);
    doc.text(timeLabels[i], x, y + 25);
    doc.setFontSize(14);
    doc.setTextColor(COLORS.text);
    doc.text(`${timeValues[i]}ms`, x, y + 38);
  }

  y += 60;

  // Per-category response times
  doc.setFontSize(11);
  doc.setTextColor(COLORS.text);
  doc.text('Response Tijd per Categorie', margin, y);
  y += 10;

  const sortedByTime = [...categoryStats].filter(s => s.avgResponseTime > 0).sort((a, b) => b.avgResponseTime - a.avgResponseTime);

  for (const stat of sortedByTime.slice(0, 8)) {
    doc.setFontSize(9);
    doc.setTextColor(COLORS.text);
    doc.text(stat.label, margin, y + 5);

    // Bar
    const maxTime = sortedByTime[0].avgResponseTime || 1;
    const barWidth = Math.min((stat.avgResponseTime / maxTime) * 80, 80);
    doc.setFillColor(COLORS.primary);
    doc.rect(margin + 60, y, barWidth, 8, 'F');

    doc.text(`${Math.round(stat.avgResponseTime)}ms`, margin + 145, y + 5);
    y += 12;
  }

  y += 10;

  // Cost Breakdown
  doc.setFontSize(11);
  doc.setTextColor(COLORS.text);
  doc.text('Kosten Breakdown', margin, y);
  y += 10;

  const costs = (testRun.cost_breakdown || { generation: 0, execution: 0, evaluation: 0 }) as QACostBreakdown;
  const costItems = [
    { label: 'Vraag Generatie', value: costs.generation || 0 },
    { label: 'Test Uitvoering', value: costs.execution || 0 },
    { label: 'Evaluatie', value: costs.evaluation || 0 }
  ];

  const totalCost = costItems.reduce((sum, item) => sum + item.value, 0);

  for (const item of costItems) {
    doc.setFontSize(9);
    doc.setTextColor(COLORS.text);
    doc.text(item.label, margin, y + 5);

    // Bar
    const barWidth = totalCost > 0 ? (item.value / totalCost) * 80 : 0;
    doc.setFillColor(COLORS.secondary);
    doc.rect(margin + 60, y, barWidth, 8, 'F');

    doc.text(formatCost(item.value), margin + 145, y + 5);
    y += 12;
  }

  doc.setFontSize(10);
  doc.setTextColor(COLORS.text);
  doc.text(`Totaal: ${formatCost(testRun.total_cost)}`, margin + 60, y + 5);

  return y;
}

function renderAllQuestions(
  doc: jsPDF,
  questions: QATestQuestion[],
  margin: number,
  contentWidth: number,
  pageHeight: number
): void {
  doc.addPage();
  let y = 20;

  doc.setFontSize(16);
  doc.setTextColor(COLORS.primary);
  doc.text('Volledige Vragenlijst', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(COLORS.secondary);
  doc.text(`${questions.length} vragen in totaal`, margin, y);
  y += 12;

  // Table header
  const colWidths = [12, 40, 80, 20, 25];
  const headers = ['#', 'Categorie', 'Vraag', 'Score', 'Status'];

  function drawTableHeader() {
    doc.setFillColor(COLORS.primary);
    doc.rect(margin, y, contentWidth, 8, 'F');

    doc.setFontSize(8);
    doc.setTextColor(COLORS.white);
    let xPos = margin + 2;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], xPos, y + 5.5);
      xPos += colWidths[i];
    }
    y += 10;
  }

  drawTableHeader();

  // Table rows
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    // Check if we need a new page
    if (y > pageHeight - 25) {
      doc.addPage();
      y = 20;
      doc.setFontSize(10);
      doc.setTextColor(COLORS.secondary);
      doc.text(`Vragenlijst (vervolg) - ${i + 1}/${questions.length}`, margin, y);
      y += 10;
      drawTableHeader();
    }

    // Row background
    const rowBg = q.passed ? '#f0fdf4' : q.passed === false ? '#fef2f2' : COLORS.veryLightGray;
    doc.setFillColor(rowBg);
    doc.rect(margin, y, contentWidth, 8, 'F');

    doc.setFontSize(7);
    let xPos = margin + 2;

    // Number
    doc.setTextColor(COLORS.secondary);
    doc.text(`${i + 1}`, xPos, y + 5.5);
    xPos += colWidths[0];

    // Category
    doc.setTextColor(COLORS.text);
    doc.text(CATEGORY_LABELS[q.category] || q.category, xPos, y + 5.5);
    xPos += colWidths[1];

    // Question (truncated)
    doc.text(truncate(q.question, 55), xPos, y + 5.5);
    xPos += colWidths[2];

    // Score
    const scoreColor = q.score !== null ? getScoreColor(q.score) : COLORS.secondary;
    doc.setTextColor(scoreColor);
    doc.text(q.score !== null ? `${q.score.toFixed(0)}%` : '-', xPos, y + 5.5);
    xPos += colWidths[3];

    // Status
    const statusText = q.passed === true ? 'OK' : q.passed === false ? 'FOUT' : '?';
    doc.setTextColor(q.passed ? COLORS.success : q.passed === false ? COLORS.error : COLORS.secondary);
    doc.text(statusText, xPos, y + 5.5);

    y += 9;
  }

  // Summary at bottom
  y += 5;
  const passedCount = questions.filter(q => q.passed === true).length;
  const failedCount = questions.filter(q => q.passed === false).length;

  doc.setFontSize(9);
  doc.setTextColor(COLORS.text);
  doc.text(`Samenvatting: `, margin, y);
  doc.setTextColor(COLORS.success);
  doc.text(`${passedCount} geslaagd`, margin + 30, y);
  doc.setTextColor(COLORS.error);
  doc.text(`${failedCount} gefaald`, margin + 65, y);
}

function renderDetailedFailures(
  doc: jsPDF,
  failedQuestions: QATestQuestion[],
  categoryStats: CategoryStats[],
  margin: number,
  contentWidth: number,
  pageHeight: number
): void {
  doc.addPage();
  let y = 20;

  doc.setFontSize(16);
  doc.setTextColor(COLORS.error);
  doc.text('Gedetailleerde Foutanalyse', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(COLORS.secondary);
  doc.text(`${failedQuestions.length} gefaalde vragen`, margin, y);
  y += 15;

  // Group by category
  const groupedByCategory = new Map<QACategory, QATestQuestion[]>();
  for (const q of failedQuestions) {
    if (!groupedByCategory.has(q.category)) {
      groupedByCategory.set(q.category, []);
    }
    groupedByCategory.get(q.category)!.push(q);
  }

  for (const [category, categoryQuestions] of groupedByCategory) {
    // Category header
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(COLORS.errorBg);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(COLORS.error);
    doc.text(`${CATEGORY_LABELS[category]} (${categoryQuestions.length} fouten)`, margin + 5, y + 7);
    y += 15;

    // Questions in this category
    for (const q of categoryQuestions) {
      if (y > pageHeight - 50) {
        doc.addPage();
        y = 20;
      }

      // Question box
      doc.setDrawColor(COLORS.lightGray);
      doc.setLineWidth(0.5);
      doc.rect(margin, y, contentWidth, 40, 'S');

      // Score badge
      doc.setFillColor(getScoreBgColor(q.score || 0));
      doc.rect(margin + contentWidth - 25, y + 2, 23, 8, 'F');
      doc.setFontSize(8);
      doc.setTextColor(getScoreColor(q.score || 0));
      doc.text(`${(q.score || 0).toFixed(0)}%`, margin + contentWidth - 20, y + 8);

      // Question
      doc.setFontSize(9);
      doc.setTextColor(COLORS.text);
      const questionLines = doc.splitTextToSize(`Q: ${q.question}`, contentWidth - 35);
      doc.text(questionLines.slice(0, 2), margin + 3, y + 8);

      // Bot answer (truncated)
      if (q.actual_answer) {
        doc.setFontSize(8);
        doc.setTextColor(COLORS.secondary);
        const answerLines = doc.splitTextToSize(`A: ${truncate(q.actual_answer, 150)}`, contentWidth - 10);
        doc.text(answerLines.slice(0, 2), margin + 3, y + 20);
      }

      // ALL issues (not just first)
      if (q.evaluation?.issues && q.evaluation.issues.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(COLORS.error);
        const allIssues = q.evaluation.issues.join(' | ');
        const issueLines = doc.splitTextToSize(`Issues: ${allIssues}`, contentWidth - 10);
        doc.text(issueLines.slice(0, 1), margin + 3, y + 32);
      }

      // Reasoning
      if (q.evaluation?.reasoning) {
        doc.setFontSize(7);
        doc.setTextColor(COLORS.textLight);
        doc.text(truncate(q.evaluation.reasoning, 100), margin + 3, y + 38);
      }

      y += 45;
    }

    y += 5;
  }
}

function renderAppendix(
  doc: jsPDF,
  testRun: QATestRun,
  questions: QATestQuestion[],
  tenantName: string,
  margin: number,
  contentWidth: number
): void {
  doc.addPage();
  let y = 20;

  doc.setFontSize(16);
  doc.setTextColor(COLORS.primary);
  doc.text('Appendix: Test Configuratie', margin, y);
  y += 15;

  // Test Details
  doc.setFontSize(11);
  doc.setTextColor(COLORS.text);
  doc.text('Test Details', margin, y);
  y += 8;

  const details = [
    ['Test ID', testRun.id],
    ['Tenant', tenantName],
    ['Gestart', formatDate(testRun.started_at)],
    ['Voltooid', formatDate(testRun.completed_at)],
    ['Duur', formatDuration(testRun.duration_seconds || 0)],
    ['Totale Kosten', formatCost(testRun.total_cost)]
  ];

  doc.setFontSize(9);
  for (const [label, value] of details) {
    doc.setTextColor(COLORS.secondary);
    doc.text(`${label}:`, margin, y);
    doc.setTextColor(COLORS.text);
    doc.text(value, margin + 50, y);
    y += 6;
  }

  y += 10;

  // Documents tested (unique source documents)
  doc.setFontSize(11);
  doc.setTextColor(COLORS.text);
  doc.text('Geteste Documenten', margin, y);
  y += 8;

  const uniqueDocs = [...new Set(questions.map(q => q.source_document).filter(Boolean))];

  doc.setFontSize(9);
  if (uniqueDocs.length === 0) {
    doc.setTextColor(COLORS.secondary);
    doc.text('Geen specifieke documenten geregistreerd', margin, y);
    y += 6;
  } else {
    for (const docName of uniqueDocs.slice(0, 15)) {
      doc.setTextColor(COLORS.text);
      doc.text(`- ${docName}`, margin, y);
      y += 5;
    }
    if (uniqueDocs.length > 15) {
      doc.setTextColor(COLORS.secondary);
      doc.text(`... en ${uniqueDocs.length - 15} meer documenten`, margin, y);
      y += 5;
    }
  }

  y += 10;

  // Question distribution
  doc.setFontSize(11);
  doc.setTextColor(COLORS.text);
  doc.text('Vraag Verdeling', margin, y);
  y += 8;

  const categoryStats = calculateCategoryStats(questions);
  doc.setFontSize(9);
  for (const stat of categoryStats) {
    doc.setTextColor(COLORS.text);
    doc.text(`${stat.label}: ${stat.total} vragen`, margin, y);
    y += 5;
  }

  y += 15;

  // Footer note
  doc.setFontSize(8);
  doc.setTextColor(COLORS.secondary);
  doc.text('Dit rapport is automatisch gegenereerd door het QA Testing System v2.4', margin, y);
  y += 5;
  doc.text(`Gegenereerd op: ${new Date().toLocaleString('nl-NL')}`, margin, y);
}

// ========================================
// CSV EXPORT
// ========================================

export function generateQACSV(data: PDFReportData): string {
  const { testRun, questions, tenantName } = data;

  const headers = [
    'Nummer',
    'Categorie',
    'Vraag',
    'Verwacht Antwoord',
    'Bot Antwoord',
    'Score',
    'Geslaagd',
    'Bron Document',
    'Bron Pagina',
    'Response Time (ms)',
    'Issues',
    'Reasoning'
  ];

  const rows = questions.map((q, i) => [
    i + 1,
    q.category,
    `"${q.question.replace(/"/g, '""')}"`,
    `"${(q.expected_answer || '').replace(/"/g, '""')}"`,
    `"${(q.actual_answer || '').replace(/"/g, '""')}"`,
    q.score?.toFixed(1) || '',
    q.passed ? 'Ja' : 'Nee',
    q.source_document || '',
    q.source_page?.toString() || '',
    q.response_time_ms?.toString() || '',
    `"${(q.evaluation?.issues || []).join('; ').replace(/"/g, '""')}"`,
    `"${(q.evaluation?.reasoning || '').replace(/"/g, '""')}"`
  ]);

  // Add header info
  const csv = [
    `# QA Test Rapport - ${tenantName}`,
    `# Test ID: ${testRun.id}`,
    `# Datum: ${formatDate(testRun.completed_at)}`,
    `# Overall Score: ${testRun.overall_score?.toFixed(1)}%`,
    `# Totaal Vragen: ${testRun.total_questions}`,
    `# Geslaagd: ${questions.filter(q => q.passed).length}`,
    `# Gefaald: ${questions.filter(q => q.passed === false).length}`,
    `# Kosten: ${formatCost(testRun.total_cost)}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csv;
}
