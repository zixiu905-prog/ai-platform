#!/bin/bash

# AI设计平台安全审计脚本
# 用于全面检查系统安全性

set -e

echo "🔒 开始AI设计平台安全审计..."
echo "审计时间: $(date)"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 审计结果文件
AUDIT_REPORT="/tmp/security_audit_$(date +%Y%m%d_%H%M%S).txt"
echo "审计报告将保存到: $AUDIT_REPORT"

# 初始化报告
{
echo "AI设计平台安全审计报告"
echo "======================"
echo "审计时间: $(date)"
echo "审计主机: $(hostname)"
echo "操作系统: $(uname -a)"
echo ""
} > $AUDIT_REPORT

# 函数：记录审计结果
log_audit() {
    local level=$1
    local category=$2
    local message=$3
    local color=$4
    
    case $level in
        "HIGH")
            echo -e "${color}[高危]${NC} $category: $message"
            ;;
        "MEDIUM")
            echo -e "${color}[中危]${NC} $category: $message"
            ;;
        "LOW")
            echo -e "${color}[低危]${NC} $category: $message"
            ;;
        "INFO")
            echo -e "${color}[信息]${NC} $category: $message"
            ;;
    esac
    
    echo "[$level] $category: $message" >> $AUDIT_REPORT
}

# 1. 系统安全检查
echo -e "${BLUE}1. 系统安全检查${NC}"

# 检查系统更新
echo "检查系统更新状态..."
if ! apt list --upgradable 2>/dev/null | grep -q "upgradable"; then
    log_audit "INFO" "系统更新" "系统已是最新版本" $GREEN
else
    log_audit "MEDIUM" "系统更新" "存在可用更新包" $YELLOW
    echo "可用更新包:"
    apt list --upgradable 2>/dev/null | grep "upgradable" | head -10
fi

# 检查用户账户
echo "检查用户账户..."
user_count=$(cat /etc/passwd | wc -l)
log_audit "INFO" "用户账户" "系统共有 $user_count 个用户账户" $BLUE

# 检查sudo用户
sudo_users=$(getent group sudo | cut -d: -f4)
if [ -n "$sudo_users" ]; then
    log_audit "INFO" "权限管理" "sudo用户: $sudo_users" $BLUE
else
    log_audit "HIGH" "权限管理" "未找到sudo用户组" $RED
fi

# 检查空密码用户
empty_password=$(awk -F: '($2 == "" ) { print $1 }' /etc/shadow)
if [ -n "$empty_password" ]; then
    log_audit "HIGH" "用户安全" "存在空密码用户: $empty_password" $RED
else
    log_audit "INFO" "用户安全" "未发现空密码用户" $GREEN
fi

# 2. 网络安全检查
echo -e "${BLUE}2. 网络安全检查${NC}"

# 检查开放端口
echo "检查开放端口..."
open_ports=$(netstat -tuln | grep LISTEN | wc -l)
log_audit "INFO" "网络服务" "系统监听 $open_ports 个端口" $BLUE

# 检查危险服务
dangerous_services=("telnet" "rsh" "rlogin" "finger")
for service in "${dangerous_services[@]}"; do
    if systemctl is-active --quiet $service 2>/dev/null; then
        log_audit "HIGH" "危险服务" "$service 服务正在运行" $RED
    else
        log_audit "INFO" "危险服务" "$service 服务未运行" $GREEN
    fi
done

# 检查SSH配置
if [ -f /etc/ssh/sshd_config ]; then
    ssh_port=$(grep "^Port" /etc/ssh/sshd_config | awk '{print $2}')
    if [ "$ssh_port" = "22" ]; then
        log_audit "MEDIUM" "SSH安全" "SSH使用默认端口22" $YELLOW
    else
        log_audit "INFO" "SSH安全" "SSH使用非默认端口 $ssh_port" $GREEN
    fi
    
    root_login=$(grep "^PermitRootLogin" /etc/ssh/sshd_config | awk '{print $2}')
    if [ "$root_login" = "yes" ]; then
        log_audit "HIGH" "SSH安全" "允许root登录" $RED
    else
        log_audit "INFO" "SSH安全" "禁止root登录" $GREEN
    fi
    
    password_auth=$(grep "^PasswordAuthentication" /etc/ssh/sshd_config | awk '{print $2}')
    if [ "$password_auth" = "yes" ]; then
        log_audit "MEDIUM" "SSH安全" "允许密码认证" $YELLOW
    else
        log_audit "INFO" "SSH安全" "仅允许密钥认证" $GREEN
    fi
