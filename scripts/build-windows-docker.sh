#!/bin/bash

# 使用 Docker 构建 Windows 安装包 (修复版 - 跳过 canvas 编译)

set -e

PROJECT_DIR="/home/ai design"
DESK_DIR="$PROJECT_DIR/desk"

echo "========================================="
echo "使用 Docker 构建 Windows 安装包"
echo "========================================="
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    exit 1
fi

echo "✅ Docker 已安装"
echo ""

# 拉取 Wine 镜像
echo "🐳 拉取 Wine 构建镜像..."
docker pull electronuserland/builder:wine

echo ""
echo "📦 开始构建 Windows 安装包..."
echo ""

# 使用 Docker 运行 electron-builder
# 挂载 Electron 缓存目录，避免重复下载
docker run --rm \
    -v "$DESK_DIR:/project" \
    -v "$DESK_DIR/dist-electron:/project/dist-electron" \
    -v /root/.cache/electron:/root/.cache/electron \
    -w /project \
    -e ELECTRON_CACHE=/root/.cache/electron \
    electronuserland/builder:wine \
    /bin/bash -c "
        npm ci --ignore-scripts && \
        npx electron-builder --win nsis --publish never && \
        echo '=========================================' && \
        echo '构建完成！' && \
        echo '=========================================' && \
        ls -lh /project/dist-electron/*.exe 2>/dev/null || true
    "

echo ""
echo "========================================="
echo "✅ Windows 安装包构建完成！"
echo "========================================="
echo ""
echo "📁 输出目录: $DESK_DIR/dist-electron/"
echo ""
ls -lh "$DESK_DIR/dist-electron/"*.exe 2>/dev/null || echo "未找到 .exe 文件"
