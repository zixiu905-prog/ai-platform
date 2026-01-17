# macOS 安装程序构建指南

## 概述

本文档说明如何为AI Platform桌面应用构建macOS安装程序，支持Apple Silicon (M1/M2/M3) 和Intel (x86_64) 处理器。

## 构建前提条件

### 1. 硬件要求
- **开发环境**: macOS设备 (Intel或Apple Silicon)
- **构建机器**: GitHub Actions或macOS服务器

### 2. 软件要求
- macOS 10.15 (Catalina) 或更高版本
- Node.js 18.x 或更高版本
- npm 或 yarn 包管理器
- Xcode Command Line Tools

### 3. 证书要求
- **Apple Developer Account** (必需)
- **Developer ID Application Certificate** (用于应用签名)
- **Developer ID Installer Certificate** (用于安装程序签名)
- **App Store Connect API Key** (用于Notarization)

## 构建步骤

### 步骤1: 安装依赖

```bash
cd /home/ai design/desk
npm install
```

### 步骤2: 配置证书

创建证书配置文件 `~/.electron-builder.env`:

```bash
# Apple Developer Account
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="your-app-specific-password"
export TEAM_ID="YOUR_TEAM_ID"

# App Store Connect API Key (推荐)
export API_KEY_ID="YOUR_API_KEY_ID"
export API_KEY_ISSUER_ID="YOUR_ISSUER_ID"
export API_KEY_PATH="/path/to/AuthKey.p8"
```

### 步骤3: 构建应用

#### 选项A: 构建DMG安装程序 (推荐)

```bash
# 构建x64和arm64版本
npm run build:dmg

# 输出文件:
# - dist-mac/AI智能体平台-1.0.0-x64.dmg (Intel Mac)
# - dist-mac/AI智能体平台-1.0.0-arm64.dmg (Apple Silicon)
```

#### 选项B: 构建ZIP压缩包

```bash
# 构建x64和arm64版本
npm run build:zip

# 输出文件:
# - dist-mac/AI智能体平台-1.0.0-x64.zip
# - dist-mac/AI智能体平台-1.0.0-arm64.zip
```

#### 选项C: 使用构建脚本

```bash
# 运行完整构建脚本
cd /home/ai design
bash scripts/build-mac.sh
```

### 步骤4: Notarization (公证)

构建完成后，需要对应用进行Notarization:

```bash
# 使用electron-builder自动notarize
# 确保在electron-builder配置中启用了notarize选项

# 或者手动notarize
xcrun altool --notarize-app \
  --primary-bundle-id "com.aidesign.aiplatform" \
  --username "$APPLE_ID" \
  --password "$APPLE_ID_PASSWORD" \
  --file "AI智能体平台-1.0.0.dmg"
```

## 构建配置

### electron-builder配置

在 `package.json` 中配置macOS构建设置:

```json
{
  "build": {
    "mac": {
      "category": "public.app-category.developer-tools",
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        }
      ],
      "icon": "build/icon.icns",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "extendInfo": {
        "NSDocumentsFolderUsageDescription": "访问文档文件夹以打开和保存项目文件",
        "NSDownloadsFolderUsageDescription": "访问下载文件夹以管理项目文件",
        "NSCameraUsageDescription": "访问摄像头以支持视频功能",
        "NSMicrophoneUsageDescription": "访问麦克风以支持语音功能"
      }
    }
  }
}
```

### 权限配置文件

创建 `build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>
    <key>com.apple.security.device.camera</key>
    <true/>
    <key>com.apple.security.device.microphone</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    <key>com.apple.security.files.downloads.read-write</key>
    <true/>
    <key>com.apple.security.files.documents.read-write</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
</dict>
</plist>
```

## 自动更新配置

### 使用Sparkle框架

DMG安装程序支持Sparkle自动更新:

```bash
# 安装Sparkle依赖
npm install electron-updater
```

在代码中配置:

```typescript
// src/main.ts
import { autoUpdater } from 'electron-updater';

autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://www.aidesign.ltd/releases'
});
```

## 发布步骤

### 1. 上传到服务器

```bash
# 创建macOS下载目录
ssh root@81.68.68.146 "mkdir -p /var/www/aidesign.ltd/downloads/mac"

# 上传DMG文件
scp dist-mac/AI-Platform-1.0.0-*.dmg root@81.68.68.146:/var/www/aidesign.ltd/downloads/

# 设置权限
ssh root@81.68.68.146 "chmod 755 /var/www/aidesign.ltd/downloads/AI-Platform-1.0.0-*.dmg"
```

### 2. 更新版本信息

更新 `latest.json` 添加macOS版本信息:

```json
{
  "version": "1.0.0",
  "platforms": {
    "mac": {
      "x64": {
        "url": "https://www.aidesign.ltd/downloads/AI-Platform-1.0.0-x64.dmg",
        "size": "180MB",
        "arch": "x64"
      },
      "arm64": {
        "url": "https://www.aidesign.ltd/downloads/AI-Platform-1.0.0-arm64.dmg",
        "size": "170MB",
        "arch": "arm64"
      }
    }
  }
}
```

### 3. 配置Nginx

确保Nginx配置包含macOS文件:

```nginx
location ~* \.dmg$ {
    root /var/www/aidesign.ltd/downloads;
    add_header Content-Type application/x-apple-diskimage;
    add_header Cache-Control "public, max-age=31536000";
}
```

## 测试安装

### 1. 在macOS上测试

```bash
# 下载DMG
curl -O https://www.aidesign.ltd/downloads/AI-Platform-1.0.0-arm64.dmg

# 挂载DMG
hdiutil attach AI-Platform-1.0.0-arm64.dmg

# 安装应用 (拖拽到应用程序文件夹)
cp -R "/Volumes/AI智能体平台/AI智能体平台.app" /Applications/

# 卸载DMG
hdiutil detach "/Volumes/AI智能体平台"

# 运行应用
open /Applications/AI\智能体平台.app
```

### 2. 验证签名和公证

```bash
# 检查签名
codesign -dv --verbose=4 /Applications/AI\智能体平台.app

# 检查公证状态
spctl -a -t exec -vv /Applications/AI\智能体平台.app
```

## 常见问题

### 1. 构建失败

**问题**: `hardenedRuntime` 错误
**解决**: 确保在Xcode中启用了hardened runtime

### 2. 公证失败

**问题**: Notarization被拒绝
**解决**: 
- 检查所有依赖库都已签名
- 确保使用正确的证书
- 查看Apple的notarization日志

### 3. 应用启动失败

**问题**: "无法打开应用，因为Apple无法检查其是否包含恶意软件"
**解决**:
- 右键点击应用，选择"打开"
- 或在系统设置中允许"任何来源"

## 构建时间预估

- **Intel Mac**: 约15-20分钟
- **Apple Silicon Mac**: 约10-15分钟
- **CI/CD构建**: 约20-30分钟 (包括notarization)

## 技术支持

如遇到构建问题，请检查:
1. Node.js和npm版本
2. Xcode Command Line Tools安装
3. 证书和provisioning profiles
4. electron-builder日志

## 更新日志

- **2026-01-10**: 初始macOS构建指南
- **预计2026-01-15**: macOS版本正式发布
