# AiDesign 部署最佳实践

## 📋 目录

- [部署架构](#部署架构)
- [环境准备](#环境准备)
- [Docker部署](#docker部署)
- [Kubernetes部署](#kubernetes部署)
- [CI/CD流水线](#cicd流水线)
- [安全配置](#安全配置)
- [监控和日志](#监控和日志)
- [备份和恢复](#备份和恢复)
- [故障处理](#故障处理)

## 🏗️ 部署架构

### 推荐架构设计

#### 生产环境架构

```
┌─────────────────────────────────────────────────────────────┐
│                    负载均衡层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    Nginx    │  │   Cloudflare │  │    DNS      │ │
│  │  (主负载)   │  │   (CDN/防护) │  │   (解析)    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    应用层                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Frontend   │  │   Backend    │  │   AI服务    │ │
│  │   (React)   │  │  (Node.js)   │  │ (PyTorch)   │ │
│  │  多实例     │  │   多实例     │  │    GPU      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   数据层                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ PostgreSQL  │  │    Redis     │  │  File Storage│ │
│  │   (主从)    │  │   (集群)     │  │   (分布式)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 高可用架构组件

**1. 负载均衡**
- **主负载均衡器**：Nginx + Keepalived
- **CDN加速**：Cloudflare/AWS CloudFront
- **健康检查**：自动检测和剔除故障节点
- **SSL终止**：统一SSL证书管理

**2. 应用服务**
- **多实例部署**：至少2个实例
- **自动扩缩容**：基于负载自动调节
- **服务发现**：Consul/Etcd
- **配置管理**：集中配置中心

**3. 数据存储**
- **数据库**：PostgreSQL主从复制
- **缓存**：Redis Cluster
- **文件存储**：MinIO/S3兼容存储
- **备份**：定期全量+增量备份

## 🛠️ 环境准备

### 硬件要求

#### 最小配置（开发/测试）

| 组件 | CPU | 内存 | 存储 | 网络 |
|------|-----|------|------|------|
| 应用服务器 | 2核 | 4GB | 50GB SSD | 100Mbps |
| 数据库服务器 | 2核 | 4GB | 100GB SSD | 100Mbps |
| Redis服务器 | 1核 | 2GB | 20GB SSD | 100Mbps |

#### 推荐配置（生产环境）

| 组件 | CPU | 内存 | 存储 | 网络 |
|------|-----|------|------|------|
| 应用服务器 | 4核 | 8GB | 100GB NVMe | 1Gbps |
| 数据库服务器 | 8核 | 16GB | 500GB NVMe | 1Gbps |
| Redis服务器 | 4核 | 8GB | 100GB NVMe | 1Gbps |
| AI服务器 | 16核 | 64GB | 1TB NVMe | 10Gbps |

#### 企业配置（高负载）

| 组件 | CPU | 内存 | 存储 | 网络 | GPU |
|------|-----|------|------|------|-----|
| 应用服务器集群 | 8核 | 16GB | 200GB NVMe | 10Gbps | - |
| 数据库集群 | 16核 | 64GB | 2TB NVMe | 10Gbps | - |
| 缓存集群 | 8核 | 32GB | 500GB NVMe | 10Gbps | - |
| AI服务器集群 | 32核 | 128GB | 2TB NVMe | 40Gbps | 4x A100 |

### 操作系统要求

#### 推荐操作系统

**Linux发行版**
```bash
# Ubuntu 20.04/22.04 LTS
apt update && apt install -y \
    curl wget gnupg2 software-properties-common \
    apt-transport-https ca-certificates \
    lsb-release

# CentOS/RHEL 8/9
yum update -y && yum groupinstall -y "Development Tools"
yum install -y curl wget htop iotop

# Docker安装
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

**内核参数优化**
```bash
# /etc/sysctl.d/99-aiplatform.conf
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
fs.file-max = 2097152
vm.swappiness = 10

# 应用配置
sysctl --system
```

## 🐳 Docker部署

### 生产环境Docker配置

#### Docker Compose优化

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Nginx负载均衡
  nginx:
    image: nginx:alpine
    container_name: aideign_nginx_lb
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
      - nginx_logs:/var/log/nginx
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
    networks:
      - aiplatform_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # 前端应用
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    image: aiplatform/frontend:latest
    container_name: aideign_frontend_1
    environment:
      - NODE_ENV=production
      - API_URL=https://api.aiplatform.com
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    networks:
      - aiplatform_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  # 后端应用
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    image: aiplatform/backend:latest
    container_name: aideign_backend_1
    environment:
      - NODE_ENV=production
      - POSTGRES_HOST=postgres
      - REDIS_HOST=redis
      - JWT_SECRET=${JWT_SECRET}
      - AI_MODEL_PATH=/models
    volumes:
      - models_data:/models:ro
      - logs_data:/app/logs
      - uploads_data:/app/uploads
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    networks:
      - aiplatform_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # AI服务（可选）
  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile.prod
    image: aiplatform/ai-service:latest
    container_name: aideign_ai_service_1
    environment:
      - CUDA_VISIBLE_DEVICES=0,1
      - MODEL_CACHE_SIZE=4GB
    volumes:
      - models_data:/models:ro
      - gpu_cache:/tmp/gpu_cache
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 8G
    devices:
      - /dev/nvidia0
      - /dev/nvidia1
    networks:
      - aiplatform_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  models_data:
    driver: local
  uploads_data:
    driver: local
  logs_data:
    driver: local
  nginx_logs:
    driver: local
  gpu_cache:
    driver: local

networks:
  aiplatform_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
          gateway: 172.20.0.1
```

#### 生产环境Dockerfile

**前端Dockerfile.prod**
```dockerfile
# 多阶段构建优化
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产镜像
FROM nginx:alpine

# 安装必要工具
RUN apk add --no-cache curl

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制Nginx配置
COPY nginx/nginx.prod.conf /etc/nginx/conf.d/default.conf

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 设置权限
RUN chown -R nextjs:nodejs /usr/share/nginx/html && \
    chown -R nextjs:nodejs /var/cache/nginx && \
    chown -R nextjs:nodejs /var/log/nginx

# 切换到非root用户
USER nextjs

EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080 || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

**后端Dockerfile.prod**
```dockerfile
FROM node:18-alpine AS deps

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 生产依赖
FROM node:18-alpine AS runtime

# 安装系统依赖
RUN apk add --no-cache \
    curl \
    dumb-init \
    ca-certificates

WORKDIR /app

# 复制node_modules
COPY --from=deps /app/node_modules ./node_modules

# 复制应用代码
COPY --chown=nodejs:nodejs . .

# 创建日志目录
RUN mkdir -p /app/logs && chown nodejs:nodejs /app/logs

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 使用dumb-init作为PID 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/app.js"]
```

### 部署脚本

#### 自动化部署脚本

```bash
#!/bin/bash
# deploy.sh - 生产环境部署脚本

set -e  # 遇到错误立即退出

# 配置变量
APP_NAME="aiplatform"
DEPLOY_DIR="/opt/aiplatform"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/deploy.log"
COMPOSE_FILE="docker-compose.prod.yml"

# 日志函数
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# 错误处理
error_exit() {
    log "ERROR: $1"
    exit 1
}

# 检查环境
check_environment() {
    log "检查部署环境..."
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        error_exit "Docker未安装"
    fi
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error_exit "Docker Compose未安装"
    fi
    
    # 检查磁盘空间
    available_space=$(df /opt | awk 'NR==2 {print $4}')
    if [ $available_space -lt 10485760 ]; then  # 10GB
        error_exit "磁盘空间不足，至少需要10GB"
    fi
    
    log "环境检查通过"
}

# 备份当前版本
backup_current() {
    log "备份当前部署..."
    
    backup_time=$(date +%Y%m%d_%H%M%S)
    backup_dir="$BACKUP_DIR/$backup_time"
    
    mkdir -p "$backup_dir"
    
    # 备份数据库
    docker exec aideign_postgres pg_dump -U postgres aiplatform > "$backup_dir/database.sql"
    
    # 备份上传文件
    docker run --rm -v aideign_uploads_data:/data -v "$backup_dir":/backup \
        alpine tar czf /backup/uploads.tar.gz -C /data .
    
    # 备份配置文件
    cp -r $DEPLOY_DIR/.env* "$backup_dir/"
    
    log "备份完成: $backup_dir"
}

# 拉取最新代码
pull_latest_code() {
    log "拉取最新代码..."
    
    cd $DEPLOY_DIR
    git fetch origin
    git reset --hard origin/main
    
    log "代码更新完成"
}

# 构建和部署
deploy_app() {
    log "开始部署应用..."
    
    # 停止旧服务
    cd $DEPLOY_DIR
    docker-compose -f $COMPOSE_FILE down
    
    # 拉取最新镜像
    docker-compose -f $COMPOSE_FILE pull
    
    # 构建新镜像
    docker-compose -f $COMPOSE_FILE build --no-cache
    
    # 启动服务
    docker-compose -f $COMPOSE_FILE up -d
    
    log "服务启动完成"
}

# 健康检查
health_check() {
    log "执行健康检查..."
    
    # 等待服务启动
    sleep 30
    
    # 检查各个服务
    services=("nginx" "frontend" "backend" "postgres" "redis")
    
    for service in "${services[@]}"; do
        if docker exec aideign_$service curl -f http://localhost/health > /dev/null 2>&1; then
            log "✓ $service 健康检查通过"
        else
            error_exit "$service 健康检查失败"
        fi
    done
    
    log "所有服务健康检查通过"
}

# 清理旧镜像
cleanup() {
    log "清理旧镜像..."
    
    # 删除未使用的镜像
    docker image prune -f
    
    # 删除旧版本镜像（保留最近3个版本）
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}" | \
        grep aiplatform | tail -n +4 | \
        awk '{print $3}' | xargs -r docker rmi -f
    
    log "清理完成"
}

# 主函数
main() {
    log "开始部署 $APP_NAME..."
    
    check_environment
    backup_current
    pull_latest_code
    deploy_app
    health_check
    cleanup
    
    log "部署完成！"
    
    # 发送部署通知
    send_notification "AiDesign部署成功" "所有服务正常运行"
}

# 发送通知
send_notification() {
    local title="$1"
    local message="$2"
    
    # 钉钉通知
    if [ -n "$DINGTALK_WEBHOOK" ]; then
        curl -H "Content-Type: application/json" \
             -d "{\"msgtype\": \"text\", \"text\": \"$title\n$message\"}" \
             "$DINGTALK_WEBHOOK"
    fi
    
    # 邮件通知
    if [ -n "$DEPLOY_EMAIL" ]; then
        echo "$message" | mail -s "$title" "$DEPLOY_EMAIL"
    fi
}

# 执行部署
main "$@"
```

## ☸️ Kubernetes部署

### Kubernetes配置

#### 集群架构设计

```yaml
# kubernetes/namespace.yml
apiVersion: v1
kind: Namespace
metadata:
  name: aiplatform
  labels:
    name: aiplatform
    environment: production

---
# kubernetes/configmap.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aiplatform-config
  namespace: aiplatform
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  API_URL: "https://api.aiplatform.com"
  REDIS_HOST: "redis-service"
  POSTGRES_HOST: "postgres-service"
```

#### 应用部署配置

```yaml
# kubernetes/backend-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-deployment
  namespace: aiplatform
  labels:
    app: backend
    environment: production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
        environment: production
    spec:
      containers:
      - name: backend
        image: aiplatform/backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: aiplatform-config
              key: NODE_ENV
        - name: POSTGRES_HOST
          valueFrom:
            configMapKeyRef:
              name: aiplatform-config
              key: POSTGRES_HOST
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: aiplatform-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: aiplatform-secrets
              key: redis-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "curl -X POST http://localhost:3000/shutdown"]

---
# kubernetes/backend-service.yml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: aiplatform
  labels:
    app: backend
spec:
  selector:
    app: backend
  ports:
  - name: http
    port: 80
    targetPort: 3000
  type: ClusterIP
```

#### Ingress配置

```yaml
# kubernetes/ingress.yml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: aiplatform-ingress
  namespace: aiplatform
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - api.aiplatform.com
    - app.aiplatform.com
    secretName: aiplatform-tls
  rules:
  - host: api.aiplatform.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
  - host: app.aiplatform.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

#### 自动扩缩容配置

```yaml
# kubernetes/hpa.yml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: aiplatform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-deployment
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
      selectPolicy: Min
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
      selectPolicy: Max
```

## 🔄 CI/CD流水线

### GitLab CI配置

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy-staging
  - deploy-production

variables:
  DOCKER_REGISTRY: registry.gitlab.com/aiplatform
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"
  MAVEN_OPTS: "-Dmaven.repo.local=$CI_PROJECT_DIR/.m2/repository"

# 测试阶段
test:backend:
  stage: test
  image: node:18-alpine
  services:
    - postgres:13
    - redis:6-alpine
  variables:
    POSTGRES_DB: test_db
    POSTGRES_USER: test_user
    POSTGRES_PASSWORD: test_pass
    POSTGRES_HOST: postgres
    REDIS_URL: redis://redis:6379
  before_script:
    - cd backend
    - npm ci
  script:
    - npm run lint
    - npm run test:unit
    - npm run test:integration
  coverage: '/Coverage: \d+\.\d+%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
    expire_in: 1 week
  only:
    - merge_requests
    - main
    - develop

test:frontend:
  stage: test
  image: node:18-alpine
  before_script:
    - cd frontend
    - npm ci
  script:
    - npm run lint
    - npm run test:unit
    - npm run test:e2e
  coverage: '/Coverage: \d+\.\d+%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
    expire_in: 1 week
  only:
    - merge_requests
    - main
    - develop

# 构建阶段
build:backend:
  stage: build
  image: docker:20.10.16
  services:
    - docker:20.10.16-dind
  variables:
    IMAGE_TAG: $CI_COMMIT_SHORT_SHA
  script:
    - cd backend
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -f Dockerfile.prod -t $DOCKER_REGISTRY/backend:$IMAGE_TAG .
    - docker push $DOCKER_REGISTRY/backend:$IMAGE_TAG
    - docker tag $DOCKER_REGISTRY/backend:$IMAGE_TAG $DOCKER_REGISTRY/backend:latest
    - docker push $DOCKER_REGISTRY/backend:latest
  only:
    - main
    - develop

build:frontend:
  stage: build
  image: docker:20.10.16
  services:
    - docker:20.10.16-dind
  variables:
    IMAGE_TAG: $CI_COMMIT_SHORT_SHA
  script:
    - cd frontend
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -f Dockerfile.prod -t $DOCKER_REGISTRY/frontend:$IMAGE_TAG .
    - docker push $DOCKER_REGISTRY/frontend:$IMAGE_TAG
    - docker tag $DOCKER_REGISTRY/frontend:$IMAGE_TAG $DOCKER_REGISTRY/frontend:latest
    - docker push $DOCKER_REGISTRY/frontend:latest
  only:
    - main
    - develop

# 部署到测试环境
deploy:staging:
  stage: deploy-staging
  image: bitnami/kubectl:latest
  environment:
    KUBECONFIG: $STAGING_KUBECONFIG
  script:
    - kubectl set image deployment/backend-deployment backend=$DOCKER_REGISTRY/backend:$CI_COMMIT_SHORT_SHA
    - kubectl set image deployment/frontend-deployment frontend=$DOCKER_REGISTRY/frontend:$CI_COMMIT_SHORT_SHA
    - kubectl rollout status deployment/backend-deployment
    - kubectl rollout status deployment/frontend-deployment
  only:
    - develop

# 部署到生产环境
deploy:production:
  stage: deploy-production
  image: bitnami/kubectl:latest
  environment:
    KUBECONFIG: $PRODUCTION_KUBECONFIG
  script:
    - echo "部署到生产环境"
    - kubectl set image deployment/backend-deployment backend=$DOCKER_REGISTRY/backend:$CI_COMMIT_SHORT_SHA
    - kubectl set image deployment/frontend-deployment frontend=$DOCKER_REGISTRY/frontend:$CI_COMMIT_SHORT_SHA
    - kubectl rollout status deployment/backend-deployment
    - kubectl rollout status deployment/frontend-deployment
    - kubectl get pods -n aiplatform
  when: manual
  only:
    - main
  allow_failure: false
```

### GitHub Actions配置

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
    
    - name: Install dependencies
      run: |
        cd backend && npm ci
        cd ../frontend && npm ci
    
    - name: Run tests
      run: |
        cd backend && npm run test
        cd ../frontend && npm run test
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        directory: ./coverage
        files: ./coverage/cobertura-coverage.xml

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-west-2
    
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1
    
    - name: Build and push Docker images
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        ECR_REPOSITORY: aiplatform
      run: |
        # Build backend
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY/backend:$GITHUB_SHA ./backend
        docker push $ECR_REGISTRY/$ECR_REPOSITORY/backend:$GITHUB_SHA
        
        # Build frontend
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY/frontend:$GITHUB_SHA ./frontend
        docker push $ECR_REGISTRY/$ECR_REPOSITORY/frontend:$GITHUB_SHA
    
    - name: Deploy to Kubernetes
      run: |
        aws eks update-kubeconfig --name aiplatform-cluster
        kubectl set image deployment/backend-deployment backend=$ECR_REGISTRY/$ECR_REPOSITORY/backend:$GITHUB_SHA
        kubectl set image deployment/frontend-deployment frontend=$ECR_REGISTRY/$ECR_REPOSITORY/frontend:$GITHUB_SHA
        kubectl rollout status deployment/backend-deployment
        kubectl rollout status deployment/frontend-deployment
```

## 🔒 安全配置

### SSL/TLS配置

#### Let's Encrypt证书配置

```bash
#!/bin/bash
# setup-ssl.sh - SSL证书配置

DOMAIN="api.aiplatform.com"
EMAIL="admin@aiplatform.com"
NGINX_DIR="/etc/nginx"
CERT_DIR="$NGINX_DIR/ssl"

# 安装Certbot
apt update
apt install -y certbot python3-certbot-nginx

# 申请证书
certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --no-eff-email -n

# 配置自动续期
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --nginx") | crontab -

# 设置强化的Nginx SSL配置
cat > $NGINX_DIR/conf.d/ssl.conf << EOF
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# 其他安全头
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
EOF

echo "SSL配置完成"
```

### 防火墙配置

```bash
#!/bin/bash
# setup-firewall.sh - 防火墙配置

# UFW基本配置
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# 允许SSH（限制IP）
ufw allow from 192.168.1.0/24 to any port 22 proto tcp

# 允许HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# 允许监控端口
ufw allow from 10.0.0.0/8 to any port 3002 proto tcp

# 启用防火墙
ufw --force enable

# 安装fail2ban
apt install -y fail2ban

# 配置SSH保护
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

# 配置Nginx保护
cat > /etc/fail2ban/jail.d/nginx.conf << EOF
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5
findtime = 600
bantime = 3600
EOF

systemctl enable fail2ban
systemctl restart fail2ban

echo "防火墙配置完成"
```

## 📊 监控和日志

### Prometheus监控配置

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'kubernetes-apiservers'
    kubernetes_sd_configs:
    - role: endpoints
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
    - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
      action: keep
        regex: __meta_kubernetes_namespace;kubernetes-apiservers;__meta_kubernetes_service_name;kubernetes;__meta_kubernetes_endpoint_port_name;https

  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
    - role: node
    relabel_configs:
    - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
        replacement: $1
    - target_label: __address__
        replacement: kubernetes-default
    - source_labels: [__address__]
        regex: (.+)
        target_label: instance
        replacement: ${1}
```

### Grafana仪表板

```json
{
  "dashboard": {
    "id": null,
    "title": "AiDesign Production Dashboard",
    "tags": ["aiplatform", "production"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (service)",
            "legendFormat": "{{service}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0},
        "yAxes": [
          {
            "label": "Requests/sec"
          }
        ]
      },
      {
        "id": 2,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "95th percentile"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

### 日志管理

```yaml
# docker-compose.logging.yml
version: '3.8'

x-logging: &default-logging
  driver: "json-file"
  options:
    max-size: "100m"
    max-file: "3"
    labels: "service,environment"

services:
  # ELK Stack
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.14.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    logging: *default-logging

  logstash:
    image: docker.elastic.co/logstash/logstash:7.14.0
    volumes:
      - ./logging/logstash.conf:/usr/share/logstash/pipeline/logstash.conf:ro
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch
    logging: *default-logging

  kibana:
    image: docker.elastic.co/kibana/kibana:7.14.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
    logging: *default-logging

volumes:
  elasticsearch_data:
```

## 💾 备份和恢复

### 数据库备份策略

```bash
#!/bin/bash
# backup-database.sh - 数据库备份脚本

BACKUP_DIR="/opt/backups/database"
RETENTION_DAYS=30
DB_NAME="aiplatform"
DB_USER="postgres"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 全量备份
full_backup() {
    local backup_file="$BACKUP_DIR/full_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    echo "开始全量备份: $backup_file"
    
    docker exec aideign_postgres pg_dump -U $DB_USER -d $DB_NAME \
        --no-password --verbose --clean --if-exists \
        > $backup_file
    
    if [ $? -eq 0 ]; then
        echo "全量备份完成: $backup_file"
        compress_backup $backup_file
    else
        echo "全量备份失败"
        exit 1
    fi
}

# 增量备份
incremental_backup() {
    local backup_file="$BACKUP_DIR/incremental_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    echo "开始增量备份: $backup_file"
    
    # 获取上次备份时间戳
    local last_backup=$(ls -t $BACKUP_DIR/full_backup_*.sql.gz 2>/dev/null | head -1 | xargs basename -s .sql.gz)
    
    if [ -n "$last_backup" ]; then
        # 这里应该实现增量备份逻辑
        echo "增量备份基于: $last_backup"
    else
        # 如果没有全量备份，执行全量备份
        full_backup
        return
    fi
}

# 压缩备份文件
compress_backup() {
    local file=$1
    echo "压缩备份文件: $file"
    gzip $file
    
    if [ $? -eq 0 ]; then
        echo "压缩完成: $file.gz"
        rm $file
    else
        echo "压缩失败: $file"
        exit 1
    fi
}

# 清理过期备份
cleanup_old_backups() {
    echo "清理 $RETENTION_DAYS 天前的备份文件..."
    find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
    find $BACKUP_DIR -name "*.sql" -mtime +$RETENTION_DAYS -delete
}

# 验证备份完整性
verify_backup() {
    local file=$1
    echo "验证备份完整性: $file"
    
    # 检查文件大小
    if [ ! -s "$file" ]; then
        echo "备份文件为空或不存在: $file"
        return 1
    fi
    
    # 检查SQL语法
    if gunzip -t "$file" 2>/dev/null; then
        echo "备份文件完整性验证通过: $file"
        return 0
    else
        echo "备份文件损坏: $file"
        return 1
    fi
}

# 主执行逻辑
case $1 in
    full)
        full_backup
        ;;
    incremental)
        incremental_backup
        ;;
    *)
        echo "用法: $0 {full|incremental}"
        exit 1
        ;;
esac

cleanup_old_backups

echo "备份流程完成"
```

### 自动化备份调度

```yaml
# kubernetes/backup-cronjob.yml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
  namespace: aiplatform
spec:
  schedule: "0 2 * * *"  # 每天凌晨2点
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:13-alpine
            command:
            - /bin/bash
            - -c
            - |
              BACKUP_FILE="/backup/backup_$(date +%Y%m%d_%H%M%S).sql"
              pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB \
                  --no-password --verbose --clean --if-exists \
                  > $BACKUP_FILE
              
              if [ $? -eq 0 ]; then
                gzip $BACKUP_FILE
                echo "备份成功: $BACKUP_FILE.gz"
              else
                echo "备份失败"
                exit 1
              fi
            env:
            - name: POSTGRES_HOST
              valueFrom:
                configMapKeyRef:
                  name: aiplatform-config
                  key: POSTGRES_HOST
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: aiplatform-secrets
                  key: postgres-user
            - name: POSTGRES_DB
              valueFrom:
                configMapKeyRef:
                  name: aiplatform-config
                  key: POSTGRES_DB
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
          backoffLimit: 3
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
```

---

**文档版本**：v2.1.0  
**更新时间**：2024年1月  
**维护团队**：AiDesign运维团队

部署最佳实践需要根据实际环境和需求不断调整，建议定期审查和更新部署策略以确保系统的稳定性和安全性。