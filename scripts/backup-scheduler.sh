#!/bin/bash

# AI智能体平台备份调度脚本
# 配置自动化备份策略和调度

set -euo pipefail

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-database.sh"
RESTORE_SCRIPT="$SCRIPT_DIR/restore-database.sh"
CONFIG_FILE="${SCRIPT_DIR}/../.env.production"
CRON_FILE="/etc/cron.d/ai-platform-backup"
LOG_DIR="${SCRIPT_DIR}/../logs/backup"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# 检查脚本权限
check_permissions() {
    log "检查脚本权限..."
    
    # 确保备份脚本可执行
    if [[ ! -x "$BACKUP_SCRIPT" ]]; then
        chmod +x "$BACKUP_SCRIPT"
        info "已设置备份脚本执行权限"
    fi
    
    if [[ ! -x "$RESTORE_SCRIPT" ]]; then
        chmod +x "$RESTORE_SCRIPT"
        info "已设置恢复脚本执行权限"
    fi
    
    # 检查是否可以写入cron目录
    if [[ ! -w "$(dirname "$CRON_FILE")" ]]; then
        warn "无法写入cron目录，请使用sudo运行此脚本"
        return 1
    fi
    
    log "权限检查完成"
}

# 创建备份调度配置
create_cron_jobs() {
    log "创建备份调度配置..."
    
    # 创建日志目录
    mkdir -p "$LOG_DIR"
    
    # 生成cron配置
    cat > "$CRON_FILE" << 'EOF'
# AI智能体平台自动备份调度配置
# 请勿手动编辑此文件，使用 backup-scheduler.sh 脚本管理

# 环境变量
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
MAILTO=admin@ai.yourdomain.com

# 每日凌晨2点执行全量备份
0 2 * * * root /home/ai design/scripts/backup-database.sh full >> /home/ai design/logs/backup/cron_full.log 2>&1

# 每小时执行增量备份（保留12小时内的增量）
0 * * * * root /home/ai design/scripts/backup-database.sh incremental >> /home/ai design/logs/backup/cron_incremental.log 2>&1

# 每6小时执行差异备份（可选，注释掉以节省空间）
# 0 */6 * * * root /home/ai design/scripts/backup-database.sh differential >> /home/ai design/logs/backup/cron_differential.log 2>&1

# 每周日凌晨3点执行备份验证和清理
0 3 * * 0 root /home/ai design/scripts/backup-maintenance.sh >> /home/ai design/logs/backup/cron_maintenance.log 2>&1

# 每天凌晨1点执行备份状态检查
0 1 * * * root /home/ai design/scripts/backup-check.sh >> /home/ai design/logs/backup/cron_check.log 2>&1

# 每月1号凌晨4点执行异地存储同步
0 4 1 * * root /home/ai design/scripts/sync-remote-storage.sh >> /home/ai design/logs/backup/cron_sync.log 2>&1
EOF

    # 设置正确的权限
    chmod 644 "$CRON_FILE"
    
    log "cron配置已创建: $CRON_FILE"
}

# 安装cron任务
install_cron_jobs() {
    log "安装cron任务..."
    
    # 检查cron服务状态
    if ! systemctl is-active --quiet cron; then
        warn "cron服务未运行，正在启动..."
        systemctl start cron
    fi
    
    # 重新加载cron配置
    if systemctl reload cron; then
        log "cron任务已重新加载"
    else
        error "cron任务重载失败"
        return 1
    fi
    
    log "cron任务安装完成"
}

# 创建备份维护脚本
create_maintenance_script() {
    local maintenance_script="$SCRIPT_DIR/backup-maintenance.sh"
    
    cat > "$maintenance_script" << 'EOF'
#!/bin/bash

# 备份维护脚本
# 验证备份完整性并清理过期文件

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/../database/backup"
LOG_DIR="${SCRIPT_DIR}/../logs/backup"
RETENTION_DAYS_FULL=30
RETENTION_DAYS_INCREMENTAL=7
RETENTION_DAYS_DIFFERENTIAL=3

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1"
}

