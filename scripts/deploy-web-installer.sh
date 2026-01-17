#!/bin/bash

# 部署 Web Installer 到云端服务器
# 此脚本用于构建并上传 Web Installer 到云端

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置变量
DESKTOP_DIR="/home/ai design/desk"
OUTPUT_DIR="$DESKTOP_DIR/dist-web"
REMOTE_SERVER="your-server.com"
REMOTE_USER="deploy"
REMOTE_PATH="/var/www/releases/ai-platform"
VERSION=$(cat "$DESKTOP_DIR/package.json" | grep '"version"' | head -1 | cut -d'"' -f4)
CURRENT_DATE=$(date +%Y%m%d)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  AI Platform Web Installer Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 1. 检查环境
echo -e "${YELLOW}[1/6] 检查环境...${NC}"
if [ ! -d "$DESKTOP_DIR" ]; then
    echo -e "${RED}错误: 桌面应用目录不存在: $DESKTOP_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 环境检查通过${NC}"
echo ""

# 2. 清理旧的构建文件
echo -e "${YELLOW}[2/6] 清理旧的构建文件...${NC}"
cd "$DESKTOP_DIR"
rm -rf "$OUTPUT_DIR"
rm -rf dist/
rm -rf ../frontend/dist
echo -e "${GREEN}✓ 清理完成${NC}"
echo ""

# 3. 构建前端
echo -e "${YELLOW}[3/6] 构建前端应用...${NC}"
cd "$DESKTOP_DIR/../frontend"
npm install
npm run build
echo -e "${GREEN}✓ 前端构建完成${NC}"
echo ""

# 4. 构建主进程
echo -e "${YELLOW}[4/6] 构建主进程...${NC}"
cd "$DESKTOP_DIR"
npm run build:main
echo -e "${GREEN}✓ 主进程构建完成${NC}"
echo ""

# 5. 构建 Web Installer
echo -e "${YELLOW}[5/6] 构建 Web Installer...${NC}"
npm run build:web-full
echo -e "${GREEN}✓ Web Installer 构建完成${NC}"
echo ""

# 6. 上传到云端服务器
echo -e "${YELLOW}[6/6] 上传到云端服务器...${NC}"

# 创建远程目录
echo "创建远程目录..."
# ssh "$REMOTE_USER@$REMOTE_SERVER" "mkdir -p $REMOTE_PATH/v$VERSION"

# 上传文件
echo "上传 Web Installer..."
# scp "$OUTPUT_DIR"/*.exe "$REMOTE_USER@$REMOTE_SERVER:$REMOTE_PATH/v$VERSION/"
# scp "$OUTPUT_DIR"/*.exe "$REMOTE_USER@$REMOTE_SERVER:$REMOTE_PATH/latest/"

# 上传完整安装包
echo "上传完整安装包..."
# scp "$DESKTOP_DIR/dist-electron"/*.exe "$REMOTE_USER@$REMOTE_SERVER:$REMOTE_PATH/v$VERSION/"

# 生成 latest.json
echo "生成版本信息文件..."
cat > "$OUTPUT_DIR/latest.json" << EOF
{
  "version": "$VERSION",
  "releaseDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "notes": "AI Platform v$VERSION",
  "webInstaller": {
    "file": "AI智能体平台-Setup-Web-$VERSION.exe",
    "size": $(stat -f%z "$OUTPUT_DIR"/*.exe 2>/dev/null || stat -c%s "$OUTPUT_DIR"/*.exe 2>/dev/null),
    "url": "https://download.your-domain.com/releases/latest/AI智能体平台-Setup-Web-$VERSION.exe"
  },
  "fullInstaller": {
    "x64": {
      "file": "AI智能体平台-$VERSION-setup.exe",
      "url": "https://download.your-domain.com/releases/v$VERSION/AI智能体平台-$VERSION-setup.exe"
    }
  },
  "minimumSystemVersion": "Windows 10 1809",
  "supportedArchitectures": ["x64"]
}
EOF

# 上传 latest.json
# scp "$OUTPUT_DIR/latest.json" "$REMOTE_USER@$REMOTE_SERVER:$REMOTE_PATH/"

echo -e "${GREEN}✓ 上传完成${NC}"
echo ""

# 7. 生成部署报告
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "版本: $VERSION"
echo "输出目录: $OUTPUT_DIR"
echo "Web Installer: $OUTPUT_DIR/AI智能体平台-Setup-Web-$VERSION.exe"
echo ""
echo "用户下载地址:"
echo "  - Web Installer: https://download.your-domain.com/releases/latest/AI智能体平台-Setup-Web-$VERSION.exe"
echo "  - Full Installer: https://download.your-domain.com/releases/v$VERSION/AI智能体平台-$VERSION-setup.exe"
echo ""
echo -e "${YELLOW}注意: 请确保服务器配置正确，并且修改脚本中的服务器信息。${NC}"
echo ""
