#!/bin/bash

# 本地构建Windows安装程序（需要Wine）
# 注意：此脚本需要在安装了Wine的Linux环境或Windows环境中运行

set -e

echo "========================================="
echo "AI Platform - Windows 本地构建脚本"
echo "========================================="
echo ""

# 检查环境
if [ "$(uname)" == "Darwin" ]; then
    echo "❌ 错误：macOS环境无法构建Windows安装程序"
    echo "请使用GitHub Actions或Windows环境"
    exit 1
elif [ "$(uname)" != "Linux" ]; then
    echo "✓ 检测到非Linux环境，可能可以直接构建"
fi

# 进入desk目录
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

echo "📍 项目路径: $PROJECT_ROOT"
echo ""

# 检查依赖
echo "🔍 检查依赖..."
if ! command -v npm &> /dev/null; then
    echo "❌ 错误：npm未安装"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ 错误：Node.js未安装"
    exit 1
fi

echo "✓ Node.js版本: $(node --version)"
echo "✓ npm版本: $(npm --version)"
echo ""

# 安装依赖
echo "📦 安装依赖..."
npm install
echo ""

# 构建前端
echo "🔨 构建前端..."
cd "$PROJECT_ROOT/../frontend"
npm ci
npm run build
echo ""

# 构建Electron主进程
echo "🔨 构建Electron主进程..."
cd "$PROJECT_ROOT"
npm run build:main
echo ""

# 检查是否有wine（用于在Linux上构建Windows应用）
if command -v wine &> /dev/null; then
    echo "✓ 检测到Wine，可以构建Windows应用"
    echo ""
    echo "🔨 开始构建Windows安装程序..."
    npm run build:nsis
else
    echo "⚠️  未检测到Wine"
    echo ""
    echo "💡 在Linux环境构建Windows应用需要安装Wine："
    echo "   sudo apt-get install wine wine64"
    echo ""
    echo "或者使用GitHub Actions进行跨平台构建："
    echo "   https://github.com/zixiu905-prog/ai-platform/actions"
    echo ""
    echo "请查看 GITHUB_DEPLOYMENT_GUIDE.md 了解如何推送代码到GitHub"
    exit 0
fi

echo ""
echo "========================================="
echo "✅ 构建完成！"
echo "========================================="
echo ""
echo "📦 构建产物位置："
echo "   $PROJECT_ROOT/dist-electron/"
echo ""
ls -lh "$PROJECT_ROOT/dist-electron/"*.exe 2>/dev/null || echo "   未找到.exe文件"
echo ""