# 验证备份文件
verify_backups() {
    log "验证备份文件完整性..."
    
    local full_backups=$(find "$BACKUP_DIR/full" -name "*.sql.gz" -type f)
    local incremental_backups=$(find "$BACKUP_DIR/incremental" -name "*.tar.gz" -type f)
    local differential_backups=$(find "$BACKUP_DIR/differential" -name "*.sql" -type f)
    
    # 验证全量备份
    for backup in $full_backups; do
        if [[ -s "$backup" ]]; then
            log "全量备份验证通过: $(basename "$backup")"
        else
            error "全量备份损坏: $(basename "$backup")"
        fi
    done
    
    # 验证增量备份
    for backup in $incremental_backups; do
        if [[ -s "$backup" ]]; then
            log "增量备份验证通过: $(basename "$backup")"
        else
            error "增量备份损坏: $(basename "$backup")"
        fi
    done
    
    # 验证差异备份
    for backup in $differential_backups; do
        if [[ -s "$backup" ]]; then
            log "差异备份验证通过: $(basename "$backup")"
        else
            error "差异备份损坏: $(basename "$backup")"
        fi
    done
}

# 清理过期备份
cleanup_old_backups() {
    log "清理过期备份..."
    
    # 清理全量备份（保留30天）
    local deleted_full=0
    while IFS= read -r -d '' backup_file; do
        rm -f "$backup_file"
        ((deleted_full++))
        log "删除过期全量备份: $(basename "$backup_file")"
    done < <(find "$BACKUP_DIR/full" -name "*.sql.gz" -type f -mtime "+$RETENTION_DAYS_FULL" -print0)
    
    # 清理增量备份（保留7天）
    local deleted_incremental=0
    while IFS= read -r -d '' backup_file; do
        rm -f "$backup_file"
        ((deleted_incremental++))
        log "删除过期增量备份: $(basename "$backup_file")"
    done < <(find "$BACKUP_DIR/incremental" -name "*.tar.gz" -type f -mtime "+$RETENTION_DAYS_INCREMENTAL" -print0)
    
    # 清理差异备份（保留3天）
    local deleted_differential=0
    while IFS= read -r -d '' backup_file; do
        rm -f "$backup_file"
        ((deleted_differential++))
        log "删除过期差异备份: $(basename "$backup_file")"
    done < <(find "$BACKUP_DIR/differential" -name "*.sql" -type f -mtime "+$RETENTION_DAYS_DIFFERENTIAL" -print0)
    
    log "清理完成: 全量($deleted_full) 增量($deleted_incremental) 差异($deleted_differential)"
}

# 生成备份统计报告
generate_backup_stats() {
    log "生成备份统计报告..."
    
    local report_file="$LOG_DIR/backup_stats_$(date +%Y%m%d).txt"
    
    {
        echo "=== 备份统计报告 - $(date) ==="
        echo ""
        
        echo "全量备份:"
        echo "  数量: $(find "$BACKUP_DIR/full" -name "*.sql.gz" -type f | wc -l)"
        echo "  总大小: $(du -sh "$BACKUP_DIR/full" 2>/dev/null | cut -f1 || echo "0")"
        echo "  最新: $(find "$BACKUP_DIR/full" -name "*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2- | xargs basename)"
        echo ""
        
        echo "增量备份:"
        echo "  数量: $(find "$BACKUP_DIR/incremental" -name "*.tar.gz" -type f | wc -l)"
        echo "  总大小: $(du -sh "$BACKUP_DIR/incremental" 2>/dev/null | cut -f1 || echo "0")"
        echo "  最新: $(find "$BACKUP_DIR/incremental" -name "*.tar.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2- | xargs basename)"
        echo ""
        
        echo "差异备份:"
        echo "  数量: $(find "$BACKUP_DIR/differential" -name "*.sql" -type f | wc -l)"
        echo "  总大小: $(du -sh "$BACKUP_DIR/differential" 2>/dev/null | cut -f1 || echo "0")"
        echo "  最新: $(find "$BACKUP_DIR/differential" -name "*.sql" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2- | xargs basename)"
        echo ""
        
        echo "磁盘使用情况:"
        echo "  备份目录总大小: $(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "0")"
        echo "  可用空间: $(df -h "$(dirname "$BACKUP_DIR")" | awk 'NR==2{print $4}')"
        
    } > "$report_file"
    
    log "统计报告已生成: $report_file"
}

# 主函数
main() {
    log "开始备份维护任务..."
    
    verify_backups
    cleanup_old_backups
    generate_backup_stats
    
    log "备份维护完成"
}

main "$@"
EOF

    chmod +x "$maintenance_script"
    log "备份维护脚本已创建: $maintenance_script"
}

# 创建备份检查脚本
create_check_script() {
    local check_script="$SCRIPT_DIR/backup-check.sh"
    
    cat > "$check_script" << 'EOF'
#!/bin/bash

# 备份状态检查脚本
# 检查备份任务的执行状态和结果

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/../database/backup"
LOG_DIR="${SCRIPT_DIR}/../logs/backup"
ALERT_EMAIL="admin@ai.yourdomain.com"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1"
}

