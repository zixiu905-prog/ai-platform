#!/bin/bash

# SSL证书自动续期脚本
# 项目: AiDesign
# 功能: 自动检查和续期Let's Encrypt证书，并重启Nginx容器

set -e

# 配置
PROJECT_DIR="/home/ai design"
CERT_FILE="$PROJECT_DIR/nginx/ssl/cert.pem"
KEY_FILE="$PROJECT_DIR/nginx/ssl/key.pem"
LOG_FILE="/var/log/ssl_renewal.log"

# 创建日志目录
sudo mkdir -p /var/log
sudo touch "$LOG_FILE"
sudo chmod 644 "$LOG_FILE"

# 记录日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | sudo tee -a "$LOG_FILE"
}

log "========================================"
log "开始SSL证书续期检查"
log "========================================"

# 检查certbot是否可用
if ! command -v certbot &> /dev/null; then
    log "错误: certbot未安装"
    exit 1
fi

# 续期证书（仅检查是否需要续期）
log "执行证书续期检查..."
if sudo certbot renew --quiet >> "$LOG_FILE" 2>&1; then
    log "证书续期检查完成"
else
    log "警告: 证书续期检查出现错误，请查看日志"
    exit 1
fi

# 检查证书文件是否存在
if [ ! -f "/etc/letsencrypt/live/www.aidesign.ltd/fullchain.pem" ]; then
    log "警告: Let's Encrypt证书文件不存在，跳过续期"
    exit 0
fi

# 获取证书文件修改时间
RENEWAL_DATE=$(stat -c %Y /etc/letsencrypt/live/www.aidesign.ltd/fullchain.pem 2>/dev/null || echo "0")
CURRENT_TIME=$(date +%s)
TIME_DIFF=$((CURRENT_TIME - RENEWAL_DATE))

# 如果证书在最近10分钟内更新过，说明续期成功
if [ $TIME_DIFF -lt 600 ]; then
    log "检测到证书已更新（${TIME_DIFF}秒前）"

    # 备份当前证书
    BACKUP_DIR="$PROJECT_DIR/nginx/ssl/backup"
    sudo mkdir -p "$BACKUP_DIR"
    if [ -f "$CERT_FILE" ]; then
        sudo cp "$CERT_FILE" "$BACKUP_DIR/cert.pem.$(date +%Y%m%d_%H%M%S).bak"
        log "已备份旧证书"
    fi
    if [ -f "$KEY_FILE" ]; then
        sudo cp "$KEY_FILE" "$BACKUP_DIR/key.pem.$(date +%Y%m%d_%H%M%S).bak"
        log "已备份旧密钥"
    fi

    # 复制新证书
    sudo cp /etc/letsencrypt/live/www.aidesign.ltd/fullchain.pem "$CERT_FILE"
    sudo cp /etc/letsencrypt/live/www.aidesign.ltd/privkey.pem "$KEY_FILE"
    sudo chmod 644 "$CERT_FILE"
    sudo chmod 600 "$KEY_FILE"
    log "新证书已复制到Nginx目录"

    # 验证新证书
    if openssl x509 -in "$CERT_FILE" -noout -checkend 0 2>/dev/null; then
        log "新证书验证通过"
        log "证书信息:"
        openssl x509 -in "$CERT_FILE" -noout -subject | sudo tee -a "$LOG_FILE"
        openssl x509 -in "$CERT_FILE" -noout -dates | sudo tee -a "$LOG_FILE"
    else
        log "错误: 新证书验证失败"
        exit 1
    fi

    # 重启Nginx容器
    log "准备重启Nginx容器..."
    cd "$PROJECT_DIR"
    if docker-compose restart nginx >> "$LOG_FILE" 2>&1; then
        log "Nginx容器已成功重启"
        sleep 5

        # 验证Nginx是否正常运行
        if docker ps | grep -q aidesign_nginx; then
            log "Nginx容器运行正常"
        else
            log "警告: Nginx容器可能未正常启动"
        fi
    else
        log "错误: Nginx容器重启失败"
        exit 1
    fi

    log "========================================"
    log "SSL证书续期成功完成"
    log "========================================"
else
    log "证书无需续期（最后更新: $((TIME_DIFF / 86400)) 天前）"
    log "证书信息:"
    if [ -f "$CERT_FILE" ]; then
        openssl x509 -in "$CERT_FILE" -noout -dates | sudo tee -a "$LOG_FILE"
        # 计算剩余天数
        EXPIRY_DATE=$(openssl x509 -in "$CERT_FILE" -noout -enddate | cut -d= -f2)
        EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null || echo "0")
        if [ "$EXPIRY_EPOCH" != "0" ]; then
            DAYS_LEFT=$(( ($EXPIRY_EPOCH - CURRENT_TIME) / 86400 ))
            log "证书剩余天数: $DAYS_LEFT 天"
        fi
    fi
fi

log "续期检查完成"
log ""