fi

# 3. 防火墙检查
echo -e "${BLUE}3. 防火墙检查${NC}"

if command -v ufw &> /dev/null; then
    ufw_status=$(ufw status | head -1)
    if echo "$ufw_status" | grep -q "active"; then
        log_audit "INFO" "防火墙" "UFW防火墙已启用" $GREEN
        
        # 检查防火墙规则
        rules_count=$(ufw status numbered | grep -c "\[")
        log_audit "INFO" "防火墙" "当前有 $rules_count 条防火墙规则" $BLUE
    else
        log_audit "HIGH" "防火墙" "UFW防火墙未启用" $RED
    fi
else
    log_audit "MEDIUM" "防火墙" "系统未安装UFW防火墙" $YELLOW
fi

# 4. Docker安全检查
echo -e "${BLUE}4. Docker安全检查${NC}"

if command -v docker &> /dev/null; then
    docker_version=$(docker --version | awk '{print $3}' | sed 's/,//')
    log_audit "INFO" "Docker" "Docker版本: $docker_version" $BLUE
    
    # 检查Docker服务状态
    if systemctl is-active --quiet docker; then
        log_audit "INFO" "Docker" "Docker服务正在运行" $GREEN
    else
        log_audit "MEDIUM" "Docker" "Docker服务未运行" $YELLOW
    fi
    
    # 检查容器运行状态
    running_containers=$(docker ps -q | wc -l)
    log_audit "INFO" "Docker" "当前运行 $running_containers 个容器" $BLUE
    
    # 检查Docker安全配置
    docker_rootless=$(docker info 2>/dev/null | grep -i "rootless" || echo "false")
    if echo "$docker_rootless" | grep -q "true"; then
        log_audit "INFO" "Docker安全" "Docker运行在rootless模式" $GREEN
    else
        log_audit "MEDIUM" "Docker安全" "Docker未使用rootless模式" $YELLOW
    fi
else
    log_audit "HIGH" "Docker" "系统未安装Docker" $RED
fi

# 5. 数据库安全检查
echo -e "${BLUE}5. 数据库安全检查${NC}"

# PostgreSQL安全检查
if command -v psql &> /dev/null || docker exec ai-platform-postgres pg_isready &>/dev/null; then
    log_audit "INFO" "数据库" "PostgreSQL数据库可访问" $GREEN
    
    # 检查数据库连接
    if docker exec ai-platform-postgres pg_isready &>/dev/null; then
        log_audit "INFO" "数据库" "数据库连接正常" $GREEN
        
        # 检查用户权限
        db_users=$(docker exec ai-platform-postgres psql -U postgres -t -c "SELECT usename FROM pg_user;" 2>/dev/null | tr -d ' ')
        if echo "$db_users" | grep -q "postgres"; then
            log_audit "MEDIUM" "数据库" "存在postgres超级用户" $YELLOW
        fi
    else
        log_audit "HIGH" "数据库" "数据库连接失败" $RED
    fi
else
    log_audit "HIGH" "数据库" "无法连接到PostgreSQL数据库" $RED
fi

# Redis安全检查
if command -v redis-cli &> /dev/null || docker exec ai-platform-redis redis-cli ping &>/dev/null; then
    log_audit "INFO" "缓存" "Redis缓存可访问" $GREEN
    
    # 检查Redis认证
    redis_password=$(docker exec ai-platform-redis redis-cli config get requirepass 2>/dev/null | tail -1)
    if [ "$redis_password" = "" ]; then
        log_audit "HIGH" "缓存" "Redis未设置密码" $RED
    else
        log_audit "INFO" "缓存" "Redis已设置密码保护" $GREEN
    fi
else
    log_audit "HIGH" "缓存" "无法连接到Redis缓存" $RED
fi

# 6. 文件权限检查
echo -e "${BLUE}6. 文件权限检查${NC}"

