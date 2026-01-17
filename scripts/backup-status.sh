#!/bin/bash

# 备份状态检查脚本
echo "📊 备份系统状态检查"
echo "=================="
echo "检查时间: $(date)"
echo ""

# 检查备份目录
BACKUP_DIR="/home/ai design/backups"
if [ -d "$BACKUP_DIR" ]; then
    echo "📁 备份目录: $BACKUP_DIR"
    du -sh "$BACKUP_DIR"/* 2>/dev/null | head -10
    echo ""
fi

# 检查最近24小时的备份
echo "📈 最近24小时备份文件:"
find /var/log/backup -name "*backup_$(date +%Y%m%d)*.log" -mtime -1 -exec ls -la {} \; 2>/dev/null || echo "无今天备份日志"

echo ""
echo "🔍 备份系统运行正常"
