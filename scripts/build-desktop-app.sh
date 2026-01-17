#!/bin/bash

# AI智能体平台桌面应用构建脚本
# 支持生成Windows和Mac安装程序

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

# 版本信息
VERSION=$(cat "$DESK_DIR/package.json" | grep '"version"' | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')
APP_NAME="AI智能体平台"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}AI智能体平台桌面应用构建系统${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "版本: $VERSION"
echo -e ""

# 创建必要的目录
mkdir -p "$OUTPUT_DIR"
mkdir -p "$DESK_DIR/build-resources"

# 检查依赖
echo -e "${YELLOW}[1/6] 检查构建依赖...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: Node.js 未安装${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}错误: npm 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"
echo -e "${GREEN}✓ npm 版本: $(npm -v)${NC}"
echo ""

# 安装依赖
echo -e "${YELLOW}[2/6] 安装Electron依赖...${NC}"
cd "$DESK_DIR"
if [ ! -d "node_modules" ]; then
    echo "安装node_modules..."
    npm install --silent
else
    echo -e "${GREEN}✓ 依赖已安装${NC}"
fi
echo ""

# 创建图标文件（如果不存在）
echo -e "${YELLOW}[3/6] 检查图标资源...${NC}"
if [ ! -f "$DESK_DIR/build-resources/icon.png" ]; then
    echo "创建默认图标..."
    # 使用ImageMagick或其他工具创建简单图标
    # 如果没有ImageMagick，使用其他方式
    if command -v convert &> /dev/null; then
        convert -size 512x512 xc:#1890ff -gravity center -pointsize 200 -fill white -annotate +0+0 "AI" "$DESK_DIR/build-resources/icon.png"
    else
        # 创建一个简单的PNG文件
        echo -e "${YELLOW}警告: 未找到ImageMagick，将使用占位符图标${NC}"
        # 复制一个存在的图标或创建占位符
        echo "AI" > "$DESK_DIR/build-resources/icon.png"
    fi
    echo -e "${GREEN}✓ 图标已创建${NC}"
else
    echo -e "${GREEN}✓ 图标已存在${NC}"
fi

# 创建Windows图标
if [ ! -f "$DESK_DIR/build-resources/icon.ico" ]; then
    if command -v convert &> /dev/null; then
        convert "$DESK_DIR/build-resources/icon.png" -define icon:auto-resize=256,128,96,64,48,32,16 "$DESK_DIR/build-resources/icon.ico"
        echo -e "${GREEN}✓ Windows图标已创建${NC}"
    else
        echo -e "${YELLOW}警告: 无法创建.ico文件，请手动提供${NC}"
    fi
fi

# 创建Mac图标
if [ ! -f "$DESK_DIR/build-resources/icon.icns" ]; then
    if command -v iconutil &> /dev/null; then
        mkdir -p "$DESK_DIR/build-resources/icon.iconset"
        sips -z 16 16     "$DESK_DIR/build-resources/icon.png" --out "$DESK_DIR/build-resources/icon.iconset/icon_16x16.png"
        sips -z 32 32     "$DESK_DIR/build-resources/icon.png" --out "$DESK_DIR/build-resources/icon.iconset/icon_16x16@2x.png"
        sips -z 32 32     "$DESK_DIR/build-resources/icon.png" --out "$DESK_DIR/build-resources/icon.iconset/icon_32x32.png"
        sips -z 64 64     "$DESK_DIR/build-resources/icon.png" --out "$DESK_DIR/build-resources/icon.iconset/icon_32x32@2x.png"
        sips -z 128 128   "$DESK_DIR/build-resources/icon.png" --out "$DESK_DIR/build-resources/icon.iconset/icon_128x128.png"
        sips -z 256 256   "$DESK_DIR/build-resources/icon.png" --out "$DESK_DIR/build-resources/icon.iconset/icon_128x128@2x.png"
        sips -z 256 256   "$DESK_DIR/build-resources/icon.png" --out "$DESK_DIR/build-resources/icon.iconset/icon_256x256.png"
        sips -z 512 512   "$DESK_DIR/build-resources/icon.png" --out "$DESK_DIR/build-resources/icon.iconset/icon_256x256@2x.png"
        sips -z 512 512   "$DESK_DIR/build-resources/icon.png" --out "$DESK_DIR/build-resources/icon.iconset/icon_512x512.png"
        iconutil -c icns "$DESK_DIR/build-resources/icon.iconset"
        rm -rf "$DESK_DIR/build-resources/icon.iconset"
        echo -e "${GREEN}✓ Mac图标已创建${NC}"
    else
        echo -e "${YELLOW}警告: iconutil未找到（Mac系统工具），跳过icns创建${NC}"
    fi
fi
echo ""

# 构建前端
echo -e "${YELLOW}[4/6] 构建前端应用...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run build
echo -e "${GREEN}✓ 前端构建完成${NC}"
echo ""

# 构建Electron主进程
echo -e "${YELLOW}[5/6] 构建Electron主进程...${NC}"
cd "$DESK_DIR"
npm run build:main
echo -e "${GREEN}✓ Electron主进程构建完成${NC}"
echo ""

# 构建安装程序
echo -e "${YELLOW}[6/6] 生成安装程序...${NC}"
cd "$DESK_DIR"

# 根据系统架构构建
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "检测到Linux系统，构建Linux版本..."
    npm run build:linux
    
    if [ -d "dist" ]; then
        cp -rf dist/*.AppImage "$OUTPUT_DIR/" 2>/dev/null || true
        cp -rf dist/*.deb "$OUTPUT_DIR/" 2>/dev/null || true
        cp -rf dist/*.rpm "$OUTPUT_DIR/" 2>/dev/null || true
        echo -e "${GREEN}✓ Linux安装程序已生成${NC}"
    fi
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "检测到macOS系统，构建Windows和Mac版本..."
    
    # 构建Mac版本
    echo "构建Mac DMG和ZIP..."
    npm run build:dmg
    npm run build:zip
    
    if [ -d "dist" ]; then
        cp -rf dist/*.dmg "$OUTPUT_DIR/" 2>/dev/null || true
        cp -rf dist/*.zip "$OUTPUT_DIR/" 2>/dev/null || true
        echo -e "${GREEN}✓ Mac安装程序已生成${NC}"
    fi
    
    # 尝试使用Cross-compiler构建Windows版本
    if command -v wine &> /dev/null; then
        echo "尝试构建Windows版本（使用Wine）..."
        export CSC_LINK=""
        export CSC_KEY_PASSWORD=""
        npm run build:nsis
        
        if [ -d "dist" ]; then
            cp -rf dist/*.exe "$OUTPUT_DIR/" 2>/dev/null || true
            echo -e "${GREEN}✓ Windows安装程序已生成${NC}"
        fi
    else
        echo -e "${YELLOW}注意: Wine未安装，无法在Mac上构建Windows版本${NC}"
        echo -e "${YELLOW}请使用GitHub Actions或专门的Windows构建服务器${NC}"
    fi
    
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "检测到Windows系统，构建Windows和Mac版本..."
    
    # 构建Windows版本
    echo "构建Windows NSIS和便携版..."
    npm run build:nsis
    npm run build:portable
    
    if [ -d "dist" ]; then
        cp -rf dist/*.exe "$OUTPUT_DIR/" 2>/dev/null || true
        cp -rf dist/*.zip "$OUTPUT_DIR/" 2>/dev/null || true
        echo -e "${GREEN}✓ Windows安装程序已生成${NC}"
    fi
    
    # 尝试使用Cross-compiler构建Mac版本
    echo "尝试构建Mac版本..."
    export CSC_LINK=""
    export CSC_KEY_PASSWORD=""
    npm run build:dmg
    
    if [ -d "dist" ]; then
        cp -rf dist/*.dmg "$OUTPUT_DIR/" 2>/dev/null || true
        cp -rf dist/*.zip "$OUTPUT_DIR/" 2>/dev/null || true
        echo -e "${GREEN}✓ Mac安装程序已生成${NC}"
    fi
fi
echo ""

# 生成版本信息文件
echo -e "${YELLOW}生成版本信息...${NC}"
cat > "$OUTPUT_DIR/version.json" << EOF
{
  "version": "$VERSION",
  "appName": "$APP_NAME",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "platform": "$(uname -s)",
  "arch": "$(uname -m)",
  "files": [
    $(cd "$OUTPUT_DIR" && ls -1 *.exe 2>/dev/null | sed 's/^/"/;s/$/",/' | tr '\n' ',' | sed 's/,$//'),
    $(cd "$OUTPUT_DIR" && ls -1 *.dmg 2>/dev/null | sed 's/^/"/;s/$/",/' | tr '\n' ',' | sed 's/,$//'),
    $(cd "$OUTPUT_DIR" && ls -1 *.AppImage 2>/dev/null | sed 's/^/"/;s/$/",/' | tr '\n' ',' | sed 's/,$//'),
    $(cd "$OUTPUT_DIR" && ls -1 *.deb 2>/dev/null | sed 's/^/"/;s/$/",/' | tr '\n' ',' | sed 's/,$//'),
    $(cd "$OUTPUT_DIR" && ls -1 *.rpm 2>/dev/null | sed 's/^/"/;s/$/",/' | tr '\n' ',' | sed 's/,$//'),
    $(cd "$OUTPUT_DIR" && ls -1 *.zip 2>/dev/null | sed 's/^/"/;s/$/",/' | tr '\n' ',' | sed 's/,$//')
  ]
}
EOF

# 清理JSON中的空数组
sed -i 's/\[\s*,/[]/g' "$OUTPUT_DIR/version.json"

# 列出生成的文件
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}构建完成！生成的文件：${NC}"
echo -e "${GREEN}========================================${NC}"
ls -lh "$OUTPUT_DIR"
echo ""

# 生成校验和
echo -e "${YELLOW}生成文件校验和...${NC}"
cd "$OUTPUT_DIR"
for file in *.exe *.dmg *.AppImage *.deb *.rpm *.zip; do
    if [ -f "$file" ]; then
        md5sum "$file" >> checksums.md5
        sha256sum "$file" >> checksums.sha256
        echo -e "${GREEN}✓ $file${NC}"
    fi
done
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}构建成功完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "安装程序位置: $OUTPUT_DIR"
echo -e "版本信息: $OUTPUT_DIR/version.json"
echo -e "校验和: $OUTPUT_DIR/checksums.md5"
echo -e ""
echo -e "下一步："
echo -e "1. 验证安装程序是否正常工作"
echo -e "2. 在Windows系统测试.exe文件"
echo -e "3. 在Mac系统测试.dmg文件"
echo -e "4. 将文件上传到服务器供用户下载"
echo ""
