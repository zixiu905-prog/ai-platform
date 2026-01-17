#!/bin/bash

# AI智能体平台数据库备份脚本
# 支持全量备份、增量备份、异地存储和恢复测试

set -euo pipefail

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/../.env.production"
BACKUP_DIR="${SCRIPT_DIR}/../database/backup"
LOG_DIR="${SCRIPT_DIR}/../logs/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_TYPE="${1:-full}"  # full, incremental, differential

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

# 检查环境
check_environment() {
    log "检查备份环境..."
    
    # 检查配置文件
    if [[ ! -f "$CONFIG_FILE" ]]; then
        error "配置文件不存在: $CONFIG_FILE"
        exit 1
    fi
    
    # 加载环境变量
    source "$CONFIG_FILE"
    
    # 检查必要的环境变量
    local required_vars=("POSTGRES_HOST" "POSTGRES_DB" "POSTGRES_USER" "POSTGRES_PASSWORD")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "环境变量 $var 未设置"
            exit 1
        fi
    done
    
    # 创建必要的目录
    mkdir -p "$BACKUP_DIR"/{full,incremental,differential,logs}
    mkdir -p "$LOG_DIR"
    
    log "环境检查完成"
}

# 检查PostgreSQL连接
check_database_connection() {
    log "检查数据库连接..."
    
    if PGPASSWORD="$POSTGRES_PASSWORD" pg_isready -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB"; then
        log "数据库连接正常"
    else
        error "无法连接到数据库"
        exit 1
    fi
}

# 获取数据库大小
get_database_size() {
    local size=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT pg_size_pretty(pg_database_size('$POSTGRES_DB'));" | xargs)
    echo "$size"
}

# 创建全量备份
create_full_backup() {
    local backup_file="ai_platform_full_${TIMESTAMP}.sql"
    local backup_path="$BACKUP_DIR/full/$backup_file"
    local compressed_path="${backup_path}.gz"
    
    log "开始全量备份..."
    info "备份文件: $backup_file"
    info "数据库大小: $(get_database_size)"
    
    # 执行备份
    local start_time=$(date +%s)
    
    if PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=custom \
        --compress=9 \
        --file="$backup_path"; then
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        # 压缩备份文件
        gzip -f "$backup_path"
        
        local backup_size=$(du -h "$compressed_path" | cut -f1)
        
        log "全量备份完成"
        info "备份文件: $compressed_path"
        info "备份大小: $backup_size"
        info "耗时: ${duration}秒"
        
        # 记录备份信息
        record_backup "full" "$compressed_path" "$backup_size" "$duration"
        
        # 清理旧的全量备份（保留7天）
        cleanup_old_backups "full" 7
        
        return 0
    else
        error "全量备份失败"
        return 1
    fi
}

