#!/bin/bash

# AI设计平台性能测试脚本

set -e

echo "🚀 开始AI设计平台性能测试..."
echo "测试时间: $(date)"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
BASE_URL=${TEST_URL:-"https://localhost"}
API_URL=${API_URL:-"https://localhost/api"}
CONCURRENT_USERS=${CONCURRENT_USERS:-50}
DURATION=${TEST_DURATION:-30} # 秒
RPS=${RPS:-10} # 每秒请求数

# 创建测试结果目录
RESULTS_DIR="/tmp/performance-test-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}测试配置${NC}"
echo "基础URL: $BASE_URL"
echo "API URL: $API_URL"
echo "并发用户数: $CONCURRENT_USERS"
echo "测试持续时间: ${DURATION}秒"
echo "目标RPS: $RPS"
echo "结果目录: $RESULTS_DIR"

# 1. 健康检查
echo -e "${BLUE}1. 健康检查${NC}"
if curl -f -s "$BASE_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ 服务健康检查通过${NC}"
else
    echo -e "${RED}❌ 服务健康检查失败${NC}"
    exit 1
fi

# 2. 基础HTTP性能测试
echo -e "${BLUE}2. 基础HTTP性能测试${NC}"

# 使用Apache Bench进行测试
echo "运行Apache Bench测试..."
ab -n $((CONCURRENT_USERS * 10)) -c $CONCURRENT_USERS "$BASE_URL/health" > "$RESULTS_DIR/ab-health.txt" 2>&1

# 提取关键指标
RPS_ACTUAL=$(grep "Requests per second:" "$RESULTS_DIR/ab-health.txt" | awk '{print $4}')
TIME_PER_REQUEST=$(grep "Time per request:" "$RESULTS_DIR/ab-health.txt" | head -1 | awk '{print $4}')
SUCCESSFUL_REQUESTS=$(grep "Complete requests:" "$RESULTS_DIR/ab-health.txt" | awk '{print $3}')
FAILED_REQUESTS=$(grep "Failed requests:" "$RESULTS_DIR/ab-health.txt" | awk '{print $3}')

echo -e "${GREEN}HTTP测试结果:${NC}"
echo "  - 实际RPS: $RPS_ACTUAL"
echo "  - 每请求时间: ${TIME_PER_REQUEST}ms"
echo "  - 成功请求: $SUCCESSFUL_REQUESTS"
echo "  - 失败请求: $FAILED_REQUESTS"

# 3. API端点测试
echo -e "${BLUE}3. API端点测试${NC}"

