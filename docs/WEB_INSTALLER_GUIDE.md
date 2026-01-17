# Web Installer 配置与部署指南

## 概述

本项目提供两种 Windows 安装方式：
1. **Web Installer (在线安装)** - 小体积安装包（2-5MB），安装时从云端下载
2. **Full Installer (离线安装)** - 完整安装包（150-200MB），包含所有文件

## Web Installer 优势

- **快速下载**：安装包仅 2-5MB，几秒内即可下载完成
- **自动更新**：云端文件可随时更新，无需重新发布安装包
- **动态组件**：根据用户系统环境选择需要的组件
- **节省带宽**：减少初始下载流量

## 技术实现

### 1. 配置文件

#### electron-builder-web.json
Web Installer 的专用配置文件：

```json
{
  "win": {
    "target": [
      {
        "target": "nsis-web",
        "arch": ["x64"]
      }
    ]
  },
  "nsisWeb": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "artifactName": "${productName}-Setup-Web-${version}.${ext}"
  }
}
```

#### 关键配置项

- `nsis-web`: 指定使用 Web Installer 模式
- `include`: 自定义 NSIS 脚本
- `differentialPackage`: 是否启用差分下载

### 2. NSIS 脚本

#### web-installer.nsh - 基础 Web Installer
提供基本的下载和安装功能：
- 网络下载进度显示
- 下载失败重试机制
- 自动解压和安装
- 快捷方式创建

#### advanced-web-installer.nsh - 高级 Web Installer
增强功能的安装程序：
- 多次重试逻辑
- 文件校验
- 更新检测
- 下载速度优化
- 错误恢复

### 3. 构建命令

#### 仅构建 Web Installer
```bash
cd /home/ai\ design/desk
npm run build:web
```

#### 构建完整安装包
```bash
cd /home/ai\ design/desk
npm run build:all
```

#### 同时构建两种安装包
```bash
cd /home/ai\ design/desk
npm run build:complete
```

### 4. 一键构建脚本

提供了便捷的构建脚本：

```bash
# 交互式构建
/home/ai\ design/scripts/build-web-installer.sh

# 部署到服务器
/home/ai\ design/scripts/deploy-web-installer.sh
```

## 云端服务器配置

### 1. 目录结构

```
/var/www/releases/ai-platform/
├── latest/                      # 最新版本的安装包
│   ├── AI智能体平台-Setup-Web-1.0.0.exe
│   └── latest.json              # 版本信息
├── v1.0.0/                      # 历史版本
│   ├── AI智能体平台-Setup-Web-1.0.0.exe
│   └── AI智能体平台-1.0.0-setup.exe
└── update/                      # 更新包
    └── ai-platform-1.0.0-full.7z
```

### 2. Nginx 配置

```nginx
server {
    listen 80;
    server_name download.your-domain.com;

    # 启用下载
    location /releases/ {
        alias /var/www/releases/;
        autoindex off;
        autoindex_format json;

        # CORS
        add_header Access-Control-Allow-Origin *;

        # 缓存控制
        add_header Cache-Control "public, max-age=31536000";

        # 下载限速（可选）
        limit_rate 10m;
    }

    # 版本信息 API
    location /api/version {
        alias /var/www/releases/ai-platform/latest.json;
        add_header Content-Type application/json;
    }

    # HTTPS 重定向
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name download.your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # ... 其他配置同上
}
```

### 3. CDN 配置（推荐）

使用 CDN 加速下载：

1. **阿里云 OSS + CDN**
   - 将文件上传到 OSS
   - 配置 CDN 加速
   - 设置缓存规则

2. **腾讯云 COS + CDN**
   - 配置 COS 存储桶
   - 绑定自定义域名
   - 开启 CDN 加速

3. **AWS S3 + CloudFront**
   - 创建 S3 存储桶
   - 配置 CloudFront 分发
   - 设置访问策略

### 4. 版本信息 API

latest.json 格式：

```json
{
  "version": "1.0.0",
  "releaseDate": "2026-01-08T12:00:00Z",
  "notes": "AI Platform v1.0.0",
  "webInstaller": {
    "file": "AI智能体平台-Setup-Web-1.0.0.exe",
    "size": 5242880,
    "url": "https://download.your-domain.com/releases/latest/AI智能体平台-Setup-Web-1.0.0.exe"
  },
  "fullInstaller": {
    "x64": {
      "file": "AI智能体平台-1.0.0-setup.exe",
      "size": 157286400,
      "url": "https://download.your-domain.com/releases/v1.0.0/AI智能体平台-1.0.0-setup.exe"
    }
  },
  "minimumSystemVersion": "Windows 10 1809",
  "supportedArchitectures": ["x64"]
}
```

