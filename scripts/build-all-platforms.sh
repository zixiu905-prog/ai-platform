#!/bin/bash

# 智能桌面应用构建脚本
# 自动检测系统并选择最佳构建方法

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="/home/ai design"
DESK_DIR="$PROJECT_ROOT/desk"
OUTPUT_DIR="$PROJECT_ROOT/downloads/desktop"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}AI智能体平台桌面应用构建系统${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 检测操作系统
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "检测到Linux系统"
        return 0
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "检测到macOS系统"
        return 1
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "检测到Windows系统"
        return 2
    else
        echo -e "${RED}未知操作系统${NC}"
        exit 1
    fi
}

# 构建Linux版本
build_linux() {
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}构建Linux版本${NC}"
    echo -e "${YELLOW}========================================${NC}"
    
    cd "$DESK_DIR"
    
    echo "[1/3] 构建前端..."
    npm run build:renderer
    
    echo "[2/3] 构建Electron主进程..."
    npm run build:main
    
    echo "[3/3] 打包应用..."
    npx electron-packager . "AI智能体平台" \
        --platform=linux \
        --arch=x64 \
        --out=dist-electron \
        --overwrite
    
    # 创建tar.gz
    if [ -d "dist-electron/AI智能体平台-linux-x64" ]; then
        tar -czf "$OUTPUT_DIR/AI智能体平台-1.0.0-linux-x64.tar.gz" \
            -C dist-electron \
            "AI智能体平台-linux-x64"
        echo -e "${GREEN}✓ Linux版本构建完成${NC}"
    fi
}

