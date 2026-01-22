/**
 * ========================================
 * CHAT API ROUTE - Main Entry Point
 * ========================================
 *
 * Dit is de hoofdroute voor de chatbot. Wanneer een gebruiker een vraag stelt,
 * komt de request hier binnen.
 *
 * FLOW:
 * 1. Ontvang vraag van gebruiker + conversatie geschiedenis
 * 2. Haal relevante context op uit Supabase RAG (HR documenten)
 * 3. Genereer system prompt met context
 * 4. Vraag OpenAI om antwoord te genereren
 * 5. Stuur antwoord + citations terug naar gebruiker
 * 6. Log alles voor analytics en debugging
 *
 * UPDATE v2.1: Pinecone vervangen door Supabase RAG
 * - ~99% kostenbesparing op context retrieval
 * - Zelfde interface voor backwards compatibility
 */

import { NextRequest, NextResponse } from 'next/server';

// Import alle modules
// UPDATED: Pinecone vervangen door Supabase RAG
import { retrieveContext } from '@/lib/rag/context';
import { checkRateLimit, getRateLimitKey, getClientIp, RATE_LIMITS } from '@/lib/shared/rate-limiter';
import { initializeOpenAI, prepareMessages, generateStreamingAnswer } from '@/lib/bot/openai';
import { generateSystemPrompt } from '@/lib/products/hr-bot/prompts';
import {
  logSuccessfulRequest,
  logError,
  logContentFilter,
  isContentFilterError,
  getUserFriendlyErrorMessage,
  categorizeError,
  type RequestSummary
} from '@/lib/shared/logging';
import { updateChatRequestWithRetry } from '@/lib/shared/supabase/supabase-client';

// ========================================
// VALIDATION CONSTANTS
// ========================================

const SUPPORTED_LANGUAGES = ['nl', 'en', 'de', 'fr', 'es', 'it', 'pl', 'tr', 'ar', 'zh', 'pt', 'ro'];
const MAX_MESSAGE_LENGTH = 10000;

// ========================================
// MAIN API HANDLER
// ========================================

