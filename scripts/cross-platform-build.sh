#!/bin/bash

# 跨平台桌面应用构建脚本（使用Docker）
# 支持在Linux系统上构建Windows和Mac应用

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
echo -e "${BLUE}跨平台桌面应用构建系统${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker未安装${NC}"
    echo "请先安装Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✓ Docker已安装${NC}"
docker --version
echo ""

# 构建Windows版本
build_windows() {
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}构建Windows版本${NC}"
    echo -e "${YELLOW}========================================${NC}"
    
    # 使用electron-userland/builder:wine镜像
    docker run --rm \
        -v "${PROJECT_ROOT}:/project" \
        -w /project/desk \
        -e CSC_LINK="" \
        -e CSC_KEY_PASSWORD="" \
        electronuserland/builder:wine \
        bash -c "
            npm install && \
            npm run build:renderer && \
            npm run build:main && \
            electron-builder --win --x64 --ia32
        "
    
    # 复制生成的文件
    cd "$DESK_DIR"
    if [ -d "dist" ]; then
        cp -rf dist/*.exe "$OUTPUT_DIR/" 2>/dev/null || true
        cp -rf dist/*.zip "$OUTPUT_DIR/" 2>/dev/null || true
        echo -e "${GREEN}✓ Windows安装程序已生成${NC}"
        ls -lh "$OUTPUT_DIR"/*.exe 2>/dev/null || echo "  警告: 未找到.exe文件"
    fi
    echo ""
}

# 构建Mac版本
build_mac() {
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}构建macOS版本${NC}"
    echo -e "${YELLOW}========================================${NC}"
    
    # 使用electron-userland/builder:macos镜像
    docker run --rm \
        -v "${PROJECT_ROOT}:/project" \
        -w /project/desk \
        -e CSC_LINK="" \
        -e CSC_KEY_PASSWORD="" \
        electronuserland/builder:macos \
        bash -c "
            npm install && \
            npm run build:renderer && \
            npm run build:main && \
            electron-builder --mac --x64 --arm64
        "
    
    # 复制生成的文件
    cd "$DESK_DIR"
    if [ -d "dist" ]; then
        cp -rf dist/*.dmg "$OUTPUT_DIR/" 2>/dev/null || true
        cp -rf dist/*.zip "$OUTPUT_DIR/" 2>/dev/null || true
        echo -e "${GREEN}✓ macOS安装程序已生成${NC}"
        ls -lh "$OUTPUT_DIR"/*.dmg 2>/dev/null || echo "  警告: 未找到.dmg文件"
    fi
    echo ""
}

# 构建Linux版本
build_linux() {
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}构建Linux版本${NC}"
    echo -e "${YELLOW}========================================${NC}"
    
    cd "$DESK_DIR"
    
    # 构建前端
    echo "[1/3] 构建前端..."
    npm run build:renderer
    
    # 构建Electron主进程
    echo "[2/3] 构建Electron主进程..."
    npm run build:main
    
    # 使用electron-packager打包
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
        echo -e "${GREEN}✓ Linux安装程序已生成${NC}"
    fi
    echo ""
}

# 生成校验和
generate_checksums() {
    echo -e "${YELLOW}生成文件校验和...${NC}"
    cd "$OUTPUT_DIR"
    
    # 清除旧的校验和文件
    rm -f checksums.md5 checksums.sha256
    
    # 生成新的校验和
    for file in *.exe *.dmg *.AppImage *.tar.gz *.zip *.deb *.rpm; do
        if [ -f "$file" ]; then
            md5sum "$file" >> checksums.md5
            sha256sum "$file" >> checksums.sha256
            echo -e "${GREEN}✓ $file${NC}"
        fi
    done
    
    echo ""
    echo "MD5校验和:"
    cat checksums.md5
    echo ""
    echo "SHA256校验和:"
    cat checksums.sha256
}

# 更新版本信息
update_version_info() {
    echo -e "${YELLOW}更新版本信息...${NC}"
    
    VERSION=$(cat "$DESK_DIR/package.json" | grep '"version"' | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')
    BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # 统计各平台的文件
    WINDOWS_FILES=$(cd "$OUTPUT_DIR" && ls -1 *.exe 2>/dev/null | wc -l)
    MAC_FILES=$(cd "$OUTPUT_DIR" && ls -1 *.dmg 2>/dev/null | wc -l)
    LINUX_FILES=$(cd "$OUTPUT_DIR" && ls -1 *.tar.gz 2>/dev/null | wc -l)
    
    cat > "$OUTPUT_DIR/version.json" << EOF
{
  "version": "$VERSION",
  "appName": "AI智能体平台",
  "buildDate": "$BUILD_DATE",
  "platforms": {
    "windows": {
      "available": $([ $WINDOWS_FILES -gt 0 ] && echo "true" || echo "false"),
      "files": $(cd "$OUTPUT_DIR" && ls -1 *.exe 2>/dev/null | sed 's/^/"/;s/$/",/' | tr '\n' ',' | sed 's/,$//' | sed 's/^/[/;s/$/]/'),
      "count": $WINDOWS_FILES
    },
    "mac": {
      "available": $([ $MAC_FILES -gt 0 ] && echo "true" || echo "false"),
      "files": $(cd "$OUTPUT_DIR" && ls -1 *.dmg 2>/dev/null | sed 's/^/"/;s/$/",/' | tr '\n' ',' | sed 's/,$//' | sed 's/^/[/;s/$/]/'),
      "count": $MAC_FILES
    },
    "linux": {
      "available": $([ $LINUX_FILES -gt 0 ] && echo "true" || echo "false"),
      "files": $(cd "$OUTPUT_DIR" && ls -1 *.tar.gz 2>/dev/null | sed 's/^/"/;s/$/",/' | tr '\n' ',' | sed 's/,$//' | sed 's/^/[/;s/$/]/'),
      "count": $LINUX_FILES
    }
  }
}
EOF
    
    echo -e "${GREEN}✓ 版本信息已更新${NC}"
}

# 主菜单
echo "请选择要构建的平台："
echo "1) Windows"
echo "2) macOS"
echo "3) Linux"
echo "4) 全部"
echo "5) 仅生成校验和"
read -p "请输入选项 [1-5]: " choice

case $choice in
    1)
        build_windows
        generate_checksums
        update_version_info
        ;;
    2)
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
        build_linux
        build_windows
        build_mac
        generate_checksums
        update_version_info
        ;;
    5)
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
