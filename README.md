# 🤖 GeoStick HR QA Bot - Production Ready

Een intelligente HR assistent die vragen beantwoordt over HR-beleid, procedures en arbeidsvoorwaarden op basis van **RAG (Retrieval-Augmented Generation)**.

---

## 🎯 Wat is dit?

Een **Next.js 15** applicatie die:
- ✅ HR vragen beantwoordt in **12 talen** (NL, EN, DE, FR, ES, IT, PL, TR, AR, ZH, PT, RO)
- ✅ Informatie haalt uit **HR documenten** (CAO, personeelshandboek, etc.) via Pinecone
- ✅ Intelligente antwoorden genereert via **OpenAI GPT-4o**
- ✅ Alle requests logt in **Supabase** voor analytics en cost tracking
- ✅ **Bronvermelding** toont (welk document, welke pagina)
- ✅ **Kosten tracked** (Pinecone + OpenAI per request)

**Let op**: "Verkoop" in de folder naam betekent dat dit de **productie-versie** is die verkocht wordt aan GeoStick. Het is **GEEN sales bot**, maar een **HR Q&A assistent**.

---

## 🚀 Quick Start

```bash
# 1. Installeer dependencies
npm install

# 2. Configureer environment variables
cp .env.example .env.local
# Vul API keys in (zie docs/README.md)

# 3. Start development server
npm run dev

# 4. Open http://localhost:3000
```

---

## 📚 Documentatie

Alle documentatie staat in de **`/docs`** folder:

| Document | Beschrijving |
|----------|--------------|
| **[docs/README.md](./docs/README.md)** | 📖 **START HIER** - Complete setup guide en overzicht |
| **[CLAUDE.md](./CLAUDE.md)** | 🤖 Developer guide voor Claude Code (concise) |
| **[PROJECT_INDEX.md](./PROJECT_INDEX.md)** | 📁 Complete project file index en navigation |
| **[docs/guides/PROJECT_STRUCTURE.md](./docs/guides/PROJECT_STRUCTURE.md)** | 🗂️ Detailed code structuur en flow |
| **[docs/SUPABASE.md](./docs/SUPABASE.md)** | 🗄️ Database setup, schema, en wat er gelogd wordt |
| **[docs/SUPABASE_ANALYTICS.md](./docs/SUPABASE_ANALYTICS.md)** | 📊 SQL queries voor cost tracking en analytics |
| **[docs/migrations/README.md](./docs/migrations/README.md)** | 💾 Database migrations index |
| **[docs/SETUP_CHECKLIST.md](./docs/SETUP_CHECKLIST.md)** | ✅ Stap-voor-stap setup checklist |
| **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** | 🚀 Deployment guide (Vercel/Netlify/Docker) |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Vector DB**: Pinecone Assistant (voor RAG)
- **LLM**: OpenAI GPT-4o
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (aanbevolen) / Netlify / Docker

---

## ✨ Features

### Progressive Web App (PWA)
- 📱 **Installeerbaar** op iOS en Android (geen App Store nodig!)
- 🎨 **Standalone mode** - werkt als native app zonder browser UI
- 🔌 **Offline support** - blijft werken zonder internet
- ⚡ **Caching strategies** - snellere laadtijden
- 🎯 **App-achtige ervaring** - volledige mobiele optimalisatie

### Chat Interface
- Multi-taal support (12 talen met automatische detectie)
- Real-time streaming antwoorden
- Bronvermelding met paginanummers
- Error handling met user-friendly messages
- Content filter detectie

### Analytics & Logging
- Alle chat requests opgeslagen in Supabase
- Cost tracking per request (Pinecone + OpenAI)
- Performance metrics (response tijd, token usage)
- Error categorisatie en diagnostics
- Session tracking (unieke gebruikers)

### Developer Tools
- Structured console logging met emoji's
- Developer sidebar met session stats
- Type-safe API routes
- Comprehensive error handling

---

## 📦 Project Structuur

