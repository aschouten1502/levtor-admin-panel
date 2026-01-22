import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BRANDING } from "@/lib/shared/branding.config";
import ClientLayout from "./ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Viewport configuration (Next.js 15+) - Dynamic from BRANDING
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRANDING.colors.themeColor },
    { media: "(prefers-color-scheme: dark)", color: BRANDING.colors.themeColor }
  ],
};

// Metadata - Fully dynamic from BRANDING config
export const metadata: Metadata = {
  title: BRANDING.companyName,
  description: BRANDING.description,
  applicationName: BRANDING.companyName,
  authors: [{ name: BRANDING.shortName }],
  generator: "Next.js",
  keywords: ["HR", "Assistant", "AI", "Policies", "Benefits", BRANDING.shortName],
  referrer: "origin-when-cross-origin",
  creator: BRANDING.shortName,
  publisher: BRANDING.shortName,
  robots: "index, follow",
  metadataBase: new URL(BRANDING.urls.base),

  // Manifest (dynamic manifest.ts)
  manifest: "/manifest.webmanifest",

  // Apple iOS specific
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BRANDING.shortName,
    startupImage: [
      {
        url: "/icons/apple-touch-icon.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
      }
    ]
  },

  // Icons
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/icons/icon-192x192.png"
      }
    ]
  },

  // Format detection (disable auto-detection for better control)
  formatDetection: {
    telephone: false,
    email: false,
    address: false
  },

  // Open Graph for social sharing - Dynamic
  openGraph: {
    type: "website",
    locale: BRANDING.locale.ogLocale,
    url: BRANDING.urls.base,
    siteName: BRANDING.companyName,
    title: BRANDING.companyName,
    description: BRANDING.description,
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: BRANDING.companyName
      }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={BRANDING.locale.defaultLanguage}>
      <head>
        {/* Inject CSS custom properties for dynamic theming */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --color-primary: ${BRANDING.colors.primary};
            --color-primary-dark: ${BRANDING.colors.primaryDark};
            --color-primary-light: ${BRANDING.colors.primaryLight};
            --color-secondary: ${BRANDING.colors.secondary};
            --color-background: ${BRANDING.colors.background};
            --color-surface: ${BRANDING.colors.surface};
            --color-text-primary: ${BRANDING.colors.text.primary};
            --color-text-secondary: ${BRANDING.colors.text.secondary};
            --color-text-tertiary: ${BRANDING.colors.text.tertiary};
          }
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
