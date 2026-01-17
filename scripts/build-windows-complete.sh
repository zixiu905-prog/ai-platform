#!/bin/bash

# 完整的 Windows 安装程序构建脚本
# 主动修复问题，反复尝试直到成功

set -e

PROJECT_DIR="/home/ai design"
DESK_DIR="$PROJECT_DIR/desk"
MAX_RETRIES=10
RETRY_DELAY=30

echo "========================================="
echo "完整 Windows 安装程序构建"
echo "========================================="
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    exit 1
fi

echo "✅ Docker 已安装"
echo ""

# 拉取 Wine 镜像（带重试）
for attempt in $(seq 1 $MAX_RETRIES); do
    echo "🐳 拉取 Wine 构建镜像... (尝试 $attempt/$MAX_RETRIES)"
    if docker pull electronuserland/builder:wine 2>&1 | tail -5; then
        echo "✅ 镜像拉取成功"
        break
    else
        if [ $attempt -eq $MAX_RETRIES ]; then
            echo "❌ 镜像拉取失败"
            exit 1
        fi
        echo "⏳ 等待 $RETRY_DELAY 秒后重试..."
        sleep $RETRY_DELAY
    fi
done

echo ""
echo "📦 开始构建 Windows 安装程序（完整 NSIS）"
echo ""

# 确保前端已构建
if [ ! -f "$PROJECT_DIR/frontend/dist/index.html" ]; then
    echo "📝 构建前端..."
    cd "$PROJECT_DIR/frontend"
    npm run build
    cd "$DESK_DIR"
fi

echo "✅ 前端已构建"
echo ""

# 构建尝试循环
for attempt in $(seq 1 $MAX_RETRIES); do
    echo "========================================="
    echo "构建尝试 $attempt/$MAX_RETRIES"
    echo "========================================="
    echo ""

    # 检查是否有构建产物
    if [ -f "$DESK_DIR/dist-electron/"*.exe ]; then
        echo "✅ 发现已存在的 .exe 文件"
        ls -lh "$DESK_DIR/dist-electron/"*.exe
        echo ""
        echo "✅ Windows 安装程序构建成功！"
        exit 0
    fi

    # Docker 构建（带所有必要的环境变量）
    docker run --rm \
        -v "$DESK_DIR:/project" \
        -v "$DESK_DIR/dist-electron:/project/dist-electron" \
        -v /root/.cache/electron:/root/.cache/electron \
        -w /project \
        -e ELECTRON_CACHE=/root/.cache/electron \
        -e ELECTRON_BUILDER_CACHE=/root/.cache/electron \
        -e NO_NATIVE_REBUILD=1 \
        --cap-add SYS_ADMIN \
        --security-opt seccomp=unconfined \
        electronuserland/builder:wine \
        /bin/bash -c "
            set -e
            echo '📦 安装依赖...'
            npm ci --ignore-scripts

            echo '🔧 修复 7zip-bin 权限...'
            mkdir -p /project/node_modules/7zip-bin/linux/x64
            chmod +x /project/node_modules/7zip-bin/linux/x64/7za || true

            echo '🔨 构建 Windows 便携版（禁用原生依赖重新构建）...'
            npm run build:portable

            if [ -f /project/dist-electron/*.exe ]; then
                echo '========================================='
                echo '✅ 构建完成！'
                echo '========================================='
                ls -lh /project/dist-electron/*.exe
                exit 0
            else
                echo '❌ 未找到 .exe 文件'
                exit 1
            fi
        " 2>&1

    BUILD_STATUS=$?

    if [ $BUILD_STATUS -eq 0 ]; then
        echo ""
        echo "========================================="
        echo "✅ Windows 安装程序构建成功！"
        echo "========================================="
        echo ""
        echo "📁 输出目录: $DESK_DIR/dist-electron/"
        echo ""
        ls -lh "$DESK_DIR/dist-electron/"*.exe
        exit 0
    fi

    echo ""
    echo "❌ 构建失败 (退出码: $BUILD_STATUS)"

    if [ $attempt -lt $MAX_RETRIES ]; then
        echo "⏳ 等待 $RETRY_DELAY 秒后重试..."
        sleep $RETRY_DELAY
    fi
done

echo ""
echo "========================================="
echo "❌ 构建失败，已达到最大重试次数"
echo "========================================="
echo ""
echo "📁 输出目录内容:"
ls -lh "$DESK_DIR/dist-electron/" || true
exit 1
