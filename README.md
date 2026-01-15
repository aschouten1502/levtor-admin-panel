# Levtor Admin Panel

**Version 2.3.0** - Multi-tenant White-Label AI Chatbot Platform

> Enterprise-grade RAG (Retrieval-Augmented Generation) platform with admin dashboard, QA testing, and embeddable widget support.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-green)](https://supabase.com/)

---

## Overview

Levtor Admin Panel is a complete platform for deploying AI-powered chatbots to enterprise clients. Each tenant gets their own isolated chatbot trained on their documents, with full customization and analytics.

### Key Capabilities

- **Multi-Tenant Architecture** - Isolated data, branding, and documents per client
- **Supabase pgvector RAG** - Cost-effective vector search (99.6% cheaper than Pinecone)
- **Admin Dashboard** - Complete tenant management, branding, costs, and analytics
- **QA Testing Suite** - Automated bot accuracy testing with 8 evaluation categories
- **Embeddable Widget** - Deploy chatbots on any website with simple embed code
- **12 Language Support** - Automatic query translation for non-English queries
- **PWA Support** - Installable on mobile and desktop devices

---

## Features

### Admin Dashboard

| Feature | Description |
|---------|-------------|
| Tenant Management | Create, edit, delete tenants with full configuration |
| Branding Editor | Live preview with color picker and logo upload |
| Document Management | Upload PDFs with smart chunking options |
| Chat Logs | View conversations with full RAG debug details |
| Cost Analytics | Per-tenant cost tracking and breakdowns |
| QA Testing | Automated accuracy testing with detailed reports |
| Implementation | Generate embed codes for client websites |

### RAG System

| Feature | Description |
|---------|-------------|
| Smart Chunking | Fixed, smart, and semantic chunking strategies |
| Query Translation | Non-English queries translated for better search |
| Cohere Reranking | Optional relevance improvement |
| RAG Details Logging | 200+ fields for debugging and analytics |
| Citation Support | Source documents and page numbers in responses |

### QA Testing (v2.3)

Automated testing with 8 evaluation categories:
- **Retrieval** - Does the bot find correct documents?
- **Accuracy** - Is the answer content correct?
- **Citation** - Are source references accurate?
- **Hallucination** - Does the bot make up information?
- **Out-of-scope** - Does the bot refuse non-relevant questions?
- **No-answer** - Does the bot admit when it doesn't know?
- **Consistency** - Same question produces same answer?
- **Multilingual** - Does it work in other languages?

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Vector DB | Supabase pgvector |
| Embeddings | OpenAI text-embedding-3-small |
| Reranking | Cohere (optional) |
| LLM | OpenAI GPT-4o |
| Database | Supabase (PostgreSQL) |
| PWA | @ducanh2912/next-pwa |

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- OpenAI API key
- (Optional) Cohere API key for reranking

### Installation

```bash
git clone https://github.com/levtor/levtor-admin-panel.git
cd levtor-admin-panel
npm install
```

### Configuration

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```bash
# Required
TENANT_ID=demo
TENANT_NAME=Demo Tenant
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...

# Optional
COHERE_API_KEY=...  # For reranking
NEXT_PUBLIC_COMPANY_NAME=Levtor
NEXT_PUBLIC_PRIMARY_COLOR=#0066CC
```

### Database Setup

Run migrations in Supabase SQL Editor:
- `lib/supabase/migrations/` - All migration files in order

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
app/
  api/
    chat/               # Main chat endpoint
    admin/              # Admin API routes
    rag/                # Document upload/management
    tenant/             # Tenant config API
  admin/                # Admin dashboard pages
    tenants/            # Tenant management
    branding/           # Branding editor
    logs/               # Chat logs viewer
    costs/              # Cost analytics
    test/               # QA testing UI
    implement/          # Embed code generator
    components/         # Shared admin components
  embed/                # Embeddable widget
  providers/            # React context providers

lib/
  rag/                  # RAG system
  admin/                # Admin services
  auth/                 # Authentication
  supabase/             # Database client & migrations

middleware.ts           # Tenant detection middleware
```

---

## Admin Routes

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard overview |
| `/admin/tenants` | Tenant management |
| `/admin/branding/[tenantId]` | Branding editor |
| `/admin/logs/[tenantId]` | Chat logs |
| `/admin/costs` | Cost analytics |
| `/admin/test/[tenantId]` | QA testing |
| `/admin/implement/[tenantId]` | Embed code generator |

---

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx tsc --noEmit     # TypeScript type check
```

---

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Developer guide
- **[docs/](docs/)** - Full documentation

---

## License

**Proprietary** - 2025 Levtor. All rights reserved.

---

**Levtor** | [levtor.com](https://levtor.com)