# 检查关键文件权限
critical_files=("/etc/passwd" "/etc/shadow" "/etc/group" "/etc/gshadow")
for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        permissions=$(stat -c "%a" "$file")
        case $file in
            "/etc/passwd"|"/etc/group")
                if [ "$permissions" != "644" ]; then
                    log_audit "MEDIUM" "文件权限" "$file 权限异常: $permissions" $YELLOW
                fi
                ;;
            "/etc/shadow"|"/etc/gshadow")
                if [ "$permissions" != "640" ]; then
                    log_audit "HIGH" "文件权限" "$file 权限异常: $permissions" $RED
                fi
                ;;
        esac
    fi
done

# 检查环境变量文件权限
env_file="/home/ai design/.env.production"
if [ -f "$env_file" ]; then
    env_permissions=$(stat -c "%a" "$env_file")
    if [ "$env_permissions" != "600" ]; then
        log_audit "HIGH" "敏感文件" "环境变量文件权限异常: $env_permissions" $RED
    else
        log_audit "INFO" "敏感文件" "环境变量文件权限正确" $GREEN
    fi
fi

# 7. SSL证书检查
echo -e "${BLUE}7. SSL证书检查${NC}"

# 检查SSL证书
cert_paths=("/etc/ssl/certs/yourdomain.crt" "/etc/ssl/private/yourdomain.key")
for cert_path in "${cert_paths[@]}"; do
    if [ -f "$cert_path" ]; then
        log_audit "INFO" "SSL证书" "证书文件存在: $cert_path" $GREEN
        
        # 检查证书有效期
        if [[ "$cert_path" == *.crt ]]; then
            expiry_date=$(openssl x509 -in "$cert_path" -noout -enddate 2>/dev/null | cut -d= -f2 || echo "")
            if [ -n "$expiry_date" ]; then
                expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
                current_timestamp=$(date +%s)
                days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                
                if [ $days_until_expiry -lt 7 ]; then
                    log_audit "HIGH" "SSL证书" "证书将在 $days_until_expiry 天内过期" $RED
                elif [ $days_until_expiry -lt 30 ]; then
                    log_audit "MEDIUM" "SSL证书" "证书将在 $days_until_expiry 天内过期" $YELLOW
                else
                    log_audit "INFO" "SSL证书" "证书有效期还有 $days_until_expiry 天" $GREEN
                fi
            fi
        fi
    else
        log_audit "MEDIUM" "SSL证书" "证书文件不存在: $cert_path" $YELLOW
    fi
done

# 8. 应用程序安全检查
echo -e "${BLUE}8. 应用程序安全检查${NC}"

