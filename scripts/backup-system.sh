#!/bin/bash

# AI设计平台备份恢复系统
# 提供完整的数据库备份、文件备份和异地存储功能

set -e

# 配置变量
BACKUP_BASE_DIR="/backup"
LOG_DIR="/var/log/backup"
CONFIG_FILE="/home/ai design/.env.production"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_TYPE=$1

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_message() {
    local level=$1
    local message=$2
    local color=$3
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" >> $LOG_DIR/backup_$DATE.log
}

# 检查依赖
check_dependencies() {
    log_message "INFO" "检查备份系统依赖..." $BLUE
    
    local missing_deps=()
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        missing_deps+=("docker-compose")
    fi
    
    if ! command -v mysqldump &> /dev/null && ! command -v pg_dump &> /dev/null; then
        missing_deps+=("database dump tools")
    fi
    
    if ! command -v rsync &> /dev/null; then
        missing_deps+=("rsync")
    fi
    
    if ! command -v aws &> /dev/null && ! command -v rclone &> /dev/null; then
        log_message "WARNING" "云存储工具未安装 (aws cli 或 rclone)" $YELLOW
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_message "ERROR" "缺少依赖: ${missing_deps[*]}" $RED
        exit 1
    fi
    
    log_message "INFO" "依赖检查完成" $GREEN
}

# 创建备份目录
create_backup_dirs() {
    log_message "INFO" "创建备份目录..." $BLUE
    
    mkdir -p $BACKUP_BASE_DIR/{database,files,config,logs,temp}
    mkdir -p $LOG_DIR
    chmod 700 $BACKUP_BASE_DIR
    
    log_message "INFO" "备份目录创建完成" $GREEN
}

# 加载配置
load_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        log_message "ERROR" "配置文件不存在: $CONFIG_FILE" $RED
        exit 1
    fi
    
    # 导入环境变量
    set -a
    source "$CONFIG_FILE"
    set +a
    
    # 设置默认值
    POSTGRES_HOST=${POSTGRES_HOST:-postgres}
    POSTGRES_PORT=${POSTGRES_PORT:-5432}
    POSTGRES_DB=${POSTGRES_DB:-aidesign}
    POSTGRES_USER=${POSTGRES_USER:-postgres}
    
    REDIS_HOST=${REDIS_HOST:-redis}
    REDIS_PORT=${REDIS_PORT:-6379}
    
    log_message "INFO" "配置加载完成" $GREEN
}

# 数据库备份
backup_database() {
    log_message "INFO" "开始数据库备份..." $BLUE
    
    local backup_file="$BACKUP_BASE_DIR/database/postgres_backup_$DATE.sql"
    local compressed_file="$backup_file.gz"
    
    # 检查数据库连接
    if ! docker exec ai-platform-postgres pg_isready -U $POSTGRES_USER &>/dev/null; then
        log_message "ERROR" "数据库连接失败" $RED
        return 1
    fi
    
    log_message "INFO" "开始导出数据库..." $BLUE
    
    # 执行数据库备份
    if docker exec ai-platform-postgres pg_dump -U $POSTGRES_USER -d $POSTGRES_DB \
        --no-password --verbose --clean --if-exists --format=custom \
        --file="/tmp/postgres_backup_$DATE.sql" 2>> $LOG_DIR/backup_$DATE.log; then
        
        # 复制备份文件到宿主机
        docker cp ai-platform-postgres:/tmp/postgres_backup_$DATE.sql "$backup_file"
        
        # 清理容器内的临时文件
        docker exec ai-platform-postgres rm -f "/tmp/postgres_backup_$DATE.sql"
        
        # 压缩备份文件
        gzip "$backup_file"
        
        local backup_size=$(du -h "$compressed_file" | cut -f1)
        log_message "INFO" "数据库备份完成: $compressed_file (大小: $backup_size)" $GREEN
        
        # 验证备份文件
        if verify_backup "$compressed_file"; then
            return 0
        else
            return 1
        fi
    else
        log_message "ERROR" "数据库备份失败" $RED
        return 1
    fi
}

