#!/bin/bash

set -e

echo "开始构建Windows NSIS安装包..."

cd "/home/ai design/desk"

# 清理旧的dist-electron
rm -rf dist-electron/*
mkdir -p dist-electron

# 步骤1: 安装依赖
echo "步骤1: 安装依赖..."
docker run --rm \
    -v "/home/ai design/desk:/project" \
    -v /root/.cache/npm:/root/.cache/npm \
    -w /project \
    electronuserland/builder:wine \
    npm ci --ignore-scripts

echo "✅ 依赖安装完成"
echo ""

# 步骤2: 构建Windows安装包
echo "步骤2: 构建Windows NSIS安装包..."
docker run --rm \
    -v "/home/ai design/desk:/project" \
    -v "/home/ai design/desk/dist-electron:/project/dist-electron" \
    -v /root/.cache/electron:/root/.cache/electron \
    -v /root/.cache/electron-builder-tools:/root/.cache/electron-builder-tools \
    -w /project \
    -e ELECTRON_CACHE=/root/.cache/electron \
    -e ELECTRON_BUILDER_CACHE=/root/.cache/electron-builder-tools \
    electronuserland/builder:wine \
    npx electron-builder --win nsis --config electron-builder-no-sign.json --publish never

echo ""
echo "========================================="
echo "✅ 构建完成！"
echo "========================================="
echo ""
ls -lh dist-electron/
