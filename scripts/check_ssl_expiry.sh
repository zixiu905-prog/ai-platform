#!/bin/bash

# SSL证书到期时间检查脚本
# 项目: AiDesign
# 功能: 每日检查证书到期时间，并在剩余时间不足时发送警告

set -e

# 配置
CERT_FILE="/home/ai design/nginx/ssl/cert.pem"
LOG_FILE="/var/log/ssl_expiry.log"

# 创建日志目录
sudo mkdir -p /var/log
sudo touch "$LOG_FILE"
sudo chmod 644 "$LOG_FILE"

# 记录日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | sudo tee -a "$LOG_FILE"
}

log "开始SSL证书到期时间检查"

# 检查证书文件是否存在
if [ ! -f "$CERT_FILE" ]; then
    log "错误: 证书文件不存在 - $CERT_FILE"
    exit 1
fi

# 获取证书到期日期
EXPIRY_DATE=$(openssl x509 -in "$CERT_FILE" -noout -enddate | cut -d= -f2)

# 解析到期日期为时间戳
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRY_DATE" +%s 2>/dev/null)

if [ -z "$EXPIRY_EPOCH" ]; then
    log "错误: 无法解析证书到期日期 - $EXPIRY_DATE"
    exit 1
fi

# 获取当前时间
CURRENT_EPOCH=$(date +%s)

# 计算剩余天数
DAYS_LEFT=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

log "SSL证书到期日期: $EXPIRY_DATE"
log "证书剩余天数: $DAYS_LEFT 天"

# 获取证书信息
log "证书颁发者: $(openssl x509 -in "$CERT_FILE" -noout -issuer | sed 's/issuer=//')"
log "证书主题: $(openssl x509 -in "$CERT_FILE" -noout -subject | sed 's/subject=//')"

# 根据剩余天数发送警告
if [ $DAYS_LEFT -lt 0 ]; then
    log "========================================="
    log "严重警告: SSL证书已过期！"
    log "过期天数: $(( -DAYS_LEFT )) 天"
    log "请立即更新证书！"
    log "========================================="
elif [ $DAYS_LEFT -lt 7 ]; then
    log "========================================="
    log "严重警告: SSL证书将在 $DAYS_LEFT 天后到期！"
    log "请立即检查自动续期功能！"
    log "========================================="
elif [ $DAYS_LEFT -lt 30 ]; then
    log "========================================="
    log "警告: SSL证书将在 $DAYS_LEFT 天后到期"
    log "请检查自动续期功能是否正常工作"
    log "========================================="
elif [ $DAYS_LEFT -lt 60 ]; then
    log "提醒: SSL证书将在 $DAYS_LEFT 天后到期"
    log "自动续期功能应在 $((DAYS_LEFT - 30)) 天内触发"
else
    log "状态: 证书有效期正常"
fi

log "检查完成"
log ""
