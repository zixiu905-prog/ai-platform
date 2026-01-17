# AI设计平台 API 文档

## 📖 API概述

AI设计平台提供RESTful API，支持所有核心功能的程序化访问。本文档详细介绍所有API接口的使用方法。

### 基础信息
- **Base URL**: `https://api.aidesign.com/v1`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

### 认证
所有API请求都需要在Header中包含JWT Token：
```
Authorization: Bearer <your_jwt_token>
```

### 响应格式
```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2024-12-20T10:00:00Z"
}
```

---

## 🔐 认证相关API

### 用户注册
```http
POST /auth/register
```

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "username",
  "phone": "+86 138 0000 0000"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "subscription": "FREE"
    },
    "token": "jwt_token_here"
  }
}
```

### 用户登录
```http
POST /auth/login
```

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 刷新Token
```http
POST /auth/refresh
```

**Headers:**
```
Authorization: Bearer <refresh_token>
```

---

## 🤖 AI对话API

### 获取可用模型
```http
GET /ai/models
```

**响应:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "gpt-4",
        "name": "GPT-4",
        "description": "最强大的AI模型，适合复杂任务",
        "maxTokens": 4096,
        "costPerToken": 0.00003
      },
      {
        "id": "zhipu-glm",
        "name": "智谱GLM",
        "description": "擅长中文理解和创意设计",
        "maxTokens": 8192,
        "costPerToken": 0.00002
      },
      {
        "id": "doubao",
        "name": "豆包AI",
        "description": "代码和技术问题解决能力强",
        "maxTokens": 4096,
        "costPerToken": 0.000015
      }
    ]
  }
}
```

### 发送消息（非流式）
```http
POST /ai/chat
```

**请求体:**
```json
{
  "message": "你好，我想设计一个logo",
  "model": "gpt-4",
  "conversationId": "uuid_or_null",
  "settings": {
    "temperature": 0.7,
    "maxTokens": 1000,
    "topP": 0.9
  }
}
  "conversation_id": "uuid",
  "stream": false,
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "message_id": "uuid",
    "content": "我来帮您设计一个专业的logo...",
    "model": "gpt-4",
    "tokens_used": 150,
    "cost": 0.01
  }
}
```

### 流式对话
```http
POST /ai/chat/stream
```

**请求参数同上，设置 `stream: true`**

**响应格式**: Server-Sent Events (SSE)

### 获取对话历史
```http
GET /ai/conversations/{conversation_id}
```

**查询参数:**
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20)

---

## 🎨 图像生成API

### 生成图像
```http
POST /ai/image/generate
```

**请求体:**
```json
{
  "prompt": "一个现代风格的科技公司logo，蓝色调，简洁大方",
  "model": "dall-e-3",
  "size": "1024x1024",
  "quality": "standard",
  "style": "natural",
  "n": 1,
  "response_format": "url"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "image_id": "uuid",
    "url": "https://...",
    "revised_prompt": "A modern tech company logo...",
    "model": "dall-e-3",
    "size": "1024x1024",
    "cost": 0.04
  }
}
```

### 批量生成图像
```http
POST /ai/image/batch
```

**请求体:**
```json
{
  "prompts": [
    "prompt 1",
    "prompt 2",
    "prompt 3"
  ],
  "model": "stable-diffusion",
  "size": "512x512",
  "n": 3
}
```

### 设计图像生成
```http
POST /ai/image/design
```

**请求体:**
```json
{
  "design_type": "logo",
  "style": "modern",
  "industry": "technology",
  "colors": ["blue", "white"],
  "elements": ["abstract", "text"],
  "description": "科技公司logo设计"
}
```

### 获取图像生成历史
```http
GET /ai/image/history
```

**查询参数:**
- `page`: 页码
- `limit`: 每页数量
- `model`: 模型筛选
- `start_date`: 开始日期
- `end_date`: 结束日期

---

## 🎤 语音识别API

### 语音转文字
```http
POST /speech/recognize
```