# Redis备份
backup_redis() {
    log_message "INFO" "开始Redis备份..." $BLUE
    
    local backup_file="$BACKUP_BASE_DIR/database/redis_backup_$DATE.rdb"
    
    # 执行Redis备份
    if docker exec ai-platform-redis redis-cli BGSAVE &>/dev/null; then
        # 等待备份完成
        while true; do
            local status=$(docker exec ai-platform-redis redis-cli LASTSAVE)
            if [ "$status" != "" ]; then
                break
            fi
            sleep 1
        done
        
        # 复制RDB文件
        if docker cp ai-platform-redis:/data/dump.rdb "$backup_file" 2>> $LOG_DIR/backup_$DATE.log; then
            local backup_size=$(du -h "$backup_file" | cut -f1)
            log_message "INFO" "Redis备份完成: $backup_file (大小: $backup_size)" $GREEN
            return 0
        else
            log_message "ERROR" "Redis备份文件复制失败" $RED
            return 1
        fi
    else
        log_message "ERROR" "Redis备份命令执行失败" $RED
        return 1
    fi
}

# 文件备份
backup_files() {
    log_message "INFO" "开始文件备份..." $BLUE
    
    local upload_dir="/home/ai design/uploads"
    local backup_file="$BACKUP_BASE_DIR/files/uploads_backup_$DATE.tar.gz"
    
    if [ ! -d "$upload_dir" ]; then
        log_message "WARNING" "上传目录不存在: $upload_dir" $YELLOW
        return 0
    fi
    
    # 创建文件备份
    if tar -czf "$backup_file" -C "$(dirname "$upload_dir")" "$(basename "$upload_dir")" 2>> $LOG_DIR/backup_$DATE.log; then
        local backup_size=$(du -h "$backup_file" | cut -f1)
        log_message "INFO" "文件备份完成: $backup_file (大小: $backup_size)" $GREEN
        return 0
    else
        log_message "ERROR" "文件备份失败" $RED
        return 1
    fi
}

# 配置备份
backup_config() {
    log_message "INFO" "开始配置备份..." $BLUE
    
    local backup_file="$BACKUP_BASE_DIR/config/config_backup_$DATE.tar.gz"
    
    # 备份重要配置文件
    if tar -czf "$backup_file" \
        "/home/ai design/.env.production" \
        "/home/ai design/docker-compose.prod.yml" \
        "/home/ai design/backend/package.json" \
        "/home/ai design/frontend/package.json" \
        "/etc/nginx/sites-available/" \
        "/home/ai design/monitoring/" 2>> $LOG_DIR/backup_$DATE.log; then
        
        local backup_size=$(du -h "$backup_file" | cut -f1)
        log_message "INFO" "配置备份完成: $backup_file (大小: $backup_size)" $GREEN
        return 0
    else
        log_message "ERROR" "配置备份失败" $RED
        return 1
    fi
}

# 日志备份
backup_logs() {
    log_message "INFO" "开始日志备份..." $BLUE
    
    local backup_file="$BACKUP_BASE_DIR/logs/logs_backup_$DATE.tar.gz"
    
    if [ ! -d "/home/ai design/logs" ]; then
        log_message "WARNING" "日志目录不存在" $YELLOW
        return 0
    fi
    
    # 备份日志文件
    if tar -czf "$backup_file" -C "/home/ai design" "logs" 2>> $LOG_DIR/backup_$DATE.log; then
        local backup_size=$(du -h "$backup_file" | cut -f1)
        log_message "INFO" "日志备份完成: $backup_file (大小: $backup_size)" $GREEN
        return 0
    else
        log_message "ERROR" "日志备份失败" $RED
        return 1
    fi
}

# 验证备份文件
verify_backup() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        log_message "ERROR" "备份文件不存在: $backup_file" $RED
        return 1
    fi
    
    local file_size=$(stat -c%s "$backup_file")
    if [ "$file_size" -eq 0 ]; then
        log_message "ERROR" "备份文件为空: $backup_file" $RED
        return 1
    fi
    
    # 如果是压缩文件，尝试测试
    if [[ "$backup_file" == *.gz ]]; then
        if ! gzip -t "$backup_file" 2>> $LOG_DIR/backup_$DATE.log; then
            log_message "ERROR" "备份文件损坏: $backup_file" $RED
            return 1
        fi
    fi
    
    log_message "INFO" "备份文件验证通过: $backup_file" $GREEN
    return 0
}

