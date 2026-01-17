#!/bin/bash

# Windows桌面应用构建脚本
# 使用Docker在Linux上构建Windows版本的Electron应用

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="/home/ai design"
DESK_DIR="$PROJECT_ROOT/desk"
OUTPUT_DIR="$PROJECT_ROOT/downloads/desktop"
VERSION=$(cat "$DESK_DIR/package.json" | grep '"version"' | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')
APP_NAME="AI智能体平台"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Windows桌面应用构建系统${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "版本: $VERSION"
echo ""

# 检查Docker
echo -e "${YELLOW}[1/5] 检查Docker环境...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker 已安装${NC}"
echo ""

# 检查Docker镜像
echo -e "${YELLOW}[2/5] 检查electron-builder Docker镜像...${NC}"
if ! docker images | grep -q "electronuserland/builder.*wine"; then
    echo "拉取electron-builder Docker镜像..."
    docker pull electronuserland/builder:wine
fi
echo -e "${GREEN}✓ Docker镜像就绪${NC}"
echo ""

# 构建前端
echo -e "${YELLOW}[3/5] 构建前端应用...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run build
echo -e "${GREEN}✓ 前端构建完成${NC}"
echo ""

# 构建Electron主进程
echo -e "${YELLOW}[4/5] 构建Electron主进程...${NC}"
cd "$DESK_DIR"
npm run build:main
echo -e "${GREEN}✓ Electron主进程构建完成${NC}"
echo ""

# 使用Docker构建Windows版本
echo -e "${YELLOW}[5/5] 使用Docker构建Windows安装程序...${NC}"
cd "$DESK_DIR"

# 设置环境变量禁用代码签名（用于测试构建）
export CSC_LINK=""
export CSC_KEY_PASSWORD=""

# 使用Docker运行electron-builder
echo "正在构建Windows版本..."
docker run --rm \
    -v "$PROJECT_ROOT:/project" \
    -w /project/desk \
    electronuserland/builder:wine \
    npx electron-builder --win --x64 --publish never

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Windows构建完成${NC}"
else
    echo -e "${RED}✗ Windows构建失败${NC}"
    exit 1
fi
echo ""

# 复制构建结果到输出目录
echo -e "${YELLOW}部署安装程序...${NC}"
if [ -d "dist-electron" ]; then
    cp -rf dist-electron/*.exe "$OUTPUT_DIR/" 2>/dev/null || true
    cp -rf dist-electron/*.zip "$OUTPUT_DIR/" 2>/dev/null || true
    echo -e "${GREEN}✓ 安装程序已复制${NC}"
fi

# 列出生成的文件
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}构建完成！生成的文件：${NC}"
echo -e "${GREEN}========================================${NC}"
ls -lh "$OUTPUT_DIR"
echo ""

# 更新版本信息
echo -e "${YELLOW}更新版本信息...${NC}"
if [ -f "$OUTPUT_DIR/version.json" ]; then
    # 检查是否有exe文件
    if ls "$OUTPUT_DIR"/*.exe 1> /dev/null 2>&1; then
        echo "Windows版本已生成"
    fi
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Windows构建成功完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "下一步："
echo "1. 在Windows系统测试.exe文件"
echo "2. 更新前端下载页面"
echo "3. 将文件部署到服务器"
echo ""
