# 📁 Project Structure - Geostick HR QA Bot

Dit document legt uit hoe het project is georganiseerd en waar je alles kunt vinden.

---

## 📂 Hoofdstructuur

```
geostickverkoophrqabot/
├── app/                          # Next.js App Router
│   ├── api/chat/route.ts         # ⭐ HOOFDROUTE - Chat API endpoint
│   ├── page.tsx                  # ⭐ HOOFDPAGINA - Chat interface
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   ├── translations.ts           # Vertalingen voor 12 talen
│   └── components/               # React componenten
│       ├── ChatHeader.tsx        # Header met taal selector
│       ├── ChatMessage.tsx       # Message bubble (user/assistant)
│       ├── ChatInput.tsx         # Input field onderaan
│       ├── LoadingIndicator.tsx  # Loading animatie
│       ├── WelcomeScreen.tsx     # Welkomstscherm
│       └── LogoBackground.tsx    # Logo achtergrond patroon
│
├── lib/                          # ⭐ CORE LOGIC MODULES
│   ├── pinecone.ts              # Pinecone context retrieval
│   ├── openai.ts                # OpenAI LLM calls
│   ├── prompts.ts               # System prompts
│   ├── logging.ts               # Logging & analytics
│   └── supabase/                # Supabase integratie
│       └── supabase-client.ts   # Database logging
│
├── public/                       # Statische bestanden
│   └── Afbeeldingen/
│       └── Geosticklogo.png     # Logo
│
├── .env.local                    # Environment variabelen (NIET in git)
├── .env.example                  # Environment template
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuratie
└── PROJECT_STRUCTURE.md          # Dit bestand

```

---

## ⭐ Belangrijkste Bestanden

### 1. `app/api/chat/route.ts` - HOOFDROUTE
**Wat doet het?**
Dit is het hart van de applicatie. Wanneer een gebruiker een vraag stelt, komt de request hier binnen.

**Flow:**
```
1. Ontvang vraag + conversatie geschiedenis + taal
2. Haal context op uit Pinecone (HR documenten)
3. Genereer system prompt met context
4. Vraag OpenAI om antwoord
5. Stuur antwoord + citations terug
6. Log alles voor analytics
```

**Code structuur:**
```typescript
// STEP 1: Parse request
const { message, conversationHistory, language } = await request.json();

// STEP 2: Check environment
const pineconeApiKey = process.env.PINECONE_API_KEY;

// STEP 3: Haal context op uit Pinecone
const { contextText, citations } = await retrieveContext(...);

// STEP 4: Genereer system prompt
const systemPrompt = generateSystemPrompt(contextText, language);

// STEP 5: Genereer antwoord met OpenAI
const openaiResponse = await generateAnswer(...);

// STEP 6: Log en return
logSuccessfulRequest(...);
return NextResponse.json({ message, citations, ... });
```

---

### 2. `lib/pinecone.ts` - Context Retrieval
**Wat doet het?**
Haalt relevante passages op uit de HR documentatie via Pinecone Assistant.

**Belangrijkste functies:**
```typescript
// Initialiseer Pinecone client
initializePinecone(apiKey: string): Pinecone

// Haal context op
retrieveContext(
  assistantName: string,
  pineconeClient: Pinecone,
  userQuestion: string
): Promise<{
  contextText: string;      // De context voor de AI
  citations: Citation[];    // Bronnen (bestand + pagina's)
  pineconeTokens: number;   // Aantal tokens gebruikt
  pineconeCost: number;     // Kosten van deze request
}>

// Extract preview van snippet
extractSnippetPreview(text: string): string
```

**Hoe het werkt:**
1. Stuurt de vraag naar Pinecone Assistant
2. Pinecone zoekt de 3 meest relevante snippets (topK=3)
3. Retourneert de snippets met bron info (bestand + pagina)
4. Berekent de kosten ($5 per 1M tokens)

---

### 3. `lib/openai.ts` - LLM Response Generation
**Wat doet het?**
Genereert antwoorden via OpenAI GPT-4o.

**Belangrijkste functies:**
```typescript
// Initialiseer OpenAI client
initializeOpenAI(apiKey: string): OpenAI

// Bereid messages voor
prepareMessages(
  systemPrompt: string,
  conversationHistory: any[],
  currentMessage: string
): ConversationMessage[]

// Genereer antwoord
generateAnswer(
  openaiClient: OpenAI,
  messages: ConversationMessage[],
  language: string
): Promise<{
  answer: string;           // Het antwoord
  inputTokens: number;      // Input tokens gebruikt
  outputTokens: number;     // Output tokens gebruikt
  totalCost: number;        // Totale kosten
}>
```

**Hoe het werkt:**
1. Bouwt messages array: [system, ...history, user]
2. Stuurt naar GPT-4o (temperature: 0.7)
3. Berekent kosten:
   - Input: $2.50 per 1M tokens
   - Output: $10 per 1M tokens
