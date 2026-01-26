import Link from 'next/link';
import { getAllTenantsWithStats, TenantWithStats } from '@/lib/admin/tenant-service';

/**
 * Tenants List Page - Shows all tenants with their stats
 */

function TenantCard({ tenant }: { tenant: TenantWithStats }) {
  const statusColor = tenant.is_active
    ? 'bg-green-100 text-green-700 border-green-200'
    : 'bg-gray-100 text-gray-600 border-gray-200';

  const hasNoDocuments = tenant.stats.document_count === 0;

  return (
    <Link
      href={`/admin/products/hr-bot/tenants/${tenant.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          {tenant.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="w-14 h-14 rounded-xl object-contain bg-gray-100"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: tenant.primary_color || '#0066CC' }}
            >
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{tenant.name}</h3>
            <p className="text-sm text-gray-500">{tenant.id}</p>
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
          {tenant.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Warning: No documents */}
      {hasNoDocuments && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          <p className="text-xs text-amber-700 flex items-center gap-1.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Geen documenten - upload HR docs om de chatbot te gebruiken
          </p>
        </div>
      )}

      {/* Contact */}
      {tenant.contact_email && (
        <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {tenant.contact_email}
        </p>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
        <div>
          <p className="text-2xl font-semibold text-gray-900">{tenant.stats.document_count}</p>
          <p className="text-xs text-gray-500">Documents</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-gray-900">{tenant.stats.chat_count}</p>
          <p className="text-xs text-gray-500">Chats</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-gray-900">${tenant.stats.total_cost.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Cost</p>
        </div>
      </div>

      {/* Color preview */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-400">Brand color:</span>
        <div
          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
          style={{ backgroundColor: tenant.primary_color || '#0066CC' }}
        />
        {tenant.secondary_color && (
          <div
            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: tenant.secondary_color }}
          />
        )}
      </div>
    </Link>
  );
}

export default async function TenantsListPage() {
  const tenants = await getAllTenantsWithStats();

  // Split tenants into categories
  const clientTenants = tenants.filter(t => t.is_active && !t.is_demo);
  const demoTenants = tenants.filter(t => t.is_active && t.is_demo);
  const inactiveTenants = tenants.filter(t => !t.is_active);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-500 mt-1">
            Manage all your tenant organizations
          </p>
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

      {/* Empty state */}
      {tenants.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No tenants yet</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Create your first tenant to get started with the HR Assistant platform.
            Each tenant gets their own branded chatbot and document library.
          </p>
          <Link
            href="/admin/products/hr-bot/tenants/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create First Tenant
          </Link>
        </div>
      ) : (
        <>
          {/* Client Tenants (Production) */}
          {clientTenants.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Klanten ({clientTenants.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clientTenants.map((tenant) => (
                  <TenantCard key={tenant.id} tenant={tenant} />
                ))}
              </div>
            </div>
          )}

          {/* Demo Tenants */}
          {demoTenants.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Demo&apos;s ({demoTenants.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {demoTenants.map((tenant) => (
                  <TenantCard key={tenant.id} tenant={tenant} />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Tenants */}
          {inactiveTenants.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-500 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Inactief ({inactiveTenants.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75">
                {inactiveTenants.map((tenant) => (
                  <TenantCard key={tenant.id} tenant={tenant} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
