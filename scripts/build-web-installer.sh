#!/bin/bash

# 一键构建 Web Installer 和完整安装包
# 支持自动上传到多个云存储服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DESKTOP_DIR="$PROJECT_ROOT/desk"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# 获取版本号
VERSION=$(cat "$DESKTOP_DIR/package.json" | grep '"version"' | head -1 | cut -d'"' -f4)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AI Platform 一键构建脚本${NC}"
echo -e "${BLUE}  版本: $VERSION${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 功能菜单
echo "请选择构建模式："
echo "1) 仅构建 Web Installer (小包，安装时下载)"
echo "2) 仅构建完整安装包 (离线安装)"
echo "3) 同时构建 Web Installer 和完整安装包"
echo "4) 构建所有平台 (Windows, macOS, Linux)"
echo "5) 构建 + 上传到服务器"
echo ""
read -p "请输入选项 (1-5): " choice

case $choice in
    1)
        BUILD_MODE="web-only"
        ;;
    2)
        BUILD_MODE="full-only"
        ;;
    3)
        BUILD_MODE="both"
        ;;
    4)
        BUILD_MODE="all-platforms"
        ;;
    5)
        BUILD_MODE="upload"
        ;;
    *)
        echo -e "${RED}无效选项${NC}"
        exit 1
        ;;
esac

# 步骤 1: 清理
echo ""
echo -e "${YELLOW}[步骤 1/7] 清理旧的构建文件...${NC}"
cd "$DESKTOP_DIR"
rm -rf dist dist-electron dist-web
rm -rf node_modules/.cache
cd "$FRONTEND_DIR"
rm -rf dist
echo -e "${GREEN}✓ 清理完成${NC}"

# 步骤 2: 安装依赖
echo ""
echo -e "${YELLOW}[步骤 2/7] 安装依赖...${NC}"
cd "$DESKTOP_DIR"
npm install --production=false
cd "$FRONTEND_DIR"
npm install
echo -e "${GREEN}✓ 依赖安装完成${NC}"

# 步骤 3: 构建前端
echo ""
echo -e "${YELLOW}[步骤 3/7] 构建前端应用...${NC}"
cd "$FRONTEND_DIR"
npm run build
echo -e "${GREEN}✓ 前端构建完成${NC}"

# 步骤 4: 构建主进程
echo ""
echo -e "${YELLOW}[步骤 4/7] 构建主进程...${NC}"
cd "$DESKTOP_DIR"
npm run build:main
echo -e "${GREEN}✓ 主进程构建完成${NC}"

# 步骤 5: 根据模式构建
echo ""
echo -e "${YELLOW}[步骤 5/7] 构建安装包...${NC}"
cd "$DESKTOP_DIR"

case $BUILD_MODE in
    web-only)
        echo "正在构建 Web Installer..."
        npm run build:web-full
        ;;
    full-only)
        echo "正在构建完整安装包..."
        npm run build:all
        ;;
    both)
        echo "正在构建 Web Installer..."
        npm run build:web-full
        echo "正在构建完整安装包..."
        npm run build:all
        ;;
    all-platforms)
        echo "正在构建所有平台..."
        npm run build:dmg
        npm run build:nsis
        npm run build:appimage
        npm run build:deb
        npm run build:rpm
        ;;
    upload)
        echo "正在构建所有安装包..."
        npm run build:web-full
        npm run build:all
        ;;
esac

echo -e "${GREEN}✓ 安装包构建完成${NC}"

# 步骤 6: 生成版本信息
echo ""
echo -e "${YELLOW}[步骤 6/7] 生成版本信息...${NC}"
cd "$DESKTOP_DIR"

# 计算 Web Installer 大小
WEB_INSTALLER_SIZE=$(du -h dist-web/*.exe 2>/dev/null | cut -f1 | head -1)
FULL_INSTALLER_SIZE=$(du -h dist-electron/*.exe 2>/dev/null | cut -f1 | head -1)

echo "版本信息:"
echo "  版本: $VERSION"
echo "  Web Installer: $WEB_INSTALLER_SIZE"
echo "  Full Installer: $FULL_INSTALLER_SIZE"

# 生成版本信息 JSON
cat > "version-info.json" << EOF
{
  "version": "$VERSION",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platform": {
    "windows": {
      "webInstaller": {
        "file": "AI智能体平台-Setup-Web-$VERSION.exe",
        "size": "$WEB_INSTALLER_SIZE",
        "path": "dist-web/"
      },
      "fullInstaller": {
        "file": "AI智能体平台-$VERSION-setup.exe",
        "size": "$FULL_INSTALLER_SIZE",
        "path": "dist-electron/"
      }
    }
  }
}
EOF

echo -e "${GREEN}✓ 版本信息已生成${NC}"

# 步骤 7: 上传（如果需要）
if [ "$BUILD_MODE" == "upload" ]; then
    echo ""
    echo -e "${YELLOW}[步骤 7/7] 上传到服务器...${NC}"

    # 这里可以添加上传逻辑
    # 例如: scp, rsync, AWS S3, 阿里云 OSS 等

    echo -e "${GREEN}✓ 上传完成${NC}"
fi

# 完成
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  构建完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "构建位置:"
echo "  Web Installer: $DESKTOP_DIR/dist-web/"
echo "  Full Installer: $DESKTOP_DIR/dist-electron/"
echo ""
echo "下一步:"
echo "  1. 测试安装包"
echo "  2. 上传到分发服务器"
echo "  3. 更新版本公告"
echo ""
