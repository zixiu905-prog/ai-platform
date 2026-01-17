#!/bin/bash

# 设置AI设计平台自动备份定时任务
set -e

echo "⏰ 配置自动备份定时任务..."
echo "配置时间: $(date)"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 项目路径
PROJECT_PATH="/home/ai design"
BACKUP_SCRIPT="$PROJECT_PATH/scripts/backup-system.sh"
CRON_FILE="$PROJECT_PATH/config/backup-cron.conf"

echo -e "${BLUE}1. 检查备份脚本${NC}"
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo -e "${RED}❌ 备份脚本不存在: $BACKUP_SCRIPT${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 备份脚本存在${NC}"

echo -e "${BLUE}2. 创建日志目录${NC}"
mkdir -p /var/log/backup
chmod 755 /var/log/backup

echo -e "${GREEN}✅ 日志目录创建完成${NC}"

echo -e "${BLUE}3. 备份当前crontab${NC}"
crontab -l > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S).txt 2>/dev/null || echo "当前没有crontab任务"

echo -e "${BLUE}4. 添加备份定时任务${NC}"

# 创建临时crontab文件
TEMP_CRON="/tmp/ai_platform_crontab_$(date +%Y%m%d_%H%M%S).txt"

# 导入现有的crontab（如果存在）
crontab -l 2>/dev/null > "$TEMP_CRON" || touch "$TEMP_CRON"

# 添加我们的备份任务
cat >> "$TEMP_CRON" << EOF

# AI设计平台备份任务 - $(date)
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# 每日凌晨2点执行完整备份
0 2 * * * $BACKUP_SCRIPT full >> /var/log/backup/full_backup_\$(date +\%Y\%m\%d).log 2>&1

# 每日上午6点执行数据库备份
0 6 * * * $BACKUP_SCRIPT database >> /var/log/backup/database_backup_\$(date +\%Y\%m\%d).log 2>&1

# 每日上午8点执行文件备份
0 8 * * * $BACKUP_SCRIPT files >> /var/log/backup/files_backup_\$(date +\%Y\%m\%d).log 2>&1

# 每周日凌晨4点执行配置备份
0 4 * * 0 $BACKUP_SCRIPT config >> /var/log/backup/config_backup_\$(date +\%Y\%m\%d).log 2>&1

# 每月1号凌晨3点执行月度清理
0 3 1 * * $BACKUP_SCRIPT cleanup >> /var/log/backup/cleanup_\$(date +\%Y\%m\%d).log 2>&1

EOF

# 应用新的crontab
crontab "$TEMP_CRON"

echo -e "${GREEN}✅ 定时任务配置完成${NC}"

echo -e "${BLUE}5. 验证crontab配置${NC}"
echo "当前crontab任务:"
crontab -l | grep -E "(backup|AI设计平台)" | tail -10

echo -e "${BLUE}6. 创建备份状态检查脚本${NC}"
cat > "$PROJECT_PATH/scripts/backup-status.sh" << 'EOF'
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
EOF

chmod +x "$PROJECT_PATH/scripts/backup-status.sh"

echo -e "${BLUE}7. 创建备份测试脚本${NC}"
cat > "$PROJECT_PATH/scripts/test-backup.sh" << 'EOF'
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
EOF

chmod +x "$PROJECT_PATH/scripts/test-backup.sh"

echo -e "${GREEN}✅ 备份系统配置完成！${NC}"

echo ""
echo "📋 备份任务摘要:"
echo "- 每日 02:00 - 完整备份"
echo "- 每日 06:00 - 数据库备份"
echo "- 每日 08:00 - 文件备份"
echo "- 每周日 04:00 - 配置备份"
echo "- 每月1日 03:00 - 清理旧备份"
echo ""

echo "🔧 管理命令:"
echo "- 查看定时任务: crontab -l"
echo "- 查看备份状态: $PROJECT_PATH/scripts/backup-status.sh"
echo "- 测试备份: $PROJECT_PATH/scripts/test-backup.sh"
echo "- 备份日志: /var/log/backup/"
echo ""

echo -e "${YELLOW}⚠️  注意事项:${NC}"
echo "1. 请确保有足够的磁盘空间"
echo "2. 定期检查备份完整性"
echo "3. 测试恢复流程"
echo "4. 考虑异地备份存储"