# AiDesign 运维故障排查指南

## 📋 目录

- [快速诊断](#快速诊断)
- [系统故障](#系统故障)
- [数据库问题](#数据库问题)
- [网络与连接](#网络与连接)
- [AI服务故障](#ai服务故障)
- [性能问题](#性能问题)
- [安全事件](#安全事件)
- [数据恢复](#数据恢复)
- [紧急预案](#紧急预案)

## 🔍 快速诊断

### 一键诊断脚本

创建诊断脚本 `/opt/aiplatform/scripts/quick_diagnosis.sh`：

```bash
#!/bin/bash

echo "=== AiDesign 系统诊断 $(date) ==="
echo

# 1. 系统基础信息
echo "📊 系统信息:"
echo "  操作系统: $(uname -a)"
echo "  内存使用: $(free -h | grep Mem)"
echo "  磁盘使用: $(df -h /)"
echo "  CPU负载: $(uptime)"
echo

# 2. Docker服务状态
echo "🐳 Docker服务状态:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo

# 3. 端口连通性测试
echo "🔌 端口连通性:"
ports=("3000" "3001" "3002" "3003" "5432" "6379" "5678")
for port in "${ports[@]}"; do
    if netstat -tuln | grep -q ":$port "; then
        echo "  ✓ 端口 $port 正常监听"
    else
        echo "  ✗ 端口 $port 未监听"
    fi
done
echo

# 4. 服务健康检查
echo "🏥 服务健康检查:"
services=("http://localhost:3000/health" "http://localhost:3002/api/health")
for service in "${services[@]}"; do
    if curl -s "$service" > /dev/null; then
        echo "  ✓ $service 健康正常"
    else
        echo "  ✗ $service 健康异常"
    fi
done
echo

# 5. 日志错误检查
echo "📋 最近错误日志:"
if [ -d "/var/log/aiplatform" ]; then
    find /var/log/aiplatform -name "*.log" -mtime -1 -exec grep -l "ERROR\|FATAL\|CRITICAL" {} \; | head -5
else
    echo "  ⚠️ 日志目录不存在"
fi
echo

echo "=== 诊断完成 ==="
```

### 使用方法

```bash
# 给脚本执行权限
chmod +x /opt/aiplatform/scripts/quick_diagnosis.sh

# 运行诊断
./opt/aiplatform/scripts/quick_diagnosis.sh

# 保存诊断结果
./opt/aiplatform/scripts/quick_diagnosis.sh > /tmp/aiplatform_diagnosis_$(date +%Y%m%d_%H%M%S).log
```

### 诊断结果解读

| 状态符号 | 含义 | 建议操作 |
|----------|------|----------|
| ✓ | 正常 | 无需处理 |
| ✗ | 异常 | 需要立即处理 |
| ⚠️ | 警告 | 需要关注 |

## 🖥️ 系统故障

### 服务无法启动

#### 症状识别
- Docker容器启动失败
- 服务端口无法访问
- 健康检查失败
- 用户无法访问Web界面

#### 排查步骤

**1. 检查Docker状态**
```bash
# 检查Docker服务
systemctl status docker

# 检查容器状态
docker ps -a

# 查看容器日志
docker logs aidesign_backend
docker logs aidesign_frontend
docker logs aidesign_postgres
```

**2. 检查资源使用**
```bash
# 内存使用
free -h

# 磁盘空间
df -h

# CPU负载
top -b -n1 | head -5
```

**3. 检查端口占用**
```bash
# 检查端口占用
netstat -tuln | grep -E ':(3000|3001|3002|5432|6379)'

# 检查进程
ps aux | grep -E '(aiplatform|docker)'
```

#### 解决方案

**方案1：重启服务**
```bash
# 进入项目目录
cd /home/ai design

# 重启所有服务
docker-compose down
docker-compose up -d

# 检查启动状态
docker-compose ps
```

**方案2：清理资源**
```bash
# 清理Docker缓存
docker system prune -a

# 释放磁盘空间
docker volume prune

# 重启Docker服务
systemctl restart docker
```

**方案3：重建服务**
```bash
# 停止并删除容器
docker-compose down --volumes

# 重新构建镜像
docker-compose build --no-cache

# 启动服务
docker-compose up -d
```

### 系统资源耗尽

#### 症状识别
- 系统响应缓慢
- 内存使用率>90%
- 磁盘使用率>95%
- CPU负载持续>80%

#### 排查工具

**内存分析**
```bash
# 内存使用详情
cat /proc/meminfo

# 查看内存占用进程
ps aux --sort=-%mem | head -10

# Docker容器内存使用
docker stats --no-stream
```

**磁盘分析**
```bash
# 磁盘使用详情
du -sh /var/lib/docker/*
du -sh /home/ai design/*

# 查看大文件
find /home/ai design -type f -size +1G -ls
```

**CPU分析**
```bash
# CPU使用详情
top -b -n1 | head -15

# 按CPU排序进程
ps aux --sort=-%cpu | head -10
```

#### 解决方案

**内存优化**
```bash
# 增加swap空间
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# 清理系统缓存
echo 3 > /proc/sys/vm/drop_caches

# 优化Docker内存限制
docker-compose up -d --scale backend=2
```

**磁盘清理**
```bash
# 清理日志文件
find /var/log -name "*.log" -mtime +30 -delete

# 清理Docker未使用资源
docker system prune -a --volumes

# 清理临时文件
rm -rf /tmp/aiplatform_*
```

## 🗄️ 数据库问题

### PostgreSQL故障

#### 症状识别
- 数据库连接失败
- 查询超时
- 连接数过多
- 数据损坏

#### 排查步骤

**1. 检查数据库状态**
```sql
-- 连接到数据库
docker exec -it aidesign_postgres psql -U postgres -d aiplatform

-- 检查连接状态
SELECT count(*) FROM pg_stat_activity;

-- 检查数据库大小
SELECT pg_size_pretty(pg_database_size('aiplatform'));

-- 检查锁等待
SELECT * FROM pg_locks WHERE NOT granted;
```

**2. 检查配置**
```bash
# 查看数据库配置
docker exec aidesign_postgres cat /var/lib/postgresql/data/postgresql.conf

# 检查连接限制
docker exec aidesign_postgres psql -U postgres -c "SHOW max_connections;"

# 检查内存配置
docker exec aidesign_postgres psql -U postgres -c "SHOW shared_buffers;"
```

**3. 检查日志**
```bash
# 查看数据库日志
docker logs aidesign_postgres --tail 100

# 检查错误日志
docker exec aidesign_postgres find /var/log/postgresql -name "*.log" -exec tail -20 {} \;
```

#### 解决方案

**连接问题**
```bash
# 增加连接数限制
docker exec aidesign_postgres psql -U postgres -c "ALTER SYSTEM SET max_connections = 200;"

# 重启数据库
docker restart aidesign_postgres

# 检查连接池配置
# 检查应用连接配置
```

**性能问题**
```sql
-- 创建索引优化查询
CREATE INDEX CONCURRENTLY idx_table_column ON table_name(column_name);

-- 更新统计信息
ANALYZE table_name;

-- 重建索引
REINDEX DATABASE aiplatform;

-- 清理无用数据
VACUUM FULL table_name;
```

**数据恢复**
```bash
# 从备份恢复
docker exec -i postgres psql -U postgres -d aiplatform < backup.sql

# 检查数据完整性
docker exec aidesign_postgres pg_dump -U postgres aiplatform > /tmp/backup_check.sql

# 修复损坏表
REINDEX TABLE corrupted_table;
```

### Redis故障

#### 症状识别
- 缓存连接失败
- 数据丢失
- 内存溢出
- 持久化失败

#### 排查步骤

**1. 检查Redis状态**
```bash
# 查看Redis信息
docker exec aidesign_redis redis-cli INFO

# 检查内存使用
docker exec aidesign_redis redis-cli INFO memory

# 检查连接数
docker exec aidesign_redis redis-cli INFO clients
```

**2. 检查数据**
```bash
# 检查键空间
docker exec aidesign_redis redis-cli DBSIZE

# 检查键类型
docker exec aidesign_redis redis-cli TYPE your_key

# 检查特定键
docker exec aidesign_redis redis-cli GET your_key
```

#### 解决方案

**内存问题**
```bash
# 清理过期键
docker exec aidesign_redis redis-cli FLUSHEXPIRED

# 清理所有数据
docker exec aidesign_redis redis-cli FLUSHALL

# 调整内存策略
docker exec aidesign_redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

**持久化问题**
```bash
# 手动保存
docker exec aidesign_redis redis-cli SAVE

# 检查RDB文件
docker exec aidesign_redis ls -la /data/dump.rdb

# 修复AOF文件
docker exec aidesign_redis redis-cli BGREWRITEAOF
```

## 🌐 网络与连接

### 网络连接问题

#### 症状识别
- 无法访问Web界面
- API请求超时
- 容器间通信失败
- 外部服务连接失败

#### 排查步骤

**1. 网络基础检查**
```bash
# 检查网络接口
ip addr show

# 检查路由表
ip route show

# 检查DNS解析
nslookup api.aiplatform.com

# 测试外网连通性
ping 8.8.8.8
```

**2. Docker网络检查**
```bash
# 查看Docker网络
docker network ls

# 检查网络详情
docker network inspect aiplatform_aidesign_network

# 测试容器间连通性
docker exec aidesign_backend ping postgres
```

**3. 端口和服务检查**
```bash
# 检查监听端口
netstat -tuln

# 检查防火墙状态
ufw status
iptables -L

# 测试端口连通性
telnet localhost 3000
nc -zv localhost 3000
```

#### 解决方案

**网络配置修复**
```bash
# 重建Docker网络
docker network rm aiplatform_aidesign_network
docker network create aiplatform_aidesign_network

# 重启服务
docker-compose down
docker-compose up -d
```

**防火墙配置**
```bash
# 添加防火墙规则
ufw allow 3000/tcp
ufw allow 3001/tcp
ufw allow 5432/tcp

# 重启防火墙
ufw disable && ufw enable
```

### 代理和负载均衡

#### 症状识别
- 502 Bad Gateway错误
- 负载不均衡
- SSL证书问题
- 代理配置错误

#### 排查步骤

**1. Nginx状态检查**
```bash
# 检查Nginx配置
docker exec aideign_nginx nginx -t

# 重新加载配置
docker exec aideign_nginx nginx -s reload

# 查看访问日志
docker logs aideign_nginx --tail 50
```

**2. SSL证书检查**
```bash
# 检查证书有效期
openssl x509 -in /path/to/cert.pem -noout -dates

# 测试SSL连接
openssl s_client -connect localhost:443 -servername localhost

# 检查证书链
openssl verify -CAfile /path/to/ca.pem /path/to/cert.pem
```

#### 解决方案

**SSL问题修复**
```bash
# 生成新证书
certbot --nginx -d aiplatform.com

# 配置自动续期
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

# 重启Nginx
docker restart aideign_nginx
```

**负载均衡优化**
```nginx
# nginx配置示例
upstream aiplatform_backend {
    least_conn;
    server backend1:3000 weight=3 max_fails=3 fail_timeout=30s;
    server backend2:3000 weight=2 max_fails=3 fail_timeout=30s;
    server backend3:3000 weight=1 backup;
}

server {
    listen 80;
    server_name aiplatform.com;
    
    location / {
        proxy_pass http://aiplatform_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
```

## 🤖 AI服务故障

### AI模型服务

#### 症状识别
- AI响应超时
- 模型加载失败
- 生成结果质量差
- GPU内存不足

#### 排查步骤

**1. 模型状态检查**
```bash
# 检查模型文件
ls -la /home/ai design/models/ai/

# 检查模型大小
du -sh /home/ai design/models/ai/*

# 检查模型完整性
python3 -c "
import torch
model = torch.load('/home/ai design/models/ai/stable-diffusion.pt')
print('Model loaded successfully:', len(model.state_dict()))
"
```

**2. GPU状态检查**
```bash
# 检查GPU状态
nvidia-smi

# 检查CUDA可用性
python3 -c "import torch; print('CUDA available:', torch.cuda.is_available())"

# 检查GPU内存
python3 -c "import torch; print('GPU memory:', torch.cuda.get_device_properties(0).total_memory)"
```

**3. 服务健康检查**
```bash
# 检查AI服务状态
curl http://localhost:3000/api/ai/health

# 检查模型加载状态
curl http://localhost:3000/api/ai/models/status

# 测试AI功能
curl -X POST http://localhost:3000/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test", "model": "stable-diffusion"}'
```

#### 解决方案

**模型加载问题**
```bash
# 重新下载模型
cd /home/ai design/models/ai/
wget https://example.com/models/stable-diffusion-v1-5.tar.gz
tar -xzf stable-diffusion-v1-5.tar.gz

# 设置权限
chmod 755 /home/ai design/models/ai/*
chown -R aiplatform:aiplatform /home/ai design/models/ai/
```

**GPU内存问题**
```bash
# 清理GPU缓存
python3 -c "
import torch
if torch.cuda.is_available():
    torch.cuda.empty_cache()
    print('GPU cache cleared')
"

# 降低批处理大小
export AI_BATCH_SIZE=8  # 从16降低到8

# 重启AI服务
docker restart aidesign_backend
```

### API网关问题

#### 症状识别
- API请求404错误
- 请求限流错误
- 认证失败
- 路由配置错误

#### 排查步骤

**1. API路由检查**
```bash
# 检查路由配置
curl http://localhost:3000/api/routes

# 测试具体API
curl http://localhost:3000/api/health
curl http://localhost:3000/api/version

# 检查认证状态
curl -H "Authorization: Bearer invalid_token" \
     http://localhost:3000/api/user/profile
```

**2. 限流状态检查**
```bash
# 检查Redis中的限流数据
docker exec aidesign_redis redis-cli KEYS "rate_limit:*"

# 检查API调用统计
docker exec aidesign_redis redis-cli HGETALL "api_stats:daily"

# 查看限流配置
grep -r "rateLimit" /home/ai design/backend/src/
```

#### 解决方案

**API配置修复**
```javascript
// 修复路由配置示例
const express = require('express');
const app = express();

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            database: 'connected',
            redis: 'connected',
            ai: 'ready'
        }
    });
});

// API版本信息
app.get('/api/version', (req, res) => {
    res.json({
        version: process.env.APP_VERSION || '2.1.0',
        build: process.env.BUILD_NUMBER || 'unknown',
        environment: process.env.NODE_ENV || 'production'
    });
});
```

**限流优化**
```javascript
// Redis限流配置
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const limiter = rateLimit({
    store: new RedisStore({
        client: redis,
        prefix: 'rl:'
    }),
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 最多100个请求
    message: {
        error: 'Too many requests',
        retryAfter: '15 minutes'
    }
});
```

## ⚡ 性能问题

### 响应时间优化

#### 症状识别
- 页面加载缓慢
- API响应延迟
- 数据库查询慢
- 文件下载慢

#### 性能监控工具

**1. 应用性能监控**
```bash
# 使用Node.js性能分析
node --prof /home/ai design/backend/src/app.js

# 生成性能报告
node --prof-process isolate-*.log > performance-report.txt

# 监控内存使用
node --inspect /home/ai design/backend/src/app.js
```

**2. 数据库性能分析**
```sql
-- 慢查询日志
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- 索引使用情况
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read 
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- 表大小分析
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**3. 网络性能测试**
```bash
# 压力测试API
ab -n 1000 -c 10 http://localhost:3000/api/health

# 测试数据库连接
pgbench -h localhost -p 5432 -U postgres -d aiplatform -c 10 -j 2 -t 60

# 测试Redis性能
redis-benchmark -h localhost -p 6379 -c 50 -n 10000
```

#### 性能优化方案

**应用层优化**
```javascript
// 数据库连接池优化
const pool = new Pool({
    host: 'postgres',
    port: 5432,
    database: 'aiplatform',
    user: 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    max: 20,        // 最大连接数
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// 缓存策略
const cacheOptions = {
    host: 'redis',
    port: 6379,
    ttl: 300,        // 5分钟缓存
    maxKeys: 10000,  // 最大缓存键数
    checkPeriod: 600   // 10分钟检查过期
};

// API响应优化
app.use(compression()); // 启用gzip压缩
app.use(helmet());     // 安全头优化
app.set('trust proxy', 1); // 代理信任
```

**数据库优化**
```sql
-- 创建复合索引
CREATE INDEX CONCURRENTLY idx_user_email_status 
ON users(email, status);

-- 分区表优化
CREATE TABLE events (
    id SERIAL,
    event_type VARCHAR(50),
    created_at TIMESTAMP,
    data JSONB
) PARTITION BY RANGE (created_at);

-- 查询优化
EXPLAIN ANALYZE
SELECT * FROM users 
WHERE email = $1 AND status = 'active';
```

### 资源使用优化

#### 内存优化

**1. 应用内存优化**
```javascript
// 内存泄漏检测
const memoryUsage = process.memoryUsage();
console.log({
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
});

// 对象池优化
const ObjectPool = {
    objects: [],
    create: function() {
        return this.objects.pop() || new ExpensiveObject();
    },
    release: function(obj) {
        obj.reset();
        this.objects.push(obj);
    }
};
```

**2. 系统内存优化**
```bash
# 调整swap使用
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p

# 优化内存回收
echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf

# 重启生效
sysctl --system
```

#### CPU优化

**1. 进程优化**
```bash
# 设置进程优先级
nice -n -10 /usr/bin/node /home/ai design/backend/src/app.js

# 设置CPU亲和性
taskset -c 0,1 /usr/bin/node /home/ai design/backend/src/app.js

# 查看进程详情
ps -eo pid,ppid,cmd,%cpu,%mem --sort=-%cpu | head -10
```

**2. 容器资源限制**
```yaml
# docker-compose.yml优化
version: '3.8'
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
    restart_policy:
      condition: on-failure
      delay: 5s
      max_attempts: 3
```

## 🔒 安全事件

### 安全事件响应

#### 症状识别
- 异常登录尝试
- 数据泄露迹象
- 恶意文件上传
- SQL注入攻击
- DDoS攻击

#### 检测工具

**1. 日志分析**
```bash
# 检测可疑IP
grep -r "POST /api/login" /var/log/nginx/ | \
  awk '{print $1}' | sort | uniq -c | sort -nr | head -10

# 检测异常请求
grep -E "(union|select|drop|delete)" /var/log/nginx/access.log | \
  awk '{print $7, $1}' | sort | uniq

# 检测上传文件
grep "POST /api/upload" /var/log/nginx/access.log | \
  awk '{print $7, $9}' | grep -E "(200|201)"
```

**2. 入侵检测**
```bash
# Fail2Ban状态检查
fail2ban-client status sshd
fail2ban-client status nginx-auth

# 查看被阻止的IP
iptables -L -n | grep DROP

# 检查系统完整性
aide --check
```

#### 应急响应

**1. 隔离感染系统**
```bash
# 断开网络连接
iptables -P INPUT DROP
iptables -P OUTPUT DROP

# 保存内存镜像
dd if=/dev/memdump of=/tmp/memdump.dd bs=1M

# 停止可疑服务
systemctl stop nginx
docker stop aideign_nginx
```

**2. 取证分析**
```bash
# 收集系统信息
ps aux > /tmp/processes.txt
netstat -tuln > /tmp/network.txt
last > /tmp/login_history.txt

# 检查文件完整性
find /home/ai design -type f -mtime -1 -ls > /tmp/modified_files.txt

# 检查用户活动
lastlog | grep -v "**Never**" > /tmp/user_activity.txt
```

**3. 恢复和修复**
```bash
# 从备份恢复
restore -rf /backup/latest /home/ai design/

# 重置密码
openssl passwd -1 newpassword

# 清理后门
find /home/ai design -name "*.sh" -perm +111 -exec rm {} \;

# 更新系统
yum update -y  # CentOS/RHEL
apt update && apt upgrade -y  # Ubuntu/Debian
```

### 安全加固

#### 系统安全

**1. 防火墙配置**
```bash
# UFW配置
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# iptables规则
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -j DROP
```

**2. 系统加固**
```bash
# 禁用不必要服务
systemctl disable bluetooth
systemctl disable cups
systemctl disable avahi-daemon

# 文件权限加固
chmod 600 /home/ai design/.env*
chmod 755 /home/ai design/scripts/
chmod 644 /home/ai design/config/*

# 内核参数优化
echo 'net.ipv4.ip_forward = 0' >> /etc/sysctl.conf
echo 'net.ipv4.conf.all_send_redirects = 0' >> /etc/sysctl.conf
sysctl --system
```

## 📊 数据恢复

### 数据备份恢复

#### 恢复流程

**1. 评估数据损坏**
```bash
# 检查数据库一致性
docker exec aidesign_postgres pg_dump -U postgres aiplatform > /tmp/check_dump.sql

# 验证文件完整性
md5sum /backup/latest/aiplatform_backup.sql
md5sum /backup/latest/aiplatform_files.tar.gz

# 检查备份时间
stat /backup/latest/aiplatform_backup.sql
```

**2. 选择恢复点**
```bash
# 列出可用备份
ls -la /backup/ | grep "aiplatform"

# 查看备份日志
cat /backup/backup.log | grep "aiplatform" | tail -10

# 验证备份完整性
pg_restore --list /backup/latest/aiplatform_backup.sql
```

**3. 执行恢复**
```bash
# 停止所有服务
docker-compose down

# 备份当前数据（以防恢复失败）
mv /home/ai design/uploads /home/ai design/uploads_backup_$(date +%Y%m%d)

# 恢复数据库
docker exec -i postgres psql -U postgres -d aiplatform < /backup/latest/aiplatform_backup.sql

# 恢复文件
tar -xzf /backup/latest/aiplatform_files.tar.gz -C /

# 重启服务
docker-compose up -d
```

#### 验证恢复

**1. 数据完整性验证**
```sql
-- 检查用户数据
SELECT COUNT(*) FROM users;
SELECT MAX(created_at) FROM users;

-- 检查项目数据
SELECT COUNT(*) FROM projects;
SELECT DISTINCT status FROM projects;

-- 检查外键约束
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f';
```

**2. 功能测试**
```bash
# 测试用户登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'

# 测试文件上传
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/tmp/test.txt"

# 测试AI功能
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello AI"}'
```

## 🚨 紧急预案

### 服务中断预案

#### P1 - 完全服务中断

**响应时间**：15分钟内响应，1小时内恢复

**立即行动**：
1. **团队响应**：
   - 运维负责人：立即评估影响范围
   - 开发负责人：开始代码回滚准备
   - 客服负责人：准备用户通知

2. **快速诊断**：
   ```bash
   # 运行紧急诊断脚本
   /opt/aiplatform/scripts/emergency_diagnosis.sh
   
   # 检查最近部署
   git log --oneline -5
   docker ps --format "table {{.Names}}\t{{.Status}}"
   ```

3. **紧急修复**：
   ```bash
   # 快速回滚到上一版本
   git checkout HEAD~1
   docker-compose down
   docker-compose up -d --force-recreate
   ```

#### P2 - 部分功能故障

**响应时间**：30分钟内响应，4小时内恢复

**处理流程**：
1. **影响评估**：确定影响用户范围和功能
2. **临时方案**：提供备用解决方案
3. **根因分析**：深入调查故障原因
4. **永久修复**：实施根本解决方案

#### P3 - 性能下降

**响应时间**：2小时内响应，24小时内解决

**优化措施**：
1. **性能监控**：实时监控系统性能指标
2. **资源调配**：临时增加服务器资源
3. **服务降级**：暂时关闭非核心功能
4. **逐步恢复**：问题解决后逐步恢复所有功能

### 数据泄露预案

#### 泄露检测

**1. 异常监控**：
```bash
# 监控异常数据访问
grep -r "SELECT.* FROM.*users" /var/log/postgresql/ | tail -20

# 监控大量文件下载
grep -r "GET.*uploads" /var/log/nginx/access.log | \
  awk '$9 > 1000000' | tail -20

# 监控API异常调用
grep -r "POST.*api/export" /var/log/nginx/access.log | \
  awk '{print $1}' | sort | uniq -c | sort -nr | head -10
```

**2. 数据完整性检查**：
```bash
# 检查敏感文件完整性
find /home/ai design/uploads -name "*.sql" -exec md5sum {} \;

# 验证用户数据一致性
docker exec aidesign_postgres psql -U postgres -d aiplatform -c "
  SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
"
```

#### 应急响应

**1. 立即隔离**：
```bash
# 切换到维护模式
curl -X POST http://localhost:3000/admin/maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": true, "message": "系统维护中..."}'

# 禁用可疑账户
docker exec aidesign_postgres psql -U postgres -d aiplatform -c "
  UPDATE users SET status = 'suspended' WHERE last_login < NOW() - INTERVAL '7 days';
"
```

**2. 通知用户**：
```bash
# 发送安全通知邮件
python3 /opt/aiplatform/scripts/send_security_alert.py \
  --type "data_breach" \
  --severity "high" \
  --message "检测到潜在数据安全事件，请立即修改密码"
```

**3. 取证和修复**：
```bash
# 保存系统状态快照
tar -czf /evidence/system_snapshot_$(date +%Y%m%d_%H%M%S).tar.gz \
  /var/log /etc /home/ai design

# 强制密码重置
docker exec aidesign_postgres psql -U postgres -d aiplatform -c "
  UPDATE users SET password_reset_required = true, password_hash = '';
"
```

### 灾难恢复预案

#### 灾难场景

**1. 数据中心故障**：
- 主数据中心不可访问
- 需要切换到备用站点
- 执行灾难恢复计划

**2. 大规模数据损坏**：
- 数据库严重损坏
- 备份文件损坏
- 需要从冷备份恢复

**3. 安全攻击事件**：
- 系统被黑客控制
- 需要完全重建环境
- 调查和修复安全漏洞

#### 恢复流程

**1. 评估损失**：
```bash
# 快速评估脚本
/opt/aiplatform/scripts/disaster_assessment.sh

# 损失报告
echo "灾难类型: $1"
echo "影响范围: $2"
echo "预计恢复时间: $3"
echo "所需资源: $4" > /tmp/disaster_report.txt
```

**2. 启动备用系统**：
```bash
# 切换到备用数据中心
sed -i 's/primary.datacenter/backup.datacenter/g' /home/ai design/.env

# 启动备用服务
docker-compose -f docker-compose.backup.yml up -d

# 验证备用系统功能
curl http://backup.aiplatform.com/health
```

**3. 数据恢复**：
```bash
# 从异地备份恢复
scp backup@offsite:/backups/latest/* /tmp/

# 逐步恢复服务
docker-compose up -d postgres
docker-compose up -d redis
docker-compose up -d backend
docker-compose up -d frontend

# 全面功能测试
/opt/aiplatform/scripts/full_system_test.sh
```

---

**文档版本**：v2.1.0  
**更新时间**：2024年1月  
**维护团队**：AiDesign运维团队

此文档应定期更新以反映最新的系统架构和故障处理流程。所有运维人员都应熟悉这些流程并定期进行演练。