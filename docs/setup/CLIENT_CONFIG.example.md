# Client Configuration

**CLIENT:** [Vul bedrijfsnaam in]
**STATUS:** 🔴 Te configureren (verander naar ✅ wanneer volledig ingericht)
**DATUM:** [Vandaag]

---

## 📋 INSTRUCTIES

### Voor Jou (Setup Engineer)

1. **Kopieer dit bestand:**
   ```bash
   cp CLIENT_CONFIG.example.md CLIENT_CONFIG.md
   ```

2. **Vul alle secties hieronder in:**
   - Zet [PLACEHOLDERS] vervangen door echte waarden
   - Laat GEEN velden leeg tenzij "optioneel"
   - Check of alle API keys correct zijn

3. **Share met Claude Code:**
   - Open Claude Code
   - Share/reference dit `CLIENT_CONFIG.md` bestand
   - Claude Code zal automatisch de configuratie toepassen

4. **Volg manual steps die Claude rapporteert**

---

## 🤖 INSTRUCTIES VOOR CLAUDE CODE

Wanneer je dit CLIENT_CONFIG.md bestand leest, voer de volgende acties automatisch uit:

### Automation Flow:

1. **Parse Configuration**
   - Lees alle waarden uit dit bestand
   - Valideer dat required velden ingevuld zijn
   - Check formats (hex colors, URLs, etc.)

2. **Generate .env.local**
   - Maak `.env.local` aan met alle environment variables
   - Gebruik waarden uit dit config bestand
   - Include tenant info, API keys, branding, Supabase settings

3. **Update Branding (optioneel)**
   - Als gebruiker wil dat branding in code staat (niet via env):
   - Update `lib/branding.config.ts` met branding values
   - Anders: gebruik environment variables (aanbevolen)

4. **Supabase Setup (als configured)**
   - Als Supabase credentials aanwezig:
   - Start `supabase-integration-manager` agent
   - Configureer database (run migrations, create table)
   - Valideer connectie

5. **Validation & Reporting**
   - Validate generated configuration
   - Test dat alle required services geconfigureerd zijn
   - Rapporteer:
     - ✅ Wat succesvol geconfigureerd is
     - ⚠️ Wat nog handmatig moet (Vercel deploy, Pinecone docs upload, etc.)
     - ❌ Eventuele fouten of missende waarden

6. **Next Steps Guide**
   - Toon duidelijke volgende stappen voor deployment
   - Include commands om lokaal te testen
   - Include deployment instructies

---

## 1️⃣ CLIENT INFORMATIE

### Basis Info
```yaml
tenant_id: [lowercase-met-dashes]          # Voorbeeld: acme-corp
tenant_name: [Volledige Bedrijfsnaam]      # Voorbeeld: Acme Corporation B.V.
company_short_name: [Korte naam]           # Voorbeeld: Acme HR
```

**Voorbeelden:**
- `tenant_id: geostick` → `tenant_name: GeoStick B.V.`
- `tenant_id: techstart-nl` → `tenant_name: TechStart Nederland`

---

## 2️⃣ BRANDING

### Bedrijfsinformatie
```yaml
company_name: [Naam voor in de app]        # Voorbeeld: Acme HR Assistant
tagline: [Ondertitel]                      # Voorbeeld: Your Intelligent HR Partner
description: [Korte beschrijving]          # Voorbeeld: AI-powered HR support for Acme employees
```

### Kleuren
```yaml
primary_color: [Hex code]                  # Voorbeeld: #FF5733
primary_dark: [Hex code - optioneel]       # Voorbeeld: #D64525 (hover states)
primary_light: [Hex code - optioneel]      # Voorbeeld: #FF8A65 (highlights)
secondary_color: [Hex code - optioneel]    # Voorbeeld: #10B981 (accents)
```

**Populaire Kleurenschema's:**
- **Tech Blue:** `#3B82F6` / `#2563EB` / `#60A5FA`
- **Corporate Red:** `#EF4444` / `#DC2626` / `#F87171`
- **Healthcare Green:** `#10B981` / `#059669` / `#34D399`
- **Financial Purple:** `#8B5CF6` / `#7C3AED` / `#A78BFA`