4. Retourneert antwoord + cost info

---

### 4. `lib/prompts.ts` - System Prompts
**Wat doet het?**
Bevat de system prompts die bepalen hoe de AI zich gedraagt.

**Belangrijkste functie:**
```typescript
generateSystemPrompt(
  contextText: string,  // Context uit Pinecone
  language: string      // Geselecteerde taal (bijv. 'nl', 'pl')
): string
```

**Belangrijke regels in de prompt:**
- ⚠️ **TAAL**: Antwoord altijd in de taal van de vraag
- ⚠️ **CONTENT**: Gebruik ALLEEN info uit de context
- ❌ **VERBODEN**: Geen aannames, geen verzinsels
- ✅ **VERPLICHT**: Bij twijfel → verwijs naar HR

---

### 5. `lib/logging.ts` - Logging & Analytics
**Wat doet het?**
Handelt alle logging af voor debugging en analytics.

**Belangrijkste functies:**
```typescript
// Log succesvolle request
logSuccessfulRequest(summary: RequestSummary): void

// Log errors met categorisatie
logError(
  error: any,
  requestStartTime: number,
  message: string,
  conversationHistory: any[],
  language: string
): void

// Categoriseer error type
categorizeError(error: any): {
  category: ErrorCategory;  // PINECONE_ERROR, OPENAI_ERROR, etc.
  source: string;           // Waar ging het fout?
}

// Check content filter
isContentFilterError(error: any): boolean

// Geef user-friendly message
getUserFriendlyErrorMessage(category: ErrorCategory): string
```

**Error categorieën:**
- `PINECONE_ERROR` - Probleem met documentatie ophalen
- `OPENAI_ERROR` - Probleem met AI antwoord genereren
- `NETWORK_ERROR` - Netwerkverbinding probleem
- `TIMEOUT_ERROR` - Request timeout
- `CODE_ERROR` - Bug in de applicatie code
- `UNKNOWN_ERROR` - Onbekende fout

---

### 6. `app/page.tsx` - Chat Interface
**Wat doet het?**
De hoofdpagina waar gebruikers vragen stellen.

**State:**
```typescript
messages: Message[]           // Alle chat berichten
isLoading: boolean           // Of er een antwoord wordt geladen
selectedLanguage: string     // Geselecteerde taal ('nl', 'en', etc.)
```

**Flow:**
```
1. Gebruiker typt vraag
2. handleSendMessage() wordt aangeroepen
3. Voeg user message toe aan chat
4. Stuur POST request naar /api/chat
5. Ontvang antwoord
6. Voeg assistant message toe aan chat
7. Bij errors: toon error message
```

---

## 🔄 Complete Request Flow

```
┌─────────────────────┐
│ 1. USER TYPES       │
│    QUESTION         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 2. FRONTEND         │
│    page.tsx         │
│    - Add to chat    │
│    - POST /api/chat │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 3. API ROUTE        │
│    route.ts         │
│    - Parse request  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 4. PINECONE         │
│    pinecone.ts      │
│    - Retrieve       │
│      context (3     │
│      snippets)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 5. PROMPTS          │
│    prompts.ts       │
│    - Generate       │
│      system prompt  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 6. OPENAI           │
│    openai.ts        │
│    - Generate       │
│      answer         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 7. LOGGING          │
│    logging.ts       │
│    - Log to console │
│    - Log to Supabase│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 8. RETURN           │
│    - Answer         │
│    - Citations      │
│    - Costs          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 9. FRONTEND         │
│    - Show answer    │
│    - Show citations │
└─────────────────────┘
```

---

## 🎨 Frontend Componenten

### ChatHeader.tsx
- Toont logo + titel
- Taal selector dropdown (12 talen)
- Sticky bovenaan

### ChatMessage.tsx
- User messages: Rechts uitgelijnd, blauwe achtergrond
- Assistant messages: Links uitgelijnd, witte achtergrond
- Citations: Bronnen onderaan assistant messages

### ChatInput.tsx
- Textarea voor vraag invoeren
- Send button
- Disabled tijdens loading
- Enter = verstuur, Shift+Enter = nieuwe regel

### WelcomeScreen.tsx
- Logo + welkomstbericht
- Taal hint ("Ik antwoord automatisch in jouw taal")
- 4 voorbeeldvragen in geselecteerde taal

### LogoBackground.tsx
- Subtiel herhalend logo patroon
- 90 logos over het scherm verspreid
- Opacity 0.08 (subtiel maar zichtbaar)

### LoadingIndicator.tsx
- Animerende dots tijdens wachten
- "Antwoord wordt gegenereerd..."

---

## 🌐 Translations