# 云存储上传 (支持 AWS S3 和 rclone)
upload_to_cloud() {
    local local_file=$1
    local remote_path=$2
    
    if command -v aws &> /dev/null && [ -n "$AWS_S3_BUCKET" ]; then
        upload_to_s3 "$local_file" "$remote_path"
    elif command -v rclone &> /dev/null && [ -n "$RCLONE_REMOTE" ]; then
        upload_to_rclone "$local_file" "$remote_path"
    else
        log_message "WARNING" "云存储配置未找到，跳过上传" $YELLOW
        return 1
    fi
}

# AWS S3上传
upload_to_s3() {
    local local_file=$1
    local remote_path=$2
    
    log_message "INFO" "上传到S3: $remote_path" $BLUE
    
    if aws s3 cp "$local_file" "s3://$AWS_S3_BUCKET/$remote_path" --storage-class STANDARD_IA 2>> $LOG_DIR/backup_$DATE.log; then
        log_message "INFO" "S3上传成功: $remote_path" $GREEN
        return 0
    else
        log_message "ERROR" "S3上传失败: $remote_path" $RED
        return 1
    fi
}

# rclone上传
upload_to_rclone() {
    local local_file=$1
    local remote_path=$2
    
    log_message "INFO" "上传到云存储: $remote_path" $BLUE
    
    if rclone copy "$local_file" "$RCLONE_REMOTE:$remote_path" 2>> $LOG_DIR/backup_$DATE.log; then
        log_message "INFO" "云存储上传成功: $remote_path" $GREEN
        return 0
    else
        log_message "ERROR" "云存储上传失败: $remote_path" $RED
        return 1
    fi
}

# 异地备份
remote_backup() {
    log_message "INFO" "开始异地备份..." $BLUE
    
    # 上传数据库备份
    local db_backup=$(find $BACKUP_BASE_DIR/database -name "postgres_backup_$DATE.sql.gz" 2>/dev/null | head -1)
    if [ -n "$db_backup" ]; then
        upload_to_cloud "$db_backup" "database/$(basename "$db_backup")"
    fi
    
    # 上传文件备份
    local file_backup=$(find $BACKUP_BASE_DIR/files -name "uploads_backup_$DATE.tar.gz" 2>/dev/null | head -1)
    if [ -n "$file_backup" ]; then
        upload_to_cloud "$file_backup" "files/$(basename "$file_backup")"
    fi
    
    # 上传配置备份
    local config_backup=$(find $BACKUP_BASE_DIR/config -name "config_backup_$DATE.tar.gz" 2>/dev/null | head -1)
    if [ -n "$config_backup" ]; then
        upload_to_cloud "$config_backup" "config/$(basename "$config_backup")"
    fi
}

# 清理旧备份
cleanup_old_backups() {
    log_message "INFO" "清理旧备份文件..." $BLUE
    
    # 清理7天前的数据库备份
    find $BACKUP_BASE_DIR/database -name "*.sql.gz" -mtime +7 -delete 2>> $LOG_DIR/backup_$DATE.log
    
    # 清理30天前的文件备份
    find $BACKUP_BASE_DIR/files -name "*.tar.gz" -mtime +30 -delete 2>> $LOG_DIR/backup_$DATE.log
    
    # 清理90天前的配置备份
    find $BACKUP_BASE_DIR/config -name "*.tar.gz" -mtime +90 -delete 2>> $LOG_DIR/backup_$DATE.log
    
    # 清理30天前的日志文件
    find $LOG_DIR -name "backup_*.log" -mtime +30 -delete
    
    log_message "INFO" "旧备份清理完成" $GREEN
}

