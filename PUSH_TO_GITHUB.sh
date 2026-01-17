#!/bin/bash

# 推送代码到GitHub并触发自动构建

set -e

echo "========================================="
echo "AI Platform - GitHub 推送脚本"
echo "========================================="
echo ""

# 检查是否在正确的目录
if [ ! -d ".git" ]; then
    echo "❌ 错误：未在Git仓库根目录"
    echo "请运行: cd \"/home/ai design\""
    exit 1
fi

# 检查是否有待提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 检测到未提交的更改，正在提交..."
    git add .
    git commit -m "Update: Prepare for GitHub Actions build
- Complete project files
- GitHub Actions workflows configured
- Desktop application ready for cross-platform build" || echo "ℹ️  没有新的更改需要提交"
fi

echo ""
echo "========================================="
echo "📤 推送代码到 GitHub"
echo "========================================="
echo ""
echo "目标仓库：https://github.com/zixiu905-prog/ai-platform.git"
echo ""

# 检查remote是否配置
if ! git remote get-url origin &> /dev/null; then
    echo "🔧 配置 remote..."
    git remote add origin https://github.com/zixiu905-prog/ai-platform.git
fi

echo "⚠️  需要GitHub认证才能推送"
echo ""
echo "请选择认证方式："
echo ""
echo "1. 使用 Personal Access Token (推荐)"
echo "   访问: https://github.com/settings/tokens"
echo "   创建token并执行："
echo "   git remote set-url origin https://<TOKEN>@github.com/zixiu905-prog/ai-platform.git"
echo ""
echo "2. 使用 GitHub CLI"
echo "   安装gh CLI并执行："
echo "   gh auth login"
echo ""
echo "3. 手动在Web界面操作"
echo "   访问: https://github.com/zixiu905-prog/ai-platform"
echo ""
echo "请查看 GITHUB_DEPLOYMENT_GUIDE.md 获取详细说明"
echo ""
echo "========================================="
echo "📋 推送后的自动构建流程"
echo "========================================="
echo ""
echo "✅ 推送成功后，GitHub Actions将自动："
echo "   1. 测试代码质量"
echo "   2. 构建Windows安装程序"
echo "   3. 构建macOS安装程序"
echo "   4. 构建Linux安装包（可选）"
echo "   5. 创建GitHub Release"
echo "   6. 上传构建产物"
echo ""
echo "📊 查看构建状态："
echo "   https://github.com/zixiu905-prog/ai-platform/actions"
echo ""
echo "📦 下载构建产物："
echo "   https://github.com/zixiu905-prog/ai-platform/releases"
echo ""
