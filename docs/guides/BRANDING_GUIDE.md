# Complete Branding Setup Guide

**Versie 2.0** - Volledig White-Label UI Customization

---

## 🎨 Overzicht

Je kunt **100% van de UI** aanpassen via environment variables - **zonder code wijzigingen**!

**Wat je kunt customizen**:
- ✅ Bedrijfsnaam & tagline
- ✅ Alle kleuren (primary, secondary, background, text)
- ✅ Logo's (header, favicon, PWA icons)
- ✅ Watermark/achtergrond logo
- ✅ Complete white-label look

**Deploy tijd**: 5 minuten om volledig te customizen

---

## 🚀 Quick Start: Basis Branding

### Minimaal (3 variabelen)

Dit geeft al een volledig branded ervaring:

```bash
NEXT_PUBLIC_COMPANY_NAME=Acme Corporation
NEXT_PUBLIC_PRIMARY_COLOR=#FF5733
NEXT_PUBLIC_LOGO_URL=https://acme.com/logo.png
```

**Resultaat**:
- Bedrijfsnaam overal in de app
- Acme kleuren op buttons, links, accents
- Acme logo in header

---

## 🎨 Volledige Branding Setup

### Stap 1: Bedrijfsinformatie

```bash
# Volledige bedrijfsnaam (gebruikt in header, footer, metadata)
NEXT_PUBLIC_COMPANY_NAME=Acme Corporation

# Korte naam (gebruikt in mobiele weergave, PWA)
NEXT_PUBLIC_COMPANY_SHORT=Acme HR

# Tagline (weergegeven op welkomstscherm)
NEXT_PUBLIC_TAGLINE=Your Intelligent HR Partner

# Beschrijving (metadata, SEO)
NEXT_PUBLIC_DESCRIPTION=AI-powered HR support for Acme employees. Get instant answers to your HR questions 24/7.
```

**Waar dit verschijnt**:
- `COMPANY_NAME`: Header, browser titel, footer
- `COMPANY_SHORT`: Mobiele header, PWA app naam
- `TAGLINE`: Welkomstscherm, grote tekst boven chat
- `DESCRIPTION`: Meta tags, social sharing previews

---

### Stap 2: Kleuren (Brand Identity)

#### Primaire Kleuren

```bash
# Hoofdkleur (buttons, links, accents)
NEXT_PUBLIC_PRIMARY_COLOR=#FF5733

# Donkere variant (hover states, gradients)
NEXT_PUBLIC_PRIMARY_DARK=#D64525

# Lichte variant (backgrounds, highlights)
NEXT_PUBLIC_PRIMARY_LIGHT=#FF8A65
```

**Voorbeelden**:
- **Tech Blue**: `#3B82F6` / `#2563EB` / `#60A5FA`
- **Corporate Red**: `#EF4444` / `#DC2626` / `#F87171`
- **Fresh Green**: `#10B981` / `#059669` / `#34D399`
- **Professional Purple**: `#8B5CF6` / `#7C3AED` / `#A78BFA`

#### Secundaire Kleuren (Optioneel)

```bash
# Secundaire kleur voor accenten
NEXT_PUBLIC_SECONDARY_COLOR=#10B981
```

Gebruik voor:
- Success messages (groen)
- Info badges (blauw)
- Highlights

#### Achtergrond Kleuren

```bash
# Hoofdachtergrond (hele app)
NEXT_PUBLIC_BG_COLOR=#FFFFFF

# Surface kleur (cards, chat berichten)
NEXT_PUBLIC_SURFACE_COLOR=#F9FAFB
```

**Tips**:
- **Light mode**: `#FFFFFF` background, `#F9FAFB` surface
- **Soft mode**: `#F9FAFB` background, `#FFFFFF` surface
- **Dark mode**: `#111827` background, `#1F2937` surface

#### Tekst Kleuren

```bash
# Primaire tekst (koppen, belangrijke tekst)
NEXT_PUBLIC_TEXT_PRIMARY=#111827

# Secundaire tekst (body tekst)
NEXT_PUBLIC_TEXT_SECONDARY=#6B7280

# Tertiaire tekst (hints, timestamps)
NEXT_PUBLIC_TEXT_TERTIARY=#9CA3AF
```

