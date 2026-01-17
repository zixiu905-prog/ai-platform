#!/bin/bash

# SSL证书配置脚本
# 支持Let's Encrypt自动申请和自签名证书生成

set -e

# 配置变量
DOMAIN="ai.yourdomain.com"
API_DOMAIN="api.ai.yourdomain.com"
MONITORING_DOMAIN="monitoring.ai.yourdomain.com"
SSL_DIR="/home/ai design/nginx/ssl"
CERT_EMAIL="admin@yourdomain.com"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "请不要使用root用户运行此脚本"
    fi
}

# 创建SSL目录
create_ssl_dir() {
    log "创建SSL证书目录..."
    mkdir -p "$SSL_DIR"
    chmod 755 "$SSL_DIR"
}

# 安装Certbot
install_certbot() {
    if ! command -v certbot &> /dev/null; then
        log "安装Certbot..."
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
    else
        log "Certbot已安装"
    fi
}

# 生成自签名证书（开发/测试用）
generate_self_signed_cert() {
    log "生成自签名SSL证书..."
    
    # 生成私钥
    openssl genrsa -out "$SSL_DIR/key.pem" 2048
    
    # 生成证书签名请求
    openssl req -new -key "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.csr" -subj "/C=CN/ST=State/L=City/O=Organization/CN=$DOMAIN"
    
    # 生成自签名证书
    openssl x509 -req -days 365 -in "$SSL_DIR/cert.csr" -signkey "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem"
    
    # 复制证书到备用位置
    cp "$SSL_DIR/cert.pem" "$SSL_DIR/fullchain.pem"
    cp "$SSL_DIR/key.pem" "$SSL_DIR/privkey.pem"
    
    # 设置权限
    chmod 600 "$SSL_DIR"/*.pem
    chmod 644 "$SSL_DIR"/*.csr
    
    # 清理CSR文件
    rm "$SSL_DIR/cert.csr"
    
    log "自签名证书生成完成"
}

# 申请Let's Encrypt证书
request_letsencrypt_cert() {
    log "申请Let's Encrypt SSL证书..."
    
    # 检查域名是否可解析
    if ! dig +short "$DOMAIN" > /dev/null; then
        error "域名 $DNS 解析失败，请先配置域名解析"
    fi
    
    # 申请证书
    sudo certbot certonly --standalone \
        -d "$DOMAIN" \
        -d "api.$DOMAIN" \
        -d "monitoring.$DOMAIN" \
        --email "$CERT_EMAIL" \
        --agree-tos \
        --non-interactive \
        --force-renewal
    
    # 复制证书到应用目录
    sudo cp /etc/letsencrypt/live/"$DOMAIN"/fullchain.pem "$SSL_DIR/fullchain.pem"
    sudo cp /etc/letsencrypt/live/"$DOMAIN"/privkey.pem "$SSL_DIR/privkey.pem"
    sudo chown $USER:$USER "$SSL_DIR"/*.pem
    sudo chmod 644 "$SSL_DIR/fullchain.pem"
    sudo chmod 600 "$SSL_DIR/privkey.pem"
    
    # 创建软链接
    ln -sf fullchain.pem "$SSL_DIR/cert.pem"
    ln -sf privkey.pem "$SSL_DIR/key.pem"
    
    log "Let's Encrypt证书申请完成"
}

# 设置自动续期
setup_auto_renewal() {
    log "设置SSL证书自动续期..."
    
    # 创建续期脚本
    cat > "$SSL_DIR/renew-cert.sh" << 'EOF'
#!/bin/bash
# SSL证书自动续期脚本

CERT_DOMAIN="ai.yourdomain.com"
SSL_DIR="/home/ai design/nginx/ssl"

# 续期证书
sudo certbot renew --quiet --no-self-upgrade

# 复制新证书
if [ -f "/etc/letsencrypt/live/$CERT_DOMAIN/fullchain.pem" ]; then
    sudo cp /etc/letsencrypt/live/$CERT_DOMAIN/fullchain.pem "$SSL_DIR/fullchain.pem"
    sudo cp /etc/letsencrypt/live/$CERT_DOMAIN/privkey.pem "$SSL_DIR/privkey.pem"
    sudo chown $USER:$USER "$SSL_DIR"/*.pem
    
    # 重启Nginx
    docker-compose restart nginx
    
    echo "$(date): SSL证书续期成功" >> "$SSL_DIR/renewal.log"
fi
EOF

    chmod +x "$SSL_DIR/renew.sh"
    
    # 添加到crontab
    (crontab -l 2>/dev/null; echo "0 3 * * * $SSL_DIR/renew-cert.sh") | crontab -
    
    log "自动续期设置完成"
}

# 验证证书
verify_certificate() {
    log "验证SSL证书..."
    
    if [ -f "$SSL_DIR/cert.pem" ]; then
        # 检查证书有效期
        expiry_date=$(openssl x509 -enddate -noout -in "$SSL_DIR/cert.pem" | cut -d= -f2)
        expiry_epoch=$(date -d "$expiry_date" +%s)
        current_epoch=$(date +%s)
        days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        if [ $days_left -gt 0 ]; then
            log "证书有效期：$days_left 天"
        else
            error "证书已过期"
        fi
        
        # 验证证书链
        if openssl verify "$SSL_DIR/cert.pem" > /dev/null 2>&1; then
            log "证书验证通过"
        else
            warn "证书验证失败（自签名证书）"
        fi
    else
        error "证书文件不存在"
    fi
}

# 创建证书监控
create_cert_monitoring() {
    log "创建证书监控配置..."
    
    # 创建Prometheus证书监控脚本
    cat > "$SSL_DIR/check-cert.sh" << 'EOF'
#!/bin/bash
# SSL证书检查脚本

CERT_FILE="/home/ai design/nginx/ssl/cert.pem"
METRIC_FILE="/home/ai design/nginx/ssl/cert_metrics.prom"

if [ -f "$CERT_FILE" ]; then
    expiry_date=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
    expiry_epoch=$(date -d "$expiry_date" +%s)
    current_epoch=$(date +%s)
    days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    # 输出Prometheus指标
    echo "# HELP ssl_certificate_days_until_expiry Days until SSL certificate expires" > "$METRIC_FILE"
    echo "# TYPE ssl_certificate_days_until_expiry gauge" >> "$METRIC_FILE"
    echo "ssl_certificate_days_until_expiry $days_left" >> "$METRIC_FILE"
    
    # 警告阈值检查
    if [ $days_left -lt 30 ]; then
        echo "# HELP ssl_certificate_expiry_warning SSL certificate expires soon" >> "$METRIC_FILE"
        echo "# TYPE ssl_certificate_expiry_warning gauge" >> "$METRIC_FILE"
        echo "ssl_certificate_expiry_warning 1" >> "$METRIC_FILE"
    else
        echo "# HELP ssl_certificate_expiry_warning SSL certificate expires soon" >> "$METRIC_FILE"
        echo "# TYPE ssl_certificate_expiry_warning gauge" >> "$METRIC_FILE"
        echo "ssl_certificate_expiry_warning 0" >> "$METRIC_FILE"
    fi
else
    echo "# HELP ssl_certificate_exists SSL certificate file exists" >> "$METRIC_FILE"
    echo "# TYPE ssl_certificate_exists gauge" >> "$METRIC_FILE"
    echo "ssl_certificate_exists 0" >> "$METRIC_FILE"
fi
EOF

    chmod +x "$SSL_DIR/check-cert.sh"
    
    # 添加到crontab（每5分钟检查一次）
    (crontab -l 2>/dev/null; echo "*/5 * * * * $SSL_DIR/check-cert.sh") | crontab -
    
    log "证书监控设置完成"
}