## 部署流程

### 1. 本地构建

```bash
# 1. 清理
cd /home/ai\ design/desk
rm -rf dist dist-web

# 2. 构建前端
cd ../frontend
npm run build

# 3. 构建桌面应用
cd ../desk
npm run build:web-full
```

### 2. 上传到服务器

#### 使用 SCP
```bash
scp dist-web/*.exe user@server:/var/www/releases/ai-platform/latest/
```

#### 使用 Rsync
```bash
rsync -avz --progress dist-web/ user@server:/var/www/releases/ai-platform/latest/
```

#### 使用阿里云 OSS
```bash
# 安装 ossutil
pip install ossutil

# 配置
ossutil config

# 上传
ossutil cp dist-web/*.exe oss://your-bucket/releases/latest/
```

### 3. 更新版本信息

```bash
# 生成 latest.json
cat > latest.json << EOF
{
  "version": "1.0.0",
  "webInstaller": {
    "url": "https://download.your-domain.com/releases/latest/AI智能体平台-Setup-Web-1.0.0.exe"
  }
}
EOF

# 上传
scp latest.json user@server:/var/www/releases/ai-platform/
```

## 自动化部署

### GitHub Actions 示例

```yaml
name: Build and Deploy Web Installer

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-deploy:
    runs-on: windows-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build frontend
        run: cd frontend && npm install && npm run build

      - name: Build main process
        run: cd desk && npm run build:main

      - name: Build Web Installer
        run: cd desk && npm run build:web-full

      - name: Upload to server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          source: "desk/dist-web/*.exe"
          target: "/var/www/releases/ai-platform/latest/"
```

## 下载地址配置

### 1. NSIS 脚本中的 URL

修改 `build-resources/web-installer.nsh` 或 `advanced-web-installer.nsh` 中的下载 URL：

```nsis
!macro customInit
  ; 配置下载URL
  ${If} ${RunningX64}
    StrCpy $DownloadURL "https://download.your-domain.com/releases/v${VERSION}/AI智能体平台-${VERSION}-win-x64.7z"
  ${Else}
    StrCpy $DownloadURL "https://download.your-domain.com/releases/v${VERSION}/AI智能体平台-${VERSION}-win-ia32.7z"
  ${EndIf}
!macroend
```

### 2. electron-builder 配置

修改 `electron-builder-web.json` 中的发布配置：

```json
{
  "publish": [
    {
      "provider": "generic",
      "url": "https://download.your-domain.com/releases"
    }
  ]
}
```

## 测试

### 1. 本地测试

```bash
# 构建测试版本
npm run build:web-full

# 安装测试
dist-web/AI智能体平台-Setup-Web-1.0.0.exe
```

### 2. 网络测试

```bash
# 测试下载 URL
curl -I https://download.your-domain.com/releases/latest/AI智能体平台-Setup-Web-1.0.0.exe

# 测试版本 API
curl https://download.your-domain.com/api/version
```

### 3. 真实环境测试

1. 在不同网络环境下测试下载速度
2. 测试断网重连场景
3. 测试更新流程
4. 测试安装/卸载完整性

## 常见问题

### Q1: Web Installer 大小过大？

检查：
- 确保使用 `nsis-web` 目标
- 确保不包含完整应用文件
- 使用压缩选项

### Q2: 下载速度慢？

解决方案：
- 使用 CDN 加速
- 多节点部署
- 启用断点续传

### Q3: 下载失败？

检查：
- 网络连接
- URL 正确性
- 文件权限
- 防火墙设置

### Q4: 更新不生效？

检查：
- 版本号是否正确
- latest.json 是否更新
- 缓存是否清除

## 最佳实践

1. **版本管理**：使用语义化版本号（Semantic Versioning）
2. **渐进式发布**：先小范围测试，再全面发布
3. **监控下载**：记录下载量、成功率、错误日志
4. **备份历史**：保留历史版本的完整安装包
5. **文档更新**：每次发布后更新版本说明

## 安全建议

1. **HTTPS**：强制使用 HTTPS 下载
2. **签名**：对安装包进行数字签名
3. **校验**：文件下载后进行 MD5/SHA256 校验
4. **访问控制**：限制下载服务器的访问
5. **日志审计**：记录所有下载行为

## 参考资源

- [electron-builder 文档](https://www.electron.build/)
- [NSIS 文档](https://nsis.sourceforge.io/)
- [Web Installer 最佳实践](https://www.electron.build/configuration/nsis)
