# 🌐 TRENS WEB (PWA) - Guía de Deploy

## ✅ Configuración Completada

La versión web de TRENS está lista para deploy con las siguientes características:

### 📱 PWA Features

- **Manifest.json** - Configuración completa para instalación
- **Service Worker** - Cache offline y actualizaciones automáticas
- **Iconos** - Todos los tamaños requeridos (72px - 512px)
- **Splash Screens** - Para iOS y Android
- **SEO** - Meta tags, Open Graph, Twitter Cards
- **robots.txt** - Configuración para buscadores
- **sitemap.xml** - Mapa del sitio

### 🎯 Funcionalidades Web

| Módulo         | Estado      | Notas                      |
| -------------- | ----------- | -------------------------- |
| Login/Auth     | ✅ 100%     | Supabase funciona perfecto |
| ADN (Perfil)   | ✅ 100%     | Ver stats y récords        |
| Plan (Rutinas) | ✅ 100%     | Editar plan semanal        |
| GYM            | ✅ 90%      | Sin cámara nativa          |
| Feed           | ✅ 100%     | Ver videos                 |
| Videos (HLS)   | ✅ 100%     | Cloudflare Stream          |
| Cámara         | ❌          | Solo app nativa            |
| Spotify Remote | ⚠️ Limitado | Solo metadata              |
| Haptics        | ⚠️ Fallback | Usa vibration API          |

---

## 🚀 Deploy a Producción

### Opción 1: Vercel (Recomendado)

```bash
# 1. Instalar Vercel CLI (si no está)
npm i -g vercel

# 2. Login en Vercel
vercel login

# 3. Deploy
npm run web:deploy
```

### Opción 2: Cloudflare Pages

```bash
# 1. Build
npm run web:export

# 2. En Cloudflare Dashboard:
#    - Pages > Create project
#    - Upload `dist/` folder
#    - Configurar dominio: trens.app
```

### Opción 3: Manual

```bash
# 1. Build
npm run web:export

# 2. Subir contenido de `dist/` a tu hosting
```

---

## 🔧 Configuración DNS (trens.app)

### Para Vercel:

```
CNAME  @      cname.vercel-dns.com
CNAME  www    cname.vercel-dns.com
```

### Para Cloudflare Pages:

```
CNAME  @      <tu-proyecto>.pages.dev
CNAME  www    <tu-proyecto>.pages.dev
```

---

## 📦 Scripts Disponibles

```bash
# Desarrollo web local
npm run web

# Build para producción
npm run web:build

# Preview del build local
npm run web:preview

# Deploy directo a Vercel
npm run web:deploy
```

---

## 🔄 Actualizaciones

### Actualizar PWA (Web):

```bash
# 1. Hacer cambios en el código
# 2. Commit y push
git add -A && git commit -m "update" && git push

# 3. Deploy (automático si configuraste CI/CD, o manual):
npm run web:deploy
```

### Actualizar App Nativa (OTA):

```bash
eas update --auto
```

---

## 🛡️ Headers de Seguridad

Configurados en `vercel.json`:

- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

---

## 📊 Archivos Creados

```
public/
├── index.html          # HTML con meta tags SEO/PWA
├── manifest.json       # PWA manifest
├── sw.js              # Service Worker
├── robots.txt         # SEO robots
├── sitemap.xml        # Sitemap
├── browserconfig.xml  # Windows tiles
├── favicon.ico        # Favicon
├── icons/             # PWA icons (todos los tamaños)
│   ├── icon-72x72.png
│   ├── icon-192x192.png
│   ├── icon-512x512.png
│   ├── apple-touch-icon.png
│   └── safari-pinned-tab.svg
└── splash/            # iOS splash screens
    └── apple-splash-*.png
```

---

## ⚡ GitHub Actions (CI/CD Automático)

Para deploy automático en cada push, crea `.github/workflows/deploy-web.yml`:

```yaml
name: Deploy Web

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run web:export

      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./dist
```

---

## 🎉 ¡Listo!

Tu web PWA está lista para ser desplegada en **trens.app**.

Los usuarios podrán:

1. Acceder desde cualquier navegador
2. "Agregar a pantalla de inicio" como app
3. Usar offline (contenido cacheado)
4. Recibir prompt para descargar la app nativa