---

### Stap 3: Logo's & Iconen

#### Hoofd Logo (Header)

```bash
NEXT_PUBLIC_LOGO_URL=https://acme.com/assets/logo.png
```

**3 Opties**:

**Optie A: Absolute URL** (Aanbevolen)
```bash
NEXT_PUBLIC_LOGO_URL=https://acme.com/logo.png
```
- Logo gehost op klant's domein
- Geen upload naar Vercel nodig
- Makkelijk te updaten

**Optie B: Relative Path**
```bash
NEXT_PUBLIC_LOGO_URL=/images/acme-logo.png
```
- Upload logo naar `/public/images/` in project
- Sneller laden
- Vercel re-deploy nodig bij wijziging

**Optie C: Data URL** (Voor kleine SVG's)
```bash
NEXT_PUBLIC_LOGO_URL=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjYwIi4uLg==
```
- Geen externe request
- Alleen voor kleine SVG's

**Logo Afmetingen**:
```bash
# Breedte in pixels (voor aspect ratio)
NEXT_PUBLIC_LOGO_WIDTH=200

# Hoogte in pixels
NEXT_PUBLIC_LOGO_HEIGHT=60
```

**Aanbevolen maten**:
- Desktop header: 200×60px
- Mobiel header: 150×45px

#### PWA Iconen

```bash
# Standaard icon (192×192px)
NEXT_PUBLIC_ICON_URL=https://acme.com/icon-192.png

# Grote icon (512×512px, high-res)
NEXT_PUBLIC_ICON_LARGE_URL=https://acme.com/icon-512.png

# Favicon (browser tab)
NEXT_PUBLIC_FAVICON_URL=https://acme.com/favicon.ico
```

**Afbeelding specificaties**:
- `icon`: 192×192px PNG, transparant of wit background
- `iconLarge`: 512×512px PNG, zelfde als icon maar groter
- `favicon`: 32×32px ICO of PNG

#### Achtergrond Watermark (Optioneel)

```bash
NEXT_PUBLIC_BACKGROUND_LOGO_URL=https://acme.com/watermark.png
```

**Gebruik voor**:
- Subtiele branding op achtergrond
- Grote, transparante logo achter chat
- Professional look

**Specs**:
- PNG met transparantie
- Grote afmeting (500×500px+)
- Opacity wordt automatisch verlaagd

---

## 📋 Complete Voorbeeld Configuraties

### Voorbeeld 1: Tech Startup (Modern Blue)

```bash
# Bedrijf
NEXT_PUBLIC_COMPANY_NAME=TechFlow AI
NEXT_PUBLIC_COMPANY_SHORT=TechFlow
NEXT_PUBLIC_TAGLINE=Smart Answers, Instantly
NEXT_PUBLIC_DESCRIPTION=Your AI-powered HR assistant

# Kleuren
NEXT_PUBLIC_PRIMARY_COLOR=#3B82F6
NEXT_PUBLIC_PRIMARY_DARK=#2563EB
NEXT_PUBLIC_PRIMARY_LIGHT=#60A5FA
NEXT_PUBLIC_SECONDARY_COLOR=#10B981
NEXT_PUBLIC_BG_COLOR=#FFFFFF
NEXT_PUBLIC_SURFACE_COLOR=#F9FAFB

# Logo
NEXT_PUBLIC_LOGO_URL=https://techflow.com/logo.png
NEXT_PUBLIC_LOGO_WIDTH=180
NEXT_PUBLIC_LOGO_HEIGHT=50
```

### Voorbeeld 2: Corporate Enterprise (Professional Red)

```bash
# Bedrijf
NEXT_PUBLIC_COMPANY_NAME=Global Industries HR
NEXT_PUBLIC_COMPANY_SHORT=Global HR
NEXT_PUBLIC_TAGLINE=Employee Support, 24/7
NEXT_PUBLIC_DESCRIPTION=Professional HR assistance for Global Industries employees

# Kleuren
NEXT_PUBLIC_PRIMARY_COLOR=#DC2626
NEXT_PUBLIC_PRIMARY_DARK=#B91C1C
NEXT_PUBLIC_PRIMARY_LIGHT=#EF4444
NEXT_PUBLIC_SECONDARY_COLOR=#F59E0B
NEXT_PUBLIC_BG_COLOR=#FAFAFA
NEXT_PUBLIC_SURFACE_COLOR=#FFFFFF
NEXT_PUBLIC_TEXT_PRIMARY=#1F2937
NEXT_PUBLIC_TEXT_SECONDARY=#4B5563

# Logo
NEXT_PUBLIC_LOGO_URL=https://globalind.com/assets/hr-logo.svg
NEXT_PUBLIC_ICON_URL=https://globalind.com/icon-192.png
NEXT_PUBLIC_FAVICON_URL=https://globalind.com/favicon.ico
```

### Voorbeeld 3: Healthcare (Calming Green)

```bash
# Bedrijf
NEXT_PUBLIC_COMPANY_NAME=HealthCare Plus HR
NEXT_PUBLIC_COMPANY_SHORT=HC+ HR
NEXT_PUBLIC_TAGLINE=Caring for Our Team
NEXT_PUBLIC_DESCRIPTION=HR support for HealthCare Plus staff

# Kleuren
NEXT_PUBLIC_PRIMARY_COLOR=#059669
NEXT_PUBLIC_PRIMARY_DARK=#047857
NEXT_PUBLIC_PRIMARY_LIGHT=#10B981
NEXT_PUBLIC_SECONDARY_COLOR=#3B82F6
NEXT_PUBLIC_BG_COLOR=#FFFFFF
NEXT_PUBLIC_SURFACE_COLOR=#F0FDF4

# Logo
NEXT_PUBLIC_LOGO_URL=https://hcplus.com/hr-logo.png
NEXT_PUBLIC_BACKGROUND_LOGO_URL=https://hcplus.com/watermark.png
```

---

## 🖼️ Logo Hosting Opties

### Optie 1: Client's Website (Aanbevolen)

**Voor**:
- ✅ Client beheert eigen assets
- ✅ Geen upload naar jouw project
- ✅ Makkelijk bij te werken door client

**Tegen**:
- ⚠️ Afhankelijk van client's server uptime
- ⚠️ CORS issues mogelijk (kan opgelost worden)

**Setup**:
```bash
# Logo URL van client's website
NEXT_PUBLIC_LOGO_URL=https://acme-corp.com/assets/logo-white.png
NEXT_PUBLIC_ICON_URL=https://acme-corp.com/assets/icon-192.png
```

### Optie 2: Vercel Public Folder

**Voor**:
- ✅ Altijd beschikbaar
- ✅ Snelle loading
- ✅ Geen external requests

**Tegen**:
- ⚠️ Re-deploy nodig bij wijziging
- ⚠️ Jij moet logo's uploaden

**Setup**:
1. Upload logo naar `/public/images/clients/acme/`
2. Commit naar git
3. Deploy

```bash
NEXT_PUBLIC_LOGO_URL=/images/clients/acme/logo.png
NEXT_PUBLIC_ICON_URL=/images/clients/acme/icon-192.png
```

### Optie 3: CDN (Cloudinary, Imgur, etc.)

**Voor**:
- ✅ Snelle global loading
- ✅ Automatische optimalisatie
- ✅ Geen re-deploy

**Tegen**:
- ⚠️ Extra kosten (vaak gratis tier beschikbaar)

**Setup**:
```bash
NEXT_PUBLIC_LOGO_URL=https://res.cloudinary.com/acme/image/upload/logo.png
```

---

## 🎯 Branding Checklist voor Nieuwe Klant

### Verzamel van Klant

```
□ Volledige bedrijfsnaam
□ Korte naam (max 15 karakters)
□ Tagline/slogan
□ Primaire merkkleur (hex code)
□ Secundaire kleur (optioneel)
□ Logo bestanden:
  □ Hoofd logo (PNG/SVG, transparant)
  □ Square icon 192×192px (PNG)
  □ Square icon 512×512px (PNG)
  □ Favicon 32×32px (ICO)
  □ Watermark logo (optioneel)
□ Logo afmetingen (breedte × hoogte)
```

### Zet Environment Variables

In Vercel → Project → Settings → Environment Variables:

```
1. Company Info (4 vars)
   □ NEXT_PUBLIC_COMPANY_NAME
   □ NEXT_PUBLIC_COMPANY_SHORT
   □ NEXT_PUBLIC_TAGLINE
   □ NEXT_PUBLIC_DESCRIPTION

2. Colors (3-7 vars)
   □ NEXT_PUBLIC_PRIMARY_COLOR
   □ NEXT_PUBLIC_PRIMARY_DARK
   □ NEXT_PUBLIC_PRIMARY_LIGHT
   □ NEXT_PUBLIC_SECONDARY_COLOR (optioneel)
   □ NEXT_PUBLIC_BG_COLOR (optioneel)
   □ NEXT_PUBLIC_SURFACE_COLOR (optioneel)

3. Logos (2-5 vars)
   □ NEXT_PUBLIC_LOGO_URL
   □ NEXT_PUBLIC_ICON_URL
   □ NEXT_PUBLIC_FAVICON_URL (optioneel)
   □ NEXT_PUBLIC_LOGO_WIDTH (optioneel)
   □ NEXT_PUBLIC_LOGO_HEIGHT (optioneel)
```

### Test & Verify

```
□ Deploy naar Vercel
□ Check logo verschijnt in header
□ Check kleuren op buttons/links
□ Check bedrijfsnaam in browser tab
□ Test PWA installatie (logo's correct?)
□ Check mobiele weergave
□ Test op verschillende browsers
```

---

## 💡 Pro Tips

### Kleur Kiezen

**Tool**: Gebruik [coolors.co](https://coolors.co/) om color palettes te genereren

**Van logo naar kleuren**:
1. Upload klant's logo naar [imagecolorpicker.com](https://imagecolorpicker.com/)
2. Klik op primaire kleur in logo
3. Gebruik hex code als `NEXT_PUBLIC_PRIMARY_COLOR`

**Automatische dark/light variants**:
- **Dark**: Verlaag brightness met 10-15%
- **Light**: Verhoog brightness met 10-15%

### Logo Optimalisatie

**Voor beste performance**:
1. Gebruik **SVG** waar mogelijk (vector, schaalbaar)
2. Als PNG: gebruik **TinyPNG** om te comprimeren
3. Transparante achtergrond voor flexibiliteit
4. WebP format voor modernere browsers

**Logo formaten voor verschillende plekken**:
- Header: 200×60px (landscape)
- PWA icon: 192×192px (square)
- Favicon: 32×32px (tiny)

### Toegankelijkheid

**Kleurcontrast**:
- Gebruik [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Minimum: 4.5:1 ratio voor tekst
- Aanbevolen: 7:1 voor belangrijke elementen

**Kleurenblindheid testen**:
- [Coblis Color Blindness Simulator](https://www.color-blindness.com/coblis-color-blindness-simulator/)

---

## 🔄 Branding Updaten

### Voor 1 Klant

1. Ga naar Vercel → Project → Settings → Environment Variables
2. Update gewenste variabelen
3. Save
4. Vercel redeploys automatisch

**Tijd**: 2 minuten

### Voor Meerdere Klanten Tegelijk

Als je bijv. alle clients nieuwe favicon wilt geven:

**Script maken** (advanced):
```bash
# update-all-favicons.sh
CLIENTS=("acme" "techstart" "healthcare")

for client in "${CLIENTS[@]}"; do
  vercel env add NEXT_PUBLIC_FAVICON_URL \
    "https://cdn.example.com/$client/favicon.ico" \
    --scope=$client-hr-assistant
done
```

---

## 🎨 Inspiratie

### Brand Kleuren van Bekende Bedrijven

| Bedrijf | Primary | Secondary |
|---------|---------|-----------|
| **Google** | `#4285F4` | `#34A853` |
| **Microsoft** | `#0078D4` | `#00A4EF` |
| **Apple** | `#000000` | `#555555` |
| **Netflix** | `#E50914` | `#B20710` |
| **Spotify** | `#1DB954` | `#191414` |
| **Slack** | `#4A154B` | `#E01E5A` |
| **Airbnb** | `#FF5A5F` | `#00A699` |

### UI Trends 2025

1. **Soft gradients**: Combine primary + primaryLight
2. **Glassmorphism**: Transparante backgrounds met blur
3. **Neumorphism**: Subtle shadows voor depth
4. **Dark mode support**: Bied beide aan

---

## 📱 Preview Branding

### Lokaal Testen

1. Kopieer `.env.example` naar `.env.local`
2. Vul branding variabelen in
3. Run `npm run dev`
4. Open `http://localhost:3000`
5. Check alle kleuren/logo's

### Preview in Vercel

1. Maak **Preview deployment**
2. Set environment variables voor Preview environment
3. Deploy branch
4. Deel preview URL met klant voor approval

---

## ❓ FAQ

**Q: Kan ik verschillende logo's per device (desktop/mobiel)?**
A: Gebruik CSS media queries in custom stylesheet (advanced)

**Q: Ondersteunen we dark mode?**
A: Ja, maar moet handmatig geconfigureerd worden per klant

**Q: Kan ik custom fonts gebruiken?**
A: Ja, via Google Fonts URL in `NEXT_PUBLIC_FONT_URL` (nog te implementeren)

**Q: Hoeveel branding opties zijn er totaal?**
A: **17 environment variables** voor complete customization

**Q: Moet ik logo's zelf hosten?**
A: Nee, klant kan logo's op eigen website hosten

---

## ✅ Complete Branding Variabelen Lijst

| Categorie | Variabele | Verplicht? | Default |
|-----------|-----------|------------|---------|
| **Company** | `NEXT_PUBLIC_COMPANY_NAME` | Aanbevolen | Levtor HR Assistant |
| | `NEXT_PUBLIC_COMPANY_SHORT` | Nee | Levtor HR |
| | `NEXT_PUBLIC_TAGLINE` | Nee | Demo: Your Intelligent... |
| | `NEXT_PUBLIC_DESCRIPTION` | Nee | Demo: AI-powered HR... |
| **Colors** | `NEXT_PUBLIC_PRIMARY_COLOR` | Aanbevolen | #8B5CF6 |
| | `NEXT_PUBLIC_PRIMARY_DARK` | Nee | #7C3AED |
| | `NEXT_PUBLIC_PRIMARY_LIGHT` | Nee | #A78BFA |
| | `NEXT_PUBLIC_SECONDARY_COLOR` | Nee | #10B981 |
| | `NEXT_PUBLIC_BG_COLOR` | Nee | #FFFFFF |
| | `NEXT_PUBLIC_SURFACE_COLOR` | Nee | #F9FAFB |
| | `NEXT_PUBLIC_TEXT_PRIMARY` | Nee | #111827 |
| | `NEXT_PUBLIC_TEXT_SECONDARY` | Nee | #6B7280 |
| | `NEXT_PUBLIC_TEXT_TERTIARY` | Nee | #9CA3AF |
| **Logos** | `NEXT_PUBLIC_LOGO_URL` | Aanbevolen | (empty) |
| | `NEXT_PUBLIC_ICON_URL` | Nee | /icons/icon-192x192.png |
| | `NEXT_PUBLIC_ICON_LARGE_URL` | Nee | /icons/icon-512x512.png |
| | `NEXT_PUBLIC_FAVICON_URL` | Nee | /favicon.ico |
| | `NEXT_PUBLIC_BACKGROUND_LOGO_URL` | Nee | (empty) |
| | `NEXT_PUBLIC_LOGO_WIDTH` | Nee | (auto) |
| | `NEXT_PUBLIC_LOGO_HEIGHT` | Nee | (auto) |

**Totaal**: 20 branding variabelen beschikbaar

**Minimum voor branded look**: 3 variabelen
- Company name
- Primary color
- Logo URL

---

## 🚀 Volgende Stap

**Klaar om te customizen?**

1. ✅ Verzamel klant branding assets
2. ✅ Volg de checklist hierboven
3. ✅ Set environment variables in Vercel
4. ✅ Deploy en test
5. ✅ Laat klant goedkeuren

**Succes met je white-label deployments!** 🎨
