#!/bin/bash

# AI Platform Deployment Script
# Uploads release files to server

set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Updated for OpenCloud-HJuc
PROJECT_ROOT="/home/ai design"
DESKTOP_DIR="$PROJECT_ROOT/desk"
DEPLOY_DIR="$PROJECT_ROOT/deploy"
SERVER_USER="root"  # OpenCloud server
SERVER_HOST="81.68.68.146"  # OpenCloud-HJuc IPv4
REMOTE_BASE="/var/www/aidesign.ltd"
VERSION="1.0.0"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AI Platform Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if files exist
echo -e "${YELLOW}[1/6] Checking build files...${NC}"

FULL_INSTALLER="$DESKTOP_DIR/dist/AI智能体平台 Setup $VERSION.exe"
UPDATE_PACKAGE="$DESKTOP_DIR/dist-web/nsis-web/ai-platform-desktop-$VERSION-x64.nsis.7z"

if [ ! -f "$FULL_INSTALLER" ]; then
    echo -e "${RED}✗ Full installer not found: $FULL_INSTALLER${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Full installer found${NC}"

if [ ! -f "$UPDATE_PACKAGE" ]; then
    echo -e "${RED}✗ Update package not found: $UPDATE_PACKAGE${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Update package found${NC}"

# Ask for server information
echo ""
echo -e "${YELLOW}[2/6] Server Configuration${NC}"
echo "Please enter your server details:"
read -p "Server user (default: $SERVER_USER): " input_user
if [ -n "$input_user" ]; then
    SERVER_USER="$input_user"
fi

read -p "Server host (default: $SERVER_HOST): " input_host
if [ -n "$input_host" ]; then
    SERVER_HOST="$input_host"
fi

# Test SSH connection
echo ""
echo -e "${YELLOW}[3/6] Testing SSH connection...${NC}"
if ssh -o ConnectTimeout=5 "$SERVER_USER@$SERVER_HOST" "echo 'Connection successful'"; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
else
    echo -e "${RED}✗ SSH connection failed${NC}"
    echo -e "${YELLOW}Please check your server details and try again.${NC}"
    exit 1
fi

# Create remote directories
echo ""
echo -e "${YELLOW}[4/6] Creating remote directories...${NC}"
ssh "$SERVER_USER@$SERVER_HOST" "mkdir -p $REMOTE_BASE/downloads $REMOTE_BASE/releases/v$VERSION"
echo -e "${GREEN}✓ Remote directories created${NC}"

# Upload files
echo ""
echo -e "${YELLOW}[5/6] Uploading files...${NC}"

# Upload full installer
echo "Uploading full installer..."
scp "$FULL_INSTALLER" "$SERVER_USER@$SERVER_HOST:$REMOTE_BASE/releases/v$VERSION/"
echo -e "${GREEN}✓ Full installer uploaded${NC}"

# Copy to downloads folder
echo "Copying to downloads folder..."
ssh "$SERVER_USER@$SERVER_HOST" "cp '$REMOTE_BASE/releases/v$VERSION/AI智能体平台 Setup $VERSION.exe' '$REMOTE_BASE/downloads/'"
echo -e "${GREEN}✓ Full installer copied to downloads${NC}"

# Upload update package
echo "Uploading update package..."
scp "$UPDATE_PACKAGE" "$SERVER_USER@$SERVER_HOST:$REMOTE_BASE/releases/v$VERSION/"
echo -e "${GREEN}✓ Update package uploaded${NC}"

# Upload version info
echo "Uploading version info..."
scp "$DEPLOY_DIR/latest.json" "$SERVER_USER@$SERVER_HOST:$REMOTE_BASE/releases/"
scp "$DEPLOY_DIR/release-info.json" "$SERVER_USER@$SERVER_HOST:$REMOTE_BASE/releases/"
echo -e "${GREEN}✓ Version info uploaded${NC}"

# Set permissions
echo ""
echo -e "${YELLOW}[6/6] Setting permissions...${NC}"
ssh "$SERVER_USER@$SERVER_HOST" "chown -R www-data:www-data $REMOTE_BASE && chmod -R 755 $REMOTE_BASE"
echo -e "${GREEN}✓ Permissions set${NC}"

# Display download URLs
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deployment Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Download URLs:${NC}"
echo ""
echo "Full Installer:"
echo "  https://$SERVER_HOST/downloads/AI智能体平台 Setup $VERSION.exe"
echo ""
echo "Version API:"
echo "  https://$SERVER_HOST/api/version"
echo "  https://$SERVER_HOST/releases/latest.json"
echo ""
echo "Direct Release:"
echo "  https://$SERVER_HOST/releases/v$VERSION/AI智能体平台 Setup $VERSION.exe"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Test the download URLs"
echo "  2. Verify file integrity"
echo "  3. Update your download page"
echo "  4. Monitor download logs"
echo ""
