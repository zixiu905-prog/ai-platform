#!/bin/bash

# 反复构建直到NSIS工具下载成功

set -e

PROJECT_DIR="/home/ai design"
DESK_DIR="$PROJECT_DIR/desk"
MAX_RETRIES=10
RETRY_DELAY=15

echo "========================================="
echo "Windows NSIS 安装包构建（带自动重试）"
echo "========================================="
echo ""

# 创建工具缓存目录
mkdir -p /root/.cache/electron-builder-tools

for attempt in $(seq 1 $MAX_RETRIES); do
    echo "========================================="
    echo "构建尝试 $attempt/$MAX_RETRIES"
    echo "========================================="
    echo ""

    docker run --rm \
        -v "$DESK_DIR:/project" \
        -v "$DESK_DIR/dist-electron:/project/dist-electron" \
        -v /root/.cache/electron:/root/.cache/electron \
        -v /root/.cache/electron-builder-tools:/root/.cache/electron-builder-tools \
        -w /project \
        -e ELECTRON_CACHE=/root/.cache/electron \
        -e ELECTRON_BUILDER_CACHE=/root/.cache/electron-builder-tools \
        electronuserland/builder:wine \
        /bin/bash -c "
            npm ci --ignore-scripts && \
            npx electron-builder --win nsis --publish never && \
            ls -lh /project/dist-electron/*.exe
        "

    BUILD_STATUS=$?

    if [ $BUILD_STATUS -eq 0 ]; then
        echo ""
        echo "========================================="
        echo "✅ 构建成功！"
        echo "========================================="
        echo ""
        ls -lh "$DESK_DIR/dist-electron/"*.exe
        exit 0
    else
        echo ""
        echo "❌ 构建失败"
        if [ $attempt -lt $MAX_RETRIES ]; then
            echo "⏳ 等待 $RETRY_DELAY 秒后重试..."
            sleep $RETRY_DELAY
        fi
    fi
done

echo ""
echo "❌ 已达到最大重试次数，构建失败"
echo ""
ls -lh "$DESK_DIR/dist-electron/" || true
exit 1