# 创建增量备份
create_incremental_backup() {
    local backup_file="ai_platform_incremental_${TIMESTAMP}.sql"
    local backup_path="$BACKUP_DIR/incremental/$backup_file"
    
    log "开始增量备份..."
    
    # 检查是否有基础备份
    local latest_full_backup=$(find "$BACKUP_DIR/full" -name "*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [[ -z "$latest_full_backup" ]]; then
        warn "未找到基础全量备份，将执行全量备份"
        create_full_backup
        return $?
    fi
    
    # 执行增量备份（基于WAL）
    local start_time=$(date +%s)
    
    if PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --verbose \
        --format=directory \
        --file="$backup_path" \
        --incremental; then
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        # 压缩备份目录
        tar -czf "${backup_path}.tar.gz" -C "$(dirname "$backup_path")" "$(basename "$backup_path")"
        rm -rf "$backup_path"
        
        local compressed_path="${backup_path}.tar.gz"
        local backup_size=$(du -h "$compressed_path" | cut -f1)
        
        log "增量备份完成"
        info "备份文件: $compressed_path"
        info "备份大小: $backup_size"
        info "耗时: ${duration}秒"
        
        # 记录备份信息
        record_backup "incremental" "$compressed_path" "$backup_size" "$duration"
        
        # 清理旧的增量备份（保留3天）
        cleanup_old_backups "incremental" 3
        
        return 0
    else
        error "增量备份失败"
        return 1
    fi
}

# 创建差异备份
create_differential_backup() {
    local backup_file="ai_platform_differential_${TIMESTAMP}.sql"
    local backup_path="$BACKUP_DIR/differential/$backup_file"
    
    log "开始差异备份..."
    
    # 执行差异备份
    local start_time=$(date +%s)
    
    if PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --verbose \
        --format=custom \
        --compress=9 \
        --file="$backup_path"; then
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        local backup_size=$(du -h "$backup_path" | cut -f1)
        
        log "差异备份完成"
        info "备份文件: $backup_path"
        info "备份大小: $backup_size"
        info "耗时: ${duration}秒"
        
        # 记录备份信息
        record_backup "differential" "$backup_path" "$backup_size" "$duration"
        
        # 清理旧的差异备份（保留2天）
        cleanup_old_backups "differential" 2
        
        return 0
    else
        error "差异备份失败"
        return 1
    fi
}

# 记录备份信息
record_backup() {
    local type="$1"
    local path="$2"
    local size="$3"
    local duration="$4"
    
    local log_file="$LOG_DIR/backup_history.log"
    
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] TYPE:$type PATH:$path SIZE:$size DURATION:${duration}s" >> "$log_file"
    
    # 同时记录到数据库（如果可用）
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
        INSERT INTO app.backup_records (type, file_path, file_size, duration, created_at)
        VALUES ('$type', '$path', '$size', $duration, NOW())
        ON CONFLICT (file_path) DO UPDATE SET
            type = EXCLUDED.type,
            file_size = EXCLUDED.file_size,
            duration = EXCLUDED.duration,
            created_at = EXCLUDED.created_at
        " 2>/dev/null || true
}

# 清理旧备份
cleanup_old_backups() {
    local backup_type="$1"
    local retention_days="$2"
    
    log "清理${retention_days}天前的$backup_type备份..."
    
    local deleted_count=0
    while IFS= read -r -d '' backup_file; do
        info "删除旧备份: $backup_file"
        rm -f "$backup_file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR/$backup_type" -name "*_*_*.sql*" -type f -mtime "+$retention_days" -print0)
    
    log "删除了 $deleted_count 个旧备份文件"
}

# 上传到异地存储
upload_to_remote() {
    local local_path="$1"
    local remote_path="$2"
    
    log "上传备份到异地存储..."
    
    # AWS S3
    if command -v aws &> /dev/null && [[ -n "${AWS_S3_BUCKET:-}" ]]; then
        info "上传到AWS S3: s3://$AWS_S3_BUCKET/$remote_path"
        if aws s3 cp "$local_path" "s3://$AWS_S3_BUCKET/$remote_path" --storage-class STANDARD_IA; then
            log "S3上传成功"
        else
            warn "S3上传失败"
            return 1
        fi
    fi
    
    # 阿里云OSS
    if command -v ossutil64 &> /dev/null && [[ -n "${ALIYUN_OSS_BUCKET:-}" ]]; then
        info "上传到阿里云OSS: oss://$ALIYUN_OSS_BUCKET/$remote_path"
        if ossutil64 cp "$local_path" "oss://$ALIYUN_OSS_BUCKET/$remote_path"; then
            log "OSS上传成功"
        else
            warn "OSS上传失败"
            return 1
        fi
    fi
    
    # 腾讯云COS
    if command -v coscli &> /dev/null && [[ -n "${TENCENT_COS_BUCKET:-}" ]]; then
        info "上传到腾讯云COS: cos://$TENCENT_COS_BUCKET/$remote_path"
        if coscli cp "$local_path" "cos://$TENCENT_COS_BUCKET/$remote_path"; then
            log "COS上传成功"
        else
            warn "COS上传失败"
            return 1
        fi
    fi
    
    return 0
}

