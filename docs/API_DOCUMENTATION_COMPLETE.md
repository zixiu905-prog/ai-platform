# AI设计平台完整API文档

## 📖 API概述

AI设计平台提供RESTful API，支持所有核心功能的程序化访问。本文档详细介绍所有API接口的使用方法。

### 基础信息
- **Base URL**: `https://api.ai.yourdomain.com/v1`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8
- **API版本**: v1

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
  "timestamp": "2025-12-22T10:00:00Z",
  "requestId": "uuid"
}
```

### 错误响应格式
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  },
  "timestamp": "2025-12-22T10:00:00Z",
  "requestId": "uuid"
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
      "subscription": "FREE",
      "isActive": true,
      "createdAt": "2025-12-22T10:00:00Z"
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token",
      "expiresIn": 3600
    }
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

**响应:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "subscription": "BASIC",
      "tokensUsed": 150,
      "tokensLimit": 1000
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token",
      "expiresIn": 3600
    }
  }
}
```

### 刷新Token
```http
POST /auth/refresh
```

**请求体:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

### 修改密码
```http
POST /auth/change-password
```

**请求体:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

### 忘记密码
```http
POST /auth/forgot-password
```

**请求体:**
```json
{
  "email": "user@example.com"
}
```

---

## 👤 用户管理API

### 获取用户信息
```http
GET /user/profile
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "avatar": "https://cdn.example.com/avatars/user.jpg",
    "subscription": {
      "plan": "BASIC",
      "expiresAt": "2026-01-22T10:00:00Z",
      "autoRenew": true
    },
    "tokens": {
      "used": 150,
      "limit": 1000,
      "remaining": 850,
      "resetDate": "2026-01-01T00:00:00Z"
    },
    "preferences": {
      "theme": "light",
      "language": "zh-CN",
      "notifications": {
        "email": true,
        "push": true
      }
    }
  }
}
```

### 更新用户信息
```http
PUT /user/profile
```

**请求体:**
```json
{
  "username": "new_username",
  "avatar": "https://cdn.example.com/avatars/new_user.jpg",
  "preferences": {
    "theme": "dark",
    "language": "en-US"
  }
}
```

### 上传头像
```http
POST /user/avatar
```

**请求体:** multipart/form-data
```
avatar: [image file]
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
        "costPerToken": 0.00003,
        "features": ["text", "code", "reasoning"]
      },
      {
        "id": "zhipu-glm",
        "name": "智谱GLM",
        "description": "擅长中文理解和创意设计",
        "maxTokens": 8192,
        "costPerToken": 0.00002,
        "features": ["text", "chinese", "creative"]
      },
      {
        "id": "doubao",
        "name": "豆包AI",
        "description": "代码和技术问题解决能力强",
        "maxTokens": 4096,
        "costPerToken": 0.000015,
        "features": ["text", "code", "technical"]
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
    "topP": 0.9,
    "frequencyPenalty": 0.1,
    "presencePenalty": 0.1
  }
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "conversationId": "uuid",
    "message": "你好！我很乐意帮你设计logo...",
    "role": "assistant",
    "timestamp": "2025-12-22T10:00:05Z",
    "usage": {
      "promptTokens": 10,
      "completionTokens": 25,
      "totalTokens": 35,
      "cost": 0.00105
    }
  }
}
```

### 发送消息（流式）
```http
POST /ai/chat/stream
```

**请求体:** 同上

**响应:** Server-Sent Events流
```
data: {"type": "start", "conversationId": "uuid", "messageId": "uuid"}

data: {"type": "token", "content": "你好"}

data: {"type": "token", "content": "！"}

data: {"type": "token", "content": "我"}

data: {"type": "end", "usage": {"promptTokens": 10, "completionTokens": 25, "totalTokens": 35}}
```

### 获取对话历史
```http
GET /ai/conversations
```

**查询参数:**
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20，最大100）
- `model`: 模型筛选（可选）
- `search`: 搜索关键词（可选）

**响应:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "title": "Logo设计讨论",
        "model": "gpt-4",
        "createdAt": "2025-12-22T10:00:00Z",
        "updatedAt": "2025-12-22T10:30:00Z",
        "messageCount": 10,
        "preview": "你好，我想设计一个logo..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

### 获取单个对话详情
```http
GET /ai/conversations/{conversationId}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Logo设计讨论",
    "model": "gpt-4",
    "createdAt": "2025-12-22T10:00:00Z",
    "updatedAt": "2025-12-22T10:30:00Z",
    "messages": [
      {
        "id": "uuid",
        "role": "user",
        "content": "你好，我想设计一个logo",
        "timestamp": "2025-12-22T10:00:00Z"
      },
      {
        "id": "uuid",
        "role": "assistant",
        "content": "你好！我很乐意帮你设计logo...",
        "timestamp": "2025-12-22T10:00:05Z",
        "usage": {
          "promptTokens": 10,
          "completionTokens": 25,
          "totalTokens": 35
        }
      }
    ],
    "totalTokensUsed": 350
  }
}
```

