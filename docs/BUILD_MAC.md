# 在macOS上构建桌面应用

## 环境要求
- macOS 11 (Big Sur) 或更高版本
- Xcode Command Line Tools
- Node.js 18+
- Homebrew（推荐）

## 构建步骤

### 1. 安装依赖工具
```bash
# 安装Xcode Command Line Tools
xcode-select --install

# 安装Homebrew（如果尚未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装必要的工具
brew install create-dmg
```

### 2. 克隆项目
```bash
git clone <repository-url>
cd aidesign
```

### 3. 安装依赖
```bash
# 安装前端依赖
cd frontend
npm install

# 安装桌面端依赖
cd ../desk
npm install
```

### 4. 构建应用
```bash
cd desk

# 构建前端
npm run build:renderer

# 构建Electron主进程
npm run build:main

# 构建DMG安装包
npm run build:dmg

# 构建ZIP压缩包（可选）
npm run build:zip
```

### 5. 输出文件
构建完成后，安装程序位于：
- `dist/AI智能体平台-1.0.0.dmg` - DMG磁盘映像
- `dist/AI智能体平台-1.0.0-mac.zip` - ZIP压缩包

### 6. 上传到服务器
```bash
# 使用scp上传到服务器
scp dist/*.dmg dist/*.zip user@server:/path/to/downloads/desktop/
```

## 代码签名（推荐）

对于发布到App Store或通过分发，需要代码签名：

### 基本签名
```bash
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="your-password"

npm run build:dmg
```

### App Store发布
```bash
export CSC_IDENTITY_AUTO_DISCOVERY="false"
export APPLE_ID="your-apple-id"
export APPLE_ID_PASSWORD="your-app-specific-password"
export APPLE_TEAM_ID="your-team-id"

npm run build:mas
```

## 公证（macOS 10.15+）

对于macOS 10.15 (Catalina)及更高版本，需要公证：

```bash
# 安装公证工具
brew install gon

# 创建gon配置文件
cat > gon.json <<EOF
{
  "source": ["dist/AI智能体平台-1.0.0.dmg"],
  "bundle_id": "com.aidesign.aiplatform",
  "apple_id": "your-apple-id",
  "password": "@env:APPLE_APP_SPECIFIC_PASSWORD",
  "team_id": "your-team-id"
}
EOF

# 执行公证
gon -log-level=info gon.json
```

## 常见问题

### 1. "application is damaged"错误
- 这通常是因为没有代码签名或签名无效
- 使用正确的证书重新签名
- 考虑使用公证服务

### 2. Gatekeeper阻止打开
- 右键点击应用，选择"打开"
- 或在系统偏好设置 > 安全性与隐私中允许

### 3. 代码签名错误
```bash
# 列出可用的签名证书
security find-identity -v -p codesigning

# 手动签名
codesign --force --deep --sign "Developer ID Application: Your Name" dist/*.app
```

### 4. 构建速度慢
- 使用`npm ci --production`减少依赖
- 禁用不必要的构建目标
- 考虑使用CI/CD自动化构建

## 多架构支持（Apple Silicon + Intel）

### 构建通用二进制
```bash
npm run build:dmg -- --mac universal
```

### 分别构建
```bash
# Apple Silicon (M1/M2)
npm run build:dmg -- --mac arm64

# Intel
npm run build:dmg -- --mac x64
```

## 测试安装程序

### 测试DMG
```bash
# 挂载DMG
hdiutil attach dist/AI智能体平台-1.0.0.dmg

# 测试安装
# 将应用拖到Applications文件夹

# 卸载DMG
hdiutil detach /Volumes/AI智能体平台
```

### 测试应用
```bash
# 运行应用
open /Applications/AI智能体平台.app

# 查看日志
log stream --predicate 'process == "AI智能体平台"'
```