# 备份验证
verify_backup() {
    local backup_path="$1"
    local backup_type="$2"
    
    log "验证备份文件: $backup_path"
    
    case "$backup_type" in
        "full")
            # 验证全量备份
            if PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
                -h "$POSTGRES_HOST" \
                -U "$POSTGRES_USER" \
                --list \
                "$backup_path" > /dev/null 2>&1; then
                log "全量备份验证通过"
                return 0
            else
                error "全量备份验证失败"
                return 1
            fi
            ;;
        "differential")
            # 验证差异备份
            if PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
                -h "$POSTGRES_HOST" \
                -U "$POSTGRES_USER" \
                --list \
                "$backup_path" > /dev/null 2>&1; then
                log "差异备份验证通过"
                return 0
            else
                error "差异备份验证失败"
                return 1
            fi
            ;;
        *)
            # 检查文件完整性
            if [[ -f "$backup_path" && -s "$backup_path" ]]; then
                log "备份文件存在且非空"
                return 0
            else
                error "备份文件不存在或为空"
                return 1
            fi
            ;;
    esac
}

# 备份状态报告
backup_report() {
    log "生成备份状态报告..."
    
    local report_file="$LOG_DIR/backup_report_$(date +%Y%m%d).txt"
    
    {
        echo "=== AI智能体平台备份报告 ==="
        echo "生成时间: $(date)"
        echo ""
        
        echo "=== 全量备份 ==="
        find "$BACKUP_DIR/full" -name "*.sql.gz" -type f -exec ls -lh {} \; | awk '{print $5, $9}' || echo "无全量备份"
        echo ""
        
        echo "=== 增量备份 ==="
        find "$BACKUP_DIR/incremental" -name "*.tar.gz" -type f -exec ls -lh {} \; | awk '{print $5, $9}' || echo "无增量备份"
        echo ""
        
        echo "=== 差异备份 ==="
        find "$BACKUP_DIR/differential" -name "*.sql" -type f -exec ls -lh {} \; | awk '{print $5, $9}' || echo "无差异备份"
        echo ""
        
        echo "=== 磁盘使用情况 ==="
        du -sh "$BACKUP_DIR"/* | sort -hr
        echo ""
        
        echo "=== 数据库状态 ==="
        if PGPASSWORD="$POSTGRES_PASSWORD" pg_isready -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB"; then
            echo "数据库连接: 正常"
            echo "数据库大小: $(get_database_size)"
        else
            echo "数据库连接: 异常"
        fi
        
    } > "$report_file"
    
    log "备份报告已生成: $report_file"
}

# 主函数
main() {
    log "开始数据库备份任务..."
    
    # 检查参数
    if [[ ! "$BACKUP_TYPE" =~ ^(full|incremental|differential)$ ]]; then
        error "无效的备份类型: $BACKUP_TYPE"
        echo "使用方法: $0 [full|incremental|differential]"
        exit 1
    fi
    
    # 检查环境
    check_environment
    
    # 检查数据库连接
    check_database_connection
    
    # 执行备份
    local backup_path=""
    local success=false
    
    case "$BACKUP_TYPE" in
        "full")
            if create_full_backup; then
                backup_path=$(find "$BACKUP_DIR/full" -name "ai_platform_full_${TIMESTAMP}.sql.gz" -type f | head -1)
                success=true
            fi
            ;;
        "incremental")
            if create_incremental_backup; then
                backup_path=$(find "$BACKUP_DIR/incremental" -name "ai_platform_incremental_${TIMESTAMP}.tar.gz" -type f | head -1)
                success=true
            fi
            ;;
        "differential")
            if create_differential_backup; then
                backup_path=$(find "$BACKUP_DIR/differential" -name "ai_platform_differential_${TIMESTAMP}.sql" -type f | head -1)
                success=true
            fi
            ;;
    esac
    
    # 验证备份
    if [[ "$success" == true && -n "$backup_path" ]]; then
        if verify_backup "$backup_path" "$BACKUP_TYPE"; then
            # 上传到异地存储
            local remote_filename="$(basename "$backup_path")"
            upload_to_remote "$backup_path" "database-backups/$(date +%Y/%m/%d)/$remote_filename"
            
            log "备份任务完成"
        else
            error "备份验证失败"
            exit 1
        fi
    else
        error "备份失败"
        exit 1
    fi
    
    # 生成报告
    backup_report
    
    log "所有备份任务完成"
}

# 执行主函数
main "$@"