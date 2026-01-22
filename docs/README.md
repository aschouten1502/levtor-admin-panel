# Levtor HR Assistant - Documentation

Complete documentatie voor HR Assistant AI v2.2

---

## Quick Start

- [QUICK_START.md](guides/QUICK_START.md) - 15 minuten setup met CLIENT_CONFIG workflow
- [CLIENT_CONFIG.example.md](setup/CLIENT_CONFIG.example.md) - Template voor client configuratie

---

## Guides

| Document | Beschrijving |
|----------|--------------|
| [ADMIN_GUIDE.md](guides/ADMIN_GUIDE.md) | Admin dashboard gebruik |
| [DEPLOYMENT.md](guides/DEPLOYMENT.md) | Productie deployment naar Vercel |
| [SCALING_GUIDE.md](guides/SCALING_GUIDE.md) | Opschalen naar meerdere clients |
| [BRANDING_GUIDE.md](guides/BRANDING_GUIDE.md) | White-label customization (20+ opties) |
| [BRANDING_REFERENCE.md](guides/BRANDING_REFERENCE.md) | Branding quick reference |
| [MIGRATION_GUIDE.md](guides/MIGRATION_GUIDE.md) | Migratie tussen versies |

---

## Technical

| Document | Beschrijving |
|----------|--------------|
| [RAG_SYSTEM.md](technical/RAG_SYSTEM.md) | RAG architectuur met Supabase pgvector |
| [SUPABASE.md](technical/SUPABASE.md) | Database schema en setup |
| [SUPABASE_ANALYTICS.md](technical/SUPABASE_ANALYTICS.md) | Analytics SQL queries |

---

## Setup

| Document | Beschrijving |
|----------|--------------|
| [MULTI_TENANT_SETUP.md](setup/MULTI_TENANT_SETUP.md) | Multi-tenant architectuur |
| [CLIENT_ONBOARDING.md](setup/CLIENT_ONBOARDING.md) | Nieuwe client onboarding checklist |

---

## Database Migrations

Kritieke SQL migrations voor Supabase setup:

| Migration | Beschrijving |
|-----------|--------------|
| [001_initial_schema.sql](migrations/001_initial_schema.sql) | Basis tabel structuur |
| [014_add_rag_details.sql](migrations/014_add_rag_details.sql) | RAG details JSONB kolom |
| [015_document_processing_logs.sql](migrations/015_document_processing_logs.sql) | Document processing logs |
| [MULTI_TENANT_SETUP.sql](migrations/MULTI_TENANT_SETUP.sql) | Multi-tenant setup |

Zie [migrations/README.md](migrations/README.md) voor complete migration index.

---

## Archive

Historische documentatie en v1.x referentie:

- [MIGRATION_TO_V2.md](archive/MIGRATION_TO_V2.md) - v1.x naar v2.x migratie
- [BUILD_NOTES.md](archive/BUILD_NOTES.md) - Historische build notities
- [STREAMING_UPDATE_BUG_FIX.md](archive/STREAMING_UPDATE_BUG_FIX.md) - Bug fix documentatie
- [v1_reference_schema.sql](archive/v1_reference_schema.sql) - v1 database schema

---

## Development

Voor development instructies, zie:

- **[../CLAUDE.md](../CLAUDE.md)** - Complete development instructions voor Claude Code
- **[../README.md](../README.md)** - Project overview

---

**Versie**: v2.2.0
**Laatst bijgewerkt**: Januari 2026
