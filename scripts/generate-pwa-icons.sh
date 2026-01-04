#!/bin/bash

# ============================================================================
# GENERATE PWA ICONS - TRENS
# Generates all required icon sizes for PWA from the source icon
# Requires: ImageMagick (convert command)
# ============================================================================

set -e

SOURCE_ICON="assets/icon.png"
OUTPUT_DIR="public/icons"
SPLASH_DIR="public/splash"

# Create directories
mkdir -p "$OUTPUT_DIR"
mkdir -p "$SPLASH_DIR"

echo "🎨 Generating PWA icons from $SOURCE_ICON..."

# Check if source exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo "❌ Source icon not found: $SOURCE_ICON"
    exit 1
fi

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick not installed. Creating placeholder icons..."
    
    # Copy source as fallback for main sizes
    cp "$SOURCE_ICON" "$OUTPUT_DIR/icon-512x512.png"
    cp "$SOURCE_ICON" "$OUTPUT_DIR/icon-192x192.png"
    cp "assets/favicon.png" "$OUTPUT_DIR/favicon-32x32.png" 2>/dev/null || cp "$SOURCE_ICON" "$OUTPUT_DIR/favicon-32x32.png"
    cp "assets/favicon.png" "$OUTPUT_DIR/favicon-16x16.png" 2>/dev/null || cp "$SOURCE_ICON" "$OUTPUT_DIR/favicon-16x16.png"
    cp "$SOURCE_ICON" "$OUTPUT_DIR/apple-touch-icon.png"
    
    echo "✅ Placeholder icons created. Install ImageMagick for proper resizing."
    exit 0
fi

# Icon sizes for PWA manifest
SIZES=(72 96 128 144 152 192 384 512)

for size in "${SIZES[@]}"; do
    echo "  → Generating ${size}x${size}..."
    convert "$SOURCE_ICON" -resize "${size}x${size}" "$OUTPUT_DIR/icon-${size}x${size}.png"
done

# Favicon sizes
echo "  → Generating favicons..."
convert "$SOURCE_ICON" -resize "32x32" "$OUTPUT_DIR/favicon-32x32.png"
convert "$SOURCE_ICON" -resize "16x16" "$OUTPUT_DIR/favicon-16x16.png"

# Apple touch icon (180x180 recommended)
echo "  → Generating Apple touch icon..."
convert "$SOURCE_ICON" -resize "180x180" "$OUTPUT_DIR/apple-touch-icon.png"

# Badge icon for notifications
echo "  → Generating notification badge..."
convert "$SOURCE_ICON" -resize "72x72" "$OUTPUT_DIR/badge-72x72.png"

# Generate iOS splash screens (white/black background with centered logo)
echo "  → Generating iOS splash screens..."

generate_splash() {
    local width=$1
    local height=$2
    local name=$3
    local logo_size=$((width / 4))
    
    # Create black background with centered logo
    convert -size "${width}x${height}" xc:#000000 \
        \( "$SOURCE_ICON" -resize "${logo_size}x${logo_size}" \) \
        -gravity center -composite \
        "$SPLASH_DIR/$name"
}

# iPhone splash screens
generate_splash 1125 2436 "apple-splash-1125-2436.png"
generate_splash 1170 2532 "apple-splash-1170-2532.png"
generate_splash 1242 2688 "apple-splash-1242-2688.png"
generate_splash 1284 2778 "apple-splash-1284-2778.png"
generate_splash 828 1792 "apple-splash-828-1792.png"

# iPad splash screens
generate_splash 1536 2048 "apple-splash-1536-2048.png"
generate_splash 1668 2388 "apple-splash-1668-2388.png"
generate_splash 2048 2732 "apple-splash-2048-2732.png"

echo ""
echo "✅ All PWA icons generated successfully!"
echo "   Output: $OUTPUT_DIR"
echo "   Splash: $SPLASH_DIR"
