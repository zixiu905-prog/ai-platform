#!/bin/bash

# AI设计平台生产环境部署准备脚本
set -e

echo "🚀 AI设计平台生产环境部署准备"
echo "=================================="
echo "准备时间: $(date)"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_PATH="/home/ai design"
cd "$PROJECT_PATH"

echo -e "${BLUE}1. 生产环境变量配置${NC}"

# 生成生产环境安全配置
echo "🔧 生成生产环境配置..."

# 生成强密码
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
SESSION_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
N8N_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-12)

# 更新生产环境配置
sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
sed -i "s/N8N_PASSWORD=.*/N8N_PASSWORD=$N8N_PASSWORD/" .env

# 设置生产环境优化参数
echo "📊 设置性能优化参数..."

# 数据库连接池优化
cat >> .env << EOF

# 生产环境性能优化
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_CONNECTION_TIMEOUT=30000
DB_QUERY_TIMEOUT=10000

# Redis缓存优化
REDIS_MAX_CONNECTIONS=20
REDIS_POOL_MIN=5
REDIS_POOL_MAX=20
CACHE_TTL=7200

# 应用性能优化
NODE_OPTIONS=--max-old-space-size=4096
UV_THREADPOOL_SIZE=16
CLUSTER_WORKERS=4

# 负载均衡
ENABLE_CLUSTER=true
CLUSTER_MODE=true
WORKER_PROCESSES=auto

# 安全优化
RATE_LIMIT_WINDOW_MS=300000
RATE_LIMIT_MAX_REQUESTS=50
ENABLE_HELMET=true
ENABLE_CORS=true
CORS_ORIGIN=https://yourdomain.com

# 日志优化
LOG_LEVEL=warn
LOG_MAX_SIZE=50m
LOG_MAX_FILES=10
ENABLE_REQUEST_LOGGING=false
ENABLE_PERFORMANCE_LOGGING=true

# 监控优化
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30
PERFORMANCE_MONITORING=true

# SSL优化
SSL_PROTOCOLS=TLSv1.2,TLSv1.3
SSL_CIPHERS=ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256
SSL_SESSION_TIMEOUT=300

# 备份优化
BACKUP_RETENTION_DAYS=90
BACKUP_COMPRESSION=true
BACKUP_ENCRYPTION=true

EOF

echo -e "${GREEN}✅ 生产环境配置完成${NC}"

echo -e "${BLUE}2. 创建生产环境Docker配置${NC}"

# 创建生产环境docker-compose配置
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: aidesign_postgres_prod
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    ports:
      - "127.0.0.1:5432:5432"
    networks:
      - aidesign_prod_network
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'

  redis:
    image: redis:7-alpine
    container_name: aidesign_redis_prod
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes --maxmemory 1gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_prod_data:/data
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf
    ports:
      - "127.0.0.1:6379:6379"
    networks:
      - aidesign_prod_network
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: aidesign_backend_prod
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - PORT=${PORT}
      - DOMAIN=${DOMAIN}
    volumes:
      - ./backend:/app
      - /app/node_modules
      - uploads_prod_data:/app/uploads
      - logs_prod_data:/app/logs
    ports:
      - "127.0.0.1:${PORT}:${PORT}"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - aidesign_prod_network
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${PORT}/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    container_name: aidesign_frontend_prod
    environment:
      - REACT_APP_API_URL=https://${DOMAIN}/api
      - REACT_APP_N8N_URL=https://n8n.${DOMAIN}
      - REACT_APP_WS_URL=wss://${DOMAIN}
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "127.0.0.1:${FRONTEND_PORT}:${FRONTEND_PORT}"
    depends_on:
      - backend
    networks:
      - aidesign_prod_network
    restart: always
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'

  nginx:
    image: nginx:alpine
    container_name: aidesign_nginx_prod
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
      - downloads_prod_data:/usr/share/nginx/html/downloads
      - uploads_prod_data:/usr/share/nginx/html/uploads
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
      - backend
    networks:
      - aidesign_prod_network
    restart: always
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.25'
        reservations:
          memory: 256M
          cpus: '0.1'

