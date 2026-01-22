# Client Onboarding Form

Dit formulier bevat alle informatie die nodig is om een nieuwe HR Assistant te configureren.
Vul alle velden in en geef dit bestand aan Claude Code om automatisch te configureren.

---

## 1. Bedrijfsinformatie

```yaml
# Verplicht
company_name: "Acme Corporation"
company_short: "Acme HR"

# Optioneel
tagline: "Jouw Intelligente HR Assistent"
company_website: "https://acme-corp.nl"
support_email: "hr@acme-corp.nl"
```

## 2. Branding & Kleuren

```yaml
# Primaire kleur (hex formaat, bijv. #FF5733)
primary_color: "#3B82F6"
primary_dark: "#2563EB"      # Donkerdere variant voor hover
primary_light: "#60A5FA"     # Lichtere variant voor achtergronden

# Optioneel - wordt automatisch gegenereerd als niet ingevuld
secondary_color: "#10B981"
background_color: "#FFFFFF"
```

## 3. Logo

```yaml
# Kies één van de volgende opties:

# Optie A: URL naar logo (aanbevolen)
logo_url: "https://acme-corp.nl/logo.png"

# Optie B: Upload logo bestand
# Plaats het bestand in: public/logo.png
# En laat logo_url leeg

# Logo afmetingen (optioneel)
logo_width: 120    # pixels
logo_height: 40    # pixels
```

## 4. Taal & Regio

```yaml
default_language: "nl"     # nl, en, de, fr, es, it, pl, tr, ar, zh, pt, ro
og_locale: "nl_NL"         # Voor social media sharing
```

## 5. API Configuratie

```yaml
# Pinecone (voor document zoeken)
pinecone_api_key: "pcsk_..."
pinecone_assistant_name: "acme-corp-hr-assistant"

# OpenAI (voor antwoorden genereren)
openai_api_key: "sk-..."
```

## 6. Database (Supabase) - Optioneel

```yaml
# Laat leeg als je geen logging/analytics wilt
supabase_url: "https://xxx.supabase.co"
supabase_service_key: "eyJ..."
table_name: "chat_logs"           # Of: "acme_corp_chat_logs"
storage_bucket: "acme-corp-hr-documents"
```

## 7. Tenant Identificatie

```yaml
tenant_id: "acme-corp"            # Lowercase, geen spaties
tenant_name: "Acme Corporation"
```

## 8. Feature Flags

```yaml
show_powered_by: true     # Toon "Powered by Levtor" footer
enable_feedback: false    # Feedback knoppen (thumbs up/down)
enable_analytics: true    # Logging naar database
```

## 9. Deployment

```yaml
app_url: "https://acme-corp-hr.vercel.app"
```

## 10. HR Documenten

Upload de volgende documenten naar Pinecone Assistant:
- [ ] Personeelsgids / Employee Handbook
- [ ] CAO / Collective Agreement
- [ ] Vakantie- en verlofregeling
- [ ] Ziekteverzuimbeleid
- [ ] Pensioenregeling
- [ ] Overige HR documenten

---

# Automatische Configuratie

Zodra dit formulier is ingevuld, zeg tegen Claude Code:

```
Configureer deze client op basis van CLIENT_ONBOARDING.md
```

Claude Code zal automatisch:
1. ✅ `.env.local` genereren met alle environment variables
2. ✅ Branding configuratie valideren
3. ✅ Supabase database setup uitvoeren (indien geconfigureerd)
4. ✅ Build testen
5. ✅ Rapportage geven van handmatige stappen

---

# Handmatige Stappen (na automatische configuratie)

1. **Pinecone Setup**
   - Ga naar https://app.pinecone.io
   - Maak een nieuwe Assistant: `{pinecone_assistant_name}`
   - Upload alle HR documenten

2. **Supabase Storage** (indien van toepassing)
   - Maak bucket: `{storage_bucket}`
   - Maak bucket PUBLIC
   - Upload dezelfde PDFs voor citation links

3. **Vercel Deploy**
   - `git push` (auto-deploy) OF
   - `vercel deploy --prod`
   - Kopieer environment variables naar Vercel dashboard

4. **Logo Upload** (indien lokaal)
   - Plaats logo in `public/logo.png`
   - Run: `node scripts/generate-icons.js`

5. **Test**
   - Open de app URL
   - Stel een HR vraag
   - Controleer of antwoord + bronnen correct werken
