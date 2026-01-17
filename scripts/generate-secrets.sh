#!/bin/bash

# 生成安全的环境变量密钥
set -e

echo "🔐 生成安全密钥..."

# 检查openssl是否可用
if ! command -v openssl &> /dev/null; then
    echo "❌ 需要安装OpenSSL"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "运行: sudo apt-get install openssl"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "运行: brew install openssl"
    fi
    exit 1
fi

# 生成随机密钥函数
generate_key() {
    local length=${1:-64}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# 检查现有环境文件
ENV_FILE=".env"
BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"

if [ -f "$ENV_FILE" ]; then
    echo "📋 发现现有环境文件，创建备份: $BACKUP_FILE"
    cp "$ENV_FILE" "$BACKUP_FILE"
fi

# 生成新的安全密钥
echo "🔄 生成新的安全密钥..."

JWT_SECRET=$(generate_key 64)
JWT_REFRESH_SECRET=$(generate_key 64)
SESSION_SECRET=$(generate_key 32)
ENCRYPTION_KEY=$(generate_key 32)

# 创建新的环境文件
cat > "$ENV_FILE" << EOF
# AI Design Platform Environment Variables
# Generated on $(date)

# JWT安全密钥 - 必须设置且不可更改
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 会话密钥
SESSION_SECRET=${SESSION_SECRET}

# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/aidesign?schema=public"

# Redis配置
REDIS_URL="redis://localhost:6379"

# 文件加密密钥
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# API密钥 - 请设置为实际值
OPENAI_API_KEY=your_openai_api_key_here
STABILITY_API_KEY=your_stability_api_key_here
LEONARDO_API_KEY=your_leonardo_api_key_here

# 语音服务密钥
AZURE_SPEECH_KEY=your_azure_speech_key_here
AZURE_SPEECH_REGION=eastus
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# OAuth配置
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
WECHAT_APP_ID=your_wechat_app_id_here
WECHAT_APP_SECRET=your_wechat_app_secret_here

# 支付配置
WECHAT_PAY_MCH_ID=your_wechat_mch_id_here
WECHAT_PAY_API_KEY=your_wechat_pay_api_key_here
WECHAT_PAY_CERT_PATH=./certs/wechat/apiclient_cert.pem
WECHAT_PAY_KEY_PATH=./certs/wechat/apiclient_key.pem
ALIPAY_APP_ID=your_alipay_app_id_here
ALIPAY_PRIVATE_KEY=your_alipay_private_key_here
ALIPAY_PUBLIC_KEY=your_alipay_public_key_here

# 本地Whisper配置
WHISPER_PATH=/usr/local/bin/whisper
WHISPER_MODEL_PATH=./models/ggml-base.bin
WHISPER_LANGUAGE=auto
WHISPER_THREADS=4

# 应用配置
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://localhost:3000

# 监控配置
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
ALERTMANAGER_PORT=9093

# 文件上传配置
MAX_FILE_SIZE=50MB
UPLOAD_DIR=./uploads
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=AI Design Platform

# 安全配置
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_MAX_AGE=86400000

# 备份配置
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_STORAGE_PATH=./backups
EOF

# 设置文件权限
chmod 600 "$ENV_FILE"

echo "✅ 安全密钥生成完成！"
echo ""
echo "📝 环境文件已创建: $ENV_FILE"
echo "🔒 文件权限已设置为 600 (仅所有者可读写)"
echo ""
echo "⚠️  重要提醒:"
echo "1. 请立即配置实际的API密钥"
echo "2. 不要将 .env 文件提交到版本控制系统"
echo "3. 请在 .gitignore 中添加 .env"
echo "4. 定期轮换密钥，特别是JWT密钥"
echo ""
echo "🔧 下一步操作:"
echo "1. 编辑 $ENV_FILE 文件，配置实际的服务密钥"
echo "2. 运行数据库迁移: npm run prisma migrate dev"
echo "3. 启动服务: npm run dev"
echo ""
echo "🛡️  安全建议:"
echo "- 使用密码管理器存储这些密钥"
echo "- 在生产环境中使用环境变量管理服务"
echo "- 定期备份密钥并安全存储"