#!/bin/bash

# 构建桌面应用安装包的脚本

set -e

echo "========================================="
echo "AI Platform - 桌面应用构建脚本"
echo "========================================="
echo ""

PROJECT_DIR="/home/ai design/desk"
cd "$PROJECT_DIR"

echo "📦 构建方案说明："
echo "   1. Linux: 直接在服务器上构建"
echo "   2. Windows: 使用 Docker + Wine 构建"
echo "   3. macOS: 使用 GitHub Actions 构建"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    exit 1
fi

echo "✅ Docker 已安装"
echo ""

# 构建选项
echo "请选择要构建的平台："
echo "   1) Linux (AppImage, Deb, RPM)"
echo "   2) Windows (NSIS 安装程序, 便携版)"
echo "   3) 所有平台 (Linux + Windows)"
echo "   4) 仅推送到 GitHub (触发 macOS 构建)"
echo ""
read -p "请输入选项 (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🐧 开始构建 Linux 安装包..."
        echo ""

        # 构建前端
        echo "📝 构建前端..."
        cd /home/ai\ design/frontend
        npm run build

        # 返回 desk 目录
        cd "$PROJECT_DIR"

        # 构建 Linux 安装包
        echo "📦 构建 AppImage..."
        npm run build:appimage

        echo "📦 构建 Debian 包..."
        npm run build:deb

        echo "📦 构建 RPM 包..."
        npm run build:rpm

        echo ""
        echo "✅ Linux 安装包构建完成！"
        echo "📁 输出目录: $PROJECT_DIR/dist-electron/"
        ls -lh "$PROJECT_DIR/dist-electron/"/*.{AppImage,deb,rpm} 2>/dev/null || true
        ;;

    2)
        echo ""
        echo "🪟 开始构建 Windows 安装包 (使用 Docker)..."
        echo ""

        # 构建 Windows Docker 镜像
        echo "🐳 构建 Docker 镜像..."
        cd "$PROJECT_DIR"
        docker build -f Dockerfile.windows -t ai-platform-windows-builder .

        # 运行容器并构建
        echo "📦 在容器中构建 Windows 安装包..."
        docker run --rm -v "$PROJECT_DIR/dist-electron:/output" ai-platform-windows-builder

        echo ""
        echo "✅ Windows 安装包构建完成！"
        echo "📁 输出目录: $PROJECT_DIR/dist-electron/"
        ls -lh "$PROJECT_DIR/dist-electron/"/*.{exe,zip} 2>/dev/null || true
        ;;

    3)
        echo ""
        echo "🚀 开始构建所有平台..."
        echo ""

        # 构建 Linux
        echo "🐧 构建 Linux 安装包..."
        cd /home/ai\ design/frontend
        npm run build
        cd "$PROJECT_DIR"
        npm run build:appimage
        npm run build:deb
        npm run build:rpm

        # 构建 Windows
        echo "🪟 构建 Windows 安装包..."
        docker build -f Dockerfile.windows -t ai-platform-windows-builder .
        docker run --rm -v "$PROJECT_DIR/dist-electron:/output" ai-platform-windows-builder

        echo ""
        echo "✅ 所有平台构建完成！"
        echo "📁 输出目录: $PROJECT_DIR/dist-electron/"
        ls -lh "$PROJECT_DIR/dist-electron/"
        ;;

    4)
        echo ""
        echo "📤 推送到 GitHub (触发 macOS 构建)..."
        echo ""

        cd /home/ai\ design
        git add .
        git commit -m "Build: Prepare for cross-platform builds" || true

        echo "正在推送到 GitHub..."
        git push origin main

        echo ""
        echo "✅ 推送完成！"
        echo "🔍 查看 GitHub Actions 构建状态:"
        echo "   https://github.com/zixiu905-prog/ai-platform/actions"
        ;;

    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "========================================="
echo "✅ 构建完成！"
echo "========================================="