# 检查备份任务执行状态
check_backup_status() {
    log "检查备份任务执行状态..."
    
    local current_date=$(date +%Y%m%d)
    local yesterday=$(date -d "yesterday" +%Y%m%d)
    
    # 检查最近24小时内的全量备份
    local recent_full_backup=$(find "$BACKUP_DIR/full" -name "*${current_date}*_*_*.sql.gz" -o -name "*${yesterday}*_*_*.sql.gz" | head -1)
    
    if [[ -n "$recent_full_backup" ]]; then
        log "✓ 最近全量备份: $(basename "$recent_full_backup")"
    else
        error "✗ 缺少最近24小时内的全量备份"
        return 1
    fi
    
    # 检查最近1小时内的增量备份
    local recent_incremental_backup=$(find "$BACKUP_DIR/incremental" -name "*$(date +%Y%m%d)*_*_*.tar.gz" | head -1)
    
    if [[ -n "$recent_incremental_backup" ]]; then
        log "✓ 最近增量备份: $(basename "$recent_incremental_backup")"
    else
        warn "⚠ 缺少最近1小时内的增量备份"
    fi
    
    return 0
}

# 检查磁盘空间
check_disk_space() {
    log "检查磁盘空间..."
    
    local backup_dir_usage=$(df "$BACKUP_DIR" | awk 'NR==2{print $5}' | sed 's/%//')
    local available_space=$(df -h "$BACKUP_DIR" | awk 'NR==2{print $4}')
    
    log "备份目录使用率: ${backup_dir_usage}%"
    log "可用空间: $available_space"
    
    if [[ "$backup_dir_usage" -gt 85 ]]; then
        error "✗ 备份目录使用率过高: ${backup_dir_usage}%"
        return 1
    else
        log "✓ 磁盘空间正常"
        return 0
    fi
}

# 检查备份文件完整性
check_backup_integrity() {
    log "检查备份文件完整性..."
    
    local corrupted_files=0
    local total_files=0
    
    # 检查全量备份
    while IFS= read -r -d '' backup_file; do
        ((total_files++))
        if [[ ! -s "$backup_file" ]]; then
            error "✗ 损坏的全量备份: $(basename "$backup_file")"
            ((corrupted_files++))
        fi
    done < <(find "$BACKUP_DIR/full" -name "*.sql.gz" -type f -print0)
    
    # 检查增量备份
    while IFS= read -r -d '' backup_file; do
        ((total_files++))
        if [[ ! -s "$backup_file" ]]; then
            error "✗ 损坏的增量备份: $(basename "$backup_file")"
            ((corrupted_files++))
        fi
    done < <(find "$BACKUP_DIR/incremental" -name "*.tar.gz" -type f -print0)
    
    if [[ "$corrupted_files" -eq 0 ]]; then
        log "✓ 所有备份文件完整性正常 (共 $total_files 个文件)"
        return 0
    else
        error "✗ 发现 $corrupted_files 个损坏的备份文件"
        return 1
    fi
}

# 发送告警邮件
send_alert() {
    local subject="$1"
    local message="$2"
    
    # 这里可以配置邮件发送逻辑
    # echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
    log "告警邮件已发送: $subject"
}

# 主函数
main() {
    log "开始备份状态检查..."
    
    local status_ok=true
    
    if ! check_backup_status; then
        status_ok=false
    fi
    
    if ! check_disk_space; then
        status_ok=false
    fi
    
    if ! check_backup_integrity; then
        status_ok=false
    fi
    
    if [[ "$status_ok" == true ]]; then
        log "✓ 所有备份检查通过"
    else
        error "✗ 备份检查发现问题，请查看详细日志"
        send_alert "AI平台备份状态告警" "备份状态检查发现问题，请及时处理。"
        exit 1
    fi
}

main "$@"
EOF

    chmod +x "$check_script"
    log "备份检查脚本已创建: $check_script"
}

# 创建异地存储同步脚本
create_sync_script() {
    local sync_script="$SCRIPT_DIR/sync-remote-storage.sh"
    
    cat > "$sync_script" << 'EOF'
#!/bin/bash

# 异地存储同步脚本
# 将本地备份同步到远程云存储

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/../database/backup"
LOG_DIR="${SCRIPT_DIR}/../logs/backup"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1"
}