### 删除对话
```http
DELETE /ai/conversations/{conversationId}
```

### 重命名对话
```http
PUT /ai/conversations/{conversationId}/title
```

**请求体:**
```json
{
  "title": "新的对话标题"
}
```

---

## 🔧 设计软件集成API

### 获取可用软件
```http
GET /software
```

**响应:**
```json
{
  "success": true,
  "data": {
    "software": [
      {
        "id": "photoshop",
        "name": "Adobe Photoshop",
        "version": "2024",
        "status": "connected",
        "platforms": ["windows", "macos"],
        "features": ["image_processing", "layers", "filters", "text"],
        "supportedFormats": ["psd", "jpg", "png", "gif", "tiff"]
      },
      {
        "id": "autocad",
        "name": "AutoCAD",
        "version": "2024",
        "status": "disconnected",
        "platforms": ["windows"],
        "features": ["2d_drawing", "3d_modeling", "layers", "blocks"],
        "supportedFormats": ["dwg", "dxf", "pdf"]
      }
    ]
  }
}
```

### 连接软件
```http
POST /software/{softwareId}/connect
```

**请求体:**
```json
{
  "version": "2024",
  "port": 8080,
  "authToken": "optional_auth_token"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "connectionId": "uuid",
    "status": "connected",
    "softwareInfo": {
      "version": "2024.1.0",
      "platform": "windows",
      "supportedOperations": ["create_document", "add_layer", "apply_filter"]
    }
  }
}
```

### 断开软件连接
```http
POST /software/{softwareId}/disconnect
```

### 执行软件操作
```http
POST /software/{softwareId}/execute
```

**请求体:**
```json
{
  "operation": "create_document",
  "parameters": {
    "width": 1000,
    "height": 1000,
    "resolution": 72,
    "backgroundColor": "#ffffff"
  }
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "taskId": "uuid",
    "status": "executing",
    "operation": "create_document"
  }
}
```

### 获取操作状态
```http
GET /software/{softwareId}/tasks/{taskId}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "taskId": "uuid",
    "status": "completed",
    "progress": 100,
    "result": {
      "documentId": "uuid",
      "documentPath": "/path/to/document.psd"
    },
    "startTime": "2025-12-22T10:00:00Z",
    "endTime": "2025-12-22T10:00:05Z",
    "duration": 5000
  }
}
```

---

## 📊 工作流API

### 获取工作流列表
```http
GET /workflows
```

**查询参数:**
- `page`: 页码
- `limit`: 每页数量
- `status`: 状态筛选（active, draft, archived）
- `category`: 分类筛选

### 创建工作流
```http
POST /workflows
```

**请求体:**
```json
{
  "name": "批量图片处理",
  "description": "批量调整图片大小并应用滤镜",
  "category": "image_processing",
  "nodes": [
    {
      "id": "input",
      "type": "file_input",
      "position": {"x": 100, "y": 100},
      "data": {
        "label": "输入文件",
        "accept": "image/*"
      }
    },
    {
      "id": "resize",
      "type": "image_resize",
      "position": {"x": 300, "y": 100},
      "data": {
        "label": "调整大小",
        "width": 800,
        "height": 600,
        "maintainAspectRatio": true
      }
    }
  ],
  "edges": [
    {
      "id": "edge1",
      "source": "input",
      "target": "resize"
    }
  ],
  "settings": {
    "timeout": 300000,
    "retryCount": 3
  }
}
```

### 执行工作流
```http
POST /workflows/{workflowId}/execute
```

**请求体:**
```json
{
  "inputData": {
    "input": {
      "files": [
        {"id": "file1", "path": "/path/to/image1.jpg"},
        {"id": "file2", "path": "/path/to/image2.jpg"}
      ]
    }
  },
  "executionMode": "sync" // sync | async
}
```

### 获取执行历史
```http
GET /workflows/{workflowId}/executions
```

---

## 🧩 脚本管理API

### 获取脚本列表
```http
GET /scripts
```

**查询参数:**
- `type`: 脚本类型（javascript, python, autolisp）
- `category`: 分类
- `search`: 搜索
- `author`: 作者
- `isPublic`: 是否公开

### 上传脚本
```http
POST /scripts
```

**请求体:**
```json
{
  "name": "批量重命名",
  "description": "批量重命名文件",
  "type": "javascript",
  "category": "file_management",
  "code": "function batchRename(files, prefix) { ... }",
  "tags": ["batch", "rename", "files"],
  "isPublic": false,
  "version": "1.0.0"
}
```

### 执行脚本
```http
POST /scripts/{scriptId}/execute
```

**请求体:**
```json
{
  "parameters": {
    "files": ["file1.jpg", "file2.jpg"],
    "prefix": "image"
  },
  "executionMode": "async"
}
```

---

## 💰 订阅与计费API

### 获取订阅信息
```http
GET /subscription
```

### 升级订阅
```http
POST /subscription/upgrade
```

**请求体:**
```json
{
  "plan": "PROFESSIONAL",
  "billingCycle": "monthly", // monthly | yearly
  "paymentMethod": "credit_card"
}
```

