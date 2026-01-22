# Supabase Database - GeoStick Verkoop Q&A Bot

Deze map bevat alle Supabase-gerelateerde bestanden voor het loggen en analyseren van chat requests.

## 📁 Bestandsstructuur

```
Supabasehrqabotgeostick-dp/
├── README.md              # Dit bestand
├── SETUP.md               # Volledige setup instructies
├── schema.sql             # Database schema (run dit in Supabase SQL Editor)
└── supabase-client.ts     # TypeScript client voor logging functies
```

## 📋 Bestanden

### `schema.sql`
Database schema voor het opslaan van chat logs. Bevat:
- **Table**: `request_logs` - Alle chat requests met metadata
- **View**: `request_analytics` - Geaggregeerde analytics per dag
- **Indexes**: Voor snelle queries op datum, taal, etc.

**Gebruik**: Kopieer en run in Supabase SQL Editor

### `supabase-client.ts`
TypeScript client voor het loggen van data naar Supabase. Exporteert:
- `logChatRequest()` - Log normale chat requests
- `logContentFilterEvent()` - Log geblokkeerde requests
- `logErrorEvent()` - Log errors

**Gebruik**: Geïmporteerd in `/app/api/chat/route.ts`

### `SETUP.md`
Volledige stap-voor-stap handleiding voor:
- Supabase project aanmaken
- Database schema installeren
- API keys configureren
- Data bekijken en analyseren
- Troubleshooting

**Start hier als je Supabase wilt opzetten!**

## 🚀 Snelle Start

1. Lees [SETUP.md](./SETUP.md) voor complete instructies
2. Maak een Supabase project aan
3. Run `schema.sql` in SQL Editor
4. Kopieer API keys naar `.env.local`
5. Start de app met `npm run dev`

## 🔑 Environment Variables

Voeg toe aan je `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📊 Data Schema

### request_logs table

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| `id` | UUID | Primary key |
| `timestamp` | TIMESTAMPTZ | Tijdstip van request |
| `question` | TEXT | Gebruikersvraag |
| `answer` | TEXT | Bot antwoord |
| `language` | VARCHAR(10) | Taal (nl, en, de, etc.) |
| `response_time_seconds` | DECIMAL | Response tijd in seconden |
| `response_time_ms` | INTEGER | Response tijd in milliseconden |
| `embedding_tokens` | INTEGER | Embedding tokens gebruikt |
| `embedding_cost` | DECIMAL | Embedding kosten in USD |
| `openai_input_tokens` | INTEGER | OpenAI input tokens |
| `openai_output_tokens` | INTEGER | OpenAI output tokens |
| `openai_total_tokens` | INTEGER | Totaal OpenAI tokens |
| `openai_cost` | DECIMAL | OpenAI kosten in USD |
| `total_cost` | DECIMAL | Totale kosten per request |
| `snippets_used` | INTEGER | Aantal context snippets |
| `citations_count` | INTEGER | Aantal citaties |
| `citations` | JSONB | Citaties met bronnen |
| `conversation_history_length` | INTEGER | Chat history lengte |
| `blocked` | BOOLEAN | Content filter geblokkeerd |
| `event_type` | VARCHAR(50) | Type: chat_request, content_filter_triggered, error |
| `error_details` | TEXT | Error informatie (indien applicable) |

## 📈 Analytics Queries

Zie [SETUP.md](./SETUP.md) voor nuttige SQL queries zoals:
- Totale kosten per dag/week/maand
- Gemiddelde response tijd per taal
- Meest gestelde vragen
- Error rates

## 🔒 Beveiliging

- **Service Role Key** wordt alleen server-side gebruikt
- Geen client-side toegang tot Supabase
- Row Level Security (RLS) is uitgeschakeld voor logging
- Later kan authenticatie toegevoegd worden

## 💡 Tips

1. **Test eerst lokaal** voordat je naar productie gaat
2. **Monitor je kosten** via Supabase dashboard
3. **Backup je data** regelmatig (gratis backups op Pro plan)
4. **Gebruik indexes** voor snelle queries op grote datasets

## 🆘 Hulp Nodig?

- Lees [SETUP.md](./SETUP.md) voor troubleshooting
- Check Supabase docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com

## 🔄 Updates

Om het schema bij te werken:
1. Maak wijzigingen in `schema.sql`
2. Test lokaal op een development Supabase project
3. Run migraties op productie database
4. Update de app code indien nodig