# 生成备份报告
generate_report() {
    log_message "INFO" "生成备份报告..." $BLUE
    
    local report_file="$BACKUP_BASE_DIR/backup_report_$DATE.json"
    
    cat > "$report_file" << EOF
{
  "backup_date": "$DATE",
  "backup_type": "$BACKUP_TYPE",
  "status": "completed",
  "backups": {
    "database": {
      "files": $(find $BACKUP_BASE_DIR/database -name "*_$DATE.*" | wc -l),
      "total_size": "$(du -sh $BACKUP_BASE_DIR/database 2>/dev/null | cut -f1 || echo "0")"
    },
    "files": {
      "files": $(find $BACKUP_BASE_DIR/files -name "*_$DATE.*" | wc -l),
      "total_size": "$(du -sh $BACKUP_BASE_DIR/files 2>/dev/null | cut -f1 || echo "0")"
    },
    "config": {
      "files": $(find $BACKUP_BASE_DIR/config -name "*_$DATE.*" | wc -l),
      "total_size": "$(du -sh $BACKUP_BASE_DIR/config 2>/dev/null | cut -f1 || echo "0")"
    },
    "logs": {
      "files": $(find $BACKUP_BASE_DIR/logs -name "*_$DATE.*" | wc -l),
      "total_size": "$(du -sh $BACKUP_BASE_DIR/logs 2>/dev/null | cut -f1 || echo "0")"
    }
  },
  "cloud_upload": {
    "enabled": $([ -n "$AWS_S3_BUCKET" ] || [ -n "$RCLONE_REMOTE" ] && echo "true" || echo "false")
  },
  "log_file": "$LOG_DIR/backup_$DATE.log"
}
EOF
    
    log_message "INFO" "备份报告生成完成: $report_file" $GREEN
}

# 数据库恢复
restore_database() {
    local backup_file=$1
    
    log_message "INFO" "开始数据库恢复..." $BLUE
    
    if [ ! -f "$backup_file" ]; then
        log_message "ERROR" "备份文件不存在: $backup_file" $RED
        return 1
    fi
    
    # 解压备份文件
    local temp_file="/tmp/restore_$(date +%s).sql"
    if [[ "$backup_file" == *.gz ]]; then
        if ! gunzip -c "$backup_file" > "$temp_file"; then
            log_message "ERROR" "备份文件解压失败" $RED
            return 1
        fi
    else
        cp "$backup_file" "$temp_file"
    fi
    
    # 复制到容器
    if docker cp "$temp_file" ai-platform-postgres:/tmp/restore.sql; then
        # 执行恢复
        if docker exec ai-platform-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -f /tmp/restore.sql 2>> $LOG_DIR/restore_$(date +%Y%m%d_%H%M%S).log; then
            log_message "INFO" "数据库恢复成功" $GREEN
            rm -f "$temp_file"
            return 0
        else
            log_message "ERROR" "数据库恢复失败" $RED
            rm -f "$temp_file"
            return 1
        fi
    else
        log_message "ERROR" "备份文件复制到容器失败" $RED
        rm -f "$temp_file"
        return 1
    fi
}

# 文件恢复
restore_files() {
    local backup_file=$1
    local target_dir=${2:-"/home/ai design/uploads"}
    
    log_message "INFO" "开始文件恢复..." $BLUE
    
    if [ ! -f "$backup_file" ]; then
        log_message "ERROR" "备份文件不存在: $backup_file" $RED
        return 1
    fi
    
    # 创建目标目录
    mkdir -p "$target_dir"
    
    # 解压备份文件
    if tar -xzf "$backup_file" -C "$(dirname "$target_dir")" 2>> $LOG_DIR/restore_$(date +%Y%m%d_%H%M%S).log; then
        log_message "INFO" "文件恢复成功: $target_dir" $GREEN
        return 0
    else
        log_message "ERROR" "文件恢复失败" $RED
        return 1
    fi
}

# 显示帮助信息
show_help() {
    cat << EOF
AI设计平台备份恢复系统

用法: $0 [选项] [参数]

选项:
    full                    执行完整备份 (数据库 + 文件 + 配置 + 日志)
    database               仅备份数据库
    redis                  仅备份Redis
    files                  仅备份文件
    config                 仅备份配置
    logs                   仅备份日志
    remote                 异地备份 (需要先执行备份)
    cleanup                清理旧备份文件
    restore-db <file>       恢复数据库
    restore-files <file> [target]  恢复文件
    status                 显示备份状态
    help                   显示此帮助信息

示例:
    $0 full                    # 完整备份
    $0 database                # 仅备份数据库
    $0 remote                  # 异地备份
    $0 restore-db /path/to/backup.sql.gz  # 恢复数据库

配置文件: $CONFIG_FILE
备份目录: $BACKUP_BASE_DIR
日志目录: $LOG_DIR
EOF
}