# 创建安全配置
create_security_config() {
    log "创建SSL安全配置..."
    
    # 创建DH参数文件
    if [ ! -f "$SSL_DIR/dhparam.pem" ]; then
        log "生成DH参数文件（需要较长时间）..."
        openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048
        chmod 600 "$SSL_DIR/dhparam.pem"
    fi
    
    # 创建安全头配置
    cat > "$SSL_DIR/security.conf" << EOF
# SSL安全配置
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_dhparam $SSL_DIR/dhparam.pem;

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# 其他安全头
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" always;
EOF

    log "安全配置创建完成"
}

# 主函数
main() {
    log "开始SSL证书配置..."
    
    check_root
    create_ssl_dir
    
    # 询问用户选择证书类型
    echo "请选择SSL证书类型："
    echo "1) Let's Encrypt证书（生产环境推荐）"
    echo "2) 自签名证书（开发测试用）"
    read -p "请输入选项 [1-2]: " choice
    
    case $choice in
        1)
            install_certbot
            request_letsencrypt_cert
            setup_auto_renewal
            ;;
        2)
            generate_self_signed_cert
            ;;
        *)
            error "无效的选项"
            ;;
    esac
    
    verify_certificate
    create_security_config
    create_cert_monitoring
    
    log "SSL证书配置完成！"
    log "证书文件位置：$SSL_DIR/"
    log "Nginx配置文件：$SSL_DIR/security.conf"
    
    if [ "$choice" = "1" ]; then
        log "Let's Encrypt证书将在到期前自动续期"
    fi
}

# 运行主函数
main "$@"