/**
 * ========================================
 * EMBED LAYOUT
 * ========================================
 *
 * Minimale layout voor de embed/iframe versie van de chatbot.
 * Geen admin navigatie, geen extra chrome - alleen de chat.
 *
 * Deze layout wordt gebruikt voor /embed routes zodat
 * externe websites de chatbot kunnen embedden via iframe.
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Suspense } from 'react';
import { TenantProvider } from '../providers/TenantProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "HR Assistant - Embed",
  description: "Embedded HR Assistant chatbot",
  robots: "noindex, nofollow", // Voorkom indexering van embed pagina's
};

/**
 * Minimale loading fallback voor embed
 */
function EmbedLoadingFallback() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Laden...</p>
      </div>
    </div>
  );
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Suspense fallback={<EmbedLoadingFallback />}>
          <TenantProvider>
            {children}
          </TenantProvider>
        </Suspense>
      </body>
    </html>
  );
}
