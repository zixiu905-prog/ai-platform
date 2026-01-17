#!/bin/bash

# AI设计平台监控部署脚本
# 用于部署完整的监控和告警系统

set -e

echo "🚀 开始部署AI设计平台监控系统..."

# 检查Docker和Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 设置环境变量
export COMPOSE_PROJECT_NAME="ai-platform-monitoring"
export MONITORING_DIR="/home/ai design/monitoring"

# 创建监控目录
echo "📁 创建监控目录结构..."
mkdir -p $MONITORING_DIR/{prometheus,grafana,alertmanager,loki,tempo}

# 创建环境变量文件
cat > $MONITORING_DIR/.env << EOF
# SMTP邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@aiplatform.com
SMTP_PASSWORD=your_smtp_password

# Slack通知配置
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# 微信通知配置
WECHAT_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send
WECHAT_CORP_ID=your_corp_id
WECHAT_AGENT_ID=your_agent_id
WECHAT_API_SECRET=your_api_secret

# Webhook配置
WEBHOOK_TOKEN=your_secure_webhook_token

# Grafana配置
GF_SECURITY_ADMIN_PASSWORD=admin123
GF_USERS_ALLOW_SIGN_UP=false
GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-worldmap-panel

# 数据库配置
POSTGRES_PASSWORD=your_postgres_password
EOF

echo "🔧 配置Prometheus..."
# 复制Prometheus配置
cp $MONITORING_DIR/prometheus/prometheus.yml $MONITORING_DIR/prometheus/
cp $MONITORING_DIR/prometheus/alert_rules.yml $MONITORING_DIR/prometheus/

echo "📊 配置Grafana..."
# 创建Grafana配置目录
mkdir -p $MONITORING_DIR/grafana/{provisioning/datasources,provisioning/dashboards,dashboards}

# 复制Grafana配置
cp $MONITORING_DIR/grafana/provisioning/datasources/production.yml $MONITORING_DIR/grafana/provisioning/datasources/
cp $MONITORING_DIR/grafana/provisioning/dashboards/production-dashboards.yml $MONITORING_DIR/grafana/provisioning/dashboards/

echo "🚨 配置AlertManager..."
# 复制AlertManager配置
cp $MONITORING_DIR/alertmanager/alertmanager.yml $MONITORING_DIR/alertmanager/

# 创建监控Docker Compose文件
cat > $MONITORING_DIR/docker-compose.monitoring.yml << 'EOF'
version: '3.8'

services:
  # Prometheus监控
  prometheus:
    image: prom/prometheus:latest
    container_name: ai-platform-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'
    networks:
      - monitoring

  # AlertManager告警管理
  alertmanager:
    image: prom/alertmanager:latest
    container_name: ai-platform-alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager:/etc/alertmanager
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - monitoring

  # Grafana可视化
  grafana:
    image: grafana/grafana:latest
    container_name: ai-platform-grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GF_SECURITY_ADMIN_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=${GF_USERS_ALLOW_SIGN_UP}
      - GF_INSTALL_PLUGINS=${GF_INSTALL_PLUGINS}
      - GF_PATHS_PROVISIONING=/etc/grafana/provisioning
    networks:
      - monitoring
    depends_on:
      - prometheus

  # Node Exporter系统监控
  node-exporter:
    image: prom/node-exporter:latest
    container_name: ai-platform-node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring

  # Redis Exporter
  redis-exporter:
    image: oliver006/redis_exporter:latest
    container_name: ai-platform-redis-exporter
    restart: unless-stopped
    ports:
      - "9121:9121"
    environment:
      - REDIS_ADDR=redis://redis:6379
    networks:
      - monitoring

  # PostgreSQL Exporter
  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: ai-platform-postgres-exporter
    restart: unless-stopped
    ports:
      - "9187:9187"
    environment:
      - DATA_SOURCE_NAME=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/postgres?sslmode=disable
    networks:
      - monitoring

  # cAdvisor容器监控
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: ai-platform-cadvisor
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    privileged: true
    devices:
      - /dev/kmsg
    networks:
      - monitoring

  # Loki日志聚合
  loki:
    image: grafana/loki:latest
    container_name: ai-platform-loki
    restart: unless-stopped
    ports:
      - "3100:3100"
    volumes:
      - ./loki:/etc/loki
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - monitoring

  # Tempo分布式追踪
  tempo:
    image: grafana/tempo:latest
    container_name: ai-platform-tempo
    restart: unless-stopped
    ports:
      - "3200:3200"
      - "4317:4317"  # OTLP gRPC receiver
      - "4318:4318"  # OTLP HTTP receiver
    volumes:
      - ./tempo:/etc/tempo
      - tempo_data:/tmp/tempo
    command: -config.file=/etc/tempo/config.yaml
    networks:
      - monitoring

volumes:
  prometheus_data:
  alertmanager_data:
  grafana_data:
  loki_data:
  tempo_data:

networks:
  monitoring:
    driver: bridge
EOF

echo "🔥 启动监控系统..."
cd $MONITORING_DIR

# 启动监控服务
docker-compose -f docker-compose.monitoring.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose -f docker-compose.monitoring.yml ps

# 验证Prometheus配置
echo "✅ 验证Prometheus配置..."
curl -s http://localhost:9090/-/healthy | jq . >/dev/null 2>&1 && echo "✅ Prometheus健康" || echo "❌ Prometheus异常"

# 验证Grafana配置
echo "✅ 验证Grafana配置..."
curl -s http://localhost:3000/api/health | jq . >/dev/null 2>&1 && echo "✅ Grafana健康" || echo "❌ Grafana异常"

# 验证AlertManager配置
echo "✅ 验证AlertManager配置..."
curl -s http://localhost:9093/-/healthy | jq . >/dev/null 2>&1 && echo "✅ AlertManager健康" || echo "❌ AlertManager异常"

echo ""
echo "🎉 监控系统部署完成！"
echo ""
echo "📊 访问地址："
echo "   - Prometheus: http://localhost:9090"
echo "   - Grafana: http://localhost:3000 (admin/admin123)"
echo "   - AlertManager: http://localhost:9093"
echo "   - cAdvisor: http://localhost:8080"
echo "   - Loki: http://localhost:3100"
echo "   - Tempo: http://localhost:3200"
echo ""
echo "📝 配置文件位置："
echo "   - Prometheus配置: $MONITORING_DIR/prometheus/"
echo "   - Grafana配置: $MONITORING_DIR/grafana/"
echo "   - AlertManager配置: $MONITORING_DIR/alertmanager/"
echo ""
echo "🔧 下一步操作："
echo "   1. 更新.env文件中的实际配置"
echo "   2. 导入Grafana仪表板"
echo "   3. 配置告警通知渠道"
echo "   4. 测试告警规则"
echo ""
echo "🚨 告警测试命令："
echo "   curl -X POST http://localhost:9093/api/v1/alerts -d '[{\"labels\":{\"alertname\":\"TestAlert\",\"severity\":\"warning\"}}]'"
EOF

chmod +x /home/ai\ design/scripts/deploy-monitoring.sh

echo "✅ 任务1完成：生产监控体系配置完成"