/**
 * ========================================
 * ADMIN IMPLEMENT - Eenvoudige Embed Pagina
 * ========================================
 *
 * Twee opties voor implementatie:
 * 1. Volledige pagina (embed op aparte pagina)
 * 2. Floating widget (popup knop rechtsonder)
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface TenantInfo {
  id: string;
  name: string;
  primary_color: string;
  logo_url: string | null;
}

export default function ImplementPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'fullpage' | 'widget'>('fullpage');
  const [selectedDevice, setSelectedDevice] = useState<string>('desktop');

  // Device configurations
  const devices = {
    desktop: { name: 'Desktop', width: 1200, height: 700, icon: 'desktop', scale: 0.45 },
    laptop: { name: 'Laptop', width: 1366, height: 768, icon: 'laptop', scale: 0.4 },
    ipad: { name: 'iPad', width: 768, height: 1024, icon: 'tablet', scale: 0.5 },
    iphone: { name: 'iPhone', width: 390, height: 844, icon: 'phone', scale: 0.55 },
    samsung: { name: 'Samsung', width: 360, height: 800, icon: 'phone', scale: 0.55 },
    huawei: { name: 'Huawei', width: 360, height: 780, icon: 'phone', scale: 0.55 },
  };

  const currentDevice = devices[selectedDevice as keyof typeof devices];

  useEffect(() => {
    fetchTenant();
  }, [tenantId]);

  const fetchTenant = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/products/hr-bot/branding/${tenantId}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          router.push('/admin/products/hr-bot/implement');
          return;
        }
        throw new Error(data.error || 'Failed to fetch tenant');
      }

      setTenant(data.tenant);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getBaseUrl = () => {
    return typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  };

  const getEmbedUrl = useCallback(() => {
    return `${getBaseUrl()}/embed?tenant=${tenantId}`;
  }, [tenantId]);

  // Complete HTML pagina voor klant
  const getFullpageCode = useCallback(() => {
    return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HR Assistent - ${tenant?.name || 'Bedrijf'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; width: 100%; }
    iframe { width: 100%; height: 100%; border: none; display: block; }
  </style>
</head>
<body>
  <iframe src="${getEmbedUrl()}" allow="clipboard-write"></iframe>
</body>
</html>`;
  }, [getEmbedUrl, tenant?.name]);

  // Floating widget code
  const getWidgetCode = useCallback(() => {
    const color = tenant?.primary_color || '#8B5CF6';

    return `<!-- HR Assistant Chat Widget -->
<script>
(function() {
  var config = {
    tenantId: '${tenantId}',
    baseUrl: '${getBaseUrl()}',
    color: '${color}'
  };

  var style = document.createElement('style');
  style.textContent = \`
    #hr-chat-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: \${config.color};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 99998;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    #hr-chat-btn:hover { transform: scale(1.05); }
    #hr-chat-btn svg { width: 28px; height: 28px; fill: white; }
    #hr-chat-container {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 120px);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 99999;
      display: none;
      background: white;
    }
    #hr-chat-container.open { display: block; }
    #hr-chat-container iframe { width: 100%; height: 100%; border: none; }
    @media (max-width: 480px) {
      #hr-chat-container {
        bottom: 0; right: 0;
        width: 100vw; height: 100vh;
        max-width: 100vw; max-height: 100vh;
        border-radius: 0;
      }
    }
  \`;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.id = 'hr-chat-btn';
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
  document.body.appendChild(btn);

  var container = document.createElement('div');
  container.id = 'hr-chat-container';
  container.innerHTML = '<iframe src="' + config.baseUrl + '/embed?tenant=' + config.tenantId + '"></iframe>';
  document.body.appendChild(container);

  var isOpen = false;
  btn.onclick = function() {
    isOpen = !isOpen;
    container.classList.toggle('open', isOpen);
    btn.innerHTML = isOpen
      ? '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
  };
})();
</script>`;
  }, [tenantId, tenant?.primary_color]);

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-800">Error</h3>
        <p className="text-red-700 mt-1">{error || 'Tenant niet gevonden'}</p>
        <Link href="/admin/products/hr-bot/implement" className="mt-4 inline-block text-red-600 hover:text-red-800 font-medium">
          Terug naar overzicht
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products/hr-bot/implement"
            className="text-gray-500 hover:text-gray-700 transition-colors p-2 -ml-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center gap-3">
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.name} className="w-10 h-10 rounded-lg object-contain bg-gray-50 border border-gray-100" />
            ) : (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: tenant.primary_color || '#8B5CF6' }}>
                {tenant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-sm text-gray-500">Implementeren</p>
            </div>
          </div>
        </div>

        <a
          href={getEmbedUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Test Chat
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('fullpage')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'fullpage'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Volledige Pagina
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('widget')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'widget'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Popup Widget
        </button>
      </div>

      {/* Content based on tab */}
      {activeTab === 'fullpage' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Instructions */}
          <div className="space-y-6">
            {/* Resultaat voorbeeld */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>Resultaat:</strong> <code className="bg-blue-100 px-1.5 py-0.5 rounded">{tenant?.name?.toLowerCase().replace(/\s+/g, '')}.nl/hr-assistent</code>
              </p>
            </div>

            {/* Stap 1: Kopieer code */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: tenant?.primary_color || '#8B5CF6' }}>
                  1
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Kopieer deze HTML pagina</h2>
              </div>

              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto max-h-72">
                  <code>{getFullpageCode()}</code>
                </pre>
                <button
                  type="button"
                  onClick={() => handleCopy(getFullpageCode(), 'fullpage')}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  {copied === 'fullpage' ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Gekopieerd!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Kopieer
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Stap 2: Instructies per platform */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: tenant?.primary_color || '#8B5CF6' }}>
                  2
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Maak pagina bij de klant</h2>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700 w-32 flex-shrink-0">WordPress:</span>
                  <span className="text-gray-600">Nieuwe pagina → HTML blok → code plakken</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700 w-32 flex-shrink-0">Wix/Squarespace:</span>
                  <span className="text-gray-600">Nieuwe pagina → Embed/HTML element → code plakken</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700 w-32 flex-shrink-0">Custom site:</span>
                  <span className="text-gray-600">Maak bestand <code className="bg-gray-200 px-1 rounded">hr-assistent.html</code> en upload</span>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700 w-32 flex-shrink-0">React/Next.js:</span>
                  <span className="text-gray-600">Maak route <code className="bg-gray-200 px-1 rounded">/hr-assistent</code> met iframe</span>
                </div>
              </div>
            </div>

            {/* Stap 3: Klaar */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                  ✓
                </div>
                <div>
                  <h3 className="font-medium text-green-800">Klaar!</h3>
                  <p className="text-sm text-green-700">Chatbot draait op het domein van de klant</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Preview with Device Selector */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Device Selector */}
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-wrap gap-2">
                {Object.entries(devices).map(([key, device]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDevice(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedDevice === key
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {device.icon === 'desktop' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                    {device.icon === 'laptop' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    {device.icon === 'tablet' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    {device.icon === 'phone' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    {device.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Device Frame Preview */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-6 flex items-center justify-center min-h-[550px]">
              <div className="relative">
                {/* Device Frame */}
                {currentDevice.icon === 'phone' ? (
                  // Phone frame
                  <div className="bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
                    <div className="bg-black rounded-[2rem] p-1 relative">
                      {/* Notch */}
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full z-10" />
                      {/* Screen container with proper dimensions */}
                      <div
                        className="rounded-[1.5rem] overflow-hidden bg-white"
                        style={{
                          width: currentDevice.width * currentDevice.scale,
                          height: currentDevice.height * currentDevice.scale,
                        }}
                      >
                        <iframe
                          src={getEmbedUrl()}
                          style={{
                            width: currentDevice.width,
                            height: currentDevice.height,
                            transform: `scale(${currentDevice.scale})`,
                            transformOrigin: 'top left',
                          }}
                          className="bg-white border-none"
                          title="Preview"
                        />
                      </div>
                    </div>
                  </div>
                ) : currentDevice.icon === 'tablet' ? (
                  // Tablet frame
                  <div className="bg-gray-800 rounded-[1.5rem] p-3 shadow-2xl">
                    {/* Screen container with proper dimensions */}
                    <div
                      className="rounded-lg overflow-hidden bg-white"
                      style={{
                        width: currentDevice.width * currentDevice.scale,
                        height: currentDevice.height * currentDevice.scale,
                      }}
                    >
                      <iframe
                        src={getEmbedUrl()}
                        style={{
                          width: currentDevice.width,
                          height: currentDevice.height,
                          transform: `scale(${currentDevice.scale})`,
                          transformOrigin: 'top left',
                        }}
                        className="bg-white border-none"
                        title="Preview"
                      />
                    </div>
                  </div>
                ) : (
                  // Desktop/Laptop frame
                  <div className="bg-gray-800 rounded-t-xl shadow-2xl">
                    {/* Browser chrome */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-t-xl">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      </div>
                      <div className="flex-1 bg-gray-600 rounded px-3 py-1 text-xs text-gray-300 font-mono">
                        {tenant?.name?.toLowerCase().replace(/\s+/g, '')}.nl/hr-assistent
                      </div>
                    </div>
                    <div
                      style={{
                        width: currentDevice.width * currentDevice.scale,
                        height: currentDevice.height * currentDevice.scale,
                        overflow: 'hidden',
                      }}
                    >
                      <iframe
                        src={getEmbedUrl()}
                        style={{
                          width: currentDevice.width,
                          height: currentDevice.height,
                          transform: `scale(${currentDevice.scale})`,
                          transformOrigin: 'top left',
                        }}
                        className="bg-white"
                        title="Preview"
                      />
                    </div>
                  </div>
                )}

                {/* Device label */}
                <div className="text-center mt-4">
                  <span className="text-xs text-gray-500 bg-white/80 px-3 py-1 rounded-full">
                    {currentDevice.name} ({currentDevice.width} x {currentDevice.height})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Widget Instructions */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Popup Widget</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Een chat-knop rechtsonder die een popup opent
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Kopieer deze code en plak vóór <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code>:
              </p>

              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto max-h-64">
                  <code>{getWidgetCode()}</code>
                </pre>
                <button
                  type="button"
                  onClick={() => handleCopy(getWidgetCode(), 'widget')}
                  className="absolute top-2 right-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs flex items-center gap-1"
                >
                  {copied === 'widget' ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Gekopieerd!
                    </>
                  ) : (
                    'Kopieer'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Widget Preview with Device Selector */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Device Selector */}
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-wrap gap-2">
                {Object.entries(devices).map(([key, device]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDevice(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedDevice === key
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {device.icon === 'desktop' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                    {device.icon === 'laptop' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    {device.icon === 'tablet' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    {device.icon === 'phone' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    {device.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Device Frame Preview with Widget */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-6 flex items-center justify-center min-h-[550px]">
              <div className="relative">
                {/* Device Frame */}
                {currentDevice.icon === 'phone' ? (
                  // Phone frame with website + widget
                  <div className="bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
                    <div className="bg-black rounded-[2rem] p-1 relative overflow-hidden">
                      {/* Notch */}
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full z-20" />
                      {/* Fake website content */}
                      <div
                        className="rounded-[1.5rem] bg-white relative"
                        style={{
                          width: currentDevice.width * currentDevice.scale,
                          height: currentDevice.height * currentDevice.scale,
                        }}
                      >
                        {/* Website skeleton */}
                        <div className="p-3 space-y-2" style={{ transform: `scale(${currentDevice.scale})`, transformOrigin: 'top left', width: currentDevice.width }}>
                          <div className="h-8 bg-gray-100 rounded w-full" />
                          <div className="h-4 bg-gray-100 rounded w-3/4 mt-4" />
                          <div className="h-3 bg-gray-100 rounded w-full" />
                          <div className="h-3 bg-gray-100 rounded w-5/6" />
                          <div className="h-20 bg-gray-100 rounded w-full mt-4" />
                        </div>
                        {/* Widget popup */}
                        <div
                          className="absolute rounded-xl shadow-2xl overflow-hidden bg-white"
                          style={{
                            bottom: 50 * currentDevice.scale,
                            right: 8 * currentDevice.scale,
                            width: Math.min(320, currentDevice.width - 40) * currentDevice.scale,
                            height: Math.min(400, currentDevice.height - 120) * currentDevice.scale,
                          }}
                        >
                          <iframe
                            src={getEmbedUrl()}
                            style={{
                              width: Math.min(320, currentDevice.width - 40),
                              height: Math.min(400, currentDevice.height - 120),
                              transform: `scale(${currentDevice.scale})`,
                              transformOrigin: 'top left',
                            }}
                            className="border-none"
                            title="Widget Preview"
                          />
                        </div>
                        {/* Chat button */}
                        <div
                          className="absolute rounded-full flex items-center justify-center shadow-lg"
                          style={{
                            bottom: 8 * currentDevice.scale,
                            right: 8 * currentDevice.scale,
                            width: 40 * currentDevice.scale,
                            height: 40 * currentDevice.scale,
                            backgroundColor: tenant.primary_color || '#8B5CF6',
                          }}
                        >
                          <svg className="text-white" style={{ width: 20 * currentDevice.scale, height: 20 * currentDevice.scale }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : currentDevice.icon === 'tablet' ? (
                  // Tablet frame with website + widget
                  <div className="bg-gray-800 rounded-[1.5rem] p-3 shadow-2xl">
                    <div
                      className="rounded-lg bg-white relative overflow-hidden"
                      style={{
                        width: currentDevice.width * currentDevice.scale,
                        height: currentDevice.height * currentDevice.scale,
                      }}
                    >
                      {/* Website skeleton */}
                      <div className="p-4 space-y-3" style={{ transform: `scale(${currentDevice.scale})`, transformOrigin: 'top left', width: currentDevice.width }}>
                        <div className="h-12 bg-gray-100 rounded w-full" />
                        <div className="h-6 bg-gray-100 rounded w-1/2 mt-6" />
                        <div className="h-4 bg-gray-100 rounded w-full" />
                        <div className="h-4 bg-gray-100 rounded w-4/5" />
                        <div className="h-32 bg-gray-100 rounded w-full mt-4" />
                      </div>
                      {/* Widget popup */}
                      <div
                        className="absolute rounded-xl shadow-2xl overflow-hidden bg-white"
                        style={{
                          bottom: 70 * currentDevice.scale,
                          right: 16 * currentDevice.scale,
                          width: 350 * currentDevice.scale,
                          height: 500 * currentDevice.scale,
                        }}
                      >
                        <iframe
                          src={getEmbedUrl()}
                          style={{
                            width: 350,
                            height: 500,
                            transform: `scale(${currentDevice.scale})`,
                            transformOrigin: 'top left',
                          }}
                          className="border-none"
                          title="Widget Preview"
                        />
                      </div>
                      {/* Chat button */}
                      <div
                        className="absolute rounded-full flex items-center justify-center shadow-lg"
                        style={{
                          bottom: 16 * currentDevice.scale,
                          right: 16 * currentDevice.scale,
                          width: 50 * currentDevice.scale,
                          height: 50 * currentDevice.scale,
                          backgroundColor: tenant.primary_color || '#8B5CF6',
                        }}
                      >
                        <svg className="text-white" style={{ width: 24 * currentDevice.scale, height: 24 * currentDevice.scale }} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Desktop/Laptop frame with website + widget
                  <div className="bg-gray-800 rounded-t-xl shadow-2xl">
                    {/* Browser chrome */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-t-xl">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      </div>
                      <div className="flex-1 bg-gray-600 rounded px-3 py-1 text-xs text-gray-300 font-mono">
                        {tenant?.name?.toLowerCase().replace(/\s+/g, '')}.nl
                      </div>
                    </div>
                    <div
                      className="relative bg-white overflow-hidden"
                      style={{
                        width: currentDevice.width * currentDevice.scale,
                        height: currentDevice.height * currentDevice.scale,
                      }}
                    >
                      {/* Website skeleton */}
                      <div className="p-6 space-y-4" style={{ transform: `scale(${currentDevice.scale})`, transformOrigin: 'top left', width: currentDevice.width }}>
                        <div className="h-16 bg-gray-100 rounded w-full" />
                        <div className="h-8 bg-gray-100 rounded w-1/3 mt-8" />
                        <div className="h-4 bg-gray-100 rounded w-full" />
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                        <div className="h-4 bg-gray-100 rounded w-5/6" />
                        <div className="h-40 bg-gray-100 rounded w-full mt-6" />
                      </div>
                      {/* Widget popup */}
                      <div
                        className="absolute rounded-2xl shadow-2xl overflow-hidden bg-white"
                        style={{
                          bottom: 80 * currentDevice.scale,
                          right: 20 * currentDevice.scale,
                          width: 380 * currentDevice.scale,
                          height: 520 * currentDevice.scale,
                        }}
                      >
                        <iframe
                          src={getEmbedUrl()}
                          style={{
                            width: 380,
                            height: 520,
                            transform: `scale(${currentDevice.scale})`,
                            transformOrigin: 'top left',
                          }}
                          className="border-none"
                          title="Widget Preview"
                        />
                      </div>
                      {/* Chat button */}
                      <div
                        className="absolute rounded-full flex items-center justify-center shadow-lg"
                        style={{
                          bottom: 20 * currentDevice.scale,
                          right: 20 * currentDevice.scale,
                          width: 56 * currentDevice.scale,
                          height: 56 * currentDevice.scale,
                          backgroundColor: tenant.primary_color || '#8B5CF6',
                        }}
                      >
                        <svg className="text-white" style={{ width: 28 * currentDevice.scale, height: 28 * currentDevice.scale }} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Device label */}
                <div className="text-center mt-4">
                  <span className="text-xs text-gray-500 bg-white/80 px-3 py-1 rounded-full">
                    {currentDevice.name} ({currentDevice.width} x {currentDevice.height})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
