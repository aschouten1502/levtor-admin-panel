'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: any[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// SessionStats interface removed - not needed for production end-user version

// 12 most common languages in Netherlands
const LANGUAGES = [
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' }
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('nl');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 [Frontend] Send message initiated');

    if (!input.trim() || isLoading) {
      console.log('⚠️ [Frontend] Blocked: empty input or already loading');
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    console.log('📤 [Frontend] User message:', input);
    setInput('');
    setIsLoading(true);

    try {
      console.log('🌐 [Frontend] Sending fetch request to /api/chat');
      console.log('📊 [Frontend] Payload:', {
        message: input,
        historyLength: messages.length
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversationHistory: messages
        })
      });

      console.log('📥 [Frontend] Response status:', response.status);
      const data = await response.json();
      console.log('📦 [Frontend] Response data:', data);

      if (!response.ok) {
        console.error('❌ [Frontend] Response not OK:', data);

        // Check if this is a user-friendly error (like content filter)
        if (data.userFriendly && data.message) {
          const errorMessage: Message = {
            role: 'assistant',
            content: data.message
          };
          setMessages(prev => [...prev, errorMessage]);
          return; // Don't throw, just show the message
        }

        throw new Error(data.error || 'Failed to send message');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        citations: data.citations,
        usage: data.usage
      };

      console.log('✅ [Frontend] Adding assistant message to state');
      setMessages(prev => [...prev, assistantMessage]);

      // Cost tracking removed from frontend - still logged in backend for your monitoring
    } catch (error: any) {
      console.error('❌ [Frontend] Error caught:', error);
      console.error('❌ [Frontend] Error message:', error?.message);
      console.error('❌ [Frontend] Error stack:', error?.stack);

      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, er is een fout opgetreden: ${error?.message || 'Unknown error'}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      console.log('🏁 [Frontend] Request completed, setting loading to false');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Main Content - Full Width with Geostick Branding */}
      <div className="flex-1 flex flex-col relative">
        {/* Subtle Background Logo Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] overflow-hidden">
          <img
            src="/Afbeeldingen/Geosticklogo.png"
            alt="Geostick"
            className="w-[800px] h-auto"
          />
        </div>

        {/* Header with Geostick Branding */}
        <header className="bg-white border-b-4 border-[#e32219] shadow-sm p-4 relative z-10">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img
                src="/Afbeeldingen/Geosticklogo.png"
                alt="Geostick"
                className="h-12 w-auto"
              />
              <div className="border-l-2 border-gray-200 pl-4">
                <h1 className="text-2xl font-bold text-[#333333] tracking-tight uppercase">
                  HR ASSISTENT
                </h1>
                <p className="text-sm text-[#4a4a4a]">
                  Stel je vragen over HR beleid en procedures
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="px-5 py-2.5 text-sm font-semibold bg-[#f5f5f5] text-[#333333] uppercase tracking-wide hover:bg-[#e8e8e8] transition-colors border border-[#b5b5b5]"
              >
                NIEUW GESPREK
              </button>
            )}
          </div>
        </header>

        {/* Chat Container with Geostick Styling */}
        <div className="flex-1 overflow-hidden max-w-5xl w-full mx-auto p-6 relative z-10">
          <div className="h-full bg-[#f5f5f5] border-2 border-[#b5b5b5] flex flex-col">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-8xl mb-6">💬</div>
                  <h2 className="text-2xl font-bold text-[#333333] mb-3 uppercase tracking-wide">
                    Welkom bij Geostick HR Assistent
                  </h2>
                  <p className="text-[#4a4a4a] text-lg">
                    Stel een vraag om te beginnen
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-5 border-2 ${
                        msg.role === 'user'
                          ? 'bg-[#e32219] text-white border-[#e32219]'
                          : 'bg-white text-[#333333] border-[#b5b5b5]'
                      }`}
                    >
                      {/* Render message content - strip markdown formatting */}
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        {msg.content.split('\n').map((line, idx) => {
                          // Remove markdown bold (**text**)
                          const cleanLine = line.replace(/\*\*(.*?)\*\*/g, '$1');

                          // Check if it's a numbered list item
                          const numberMatch = cleanLine.match(/^(\d+)\.\s+(.+)/);
                          if (numberMatch) {
                            return (
                              <div key={idx} className="mb-2">
                                <span className="font-semibold">{numberMatch[1]}. </span>
                                <span>{numberMatch[2]}</span>
                              </div>
                            );
                          }

                          // Check if it's a bullet point
                          if (cleanLine.startsWith('- ')) {
                            return (
                              <div key={idx} className="mb-1 ml-4">
                                • {cleanLine.substring(2)}
                              </div>
                            );
                          }

                          // Regular line
                          if (cleanLine.trim()) {
                            return <p key={idx} className="mb-2">{cleanLine}</p>;
                          }
                          return <br key={idx} />;
                        })}
                      </div>

                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-4 pt-4 border-t-2 border-[#ece31e]">
                          <p className="text-xs font-bold mb-3 text-[#333333] uppercase tracking-wide">
                            📚 Bronnen
                          </p>
                          <div className="space-y-2">
                            {/* Group citations by file */}
                            {(() => {
                              const fileMap = new Map();
                              msg.citations.forEach((citation: any) => {
                                citation.references?.forEach((ref: any) => {
                                  const fileName = ref.file?.name || 'Onbekend';
                                  const pages = ref.pages || [];
                                  if (!fileMap.has(fileName)) {
                                    fileMap.set(fileName, new Set());
                                  }
                                  pages.forEach((page: number) => fileMap.get(fileName).add(page));
                                });
                              });

                              return Array.from(fileMap.entries()).map(([fileName, pagesSet], idx) => {
                                const sortedPages = Array.from(pagesSet).sort((a: any, b: any) => a - b);
                                return (
                                  <div key={idx} className="text-sm text-[#4a4a4a] flex items-start gap-2 bg-[#f5f5f5] p-2 border-l-4 border-[#ece31e]">
                                    <span className="text-[#e32219] font-bold">•</span>
                                    <span>
                                      <span className="font-semibold">{fileName}</span>
                                      {sortedPages.length > 0 && (
                                        <span className="opacity-75"> (pagina {sortedPages.join(', ')})</span>
                                      )}
                                    </span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border-2 border-[#b5b5b5] p-5">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 bg-[#e32219] rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-[#ece31e] rounded-full animate-bounce delay-100"></div>
                        <div className="w-3 h-3 bg-[#e32219] rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Form with Geostick Styling */}
          <form onSubmit={sendMessage} className="p-6 border-t-4 border-[#ece31e] bg-white">
            <div className="flex space-x-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Stel een vraag..."
                disabled={isLoading}
                className="flex-1 px-5 py-4 border-2 border-[#b5b5b5] focus:outline-none focus:border-[#e32219] text-[#333333] placeholder-[#b5b5b5] disabled:opacity-50 disabled:bg-[#f5f5f5] text-lg"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-8 py-4 bg-[#e32219] text-white border-2 border-[#e32219] hover:bg-[#c01d15] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold uppercase tracking-wide text-sm"
              >
                VERSTUUR
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
