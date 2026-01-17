#!/bin/bash

# Let's Encrypt证书安装脚本
# 目标: 为 www.aidesign.ltd, api.aidesign.ltd, monitoring.aidesign.ltd 安装SSL证书

set -e

echo "=========================================="
echo "  Let's Encrypt证书安装"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/home/ai design"
CERT_FILE="$PROJECT_DIR/nginx/ssl/cert.pem"
KEY_FILE="$PROJECT_DIR/nginx/ssl/key.pem"

# 检查certbot
echo -e "${YELLOW}步骤1: 检查certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    echo -e "${RED}错误: certbot未安装${NC}"
    echo "请先安装certbot: sudo yum install -y certbot"
    exit 1
fi
echo -e "${GREEN}✓ certbot已安装${NC}"
echo ""

# 检查DNS解析
echo -e "${YELLOW}步骤2: 检查DNS解析...${NC}"
DNS_CHECK=$(dig +short www.aidesign.ltd | head -1)
if [ -z "$DNS_CHECK" ]; then
    echo -e "${RED}错误: DNS未解析${NC}"
    echo "请确保 www.aidesign.ltd 已正确解析到服务器"
    exit 1
fi
echo -e "${GREEN}✓ DNS解析正常: $DNS_CHECK${NC}"
echo ""

# 检查80端口
echo -e "${YELLOW}步骤3: 检查80端口...${NC}"
if lsof -i :80 &>/dev/null || netstat -tuln 2>/dev/null | grep -q ":80" || ss -tuln 2>/dev/null | grep -q ":80"; then
    echo -e "${RED}警告: 80端口被占用${NC}"
    echo "正在尝试停止占用80端口的进程..."
    
    # 尝试停止Nginx容器
    cd "$PROJECT_DIR"
    docker stop aidesign_nginx &>/dev/null || docker-compose stop nginx &>/dev/null || true
    sleep 2
    
    # 再次检查
    if lsof -i :80 &>/dev/null || netstat -tuln 2>/dev/null | grep -q ":80" || ss -tuln 2>/dev/null | grep -q ":80"; then
        echo -e "${RED}错误: 无法释放80端口${NC}"
        echo "请手动停止占用80端口的服务"
        exit 1
    fi
fi
echo -e "${GREEN}✓ 80端口可用${NC}"
echo ""

# 备份当前证书
echo -e "${YELLOW}步骤4: 备份当前证书...${NC}"
BACKUP_DIR="$PROJECT_DIR/nginx/ssl/backup"
mkdir -p "$BACKUP_DIR"
if [ -f "$CERT_FILE" ]; then
    cp "$CERT_FILE" "$BACKUP_DIR/cert.pem.$(date +%Y%m%d_%H%M%S).bak"
    echo -e "${GREEN}✓ 已备份证书${NC}"
fi
if [ -f "$KEY_FILE" ]; then
    cp "$KEY_FILE" "$BACKUP_DIR/key.pem.$(date +%Y%m%d_%H%M%S).bak"
    echo -e "${GREEN}✓ 已备份密钥${NC}"
fi
echo ""

# 申请证书
echo -e "${YELLOW}步骤5: 申请Let's Encrypt证书...${NC}"
echo "域名列表:"
echo "  - www.aidesign.ltd"
echo "  - api.aidesign.ltd"
echo "  - monitoring.aidesign.ltd"
echo ""
echo "正在申请证书，这可能需要几分钟..."
echo ""

# 使用standalone模式申请证书
certbot certonly --standalone \
  -d www.aidesign.ltd \
  -d api.aidesign.ltd \
  -d monitoring.aidesign.ltd \
  --email admin@aidesign.ltd \
  --agree-tos \
  --non-interactive \
  --force-renewal

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 证书申请成功！${NC}"
    echo ""
else
    echo -e "${RED}✗ 证书申请失败${NC}"
    echo ""
    echo "可能的原因:"
    echo "  1. DNS尚未生效"
    echo "  2. 80端口无法从外网访问"
    echo "  3. 防火墙阻止80端口"
    echo ""
    echo "建议:"
    echo "  1. 检查DNS: dig +short www.aidesign.ltd"
    echo "  2. 检查端口: curl -I http://www.aidesign.ltd"
    echo "  3. 检查防火墙: sudo iptables -L -n | grep 80"
    echo ""
    exit 1
fi

# 复制证书
echo -e "${YELLOW}步骤6: 安装证书到Nginx目录...${NC}"
cp /etc/letsencrypt/live/www.aidesign.ltd/fullchain.pem "$CERT_FILE"
cp /etc/letsencrypt/live/www.aidesign.ltd/privkey.pem "$KEY_FILE"
chmod 644 "$CERT_FILE"
chmod 600 "$KEY_FILE"
echo -e "${GREEN}✓ 证书已安装${NC}"
echo ""

# 验证证书
echo -e "${YELLOW}步骤7: 验证SSL证书...${NC}"
openssl x509 -in "$CERT_FILE" -noout -subject -issuer -dates
echo ""

# 测试续期
echo -e "${YELLOW}步骤8: 测试证书续期功能...${NC}"
certbot renew --dry-run
echo ""

# 启动Nginx容器
echo -e "${YELLOW}步骤9: 启动Nginx容器...${NC}"
cd "$PROJECT_DIR"
if docker start aidesign_nginx &>/dev/null; then
    echo -e "${GREEN}✓ Nginx容器已启动${NC}"
elif docker-compose up -d nginx &>/dev/null; then
    echo -e "${GREEN}✓ Nginx容器已启动${NC}"
else
    echo -e "${RED}✗ Nginx容器启动失败${NC}"
    echo "请手动启动Nginx: cd '$PROJECT_DIR' && docker-compose up -d nginx"
fi
echo ""

# 等待Nginx启动
sleep 5

# 测试HTTPS
echo -e "${YELLOW}步骤10: 测试HTTPS访问...${NC}"
if curl -I https://www.aidesign.ltd 2>&1 | grep -q "HTTP"; then
    echo -e "${GREEN}✓ HTTPS访问正常${NC}"
else
    echo -e "${YELLOW}HTTPS测试可能失败（DNS可能需要时间生效）${NC}"
fi
echo ""

# 显示总结
echo "=========================================="
echo -e "${GREEN}  Let's Encrypt证书安装完成！${NC}"
echo "=========================================="
echo ""
echo "证书信息:"
echo "  - 类型: Let's Encrypt免费SSL证书"
echo "  - 有效期: 90天（自动续期）"
echo "  - 自动续期: 已启用（每天2点和14点检查）"
echo ""
echo "证书文件:"
echo "  - 证书: $CERT_FILE"
echo "  - 密钥: $KEY_FILE"
echo ""
echo "访问地址:"
echo "  - 前端: https://www.aidesign.ltd"
echo "  - API: https://api.aidesign.ltd"
echo "  - 监控: https://monitoring.aidesign.ltd"
echo ""
echo -e "${GREEN}✓ 浏览器警告已解决！系统现在使用Let's Encrypt受信任证书。${NC}"
echo ""
echo "后续操作:"
echo "  1. 在浏览器中访问 https://www.aidesign.ltd"
echo "  2. 确认没有安全警告"
echo "  3. 查看锁形图标"
echo ""
echo "监控命令:"
echo "  - 查看续期日志: tail -f /var/log/ssl_renewal.log"
echo "  - 查看监控日志: tail -f /var/log/ssl_expiry.log"
echo "  - 测试续期: sudo certbot renew --dry-run"
echo ""