volumes:
  postgres_prod_data:
  redis_prod_data:
  uploads_prod_data:
  downloads_prod_data:
  logs_prod_data:

networks:
  aidesign_prod_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.21.0.0/16
EOF

echo -e "${GREEN}✅ 生产环境Docker配置完成${NC}"

echo -e "${BLUE}3. 创建性能监控脚本${NC}"

# 创建性能监控脚本
cat > scripts/performance-monitor.sh << 'EOF'
#!/bin/bash

# 生产环境性能监控脚本
echo "📊 系统性能监控报告"
echo "=================="
echo "监控时间: $(date)"
echo ""

# CPU和内存使用情况
echo "🖥️  CPU和内存使用:"
echo "CPU负载: $(uptime | awk -F'load average:' '{print $2}')"
echo "内存使用: $(free -h | awk 'NR==2{printf "已用: %s, 可用: %s (%.1f%%)", $3,$7,$3/$2*100}')"
echo ""

# 磁盘使用情况
echo "💾 磁盘使用情况:"
df -h | grep -E "^/dev/" | awk '{printf "%-20s %5s %5s %5s %s\n", $1, $3, $2, $5, $6}'
echo ""

# Docker容器资源使用
echo "🐳 Docker容器资源使用:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | head -10
echo ""

# 网络连接状态
echo "🌐 网络连接状态:"
ss -tuln | head -10
echo ""

# 进程检查
echo "⚙️  关键进程检查:"
ps aux | grep -E "(nginx|node|postgres|redis)" | grep -v grep | wc -l | xargs echo "运行中的服务进程数:"
echo ""
EOF

chmod +x scripts/performance-monitor.sh

echo -e "${GREEN}✅ 性能监控脚本创建完成${NC}"

echo -e "${BLUE}4. 创建部署检查清单${NC}"

# 创建部署检查清单
cat > DEPLOYMENT_CHECKLIST.md << 'EOF'
# AI设计平台生产环境部署检查清单

## 🚀 部署前检查

### 环境准备
- [ ] 服务器规格满足最低要求 (8GB RAM, 4 CPU, 100GB Storage)
- [ ] 操作系统更新到最新版本
- [ ] Docker和Docker Compose已安装
- [ ] 防火墙规则已配置
- [ ] SSL证书已准备

### 配置检查
- [ ] 环境变量文件已配置 (.env)
- [ ] 数据库连接信息已验证
- [ ] Redis连接信息已验证
- [ ] API密钥和服务配置已设置
- [ ] 域名和DNS解析已配置

### 安全检查
- [ ] 强密码已生成并配置
- [ ] SSL证书有效期检查
- [ ] 文件权限已设置
- [ ] 防火墙端口已开放
- [ ] 备份策略已配置

## 🔄 部署过程

### 服务部署
- [ ] 数据库容器启动并健康检查通过
- [ ] Redis容器启动并健康检查通过
- [ ] 后端服务启动并健康检查通过
- [ ] 前端服务启动并健康检查通过
- [ ] Nginx反向代理启动并健康检查通过

### 验证测试
- [ ] HTTPS访问正常
- [ ] API接口响应正常
- [ ] 用户认证功能正常
- [ ] 数据库连接正常
- [ ] 缓存服务正常

## 📊 部署后验证

### 功能测试
- [ ] 用户注册登录功能
- [ ] AI对话功能
- [ ] 图像生成功能
- [ ] 语音识别功能
- [ ] 工作流功能
- [ ] 支付功能

### 性能测试
- [ ] 页面加载速度 < 3秒
- [ ] API响应时间 < 1秒
- [ ] 数据库查询优化
- [ ] 内存使用率 < 80%
- [ ] CPU使用率 < 70%

### 监控配置
- [ ] 监控系统正常运行
- [ ] 告警规则已配置
- [ ] 日志收集正常
- [ ] 性能指标监控
- [ ] 错误率监控