**请求体 (multipart/form-data):**
- `audio`: 音频文件 (mp3, wav, m4a, webm)
- `language`: 语言代码 (zh-CN, en-US)
- `model`: 模型 (whisper-1, azure, aliyun)
- `format`: 输出格式 (json, text, srt)

**响应:**
```json
{
  "success": true,
  "data": {
    "transcript_id": "uuid",
    "text": "识别到的文字内容",
    "confidence": 0.95,
    "duration": 30.5,
    "language": "zh-CN",
    "segments": [
      {
        "start": 0.0,
        "end": 5.2,
        "text": "第一段文字",
        "confidence": 0.98
      }
    ]
  }
}
```

### 实时语音识别
```http
WebSocket: /speech/realtime
```

**连接参数:**
- `language`: 语言代码
- `model`: 模型选择
- `token`: JWT认证token

**消息格式:**
```json
{
  "type": "audio",
  "data": "base64_audio_data"
}
```

### 获取识别历史
```http
GET /speech/history
```

---

## 📋 工作流API

### 创建工作流
```http
POST /workflows
```

**请求体:**
```json
{
  "name": "图像批处理工作流",
  "description": "批量处理设计图像",
  "nodes": [
    {
      "id": "node_1",
      "type": "input",
      "position": {"x": 100, "y": 100},
      "data": {
        "input_type": "file",
        "file_types": ["jpg", "png"]
      }
    },
    {
      "id": "node_2",
      "type": "ai_process",
      "position": {"x": 300, "y": 100},
      "data": {
        "model": "image-upscale",
        "parameters": {
          "scale": 2,
          "quality": "high"
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2"
    }
  ]
}
```

### 执行工作流
```http
POST /workflows/{workflow_id}/execute
```

**请求体:**
```json
{
  "input_data": {
    "files": ["file1.jpg", "file2.png"],
    "parameters": {
      "quality": "high"
    }
  }
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "execution_id": "uuid",
    "status": "running",
    "started_at": "2024-12-20T10:00:00Z",
    "estimated_duration": 300
  }
}
```

### 获取执行状态
```http
GET /workflows/{workflow_id}/executions/{execution_id}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "execution_id": "uuid",
    "status": "completed",
    "started_at": "2024-12-20T10:00:00Z",
    "completed_at": "2024-12-20T10:02:30Z",
    "progress": 100,
    "results": {
      "output_files": ["result1.jpg"],
      "logs": ["Process completed successfully"]
    }
  }
}
```

---

## 🔗 软件集成API

### 连接软件
```http
POST /integrations/connect
```

**请求体:**
```json
{
  "software": "photoshop",
  "auth_type": "api_key",
  "credentials": {
    "api_key": "your_api_key",
    "api_secret": "your_api_secret"
  },
  "settings": {
    "auto_sync": true,
    "sync_interval": 300
  }
}
```

### 获取集成状态
```http
GET /integrations/{software}/status
```

**响应:**
```json
{
  "success": true,
  "data": {
    "software": "photoshop",
    "status": "connected",
    "last_sync": "2024-12-20T09:30:00Z",
    "features": [
      "file_import",
      "layer_export",
      "batch_process"
    ]
  }
}
```

### 调用软件API
```http
POST /integrations/{software}/call
```

**请求体:**
```json
{
  "action": "create_layer",
  "parameters": {
    "name": "New Layer",
    "type": "normal",
    "opacity": 100,
    "blend_mode": "normal"
  }
}
```

---

## 💰 订阅和计费API

### 获取订阅信息
```http
GET /subscription
```

**响应:**
```json
{
  "success": true,
  "data": {
    "plan": "PROFESSIONAL",
    "status": "active",
    "monthly_requests": 2000,
    "used_requests": 350,
    "remaining_requests": 1650,
    "next_billing_date": "2025-01-20",
    "features": [
      "ai_chat",
      "image_generation",
      "speech_recognition",
      "workflow_automation"
    ]
  }
}
```

### 升级订阅
```http
POST /subscription/upgrade
```

