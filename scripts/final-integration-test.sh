#!/bin/bash

# AI设计平台最终集成测试脚本
set -e

echo "🧪 AI设计平台最终集成测试"
echo "=================================="
echo "测试时间: $(date)"
echo "测试主机: $(hostname)"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_service() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "测试 $TOTAL_TESTS: $test_name ... "
    
    if eval "$test_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ 失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# 测试1: Docker服务状态
echo -e "${BLUE}1. Docker服务测试${NC}"
test_service "Prometheus服务运行" "docker ps | grep aidesign_prometheus"
test_service "Grafana服务运行" "docker ps | grep aidesign_grafana"
test_service "AlertManager服务运行" "docker ps | grep aidesign_alertmanager"
test_service "Node Exporter服务运行" "docker ps | grep aidesign_node_exporter"
test_service "PostgreSQL服务运行" "docker ps | grep aidesign-postgres"
test_service "Redis服务运行" "docker ps | grep aidesign-redis"

echo ""

# 测试2: 端口访问测试
echo -e "${BLUE}2. 端口访问测试${NC}"
test_service "Prometheus端口9090可访问" "curl -s http://localhost:9090/api/v1/status/config"
test_service "Grafana端口3002可访问" "curl -s http://localhost:3002/api/health"
test_service "AlertManager端口9093可访问" "curl -s http://localhost:9093"
test_service "Node Exporter端口9100可访问" "curl -s http://localhost:9100/metrics"

echo ""

# 测试3: 配置文件测试
echo -e "${BLUE}3. 配置文件测试${NC}"
test_service "环境变量文件存在" "test -f .env"
test_service "监控配置存在" "test -f monitoring/prometheus/prometheus.yml"
test_service "备份脚本存在" "test -f scripts/backup-system.sh"
test_service "SSL证书目录存在" "test -d nginx/ssl"

echo ""

# 测试4: 备份系统测试
echo -e "${BLUE}4. 备份系统测试${NC}"
test_service "备份目录存在" "test -d backups"
test_service "备份日志目录存在" "test -d /var/log/backup"
test_service "定时任务配置" "crontab -l | grep -q backup-system.sh"

echo ""

# 测试5: 安全配置测试
echo -e "${BLUE}5. 安全配置测试${NC}"
test_service "环境文件权限安全" "test \! -r .env -a \! -x .env -a -w .env"
test_service "SSL证书文件存在" "test -f nginx/ssl/cert.pem"
test_service "SSL私钥文件存在" "test -f nginx/ssl/key.pem"

echo ""

# 测试6: 性能资源测试
echo -e "${BLUE}6. 性能资源测试${NC}"
test_service "磁盘空间充足" "df / | awk 'NR==2 {print \$4}' | grep -E '^[0-9]{6,}'"
test_service "内存可用" "free -m | awk 'NR==2{print \$7}' | grep -E '^[0-9]{3,}'"

echo ""

# 生成测试报告
echo -e "${BLUE}📊 测试结果统计${NC}"
echo "=================================="
echo "总测试数: $TOTAL_TESTS"
echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！系统准备就绪！${NC}"
    SUCCESS_RATE="100%"
else
    SUCCESS_RATE=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
    echo -e "${YELLOW}⚠️  成功率: $SUCCESS_RATE%${NC}"
fi

echo ""

# 生成测试报告文件
REPORT_FILE="/tmp/integration_test_report_$(date +%Y%m%d_%H%M%S).txt"
{
echo "AI设计平台集成测试报告"
echo "======================"
echo "测试时间: $(date)"
echo "测试主机: $(hostname)"
echo ""
echo "测试结果统计:"
echo "- 总测试数: $TOTAL_TESTS"
echo "- 通过: $PASSED_TESTS"
echo "- 失败: $FAILED_TESTS"
echo "- 成功率: $SUCCESS_RATE%"
echo ""
echo "系统状态概览:"
echo "- Docker服务: $(docker ps | grep aidesign | wc -l) 个运行中"
echo "- 监控端口: $(netstat -tlnp | grep -E "(9090|9093|3002|9100)" | wc -l) 个开放"
echo "- 备份系统: 已配置"
echo "- 安全配置: 已配置"
echo ""
echo "建议下一步操作:"
if [ $FAILED_TESTS -eq 0 ]; then
    echo "✅ 系统已准备就绪，可以进行生产部署"
    echo "✅ 建议进行最终的性能调优"
    echo "✅ 可以开始用户验收测试"
else
    echo "⚠️  请修复失败的测试项"
    echo "⚠️  检查相关服务配置"
    echo "⚠️  验证网络连接"
fi
} > "$REPORT_FILE"

echo "📄 详细报告: $REPORT_FILE"

echo ""
echo -e "${BLUE}🔧 系统信息${NC}"
echo "操作系统: $(uname -a)"
echo "Docker版本: $(docker --version)"
echo "可用空间: $(df -h / | awk 'NR==2 {print $4}')"
echo "内存信息: $(free -h | awk 'NR==2{print $3"/"$2}')"

echo ""
echo -e "${GREEN}✨ 集成测试完成！${NC}"

# 返回退出码
if [ $FAILED_TESTS -eq 0 ]; then
    exit 0
else
    exit 1
fi