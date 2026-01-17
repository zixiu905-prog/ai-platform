#!/bin/bash
# CDN Setup Script for AI Platform Downloads
# This script sets up CDN configuration for faster downloads

set -e

echo "=========================================="
echo "AI Platform CDN Setup"
echo "=========================================="
echo ""

# Configuration
DOMAIN="www.aidesign.ltd"
CDN_DOMAIN="download.aidesign.ltd"

echo "Step 1: Testing current API endpoints..."
echo "Testing /api/version..."
curl -s -I "https://${DOMAIN}/api/version" -k | head -1
echo ""

echo "Testing /releases/latest.json..."
curl -s -I "https://${DOMAIN}/releases/latest.json" -k | head -1
echo ""

echo "Step 2: Checking download files..."
echo "Full installer:"
curl -s -I "https://${DOMAIN}/releases/v1.0.0/AI-Platform-Setup-1.0.0.exe" -k | head -1
echo ""

echo "Web installer:"
curl -s -I "https://${DOMAIN}/downloads/AI-Platform-Web-Installer-1.0.0.exe" -k | head -1
echo ""

echo "=========================================="
echo "CDN Configuration Required"
echo "=========================================="
echo ""
echo "Please configure your CDN with the following settings:"
echo ""
echo "1. Create CNAME record:"
echo "   Name: download"
echo "   Type: CNAME"
echo "   Value: www.aidesign.ltd"
echo ""
echo "2. CDN Origin Configuration:"
echo "   Origin Domain: www.aidesign.ltd"
echo "   Protocol: HTTPS"
echo "   Port: 443"
echo ""
echo "3. Cache Rules:"
echo "   - .exe files: 365 days"
echo "   - .msi files: 365 days"
echo "   - .7z files: 365 days"
echo "   - .json files: 5 minutes"
echo ""
echo "4. After CDN setup, update your latest.json to use CDN URLs:"
echo "   https://download.aidesign.ltd/downloads/..."
echo "   https://download.aidesign.ltd/releases/..."
echo ""
echo "=========================================="
