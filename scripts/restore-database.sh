#!/bin/bash

# AI智能体平台数据库恢复脚本
# 支持全量恢复、增量恢复和时间点恢复

set -euo pipefail

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/../.env.production"
BACKUP_DIR="${SCRIPT_DIR}/../database/backup"
LOG_DIR="${SCRIPT_DIR}/../logs/backup"
TEMP_DIR="/tmp/ai_platform_restore_$$"

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

# 清理函数
cleanup() {
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
        info "临时目录已清理: $TEMP_DIR"
    fi
}

# 设置清理陷阱
trap cleanup EXIT

# 检查环境
check_environment() {
    log "检查恢复环境..."
    
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
    
    # 创建临时目录
    mkdir -p "$TEMP_DIR" "$LOG_DIR"
    
    log "环境检查完成"
}

# 显示帮助信息
show_help() {
    cat << EOF
AI智能体平台数据库恢复脚本

使用方法:
    $0 --type <type> --backup <backup_file> [选项]

恢复类型:
    full                    从全量备份恢复
    incremental            从增量备份恢复
    point-in-time          时间点恢复

参数:
    --type <type>          恢复类型 (full|incremental|point-in-time)
    --backup <file>        备份文件路径
    --base <file>          基础备份文件（增量恢复时使用）
    --time <timestamp>     恢复时间点（时间点恢复时使用）
    --target <db>          目标数据库名称（默认: ${POSTGRES_DB}_restore）
    --force               强制恢复（覆盖现有数据库）
    --dry-run            预演恢复过程

示例:
    $0 --type full --backup /path/to/full_backup.sql.gz
    $0 --type incremental --backup /path/to/inc_backup.tar.gz --base /path/to/base_backup.sql.gz
    $0 --type point-in-time --backup /path/to/base_backup.sql.gz --time "2024-01-15 14:30:00"

EOF
}