**请求体:**
```json
{
  "plan": "ENTERPRISE",
  "billing_cycle": "yearly",
  "payment_method": "credit_card"
}
```

### 获取使用统计
```http
GET /usage/stats
```

**查询参数:**
- `period`: 时间范围 (day, week, month, year)
- `start_date`: 开始日期
- `end_date`: 结束日期

**响应:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "ai_requests": {
      "total": 350,
      "by_model": {
        "gpt-4": 200,
        "claude-3": 150
      }
    },
    "image_generation": {
      "total": 45,
      "cost": 1.80
    },
    "speech_recognition": {
      "total_minutes": 120,
      "cost": 0.60
    }
  }
}
```

---

## 📊 用户管理API

### 获取用户信息
```http
GET /user/profile
```

### 更新用户信息
```http
PUT /user/profile
```

**请求体:**
```json
{
  "username": "new_username",
  "phone": "+86 138 0000 0000",
  "company": "公司名称",
  "bio": "个人简介"
}
```

### 修改密码
```http
PUT /user/password
```

**请求体:**
```json
{
  "current_password": "old_password",
  "new_password": "new_password"
}
```

---

## 🔍 搜索和过滤API

### 搜索设计资源
```http
GET /search/templates
```

**查询参数:**
- `q`: 搜索关键词
- `category`: 分类
- `style`: 风格
- `format`: 格式
- `page`: 页码
- `limit`: 每页数量

### 获取热门模板
```http
GET /templates/trending
```

### 获取推荐内容
```http
GET /recommendations
```

---

## 📈 分析和报告API

### 获取使用分析
```http
GET /analytics/usage
```

### 获取性能指标
```http
GET /analytics/performance
```

### 导出报告
```http
POST /analytics/export
```

---

## ⚠️ 错误处理

### 错误响应格式
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_TOKENS",
    "message": "账户余额不足",
    "details": {
      "required": 100,
      "available": 45
    }
  },
  "timestamp": "2024-12-20T10:00:00Z"
}
```

### 常见错误码
| 错误码 | HTTP状态码 | 说明 |
|--------|------------|------|
| INVALID_TOKEN | 401 | 无效的认证令牌 |
| INSUFFICIENT_TOKENS | 402 | 账户余额不足 |
| RATE_LIMIT_EXCEEDED | 429 | 请求频率超限 |
| INVALID_REQUEST | 400 | 请求参数错误 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

## 🚀 SDK和工具

### JavaScript SDK
```bash
npm install aidesign-sdk
```

```javascript
import AiDesign from 'aidesign-sdk';

const client = new AiDesign({
  apiKey: 'your_api_key',
  baseURL: 'https://api.aidesign.com/v1'
});

// AI对话
const response = await client.ai.chat({
  message: 'Hello, AI!',
  model: 'gpt-4'
});

// 图像生成
const image = await client.ai.generateImage({
  prompt: 'A modern logo design',
  model: 'dall-e-3'
});
```

### Python SDK
```bash
pip install aidesign-python
```

```python
from aidesign import AiDesignClient

client = AiDesignClient(api_key='your_api_key')

# AI对话
response = client.ai.chat(
    message='Hello, AI!',
    model='gpt-4'
)

# 图像生成
image = client.ai.generate_image(
    prompt='A modern logo design',
    model='dall-e-3'
)
```

---

## 🔄 API版本管理

### 版本控制
- 当前版本: v1
- 版本策略: 语义化版本控制
- 向后兼容: 保证主版本内的向后兼容

### 版本升级通知
- 提前3个月通知重大版本变更
- 提供版本迁移指南
- 旧版本维持至少6个月支持

---

## 📞 技术支持

- **API文档**: https://docs.aidesign.com/api
- **SDK文档**: https://docs.aidesign.com/sdk
- **状态页面**: https://status.aidesign.com
- **技术支持**: api-support@aidesign.com
- **开发者社区**: https://community.aidesign.com

---

*API文档最后更新时间: 2024年12月20日*