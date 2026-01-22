/**
 * ========================================
 * BOT MODULE - Generic LLM Services
 * ========================================
 *
 * Dit module bevat generieke LLM functionaliteit:
 * - OpenAI LLM integratie (streaming responses)
 *
 * Product-specifieke prompts staan in lib/products/[product]/prompts.ts
 * Bijvoorbeeld: lib/products/hr-bot/prompts.ts
 *
 * Gebruikt door:
 * - app/api/chat/route.ts (hoofd chat endpoint)
 * - lib/products/hr-bot/qa/executor.ts (QA testing)
 */

// OpenAI LLM integratie
export {
  initializeOpenAI,
  prepareMessages,
  generateAnswer,
  generateStreamingAnswer,
  type ConversationMessage,
  type OpenAIResponse
} from './openai';