```
geostickverkoophrqabot/
├── app/
│   ├── api/chat/route.ts       # ⭐ Hoofd API route (RAG logica)
│   ├── page.tsx                # ⭐ Chat interface (frontend)
│   ├── components/             # React componenten
│   └── translations.ts         # 12 talen
│
├── lib/
│   ├── pinecone.ts            # Context retrieval uit HR docs
│   ├── openai.ts              # GPT-4o antwoord generatie
│   ├── prompts.ts             # System prompts
│   ├── logging.ts             # Logging & analytics
│   └── supabase/
│       ├── supabase-client.ts # Database logging
│       └── migrations/        # SQL migraties
│           └── 001_initial_schema.sql
│
├── docs/                      # ⭐ Alle documentatie
│   ├── README.md              # Setup guide
│   ├── CLAUDE.md              # AI assistant instructies
│   ├── SUPABASE.md            # Database docs
│   ├── SUPABASE_ANALYTICS.md  # SQL queries
│   ├── SETUP_CHECKLIST.md     # Checklist
│   └── DEPLOYMENT.md          # Production deployment
│
├── PROJECT_STRUCTURE.md       # Code structuur uitleg
├── .env.example               # Environment template
└── package.json               # Dependencies
```

---

## 🔑 Environment Variables

Zie `.env.example` voor template. Verplicht:

```bash
# Pinecone (voor RAG context retrieval)
PINECONE_API_KEY=your_key_here
PINECONE_ASSISTANT_NAME=geostick-hr-assistant

# OpenAI (voor LLM antwoorden)
OPENAI_API_KEY=your_key_here

# Supabase (optioneel - voor logging/analytics)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Opmerking**: Zonder Supabase werkt de chat nog steeds, maar logs gaan alleen naar console.

---

## 💰 Kosten

De app tracked automatisch alle kosten:

### Pinecone Assistant
- **Context retrieval**: $5 per 1M tokens
- **Hosting**: $0.05/uur (~$36/maand)
- **Gemiddeld per request**: ~$0.006

### OpenAI GPT-4o
- **Input tokens**: $2.50 per 1M tokens
- **Output tokens**: $10 per 1M tokens
- **Gemiddeld per request**: ~$0.002

### Supabase
- **Free tier**: 500 MB database (~500k chat logs)
- **Pro**: $25/maand (8 GB database + backups)

**Totaal per chat**: ~$0.008 ($8 per 1000 vragen)

Zie [docs/SUPABASE_ANALYTICS.md](./docs/SUPABASE_ANALYTICS.md) voor cost tracking queries.

---

## 🎨 Screenshots

### Chat Interface
![Chat Interface](./docs/assets/chat-interface.png)
*12-talige chat interface met real-time antwoorden en bronvermelding*

### Developer Sidebar
![Developer Sidebar](./docs/assets/dev-sidebar.png)
*Session statistieken met costs en performance metrics*

---

## 📱 PWA Installatie (App-achtige ervaring)

De Geostick HR Bot is een **Progressive Web App** die geïnstalleerd kan worden als native app op mobiele devices!

### Op iOS (iPhone/iPad)

1. Open de app in **Safari**: `https://geostickqabot-hr-v1.vercel.app`
2. Tik op het **Deel-icoon** (vierkant met pijl omhoog)
3. Scroll naar beneden en kies **"Zet op beginscherm"**
4. Tik **"Voeg toe"**
5. ✅ De app verschijnt nu op je beginscherm zonder browser UI!

### Op Android (Chrome)

1. Open de app in **Chrome**: `https://geostickqabot-hr-v1.vercel.app`
2. Tik op het **menu** (drie puntjes rechtsboven)
3. Selecteer **"App installeren"** of **"Toevoegen aan startscherm"**
4. Tik **"Installeren"**
5. ✅ De app opent nu als standalone app zonder adresbalk!

### Op Desktop (Chrome/Edge)

1. Open `https://geostickqabot-hr-v1.vercel.app`
2. Klik op het **installatie-icoontje** in de adresbalk (➕)
3. Klik **"Installeren"**
4. ✅ De app opent als desktop applicatie!

### Voordelen van Installatie

- 🎯 **Geen browser UI** - Volledige scherm app ervaring
- ⚡ **Sneller** - Gecachte assets voor instant loading
- 🔌 **Offline support** - Werkt ook zonder internet (met fallback pagina)
- 📲 **Native gevoel** - Eigen app icoon op startscherm
- 🎨 **Geostick branding** - Rood theme met logo

---

## 🚀 Deployment

