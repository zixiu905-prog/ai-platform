#!/bin/bash

# AI设计平台安全加固脚本
set -e

echo "🔒 开始AI设计平台安全加固..."
echo "加固时间: $(date)"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}1. 配置文件安全加固${NC}"

# 1. 设置环境变量文件权限
echo "📁 设置环境文件权限..."
chmod 600 .env
chmod 600 .env.production

# 2. 创建生产环境强密码
echo "🔑 生成生产环境安全密码..."
SECURE_POSTGRES_PASSWORD=$(openssl rand -base64 32)
SECURE_REDIS_PASSWORD=$(openssl rand -base64 32)
SECURE_JWT_SECRET=$(openssl rand -base64 64)
SECURE_N8N_PASSWORD=$(openssl rand -base64 16)

# 3. 更新环境变量为强密码
echo "📝 更新环境变量..."
sed -i "s/your_strong_postgres_password_here/$SECURE_POSTGRES_PASSWORD/g" .env
sed -i "s/your_strong_redis_password_here/$SECURE_REDIS_PASSWORD/g" .env
sed -i "s/your_strong_jwt_secret_key_here_at_least_32_chars/$SECURE_JWT_SECRET/g" .env
sed -i "s/your_strong_n8n_password/$SECURE_N8N_PASSWORD/g" .env

echo -e "${GREEN}✅ 密码更新完成${NC}"

# 4. Docker安全配置
echo -e "${BLUE}2. Docker安全配置${NC}"

# 检查Docker用户权限
echo "🐳 检查Docker用户配置..."
if ! groups $USER | grep -q docker; then
    echo "⚠️  用户不在docker组中，考虑添加用户到docker组"
fi

# 5. 防火墙配置
echo -e "${BLUE}3. 防火墙配置${NC}"
echo "🛡️  配置防火墙规则..."

# 创建UFW规则文件
cat > /tmp/ai-platform-ufw.rules << 'EOF'
# AI设计平台防火墙规则
*filter
:INPUT ACCEPT [0:0]
:FORWARD ACCEPT [0:0]
:OUTPUT ACCEPT [0:0]

# 允许本地回环
-A INPUT -i lo -j ACCEPT

# 允许已建立的连接
-A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# 允许SSH
-A INPUT -p tcp --dport 22 -j ACCEPT

# 允许HTTP/HTTPS
-A INPUT -p tcp --dport 80 -j ACCEPT
-A INPUT -p tcp --dport 443 -j ACCEPT

# 限制监控端口访问（仅本地）
-A INPUT -p tcp --dport 3002 -s 127.0.0.1 -j ACCEPT
-A INPUT -p tcp --dport 9090 -s 127.0.0.1 -j ACCEPT
-A INPUT -p tcp --dport 9093 -s 127.0.0.1 -j ACCEPT
-A INPUT -p tcp --dport 9100 -s 127.0.0.1 -j ACCEPT

# 拒绝其他连接
-A INPUT -j DROP
COMMIT
EOF

echo "📋 防火墙规则已准备，使用以下命令应用："
echo "sudo iptables-restore < /tmp/ai-platform-ufw.rules"

# 6. SSL证书检查
echo -e "${BLUE}4. SSL证书安全检查${NC}"
if [ -f "nginx/ssl/cert.pem" ]; then
    EXPIRY=$(openssl x509 -in nginx/ssl/cert.pem -noout -enddate | cut -d= -f2)
    echo "📅 SSL证书到期时间: $EXPIRY"
    
    # 检查证书是否在30天内过期
    EXPIRY_TIMESTAMP=$(date -d "$EXPIRY" +%s)
    CURRENT_TIMESTAMP=$(date +%s)
    DAYS_LEFT=$(( ($EXPIRY_TIMESTAMP - $CURRENT_TIMESTAMP) / 86400 ))
    
    if [ $DAYS_LEFT -lt 30 ]; then
        echo -e "${RED}⚠️  SSL证书将在 $DAYS_LEFT 天后过期，请及时更新！${NC}"
    else
        echo -e "${GREEN}✅ SSL证书有效，还有 $DAYS_LEFT 天${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  SSL证书文件不存在${NC}"
fi

# 7. 数据库安全检查
echo -e "${BLUE}5. 数据库安全检查${NC}"
echo "🗄️  检查PostgreSQL配置..."

if docker ps | grep -q aidesign_postgres; then
    echo "✅ PostgreSQL容器运行中"
    # 检查是否允许远程连接
    docker exec aidesign_postgres cat /var/lib/postgresql/data/pg_hba.conf 2>/dev/null | grep -v "^#" | head -5 || echo "无法访问pg_hba.conf"
else
    echo -e "${YELLOW}⚠️  PostgreSQL容器未运行${NC}"
fi

# 8. 创建安全监控配置
echo -e "${BLUE}6. 安全监控配置${NC}"
cat > monitoring/security-rules.yml << 'EOF'
groups:
  - name: security_alerts
    rules:
      - alert: FailedLoginAttempts
        expr: increase(login_failures_total[5m]) > 10
        for: 2m
        labels:
          severity: warning
          category: security
        annotations:
          summary: "登录失败次数过多"
          description: "5分钟内登录失败次数超过10次"

      - alert: UnauthorizedAPICalls
        expr: increase(http_requests_total{status="401"}[5m]) > 20
        for: 1m
        labels:
          severity: warning
          category: security
        annotations:
          summary: "未授权API调用"
          description: "5分钟内401错误超过20次"

      - alert: SensitiveDataAccess
        expr: increase(sensitive_data_access_total[10m]) > 5
        for: 0m
        labels:
          severity: critical
          category: security
        annotations:
          summary: "敏感数据访问异常"
          description: "10分钟内敏感数据访问次数异常"
EOF

echo "📊 安全监控规则已创建"

# 9. 生成安全报告
echo -e "${BLUE}7. 生成安全报告${NC}"
REPORT_FILE="/tmp/security_hardening_$(date +%Y%m%d_%H%M%S).txt"

{
echo "AI设计平台安全加固报告"
echo "======================"
echo "加固时间: $(date)"
echo "加固主机: $(hostname)"
echo ""
echo "已执行的加固措施:"
echo "✅ 环境变量文件权限设置 (600)"
echo "✅ 生成强密码并更新配置"
echo "✅ Docker安全配置检查"
echo "✅ 防火墙规则准备"
echo "✅ SSL证书安全检查"
echo "✅ 数据库安全检查"
echo "✅ 安全监控规则配置"
echo ""
echo "重要提醒:"
echo "1. 请手动应用防火墙规则"
echo "2. 监控SSL证书有效期"
echo "3. 定期更新密码"
echo "4. 配置日志监控"
} > $REPORT_FILE

echo -e "${GREEN}✅ 安全加固完成！${NC}"
echo "📄 详细报告: $REPORT_FILE"
echo ""
echo -e "${YELLOW}⚠️  重要提醒:${NC}"
echo "1. 请备份当前密码配置"
echo "2. 手动应用防火墙规则"
echo "3. 重启相关服务以应用新密码"
echo "4. 配置自动化安全扫描"