### 获取账单历史
```http
GET /subscription/bills
```

### 购买令牌
```http
POST /tokens/purchase
```

**请求体:**
```json
{
  "package": "1000", // 100 | 500 | 1000 | 5000
  "paymentMethod": "wechat"
}
```

---

## 📁 文件管理API

### 上传文件
```http
POST /files/upload
```

**请求体:** multipart/form-data
```
file: [file]
category: "image" | "document" | "video"
description: "文件描述"
isPublic: false
```

### 获取文件列表
```http
GET /files
```

**查询参数:**
- `category`: 文件分类
- `type`: 文件类型
- `search`: 搜索
- `dateFrom`: 开始日期
- `dateTo`: 结束日期

### 下载文件
```http
GET /files/{fileId}/download
```

### 删除文件
```http
DELETE /files/{fileId}
```

---

## 🔍 系统API

### 健康检查
```http
GET /health
```

**响应:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-12-22T10:00:00Z",
    "version": "2.0.0",
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "ai_service": "healthy"
    },
    "metrics": {
      "uptime": 86400,
      "memoryUsage": 512,
      "cpuUsage": 45.2
    }
  }
}
```

### 系统状态
```http
GET /status
```

### 系统指标
```http
GET /metrics
```

---

## 🚨 错误代码

| 错误代码 | HTTP状态码 | 描述 |
|---------|-----------|------|
| INVALID_REQUEST | 400 | 请求参数无效 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| NOT_FOUND | 404 | 资源不存在 |
| RATE_LIMITED | 429 | 请求频率超限 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| SERVICE_UNAVAILABLE | 503 | 服务不可用 |
| INSUFFICIENT_TOKENS | 402 | 令牌余额不足 |
| SUBSCRIPTION_REQUIRED | 402 | 需要订阅 |
| SOFTWARE_NOT_CONNECTED | 503 | 设计软件未连接 |

---

## 📝 使用示例

### JavaScript/Node.js
```javascript
const axios = require('axios');

class AIDesignAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // 发送AI消息
  async sendChatMessage(message, model = 'gpt-4') {
    try {
      const response = await this.client.post('/ai/chat', {
        message,
        model,
        settings: {
          temperature: 0.7,
          maxTokens: 1000
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }

  // 流式聊天
  async sendChatStream(message, onToken) {
    try {
      const response = await this.client.post('/ai/chat/stream', {
        message,
        model: 'gpt-4'
      }, {
        responseType: 'stream'
      });

      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token') {
              onToken(data.content);
            }
          }
        }
      });
    } catch (error) {
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }

  // 连接设计软件
  async connectSoftware(softwareId, config) {
    try {
      const response = await this.client.post(`/software/${softwareId}/connect`, config);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }
}

// 使用示例
const api = new AIDesignAPI('https://api.ai.yourdomain.com/v1', 'your_token_here');

// 发送消息
api.sendChatMessage('帮我设计一个logo')
  .then(response => console.log(response.data.message))
  .catch(error => console.error(error));

// 流式消息
api.sendChatStream('解释一下设计原则', (token) => {
  process.stdout.write(token);
});
```

### Python
```python
import requests
import json
from typing import Optional, Dict, Any

class AIDesignAPI:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def send_chat_message(self, message: str, model: str = 'gpt-4') -> Dict[str, Any]:
        url = f'{self.base_url}/ai/chat'
        data = {
            'message': message,
            'model': model,
            'settings': {
                'temperature': 0.7,
                'maxTokens': 1000
            }
        }
        
        response = requests.post(url, json=data, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def connect_software(self, software_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        url = f'{self.base_url}/software/{software_id}/connect'
        response = requests.post(url, json=config, headers=self.headers)
        response.raise_for_status()
        return response.json()

# 使用示例
api = AIDesignAPI('https://api.ai.yourdomain.com/v1', 'your_token_here')

# 发送消息
try:
    response = api.send_chat_message('帮我设计一个logo')
    print(response['data']['message'])
except requests.exceptions.RequestException as e:
    print(f'Error: {e}')
```

---

## 🔄 API变更日志

### v2.0.0 (2025-12-22)
- ✨ 新增工作流执行API
- ✨ 新增脚本管理API
- ✨ 新增文件管理API
- 🔄 重构AI对话API，支持流式响应
- 📝 完善错误处理和响应格式

### v1.5.0 (2025-11-15)
- ✨ 新增设计软件集成API
- ✨ 新增订阅管理API
- 🔒 增强安全认证机制

### v1.0.0 (2025-10-01)
- 🎉 API正式发布
- ✨ 基础认证和用户管理
- ✨ AI对话功能

---

## 📞 技术支持

- **API文档**: https://docs.ai.yourdomain.com/api
- **SDK下载**: https://github.com/your-org/ai-design-sdk
- **技术支持**: support@ai.yourdomain.com
- **状态页面**: https://status.ai.yourdomain.com

---

*最后更新：2025年12月22日*