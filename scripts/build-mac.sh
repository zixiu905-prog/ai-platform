#!/bin/bash
# macOS Build Script for AI Platform Desktop App

set -e

echo "=========================================="
echo "  AI Platform macOS Build Script"
echo "=========================================="
echo ""

# Configuration
PROJECT_ROOT="/home/ai design"
DESKTOP_DIR="$PROJECT_ROOT/desk"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
OUTPUT_DIR="$DESKTOP_DIR/dist-mac"
VERSION="1.0.0"

echo "Step 1: Building frontend..."
cd "$FRONTEND_DIR"
npm run build

echo ""
echo "Step 2: Building main process..."
cd "$DESKTOP_DIR"
npm run build:main

echo ""
echo "Step 3: Building macOS installers..."
echo "Building for x64 and arm64 architectures..."

# Build DMG installer
npm run build:dmg

# Build ZIP archive
npm run build:zip

echo ""
echo "Step 4: Checking build output..."
if [ -d "$OUTPUT_DIR" ]; then
    echo "✓ Build output directory: $OUTPUT_DIR"
    echo ""
    echo "Generated files:"
    ls -lh "$OUTPUT_DIR"/*.dmg "$OUTPUT_DIR"/*.zip 2>/dev/null || echo "No files found"
else
    echo "✗ Build output directory not found"
    exit 1
fi

echo ""
echo "=========================================="
echo "  macOS Build Complete!"
echo "=========================================="
echo ""
echo "Output location: $OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "1. Upload DMG and ZIP files to server"
echo "2. Update version info API"
echo "3. Test installation on macOS"
echo ""