# 同步到AWS S3
sync_to_s3() {
    local s3_bucket="${AWS_S3_BUCKET:-}"
    
    if [[ -n "$s3_bucket" && -n "${AWS_ACCESS_KEY_ID:-}" && -n "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
        log "同步备份到AWS S3..."
        
        # 同步全量备份
        aws s3 sync "$BACKUP_DIR/full/" "s3://$s3_bucket/database-backups/full/" --delete --storage-class STANDARD_IA
        log "全量备份已同步到S3"
        
        # 同步增量备份
        aws s3 sync "$BACKUP_DIR/incremental/" "s3://$s3_bucket/database-backups/incremental/" --delete --storage-class STANDARD_IA
        log "增量备份已同步到S3"
        
        return 0
    else
        log "AWS S3配置不完整，跳过S3同步"
        return 1
    fi
}

# 同步到阿里云OSS
sync_to_oss() {
    local oss_bucket="${ALIYUN_OSS_BUCKET:-}"
    
    if [[ -n "$oss_bucket" && -n "${ALIYUN_ACCESS_KEY_ID:-}" && -n "${ALIYUN_ACCESS_KEY_SECRET:-}" ]]; then
        log "同步备份到阿里云OSS..."
        
        ossutil64 sync "$BACKUP_DIR/full/" "oss://$oss_bucket/database-backups/full/" --delete
        log "全量备份已同步到OSS"
        
        ossutil64 sync "$BACKUP_DIR/incremental/" "oss://$oss_bucket/database-backups/incremental/" --delete
        log "增量备份已同步到OSS"
        
        return 0
    else
        log "阿里云OSS配置不完整，跳过OSS同步"
        return 1
    fi
}

# 主函数
main() {
    log "开始异地存储同步..."
    
    local sync_success=false
    
    if sync_to_s3; then
        sync_success=true
    fi
    
    if sync_to_oss; then
        sync_success=true
    fi
    
    if [[ "$sync_success" == true ]]; then
        log "异地存储同步完成"
    else
        error "异地存储同步失败"
        exit 1
    fi
}

main "$@"
EOF

    chmod +x "$sync_script"
    log "异地存储同步脚本已创建: $sync_script"
}

# 显示当前调度状态
show_cron_status() {
    log "当前备份调度状态:"
    echo ""
    
    if [[ -f "$CRON_FILE" ]]; then
        echo "备份调度配置文件: $CRON_FILE"
        echo ""
        cat "$CRON_FILE" | grep -v '^#' | grep -v '^$'
        echo ""
        
        echo "下次执行时间:"
        echo "  全量备份: $(date -d 'today 02:00' '+%Y-%m-%d %H:%M:%S')"
        echo "  增量备份: $(date -d 'next hour' '+%Y-%m-%d %H:%M:%S')"
        echo "  备份检查: $(date -d 'tomorrow 01:00' '+%Y-%m-%d %H:%M:%S')"
        echo "  备份维护: $(date -d 'next sunday 03:00' '+%Y-%m-%d %H:%M:%S')"
    else
        echo "未找到备份调度配置文件"
    fi
}

# 卸载cron任务
uninstall_cron_jobs() {
    log "卸载备份调度任务..."
    
    if [[ -f "$CRON_FILE" ]]; then
        rm -f "$CRON_FILE"
        systemctl reload cron
        log "备份调度任务已卸载"
    else
        log "未找到备份调度配置文件"
    fi
}

# 显示帮助信息
show_help() {
    cat << EOF
AI智能体平台备份调度脚本

使用方法:
    $0 <command>

命令:
    install     安装备份调度任务
    uninstall   卸载备份调度任务
    status      显示当前调度状态
    enable      启用备份调度
    disable     禁用备份调度

示例:
    $0 install     # 安装所有备份调度任务
    $0 status      # 查看当前调度状态
    $0 uninstall   # 移除所有备份调度任务

EOF
}

# 主函数
main() {
    case "${1:-}" in
        "install")
            log "安装备份调度系统..."
            check_permissions
            create_cron_jobs
            create_maintenance_script
            create_check_script
            create_sync_script
            install_cron_jobs
            show_cron_status
            log "备份调度系统安装完成"
            ;;
        "uninstall")
            uninstall_cron_jobs
            log "备份调度系统已卸载"
            ;;
        "status")
            show_cron_status
            ;;
        "enable")
            if [[ -f "$CRON_FILE" ]]; then
                sed -i 's/^#\(.*\)/\1/' "$CRON_FILE"
                systemctl reload cron
                log "备份调度已启用"
            else
                error "备份调度配置文件不存在"
                exit 1
            fi
            ;;
        "disable")
            if [[ -f "$CRON_FILE" ]]; then
                sed -i 's/^\([^#].*\)/#\1/' "$CRON_FILE"
                systemctl reload cron
                log "备份调度已禁用"
            else
                error "备份调度配置文件不存在"
                exit 1
            fi
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

main "$@"