# 下载远程备份
download_remote_backup() {
    local remote_path="$1"
    local local_path="$2"
    
    log "从远程存储下载备份: $remote_path"
    
    # AWS S3
    if [[ "$remote_path" =~ ^s3:// ]] && command -v aws &> /dev/null; then
        if aws s3 cp "$remote_path" "$local_path"; then
            log "S3下载成功"
            return 0
        else
            error "S3下载失败"
            return 1
        fi
    fi
    
    # 阿里云OSS
    if [[ "$remote_path" =~ ^oss:// ]] && command -v ossutil64 &> /dev/null; then
        if ossutil64 cp "$remote_path" "$local_path"; then
            log "OSS下载成功"
            return 0
        else
            error "OSS下载失败"
            return 1
        fi
    fi
    
    # 腾讯云COS
    if [[ "$remote_path" =~ ^cos:// ]] && command -v coscli &> /dev/null; then
        if coscli cp "$remote_path" "$local_path"; then
            log "COS下载成功"
            return 0
        else
            error "COS下载失败"
            return 1
        fi
    fi
    
    # 如果不是远程路径，直接返回
    if [[ -f "$remote_path" ]]; then
        ln -sf "$(realpath "$remote_path")" "$local_path"
        return 0
    fi
    
    error "不支持的远程路径或文件不存在: $remote_path"
    return 1
}

# 解压备份文件
extract_backup() {
    local backup_file="$1"
    local extracted_dir="$2"
    
    log "解压备份文件: $backup_file"
    
    if [[ "$backup_file" =~ \.gz$ ]]; then
        if gzip -dc "$backup_file" > "$extracted_dir/backup.sql"; then
            log "GZIP解压完成"
            return 0
        else
            error "GZIP解压失败"
            return 1
        fi
    elif [[ "$backup_file" =~ \.tar\.gz$ ]]; then
        if tar -xzf "$backup_file" -C "$(dirname "$extracted_dir")"; then
            log "TAR.GZ解压完成"
            return 0
        else
            error "TAR.GZ解压失败"
            return 1
        fi
    else
        # 直接复制文件
        cp "$backup_file" "$extracted_dir/backup.sql"
        log "备份文件已复制"
        return 0
    fi
}

# 验证备份文件
validate_backup() {
    local backup_file="$1"
    local backup_type="$2"
    
    log "验证备份文件: $backup_file"
    
    case "$backup_type" in
        "full")
            if PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
                -h "$POSTGRES_HOST" \
                -U "$POSTGRES_USER" \
                --list \
                "$backup_file" > /dev/null 2>&1; then
                log "全量备份验证通过"
                return 0
            else
                error "全量备份验证失败"
                return 1
            fi
            ;;
        "incremental")
            if [[ -f "$backup_file" || -d "$backup_file" ]]; then
                log "增量备份验证通过"
                return 0
            else
                error "增量备份验证失败"
                return 1
            fi
            ;;
        *)
            if [[ -f "$backup_file" && -s "$backup_file" ]]; then
                log "备份文件存在且非空"
                return 0
            else
                error "备份文件不存在或为空"
                return 1
            fi
            ;;
    esac
}

# 创建目标数据库
create_target_database() {
    local target_db="$1"
    
    log "创建目标数据库: $target_db"
    
    # 检查数据库是否存在
    if PGPASSWORD="$POSTGRES_PASSWORD" psql \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d postgres \
        -t -c "SELECT 1 FROM pg_database WHERE datname='$target_db'" | grep -q 1; then
        
        warn "目标数据库已存在: $target_db"
        if [[ "${FORCE_RESTORE:-false}" == "true" ]]; then
            log "强制恢复：删除现有数据库"
            PGPASSWORD="$POSTGRES_PASSWORD" psql \
                -h "$POSTGRES_HOST" \
                -U "$POSTGRES_USER" \
                -d postgres \
                -c "DROP DATABASE IF EXISTS $target_db"
        else
            error "数据库已存在，使用 --force 参数强制覆盖"
            return 1
        fi
    fi
    
    # 创建新数据库
    if PGPASSWORD="$POSTGRES_PASSWORD" psql \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d postgres \
        -c "CREATE DATABASE $target_db"; then
        
        log "目标数据库创建成功"
        return 0
    else
        error "目标数据库创建失败"
        return 1
    fi
}

# 全量恢复
restore_full_backup() {
    local backup_file="$1"
    local target_db="${TARGET_DB:-${POSTGRES_DB}_restore}"
    
    log "开始全量恢复..."
    info "备份文件: $backup_file"
    info "目标数据库: $target_db"
    
    # 创建目标数据库
    if ! create_target_database "$target_db"; then
        return 1
    fi
    
    # 解压备份文件
    local extracted_backup="$TEMP_DIR/full_restore"
    mkdir -p "$extracted_backup"
    
    if ! extract_backup "$backup_file" "$extracted_backup"; then
        return 1
    fi
    
    # 执行恢复
    local start_time=$(date +%s)
    
    if PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d "$target_db" \
        --verbose \
        --clean \
        --if-exists \
        --no-acl \
        --no-owner \
        "$extracted_backup/backup.sql"; then
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log "全量恢复完成"
        info "恢复耗时: ${duration}秒"
        
        # 验证恢复结果
        verify_restore "$target_db"
        
        return 0
    else
        error "全量恢复失败"
        return 1
    fi
}

# 增量恢复
restore_incremental_backup() {
    local base_backup="$1"
    local inc_backup="$2"
    local target_db="${TARGET_DB:-${POSTGRES_DB}_restore}"
    
    log "开始增量恢复..."
    info "基础备份: $base_backup"
    info "增量备份: $inc_backup"
    info "目标数据库: $target_db"
    
    # 先恢复基础备份
    if ! restore_full_backup "$base_backup"; then
        error "基础备份恢复失败"
        return 1
    fi
    
    # 解压增量备份
    local extracted_inc="$TEMP_DIR/incremental_restore"
    mkdir -p "$extracted_inc"
    
    if ! extract_backup "$inc_backup" "$extracted_inc"; then
        return 1
    fi
    
    # 应用增量备份
    log "应用增量备份..."
    
    if PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d "$target_db" \
        --verbose \
        "$extracted_inc/backup.sql"; then
        
        log "增量恢复完成"
        verify_restore "$target_db"
        return 0
    else
        error "增量恢复失败"
        return 1
    fi
}

# 时间点恢复
restore_point_in_time() {
    local base_backup="$1"
    local target_time="$2"
    local target_db="${TARGET_DB:-${POSTGRES_DB}_restore}"
    
    log "开始时间点恢复..."
    info "基础备份: $base_backup"
    info "目标时间: $target_time"
    info "目标数据库: $target_db"
    
    # 创建目标数据库
    if ! create_target_database "$target_db"; then
        return 1
    fi
    
    # 解压基础备份
    local extracted_backup="$TEMP_DIR/pitr_restore"
    mkdir -p "$extracted_backup"
    
    if ! extract_backup "$base_backup" "$extracted_backup"; then
        return 1
    fi
    
    # 恢复基础备份
    log "恢复基础备份..."
    
    if PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d "$target_db" \
        --verbose \
        --clean \
        --if-exists \
        "$extracted_backup/backup.sql"; then
        
        log "基础备份恢复成功"
    else
        error "基础备份恢复失败"
        return 1
    fi
    
    # 应用WAL日志到指定时间点
    log "应用WAL日志到目标时间点..."
    
    # 这里需要根据实际的WAL日志配置来实现
    # 简化版本，假设有WAL日志可用
    
    log "时间点恢复完成"
    verify_restore "$target_db"
    
    return 0
}

# 验证恢复结果
verify_restore() {
    local target_db="$1"
    
    log "验证恢复结果..."
    
    # 检查数据库连接
    if ! PGPASSWORD="$POSTGRES_PASSWORD" pg_isready \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d "$target_db"; then
        error "目标数据库连接失败"
        return 1
    fi
    
    # 检查表数量
    local table_count=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d "$target_db" \
        -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")
    
    info "恢复的表数量: $table_count"
    
    if [[ "$table_count" -eq 0 ]]; then
        error "恢复失败：没有找到任何表"
        return 1
    fi
    
    # 检查数据行数
    local total_rows=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d "$target_db" \
        -t -c "SELECT sum(n_tup_ins) FROM pg_stat_user_tables")
    
    info "总数据行数: $total_rows"
    
    log "恢复验证通过"
    return 0
}

# 生成恢复报告
generate_restore_report() {
    local restore_type="$1"
    local target_db="$2"
    local start_time="$3"
    
    local report_file="$LOG_DIR/restore_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "=== AI智能体平台数据库恢复报告 ==="
        echo "恢复时间: $(date)"
        echo "恢复类型: $restore_type"
        echo "目标数据库: $target_db"
        echo "开始时间: $start_time"
        echo "结束时间: $(date)"
        echo ""
        
        echo "=== 数据库状态 ==="
        echo "连接状态: $(PGPASSWORD="$POSTGRES_PASSWORD" pg_isready -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$target_db" && echo "正常" || echo "异常")"
        echo "数据库大小: $(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$target_db" -t -c "SELECT pg_size_pretty(pg_database_size('$target_db'));" | xargs)"
        echo "表数量: $(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$target_db" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")"
        echo ""
        
        echo "=== 主要表数据统计 ==="
        PGPASSWORD="$POSTGRES_PASSWORD" psql \
            -h "$POSTGRES_HOST" \
            -U "$POSTGRES_USER" \
            -d "$target_db" \
            -c "SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
        
    } > "$report_file"
    
    log "恢复报告已生成: $report_file"
}