# 构建Windows版本
build_windows() {
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}构建Windows版本${NC}"
    echo -e "${YELLOW}========================================${NC}"
    
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
        # 直接在Windows上构建
        cd "$DESK_DIR"
        npm run build:renderer
        npm run build:main
        npx electron-builder --win nsis portable --x64 ia32
        
        # 复制文件
        cp -rf dist/*.exe "$OUTPUT_DIR/" 2>/dev/null || true
        cp -rf dist/*.zip "$OUTPUT_DIR/" 2>/dev/null || true
    else
        # 使用Docker构建
        if command -v docker &> /dev/null; then
            echo -e "${GREEN}使用Docker构建Windows版本...${NC}"
            docker run --rm \
                -v "${PROJECT_ROOT}:/project" \
                -w /project/desk \
                electronuserland/builder:wine \
                bash -c "
                    npm install && \
                    npm run build:renderer && \
                    npm run build:main && \
                    electron-builder --win nsis portable --x64 ia32
                "
            
            cd "$DESK_DIR"
            cp -rf dist/*.exe "$OUTPUT_DIR/" 2>/dev/null || true
            cp -rf dist/*.zip "$OUTPUT_DIR/" 2>/dev/null || true
        else
            echo -e "${YELLOW}警告: Docker未安装，无法构建Windows版本${NC}"
            echo -e "${YELLOW}请参考 docs/BUILD_WINDOWS.md 在Windows系统上构建${NC}"
        fi
    fi
    
    if ls "$OUTPUT_DIR"/*.exe &>/dev/null; then
        echo -e "${GREEN}✓ Windows版本构建完成${NC}"
    fi
}

# 构建Mac版本
build_mac() {
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}构建macOS版本${NC}"
    echo -e "${YELLOW}========================================${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # 直接在Mac上构建
        cd "$DESK_DIR"
        npm run build:renderer
        npm run build:main
        npx electron-builder --mac dmg zip --x64 arm64
        
        # 复制文件
        cp -rf dist/*.dmg "$OUTPUT_DIR/" 2>/dev/null || true
        cp -rf dist/*.zip "$OUTPUT_DIR/" 2>/dev/null || true
    else
        # 使用Docker构建
        if command -v docker &> /dev/null; then
            echo -e "${GREEN}使用Docker构建macOS版本...${NC}"
            docker run --rm \
                -v "${PROJECT_ROOT}:/project" \
                -w /project/desk \
                electronuserland/builder:macos \
                bash -c "
                    npm install && \
                    npm run build:renderer && \
                    npm run build:main && \
                    electron-builder --mac dmg zip --x64 arm64
                "
            
            cd "$DESK_DIR"
            cp -rf dist/*.dmg "$OUTPUT_DIR/" 2>/dev/null || true
            cp -rf dist/*.zip "$OUTPUT_DIR/" 2>/dev/null || true
        else
            echo -e "${YELLOW}警告: Docker未安装，无法构建macOS版本${NC}"
            echo -e "${YELLOW}请参考 docs/BUILD_MAC.md 在macOS系统上构建${NC}"
        fi
    fi
    
    if ls "$OUTPUT_DIR"/*.dmg &>/dev/null; then
        echo -e "${GREEN}✓ macOS版本构建完成${NC}"
    fi
}

# 生成校验和
generate_checksums() {
    echo -e "${YELLOW}生成文件校验和...${NC}"
    cd "$OUTPUT_DIR"
    
    rm -f checksums.md5 checksums.sha256
    
    for file in *.exe *.dmg *.AppImage *.tar.gz *.zip *.deb *.rpm; do
        if [ -f "$file" ]; then
            md5sum "$file" >> checksums.md5
            sha256sum "$file" >> checksums.sha256
            echo -e "${GREEN}✓ $file${NC}"
        fi
    done
}

# 更新版本信息
update_version_info() {
    echo -e "${YELLOW}更新版本信息...${NC}"
    
    VERSION=$(cat "$DESK_DIR/package.json" | grep '"version"' | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')
    BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # 获取文件列表
    get_files() {
        local pattern=$1
        cd "$OUTPUT_DIR"
        ls -1 $pattern 2>/dev/null | sed 's/^/"/;s/$/",/' | tr '\n' ',' | sed 's/,$//' | sed 's/^/[/;s/$/]/'
    }
    
    cat > "$OUTPUT_DIR/version.json" << EOF
{
  "version": "$VERSION",
  "appName": "AI智能体平台",
  "buildDate": "$BUILD_DATE",
  "platforms": {
    "windows": {
      "available": $([ -f "$OUTPUT_DIR"/*.exe ] 2>/dev/null && echo "true" || echo "false"),
      "files": $(get_files "*.exe"),
      "description": "Windows安装程序（NSIS安装包和便携版）"
    },
    "mac": {
      "available": $([ -f "$OUTPUT_DIR"/*.dmg ] 2>/dev/null && echo "true" || echo "false"),
      "files": $(get_files "*.dmg"),
      "description": "macOS安装程序（DMG磁盘映像）"
    },
    "linux": {
      "available": $([ -f "$OUTPUT_DIR"/*.tar.gz ] 2>/dev/null && echo "true" || echo "false"),
      "files": $(get_files "*.tar.gz"),
      "description": "Linux安装程序（tar.gz压缩包）"
    }
  }
}
EOF
    
    echo -e "${GREEN}✓ 版本信息已更新${NC}"
}

# 主程序
echo "当前系统: $(uname -s)"
echo "系统架构: $(uname -m)"
echo ""

# 获取用户选择
echo "请选择构建选项："
echo "1) 自动构建当前平台"
echo "2) 构建所有平台（需要Docker）"
echo "3) 仅构建Linux版本"
echo "4) 仅构建Windows版本"
echo "5) 仅构建macOS版本"
echo "6) 生成校验和和版本信息"
read -p "请输入选项 [1-6]: " choice

case $choice in
    1)
        detect_os
        case $? in
            0) build_linux ;;
            1) build_mac ;;
            2) build_windows ;;
        esac
        generate_checksums
        update_version_info
        ;;
    2)
        build_linux
        build_windows
        build_mac
        generate_checksums
        update_version_info
        ;;
    3)
        build_linux
        generate_checksums
        update_version_info
        ;;
    4)
        build_windows
        generate_checksums
        update_version_info
        ;;
    5)
        build_mac
        generate_checksums
        update_version_info
        ;;
    6)
        generate_checksums
        update_version_info
        ;;
    *)
        echo -e "${RED}无效选项${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}构建完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo "输出目录: $OUTPUT_DIR"
echo ""
ls -lh "$OUTPUT_DIR"
echo ""
echo "下一步："
echo "1. 在对应的系统上测试安装程序"
echo "2. 验证应用功能是否正常"
echo "3. 上传到服务器供用户下载"
echo ""
echo "详细构建文档："
echo "- Windows: docs/BUILD_WINDOWS.md"
echo "- macOS: docs/BUILD_MAC.md"
echo "- 跨平台: scripts/cross-platform-build.sh"
echo ""
