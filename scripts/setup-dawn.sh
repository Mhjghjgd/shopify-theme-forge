#!/bin/bash
# Downloads Shopify Dawn base theme into templates/dawn-base/
# Run once: npm run setup:dawn

set -e

DAWN_DIR="templates/dawn-base"
DAWN_REPO="https://github.com/Shopify/dawn.git"
DAWN_TAG="v15.0.0"

echo "🏗️  Setting up Shopify Dawn base theme..."

if [ -d "$DAWN_DIR" ]; then
  echo "✅ Dawn already exists at $DAWN_DIR — skipping."
  exit 0
fi

mkdir -p templates

if command -v git &> /dev/null; then
  echo "📦 Cloning Dawn $DAWN_TAG..."
  git clone --depth 1 --branch "$DAWN_TAG" "$DAWN_REPO" "$DAWN_DIR" 2>/dev/null || \
  git clone --depth 1 "$DAWN_REPO" "$DAWN_DIR"

  # Remove git history to keep it clean
  rm -rf "$DAWN_DIR/.git"

  echo "✅ Dawn cloned successfully into $DAWN_DIR"
else
  echo "❌ git is not installed. Please install git and retry."
  exit 1
fi

echo ""
echo "✅ Setup complete! Dawn base theme is ready."
echo "   You can now run: npm run dev"
