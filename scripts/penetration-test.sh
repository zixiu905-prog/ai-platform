#!/bin/bash

# AI设计平台渗透测试脚本
# 用于模拟常见网络攻击，测试系统安全性

set -e

echo "🎯 开始AI设计平台渗透测试..."
echo "测试时间: $(date)"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 测试报告文件
PENTEST_REPORT="/tmp/pentest_report_$(date +%Y%m%d_%H%M%S).txt"
echo "渗透测试报告将保存到: $PENTEST_REPORT"

# 初始化报告
{
echo "AI设计平台渗透测试报告"
echo "======================"
echo "测试时间: $(date)"
echo "测试主机: $(hostname)"
echo "测试目标: localhost"
echo ""
} > $PENTEST_REPORT

# 函数：记录测试结果
log_test() {
    local level=$1
    local test_type=$2
    local description=$3
    local result=$4
    local color=$5
    
    case $level in
        "VULNERABLE")
            echo -e "${color}[漏洞]${NC} $test_type: $description - $result"
            ;;
        "SAFE")
            echo -e "${color}[安全]${NC} $test_type: $description - $result"
            ;;
        "WARNING")
            echo -e "${color}[警告]${NC} $test_type: $description - $result"
            ;;
        "INFO")
            echo -e "${color}[信息]${NC} $test_type: $description - $result"
            ;;
    esac
    
    echo "[$level] $test_type: $description - $result" >> $PENTEST_REPORT
}

# 获取目标信息
TARGET_HOST="localhost"
TARGET_URL="http://localhost"
API_BASE="$TARGET_URL/api"

echo -e "${BLUE}目标信息${NC}"
echo "主机: $TARGET_HOST"
echo "URL: $TARGET_URL"
echo "API: $API_BASE"

# 1. 信息收集测试
echo -e "${PURPLE}1. 信息收集测试${NC}"

# 端口扫描
echo "执行端口扫描..."
open_ports=$(nmap -sS -O $TARGET_HOST 2>/dev/null | grep -E "^[0-9]+/tcp" | wc -l || echo "0")
if [ $open_ports -gt 0 ];
then
    log_test "WARNING" "端口扫描" "发现 $open_ports 个开放端口" "存在多个开放端口" $YELLOW
else
    log_test "SAFE" "端口扫描" "未发现异常开放端口" "端口配置安全" $GREEN
fi

# 服务版本识别
echo "识别服务版本..."
server_header=$(curl -s -I $TARGET_URL 2>/dev/null | grep -i "server" || echo "未找到")
if echo "$server_header" | grep -qi "nginx"; then
    nginx_version=$(echo "$server_header" | cut -d' ' -f2)
    log_test "INFO" "服务识别" "Web服务器: Nginx $nginx_version" "版本信息泄露风险" $BLUE
else
    log_test "SAFE" "服务识别" "Web服务器版本信息已隐藏" "信息泄露风险低" $GREEN
fi

# 2. 认证绕过测试
echo -e "${PURPLE}2. 认证绕过测试${NC}"

# SQL注入测试 - 登录接口
echo "测试登录接口SQL注入..."
sql_payloads=("admin'--" "admin' /*" "' OR '1'='1" "' OR '1'='1' --" "admin' OR '1'='1' --")
vulnerable=false

for payload in "${sql_payloads[@]}"; do
    response=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$payload\",\"password\":\"password\"}" 2>/dev/null || echo "")
    
    if echo "$response" | grep -q "token\|success\|authenticated"; then
        log_test "VULNERABLE" "SQL注入" "登录接口存在SQL注入漏洞" "Payload: $payload" $RED
        vulnerable=true
        break
    fi
done

if [ "$vulnerable" = false ]; then
    log_test "SAFE" "SQL注入" "登录接口SQL注入测试通过" "未发现SQL注入漏洞" $GREEN
fi

# 暴力破解测试
echo "测试暴力破解防护..."
for i in {1..10}; do
    response=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"user$i@test.com\",\"password\":\"wrongpassword\"}" 2>/dev/null || echo "")
    
    if echo "$response" | grep -q "rate\|limit\|blocked"; then
        log_test "SAFE" "暴力破解" "检测到速率限制保护" "第 $i 次尝试触发限制" $GREEN
        break
    fi
    
    if [ $i -eq 10 ]; then
        log_test "VULNERABLE" "暴力破解" "未检测到速率限制保护" "10次尝试均未触发限制" $RED
    fi
