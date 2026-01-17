#!/bin/bash

# 使用 Docker 构建 Windows 安装包（带自动重试）

set -e

PROJECT_DIR="/home/ai design"
DESK_DIR="$PROJECT_DIR/desk"
MAX_RETRIES=5
RETRY_DELAY=10

echo "========================================="
echo "使用 Docker 构建 Windows 安装包（带重试）"
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

# 预先下载所需的工具（带重试）
download_with_retry() {
    local url=$1
    local output=$2
    local retries=0

    while [ $retries -lt $MAX_RETRIES ]; do
        echo "📥 下载: $url (尝试 $((retries + 1))/$MAX_RETRIES)"
        if curl -fL --connect-timeout 30 --max-time 300 -o "$output" "$url"; then
            echo "✅ 下载成功"
            return 0
        else
            echo "❌ 下载失败，等待 $RETRY_DELAY 秒后重试..."
            retries=$((retries + 1))
            sleep $RETRY_DELAY
        fi
    done

    echo "❌ 下载失败，已达到最大重试次数"
    return 1
}

# 创建工具缓存目录
TOOL_CACHE="/root/.cache/electron-builder-tools"
mkdir -p "$TOOL_CACHE"

echo ""
echo "🔧 预下载所需工具..."
echo ""

# 使用 Docker 运行 electron-builder（带重试）
for attempt in $(seq 1 $MAX_RETRIES); do
    echo "========================================="
    echo "构建尝试 $attempt/$MAX_RETRIES"
    echo "========================================="
    echo ""

    docker run --rm \
        -v "$DESK_DIR:/project" \
        -v "$DESK_DIR/dist-electron:/project/dist-electron" \
        -v /root/.cache/electron:/root/.cache/electron \
        -v "$TOOL_CACHE:/root/.cache/electron-builder-tools" \
        -w /project \
        -e ELECTRON_CACHE=/root/.cache/electron \
        -e ELECTRON_BUILDER_CACHE=/root/.cache/electron-builder-tools \
        electronuserland/builder:wine \
        /bin/bash -c "
            npm ci --ignore-scripts && \
            npx electron-builder --win nsis --publish never && \
            echo '=========================================' && \
            echo '构建完成！' && \
            echo '=========================================' && \
            ls -lh /project/dist-electron/*.exe 2>/dev/null || true
        "

    BUILD_STATUS=$?

    if [ $BUILD_STATUS -eq 0 ] && [ -f "$DESK_DIR/dist-electron/"*.exe ]; then
        echo ""
        echo "========================================="
        echo "✅ Windows 安装包构建成功！"
        echo "========================================="
        echo ""
        echo "📁 输出目录: $DESK_DIR/dist-electron/"
        ls -lh "$DESK_DIR/dist-electron/"*.exe
        exit 0
    else
        echo ""
        echo "❌ 构建失败或未生成 .exe 文件"
        if [ $attempt -lt $MAX_RETRIES ]; then
            echo "⏳ 等待 30 秒后重试..."
            sleep 30
        fi
    fi
done

echo ""
echo "❌ 构建失败，已达到最大重试次数"
echo ""
echo "📁 输出目录内容:"
ls -lh "$DESK_DIR/dist-electron/" || true
exit 1
