#!/bin/bash

# 备份测试脚本
echo "🧪 执行备份测试..."

PROJECT_PATH="/home/ai design"
BACKUP_SCRIPT="$PROJECT_PATH/scripts/backup-system.sh"

# 测试数据库备份
echo "1. 测试数据库备份..."
$BACKUP_SCRIPT database

# 测试文件备份
echo "2. 测试文件备份..."
$BACKUP_SCRIPT files

# 测试配置备份
echo "3. 测试配置备份..."
$BACKUP_SCRIPT config

echo "✅ 备份测试完成"