`app/translations.ts` bevat vertalingen voor **12 talen**:
- 🇳🇱 Nederlands (nl)
- 🇬🇧 Engels (en)
- 🇩🇪 Duits (de)
- 🇫🇷 Frans (fr)
- 🇪🇸 Spaans (es)
- 🇮🇹 Italiaans (it)
- 🇵🇱 Pools (pl)
- 🇹🇷 Turks (tr)
- 🇸🇦 Arabisch (ar)
- 🇨🇳 Chinees (zh)
- 🇵🇹 Portugees (pt)
- 🇷🇴 Roemeens (ro)

**Wat wordt vertaald:**
- App titel en subtitle
- Welkomstbericht
- Voorbeeldvragen
- Input placeholder
- Citations label
- Language hint ("Ik antwoord automatisch in jouw taal")

---

## 🔧 Environment Variabelen

`.env.local` (NIET in git):
```bash
# Pinecone Assistant
PINECONE_API_KEY=pcsk_xxxxxx
PINECONE_ASSISTANT_NAME=geostick-hr-assistant

# OpenAI
OPENAI_API_KEY=sk-xxxxxx

# Supabase (optioneel - voor analytics)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxxx
```

---

## 📊 Logging Outputs

Alle logs zijn gestructureerd en makkelijk te lezen:

### Console Logs Format
```bash
🚀 [API] Chat request received
📝 [API] ========== USER QUESTION ==========
❓ [API] Question: Hoeveel vakantiedagen heb ik?
🌐 [API] Selected language: nl

📚 [Pinecone] ========== FETCHING CONTEXT ==========
🔍 [Pinecone] Query: Hoeveel vakantiedagen heb ik?
✅ [Pinecone] Context received successfully
📎 [Pinecone] Number of snippets returned: 3

💭 [OpenAI] ========== CALLING OPENAI ==========
🤖 [OpenAI] Model: GPT-4o
✅ [OpenAI] ========== ASSISTANT ANSWER ==========
💬 [OpenAI] Answer: Volgens artikel 12...

💰 [API] ========== COMBINED COST SUMMARY ==========
💵 [API] Pinecone context: $0.000123
💵 [API] OpenAI (input + output): $0.000456
💵 [API] Total per request: $0.000579
```

### Error Logs Format
```bash
❌ [Logging] ========== ERROR DETECTED ==========
🔴 [Logging] ERROR CATEGORY: OPENAI_ERROR
📍 [Logging] ERROR SOURCE: OpenAI API
⏱️  [Logging] Failed after: 2.34 seconds

📋 [Logging] ERROR DETAILS:
   • Type: APIError
   • Message: Rate limit exceeded
   • Code: rate_limit_exceeded
   • Status: 429

🔍 [Logging] STACK TRACE:
   at generateAnswer (lib/openai.ts:124)
   ...
```

---

## 💡 Tips Voor Beginners

### Waar te beginnen?
1. **Lees eerst:** `app/api/chat/route.ts` - zie de complete flow
2. **Bekijk dan:** `lib/pinecone.ts` en `lib/openai.ts` - begrijp de APIs
3. **Tenslotte:** `app/page.tsx` - zie hoe frontend werkt

### Iets aanpassen?
| Wat wil je aanpassen? | Waar moet je zijn? |
|-----------------------|--------------------|
| System prompt / AI gedrag | `lib/prompts.ts` |
| Aantal snippets (topK) | `lib/pinecone.ts` regel 94 |
| OpenAI temperature | `lib/openai.ts` regel 133 |
| Vertalingen | `app/translations.ts` |
| UI styling | `app/components/*.tsx` |
| Error messages | `lib/logging.ts` functie `getUserFriendlyErrorMessage()` |

### Console logs begrijpen
- **🚀** = Start van iets
- **✅** = Success
- **❌** = Error
- **📊/💰** = Costs/Stats
- **🔍** = Details/Debug info
- **⏱️** = Timing
- **[API]** = Backend code
- **[Frontend]** = Browser code
- **[Pinecone]** = Pinecone retrieval
- **[OpenAI]** = OpenAI generation
- **[Logging]** = Logging systeem

---

## 🎯 Veelvoorkomende taken

### Nieuwe taal toevoegen
1. Voeg toe aan `lib/prompts.ts` languageNames
2. Voeg vertalingen toe aan `app/translations.ts`
3. Voeg vlag toe aan `app/components/ChatHeader.tsx` LANGUAGES array

### System prompt aanpassen
1. Open `lib/prompts.ts`
2. Pas functie `generateSystemPrompt()` aan
3. Test met verschillende vragen

### Kosten verlagen
1. **Pinecone**: Verlaag topK in `lib/pinecone.ts` (nu 3, kan naar 2)
2. **OpenAI**: Gebruik goedkoper model in `lib/openai.ts` (bijv. gpt-4o-mini)

### Logging uitbreiden
1. Open `lib/logging.ts`
2. Voeg nieuwe functie toe
3. Call vanuit `app/api/chat/route.ts`

---

**Made with ❤️ for Geostick**