## 🔧 运维准备

### 备份恢复
- [ ] 数据库备份策略
- [ ] 文件备份策略
- [ ] 配置备份策略
- [ ] 恢复流程测试
- [ ] 异地备份配置

### 安全运维
- [ ] 安全审计日志
- [ ] 访问控制配置
- [ ] 漏洞扫描配置
- [ ] 安全更新计划
- [ ] 应急响应流程

### 文档准备
- [ ] 部署文档完整
- [ ] 运维手册更新
- [ ] 故障排查指南
- [ ] 用户使用指南
- [ ] API接口文档
EOF

echo -e "${GREEN}✅ 部署检查清单创建完成${NC}"

echo -e "${BLUE}5. 创建生产环境启动脚本${NC}"

# 创建生产环境启动脚本
cat > scripts/start-production.sh << 'EOF'
#!/bin/bash

# 生产环境启动脚本
set -e

echo "🚀 启动AI设计平台生产环境..."
echo "启动时间: $(date)"
echo ""

PROJECT_PATH="/home/ai design"
cd "$PROJECT_PATH"

# 检查环境
echo "1. 检查部署环境..."
if [ ! -f ".env" ]; then
    echo "❌ 环境变量文件不存在"
    exit 1
fi

if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ 生产环境Docker配置不存在"
    exit 1
fi

echo "✅ 环境检查通过"

# 拉取最新镜像
echo "2. 拉取最新镜像..."
docker-compose -f docker-compose.prod.yml pull

# 构建应用镜像
echo "3. 构建应用镜像..."
docker-compose -f docker-compose.prod.yml build

# 启动数据库和Redis
echo "4. 启动基础服务..."
docker-compose -f docker-compose.prod.yml up -d postgres redis

# 等待基础服务就绪
echo "5. 等待基础服务就绪..."
sleep 30

# 启动应用服务
echo "6. 启动应用服务..."
docker-compose -f docker-compose.prod.yml up -d backend frontend

# 等待应用服务就绪
echo "7. 等待应用服务就绪..."
sleep 30

# 启动Nginx
echo "8. 启动反向代理..."
docker-compose -f docker-compose.prod.yml up -d nginx

# 健康检查
echo "9. 执行健康检查..."
sleep 30

# 检查服务状态
echo "📊 服务状态检查:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🎉 生产环境启动完成！"
echo ""
echo "📋 管理命令:"
echo "- 查看状态: docker-compose -f docker-compose.prod.yml ps"
echo "- 查看日志: docker-compose -f docker-compose.prod.yml logs -f"
echo "- 停止服务: docker-compose -f docker-compose.prod.yml down"
echo "- 重启服务: docker-compose -f docker-compose.prod.yml restart"
echo ""
echo "🔍 监控地址:"
echo "- 应用地址: https://yourdomain.com"
echo "- 监控面板: http://localhost:3002"
echo "- 性能监控: ./scripts/performance-monitor.sh"
EOF

chmod +x scripts/start-production.sh

echo -e "${GREEN}✅ 生产环境启动脚本创建完成${NC}"

echo ""
echo -e "${GREEN}🎉 生产环境部署准备完成！${NC}"
echo ""
echo "📋 准备完成的组件:"
echo "✅ 生产环境变量配置优化"
echo "✅ 生产环境Docker配置"
echo "✅ 性能监控脚本"
echo "✅ 部署检查清单"
echo "✅ 生产环境启动脚本"
echo ""
echo "🚀 下一步操作:"
echo "1. 检查部署清单: cat DEPLOYMENT_CHECKLIST.md"
echo "2. 启动生产环境: ./scripts/start-production.sh"
echo "3. 执行性能监控: ./scripts/performance-monitor.sh"
echo ""
echo -e "${YELLOW}⚠️  重要提醒:${NC}"
echo "1. 请先配置域名和DNS解析"
echo "2. 确保SSL证书已准备就绪"
echo "3. 检查防火墙和网络配置"
echo "4. 执行完整的部署前检查"