# 🗄️ Supabase Database Documentation

Complete documentatie voor de Supabase database integratie van de GeoStick HR QA Bot.

---

## 📋 Table of Contents

1. [Overzicht](#overzicht)
2. [Database Schema](#database-schema)
3. [Setup Instructies](#setup-instructies)
4. [Wat wordt er gelogd?](#wat-wordt-er-gelogd)
5. [Code Integratie](#code-integratie)
6. [Analytics Queries](#analytics-queries)
7. [Migraties](#migraties)
8. [Troubleshooting](#troubleshooting)

---

## Overzicht

De GeoStick HR QA Bot gebruikt Supabase (PostgreSQL database) voor:

- ✅ **Request Logging**: Alle chat requests met volledige metadata
- ✅ **Cost Tracking**: Pinecone + OpenAI kosten per request
- ✅ **Performance Metrics**: Response tijden en token usage
- ✅ **Error Tracking**: Gedetailleerde error logs met categorisatie
- ✅ **Session Analytics**: Track gebruikers sessies
- ✅ **Content Filter Logs**: Geblokkeerde requests
- 🔜 **Feedback Tracking**: User feedback (helpful/not helpful) - voorbereid maar nog niet geïmplementeerd

### Waarom Supabase?

- **Managed PostgreSQL**: Geen server beheer nodig
- **Gratis tier**: 500MB database, unlimited API requests
- **Realtime updates**: Optioneel realtime dashboard mogelijk
- **Easy setup**: 5 minuten om op te zetten
- **SQL Editor**: Direct queries uitvoeren via UI
- **Auto backups**: Op Pro plan ($25/maand)

---

## Database Schema

### Hoofdtabel: `Geostick_Logs_Data_QABOTHR`

Alle chat requests, errors en content filter events worden hier opgeslagen.

#### Kolommen

| Kolom | Type | Beschrijving | Voorbeeld |
|-------|------|--------------|-----------|
| **id** | UUID | Primary key | `550e8400-e29b-41d4-a716-446655440000` |
| **session_id** | VARCHAR(255) | Browser sessie ID | `sess_abc123xyz` |
| **timestamp** | TIMESTAMPTZ | Tijdstip van request | `2025-01-29 14:23:45+00` |
| **response_time_seconds** | DECIMAL(10,2) | Response tijd (sec) | `2.34` |
| **response_time_ms** | INTEGER | Response tijd (ms) | `2340` |
| **question** | TEXT | User vraag | `Hoeveel vakantiedagen heb ik?` |
| **answer** | TEXT | Bot antwoord | `Volgens artikel 12...` |
| **language** | VARCHAR(10) | Taal code | `nl`, `en`, `pl` |
| **embedding_tokens** | INTEGER | Embedding tokens | `1234` |
| **embedding_cost** | DECIMAL(10,6) | Embedding kosten ($) | `0.006170` |
| **snippets_used** | INTEGER | Aantal snippets | `3` |
| **openai_input_tokens** | INTEGER | OpenAI input tokens | `456` |
| **openai_output_tokens** | INTEGER | OpenAI output tokens | `123` |
| **openai_total_tokens** | INTEGER | Totaal OpenAI tokens | `579` |
| **openai_cost** | DECIMAL(10,6) | OpenAI kosten ($) | `0.002345` |
| **total_cost** | DECIMAL(10,6) | Totale kosten ($) | `0.008515` |
| **citations_count** | INTEGER | Aantal citaties | `3` |
| **citations** | JSONB | Bron documenten | `[{"file_name": "cao.pdf", ...}]` |
| **conversation_history_length** | INTEGER | Chat history lengte | `4` |
| **blocked** | BOOLEAN | Content filter | `false` |
| **event_type** | VARCHAR(50) | Type event | `chat_request`, `error`, `content_filter_triggered` |
| **error_details** | TEXT | Error informatie | `{"category": "OPENAI_ERROR", ...}` |
| **user_feedback** | VARCHAR(20) | User feedback | `helpful`, `not_helpful`, `null` |
| **feedback_comment** | TEXT | Feedback opmerking | `Heel duidelijk antwoord!` |
| **created_at** | TIMESTAMPTZ | Database insert tijd | `2025-01-29 14:23:46+00` |

#### Event Types

1. **`chat_request`**: Normale succesvolle chat request
   - Bevat vraag, antwoord, kosten, citations
   - `blocked = false`, geen error_details

2. **`content_filter_triggered`**: Geblokkeerd door OpenAI content filter
   - Bevat vraag en standaard blocked message
   - `blocked = true`, kosten = 0

3. **`error`**: Er ging iets fout
   - Bevat vraag en error details (JSON)
   - `error_details` = error category, source, message

#### Indexes

Voor snelle queries zijn de volgende indexes aanwezig:

```sql
-- Meest gebruikte queries
idx_logs_timestamp          -- ORDER BY timestamp DESC
idx_logs_session_id         -- WHERE session_id = 'xxx'
idx_logs_language           -- WHERE language = 'nl'
idx_logs_event_type         -- WHERE event_type = 'error'

-- Performance queries
idx_logs_total_cost         -- Duurste requests
idx_logs_response_time      -- Langzaamste requests

-- Analytics
idx_logs_timestamp_language -- GROUP BY date, language
idx_logs_blocked            -- Geblokkeerde requests
idx_logs_feedback           -- Feedback analysis
```

---

### Analytics View: `request_analytics`

Pre-built view voor dagelijkse statistieken per taal.

```sql
SELECT * FROM request_analytics
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, language;
```

**Kolommen:**
- `date` - Dag (DATE)
- `language` - Taal
- `total_requests` - Totaal aantal requests
- `successful_requests` - Succesvolle chats
- `blocked_requests` - Content filter blocks
- `error_requests` - Errors
- `avg_response_time_seconds` - Gemiddelde response tijd
- `total_embedding_tokens` - Totaal Embedding tokens
- `total_openai_tokens` - Totaal OpenAI tokens
- `total_embedding_cost` - Totaal Embedding kosten
- `total_openai_cost` - Totaal OpenAI kosten
- `total_cost` - Totale kosten
- `avg_cost_per_request` - Gemiddelde kosten per request
- `unique_sessions` - Unieke sessies
- `helpful_feedback_count` - Aantal "helpful" votes
- `not_helpful_feedback_count` - Aantal "not helpful" votes
- `helpful_percentage` - % helpful van alle feedback

---

## Setup Instructies

### Stap 1: Supabase Project Aanmaken

1. Ga naar [https://supabase.com](https://supabase.com)
2. Maak een account aan / log in
3. Klik op **"New Project"**
4. Vul in:
   - **Project Name**: `geostick-hr-qabot` (of eigen naam)
   - **Database Password**: Kies een sterk wachtwoord (bewaar dit!)
   - **Region**: `Europe West (London)` voor EU compliance
   - **Pricing Plan**: Free tier is prima om mee te starten
5. Klik **"Create new project"**
6. Wacht 1-2 minuten tot project klaar is

### Stap 2: Database Schema Installeren

#### Optie A: Via Migratie (Aanbevolen)

1. Ga naar **SQL Editor** in de linker sidebar
2. Klik op **New Query**
3. Kopieer de volledige inhoud van `lib/supabase/migrations/001_initial_schema.sql`
4. Plak in de SQL editor
5. Klik **Run** (of `Ctrl+Enter`)
6. Controleer succes message: "✅ Migration 001 completed successfully!"

#### Optie B: Via oude schema.sql

Als je de oude `schema.sql` hebt gebruikt, moet je de tabel naam aanpassen:

```sql
-- Hernoem de oude tabel (als die bestaat)
ALTER TABLE request_logs RENAME TO "Geostick_Logs_Data_QABOTHR";
```

### Stap 3: API Keys Ophalen

1. Ga naar **Settings** → **API** in de sidebar
2. Kopieer de volgende waarden:

**Project URL:**
```
https://xxxxxxxxxx.supabase.co
```

**Service Role Key (geheim!):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
```

⚠️ **BELANGRIJK**: De service_role key heeft volledige database toegang. Deel deze NOOIT publiekelijk!

### Stap 4: Environment Variabelen

1. Open `.env.local` in de project root
2. Voeg Supabase credentials toe:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Sla op en herstart de development server

### Stap 5: Testen

1. Start de app: `npm run dev`
2. Stel een vraag in de chat
3. Check de console voor:
   ```
   💾 [Supabase] Logging request to database...
   ✅ [Supabase] Request logged successfully
   ```
4. Ga naar Supabase → **Table Editor** → `Geostick_Logs_Data_QABOTHR`
5. Zie je je vraag? Dan werkt het! 🎉

---

## Wat wordt er gelogd?

### Bij een normale chat request

Wanneer een user een vraag stelt en een antwoord krijgt:

```typescript
{
  session_id: "sess_abc123",
  timestamp: "2025-01-29T14:23:45.678Z",
  question: "Hoeveel vakantiedagen heb ik?",
  answer: "Volgens de CAO heb je recht op 25 vakantiedagen...",
  language: "nl",

  // Timing
  response_time_seconds: 2.34,
  response_time_ms: 2340,

  // Pinecone
  embedding_tokens: 1234,
  embedding_cost: 0.006170,
  snippets_used: 3,

  // OpenAI
  openai_input_tokens: 456,
  openai_output_tokens: 123,
  openai_total_tokens: 579,
  openai_cost: 0.002345,

  // Totaal
  total_cost: 0.008515,

  // Context
  citations_count: 3,
  citations: [...],
  conversation_history_length: 2,

  // Status
  blocked: false,
  event_type: "chat_request"
}
```

### Bij een content filter block

Wanneer OpenAI de vraag blokkeert:

```typescript
{
  session_id: "sess_abc123",
  timestamp: "2025-01-29T14:25:12.345Z",
  question: "[vraag met blocked keywords]",
  answer: "Je vraag bevat termen die automatisch worden geblokkeerd...",
  language: "nl",

  response_time_seconds: 0.45,
  response_time_ms: 450,

  // Geen kosten bij blocks
  embedding_tokens: 0,
  embedding_cost: 0,
  openai_input_tokens: 0,
  openai_output_tokens: 0,
  openai_total_tokens: 0,
  openai_cost: 0,
  total_cost: 0,

  snippets_used: 0,
  citations_count: 0,
  conversation_history_length: 2,

  blocked: true,
  event_type: "content_filter_triggered"
}
```

### Bij een error

Wanneer er een fout optreedt:

```typescript
{
  session_id: "sess_abc123",
  timestamp: "2025-01-29T14:27:33.789Z",
  question: "Vraag die een error veroorzaakte",
  answer: "Error occurred",
  language: "nl",

  response_time_seconds: 1.23,
  response_time_ms: 1230,

  // Geen kosten bij errors
  embedding_tokens: 0,
  embedding_cost: 0,
  openai_input_tokens: 0,
  openai_output_tokens: 0,
  openai_total_tokens: 0,
  openai_cost: 0,
  total_cost: 0,

  snippets_used: 0,
  citations_count: 0,
  conversation_history_length: 3,

  blocked: false,
  event_type: "error",
  error_details: JSON.stringify({
    category: "OPENAI_ERROR",
    source: "OpenAI API",
    type: "APIError",
    message: "Rate limit exceeded",
    code: "rate_limit_exceeded",
    status: 429
  })
}
```

---

## Code Integratie

### Waar wordt Supabase aangeroepen?

**Bestand**: `lib/logging.ts`

Drie logging functies:

```typescript
// 1. Succesvolle chat request
await logSuccessfulRequest(requestSummary);

// 2. Content filter event
logContentFilter(requestStartTime, message, conversationHistory);

// 3. Error event
logError(error, requestStartTime, message, conversationHistory, language);
```

**Bestand**: `lib/supabase/supabase-client.ts`

Database operaties:

```typescript
// Hoofdfunctie voor alle logs
export async function logChatRequest(data) {
  const { data: insertedData, error } = await supabase
    .from('Geostick_Logs_Data_QABOTHR')
    .insert([data])
    .select();

  return { success: !error, data: insertedData, error };
}
```

### Faalveiligheid

Logging is **non-blocking** - als Supabase faalt, breekt de chat niet:

```typescript
try {
  await logChatRequest(data);
  console.log('✅ [Supabase] Logged successfully');
} catch (err) {
  console.error('⚠️ [Supabase] Logging failed (non-critical):', err);
  // Chat blijft werken!
}
```

Als Supabase credentials ontbreken:

```typescript
if (!supabase) {
  console.log('⏩ [Supabase] Logging skipped - not configured');
  return { success: false, error: 'Supabase not configured' };
}
```

---

## Analytics Queries

Zie **[SUPABASE_ANALYTICS.md](./SUPABASE_ANALYTICS.md)** voor:

- 📊 Basic queries (laatste logs, totaal per type)
- 💰 Cost analysis (dagelijks, wekelijks, maandelijks)
- ⚡ Performance metrics (response tijden, token usage)
- 👥 User behavior (meest gestelde vragen, peak hours)
- ❌ Error analysis (error rates, categorieën)
- 🛡️ Content filter analysis
- 📈 Session analytics
- 📋 Daily/weekly/monthly reports

**Quick example - Kosten vandaag:**

```sql
SELECT
  COUNT(*) AS requests,
  ROUND(SUM(total_cost)::NUMERIC, 4) AS total_cost,
  ROUND(AVG(total_cost)::NUMERIC, 6) AS avg_cost
FROM "Geostick_Logs_Data_QABOTHR"
WHERE DATE(timestamp) = CURRENT_DATE
  AND event_type = 'chat_request';
```

---

## Migraties

Alle database wijzigingen worden gedaan via migraties in `lib/supabase/migrations/`.

### Huidige Migraties

**001_initial_schema.sql**
- Aangemaakt: 2025-01-29
- Creëert: `Geostick_Logs_Data_QABOTHR` table
- Creëert: `request_analytics` view
- Creëert: Alle indexes
- Voegt toe: session_id, feedback kolommen

### Een nieuwe migratie toevoegen

1. Maak een nieuw bestand: `002_jouw_migratie_naam.sql`
2. Begin met DROP IF EXISTS voor rollback support:
   ```sql
   -- Rollback: verwijder nieuwe kolom als migratie opnieuw wordt gedraaid
   ALTER TABLE "Geostick_Logs_Data_QABOTHR"
   DROP COLUMN IF EXISTS nieuwe_kolom;

   -- Voeg kolom toe
   ALTER TABLE "Geostick_Logs_Data_QABOTHR"
   ADD COLUMN nieuwe_kolom TEXT;
   ```
3. Test lokaal op een development Supabase project
4. Deploy naar productie via SQL Editor

### Beste Practices

- ✅ Altijd backwards compatible wijzigingen maken
- ✅ DROP IF EXISTS gebruiken voor idempotency
- ✅ Testen op development environment eerst
- ✅ Comments toevoegen voor documentatie
- ❌ Nooit data deleten zonder backup
- ❌ Nooit production database wijzigen zonder test

---

## Troubleshooting

### ❌ "Supabase not configured" in console logs

**Oorzaak**: Environment variabelen ontbreken of incorrect

**Oplossing**:
1. Check of `.env.local` bestaat
2. Controleer of deze regels aanwezig zijn:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
3. Herstart development server: `npm run dev`

### ❌ "Failed to log request: relation does not exist"

**Oorzaak**: Tabel `Geostick_Logs_Data_QABOTHR` bestaat niet

**Oplossing**:
1. Ga naar Supabase SQL Editor
2. Run `lib/supabase/migrations/001_initial_schema.sql`
3. Check of tabel bestaat: `SELECT * FROM "Geostick_Logs_Data_QABOTHR" LIMIT 1;`

### ❌ "Failed to log request: permission denied"

**Oorzaak**: Verkeerde API key gebruikt (anon key in plaats van service_role key)

**Oplossing**:
1. Ga naar Supabase → Settings → API
2. Kopieer de **service_role** key (niet de anon key!)
3. Update `.env.local` met correcte key
4. Herstart server

### ❌ Data komt niet aan in Supabase

**Debug stappen**:

1. Check console logs voor errors:
   ```
   💾 [Supabase] Logging request to database...
   ❌ [Supabase] Failed to log request: [error message]
   ```

2. Verifieer Supabase project status:
   - Ga naar dashboard.supabase.com
   - Check of project "Healthy" is (groen icoon)
   - Bekijk Database logs: Database → Logs

3. Test database connectie handmatig:
   ```sql
   -- Run in Supabase SQL Editor
   INSERT INTO "Geostick_Logs_Data_QABOTHR" (
     question, answer, event_type
   ) VALUES (
     'Test vraag', 'Test antwoord', 'chat_request'
   );

   SELECT * FROM "Geostick_Logs_Data_QABOTHR"
   ORDER BY timestamp DESC LIMIT 1;
   ```

4. Check RLS (Row Level Security):
   ```sql
   -- Zorg dat RLS uit staat voor logging
   ALTER TABLE "Geostick_Logs_Data_QABOTHR"
   DISABLE ROW LEVEL SECURITY;
   ```

### ⚠️ Logging is langzaam

**Mogelijke oorzaken**:

1. **Supabase Free Tier limieten**
   - Check dashboard voor "Approaching limits" waarschuwingen
   - Upgrade naar Pro ($25/maand) voor betere performance

2. **Te veel concurrent requests**
   - Logging gebeurt async, mag geen probleem zijn
   - Check of je niet onnodig wacht op logging result

3. **Database size te groot**
   - Check table size: `SELECT pg_size_pretty(pg_total_relation_size('"Geostick_Logs_Data_QABOTHR"'));`
   - Overweeg oude data te archiveren

### 🔥 Emergency: Database vol

Als je Supabase Free Tier limiet (500MB) bereikt:

**Tijdelijke oplossing**:
```sql
-- Verwijder oude data (> 90 dagen)
DELETE FROM "Geostick_Logs_Data_QABOTHR"
WHERE timestamp < CURRENT_DATE - INTERVAL '90 days';

-- Vacuum om ruimte vrij te maken
VACUUM FULL "Geostick_Logs_Data_QABOTHR";
```

**Permanente oplossing**:
- Upgrade naar Pro plan ($25/maand) = 8GB database
- Of implementeer automatische data cleanup (zie hieronder)

### Automatische oude data cleanup (optioneel)

Voeg een scheduled job toe via Supabase Dashboard:

```sql
-- Run dagelijks om middenacht
-- Database → Edge Functions → New SQL Function
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM "Geostick_Logs_Data_QABOTHR"
  WHERE timestamp < CURRENT_DATE - INTERVAL '365 days';

  RAISE NOTICE 'Cleaned up logs older than 365 days';
END;
$$ LANGUAGE plpgsql;
```

---

## Kosten & Limieten

### Supabase Free Tier

| Resource | Limiet | Genoeg voor |
|----------|--------|-------------|
| Database storage | 500 MB | ~250k - 500k chat logs |
| API requests | Unlimited | ✅ Geen probleem |
| Bandwidth | 2 GB/maand | ~1M requests |
| Database rows | Unlimited | ✅ Geen probleem |

**Schatting per chat request**: ~1-2 KB opslag

### Supabase Pro Plan ($25/maand)

- 8 GB database (16x meer)
- 50 GB bandwidth
- Automatic backups (dagelijks)
- Point-in-time recovery
- Priority support

### Wanneer upgraden?

- ✅ Je hebt > 200k chat logs
- ✅ Je wilt automatic backups
- ✅ Je verwacht veel traffic (> 10k requests/dag)
- ✅ Je wilt production-ready monitoring

---

## Security Best Practices

### ✅ DO

- ✅ Gebruik **service_role key** alleen server-side
- ✅ Bewaar keys in `.env.local` (niet in git)
- ✅ Voor productie: gebruik environment variables van hosting platform
- ✅ Enable RLS als je user authentication toevoegt
- ✅ Maak regelmatig backups (Pro plan heeft dit automatisch)
- ✅ Monitor Supabase audit logs voor suspicious activity

### ❌ DON'T

- ❌ Commit `.env.local` naar git
- ❌ Gebruik service_role key in client-side code
- ❌ Deel Supabase credentials publiekelijk
- ❌ Disable RLS zonder goede reden (bij auth)
- ❌ Gebruik weak database passwords

---

## Next Steps

Nu Supabase werkt, kun je:

1. **📊 Dashboard bouwen**: Maak een `/admin` pagina met analytics
2. **🔔 Alerts instellen**: Email notificaties bij hoge kosten/errors
3. **👍 Feedback implementeren**: Gebruik de `user_feedback` kolom
4. **🔐 Authentication toevoegen**: Supabase Auth voor admin toegang
5. **📈 Grafana/Metabase**: Visualisatie tool koppelen
6. **🤖 Automated reports**: Wekelijkse cost/usage emails

---

## Support & Resources

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **SQL Tutorial**: [postgresqltutorial.com](https://www.postgresqltutorial.com/)
- **Supabase Discord**: [discord.supabase.com](https://discord.supabase.com)
- **Project Analytics Queries**: [SUPABASE_ANALYTICS.md](./SUPABASE_ANALYTICS.md)
- **Setup Guide**: [lib/supabase/SETUP.md](../lib/supabase/SETUP.md)

---

**Database Schema Version**: 001
**Last Updated**: 2025-01-29
**Status**: ✅ Production Ready

---

Made with ❤️ for GeoStick Analytics
