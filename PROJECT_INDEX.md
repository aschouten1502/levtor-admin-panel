# 📁 Project Index - GeoStick HR QA Bot

Quick navigation guide for all project files and folders.

## 📂 Directory Structure

```
geostick-verkoop-hr-bot/
├── 📱 app/                          # Next.js App Router
│   ├── api/chat/route.ts           # Main chat API endpoint
│   ├── components/                 # React UI components
│   ├── page.tsx                    # Chat interface
│   ├── layout.tsx                  # Root layout
│   ├── translations.ts             # 12 language translations
│   └── globals.css                 # Global styles
│
├── 🔧 lib/                          # Core business logic
│   ├── pinecone.ts                 # Pinecone RAG integration
│   ├── openai.ts                   # OpenAI GPT-4o integration
│   ├── prompts.ts                  # System prompts
│   ├── logging.ts                  # Structured logging
│   ├── pdf-urls.ts                 # PDF document URLs
│   └── supabase/                   # Database integration
│       ├── supabase-client.ts      # Supabase client & logging
│       ├── types.ts                # TypeScript types
│       ├── README.md               # Supabase folder docs
│       └── SETUP.md                # Setup instructions
│
├── 📚 docs/                         # Documentation
│   ├── README.md                   # Main setup guide
│   ├── CLAUDE.md                   # Claude Code instructions (detailed)
│   ├── DEPLOYMENT.md               # Deployment guide
│   ├── SETUP_CHECKLIST.md          # Setup checklist
│   ├── SUPABASE.md                 # Database schema docs
│   ├── SUPABASE_ANALYTICS.md       # Analytics queries
│   ├── guides/                     # Technical guides
│   │   ├── MIGRATION_GUIDE.md      # Migration implementation guide
│   │   ├── STREAMING_UPDATE_BUG_FIX.md  # Streaming bug fix details
│   │   └── PROJECT_STRUCTURE.md    # Detailed code structure
│   └── migrations/                 # Database migrations
│       ├── README.md               # Migration index
│       ├── 000_reference_schema.sql # Reference schema
│       ├── 001_initial_schema.sql  # Initial setup
│       └── 002-013_*.sql           # Feature migrations
│
├── 📄 geostick-docs/                # HR documentation (PDFs)
│   ├── Personeelsgids_versie_HRM_2023_V17.pdf
│   ├── Grafimedia-cao-2024-2025.pdf
│   └── ... (other HR PDFs)
│
├── 🎨 public/                       # Static assets
│   ├── Afbeeldingen/               # Images & logos
│   ├── icons/                      # PWA icons
│   ├── manifest.json               # PWA manifest
│   ├── sw.js                       # Service worker
│   └── offline.html                # Offline fallback page
│
├── 🔨 scripts/                      # Utility scripts
│   ├── generate-icons.js           # Generate PWA icons
│   ├── upload-pdfs.js              # Upload PDFs to Supabase
│   └── list-buckets.js             # List Supabase buckets
│
├── 📦 archive/                      # Archived/old files
│   └── old-files/                  # Deprecated code & tests
│
├── ⚙️ Configuration Files
│   ├── .env.example                # Environment template
│   ├── .env.local                  # Local environment (gitignored)
│   ├── package.json                # Dependencies
│   ├── tsconfig.json               # TypeScript config
│   ├── next.config.ts              # Next.js config (inc. PWA)
│   ├── eslint.config.mjs           # ESLint config
│   └── postcss.config.mjs          # PostCSS config
│
└── 📖 Root Documentation
    ├── README.md                   # Project overview & quick start
    ├── CLAUDE.md                   # Claude Code guide (concise)
    └── PROJECT_INDEX.md            # This file
```

## 🔑 Key Files Quick Reference

### Start Here
- **[README.md](README.md)** - Project overview, features, quick start
- **[CLAUDE.md](CLAUDE.md)** - Development guide for AI assistants
- **[docs/README.md](docs/README.md)** - Complete setup guide

### Development
- **[app/api/chat/route.ts](app/api/chat/route.ts)** - Main API logic
- **[lib/pinecone.ts](lib/pinecone.ts)** - RAG context retrieval
- **[lib/openai.ts](lib/openai.ts)** - LLM response generation
- **[lib/prompts.ts](lib/prompts.ts)** - System prompts (critical!)

### Database
- **[lib/supabase/supabase-client.ts](lib/supabase/supabase-client.ts)** - Database operations
- **[docs/SUPABASE.md](docs/SUPABASE.md)** - Schema documentation
- **[docs/migrations/](docs/migrations/)** - All database migrations

### Deployment
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Production deployment guide
- **[.env.example](.env.example)** - Required environment variables

## 📊 Documentation Map

| Need | File |
|------|------|
| **Quick Start** | [README.md](README.md) |
| **Full Setup** | [docs/README.md](docs/README.md) |
| **Code Architecture** | [CLAUDE.md](CLAUDE.md), [docs/guides/PROJECT_STRUCTURE.md](docs/guides/PROJECT_STRUCTURE.md) |
| **Database Setup** | [docs/SUPABASE.md](docs/SUPABASE.md), [lib/supabase/SETUP.md](lib/supabase/SETUP.md) |
| **Analytics Queries** | [docs/SUPABASE_ANALYTICS.md](docs/SUPABASE_ANALYTICS.md) |
| **Deployment** | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| **Migrations** | [docs/migrations/README.md](docs/migrations/README.md) |
| **Bug Fixes** | [docs/guides/STREAMING_UPDATE_BUG_FIX.md](docs/guides/STREAMING_UPDATE_BUG_FIX.md) |

## 🔍 Finding Things

### Components
All React components are in [app/components/](app/components/)

### API Routes
Main chat endpoint: [app/api/chat/route.ts](app/api/chat/route.ts)

### Business Logic
Core modules in [lib/](lib/):
- RAG: `pinecone.ts`
- LLM: `openai.ts`
- Prompts: `prompts.ts`
- Logging: `logging.ts`
- Database: `supabase/supabase-client.ts`

### Translations
All 12 languages in [app/translations.ts](app/translations.ts)

### Migrations
All in [docs/migrations/](docs/migrations/) numbered 001-013

### Scripts
Utility scripts in [scripts/](scripts/)

### HR Documents
PDF source files in [geostick-docs/](geostick-docs/)

## 🚀 Quick Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Run linter

# Deployment
vercel --prod            # Deploy to Vercel

# Database
# Use Supabase dashboard SQL editor for migrations
```

## 📝 Notes

- **Never commit** `.env.local` (contains secrets)
- **PWA config** is in `next.config.ts` and `public/manifest.json`
- **Migrations** are in chronological order (001, 002, etc.)
- **Archive folder** contains old/unused code for reference

---

**Last Updated**: 2025-11-05
**Version**: 1.2.0
