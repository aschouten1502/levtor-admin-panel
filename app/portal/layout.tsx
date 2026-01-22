'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { PortalAuthGuard, PortalLogoutButton, useCustomer } from './components/PortalAuthGuard';
import { ProductsProvider, useProducts } from './providers/ProductsProvider';

/**
 * ========================================
 * PORTAL LAYOUT
 * ========================================
 *
 * Layout voor het klantenportaal.
 * Dynamisch: toont alleen producten die de klant heeft.
 */

/**
 * Product icon mapping
 */
function getProductIcon(productId: string): React.ReactNode {
  switch (productId) {
    case 'hr_bot':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
  }
}

/**
 * Product sub-menu items
 */
function getProductSubItems(productId: string, tenantProductId: string) {
  const basePath = `/portal/products/${tenantProductId}`;

  return [
    {
      href: basePath,
      label: 'Overzicht',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      href: `${basePath}/chat`,
      label: 'Test Bot',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      href: `${basePath}/documents`,
      label: 'Documenten',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      href: `${basePath}/logs`,
      label: 'Chat Logs',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
  ];
}

/**
 * Portal sidebar
 */
function PortalSidebar() {
  const pathname = usePathname();
  const { customer } = useCustomer();
  const { products, isLoading } = useProducts();
  const [expandedProducts, setExpandedProducts] = useState<string[]>([]);

  // Auto-expand product if we're on a product page
  useEffect(() => {
    if (pathname?.includes('/portal/products/')) {
      const productId = pathname.split('/')[3];
      if (productId && !expandedProducts.includes(productId)) {
        setExpandedProducts((prev) => [...prev, productId]);
      }
    }
  }, [pathname]);

  const toggleProduct = (productId: string) => {
    setExpandedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/portal" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">Portal</h1>
            <p className="text-xs text-gray-500 truncate max-w-[140px]">
              {customer?.name || customer?.tenant_id || 'Laden...'}
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {/* Dashboard */}
          <Link
            href="/portal"
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors
              ${pathname === '/portal'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="font-medium">Dashboard</span>
          </Link>

          {/* Products */}
          <div className="pt-4">
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Producten
            </div>

            {isLoading ? (
              <div className="px-4 py-3">
                <div className="animate-pulse flex items-center gap-3">
                  <div className="w-5 h-5 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">
                Geen producten actief
              </div>
            ) : (
              products.map((product) => {
                const isExpanded = expandedProducts.includes(product.id);
                const isProductActive = pathname?.startsWith(`/portal/products/${product.id}`);
                const subItems = getProductSubItems(product.product_id, product.id);

                return (
                  <div key={product.id} className="space-y-1">
                    {/* Product header */}
                    <button
                      type="button"
                      onClick={() => toggleProduct(product.id)}
                      className={`
                        w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors
                        ${isProductActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        {getProductIcon(product.product_id)}
                        <span className="font-medium">
                          {product.name || product.products?.name || product.product_id}
                        </span>
                      </div>
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Sub-items */}
                    {isExpanded && (
                      <ul className="ml-4 pl-4 border-l border-gray-200 space-y-1 py-1">
                        {subItems.map((item) => {
                          const isActive = pathname === item.href;
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                className={`
                                  flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm
                                  ${isActive
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                  }
                                `}
                              >
                                {item.icon}
                                <span>{item.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Invoices */}
          <div className="pt-4">
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Administratie
            </div>
            <Link
              href="/portal/invoices"
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors
                ${pathname === '/portal/invoices'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
              <span className="font-medium">Facturen</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {customer && (
          <div className="px-4 py-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {customer.name || customer.email}
            </p>
            <p className="text-xs text-gray-500 truncate">{customer.email}</p>
          </div>
        )}
        <PortalLogoutButton />
      </div>
    </aside>
  );
}

/**
 * Main portal layout
 */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Login page uses its own layout
  if (pathname === '/portal/login') {
    return <>{children}</>;
  }

  return (
    <PortalAuthGuard>
      <ProductsProvider>
        <div className="min-h-screen bg-gray-50 flex">
          <PortalSidebar />
          <main className="flex-1 overflow-auto">
            <div className="p-8">{children}</div>
          </main>
        </div>
      </ProductsProvider>
    </PortalAuthGuard>
  );
}
