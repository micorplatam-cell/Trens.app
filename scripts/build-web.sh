#!/bin/bash

# ============================================================================
# BUILD WEB - TRENS PWA
# Builds the web version and copies public assets
# ============================================================================

set -e

echo "🚀 Building TRENS Web..."
echo ""

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Run Expo export
echo "📦 Running Expo export..."
npx expo export --platform web

# Copy public assets
echo "📁 Copying public assets..."
cp -r public/* dist/

# Create OG image placeholder if not exists
if [ ! -f "dist/og-image.png" ]; then
    echo "⚠️  Creating OG image placeholder..."
    cp assets/icon.png dist/og-image.png 2>/dev/null || echo "   (no source icon found)"
fi

# Show build info
echo ""
echo "✅ Build complete!"
echo ""
echo "📊 Build stats:"
du -sh dist
echo ""
echo "📁 Files created:"
ls dist | head -20
echo ""
echo "🌐 To preview locally:"
echo "   npx serve dist"
echo ""
echo "🚀 To deploy to Vercel:"
echo "   npx vercel --prod"
echo ""