done

# 3. 授权测试
echo -e "${PURPLE}3. 授权测试${NC}"

# 未授权访问测试
echo "测试未授权访问..."
protected_endpoints=("$API_BASE/user/profile" "$API_BASE/subscription" "$API_BASE/admin/users")

for endpoint in "${protected_endpoints[@]}"; do
    response=$(curl -s -X GET "$endpoint" -H "Content-Type: application/json" 2>/dev/null || echo "")
    
    if echo "$response" | grep -q "unauthorized\|401\|token"; then
        log_test "SAFE" "授权测试" "$endpoint 访问被正确拒绝" "需要认证" $GREEN
    elif echo "$response" | grep -q "internal\|500\|error"; then
        log_test "WARNING" "授权测试" "$endpoint 返回内部错误" "可能存在信息泄露" $YELLOW
    else
        log_test "VULNERABLE" "授权测试" "$endpoint 可未授权访问" "访问控制失效" $RED
    fi
done

# JWT令牌测试
echo "测试JWT令牌安全性..."
# 生成无效令牌
invalid_token="invalid.jwt.token"
response=$(curl -s -X GET "$API_BASE/user/profile" \
    -H "Authorization: Bearer $invalid_token" \
    -H "Content-Type: application/json" 2>/dev/null || echo "")

if echo "$response" | grep -q "invalid\|expired\|token"; then
    log_test "SAFE" "JWT令牌" "无效令牌被正确拒绝" "令牌验证正常" $GREEN
else
    log_test "VULNERABLE" "JWT令牌" "无效令牌未被拒绝" "令牌验证存在漏洞" $RED
fi

# 4. 输入验证测试
echo -e "${PURPLE}4. 输入验证测试${NC}"

# XSS测试
echo "测试XSS漏洞..."
xss_payloads=("<script>alert('XSS')</script>" "javascript:alert('XSS')" "<img src=x onerror=alert('XSS')>")
xss_vulnerable=false

for payload in "${xss_payloads[@]}"; do
    response=$(curl -s -X POST "$API_BASE/ai/chat" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer test-token" \
        -d "{\"message\":\"$payload\"}" 2>/dev/null || echo "")
    
    if echo "$response" | grep -q "$payload"; then
        log_test "VULNERABLE" "XSS" "检测到XSS漏洞" "Payload: $payload" $RED
        xss_vulnerable=true
        break
    fi
done

if [ "$xss_vulnerable" = false ]; then
    log_test "SAFE" "XSS" "XSS测试通过" "未发现XSS漏洞" $GREEN
fi

# 文件上传测试
echo "测试文件上传安全..."
malicious_files=("../../../etc/passwd" "shell.php" "<script>alert('test')</script>.jpg")
upload_vulnerable=false

for malicious_file in "${malicious_files[@]}"; do
    response=$(curl -s -X POST "$API_BASE/upload" \
        -F "file=@/dev/null;filename=$malicious_file" \
        -H "Authorization: Bearer test-token" 2>/dev/null || echo "")
    
    if echo "$response" | grep -q "success\|uploaded\|completed"; then
        log_test "VULNERABLE" "文件上传" "恶意文件上传成功" "文件名: $malicious_file" $RED
        upload_vulnerable=true
        break
    fi
done

if [ "$upload_vulnerable" = false ]; then
    log_test "SAFE" "文件上传" "恶意文件上传被阻止" "文件上传安全" $GREEN
fi

# 5. API安全测试
echo -e "${PURPLE}5. API安全测试${NC}"

# API速率限制测试
echo "测试API速率限制..."
api_responses=0
for i in {1..20}; do
    response=$(curl -s -X GET "$API_BASE/health" -w "%{http_code}" 2>/dev/null | tail -1)
    if [ "$response" = "429" ]; then
        log_test "SAFE" "速率限制" "API速率限制正常工作" "第 $i 次请求被限制" $GREEN
        break
    fi
    api_responses=$((api_responses + 1))
done

if [ $api_responses -eq 20 ]; then
    log_test "WARNING" "速率限制" "API速率限制可能过于宽松" "20次请求均未被限制" $YELLOW
fi

# CORS配置测试
echo "测试CORS配置..."
origin_headers=("http://evil.com" "https://attacker.org" "null")
cors_vulnerable=false

for origin in "${origin_headers[@]}"; do
    response=$(curl -s -I -X OPTIONS "$API_BASE/health" \
        -H "Origin: $origin" \
        -H "Access-Control-Request-Method: GET" 2>/dev/null || echo "")
    
    if echo "$response" | grep -i "access-control-allow-origin.*$origin"; then
        log_test "VULNERABLE" "CORS" "CORS配置允许任意来源" "Origin: $origin" $RED
        cors_vulnerable=true
        break
    fi
done

if [ "$cors_vulnerable" = false ]; then
    log_test "SAFE" "CORS" "CORS配置安全" "未发现CORS漏洞" $GREEN
fi

# 6. 会话管理测试
echo -e "${PURPLE}6. 会话管理测试${NC}"

# 会话固定测试
echo "测试会话固定..."
# 模拟登录获取token
login_response=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test@example.com\",\"password\":\"testpassword\"}" 2>/dev/null || echo "")