Voor productie deployment zie **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**.

### Quick Deploy op Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

Voeg environment variables toe via Vercel dashboard → Settings → Environment Variables.

---

## 📊 Analytics

Supabase logt automatisch:
- ✅ Alle vragen en antwoorden
- ✅ Response tijden
- ✅ Token usage (Pinecone + OpenAI)
- ✅ Kosten per request
- ✅ Error logs met categorisatie
- ✅ Content filter events
- ✅ Session tracking

Gebruik queries uit [docs/SUPABASE_ANALYTICS.md](./docs/SUPABASE_ANALYTICS.md) voor:
- Dagelijkse/wekelijkse/maandelijkse costs
- Meest gestelde vragen
- Performance metrics
- Error rates

---

## 🔒 Security

- ✅ API keys alleen via environment variables
- ✅ `.env.local` in `.gitignore`
- ✅ Supabase service_role key alleen server-side
- ✅ Content filter protection
- ✅ Input validation
- ✅ Error messages lekken geen sensitive data

---

## 🧪 Testing

```bash
# Linting
npm run lint

# Build test
npm run build

# TypeScript check
npx tsc --noEmit
```

---

## 📖 Hoe het werkt

### RAG Flow

```
1. User stelt vraag in chat
        ↓
2. API Route ontvangt request
        ↓
3. Pinecone haalt top 3 relevante passages uit HR docs
        ↓
4. System prompt wordt gegenereerd met context
        ↓
5. OpenAI GPT-4o genereert antwoord
        ↓
6. Antwoord + citations terug naar user
        ↓
7. Request wordt gelogd in Supabase
```

Zie [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) voor gedetailleerde code flow.

---

## 🛠️ Development Commands

```bash
npm run dev     # Start development server (http://localhost:3000)
npm run build   # Build voor productie
npm start       # Start productie server
npm run lint    # Run ESLint
```

---

## 🐛 Troubleshooting

### "Missing environment variables"
→ Check `.env.local` bestaat en bevat alle keys uit `.env.example`

### "Assistant not found"
→ Verifieer `PINECONE_ASSISTANT_NAME` exact matched met Pinecone console

### "Supabase logging failed"
→ Non-critical - chat blijft werken. Check Supabase credentials in `.env.local`

### Build errors
```bash
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

Meer troubleshooting: [docs/README.md](./docs/README.md) en [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## 📞 Support

Voor vragen:
- **Setup**: Lees [docs/README.md](./docs/README.md)
- **Code**: Zie [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- **Database**: Check [docs/SUPABASE.md](./docs/SUPABASE.md)
- **Deployment**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- **Claude Code**: [docs/CLAUDE.md](./docs/CLAUDE.md)

---

## 🔄 Updates & Maintenance

### Nieuwe HR documenten toevoegen
1. Ga naar Pinecone Console → Assistants
2. Open `geostick-hr-assistant`
3. Upload nieuwe PDF/Word bestanden
4. Pinecone indexeert automatisch

### Database cleanup (oude logs)
```sql
-- Run in Supabase SQL Editor
DELETE FROM "Geostick_Logs_Data_QABOTHR"
WHERE timestamp < CURRENT_DATE - INTERVAL '90 days';
```

### Kosten verlagen
- Verlaag `topK` in `lib/pinecone.ts` (van 3 naar 2)
- Gebruik `gpt-4o-mini` in `lib/openai.ts` (90% goedkoper)

---

## 📝 License

**Proprietary** - GeoStick Internal Use Only

---

## 🎉 Credits

**Built for**: GeoStick
**Technology**: Next.js, Pinecone, OpenAI, Supabase
**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: 2025-01-29

---

## 🗺️ Roadmap (Toekomstig)

- [ ] 👍 Feedback buttons (helpful/not helpful) - schema al voorbereid
- [ ] 📧 Email notifications bij high costs
- [ ] 📈 Admin dashboard voor analytics
- [ ] 🔐 User authentication (Supabase Auth)
- [ ] 💬 Chat history opslaan per gebruiker
- [ ] 🎯 Rate limiting middleware
- [ ] 🌐 Custom domain support
- [ ] 📱 Mobile app (React Native)

---

**Made with ❤️ for GeoStick**

*Happy chatting!* 🤖💬