export async function POST(request: NextRequest) {
  // Start timing voor performance tracking
  const requestStartTime = Date.now();
  console.log('🚀 [API] Chat request received');
  console.log('⏱️  [API] Request start time:', new Date(requestStartTime).toISOString());

  // Get waitUntil from NextRequest context (Vercel Edge/Serverless feature)
  // @ts-ignore - waitUntil may not be in types yet
  const waitUntil = request.waitUntil?.bind(request);

  // Initialiseer variabelen
  let message: string = '';
  let conversationHistory: any[] = [];
  let language: string = 'nl';
  let tenantId: string = '';

  try {
    // ========================================
    // STEP 1: Parse en valideer de request
    // ========================================
    const body = await request.json();
    message = body.message;
    conversationHistory = body.conversationHistory;
    language = body.language || 'nl';
    const sessionId = body.sessionId;

    // ========================================
    // STEP 1.5: Get Tenant ID (MULTI-TENANT)
    // ========================================
    // Priority: 1. Request body, 2. Header (from middleware)
    // NOTE: Geen env var fallback meer - tenant moet expliciet zijn
    tenantId = body.tenantId || request.headers.get('x-tenant-id') || '';

    const tenantSource = body.tenantId ? 'body'
      : request.headers.get('x-tenant-id') ? 'header'
      : 'none';

    console.log('\n📝 [API] ========== USER QUESTION ==========');
    console.log('🔑 [API] Session ID:', sessionId || 'NO_SESSION_ID');
    console.log('🏢 [API] Tenant ID:', tenantId || 'NOT_SET', `(source: ${tenantSource})`);
    console.log('❓ [API] Question:', message);
    console.log('💬 [API] Conversation history length:', conversationHistory?.length || 0);
    console.log('🌐 [API] Selected language:', language);

    // ========================================
    // STEP 1.6: Validatie
    // ========================================

    // Valideer tenant ID
    if (!tenantId) {
      console.log('❌ [API] No tenant ID provided');
      return NextResponse.json(
        {
          error: 'tenant_required',
          message: 'Tenant ID is required. Provide via ?tenant=xxx, X-Tenant-ID header, or request body.'
        },
        { status: 400 }
      );
    }

    // Valideer message
    if (!message || typeof message !== 'string') {
      console.log('❌ [API] No message provided');
      return NextResponse.json(
        { error: 'validation_error', message: 'Message is required' },
        { status: 400 }
      );
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      console.log('❌ [API] Empty message after trim');
      return NextResponse.json(
        { error: 'validation_error', message: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      console.log('❌ [API] Message too long:', trimmedMessage.length);
      return NextResponse.json(
        {
          error: 'validation_error',
          message: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`
        },
        { status: 400 }
      );
    }

    // Use trimmed message from here
    message = trimmedMessage;

    // Valideer language
    if (language && !SUPPORTED_LANGUAGES.includes(language)) {
      console.warn(`⚠️ [API] Invalid language "${language}", defaulting to "nl"`);
      language = 'nl';
    }

    // ========================================
    // STEP 1.7: Rate Limiting
    // ========================================
    const clientIp = getClientIp(request);
    const rateLimitKey = getRateLimitKey(tenantId, clientIp, 'chat');
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.chat);

    if (!rateLimit.allowed) {
      console.log('🚫 [API] Rate limit exceeded for:', rateLimitKey);
      return NextResponse.json(
        {
          error: 'rate_limit_exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
            'X-RateLimit-Remaining': '0'
          }
        }
      );
    }

    // ========================================
    // STEP 2: Check environment configuratie
    // ========================================
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('🔑 [API] OpenAI API Key exists:', !!openaiApiKey);
    console.log('🔑 [API] Supabase configured:', !!supabaseUrl && !!supabaseKey);

    if (!openaiApiKey) {
      console.log('❌ [API] Missing OpenAI API key');
      return NextResponse.json(
        { error: 'Server configuration error: Missing OpenAI API key' },
        { status: 500 }
      );
    }

    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ [API] Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase configuration' },
        { status: 500 }
      );
    }

    // ========================================
    // STEP 3: Haal context op via Supabase RAG
    // ========================================
    const {
      contextText,
      citations,
      embeddingTokens,
      embeddingCost,
      ragDetails  // NEW: Capture RAG pipeline details for logging
    } = await retrieveContext(tenantId, message);

    // Voor backwards compatibility gebruiken we dezelfde variabelenamen
    const ragTokens = embeddingTokens;
    const ragCost = embeddingCost;

    // ========================================
    // STEP 4: Genereer system prompt
    // ========================================
    const systemPrompt = generateSystemPrompt(contextText, language);

    // ========================================
    // STEP 5: Initialiseer OpenAI en start streaming
    // ========================================
    const openaiClient = initializeOpenAI(openaiApiKey);
    const messages = prepareMessages(systemPrompt, conversationHistory, message);

    console.log('\n🌊 [API] Starting streaming response...');

    // BELANGRIJKE WIJZIGING: Maak een placeholder log VOOR streaming
    // Dit geeft ons een logId voor de feedback duimpjes
    // We updaten de log later met de echte data
    let logId: string | null = null;
    try {
      const placeholderSummary: RequestSummary = {
        tenant_id: tenantId,  // Required for multi-tenant
        session_id: sessionId || 'NO_SESSION_ID',
        timestamp: new Date(requestStartTime).toISOString(),
        question: message,
        answer: '[Streaming in progress...]', // Placeholder
        response_time_seconds: 0,
        response_time_ms: 0,
        embedding_tokens: ragTokens, // Supabase pgvector embedding tokens
        embedding_cost: parseFloat(ragCost.toFixed(6)), // Supabase pgvector embedding cost
        openai_input_tokens: 0, // Wordt later geupdate
        openai_output_tokens: 0,
        openai_total_tokens: 0,
        openai_cost: 0,
        total_cost: parseFloat(ragCost.toFixed(6)),
        snippets_used: citations.length,
        citations_count: citations.length,
        conversation_history_length: conversationHistory?.length || 0,
        language: language,
        citations: citations,
        rag_details: ragDetails  // NEW: Include RAG pipeline details
      };
      logId = await logSuccessfulRequest(placeholderSummary);
      console.log('✅ [API] Placeholder log created with ID:', logId);
    } catch (err) {
      console.error('⚠️ [API] Failed to create placeholder log:', err);
    }

    // Genereer streaming response
    const stream = await generateStreamingAnswer(openaiClient, messages, language);

    // Voeg metadata toe aan de stream (citations, pinecone cost, session, logId!)
    const encoder = new TextEncoder();

    // Shared variables voor de Supabase update (accessible outside stream)
    let fullAnswer = '';
    let finalUsage: any = null;
    let streamComplete = false;
    let streamError: Error | null = null;

    const transformedStream = new ReadableStream({
      async start(controller) {
        try {
          // Stuur eerst de metadata (citations, RAG info, EN logId!)
          const metadataEvent = JSON.stringify({
            type: 'metadata',
            citations: citations,
            ragTokens: ragTokens,           // Supabase RAG embedding tokens
            ragCost: parseFloat(ragCost.toFixed(6)), // Supabase RAG cost
            sessionId: sessionId || 'NO_SESSION_ID',
            requestStartTime: requestStartTime,
            logId: logId
          });
          controller.enqueue(encoder.encode(`data: ${metadataEvent}\n\n`));

          // Pipe de OpenAI stream door EN verzamel data voor update
          const reader = stream.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();

            // Parse het chunk VOOR we checken of done
            if (value) {
              // Decode de chunk om de data te extraheren
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const eventData = JSON.parse(line.slice(6));

                    // Verzamel content voor fullAnswer
                    if (eventData.type === 'content') {
                      fullAnswer += eventData.content;
                    }

                    // Verzamel usage voor Supabase update
                    if (eventData.type === 'done') {
                      finalUsage = eventData.usage;
                      fullAnswer = eventData.fullAnswer || fullAnswer;
                    }
                  } catch (e) {
                    // Parsing error, skip
                  }
                }
              }

              // Forward de chunk naar de client
              controller.enqueue(value);
            }

            // Check done NA het parsen
            if (done) break;
          }

          streamComplete = true;
          controller.close();
        } catch (error) {
          console.error('❌ [API] Streaming error:', error);
          streamError = error instanceof Error ? error : new Error('Unknown streaming error');
          streamComplete = true;

          const errorEvent = JSON.stringify({
            type: 'error',
            message: streamError.message
          });
          controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
          controller.close();
        }
      }
    });

    // ========================================
    // CRITICAL FIX: Gebruik waitUntil (Vercel) of schedule update AFTER response
    // Dit garandeert dat de Supabase update uitgevoerd wordt, ook na stream close
    // ========================================
    const performSupabaseUpdate = async () => {
      // Wacht tot stream compleet is (max 30 seconden)
      const maxWaitTime = 30000;
      const startWait = Date.now();

      while (!streamComplete && (Date.now() - startWait) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Bereken timing
      const requestEndTime = Date.now();
      const responseTimeMs = requestEndTime - requestStartTime;
      const responseTimeSeconds = parseFloat((responseTimeMs / 1000).toFixed(2));

      console.log('\n⏱️  [API] ========== TIMING ==========');
      console.log('⏱️  [API] Total response time:', responseTimeSeconds, 'seconds');
      console.log('⏱️  [API] Stream complete:', streamComplete);

      if (!logId) {
        console.error('❌ [API] No logId available for Supabase update');
        return;
      }

      // Check if we had a streaming error
      if (streamError) {
        console.log('🔄 [API] Updating Supabase log with streaming error...');
        try {
          const result = await updateChatRequestWithRetry(logId, {
            answer: `[STREAMING ERROR]: ${streamError.message}`,
            response_time_seconds: responseTimeSeconds,
            response_time_ms: responseTimeMs,
            openai_input_tokens: 0,
            openai_output_tokens: 0,
            openai_total_tokens: 0,
            openai_cost: 0,
            total_cost: parseFloat(ragCost.toFixed(6))
          }, 3);

          if (result.success) {
            console.log(`✅ [API] Error log updated (${result.attempts} attempt(s))`);
          } else {
            console.error(`❌ [API] Failed to update error log after ${result.attempts} attempts:`, result.error);
          }
        } catch (err) {
          console.error('⚠️ [API] Error updating error log:', err);
        }
        return;
      }

      // Normal completion - update with full data
      if (finalUsage && fullAnswer) {
        const totalCost = parseFloat(ragCost.toFixed(6)) + (finalUsage.totalCost || 0);

        // Update ragDetails with OpenAI information
        const finalRagDetails = ragDetails ? {
          ...ragDetails,
          openai: {
            model: 'gpt-4o',
            temperature: 0.7,
            systemPromptTokens: 0, // Would need to calculate from system prompt
            inputTokens: finalUsage.inputTokens || 0,
            outputTokens: finalUsage.outputTokens || 0,
            totalTokens: finalUsage.totalTokens || 0,
            streamingDurationMs: responseTimeMs - (ragDetails.timing?.totalMs || 0)
          },
          costs: {
            ...(ragDetails.costs || {}),
            openai: finalUsage.totalCost || 0,
            total: totalCost
          },
          timing: {
            ...(ragDetails.timing || {}),
            openaiMs: responseTimeMs - (ragDetails.timing?.totalMs || 0),
            totalMs: responseTimeMs
          }
        } : undefined;

        console.log('🔄 [API] Updating Supabase log with final data (with retry)...');
        try {
          const result = await updateChatRequestWithRetry(logId, {
            answer: fullAnswer,
            response_time_seconds: responseTimeSeconds,
            response_time_ms: responseTimeMs,
            openai_input_tokens: finalUsage.inputTokens || 0,
            openai_output_tokens: finalUsage.outputTokens || 0,
            openai_total_tokens: finalUsage.totalTokens || 0,
            openai_cost: finalUsage.totalCost || 0,
            total_cost: totalCost,
            rag_details: finalRagDetails  // Include updated RAG details
          }, 3);

          if (result.success) {
            console.log(`✅ [API] Supabase log updated successfully (${result.attempts} attempt(s))`);
          } else {
            console.error(`❌ [API] Failed to update Supabase log after ${result.attempts} attempts:`, result.error);
          }
        } catch (err) {
          console.error('⚠️ [API] Error updating Supabase log:', err);
        }
      } else {
        // Incomplete data - still update to avoid "[Streaming in progress...]"
        console.warn('⚠️ [API] Incomplete streaming data:', {
          hasUsage: !!finalUsage,
          hasAnswer: !!fullAnswer,
          answerLength: fullAnswer.length
        });

        try {
          console.log('🔄 [API] Updating Supabase log with incomplete data...');
          const result = await updateChatRequestWithRetry(logId, {
            answer: fullAnswer || '[ERROR]: No answer received from OpenAI',
            response_time_seconds: responseTimeSeconds,
            response_time_ms: responseTimeMs,
            openai_input_tokens: finalUsage?.inputTokens || 0,
            openai_output_tokens: finalUsage?.outputTokens || 0,
            openai_total_tokens: finalUsage?.totalTokens || 0,
            openai_cost: finalUsage?.totalCost || 0,
            total_cost: parseFloat(ragCost.toFixed(6)) + (finalUsage?.totalCost || 0)
          }, 3);

          if (result.success) {
            console.log(`✅ [API] Incomplete log updated (${result.attempts} attempt(s))`);
          } else {
            console.error(`❌ [API] Failed to update incomplete log after ${result.attempts} attempts:`, result.error);
          }
        } catch (err) {
          console.error('⚠️ [API] Error updating incomplete log:', err);
        }
      }
    };

    // Use waitUntil if available (Vercel), otherwise run in background (best effort)
    if (waitUntil) {
      console.log('✅ [API] Using waitUntil for guaranteed Supabase update');
      waitUntil(performSupabaseUpdate());
    } else {
      console.log('⚠️ [API] waitUntil not available, running update in background (best effort)');
      performSupabaseUpdate().catch(err => {
        console.error('❌ [API] Background update failed:', err);
      });
    }

    // Return streaming response
    return new Response(transformedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    // ========================================
    // ERROR HANDLING
    // ========================================

    // Check of dit een content filter error is
    if (isContentFilterError(error)) {
      logContentFilter(requestStartTime, message, conversationHistory, tenantId || undefined);

      return NextResponse.json(
        {
          error: 'content_filter',
          message: 'Je vraag bevat termen die automatisch worden geblokkeerd om misbruik te voorkomen. Als je vraag echt HR-gerelateerd is, neem dan contact op met je leidinggevende of de HR-afdeling voor een persoonlijk gesprek.',
          userFriendly: true
        },
        { status: 400 }
      );
    }

    // Log de error met volledige context
    logError(error, requestStartTime, message, conversationHistory, language, tenantId || undefined);

    // Categoriseer de error en geef user-friendly message
    const { category, source } = categorizeError(error);
    const userMessage = getUserFriendlyErrorMessage(category);

    return NextResponse.json(
      {
        error: category,
        message: userMessage,
        details: error?.message || 'Unknown error',
        type: error?.name || 'Error',
        source: source
      },
      { status: 500 }
    );
  }
}
