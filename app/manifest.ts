/**
 * Dynamic PWA Manifest (Next.js 15+)
 *
 * This file generates the PWA manifest dynamically from BRANDING config.
 * All values come from environment variables via lib/branding.config.ts
 *
 * No more manual editing of manifest.json per client!
 */

import { MetadataRoute } from 'next';
import { BRANDING } from '@/lib/shared/branding.config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRANDING.pwa.name,
    short_name: BRANDING.pwa.shortName,
    description: BRANDING.pwa.description,
    start_url: '/',
    scope: '/',
    display: BRANDING.pwa.display,
    orientation: BRANDING.pwa.orientation,
    background_color: BRANDING.pwa.backgroundColor,
    theme_color: BRANDING.pwa.themeColor,
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Ask a Question',
        short_name: 'Ask',
        description: 'Start asking your HR assistant questions',
        url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
    ],
  };
}