# 显示备份状态
show_status() {
    log_message "INFO" "备份系统状态" $BLUE
    
    echo "=== 备份目录状态 ==="
    if [ -d "$BACKUP_BASE_DIR" ]; then
        echo "总大小: $(du -sh $BACKUP_BASE_DIR 2>/dev/null | cut -f1)"
        echo "数据库备份: $(find $BACKUP_BASE_DIR/database -name "*.gz" 2>/dev/null | wc -l) 个"
        echo "文件备份: $(find $BACKUP_BASE_DIR/files -name "*.tar.gz" 2>/dev/null | wc -l) 个"
        echo "配置备份: $(find $BACKUP_BASE_DIR/config -name "*.tar.gz" 2>/dev/null | wc -l) 个"
    else
        echo "备份目录不存在"
    fi
    
    echo ""
    echo "=== 最新备份 ==="
    echo "数据库: $(find $BACKUP_BASE_DIR/database -name "*.gz" 2>/dev/null | sort -r | head -1 | xargs -I {} basename {} || echo "无")"
    echo "文件: $(find $BACKUP_BASE_DIR/files -name "*.tar.gz" 2>/dev/null | sort -r | head -1 | xargs -I {} basename {} || echo "无")"
    echo "配置: $(find $BACKUP_BASE_DIR/config -name "*.tar.gz" 2>/dev/null | sort -r | head -1 | xargs -I {} basename {} || echo "无")"
    
    echo ""
    echo "=== 云存储配置 ==="
    if [ -n "$AWS_S3_BUCKET" ]; then
        echo "AWS S3: $AWS_S3_BUCKET"
    else
        echo "AWS S3: 未配置"
    fi
    
    if [ -n "$RCLONE_REMOTE" ]; then
        echo "Rclone: $RCLONE_REMOTE"
    else
        echo "Rclone: 未配置"
    fi
}

# 主函数
main() {
    case "${BACKUP_TYPE:-help}" in
        "full")
            log_message "INFO" "开始完整备份..." $BLUE
            check_dependencies
            create_backup_dirs
            load_config
            
            backup_database && backup_redis && backup_files && backup_config && backup_logs
            remote_backup
            cleanup_old_backups
            generate_report
            log_message "INFO" "完整备份完成" $GREEN
            ;;
        "database")
            log_message "INFO" "开始数据库备份..." $BLUE
            check_dependencies
            create_backup_dirs
            load_config
            backup_database
            log_message "INFO" "数据库备份完成" $GREEN
            ;;
        "redis")
            log_message "INFO" "开始Redis备份..." $BLUE
            check_dependencies
            create_backup_dirs
            load_config
            backup_redis
            log_message "INFO" "Redis备份完成" $GREEN
            ;;
        "files")
            log_message "INFO" "开始文件备份..." $BLUE
            check_dependencies
            create_backup_dirs
            backup_files
            log_message "INFO" "文件备份完成" $GREEN
            ;;
        "config")
            log_message "INFO" "开始配置备份..." $BLUE
            check_dependencies
            create_backup_dirs
            load_config
            backup_config
            log_message "INFO" "配置备份完成" $GREEN
            ;;
        "logs")
            log_message "INFO" "开始日志备份..." $BLUE
            check_dependencies
            create_backup_dirs
            backup_logs
            log_message "INFO" "日志备份完成" $GREEN
            ;;
        "remote")
            log_message "INFO" "开始异地备份..." $BLUE
            load_config
            remote_backup
            log_message "INFO" "异地备份完成" $GREEN
            ;;
        "cleanup")
            log_message "INFO" "开始清理旧备份..." $BLUE
            cleanup_old_backups
            log_message "INFO" "旧备份清理完成" $GREEN
            ;;
        "restore-db")
            if [ -z "$2" ]; then
                log_message "ERROR" "请指定备份文件" $RED
                exit 1
            fi
            load_config
            restore_database "$2"
            ;;
        "restore-files")
            if [ -z "$2" ]; then
                log_message "ERROR" "请指定备份文件" $RED
                exit 1
            fi
            restore_files "$2" "$3"
            ;;
        "status")
            show_status
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_message "ERROR" "未知操作: $BACKUP_TYPE" $RED
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"