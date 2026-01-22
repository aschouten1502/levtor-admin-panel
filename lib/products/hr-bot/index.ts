/**
 * ========================================
 * HR Bot Product Module
 * ========================================
 *
 * Dit is de product-specifieke code voor de HR Bot.
 * Bevat alle HR-specifieke logica die niet herbruikbaar is
 * voor andere producten (School App, Voice Agent, etc.)
 *
 * Exports:
 * - prompts: System prompt generation voor HR assistant
 * - qa/: QA testing module voor HR Bot
 *
 * Locatie: lib/products/hr-bot/index.ts
 */

// System prompts voor HR assistant
export {
  generateSystemPrompt,
  languageNames
} from './prompts';

// QA module wordt apart geëxporteerd via lib/products/hr-bot/qa/
