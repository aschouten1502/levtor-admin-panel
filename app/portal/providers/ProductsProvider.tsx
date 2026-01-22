'use client';

import { createContext, useContext, useState, useEffect } from 'react';

/**
 * ========================================
 * PRODUCTS PROVIDER
 * ========================================
 *
 * Context provider voor portal producten.
 * Verplaatst uit layout.tsx omdat Next.js geen exports
 * toestaat uit layout bestanden behalve default.
 */

export interface Product {
  id: string;
  product_id: string;
  name: string | null;
  products: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
  };
  stats: {
    documents_count: number;
    chats_last_30_days: number;
  };
}

export interface ProductsContextType {
  products: Product[];
  isLoading: boolean;
  refetch: () => void;
}

const ProductsContext = createContext<ProductsContextType>({
  products: [],
  isLoading: true,
  refetch: () => {},
});

export function useProducts() {
  return useContext(ProductsContext);
}

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/portal/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <ProductsContext.Provider value={{ products, isLoading, refetch: fetchProducts }}>
      {children}
    </ProductsContext.Provider>
  );
}
