#!/bin/bash
echo "======================================"
echo "AI Platform Final Verification"
echo "======================================"
echo ""
echo "Testing API endpoints..."
echo ""
echo "1. /api/version:"
curl -s https://www.aidesign.ltd/api/version -k | python3 -m json.tool 2>&1 | head -20
echo ""
echo "2. /releases/latest.json:"
curl -s https://www.aidesign.ltd/releases/latest.json -k | python3 -m json.tool 2>&1 | head -20
echo ""
echo "3. Download URLs:"
echo "Full installer: https://www.aidesign.ltd/releases/v1.0.0/AI-Platform-Setup-1.0.0.exe"
curl -s -I https://www.aidesign.ltd/releases/v1.0.0/AI-Platform-Setup-1.0.0.exe -k | head -1
echo ""
echo "======================================"
echo "Verification Complete!"
echo "======================================"
