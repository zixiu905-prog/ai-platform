#!/bin/bash

# 简化的桌面应用构建脚本

set -e

PROJECT_ROOT="/home/ai design"
DESK_DIR="$PROJECT_ROOT/desk"
OUTPUT_DIR="$PROJECT_ROOT/downloads/desktop"

echo "========================================"
echo "简化版桌面应用构建"
echo "========================================"

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 1. 构建前端
echo "[1/4] 构建前端应用..."
cd "$PROJECT_ROOT/frontend"
npm run build
echo "✓ 前端构建完成"

# 2. 构建Electron主进程
echo "[2/4] 构建Electron主进程..."
cd "$DESK_DIR"
npm run build:main
echo "✓ Electron主进程构建完成"

# 3. 使用electron-packager打包
echo "[3/4] 使用electron-packager打包..."
cd "$DESK_DIR"

# 创建临时的打包目录
PACK_DIR="$DESK_DIR/package-temp"
mkdir -p "$PACK_DIR"

# 复制必要的文件
cp -r dist "$PACK_DIR/"
cp package.json "$PACK_DIR/"
cp electron-builder.json "$PACK_DIR/"
cp -r node_modules "$PACK_DIR/"

# 使用electron-packager
npx electron-packager "$PACK_DIR" "AI智能体平台" \
    --platform=linux \
    --arch=x64 \
    --out="$DESK_DIR/dist-electron" \
    --overwrite

echo "✓ 打包完成"

# 4. 创建AppImage（如果工具可用）
echo "[4/4] 创建AppImage..."
if command -v appimagetool &> /dev/null; then
    APPDIR="$DESK_DIR/dist-electron/AI智能体平台-linux-x64"
    if [ -d "$APPDIR" ]; then
        cd "$APPDIR"
        chmod +x AppRun || true
        appimagetool "$APPDIR" "$OUTPUT_DIR/AI智能体平台-1.0.0.AppImage"
        echo "✓ AppImage创建完成"
    fi
else
    echo "⚠ appimagetool未安装，跳过AppImage创建"
    # 直接复制打包好的目录
    if [ -d "$DESK_DIR/dist-electron/AI智能体平台-linux-x64" ]; then
        tar -czf "$OUTPUT_DIR/AI智能体平台-1.0.0-linux-x64.tar.gz" \
            -C "$DESK_DIR/dist-electron" \
            "AI智能体平台-linux-x64"
        echo "✓ 创建tar.gz包"
    fi
fi

# 清理
rm -rf "$PACK_DIR"

echo ""
echo "========================================"
echo "构建完成！"
echo "========================================"
ls -lh "$OUTPUT_DIR"
