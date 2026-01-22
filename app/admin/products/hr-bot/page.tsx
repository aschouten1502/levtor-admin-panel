/**
 * HR Bot Product Overview Page
 *
 * Central dashboard for managing HR Bot deployments.
 * Shows quick stats and navigation to sub-sections.
 *
 * Locatie: app/admin/products/hr-bot/page.tsx
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface HRBotStats {
  totalTenants: number;
  activeTenants: number;
  totalChats: number;
  totalDocuments: number;
}

export default function HRBotOverviewPage() {
  const [stats, setStats] = useState<HRBotStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch tenant stats
        const tenantsRes = await fetch('/api/admin/products/hr-bot/tenants');
        const tenantsData = await tenantsRes.json();

        const tenants = tenantsData.tenants || [];
        const activeTenants = tenants.filter((t: any) => t.is_active).length;
        const totalChats = tenants.reduce((sum: number, t: any) => sum + (t.chat_count || 0), 0);
        const totalDocuments = tenants.reduce((sum: number, t: any) => sum + (t.document_count || 0), 0);

        setStats({
          totalTenants: tenants.length,
          activeTenants,
          totalChats,
          totalDocuments
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const sections = [
    {
      title: 'Tenants',
      description: 'Beheer HR Bot deployments per klant',
      href: '/admin/products/hr-bot/tenants',
      icon: '🏢',
      stat: stats?.totalTenants,
      statLabel: 'tenants'
    },
    {
      title: 'Branding',
      description: 'Pas look & feel aan per tenant',
      href: '/admin/products/hr-bot/branding',
      icon: '🎨',
      stat: null,
      statLabel: null
    },
    {
      title: 'Chat Logs',
      description: 'Bekijk en analyseer chat gesprekken',
      href: '/admin/products/hr-bot/logs',
      icon: '💬',
      stat: stats?.totalChats,
      statLabel: 'chats'
    },
    {
      title: 'QA Testing',
      description: 'Test bot kwaliteit met geautomatiseerde tests',
      href: '/admin/products/hr-bot/test',
      icon: '🧪',
      stat: null,
      statLabel: null
    },
    {
      title: 'Implementatie',
      description: 'Embed codes en integratie instructies',
      href: '/admin/products/hr-bot/implement',
      icon: '🔧',
      stat: null,
      statLabel: null
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🤖</span>
          <h1 className="text-2xl font-bold text-gray-900">HR Bot</h1>
        </div>
        <p className="text-gray-600">
          Q&A chatbot voor HR beleid en arbeidsvoorwaarden
        </p>
      </div>

      {/* Quick Stats */}
      {!loading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">{stats.totalTenants}</p>
            <p className="text-sm text-gray-500">Tenants</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-green-600">{stats.activeTenants}</p>
            <p className="text-sm text-gray-500">Actief</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-blue-600">{stats.totalChats.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Chats</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-purple-600">{stats.totalDocuments}</p>
            <p className="text-sm text-gray-500">Documenten</p>
          </div>
        </div>
      )}

      {/* Section Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <span className="text-2xl">{section.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{section.title}</h3>
                <p className="text-sm text-gray-500 mb-2">{section.description}</p>
                {section.stat !== null && (
                  <p className="text-sm font-medium text-blue-600">
                    {section.stat} {section.statLabel}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