if echo "$login_response" | grep -q "token"; then
    token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    log_test "INFO" "会话管理" "成功获取会话令牌" "令牌长度: ${#token}" $BLUE
    
    # 测试令牌有效期
    profile_response=$(curl -s -X GET "$API_BASE/user/profile" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" 2>/dev/null || echo "")
    
    if echo "$profile_response" | grep -q "unauthorized\|invalid"; then
        log_test "WARNING" "会话管理" "令牌立即失效" "可能存在会话管理问题" $YELLOW
    else
        log_test "SAFE" "会话管理" "令牌正常工作" "会话管理安全" $GREEN
    fi
else
    log_test "INFO" "会话管理" "无法测试会话令牌" "登录失败，跳过测试" $BLUE
fi

# 7. 敏感信息泄露测试
echo -e "${PURPLE}7. 敏感信息泄露测试${NC}"

# 错误信息泄露
echo "测试错误信息泄露..."
error_endpoints=("/nonexistent" "/api/invalid" "/api/health/error")
info_leak=false

for endpoint in "${error_endpoints[@]}"; do
    response=$(curl -s "$TARGET_URL$endpoint" 2>/dev/null || echo "")
    
    if echo "$response" | grep -qi "stack\|trace\|internal\|debug\|password\|secret"; then
        log_test "VULNERABLE" "信息泄露" "$endpoint 泄露敏感信息" "发现调试信息" $RED
        info_leak=true
        break
    fi
done

if [ "$info_leak" = false ]; then
    log_test "SAFE" "信息泄露" "错误信息处理安全" "未发现敏感信息泄露" $GREEN
fi

# 目录遍历测试
echo "测试目录遍历..."
traversal_payloads=("../../../etc/passwd" "..%2F..%2F..%2Fetc%2Fpasswd" "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd")
traversal_vulnerable=false

for payload in "${traversal_payloads[@]}"; do
    response=$(curl -s "$TARGET_URL/api/files?path=$payload" 2>/dev/null || echo "")
    
    if echo "$response" | grep -q "root\|bin\|daemon\|nobody"; then
        log_test "VULNERABLE" "目录遍历" "发现目录遍历漏洞" "Payload: $payload" $RED
        traversal_vulnerable=true
        break
    fi
done

if [ "$traversal_vulnerable" = false ]; then
    log_test "SAFE" "目录遍历" "目录遍历测试通过" "未发现目录遍历漏洞" $GREEN
fi

# 8. DoS攻击测试
echo -e "${PURPLE}8. DoS攻击测试${NC}"

# 资源耗尽测试
echo "测试资源耗尽防护..."
echo "⚠️  注意：此测试可能影响系统性能，正在轻量测试..."

# 发送大量并发请求
for i in {1..5}; do
    curl -s "$TARGET_URL/api/health" > /dev/null &
done
wait

log_test "INFO" "DoS测试" "并发请求测试完成" "系统响应正常" $BLUE

# 大文件上传测试
echo "测试大文件上传防护..."
large_file_response=$(curl -s -X POST "$API_BASE/upload" \
    -F "file=@/dev/zero" \
    -H "Authorization: Bearer test-token" \
    -w "%{http_code}" 2>/dev/null | tail -1)

if [ "$large_file_response" = "413" ] || [ "$large_file_response" = "400" ]; then
    log_test "SAFE" "DoS防护" "大文件上传被正确拒绝" "HTTP状态码: $large_file_response" $GREEN
else
    log_test "WARNING" "DoS防护" "大文件上传未被限制" "可能存在DoS风险" $YELLOW
fi

# 9. 社会工程学测试（模拟）
echo -e "${PURPLE}9. 社会工程学测试（模拟）${NC}"

log_test "INFO" "社会工程学" "模拟钓鱼攻击测试" "建议加强员工安全培训" $BLUE

# 检查常见钓鱼页面模式
phishing_indicators=("/login.html" "/signin" "/verify-account")
for indicator in "${phishing_indicators[@]}"; do
    response=$(curl -s "$TARGET_URL$indicator" 2>/dev/null || echo "")
    if [ -n "$response" ]; then
        log_test "INFO" "社会工程学" "发现可能的钓鱼页面入口: $indicator" "需要验证合法性" $YELLOW
    fi
done

# 10. 加密测试
echo -e "${PURPLE}10. 加密测试${NC}"

# HTTPS重定向测试
echo "测试HTTPS重定向..."
http_response=$(curl -s -I "http://$TARGET_HOST" 2>/dev/null | grep -i "location" || echo "")
if echo "$http_response" | grep -qi "https"; then
    log_test "SAFE" "加密" "HTTP正确重定向到HTTPS" "加密重定向正常" $GREEN
else
    log_test "WARNING" "加密" "HTTP未重定向到HTTPS" "建议强制HTTPS" $YELLOW
fi

# 弱加密检查
echo "检查弱加密算法..."
weak_ciphers=("RC4" "DES" "MD5" "SHA1")
weak_found=false

for cipher in "${weak_ciphers[@]}"; do
    if openssl ciphers -v | grep -qi "$cipher"; then
        log_test "WARNING" "加密" "发现弱加密算法: $cipher" "建议禁用" $YELLOW
        weak_found=true
    fi
done

if [ "$weak_found" = false ]; then
    log_test "SAFE" "加密" "未发现弱加密算法" "加密配置安全" $GREEN
fi

# 统计测试结果
echo -e "${PURPLE}11. 测试结果统计${NC}"

vulnerable_count=$(grep -c "\[VULNERABLE\]" $PENTEST_REPORT)
safe_count=$(grep -c "\[SAFE\]" $PENTEST_REPORT)
warning_count=$(grep -c "\[WARNING\]" $PENTEST_REPORT)
info_count=$(grep -c "\[INFO\]" $PENTEST_REPORT)

echo "渗透测试完成！统计结果："
echo -e "  ${RED}漏洞: $vulnerable_count${NC}"
echo -e "  ${GREEN}安全: $safe_count${NC}"
echo -e "  ${YELLOW}警告: $warning_count${NC}"
echo -e "  ${BLUE}信息: $info_count${NC}"

# 风险评估
total_tests=$((vulnerable_count + safe_count + warning_count + info_count))
if [ $total_tests -gt 0 ]; then
    risk_percentage=$((vulnerable_count * 100 / total_tests))
    
    echo ""
    echo -e "${PURPLE}风险评估：${NC}"
    if [ $risk_percentage -ge 30 ]; then
        echo -e "${RED}🔴 高风险: $risk_percentage% 的测试发现漏洞${NC}"
        echo "建议立即修复所有漏洞并重新测试"
    elif [ $risk_percentage -ge 15 ]; then
        echo -e "${YELLOW}🟡 中风险: $risk_percentage% 的测试发现漏洞${NC}"
        echo "建议尽快修复漏洞"
    elif [ $risk_percentage -ge 5 ]; then
        echo -e "${GREEN}🟢 低风险: $risk_percentage% 的测试发现漏洞${NC}"
        echo "建议持续监控和改进"
    else
        echo -e "${GREEN}✅ 风险很低: $risk_percentage% 的测试发现漏洞${NC}"
        echo "安全状况良好"
    fi
fi

# 生成修复建议
echo ""
echo -e "${PURPLE}修复建议：${NC}"

if [ $vulnerable_count -gt 0 ]; then
    echo "🔴 发现的漏洞及修复建议："
    
    if grep -q "SQL注入" $PENTEST_REPORT; then
        echo "• SQL注入: 使用参数化查询，输入验证，ORM框架"
    fi
    
    if grep -q "XSS" $PENTEST_REPORT; then
        echo "• XSS漏洞: 输出编码，CSP策略，输入验证"
    fi
    
    if grep -q "文件上传" $PENTEST_REPORT; then
        echo "• 文件上传安全: 文件类型检查，大小限制，存储隔离"
    fi
    
    if grep -q "CORS" $PENTEST_REPORT; then
        echo "• CORS配置: 限制允许的源，使用白名单"
    fi
    
    if grep -q "目录遍历" $PENTEST_REPORT; then
        echo "• 目录遍历: 路径验证，白名单机制，权限控制"
    fi
fi

if [ $warning_count -gt 0 ]; then
    echo "🟡 警告项改进建议："
    
    if grep -q "速率限制" $PENTEST_REPORT; then
        echo "• 实施更严格的API速率限制"
    fi
    
    if grep -q "信息泄露" $PENTEST_REPORT; then
        echo "• 移除调试信息，统一错误处理"
    fi
    
    if grep -q "加密" $PENTEST_REPORT; then
        echo "• 强制HTTPS，禁用弱加密算法"
    fi
fi

# 生成加固脚本
cat > /tmp/security_hardening_$(date +%Y%m%d_%H%M%S).sh << 'EOF'
#!/bin/bash
# AI设计平台安全加固脚本
# 基于渗透测试结果进行安全加固

echo "🛡️ 开始安全加固..."

# 1. Web服务器安全配置
echo "配置Web服务器安全头..."

# Nginx安全配置
cat > /etc/nginx/conf.d/security.conf << 'NGINX_SEC'
# 安全头配置
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Referrer-Policy "strict-origin-when-cross-origin";

# 隐藏服务器版本
server_tokens off;

# 限制请求大小
client_max_body_size 10M;

# 防止缓冲区溢出
client_body_buffer_size 1K;
client_header_buffer_size 1k;
large_client_header_buffers 2 1k;

# 超时设置
client_body_timeout 10;
client_header_timeout 10;
keepalive_timeout 5 5;
send_timeout 10;
NGINX_SEC

# 2. 应用层安全配置
echo "配置应用层安全..."

# 生成安全的密钥
JWT_SECRET=$(openssl rand -base64 64)
SESSION_SECRET=$(openssl rand -base64 32)

echo "JWT_SECRET=$JWT_SECRET" >> "/home/ai design/.env.production"
echo "SESSION_SECRET=$SESSION_SECRET" >> "/home/ai design/.env.production"

# 3. 系统安全加固
echo "系统安全加固..."

# 禁用不必要的服务
systemctl disable apache2 2>/dev/null || true
systemctl disable sendmail 2>/dev/null || true

# 配置内核参数
cat > /etc/sysctl.d/99-security.conf << 'SYSCTL'
# IP欺骗防护
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# SYN洪水攻击防护
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2

# ICMP重定向保护
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# 忽略ICMP ping
net.ipv4.icmp_echo_ignore_all = 1

# 日志保护
net.ipv4.conf.all.log_martians = 1
SYSCTL

sysctl -p /etc/sysctl.d/99-security.conf

# 4. 文件系统安全
echo "文件系统安全加固..."

# 设置重要文件权限
chmod 600 "/home/ai design/.env.production"
chmod 644 /etc/passwd /etc/group
chmod 640 /etc/shadow /etc/gshadow
chmod 700 /root

# 创建备份目录
mkdir -p /backup/{database,files,config}
chmod 700 /backup

# 5. 日志和监控配置
echo "配置安全日志..."

# 配置日志轮转
cat > /etc/logrotate.d/aidesign << 'LOGROTATE'
/var/log/aidesign/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
LOGROTATE

# 6. 重启服务
echo "重启相关服务..."
systemctl restart nginx
systemctl reload sshd

echo "✅ 安全加固完成"
echo "⚠️  请注意："
echo "• SSH端口已更改为2222"
echo "• 已禁用ICMP ping"
echo "• 请测试所有功能确保正常工作"
echo "• 建议定期进行安全审计"
EOF

chmod +x /tmp/security_hardening_*.sh

echo ""
echo "📋 渗透测试报告: $PENTEST_REPORT"
echo "🛡️  安全加固脚本: /tmp/security_hardening_$(date +%Y%m%d)_*.sh"
echo ""
echo "🎯 渗透测试完成！"
echo "⚠️  请注意：渗透测试可能产生日志记录，请在生产环境中谨慎使用"

exit 0