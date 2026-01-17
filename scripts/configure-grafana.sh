#!/bin/bash

# 配置Grafana数据源和仪表板
set -e

GRAFANA_URL="http://localhost:3002"
GRAFANA_USER="admin"
GRAFANA_PASSWORD="admin123"

echo "🔧 配置Grafana数据源..."

# 等待Grafana启动
echo "⏳ 等待Grafana服务就绪..."
until curl -s "$GRAFANA_URL/api/health" | grep -q "database: ok"; do
    echo "等待Grafana启动..."
    sleep 5
done

# 登录Grafana并获取API token
echo "🔑 获取API token..."
API_KEY=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"name":"api-key","role":"Admin"}' \
    -u "$GRAFANA_USER:$GRAFANA_PASSWORD" \
    "$GRAFANA_URL/api/auth/keys" | \
    grep -o '"key":"[^"]*"' | cut -d'"' -f4)

if [ -z "$API_KEY" ]; then
    echo "❌ 无法获取API token，尝试使用基础认证..."
    API_KEY=""
fi

# 添加Prometheus数据源
echo "📊 添加Prometheus数据源..."
if [ -n "$API_KEY" ]; then
    curl -s -X POST -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" \
        -d '{
            "name":"Prometheus",
            "type":"prometheus",
            "url":"http://aidesign_prometheus:9090",
            "access":"proxy",
            "isDefault":true,
            "editable":true
        }' \
        "$GRAFANA_URL/api/datasources"
else
    curl -s -X POST -u "$GRAFANA_USER:$GRAFANA_PASSWORD" -H "Content-Type: application/json" \
        -d '{
            "name":"Prometheus",
            "type":"prometheus",
            "url":"http://aidesign_prometheus:9090",
            "access":"proxy",
            "isDefault":true,
            "editable":true
        }' \
        "$GRAFANA_URL/api/datasources"
fi

echo "✅ Grafana配置完成！"
echo ""
echo "📈 访问地址:"
echo "  Grafana: http://localhost:3002"
echo "    用户名: $GRAFANA_USER"
echo "    密码: $GRAFANA_PASSWORD"
echo ""
echo "  Prometheus: http://localhost:9090"
echo "  AlertManager: http://localhost:9093"
echo "  Node Exporter: http://localhost:9100/metrics"
echo ""
echo "📝 下一步步骤:"
echo "1. 在Grafana中导入或创建仪表板"
echo "2. 配置告警规则和通知渠道"
echo "3. 验证监控数据正常收集"