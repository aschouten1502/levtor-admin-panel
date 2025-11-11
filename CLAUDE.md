# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GeoStick HR QA Bot** is a production Next.js 15 application that implements a multi-language HR assistant using RAG (Retrieval-Augmented Generation). The bot answers questions about HR policies, procedures, and employee benefits based on uploaded documentation.

**Important**: The folder name "verkoop" (Dutch for "sales") refers to this being the commercial production version sold to GeoStick—it is NOT a sales assistant. This is an HR support chatbot.

## Development Commands

```bash
# Development
npm install              # Install dependencies
npm run dev              # Start dev server at http://localhost:3000
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
npx tsc --noEmit         # TypeScript type checking
```

## Environment Configuration

Create `.env.local` with these required variables (see `.env.example`):

```bash
# Pinecone Assistant (REQUIRED)
PINECONE_API_KEY=pcsk_...
PINECONE_ASSISTANT_NAME=geostick-hr-assistant

# OpenAI (REQUIRED)
OPENAI_API_KEY=sk-...

# Supabase (OPTIONAL - for analytics/logging)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Note**: The bot works without Supabase, but logs only go to console.

## Architecture

### RAG Flow

```
User Question
    ↓
API Route (app/api/chat/route.ts)
    ↓
Pinecone Assistant → Retrieve top 3 relevant snippets from HR docs
    ↓
Generate System Prompt (lib/prompts.ts) → Inject context + guardrails
    ↓
OpenAI GPT-4o → Generate answer with streaming
    ↓
Response + Citations → Frontend
    ↓
