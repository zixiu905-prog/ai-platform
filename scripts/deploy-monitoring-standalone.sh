#!/bin/bash

# 部署监控系统脚本
set -e

echo "🚀 开始部署AI设计平台监控系统..."

# 创建网络
echo "📡 创建Docker网络..."
docker network create aidesign_monitoring 2>/dev/null || echo "网络已存在"

# 创建数据卷
echo "💾 创建数据卷..."
docker volume create prometheus_data 2>/dev/null || echo "prometheus数据卷已存在"
docker volume create grafana_data 2>/dev/null || echo "grafana数据卷已存在"
docker volume create alertmanager_data 2>/dev/null || echo "alertmanager数据卷已存在"

# 启动 Prometheus
echo "📊 启动 Prometheus..."
docker run -d \
  --name aidesign_prometheus \
  --network aidesign_monitoring \
  -p 9090:9090 \
  -v prometheus_data:/prometheus \
  -v "/home/ai design/monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml" \
  -v "/home/ai design/monitoring/prometheus/alert_rules.yml:/etc/prometheus/alert_rules.yml" \
  --restart unless-stopped \
  prom/prometheus:latest \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --storage.tsdb.retention.time=200h \
  --web.enable-lifecycle

# 启动 AlertManager
echo "🚨 启动 AlertManager..."
docker run -d \
  --name aidesign_alertmanager \
  --network aidesign_monitoring \
  -p 9093:9093 \
  -v alertmanager_data:/alertmanager \
  -v "/home/ai design/monitoring/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml" \
  --restart unless-stopped \
  prom/alertmanager:latest \
  --config.file=/etc/alertmanager/alertmanager.yml \
  --storage.path=/alertmanager \
  --web.enable-lifecycle

# 启动 Grafana
echo "📈 启动 Grafana..."
docker run -d \
  --name aidesign_grafana \
  --network aidesign_monitoring \
  -p 3002:3000 \
  -v grafana_data:/var/lib/grafana \
  -v "/home/ai design/monitoring/grafana/provisioning:/etc/grafana/provisioning" \
  -e "GF_SECURITY_ADMIN_PASSWORD=admin123" \
  -e "GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-worldmap-panel" \
  --restart unless-stopped \
  grafana/grafana:latest

# 启动 Node Exporter
echo "🖥️ 启动 Node Exporter..."
docker run -d \
  --name aidesign_node_exporter \
  --network aidesign_monitoring \
  -p 9100:9100 \
  --pid=host \
  -v "/:/host:ro,rslave" \
  --restart unless-stopped \
  prom/node-exporter:latest \
  --path.rootfs=/host \
  --path.procfs=/host/proc \
  --path.sysfs=/host/sys \
  --collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep aidesign

# 显示访问信息
echo ""
echo "✅ 监控系统部署完成！"
echo ""
echo "📊 Prometheus 访问地址: http://localhost:9090"
echo "📈 Grafana 访问地址: http://localhost:3002"
echo "   - 用户名: admin"
echo "   - 密码: admin123"
echo "🚨 AlertManager 访问地址: http://localhost:9093"
echo "🖥️ Node Exporter: http://localhost:9100/metrics"
echo ""
echo "📝 下一步："
echo "1. 访问 Grafana 并配置数据源: http://localhost:3002"
echo "2. 导入预配置的仪表板"
echo "3. 配置告警通知规则"
echo ""

# 显示实时日志
echo "📺 查看服务日志 (Ctrl+C 退出):"
echo "Prometheus: docker logs -f aidesign_prometheus"
echo "Grafana: docker logs -f aidesign_grafana"
echo "AlertManager: docker logs -f aidesign_alertmanager"