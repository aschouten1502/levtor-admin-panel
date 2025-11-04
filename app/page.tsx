/**
 * ========================================
 * MAIN PAGE - Chat Interface
 * ========================================
 *
 * Dit is de hoofdpagina van de chatbot applicatie.
 *
 * COMPONENTEN:
 * - ChatHeader: Header met logo en taal selector
 * - ChatMessage: Toont individuele messages (user + assistant)
 * - ChatInput: Input veld voor gebruiker om vragen te stellen
 * - WelcomeScreen: Welkomstscherm met voorbeeldvragen
 * - LogoBackground: Subtiel logo patroon op achtergrond
 *
 * STATE:
 * - messages: Alle chat messages (user + assistant)
 * - isLoading: Of er momenteel een antwoord wordt gegenereerd
 * - selectedLanguage: De geselecteerde taal (nl, en, pl, etc.)
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { LoadingIndicator } from './components/LoadingIndicator';
import { WelcomeScreen } from './components/WelcomeScreen';
import { LogoBackground } from './components/LogoBackground';

// ========================================
// TYPES
// ========================================

/**
 * Een message in de chat conversatie
 */
interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: any[];           // Bronnen voor het antwoord (bestand + pagina's)
  logId?: string | null;       // Log ID voor feedback tracking
  usage?: {                    // Token usage info (optioneel)
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function Home() {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('nl');
  const [sessionId] = useState(() => {
    // Try to get existing session ID from localStorage
    if (typeof window !== 'undefined') {
      const existingSessionId = localStorage.getItem('hr_bot_session_id');
      if (existingSessionId) {
        console.log('📌 [Frontend] Existing session ID restored:', existingSessionId);
        return existingSessionId;
      }
    }

    // Generate new session ID
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('hr_bot_session_id', newSessionId);
      console.log('🆕 [Frontend] New session ID created:', newSessionId);
    }

    return newSessionId;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll naar beneden wanneer nieuwe messages komen
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ========================================
  // MESSAGE HANDLER
  // ========================================
  /**
   * Stuurt een message naar de API en verwerkt het antwoord
   *
   * FLOW:
   * 1. Voeg user message toe aan chat
   * 2. Stuur request naar /api/chat met message + geschiedenis + taal
   * 3. Ontvang antwoord van API
   * 4. Voeg assistant antwoord toe aan chat
   * 5. Bij errors: toon error message aan gebruiker
   */
  const handleSendMessage = async (content: string) => {
    console.log('🚀 [Frontend] Send message initiated');
    console.log('🔑 [Frontend] Session ID:', sessionId);

    // Voeg user message meteen toe aan de chat
    const userMessage: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    console.log('📤 [Frontend] User message:', content);
    setIsLoading(true);  // Toon loading indicator

    // Variables voor streaming
    let streamedContent = '';
    let citations: any[] = [];
    let logId: string | null = null;
    let usage: any = undefined;
    let hasReceivedFirstContent = false;  // Track of we al content hebben ontvangen

    try {
      // Stuur request naar API (STREAMING)
      console.log('🌊 [Frontend] Starting streaming request to /api/chat');
      console.log('📊 [Frontend] Payload:', {
        message: content,
        historyLength: messages.length,
        language: selectedLanguage,
        sessionId: sessionId
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationHistory: messages,
          language: selectedLanguage,
          sessionId: sessionId
        })
      });

      console.log('📥 [Frontend] Response status:', response.status);

      // Check voor errors (niet-streaming)
      if (!response.ok) {
        const data = await response.json();
        console.error('❌ [Frontend] Error:', data.error || 'Unknown');

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

      // ========================================
      // STREAMING RESPONSE HANDLING
      // ========================================
      console.log('🌊 [Frontend] Reading streaming response...');

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
          console.log('✅ [Frontend] Stream completed');
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
                logId = eventData.logId || null;  // ← HAAL LOGID UIT METADATA!
                console.log('📎 [Frontend] Received citations:', citations.length);
                console.log('🔑 [Frontend] Received logId:', logId);
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
                console.log('✅ [Frontend] Stream done');

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
              console.error('⚠️ [Frontend] Failed to parse event:', line);
            }
          }
        }
      }

    } catch (error: any) {
      console.error('\n❌ [Frontend] ERROR:', error?.message || 'Unknown');

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
      console.log('🏁 [Frontend] Request completed');
      setIsLoading(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Logo Background Pattern - Subtiel op achtergrond */}
      <LogoBackground />

      {/* Main Content - Boven background */}
      <div className="relative z-10 flex flex-col h-full overflow-hidden">
        {/* Header met logo en taal selector */}
        <div className="flex-shrink-0">
          <ChatHeader
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
          />
        </div>

        {/* Chat Area - SCROLLABLE (alleen dit deel scroll!) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Toon welkomstscherm als er nog geen messages zijn */}
            {messages.length === 0 ? (
              <WelcomeScreen selectedLanguage={selectedLanguage} />
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
                  />
                ))}
                {/* Loading indicator tijdens wachten op antwoord */}
                {isLoading && <LoadingIndicator />}
                {/* Invisible div voor auto-scroll */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Fixed onderaan */}
        <div className="flex-shrink-0">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            selectedLanguage={selectedLanguage}
          />
        </div>
      </div>
    </div>
  );
}