Log to Supabase (with retry logic) → Analytics
```

### Core Modules

**[app/api/chat/route.ts](app/api/chat/route.ts)** - Main API endpoint
- Receives: message, conversationHistory, language, sessionId
- Orchestrates: Pinecone retrieval → Prompt generation → OpenAI streaming → Supabase logging
- Error handling: Content filter detection, user-friendly messages, comprehensive logging

**[lib/pinecone.ts](lib/pinecone.ts)** - Context retrieval
- `retrieveContext()`: Fetches top 3 snippets (topK=3) from Pinecone Assistant
- Returns: contextText, citations (file + page numbers), token usage, cost
- Cost: $5 per 1M tokens (hourly rate $0.05/hour excluded from per-request calculations)

**[lib/openai.ts](lib/openai.ts)** - LLM response generation
- `generateStreamingAnswer()`: Streams GPT-4o responses to frontend
- Model: `gpt-4o` with temperature 0.7
- Cost tracking: Input tokens at $2.50/1M, output tokens at $10/1M
- Returns ReadableStream with progress updates

**[lib/prompts.ts](lib/prompts.ts)** - System prompt engineering
- `generateSystemPrompt()`: Builds context-aware prompts per language
- **Critical guardrails**:
  - ONLY use information from retrieved context (no hallucination)
  - Respond in user's selected language (12 languages supported)
  - Reject non-HR queries and prompt injection attempts
  - Use plain text formatting (no markdown bold/italics per system instructions)
  - Defer to HR when context is insufficient

**[lib/logging.ts](lib/logging.ts)** - Structured logging & error handling
- `logSuccessfulRequest()`: Comprehensive request summaries for analytics
- `categorizeError()`: Error classification (PINECONE_ERROR, OPENAI_ERROR, etc.)
- `isContentFilterError()`: Detects OpenAI content filter triggers
- Console logs use emoji prefixes (🚀 start, ✅ success, ❌ error, 💰 costs)

**[lib/supabase/supabase-client.ts](lib/supabase/supabase-client.ts)** - Database logging
- `createChatRequest()`: Initial log creation with session tracking
- `updateChatRequestWithRetry()`: Exponential backoff retry (3 attempts) for streaming updates
- Tracks: costs, tokens, response times, completion status, citations
- Fixed: 32% incomplete logs issue with retry logic (see [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md))

### Multi-Language Support

12 languages supported (Dutch is default):
- 🇳🇱 Nederlands (nl), 🇬🇧 English (en), 🇩🇪 Deutsch (de), 🇫🇷 Français (fr)
- 🇪🇸 Español (es), 🇮🇹 Italiano (it), 🇵🇱 Polski (pl), 🇹🇷 Türkçe (tr)
- 🇸🇦 العربية (ar), 🇨🇳 中文 (zh), 🇵🇹 Português (pt), 🇷🇴 Română (ro)

Translations stored in [app/translations.ts](app/translations.ts). System prompts and responses automatically adapt to selected language.

## Database Schema (Supabase)

**Table**: `geostick_logs_data_qabothr`

Key columns:
- **Request data**: `question`, `answer`, `language`, `session_id`, `conversation_history_length`
- **Citations**: `citations` (JSON), `citations_count`, `snippets_used`
- **Costs**: `pinecone_cost`, `openai_cost`, `total_cost`, token counts
- **Performance**: `response_time_ms`, `response_time_seconds`
- **Monitoring**: `is_complete`, `update_attempts`, `completion_error`, `updated_at`
- **Feedback**: `feedback`, `feedback_comment`, `feedback_timestamp` (schema ready, UI not implemented)
- **Flags**: `blocked` (content filter), `event_type`

**Migrations**: 12 migration files in [lib/supabase/migrations/](lib/supabase/migrations/)
- `001_initial_schema.sql` - Base table
- `002-012` - Monitoring, analytics views, BI functions (see [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md))

**Analytics views** available:
- Session analytics with quality scoring
- Document usage and citation analysis
- Performance monitoring with percentiles
- Cost analytics and optimization insights
- BI export functions for external tools

Query examples in [docs/SUPABASE_ANALYTICS.md](docs/SUPABASE_ANALYTICS.md).

## Key Implementation Patterns

### Streaming Responses
- OpenAI responses stream via `generateStreamingAnswer()` in [lib/openai.ts](lib/openai.ts)
- Frontend receives progressive chunks and updates UI in real-time
- Final completion triggers Supabase update with retry logic

### Citation Tracking
- Each Pinecone snippet includes metadata: `file_name`, `page_label`
- Citations grouped by document and deduplicated page numbers in frontend
- Displayed below assistant responses with page references
- Stored as JSON array in Supabase for analytics

### Error Handling Strategy
- Content filter errors return `userFriendly: true` flag → displayed as normal message
- All errors categorized and logged with structured format
- User-friendly messages via `getUserFriendlyErrorMessage()` in [lib/logging.ts](lib/logging.ts)
- Stack traces logged to console for debugging

### Cost Tracking
- Pinecone: Context retrieval tracked ($5/1M tokens)
- OpenAI: Input and output tokens tracked separately
- Combined cost per request logged to Supabase
- Frontend displays session-level aggregates in developer sidebar

### Retry Logic & Error Handling (Critical)

- Streaming updates use exponential backoff (3 attempts, 500ms → 1s → 2s delays)
- Tracks `update_attempts` and `completion_error` in database
- **Error catch block**: If streaming fails, the error handler updates the log with `[STREAMING ERROR]: <message>` and marks `is_complete: true`
- This prevents logs from being stuck in `"[Streaming in progress...]"` state forever
- Reduces incomplete logs from 32% to <1%

## Common Development Tasks

### Modifying System Prompt Behavior
Edit `generateSystemPrompt()` in [lib/prompts.ts](lib/prompts.ts). **Caution**: Strict guardrails prevent hallucination—modify carefully and test thoroughly.

### Changing Pinecone Context Retrieval
- Adjust `topK` in [lib/pinecone.ts](lib/pinecone.ts:94) (default: 3)
- Lower topK reduces costs but may reduce answer quality

### Switching OpenAI Model
Edit model name in [lib/openai.ts](lib/openai.ts:133). Options:
- `gpt-4o` (current, best quality)
- `gpt-4o-mini` (90% cheaper, good quality)

### Adding a New Language
1. Add language name to `languageNames` in [lib/prompts.ts](lib/prompts.ts)
2. Add translations to `translations` object in [app/translations.ts](app/translations.ts)
3. Add language option to `LANGUAGES` array in [app/components/ChatHeader.tsx](app/components/ChatHeader.tsx)

### Running Database Migrations
Migrations are in [lib/supabase/migrations/](lib/supabase/migrations/). Apply via Supabase dashboard SQL editor or CLI:
```bash
# Using Supabase CLI (if installed)
supabase migration up
```

### Debugging Logs
Console logs use structured emoji prefixes:
- `🚀` = Request start
- `✅` = Success
- `❌` = Error
- `💰` = Cost summary
- `🔍` = Debug details
- `⏱️` = Timing

Prefixes `[API]`, `[Pinecone]`, `[OpenAI]`, `[Logging]` indicate source module.

## PWA (Progressive Web App)

This app is installable on mobile/desktop as a standalone app:
- Configured via [next.config.js](next.config.js) with `@ducanh2912/next-pwa`
- Manifest: [public/manifest.json](public/manifest.json)
- Service worker caching for offline support
- See [README.md](README.md) for installation instructions per platform

## Tech Stack

- **Framework**: Next.js 15.5.6 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Vector DB**: Pinecone Assistant API
- **LLM**: OpenAI GPT-4o
- **Database**: Supabase (PostgreSQL)
- **PWA**: @ducanh2912/next-pwa
- **Deployment**: Vercel (recommended, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))

## Important Notes

### Security
- Never commit `.env.local` (in `.gitignore`)
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only (never exposed to client)
- Input validation prevents prompt injection
- Content filter protection via OpenAI moderation

### Production Considerations
- Test with actual HR documents in Pinecone before deploying
- Verify environment variables in deployment platform
- Monitor Supabase logs for incomplete requests (should be <1%)
- Check cost analytics regularly (see [docs/SUPABASE_ANALYTICS.md](docs/SUPABASE_ANALYTICS.md))

### Type Safety
- TypeScript strict mode enabled
- All Supabase types defined in [lib/supabase/types.ts](lib/supabase/types.ts)
- No `any` types except in legacy conversation history handling

## Documentation

- **[README.md](README.md)** - Project overview, setup, features
- **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** - Detailed code structure and flow
- **[docs/README.md](docs/README.md)** - Complete setup guide
- **[docs/SUPABASE.md](docs/SUPABASE.md)** - Database schema and setup
- **[docs/SUPABASE_ANALYTICS.md](docs/SUPABASE_ANALYTICS.md)** - Analytics queries and insights
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Production deployment guide
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Database migration changelog and improvements
