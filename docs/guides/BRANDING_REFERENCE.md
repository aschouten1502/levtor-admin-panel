# Branding Quick Reference Card

**Copy-paste templates voor snelle setup** 🎨

---

## ⚡ Quick Templates

### Template 1: Minimaal (3 variabelen)

```bash
NEXT_PUBLIC_COMPANY_NAME=Acme Corporation
NEXT_PUBLIC_PRIMARY_COLOR=#FF5733
NEXT_PUBLIC_LOGO_URL=https://acme.com/logo.png
```

### Template 2: Standaard (7 variabelen)

```bash
NEXT_PUBLIC_COMPANY_NAME=Acme Corporation
NEXT_PUBLIC_COMPANY_SHORT=Acme HR
NEXT_PUBLIC_TAGLINE=Your AI HR Assistant
NEXT_PUBLIC_PRIMARY_COLOR=#FF5733
NEXT_PUBLIC_PRIMARY_DARK=#D64525
NEXT_PUBLIC_LOGO_URL=https://acme.com/logo.png
NEXT_PUBLIC_ICON_URL=https://acme.com/icon-192.png
```

### Template 3: Volledig (15 variabelen)

```bash
# Company
NEXT_PUBLIC_COMPANY_NAME=Acme Corporation
NEXT_PUBLIC_COMPANY_SHORT=Acme HR
NEXT_PUBLIC_TAGLINE=Your Intelligent HR Partner
NEXT_PUBLIC_DESCRIPTION=AI-powered HR support for Acme employees

# Colors
NEXT_PUBLIC_PRIMARY_COLOR=#FF5733
NEXT_PUBLIC_PRIMARY_DARK=#D64525
NEXT_PUBLIC_PRIMARY_LIGHT=#FF8A65
NEXT_PUBLIC_SECONDARY_COLOR=#10B981
NEXT_PUBLIC_BG_COLOR=#FFFFFF
NEXT_PUBLIC_SURFACE_COLOR=#F9FAFB

# Logos
NEXT_PUBLIC_LOGO_URL=https://acme.com/logo.png
NEXT_PUBLIC_LOGO_WIDTH=200
NEXT_PUBLIC_LOGO_HEIGHT=60
NEXT_PUBLIC_ICON_URL=https://acme.com/icon-192.png
NEXT_PUBLIC_FAVICON_URL=https://acme.com/favicon.ico
```

---

## 🎨 Populaire Kleurenschema's

### Tech/Modern (Blauw)
```bash
NEXT_PUBLIC_PRIMARY_COLOR=#3B82F6
NEXT_PUBLIC_PRIMARY_DARK=#2563EB
NEXT_PUBLIC_PRIMARY_LIGHT=#60A5FA
```

### Corporate (Rood)
```bash
NEXT_PUBLIC_PRIMARY_COLOR=#EF4444
NEXT_PUBLIC_PRIMARY_DARK=#DC2626
NEXT_PUBLIC_PRIMARY_LIGHT=#F87171
```

### Healthcare (Groen)
```bash
NEXT_PUBLIC_PRIMARY_COLOR=#10B981
NEXT_PUBLIC_PRIMARY_DARK=#059669
NEXT_PUBLIC_PRIMARY_LIGHT=#34D399
```

### Financial (Paars)
```bash
NEXT_PUBLIC_PRIMARY_COLOR=#8B5CF6
NEXT_PUBLIC_PRIMARY_DARK=#7C3AED
NEXT_PUBLIC_PRIMARY_LIGHT=#A78BFA
```

### Creative (Oranje)
```bash
NEXT_PUBLIC_PRIMARY_COLOR=#F59E0B
NEXT_PUBLIC_PRIMARY_DARK=#D97706
NEXT_PUBLIC_PRIMARY_LIGHT=#FBBF24
```

### Professional (Donkerblauw)
```bash
NEXT_PUBLIC_PRIMARY_COLOR=#1E40AF
NEXT_PUBLIC_PRIMARY_DARK=#1E3A8A
NEXT_PUBLIC_PRIMARY_LIGHT=#3B82F6
```

---

## 📋 Vercel Setup Cheatsheet

### 1. Ga naar Environment Variables
```
Vercel Dashboard → Project → Settings → Environment Variables
```

### 2. Add Required Variables
```
Click "Add" → Enter key → Enter value → Select "All" → Save
```

### 3. Minimale Setup (3 vars)
```
1. NEXT_PUBLIC_COMPANY_NAME = Acme Corporation
2. NEXT_PUBLIC_PRIMARY_COLOR = #FF5733
3. NEXT_PUBLIC_LOGO_URL = https://acme.com/logo.png
```

### 4. Redeploy
```
Deployments → Latest → Redeploy (of automatisch bij save)
```

---

## 🖼️ Logo URL Formats

### Absolute URL (Recommended)
```bash
NEXT_PUBLIC_LOGO_URL=https://acme-corp.com/assets/logo.png
```

### Relative Path
```bash
NEXT_PUBLIC_LOGO_URL=/images/acme-logo.png
```

### Data URL (Small SVGs)
```bash
NEXT_PUBLIC_LOGO_URL=data:image/svg+xml;base64,PHN2Zy...
```

### CDN
```bash
NEXT_PUBLIC_LOGO_URL=https://res.cloudinary.com/demo/image/upload/logo.png
```

---

## ✅ Pre-Deployment Checklist

```
□ Company name set
□ Primary color set
□ Logo URL accessible
□ Icon 192×192 ready
□ Favicon 32×32 ready
□ Test logo URL in browser (should load)
□ All environment vars saved
□ Deployment triggered
□ Preview deployment checked
□ Client approval received
```

---

## 🔗 Handige Links

- **Color Picker**: https://coolors.co/
- **Logo from colors**: https://imagecolorpicker.com/
- **Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Image Optimizer**: https://tinypng.com/
- **Favicon Generator**: https://favicon.io/

---

## 📞 Quick Support

**Probleem**: Logo laadt niet
**Fix**: Check CORS headers, probeer Data URL

**Probleem**: Kleuren niet zichtbaar
**Fix**: Vercel redeploy, check variabele namen

**Probleem**: Logo te groot/klein
**Fix**: Set `NEXT_PUBLIC_LOGO_WIDTH` en `NEXT_PUBLIC_LOGO_HEIGHT`

---

## 💾 Save This!

**Bookmark deze pagina** voor snelle branding setups! 🚀