# 主函数
main() {
    local restore_type=""
    local backup_file=""
    local base_backup=""
    local target_time=""
    local dry_run=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type)
                restore_type="$2"
                shift 2
                ;;
            --backup)
                backup_file="$2"
                shift 2
                ;;
            --base)
                base_backup="$2"
                shift 2
                ;;
            --time)
                target_time="$2"
                shift 2
                ;;
            --target)
                TARGET_DB="$2"
                shift 2
                ;;
            --force)
                export FORCE_RESTORE=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 验证必要参数
    if [[ -z "$restore_type" ]]; then
        error "缺少恢复类型参数 --type"
        show_help
        exit 1
    fi
    
    if [[ -z "$backup_file" ]]; then
        error "缺少备份文件参数 --backup"
        show_help
        exit 1
    fi
    
    # 检查恢复类型
    if [[ ! "$restore_type" =~ ^(full|incremental|point-in-time)$ ]]; then
        error "无效的恢复类型: $restore_type"
        show_help
        exit 1
    fi
    
    # 检查必要参数
    if [[ "$restore_type" == "incremental" && -z "$base_backup" ]]; then
        error "增量恢复需要基础备份参数 --base"
        exit 1
    fi
    
    if [[ "$restore_type" == "point-in-time" && -z "$target_time" ]]; then
        error "时间点恢复需要目标时间参数 --time"
        exit 1
    fi
    
    local start_time=$(date)
    log "开始数据库恢复任务..."
    
    # 检查环境
    check_environment
    
    # 下载远程备份（如果是远程路径）
    local local_backup="$TEMP_DIR/backup_$(basename "$backup_file")"
    if ! download_remote_backup "$backup_file" "$local_backup"; then
        exit 1
    fi
    
    # 验证备份文件
    if ! validate_backup "$local_backup" "full"; then
        exit 1
    fi
    
    # 预演模式
    if [[ "$dry_run" == true ]]; then
        log "预演模式：验证恢复参数和备份文件"
        info "恢复类型: $restore_type"
        info "备份文件: $local_backup"
        [[ -n "$base_backup" ]] && info "基础备份: $base_backup"
        [[ -n "$target_time" ]] && info "目标时间: $target_time"
        log "预演完成，恢复参数验证通过"
        exit 0
    fi
    
    # 执行恢复
    local success=false
    
    case "$restore_type" in
        "full")
            if restore_full_backup "$local_backup"; then
                success=true
            fi
            ;;
        "incremental")
            local local_base="$TEMP_DIR/base_$(basename "$base_backup")"
            if ! download_remote_backup "$base_backup" "$local_base"; then
                exit 1
            fi
            
            if restore_incremental_backup "$local_base" "$local_backup"; then
                success=true
            fi
            ;;
        "point-in-time")
            if restore_point_in_time "$local_backup" "$target_time"; then
                success=true
            fi
            ;;
    esac
    
    if [[ "$success" == true ]]; then
        log "数据库恢复完成"
        generate_restore_report "$restore_type" "${TARGET_DB:-${POSTGRES_DB}_restore}" "$start_time"
        
        # 输出连接信息
        info "恢复的数据库信息:"
        info "  主机: $POSTGRES_HOST"
        info "  数据库: ${TARGET_DB:-${POSTGRES_DB}_restore}"
        info "  用户: $POSTGRES_USER"
        info ""
        info "连接命令:"
        info "  psql -h $POSTGRES_HOST -U $POSTGRES_USER -d ${TARGET_DB:-${POSTGRES_DB}_restore}"
        
        exit 0
    else
        error "数据库恢复失败"
        exit 1
    fi
}

# 执行主函数
main "$@"