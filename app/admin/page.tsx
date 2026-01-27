import Link from 'next/link';
import { getAllTenantsWithStats, TenantWithStats, isSupabaseConfigured } from '@/lib/admin/tenant-service';

/**
 * Admin Dashboard - Overview of all tenants and statistics
 */

// Configuration warning component
function ConfigurationWarning() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-amber-800">Supabase Not Configured</h3>
          <p className="text-amber-700 mt-1">
            The admin panel requires Supabase to be configured. Please set the following environment variables:
          </p>
          <ul className="mt-3 space-y-1 text-sm text-amber-700">
            <li><code className="bg-amber-100 px-1.5 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> - Your Supabase project URL</li>
            <li><code className="bg-amber-100 px-1.5 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</code> - Your Supabase service role key</li>
          </ul>
          <p className="text-amber-700 mt-3 text-sm">
            See <code className="bg-amber-100 px-1.5 py-0.5 rounded">.env.example</code> for reference.
          </p>
        </div>
      </div>
    </div>
  );
}

// Stats card component
function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = 'blue'
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// Tenant row component
function TenantRow({ tenant }: { tenant: TenantWithStats }) {
  const statusColor = tenant.is_active
    ? 'bg-green-100 text-green-700'
    : 'bg-gray-100 text-gray-600';

  const typeColor = tenant.is_demo
    ? 'bg-purple-100 text-purple-700'
    : 'bg-blue-100 text-blue-700';

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          {tenant.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="w-10 h-10 rounded-lg object-contain bg-gray-100"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: tenant.primary_color || '#0066CC' }}
            >
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <Link
              href={`/admin/products/hr-bot/tenants/${tenant.id}`}
              className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
            >
              {tenant.name}
            </Link>
            <p className="text-sm text-gray-500">{tenant.id}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColor}`}>
          {tenant.is_demo ? 'Demo' : 'Klant'}
        </span>
      </td>
      <td className="py-4 px-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
          {tenant.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="py-4 px-4 text-sm text-gray-600">
        {tenant.stats.document_count === 0 ? (
          <span className="text-amber-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            0
          </span>
        ) : (
          tenant.stats.document_count
        )}
      </td>
      <td className="py-4 px-4 text-sm text-gray-600">
        {tenant.stats.chat_count}
      </td>
      <td className="py-4 px-4 text-sm text-gray-600">
        ${tenant.stats.total_cost.toFixed(4)}
      </td>
      <td className="py-4 px-4">
        <Link
          href={`/admin/products/hr-bot/tenants/${tenant.id}`}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Manage
        </Link>
      </td>
    </tr>
  );
}

export default async function AdminDashboard() {
  // Check if Supabase is configured
  const supabaseConfigured = isSupabaseConfigured();

  // Fetch tenants with stats (will return empty array if not configured)
  const tenants = await getAllTenantsWithStats();

  // Calculate totals
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.is_active).length;
  const totalDocuments = tenants.reduce((sum, t) => sum + t.stats.document_count, 0);
  const totalChats = tenants.reduce((sum, t) => sum + t.stats.chat_count, 0);
  const totalCost = tenants.reduce((sum, t) => sum + t.stats.total_cost, 0);

  return (
    <div className="space-y-8">
      {/* Configuration Warning */}
      {!supabaseConfigured && <ConfigurationWarning />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of all tenants and usage statistics</p>
        </div>
        <Link
          href="/admin/products/hr-bot/tenants/new"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Tenant
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tenants"
          value={totalTenants}
          subtitle={`${activeTenants} active`}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          title="Documents"
          value={totalDocuments}
          subtitle="Total uploaded"
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatCard
          title="Chat Sessions"
          value={totalChats}
          subtitle="All time"
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />
        <StatCard
          title="Total Cost"
          value={`$${totalCost.toFixed(2)}`}
          subtitle="All tenants"
          color="orange"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Tenants</h2>
        </div>

        {tenants.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants yet</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first tenant.</p>
            <Link
              href="/admin/products/hr-bot/tenants/new"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create First Tenant
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tenant</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Documents</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Chats</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Cost</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <TenantRow key={tenant.id} tenant={tenant} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