### Logo & Assets
```yaml
logo_url: [URL of pad naar logo]           # Voorbeeld: https://acme.com/logo.png
logo_width: [Breedte in pixels - optioneel] # Voorbeeld: 200
logo_height: [Hoogte in pixels - optioneel] # Voorbeeld: 60
icon_url: [URL voor PWA icon - optioneel]  # Voorbeeld: https://acme.com/icon-192.png
favicon_url: [URL voor favicon - optioneel]# Voorbeeld: https://acme.com/favicon.ico
```

**Logo Opties:**
1. **Client Website:** `https://acme-corp.com/assets/logo.png`
2. **CDN:** `https://res.cloudinary.com/acme/logo.png`
3. **Lokaal:** `/images/acme-logo.png` (zet bestand in `/public/images/`)
4. **Geen logo:** Laat leeg, gebruikt company_name als text

---

## 3️⃣ PINECONE CONFIGURATIE

**⚠️ BELANGRIJK:** Maak eerst de Pinecone Assistant aan voordat je dit invult!

### Steps om Pinecone Assistant te maken:
1. Ga naar [pinecone.io](https://pinecone.io)
2. Klik "Create Assistant"
3. Naam: `[tenant-id]-hr-assistant` (bijv. `acme-corp-hr-assistant`)
4. Upload alle HR documenten (PDFs)
5. Wacht tot indexing compleet is
6. Kopieer API key en assistant naam hieronder

### Configuratie
```yaml
api_key: [Pinecone API key]                # Begint met: pcsk_
assistant_name: [Assistant naam]           # Voorbeeld: acme-corp-hr-assistant
```

**Voorbeeld:**
```yaml
api_key: pcsk_7a8b9c_1d2e3f4g5h6i7j8k9l0m
assistant_name: acme-corp-hr-assistant
```

---

## 4️⃣ OPENAI CONFIGURATIE

### Configuratie
```yaml
api_key: [OpenAI API key]                  # Begint met: sk-
model: gpt-4o                              # Of: gpt-4o-mini (goedkoper)
```

**Model Opties:**
- `gpt-4o` - Beste kwaliteit, €2.50/1M input tokens
- `gpt-4o-mini` - 90% goedkoper, goede kwaliteit, €0.15/1M input tokens

---

## 5️⃣ SUPABASE CONFIGURATIE (OPTIONEEL)

**Supabase is optioneel** - zonder Supabase gaan logs naar console.

### Wanneer Supabase Gebruiken?
- ✅ Je wilt analytics en usage tracking
- ✅ Je wilt PDF links in citations
- ✅ Je wilt kosten per client monitoren
- ❌ Niet nodig voor basis chatbot functionaliteit

### Database Settings
```yaml
url: [Supabase project URL]                # Voorbeeld: https://abc123.supabase.co
service_role_key: [Service role key]       # Voorbeeld: eyJhbGc...
table_name: chat_logs                      # Of: [tenant-id]_chat_logs voor aparte table
```

### Storage Settings (voor PDF citations)
```yaml
bucket_name: [Bucket naam]                 # Voorbeeld: acme-corp-hr-documents
```

**⚠️ Handmatige Steps voor Supabase:**
1. **Database Setup:**
   - Claude Code zal dit automatisch proberen via agent
   - Of: Run manual `docs/migrations/MULTI_TENANT_SETUP.sql`

2. **Storage Bucket:**
   - Ga naar Supabase Dashboard → Storage
   - Create new bucket: `[tenant-id]-hr-documents`
   - Maak bucket PUBLIC
   - Upload client HR PDFs

---

## 6️⃣ FUN FACTS (OPTIONEEL)

**"Wist je dat..." feitjes** worden getoond terwijl de bot nadenkt over een antwoord.
Dit maakt de wachtervaring leuker en promoot bedrijfsinformatie.

### Fun Facts Configuratie
```yaml
fun_facts_enabled: true                    # true/false
fun_facts_prefix: Wist je dat              # Prefix voor elk feitje (zonder "...")
```

### Fun Facts (één per regel)
```yaml
fun_facts:
  - wij al 25 jaar bestaan?
  - ons hoofdkantoor in Rotterdam staat?
  - we meer dan 200 medewerkers hebben?
  - we vorig jaar de HR Innovation Award wonnen?
  - je bij ons 25 vakantiedagen krijgt?
  - we een eigen bedrijfsrestaurant hebben?
```

**Tips:**
- Begin elk feitje met een kleine letter (prefix "Wist je dat" wordt automatisch toegevoegd)
- Eindig met een vraagteken voor consistentie
- 5-10 feitjes is ideaal
- Houd feitjes kort (max 1 regel)
- Mix bedrijfsfeitjes met leuke weetjes

**Voorbeelden per branche:**
- **Tech:** "we dagelijks 1 miljoen requests verwerken?"
- **Retail:** "we 50 winkels in Nederland hebben?"
- **Healthcare:** "we vorig jaar 10.000 patiënten hielpen?"

---

## 7️⃣ FEATURES & OPTIES (OPTIONEEL)

### Feature Flags
```yaml
show_powered_by: [true/false]              # Toon "Powered by Levtor" in footer
enable_feedback: [true/false]              # Enable feedback buttons
enable_analytics: [true/false]             # Track usage analytics
show_cost_tracking: [true/false]           # Toon kosten in developer sidebar
```

**Aanbevolen Settings:**
- Demo/Test: `show_powered_by: true`, `enable_analytics: true`
- Productie: `show_powered_by: false`, `enable_analytics: true`

---

## 7️⃣ URLS & METADATA (OPTIONEEL)

```yaml
base_url: [Deployed URL]                   # Voorbeeld: https://hr.acme-corp.com
company_website: [Client website]          # Voorbeeld: https://acme-corp.com
support_email: [Support email]             # Voorbeeld: hr-support@acme-corp.com
```

---

## ✅ CONFIGURATIE CHECKLIST

Vink af wat je hebt ingevuld:

### Required (Minimaal)
- [ ] Tenant ID ingevuld
- [ ] Tenant naam ingevuld
- [ ] Company name ingevuld
- [ ] Primary color ingevuld (hex code)
- [ ] Pinecone API key ingevuld
- [ ] Pinecone assistant name ingevuld
- [ ] OpenAI API key ingevuld

### Branding (Aanbevolen)
- [ ] Tagline ingevuld
- [ ] Logo URL ingevuld (of besloten geen logo te gebruiken)
- [ ] Icon URL ingevuld (voor PWA)

### Supabase (Optioneel)
- [ ] Supabase URL ingevuld
- [ ] Supabase service role key ingevuld
- [ ] Table name besloten (shared of dedicated)
- [ ] Bucket name ingevuld
- [ ] Bucket aangemaakt in Supabase Dashboard
- [ ] Bucket is PUBLIC
- [ ] PDFs geüpload naar bucket

### Validatie
- [ ] Alle hex codes zijn geldig (6 karakters, beginnen met #)
- [ ] Alle URLs zijn geldig en toegankelijk
- [ ] API keys zijn correct gekopieerd (geen spaties)
- [ ] Tenant ID is lowercase met dashes (geen spaties/underscores)

---

## 🚀 READY TO GO?

Als alle required velden ingevuld zijn:

1. **Save dit bestand** als `CLIENT_CONFIG.md`
2. **Share met Claude Code** - zeg: "Configureer deze client op basis van CLIENT_CONFIG.md"
3. **Claude Code zal:**
   - .env.local genereren
   - Supabase opzetten (als geconfigureerd)
   - Validatie draaien
   - Next steps rapporteren

4. **Volg de manual steps** die Claude rapporteert
5. **Test lokaal:** `npm run dev`
6. **Deploy naar Vercel**
7. **KLAAR!** ✅

---

## 📝 NOTITIES

Ruimte voor extra notities over deze client:

```
[Voeg hier client-specifieke notities toe]
Voorbeelden:
- Speciale wensen qua branding
- Custom HR documenten die geüpload zijn
- Contactpersoon bij client
- Deployment URL
- Go-live datum
```

---

## 🆘 HULP NODIG?

- **Documentatie:** Zie `OPSCHALEN_HANDLEIDING.md` voor uitgebreide setup guide
- **Branding:** Zie `BRANDING_QUICK_REF.md` voor kleurenschema's en voorbeelden
- **Deployment:** Zie `DEPLOYMENT_CHECKLIST.md` voor stap-voor-stap deployment

---

**Laatst geupdate:** [Datum]
**Geconfigureerd door:** [Jouw naam]
**Client status:** [In setup / Testing / Live]
