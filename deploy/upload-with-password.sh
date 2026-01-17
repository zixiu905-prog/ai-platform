#!/bin/bash

# AI Platform Deployment Script with Password Authentication
# For OpenCloud-HJuc (81.68.68.146)

set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="/home/ai design"
DESKTOP_DIR="$PROJECT_ROOT/desk"
DEPLOY_DIR="$PROJECT_ROOT/deploy"
SERVER_USER="root"
SERVER_HOST="81.68.68.146"  # Server IP
DOMAIN="www.aidesign.ltd"    # Domain name
SERVER_PASS="Tyjgsz905!@!@"
REMOTE_BASE="/var/www/aidesign.ltd"
VERSION="1.0.0"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AI Platform Deployment Script${NC}"
echo -e "${BLUE}  Server: OpenCloud-HJuc (${SERVER_HOST})${NC}"
echo -e "${BLUE}  Domain: ${DOMAIN}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Install sshpass if not available
if ! command -v sshpass &> /dev/null; then
    echo -e "${YELLOW}Installing sshpass...${NC}"
    apt-get update && apt-get install -y sshpass
fi

# Check if files exist
echo -e "${YELLOW}[1/6] Checking build files...${NC}"

FULL_INSTALLER="$DESKTOP_DIR/dist/AI智能体平台 Setup $VERSION.exe"
UPDATE_PACKAGE="$DESKTOP_DIR/dist-web/nsis-web/ai-platform-desktop-$VERSION-x64.nsis.7z"

if [ ! -f "$FULL_INSTALLER" ]; then
    echo -e "${RED}✗ Full installer not found: $FULL_INSTALLER${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Full installer found (164MB)${NC}"

if [ ! -f "$UPDATE_PACKAGE" ]; then
    echo -e "${RED}✗ Update package not found: $UPDATE_PACKAGE${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Update package found (382MB)${NC}"

# Test SSH connection
echo ""
echo -e "${YELLOW}[2/6] Testing SSH connection...${NC}"
echo "Connecting to $SERVER_HOST..."

if sshpass -p "$SERVER_PASS" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "echo 'Connection successful'" 2>/dev/null; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
else
    echo -e "${RED}✗ SSH connection failed${NC}"
    exit 1
fi

# Create remote directories
echo ""
echo -e "${YELLOW}[3/6] Creating remote directories...${NC}"
sshpass -p "$SERVER_PASS" ssh "$SERVER_USER@$SERVER_HOST" "mkdir -p $REMOTE_BASE/downloads $REMOTE_BASE/releases/v$VERSION"
echo -e "${GREEN}✓ Remote directories created${NC}"

# Upload files
echo ""
echo -e "${YELLOW}[4/6] Uploading files...${NC}"

# Upload full installer
echo "Uploading full installer (164MB)..."
sshpass -p "$SERVER_PASS" scp "$FULL_INSTALLER" "$SERVER_USER@$SERVER_HOST:$REMOTE_BASE/releases/v$VERSION/"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Full installer uploaded${NC}"
else
    echo -e "${RED}✗ Failed to upload full installer${NC}"
    exit 1
fi

# Upload update package
echo "Uploading update package (382MB)..."
sshpass -p "$SERVER_PASS" scp "$UPDATE_PACKAGE" "$SERVER_USER@$SERVER_HOST:$REMOTE_BASE/releases/v$VERSION/"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Update package uploaded${NC}"
else
    echo -e "${RED}✗ Failed to upload update package${NC}"
    exit 1
fi

# Copy to downloads directory
echo "Copying to downloads directory..."
sshpass -p "$SERVER_PASS" ssh "$SERVER_USER@$SERVER_HOST" "cp '$REMOTE_BASE/releases/v$VERSION/AI智能体平台 Setup $VERSION.exe' '$REMOTE_BASE/downloads/'"
echo -e "${GREEN}✓ Copied to downloads${NC}"

# Upload version info
echo "Uploading version info..."
sshpass -p "$SERVER_PASS" scp "$DEPLOY_DIR/latest.json" "$SERVER_USER@$SERVER_HOST:$REMOTE_BASE/releases/"
sshpass -p "$SERVER_PASS" scp "$DEPLOY_DIR/release-info.json" "$SERVER_USER@$SERVER_HOST:$REMOTE_BASE/releases/"
echo -e "${GREEN}✓ Version info uploaded${NC}"

# Upload nginx config
echo "Uploading nginx configuration..."
sshpass -p "$SERVER_PASS" scp "$DEPLOY_DIR/nginx.conf" "$SERVER_USER@$SERVER_HOST:$REMOTE_BASE/"
echo -e "${GREEN}✓ Nginx config uploaded${NC}"

# Set permissions
echo ""
echo -e "${YELLOW}[5/6] Setting permissions...${NC}"
sshpass -p "$SERVER_PASS" ssh "$SERVER_USER@$SERVER_HOST" "chown -R www-data:www-data $REMOTE_BASE && chmod -R 755 $REMOTE_BASE"
echo -e "${GREEN}✓ Permissions set${NC}"

# Configure domain in Nginx
echo ""
echo -e "${YELLOW}[6/7] Configuring domain...${NC}"
sshpass -p "$SERVER_PASS" ssh "$SERVER_USER@$SERVER_HOST" "sed -i 's/www\.aidesign\.ltd/$DOMAIN/g' $REMOTE_BASE/nginx.conf"
sshpass -p "$SERVER_PASS" ssh "$SERVER_USER@$SERVER_HOST" "sed -i 's/server_name .*;/server_name $DOMAIN;/g' $REMOTE_BASE/nginx.conf"
echo -e "${GREEN}✓ Domain configured${NC}"

# Verify uploads
echo ""
echo -e "${YELLOW}[7/7] Verifying uploads...${NC}"
echo "Files on server:"
sshpass -p "$SERVER_PASS" ssh "$SERVER_USER@$SERVER_HOST" "ls -lh $REMOTE_BASE/releases/v$VERSION/"
echo ""
echo -e "${GREEN}✓ Upload verification complete${NC}"

# Display next steps
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  File Upload Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Next steps on the server:${NC}"
echo ""
echo "1. Install and configure Nginx:"
echo "   sudo apt update && sudo apt install nginx"
echo ""
echo "2. Copy Nginx configuration:"
echo "   sudo cp $REMOTE_BASE/nginx.conf /etc/nginx/sites-available/aidesign"
echo "   sudo ln -s /etc/nginx/sites-available/aidesign /etc/nginx/sites-enabled/"
echo ""
echo "3. Test and restart Nginx:"
echo "   sudo nginx -t && sudo systemctl restart nginx"
echo ""
echo "4. Install SSL certificate:"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d 81.68.68.146"
echo ""
echo -e "${GREEN}Files uploaded to:${NC}"
echo "  $REMOTE_BASE/"
echo ""
echo -e "${GREEN}After Nginx and SSL setup, your download URL will be:${NC}"
echo "  http://$DOMAIN/downloads/AI智能体平台 Setup 1.0.0.exe"
echo "  https://$DOMAIN/downloads/AI智能体平台 Setup 1.0.0.exe (with SSL)"
echo ""
echo -e "${GREEN}Configuration files location:${NC}"
echo "  Nginx config: $REMOTE_BASE/nginx.conf"
echo "  Version API: $REMOTE_BASE/releases/latest.json"
echo ""
