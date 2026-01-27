/**
 * ========================================
 * EMBED PAGE - Volledige Chat Interface voor Iframe
 * ========================================
 *
 * IDENTIEK aan de hoofdpagina (app/page.tsx) maar ontworpen
 * voor iframe embedding op externe websites.
 *
 * FEATURES:
 * - Alle branding elementen (logo background, welcome screen, etc.)
 * - Volledige RAG functionaliteit
 * - Configureerbaar via URL parameters
 *
 * URL PARAMETERS:
 * - tenant: Tenant ID (verplicht)
 * - lang: Standaard taal (default: nl)
 * - hideHeader: Header verbergen (default: false)
 * - hidePoweredBy: Powered by verbergen (default: false)
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatHeader } from '../components/ChatHeader';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { WelcomeScreen } from '../components/WelcomeScreen';
import { LogoBackground } from '../components/LogoBackground';
import { useTenant } from '../providers/TenantProvider';

// ========================================
// TYPES
// ========================================

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: any[];
  logId?: string | null;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function EmbedPage() {
  const searchParams = useSearchParams();
  const { tenantId: contextTenantId, isLoading: tenantLoading } = useTenant();

  // URL parameters voor configuratie
  const paramTenant = searchParams.get('tenant');
  const paramLang = searchParams.get('lang') || 'nl';
  const hideHeader = searchParams.get('hideHeader') === 'true';
  const hidePoweredBy = searchParams.get('hidePoweredBy') === 'true';

  // Effectieve tenant ID (URL param heeft prioriteit)
  const effectiveTenantId = paramTenant || contextTenantId;

  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(paramLang);
  const [pendingQuestion, setPendingQuestion] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Session ID voor chat continuiteit (per embed instance)
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      const storageKey = `embed_session_${effectiveTenantId || 'default'}`;
      const existing = sessionStorage.getItem(storageKey);
      if (existing) return existing;

      const newId = `embed_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem(storageKey, newId);
      return newId;
    }
    return `embed_${Date.now()}`;
  });

  // Auto-scroll naar beneden wanneer nieuwe messages komen
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ========================================
  // MESSAGE HANDLER
  // ========================================
  const handleSendMessage = async (content: string) => {
    console.log('🚀 [Embed] Send message initiated');
    console.log('🔑 [Embed] Session ID:', sessionId);

    // Voeg user message meteen toe aan de chat
    const userMessage: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Variables voor streaming
    let streamedContent = '';
    let citations: any[] = [];
    let logId: string | null = null;
    let usage: any = undefined;
    let hasReceivedFirstContent = false;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationHistory: messages,
          language: selectedLanguage,
          sessionId: sessionId,
          tenantId: effectiveTenantId
        })
      });

      if (!response.ok) {
        const data = await response.json();

        if (data.userFriendly && data.message) {
          const errorMessage: Message = {
            role: 'assistant',
            content: data.message
          };
          setMessages((prev) => [...prev, errorMessage]);
          return;
        }

        if (data.message) {
          const errorMessage: Message = {
            role: 'assistant',
            content: data.message
          };
          setMessages((prev) => [...prev, errorMessage]);
          return;
        }

        throw new Error(data.details || data.error || 'Failed to send message');
      }

      // Voeg lege assistant message toe
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          citations: [],
          logId: null,
          usage: undefined
        }
      ]);

      // Read stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body reader not available');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('✅ [Embed] Stream completed');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));

              if (eventData.type === 'metadata') {
                citations = eventData.citations || [];
                logId = eventData.logId || null;
              } else if (eventData.type === 'content') {
                streamedContent += eventData.content;

                // Stop loading indicator bij eerste content chunk
                if (!hasReceivedFirstContent && eventData.content) {
                  hasReceivedFirstContent = true;
                  setIsLoading(false);
                }

                // Update real-time
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: streamedContent,
                    citations: citations,
                    logId: logId,
                    usage: usage
                  };
                  return updated;
                });
              } else if (eventData.type === 'done') {
                usage = eventData.usage;

                // Final update
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: eventData.fullAnswer || streamedContent,
                    citations: citations,
                    logId: logId,
                    usage: usage
                  };
                  return updated;
                });
              } else if (eventData.type === 'error') {
                throw new Error(eventData.message || 'Streaming error');
              }
            } catch (parseError) {
              console.error('⚠️ [Embed] Failed to parse event:', line);
            }
          }
        }
      }

    } catch (error: any) {
      console.error('\n❌ [Embed] ERROR:', error?.message || 'Unknown');

      // Verwijder lege message
      setMessages((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && prev[prev.length - 1].content === '') {
          return prev.slice(0, -1);
        }
        return prev;
      });

      // Toon error
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, er is een fout opgetreden: ${error?.message || 'Onbekende fout. Probeer het opnieuw.'}`
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  // Loading state terwijl tenant laadt
  if (tenantLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
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

  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden">
      {/* Logo Background Pattern - Subtiel op achtergrond */}
      <LogoBackground />

      {/* Header met logo en taal selector - FIXED TOP (optioneel) */}
      {!hideHeader && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white w-full">
          <ChatHeader
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
          />
        </div>
      )}

      {/* Chat Area - SCROLLABLE met padding voor header en input */}
      <div className={`relative w-full min-h-screen ${hideHeader ? 'pt-4' : 'pt-[90px]'} pb-[120px] z-10 overflow-x-hidden`}>
        <div className="relative w-full max-w-full px-4 sm:px-6 py-6 overflow-x-hidden">
          {/* Toon welkomstscherm als er nog geen messages zijn */}
          {messages.length === 0 ? (
            <WelcomeScreenWrapper
              selectedLanguage={selectedLanguage}
              hidePoweredBy={hidePoweredBy}
              onExampleClick={(question) => setPendingQuestion(question)}
            />
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Render alle messages */}
              {messages.map((message, idx) => (
                <ChatMessage
                  key={idx}
                  role={message.role}
                  content={message.content}
                  citations={message.citations}
                  logId={message.logId}
                  selectedLanguage={selectedLanguage}
                />
              ))}
              {/* Loading indicator tijdens wachten op antwoord */}
              {isLoading && <LoadingIndicator selectedLanguage={selectedLanguage} />}
              {/* Invisible div voor auto-scroll */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area - FIXED BOTTOM */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white w-full">
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
          selectedLanguage={selectedLanguage}
          externalValue={pendingQuestion}
          onExternalValueUsed={() => setPendingQuestion('')}
        />
      </div>
    </div>
  );
}

// ========================================
// WRAPPER COMPONENT voor WelcomeScreen met hidePoweredBy
// ========================================

interface WelcomeScreenWrapperProps {
  selectedLanguage: string;
  hidePoweredBy: boolean;
  onExampleClick?: (question: string) => void;
}

function WelcomeScreenWrapper({ selectedLanguage, hidePoweredBy, onExampleClick }: WelcomeScreenWrapperProps) {
  const { tenant } = useTenant();

  // Als hidePoweredBy actief is, override tenant setting tijdelijk
  if (hidePoweredBy && tenant) {
    // Override the show_powered_by in TenantProvider context doesn't work easily
    // So we wrap the WelcomeScreen and use CSS to hide if needed
    return (
      <div className={hidePoweredBy ? '[&_[data-powered-by]]:hidden' : ''}>
        <WelcomeScreen selectedLanguage={selectedLanguage} onExampleClick={onExampleClick} />
        {/* Extra style to hide powered by via CSS if URL param is set */}
        {hidePoweredBy && (
          <style>{`
            .welcome-powered-by { display: none !important; }
          `}</style>
        )}
      </div>
    );
  }

  return <WelcomeScreen selectedLanguage={selectedLanguage} onExampleClick={onExampleClick} />;
}
