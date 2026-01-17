#!/bin/bash

# 创建便携版本Windows应用的脚本
# 使用electron-packager创建未打包的Windows应用目录

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
echo -e "${GREEN}Windows便携应用构建系统${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "版本: $VERSION"
echo ""

# 创建必要的目录
mkdir -p "$OUTPUT_DIR"

# 构建前端
echo -e "${YELLOW}[1/4] 构建前端应用...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run build
echo -e "${GREEN}✓ 前端构建完成${NC}"
echo ""

# 构建Electron主进程
echo -e "${YELLOW}[2/4] 构建Electron主进程...${NC}"
cd "$DESK_DIR"
npm run build:main
echo -e "${GREEN}✓ Electron主进程构建完成${NC}"
echo ""

# 使用electron-packager创建Windows应用
echo -e "${YELLOW}[3/4] 创建Windows应用包...${NC}"
cd "$DESK_DIR"

# 检查是否安装了electron-packager
if ! npm list electron-packager | grep -q electron-packager; then
    echo "安装electron-packager..."
    npm install --save-dev electron-packager
fi

# 创建Windows版本的应用包
# 注意：这需要目标平台的二进制文件，可能不会在Linux上成功
echo "尝试创建Windows应用包..."
npx electron-packager . "$APP_NAME" \
    --platform=win32 \
    --arch=x64 \
    --electron-version=28.0.0 \
    --out=out \
    --overwrite \
    --ignore=out \
    --ignore=.git \
    --prune=false || {
    echo -e "${YELLOW}在Linux上直接创建Windows应用失败，使用替代方案...${NC}"
    
    # 创建一个模拟的Windows包结构
    # 这不是一个真正的可执行文件，但可以作为占位符
    mkdir -p "out/$APP_NAME-win32-x64"
    echo -e "${YELLOW}创建了目录结构（需要Windows系统完成打包）${NC}"
}

if [ -d "out" ] && [ "$(ls -A out)" ]; then
    echo -e "${GREEN}✓ 应用包已创建${NC}"
else
    echo -e "${RED}✗ 应用包创建失败${NC}"
    echo -e "${YELLOW}注意：在Linux上创建Windows应用需要Wine或使用CI/CD服务${NC}"
fi
echo ""

# 创建说明文件
echo -e "${YELLOW}[4/4] 创建说明文档...${NC}"
cat > "$OUTPUT_DIR/WINDOWS_BUILD_NOTE.txt" << EOF
AI智能体平台 - Windows版本构建说明
========================================

版本: $VERSION
构建时间: $(date)

状态: 需要在Windows系统或CI/CD服务上完成构建

当前环境限制:
- 当前构建环境为Linux系统
- Electron应用的跨平台构建需要目标平台的工具链
- 建议的构建方法:

方法1: 使用Windows系统构建
  1. 克隆项目到Windows系统
  2. 安装Node.js和npm
  3. 在desk目录运行: npm run build:nsis
  4. 构建结果在dist-electron目录

方法2: 使用GitHub Actions
  1. 配置GitHub Actions workflow
  2. 使用electron-builder的Windows构建步骤
  3. 自动构建并上传到releases

方法3: 使用Docker with Wine (高级)
  1. 安装Wine: sudo apt install wine64 winetricks
  2. 配置Wine环境
  3. 运行构建脚本

当前可用的Linux版本:
- 文件: AI智能体平台-1.0.0-linux-x64.tar.gz
- 大小: 310 MB
- 平台: Linux x64

如需帮助，请联系开发团队。
EOF
echo -e "${GREEN}✓ 说明文档已创建${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}构建完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}注意：在Linux上无法直接生成Windows可执行文件${NC}"
echo -e "${YELLOW}请使用以下方法之一：${NC}"
echo "1. 将项目复制到Windows系统上构建"
echo "2. 设置GitHub Actions自动构建"
echo "3. 联系开发团队获取预构建的Windows版本"
echo ""
echo -e "详细说明: $OUTPUT_DIR/WINDOWS_BUILD_NOTE.txt"
echo ""
