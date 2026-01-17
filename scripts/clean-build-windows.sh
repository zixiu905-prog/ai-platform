#!/bin/bash

set -e

echo "=== 强制清理并重新构建 ==="

cd "/home/ai design/desk"

# 清理所有构建输出
rm -rf dist
rm -rf out
rm -rf .cache

# 重新编译
echo "正在编译..."
npm run build:main

# 清理electron-builder缓存
rm -rf /root/.cache/electron-builder-tools/.cache

# 构建
echo "正在构建Windows安装包..."
docker run --rm \
  -v /home/ai\ design/desk:/project \
  -v /home/ai\ design/desk/dist:/project/dist \
  -v /root/.cache/electron:/root/.cache/electron \
  -v /root/.cache/electron-builder-tools:/root/.cache/electron-builder-tools \
  -w /project \
  -e ELECTRON_CACHE=/root/.cache/electron \
  -e ELECTRON_BUILDER_CACHE=/root/.cache/electron-builder-tools \
  electronuserland/builder:wine \
  npx electron-builder --win nsis --config electron-builder-no-sign.json --publish never

echo ""
echo "=== 构建完成 ==="
ls -lh dist/*.exe