# 检查JWT密钥强度
jwt_secret=$(grep -E "^JWT_SECRET=" "/home/ai design/.env.production" 2>/dev/null | cut -d= -f2)
if [ -n "$jwt_secret" ]; then
    secret_length=${#jwt_secret}
    if [ $secret_length -lt 32 ]; then
        log_audit "HIGH" "应用安全" "JWT密钥长度不足: $secret_length 字符" $RED
    elif [ $secret_length -lt 64 ]; then
        log_audit "MEDIUM" "应用安全" "JWT密钥长度较短: $secret_length 字符" $YELLOW
    else
        log_audit "INFO" "应用安全" "JWT密钥长度合适: $secret_length 字符" $GREEN
    fi
else
    log_audit "HIGH" "应用安全" "未找到JWT密钥配置" $RED
fi

# 检查API密钥
api_keys=("OPENAI_API_KEY" "DOUBAO_API_KEY" "VOLCENGINE_ACCESS_KEY")
for key in "${api_keys[@]}"; do
    if grep -q "^$key=" "/home/ai design/.env.production"; then
        key_value=$(grep "^$key=" "/home/ai design/.env.production" | cut -d= -f2)
        if [ ${#key_value} -lt 20 ]; then
            log_audit "HIGH" "API密钥" "$key 密钥长度异常" $RED
        else
            log_audit "INFO" "API密钥" "$key 已配置" $GREEN
        fi
    else
        log_audit "HIGH" "API密钥" "未找到 $key 配置" $RED
    fi
done

# 9. 监控和日志检查
echo -e "${BLUE}9. 监控和日志检查${NC}"

# 检查日志目录权限
log_dirs=("/var/log" "/home/ai design/logs")
for log_dir in "${log_dirs[@]}"; do
    if [ -d "$log_dir" ]; then
        log_permissions=$(stat -c "%a" "$log_dir")
        if [ "$log_permissions" != "755" ]; then
            log_audit "MEDIUM" "日志安全" "$log_dir 权限异常: $log_permissions" $YELLOW
        else
            log_audit "INFO" "日志安全" "$log_dir 权限正确" $GREEN
        fi
    fi
done

# 检查监控服务
monitoring_services=("prometheus" "grafana" "alertmanager")
for service in "${monitoring_services[@]}"; do
    if docker ps --format "table {{.Names}}" | grep -q "$service"; then
        log_audit "INFO" "监控服务" "$service 正在运行" $GREEN
    else
        log_audit "MEDIUM" "监控服务" "$service 未运行" $YELLOW
    fi
done

# 10. 备份检查
echo -e "${BLUE}10. 备份检查${NC}"

# 检查备份目录
backup_dir="/backup"
if [ -d "$backup_dir" ]; then
    backup_count=$(find "$backup_dir" -type f -mtime -7 | wc -l)
    if [ $backup_count -gt 0 ]; then
        log_audit "INFO" "备份系统" "过去7天内有 $backup_count 个备份文件" $GREEN
    else
        log_audit "HIGH" "备份系统" "过去7天内无备份文件" $RED
    fi
else
    log_audit "HIGH" "备份系统" "备份目录不存在" $RED
fi

# 统计审计结果
echo -e "${BLUE}11. 审计结果统计${NC}"

high_count=$(grep -c "\[HIGH\]" $AUDIT_REPORT)
medium_count=$(grep -c "\[MEDIUM\]" $AUDIT_REPORT)
low_count=$(grep -c "\[LOW\]" $AUDIT_REPORT)
info_count=$(grep -c "\[INFO\]" $AUDIT_REPORT)

echo "审计完成！统计结果："
echo -e "  ${RED}高危问题: $high_count${NC}"
echo -e "  ${YELLOW}中危问题: $medium_count${NC}"
echo -e "  ${GREEN}低危问题: $low_count${NC}"
echo -e "  ${BLUE}信息项: $info_count${NC}"

# 生成建议
echo ""
echo -e "${BLUE}安全建议：${NC}"

if [ $high_count -gt 0 ]; then
    echo "🔴 发现高危问题，建议立即修复："
    grep "\[HIGH\]" $AUDIT_REPORT | head -5
fi

if [ $medium_count -gt 0 ]; then
    echo "🟡 发现中危问题，建议尽快处理："
    grep "\[MEDIUM\]" $AUDIT_REPORT | head -3
fi

# 生成修复脚本
cat > /tmp/security_fix_$(date +%Y%m%d_%H%M%S).sh << 'EOF'
#!/bin/bash
# AI设计平台安全修复脚本
# 根据审计结果自动修复常见安全问题

echo "🔧 开始安全修复..."

# 1. 系统更新
echo "更新系统包..."
apt update && apt upgrade -y

# 2. 配置防火墙
echo "配置防火墙..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 3. SSH安全配置
echo "加强SSH安全配置..."
sed -i 's/^Port 22/Port 2222/' /etc/ssh/sshd_config
sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# 4. 文件权限修复
echo "修复文件权限..."
chmod 644 /etc/passwd /etc/group
chmod 640 /etc/shadow /etc/gshadow
chmod 600 "/home/ai design/.env.production"

# 5. 创建备份目录
echo "创建备份目录..."
mkdir -p /backup/{database,files,config}

# 6. 重启服务
echo "重启SSH服务..."
systemctl restart sshd

echo "✅ 安全修复完成"
echo "⚠️  请注意：SSH端口已更改为2222，请确保您的防火墙规则已更新"
EOF

chmod +x /tmp/security_fix_*.sh

echo ""
echo "📋 审计报告: $AUDIT_REPORT"
echo "🔧 修复脚本: /tmp/security_fix_$(date +%Y%m%d)_*.sh"
echo ""
echo "✅ 安全审计完成！"

exit 0