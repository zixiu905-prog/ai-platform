#!/bin/bash

# 完整构建脚本
# Windows 和 macOS：使用 GitHub Actions
# Linux：本地构建

set -e

PROJECT_DIR="/home/ai design"
DESK_DIR="$PROJECT_DIR/desk"

echo "========================================="
echo "AI Platform - 完整构建脚本"
echo "========================================="
echo ""

# 构建 Linux 安装包
echo "🐧 开始构建 Linux 安装包..."
echo ""

# 构建前端
echo "📝 构建前端..."
cd "$PROJECT_DIR/frontend"
npm run build

# 返回 desk 目录
cd "$DESK_DIR"

# 构建 Linux 安装包
echo "📦 构建 AppImage..."
npm run build:appimage

echo "📦 构建 Debian 包..."
npm run build:deb

echo "📦 构建 RPM 包..."
npm run build:rpm

echo ""
echo "✅ Linux 安装包构建完成！"
echo "📁 输出目录: $DESK_DIR/dist-electron/"
echo ""

ls -lh "$DESK_DIR/dist-electron/"/*.{AppImage,deb,rpm} 2>/dev/null || true

echo ""
echo "========================================="
echo "📤 推送到 GitHub（触发 Windows 和 macOS 构建）"
echo "========================================="
echo ""

cd "$PROJECT_DIR"
git add .
git commit -m "Build: Prepare for cross-platform builds

- Linux installers built locally
- Ready for Windows and macOS builds via GitHub Actions" || true

echo "正在推送到 GitHub..."
git push origin main

echo ""
echo "========================================="
echo "✅ 推送完成！"
echo "========================================="
echo ""
echo "🔍 查看 GitHub Actions 构建状态:"
echo "   https://github.com/zixiu905-prog/ai-platform/actions"
echo ""
echo "📦 下载构建产物:"
echo "   https://github.com/zixiu905-prog/ai-platform/releases"
