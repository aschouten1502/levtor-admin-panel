# Supabase Setup Guide - GeoStick Verkoop Bot

Deze guide legt uit hoe je Supabase configureert voor het loggen van chat requests, zonder authenticatie.

## Stap 1: Supabase Project Aanmaken

1. Ga naar [https://supabase.com](https://supabase.com)
2. Log in of maak een account aan
3. Klik op "New Project"
4. Vul in:
   - **Name**: `geostick-verkoop-bot` (of een andere naam)
   - **Database Password**: Kies een sterk wachtwoord (bewaar dit goed!)
   - **Region**: Kies een regio dichtbij je gebruikers (bijv. `Europe West (London)` voor EU)
   - **Pricing Plan**: Free tier is voldoende voor starten
5. Klik op "Create new project"
6. Wacht 1-2 minuten tot het project klaar is

## Stap 2: Database Schema Aanmaken

1. Open je Supabase project dashboard
2. Ga naar **SQL Editor** in de linker sidebar
3. Klik op **New Query**
4. Kopieer de volledige inhoud van `supabase-schema.sql` uit deze repository
5. Plak de SQL code in de editor
6. Klik op **Run** (of druk `Ctrl+Enter`)
7. Je zou moeten zien: "Success. No rows returned"

### Wat doet dit schema?

Het maakt de volgende database objecten aan:

- **Table: `request_logs`** - Slaat alle chat requests op met:
  - Vraag en antwoord tekst
  - Taal van de gebruiker
  - Timing informatie (response tijd)
  - Token usage (Pinecone + OpenAI)
  - Kosten per request
  - Citaties (bronnen)
  - Error tracking
  - Content filter events

- **View: `request_analytics`** - Geaggregeerde analytics per dag:
  - Totaal aantal requests per taal
  - Geblokkeerde requests
  - Fouten
  - Gemiddelde response tijd
  - Totale kosten

## Stap 3: API Keys Ophalen

1. Ga naar **Settings** (tandwiel icoon) in de linker sidebar
2. Ga naar **API**
3. Kopieer de volgende waarden:

### Project URL
```
URL: https://xxxxxxxxxx.supabase.co
```
Dit is je `NEXT_PUBLIC_SUPABASE_URL`

### Service Role Key (Geheim!)
```
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Dit is je `SUPABASE_SERVICE_ROLE_KEY`

**⚠️ BELANGRIJK:**
- De **service_role** key heeft volledige toegang tot je database
- Deel deze NOOIT publiekelijk of commit hem niet in Git
- Gebruik deze alleen op de server-side (Next.js API routes)

## Stap 4: Environment Variables Configureren

1. Kopieer `.env.example` naar `.env.local` in de root van je project:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` en vul de Supabase waarden in:

   ```bash
   # Pinecone Configuration
   PINECONE_API_KEY=pcsk_xxx...
   PINECONE_ASSISTANT_NAME=geostickhrqabotv2

   # OpenAI Configuration
   OPENAI_API_KEY=sk-proj-xxx...

   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. Sla het bestand op

## Stap 5: Testen

1. Start je development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)

3. Stel een vraag in de chat

4. Check de console output - je zou moeten zien:
   ```
   💾 [Supabase] Logging request to database...
   ✅ [Supabase] Request logged successfully
   ```

5. Ga naar je Supabase dashboard → **Table Editor** → `request_logs`
   - Je zou de zojuist gestelde vraag moeten zien met alle metadata

## Stap 6: Data Bekijken

### Via Table Editor (Eenvoudig)

1. Ga naar **Table Editor** in de sidebar
2. Selecteer `request_logs`
3. Je ziet een spreadsheet-achtige weergave van alle logs

### Via SQL Editor (Geavanceerd)

Probeer deze queries:

**Laatste 10 requests:**
```sql
SELECT
  timestamp,
  question,
  language,
  total_cost,
  response_time_seconds
FROM request_logs
ORDER BY timestamp DESC
LIMIT 10;
```

**Totale kosten vandaag:**
```sql
SELECT
  SUM(total_cost) as total_cost_today,
  COUNT(*) as total_requests
FROM request_logs
WHERE DATE(timestamp) = CURRENT_DATE;
```

**Analytics per taal (laatste 7 dagen):**
```sql
SELECT * FROM request_analytics
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, language;
```

**Gemiddelde response tijd per taal:**
```sql
SELECT
  language,
  COUNT(*) as requests,
  AVG(response_time_seconds) as avg_response_time,
  AVG(total_cost) as avg_cost
FROM request_logs
WHERE blocked = false
GROUP BY language
ORDER BY requests DESC;
```

## Troubleshooting

### "Supabase not configured" in logs
- Check of `.env.local` bestaat en de juiste waarden bevat
- Herstart de development server na het wijzigen van `.env.local`

### "Failed to log request" errors
- Check of de `request_logs` table bestaat in Supabase
- Verifieer dat de SUPABASE_SERVICE_ROLE_KEY correct is
- Check de Supabase project status (soms is er onderhoud)

### Geen data verschijnt in Supabase
- Open de browser console (F12) en check voor errors
- Verifieer dat de API route `/api/chat` succesvol is (200 status)
- Check Supabase logs: **Database** → **Logs** in je dashboard

### RLS (Row Level Security) errors
- Het schema heeft RLS uitgeschakeld voor logging zonder authenticatie
- Als je later authenticatie toevoegt, moet je RLS policies aanmaken

## Volgende Stappen

Nu logging werkt, kun je overwegen:

1. **Dashboard bouwen**: Maak een admin pagina om analytics te bekijken
2. **Alerts instellen**: Email notificaties bij hoge kosten of errors
3. **Data export**: Exporteer data naar Excel/CSV voor rapportage
4. **Authenticatie toevoegen**: Later kun je user authentication toevoegen

## Kosten & Limieten

### Supabase Free Tier
- ✅ 500 MB database opslag
- ✅ 1 GB bandwidth per maand
- ✅ 2 GB transfer
- ✅ Unlimited API requests

### Schattingen
- 1 chat request ≈ 1-2 KB opslag
- 500 MB = ~250,000 - 500,000 chat logs
- Voor meer, upgrade naar Pro ($25/maand)

## Veiligheid

1. **Nooit** de service_role key delen of publiceren
2. Gebruik `.env.local` voor lokale development
3. Voor productie: gebruik environment variables van je hosting platform
4. Regelmatig database backups maken (Supabase doet dit automatisch op Pro plan)

## Support

- Supabase Docs: [https://supabase.com/docs](https://supabase.com/docs)
- Supabase Discord: [https://discord.supabase.com](https://discord.supabase.com)
- GitHub Issues: Voor bugs in deze chatbot code
