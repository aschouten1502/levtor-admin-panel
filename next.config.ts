import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const isWindows = process.platform === 'win32';

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to complete even with ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to complete even with TypeScript errors
    // Only use for temporary fixes - should resolve errors properly in production
    ignoreBuildErrors: false,
  },
  // Webpack configuration for Windows cache stability
  webpack: (config, { dev }) => {
    if (dev && isWindows) {
      // Disable filesystem cache on Windows to prevent EPERM errors
      // This fixes the "operation not permitted, rename" cache corruption issue
      config.cache = false;
    }
    return config;
  },
  // Security headers voor embed route
  async headers() {
    return [
      {
        // Embed route: sta iframe embedding toe op externe websites
        source: '/embed/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' *",
          },
        ],
      },
    ];
  },
};

// PWA Configuration
const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Disable PWA in development for faster builds
  register: true,
  fallbacks: {
    document: "/offline.html", // Fallback page when offline
  },
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
        },
      },
      {
        urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "image-cache",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      {
        urlPattern: /\/api\/chat/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 5 * 60, // 5 minutes
          },
        },
      },
      {
        urlPattern: /\.(?:js|css)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-resources",
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
        },
      },
    ],
  },
});

export default pwaConfig(nextConfig);
