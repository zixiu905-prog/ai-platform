#!/bin/bash

# Web Installer 配置验证脚本

echo "========================================"
echo "  Web Installer 配置验证"
echo "========================================"
echo ""

# 检查配置文件
echo "[1/6] 检查配置文件..."

files=(
    "/home/ai design/desk/electron-builder-web.json"
    "/home/ai design/desk/build-resources/web-installer.nsh"
    "/home/ai design/desk/build-resources/advanced-web-installer.nsh"
    "/home/ai design/scripts/build-web-installer.sh"
    "/home/ai design/scripts/deploy-web-installer.sh"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $(basename $file)"
    else
        echo "  ✗ $(basename $file) - 文件不存在"
    fi
done

# 检查文档
echo ""
echo "[2/6] 检查文档..."

docs=(
    "/home/ai design/docs/WEB_INSTALLER_GUIDE.md"
    "/home/ai design/docs/CLOUD_DEPLOYMENT_CHECKLIST.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo "  ✓ $(basename $doc)"
    else
        echo "  ✗ $(basename $doc) - 文件不存在"
    fi
done

# 检查 package.json 脚本
echo ""
echo "[3/6] 检查 package.json 脚本..."

package_json="/home/ai design/desk/package.json"

scripts=("build:web" "build:web-full" "build:complete")

for script in "${scripts[@]}"; do
    if grep -q "\"$script\":" "$package_json"; then
        echo "  ✓ $script"
    else
        echo "  ✗ $script - 脚本未定义"
    fi
done

# 检查目录结构
echo ""
echo "[4/6] 检查目录结构..."

dirs=("/home/ai design/desk" "/home/ai design/desk/build-resources")

for dir in "${dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "  ✓ $dir"
    else
        echo "  ✗ $dir - 目录不存在"
    fi
done

# 检查环境
echo ""
echo "[5/6] 检查构建环境..."

if command -v node &> /dev/null; then
    echo "  ✓ Node.js"
else
    echo "  ✗ Node.js - 未安装"
fi

if command -v npm &> /dev/null; then
    echo "  ✓ npm"
else
    echo "  ✗ npm - 未安装"
fi

# 检查下载 URL 配置
echo ""
echo "[6/6] 检查下载 URL 配置..."

web_nsh="/home/ai design/desk/build-resources/web-installer.nsh"
advanced_nsh="/home/ai design/desk/build-resources/advanced-web-installer.nsh"

if grep -q "your-domain.com" "$web_nsh"; then
    echo "  ⚠ 基础脚本 URL - 需要配置（当前为占位符）"
else
    echo "  ✓ 基础脚本 URL - 已配置"
fi

if grep -q "your-domain.com" "$advanced_nsh"; then
    echo "  ⚠ 高级脚本 URL - 需要配置（当前为占位符）"
else
    echo "  ✓ 高级脚本 URL - 已配置"
fi

# 结果
echo ""
echo "========================================"
echo "  检查完成"
echo "========================================"
echo ""
echo "配置文件已就绪！"
echo ""
echo "下一步操作："
echo "  1. 构建测试版本："
echo "     cd /home/ai\\ design/desk"
echo "     npm run build:web-full"
echo ""
echo "  2. 修改下载 URL："
echo "     编辑 /home/ai\\ design/desk/build-resources/web-installer.nsh"
echo "     将 'your-domain.com' 替换为实际域名"
echo ""
echo "  3. 查看完整指南："
echo "     cat /home/ai\\ design/docs/WEB_INSTALLER_GUIDE.md"
echo ""