# 测试主要API端点
API_ENDPOINTS=(
    "/health"
    "/ai/models"
    "/software"
    "/workflows"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    echo "测试端点: $endpoint"
    ab -n 100 -c 10 "$API_URL$endpoint" > "$RESULTS_DIR/ab-$(echo $endpoint | tr '/' '_').txt" 2>&1
    
    # 检查成功率
    success_rate=$(grep "Complete requests:" "$RESULTS_DIR/ab-$(echo $endpoint | tr '/' '_').txt" | awk '{print $3}')
    failed_rate=$(grep "Failed requests:" "$RESULTS_DIR/ab-$(echo $endpoint | tr '/' '_').txt" | awk '{print $3}')
    
    if [ "$failed_rate" -eq 0 ]; then
        echo -e "  ${GREEN}✅ 成功率: 100%${NC}"
    else
        echo -e "  ${YELLOW}⚠️  失败请求: $failed_rate${NC}"
    fi
done

# 4. 并发连接测试
echo -e "${BLUE}4. 并发连接测试${NC}"

# 使用curl进行并发测试
echo "进行并发连接测试..."
start_time=$(date +%s)

# 启动多个并发进程
for ((i=1; i<=CONCURRENT_USERS; i++)); do
    {
        response_time=$(curl -o /dev/null -s -w "%{time_total}" "$API_URL/health")
        echo "$response_time" >> "$RESULTS_DIR/response_times.txt"
    } &
    
    # 控制请求频率
    if [ $((i % RPS)) -eq 0 ]; then
        sleep 1
    fi
done

# 等待所有进程完成
wait

end_time=$(date +%s)
actual_duration=$((end_time - start_time))

echo "并发测试完成，耗时: ${actual_duration}秒"

# 分析响应时间
if [ -f "$RESULTS_DIR/response_times.txt" ]; then
    avg_response_time=$(awk '{sum+=$1} END {print sum/NR}' "$RESULTS_DIR/response_times.txt")
    min_response_time=$(sort -n "$RESULTS_DIR/response_times.txt" | head -1)
    max_response_time=$(sort -n "$RESULTS_DIR/response_times.txt" | tail -1)
    
    echo -e "${GREEN}响应时间统计:${NC}"
    echo "  - 平均响应时间: ${avg_response_time}s"
    echo "  - 最小响应时间: ${min_response_time}s"
    echo "  - 最大响应时间: ${max_response_time}s"
fi

# 5. 内存使用监控
echo -e "${BLUE}5. 内存使用监控${NC}"

# 记录测试前后的内存使用
echo "内存使用监控..."
echo "$(date): $(free -m)" >> "$RESULTS_DIR/memory_usage.log"

# 等待一段时间
sleep 5

echo "$(date): $(free -m)" >> "$RESULTS_DIR/memory_usage.log"

# 6. 生成性能报告
echo -e "${BLUE}6. 生成性能报告${NC}"

# 创建HTML报告
cat > "$RESULTS_DIR/performance_report.html" << EOF
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI设计平台性能测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        h2 { color: #007bff; margin-top: 30px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #f8f9fa; border-left: 4px solid #007bff; }
        .metric-value { font-size: 24px; font-weight: bold; color: #333; }
        .metric-label { font-size: 14px; color: #666; }
        .success { border-left-color: #28a745; }
        .warning { border-left-color: #ffc107; }
        .error { border-left-color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>AI设计平台性能测试报告</h1>
        <p>测试时间: $(date)</p>
        <p>测试配置: 并发用户数 $CONCURRENT_USERS, 持续时间 ${DURATION}秒</p>
        
        <h2>基础HTTP性能</h2>
        <div class="metric ${RPS_ACTUAL//./}">
            <div class="metric-value">$RPS_ACTUAL</div>
            <div class="metric-label">每秒请求数 (RPS)</div>
        </div>
        <div class="metric ${TIME_PER_REQUEST//./}">
            <div class="metric-value">${TIME_PER_REQUEST}ms</div>
            <div class="metric-label">每请求时间</div>
        </div>
        <div class="metric ${SUCCESSFUL_REQUESTS//./}">
            <div class="metric-value">$SUCCESSFUL_REQUESTS</div>
            <div class="metric-label">成功请求数</div>
        </div>
        <div class="metric ${FAILED_REQUESTS//./}">
            <div class="metric-value">$FAILED_REQUESTS</div>
            <div class="metric-label">失败请求数</div>
        </div>
EOF

# 添加响应时间统计
if [ -f "$RESULTS_DIR/response_times.txt" ]; then
    cat >> "$RESULTS_DIR/performance_report.html" << EOF
        <h2>响应时间统计</h2>
        <table>
            <tr><th>指标</th><th>数值</th></tr>
            <tr><td>平均响应时间</td><td>${avg_response_time}s</td></tr>
            <tr><td>最小响应时间</td><td>${min_response_time}s</td></tr>
            <tr><td>最大响应时间</td><td>${max_response_time}s</td></tr>
        </table>
EOF
fi

# 添加Apache Bench详细结果
cat >> "$RESULTS_DIR/performance_report.html" << EOF
        <h2>Apache Bench详细结果</h2>
        <pre>$(cat "$RESULTS_DIR/ab-health.txt")</pre>
EOF

# 完成HTML报告
cat >> "$RESULTS_DIR/performance_report.html" << EOF
    </div>
</body>
</html>
EOF

# 7. 性能评估
echo -e "${BLUE}7. 性能评估${NC}"

# RPS评估
if (( $(echo "$RPS_ACTUAL > 1000" | bc -l) )); then
    echo -e "${GREEN}✅ 优秀: RPS $RPS_ACTUAL (> 1000)${NC}"
    rps_score="优秀"
elif (( $(echo "$RPS_ACTUAL > 500" | bc -l) )); then
    echo -e "${BLUE}ℹ️  良好: RPS $RPS_ACTUAL (> 500)${NC}"
    rps_score="良好"
elif (( $(echo "$RPS_ACTUAL > 100" | bc -l) )); then
    echo -e "${YELLOW}⚠️  一般: RPS $RPS_ACTUAL (> 100)${NC}"
    rps_score="一般"
else
    echo -e "${RED}❌ 需要优化: RPS $RPS_ACTUAL (< 100)${NC}"
    rps_score="需要优化"
fi

# 响应时间评估
response_time_ms=$(echo "$TIME_PER_REQUEST * 1000" | bc -l)
if (( $(echo "$response_time_ms < 200" | bc -l) )); then
    echo -e "${GREEN}✅ 优秀: 响应时间 ${TIME_PER_REQUEST}s (< 200ms)${NC}"
    response_score="优秀"
elif (( $(echo "$response_time_ms < 500" | bc -l) )); then
    echo -e "${BLUE}ℹ️  良好: 响应时间 ${TIME_PER_REQUEST}s (< 500ms)${NC}"
    response_score="良好"
elif (( $(echo "$response_time_ms < 1000" | bc -l) )); then
    echo -e "${YELLOW}⚠️  一般: 响应时间 ${TIME_PER_REQUEST}s (< 1000ms)${NC}"
    response_score="一般"
else
    echo -e "${RED}❌ 需要优化: 响应时间 ${TIME_PER_REQUEST}s (> 1000ms)${NC}"
    response_score="需要优化"
fi

# 错误率评估
if [ "$FAILED_REQUESTS" -eq 0 ]; then
    echo -e "${GREEN}✅ 优秀: 错误率 0%${NC}"
    error_score="优秀"
else
    error_rate=$(echo "scale=2; $FAILED_REQUESTS * 100 / $SUCCESSFUL_REQUESTS" | bc -l)
    if (( $(echo "$error_rate < 1" | bc -l) )); then
        echo -e "${BLUE}ℹ️  良好: 错误率 ${error_rate}% (< 1%)${NC}"
        error_score="良好"
    elif (( $(echo "$error_rate < 5" | bc -l) )); then
        echo -e "${YELLOW}⚠️  一般: 错误率 ${error_rate}% (< 5%)${NC}"
        error_score="一般"
    else
        echo -e "${RED}❌ 需要优化: 错误率 ${error_rate}% (> 5%)${NC}"
        error_score="需要优化"
    fi
fi

# 8. 生成建议
echo -e "${BLUE}8. 优化建议${NC}"

if [ "$rps_score" = "需要优化" ]; then
    echo "🔧 RPS过低建议："
    echo "   - 启用Gzip压缩"
    echo "   - 优化数据库查询"
    echo "   - 使用Redis缓存"
    echo "   - 增加服务器实例"
fi

if [ "$response_score" = "需要优化" ]; then
    echo "🔧 响应时间过长建议："
    echo "   - 检查慢查询日志"
    echo "   - 优化代码逻辑"
    echo "   - 增加内存配置"
    echo "   - 使用CDN加速"
fi

if [ "$error_score" = "需要优化" ]; then
    echo "🔧 错误率过高建议："
    echo "   - 检查错误日志"
    echo "   - 增加重试机制"
    echo "   - 完善异常处理"
    echo "   - 增加监控告警"
fi

# 9. 保存结果
echo -e "${BLUE}9. 测试完成${NC}"

echo -e "${GREEN}📊 测试报告已保存到: $RESULTS_DIR${NC}"
echo -e "${GREEN}📄 HTML报告: $RESULTS_DIR/performance_report.html${NC}"
echo -e "${GREEN}📋 原始数据: $RESULTS_DIR/response_times.txt${NC}"

# 创建性能评分
total_score=0
if [ "$rps_score" = "优秀" ]; then total_score=$((total_score + 25)); fi
if [ "$rps_score" = "良好" ]; then total_score=$((total_score + 20)); fi
if [ "$rps_score" = "一般" ]; then total_score=$((total_score + 15)); fi

if [ "$response_score" = "优秀" ]; then total_score=$((total_score + 25)); fi
if [ "$response_score" = "良好" ]; then total_score=$((total_score + 20)); fi
if [ "$response_score" = "一般" ]; then total_score=$((total_score + 15)); fi

if [ "$error_score" = "优秀" ]; then total_score=$((total_score + 25)); fi
if [ "$error_score" = "良好" ]; then total_score=$((total_score + 20)); fi
if [ "$error_score" = "一般" ]; then total_score=$((total_score + 15)); fi

echo -e "${BLUE}📈 综合性能评分: ${total_score}/100${NC}"

if [ $total_score -ge 80 ]; then
    echo -e "${GREEN}🎉 性能表现优秀！${NC}"
elif [ $total_score -ge 60 ]; then
    echo -e "${BLUE}👍 性能表现良好${NC}"
elif [ $total_score -ge 40 ]; then
    echo -e "${YELLOW}⚠️  性能表现一般，建议优化${NC}"
else
    echo -e "${RED}❌ 性能需要显著优化${NC}"
fi

echo "=================================="
echo "测试完成于: $(date)"

exit 0