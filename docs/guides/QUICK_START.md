# Quick Start - HR Assistant AI Setup

**Tijd:** 15-20 minuten per client
**Methode:** Markdown-driven configuratie met Claude Code automation

---

## 🎯 Overzicht

Deze guide laat zien hoe je in **15-20 minuten** een volledig gepersonaliseerde HR chatbot deployment kunt opzetten voor een nieuwe client.

**Workflow:**
1. Clone repo en vul config bestand in (5 min)
2. Claude Code configureert automatisch alles (5 min)
3. Handmatige setup externe services (10 min)
4. KLAAR!

---

## ⚙️ Vereisten

Voordat je begint heb je nodig:

### Accounts (eenmalig aanmaken)
- ✅ **Supabase** account (supabase.com) - Vector search & database
- ✅ **OpenAI** account (platform.openai.com)
- ✅ **Vercel** account (vercel.com)
- ✅ **Claude Code** (claude.ai/code)
- ✅ **Cohere** account (cohere.com) - OPTIONEEL (reranking)

### Van de Client
- ✅ HR documenten (PDF's)
- ✅ Bedrijfsnaam en branding info
- ✅ Logo (optioneel)
- ✅ Primaire brandkleur (hex code)

---

## 🚀 Stap 1: Repository Setup (2 min)

### Clone en Prepare

```bash
# Clone repository
git clone https://github.com/jouw-org/hr-assistant-ai.git
cd hr-assistant-ai

# Maak client config
cp CLIENT_CONFIG.example.md CLIENT_CONFIG.md
```

**Belangrijk:** Commit CLIENT_CONFIG.md NIET naar Git (bevat API keys)!

---

## 📝 Stap 2: Configuratie Invullen (5 min)

Open `CLIENT_CONFIG.md` en vul de volgende secties in:

### Minimaal Vereist

```yaml
# 1. CLIENT INFORMATIE
tenant_id: acme-corp                          # Unieke ID (lowercase-met-dashes)
tenant_name: Acme Corporation B.V.            # Volledige bedrijfsnaam
company_short_name: Acme HR                   # Korte naam

# 2. BRANDING
company_name: Acme HR Assistant               # Naam in de app
tagline: Your Intelligent HR Partner          # Ondertitel
primary_color: #FF5733                        # Primaire brandkleur (hex)
logo_url: https://acme.com/logo.png           # Logo URL (of leeg)

# 3. SUPABASE (vector search & database)
url: https://xxx.supabase.co                  # Supabase project URL
service_role_key: xxxxx                       # Service role key (server-side only)
anon_key: xxxxx                               # Anon key (client-side)

# 4. OPENAI
api_key: sk-xxxxx                             # OpenAI API key
model: gpt-4o                                 # Of gpt-4o-mini (goedkoper)
```

### Optioneel: Cohere Reranking

```yaml
# 5. COHERE (optioneel - voor betere zoekresultaten)
cohere_api_key: xxxxx                         # Cohere API key voor reranking
```

**Tip:** Zie `CLIENT_CONFIG.example.md` voor uitgebreide opties (kleuren, logo's, features).

---

## 🤖 Stap 3: Claude Code Automation (5 min)

### Run de Automation

1. **Open Claude Code**
   ```bash
   # In je terminal of IDE
   code .  # Of open directory in VS Code met Claude Code extension
   ```

2. **Share configuratie met Claude Code**
   ```
   Prompt: "Configureer deze client op basis van CLIENT_CONFIG.md"
   ```

3. **Claude Code zal automatisch:**
   - ✅ CONFIG.md lezen en valideren
   - ✅ `.env.local` genereren met alle environment variables
   - ✅ Branding configureren
   - ✅ Supabase database opzetten (als geconfigureerd)
   - ✅ Validatie draaien
   - ✅ Rapporteren welke manual steps nodig zijn

### Verwachte Output

```
✅ Configuration Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AUTOMATED:
✅ .env.local generated with 18 environment variables
✅ Branding configured: Acme HR Assistant, color #FF5733
✅ Supabase database setup complete (table: chat_logs)
✅ Configuration validated

MANUAL STEPS REQUIRED:
⚠️ Upload HR documents to Pinecone Assistant
⚠️ Create Supabase Storage bucket
⚠️ Deploy to Vercel
```

---

## 🔧 Stap 4: Manual Setup Externe Services (10 min)

### A. Pinecone Assistant Setup (5 min)

**Waarom eerst?** Je hebt de assistant naam nodig voor CLIENT_CONFIG.md

1. **Ga naar** [pinecone.io](https://pinecone.io) → Dashboard
2. **Create Assistant**
   - Name: `acme-corp-hr-assistant` (gebruik tenant-id prefix)
   - Description: "HR assistant for Acme Corporation"
3. **Upload HR Documents**
   - Upload alle client HR PDFs
   - Wacht tot indexing compleet is (2-5 min)
4. **Copy Credentials**
   - API Key: `pcsk_xxxxx`
   - Assistant Name: `acme-corp-hr-assistant`
5. **Update CLIENT_CONFIG.md** met deze credentials
6. **Rerun Claude Code** om .env.local bij te werken

### B. Supabase Setup (3 min) - OPTIONEEL

**Als je Supabase gebruikt voor analytics:**

#### Database (Automatisch door Claude Code)
- Claude Code heeft dit al gedaan via agent
- Verify: Ga naar Supabase Dashboard → Table Editor → `chat_logs` table should exist

#### Storage Bucket (Handmatig)
1. **Ga naar** Supabase Dashboard → Storage
2. **Create new bucket**
   - Name: `acme-corp-hr-documents`
   - Public bucket: **YES** (belangrijk!)
3. **Upload HR PDFs**
   - Upload zelfde PDFs als in Pinecone
   - Gebruikt voor clickable citations

### C. Vercel Deployment (2 min)

1. **Connect repository**
   ```bash
   # Push naar GitHub (als nog niet gedaan)
   git add .
   git commit -m "Setup Acme Corp client"
   git push
   ```

2. **Deploy via Vercel**
   - Ga naar [vercel.com](https://vercel.com)
   - New Project → Import Git Repository
   - Select repository
   - **BELANGRIJK:** Set environment variables
     - Kopieer inhoud van `.env.local`
     - Plak in Vercel Environment Variables
   - Deploy!

3. **Alternative: Vercel CLI**
   ```bash
   npm install -g vercel
   vercel deploy --prod
   ```

---

## ✅ Stap 5: Testing (3 min)

### Lokaal Testen

```bash
# Install dependencies (eerste keer)
npm install

# Start development server
npm run dev

# Open in browser
# http://localhost:3000
```

### Test Checklist

- [ ] Chatbot laadt correct
- [ ] Branding klopt (kleuren, logo, naam)
- [ ] Stel 5 HR vragen → Check of antwoorden kloppen
- [ ] Citations tonen juiste documenten
- [ ] PDF links werken (als Supabase Storage gebruikt)
- [ ] Taalwissel werkt (test 2-3 talen)

### Production Testen

```bash
# Open deployed URL (van Vercel)
https://acme-hr-assistant.vercel.app

# Test zelfde checklist als boven
```

---

## 🎉 Klaar!

Je hebt nu een volledig gepersonaliseerde HR chatbot voor je client!

### Volgende Stappen

1. **Deel met client**
   - Stuur deployed URL
   - Geef korte demo
   - Uitleg hoe vragen te stellen

2. **Optioneel: Custom Domain**
   - Vercel → Settings → Domains
   - Add `hr.acme-corp.com`
   - Update DNS records bij client

3. **Monitoring**
   - Als Supabase gebruikt: Check analytics
   - Monitor kosten (Pinecone, OpenAI)
   - Track usage per client

---

## 📊 Kosten Overzicht

### Per Client per Maand

| Service | Kosten |
|---------|--------|
| Pinecone (5GB index) | €7 |
| OpenAI (2000 queries) | €5 |
| Supabase (gedeeld) | €2 |
| Vercel (gedeeld) | €1 |
| **Totaal** | **€15** |

**Aanbevolen prijs:** €50-100/maand per client
**Winstmarge:** 70-85%

---

## 🔄 Volgende Client Setup

Voor elke nieuwe client:

```bash
# 1. Nieuwe branch/folder (of clone fresh)
git checkout -b client/nieuwe-klant

# 2. Nieuwe config
cp CLIENT_CONFIG.example.md CLIENT_CONFIG.md
# Vul in voor nieuwe klant

# 3. Claude Code automation
"Configureer deze client op basis van CLIENT_CONFIG.md"

# 4. Manual steps (Pinecone, Supabase, Vercel)
# ... herhaal Stap 4

# 5. Deploy
vercel deploy --prod

# KLAAR in 15-20 min!
```

---

## 📚 Meer Resources

### Documentatie
- **[CLIENT_CONFIG.example.md](CLIENT_CONFIG.example.md)** - Complete config reference
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Uitgebreide deployment guide
- **[BRANDING_QUICK_REF.md](BRANDING_QUICK_REF.md)** - Branding opties en voorbeelden
- **[OPSCHALEN_HANDLEIDING.md](OPSCHALEN_HANDLEIDING.md)** - Schalen naar 10+ clients

### Troubleshooting
- **[BUILD_NOTES.md](BUILD_NOTES.md)** - Build issues en oplossingen
- **[CLAUDE.md](CLAUDE.md)** - Volledige technische documentatie

### Support
- GitHub Issues: [Link naar jouw repo issues]
- Email: [Jouw support email]

---

## 🆘 Veelvoorkomende Problemen

### "Pinecone API key invalid"
- Check of key correct gekopieerd (geen spaties)
- Verify key in Pinecone dashboard → API Keys
- Key moet beginnen met `pcsk_`

### "Supabase connection failed"
- Check NEXT_PUBLIC_SUPABASE_URL in .env.local
- Verify service role key (niet anon key!)
- Test connection in Supabase dashboard

### "Logo loads niet"
- Check of logo URL toegankelijk is
- Probeer logo in browser te openen
- Alternative: gebruik lokale path `/images/logo.png`

### "Build fails op Vercel"
- Check alle environment variables zijn gezet
- Verify TypeScript errors: `npx tsc --noEmit`
- Check build logs in Vercel dashboard

---

## 💡 Pro Tips

### 1. Batch Setup
Als je meerdere clients tegelijk setup:
```bash
# Maak template repository
# Voor elke client: gebruik template

vercel link  # Link elk project apart
vercel env pull  # Pull env vars lokaal
```

### 2. Logo Hosting
- **Best:** Gebruik client's eigen website URL
- **Alternative:** Upload naar Vercel (`/public/images/`)
- **CDN:** Cloudinary of ImgIX voor snellere loading

### 3. Cost Optimization
- **Goedkoper model:** `gpt-4o-mini` (90% cheaper)
- **Minder context:** Verlaag `topK` van 3 naar 2 in `lib/pinecone.ts`
- **Caching:** Enable in OpenAI settings

### 4. Snelle Deployment
```bash
# Maak Vercel template project
# Deploy via template URL met pre-filled env vars
https://vercel.com/new/clone?repository-url=...&env=TENANT_ID,PINECONE_API_KEY,...
```

---

**Happy deploying! 🚀**

Vragen? Check [CLAUDE.md](CLAUDE.md) voor complete technical documentation.
