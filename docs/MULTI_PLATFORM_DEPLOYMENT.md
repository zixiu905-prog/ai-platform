# 多平台分发部署指南

本文档详细说明了AI智能体平台在不同平台上的分发部署方案。

## 📋 目录

- [桌面应用分发](#桌面应用分发)
  - [Windows分发渠道](#windows分发渠道)
  - [macOS分发渠道](#macos分发渠道)
  - [Linux分发渠道](#linux分发渠道)
- [Web应用分发](#web应用分发)
- [自动更新机制](#自动更新机制)
- [CI/CD集成](#cicd集成)

## 🖥️ 桌面应用分发

### Windows分发渠道

#### 1. GitHub Releases（推荐）
```bash
# 构建Windows包
cd desk
npm run build:all

# 发布到GitHub
node ../scripts/release-desktop.js release
```

**支持格式:**
- `AI智能体平台-Setup-1.0.0.exe` - NSIS安装程序
- `AI智能体平台-1.0.0.exe` - 便携版
- `AI智能体平台-1.0.0.msi` - MSI安装程序

**特点:**
- 自动更新支持
- 代码签名验证
- 下载统计
- 版本管理

#### 2. Microsoft Store
```bash
# 构建Windows Store版本
cd desk
npm run build:windows-store

# 部署到Windows Store
npm run deploy:windows-store
```

**要求:**
- Windows开发者账号
- 代码签名证书
- 应用认证

**优势:**
- 官方商店审核
- 自动更新
- 企业信任度高
- 集成Windows功能

#### 3. 直接下载分发
- 官网下载页面
- 第三方软件库
- 企业内部分发

### macOS分发渠道

#### 1. GitHub Releases
```bash
# 构建macOS包
cd desk
npm run build:dmg
npm run build:zip

# 发布到GitHub
node ../scripts/release-desktop.js release
```

**支持格式:**
- `AI智能体平台-1.0.0.dmg` - DMG安装包
- `AI智能体平台-1.0.0-mac.zip` - 压缩包
- 通用二进制（Intel + Apple Silicon）

#### 2. Mac App Store
```bash
# 构建MAS版本
cd desk
npm run build:mas

# 配置环境变量
export APPLE_TEAM_ID=YOUR_TEAM_ID
export APPLE_ID=your_apple_id
export APPLE_ID_PASSWORD=your_app_specific_password
export MAS_CERTIFICATE_PATH=/path/to/cert.p12
export MAS_CERTIFICATE_PASSWORD=cert_password

# 构建并签名
npm run build:mas
```

**要求:**
- Apple Developer Program账号
- 代码签名证书
- 公证（Notarization）
- 应用审核

#### 3. Homebrew Cask
```ruby
# Formula: ai-platform.rb
class AiPlatform < Cask
  version "1.0.0"
  sha256 "sha256_hash_here"
  
  url "https://github.com/your-username/ai-platform/releases/download/v1.0.0/AI智能体平台-1.0.0.dmg"
  name "AI智能体平台"
  desc "AI-powered intelligent development platform"
  homepage "https://aiplatform.com"
  
  app "AI智能体平台.app"
end
```

### Linux分发渠道

#### 1. Snap Store
```bash
# 构建Snap包
cd desk
npm run build:snap

# 上传到Snap Store
snapcraft upload --release=stable *.snap
```

**特点:**
- 自动更新
- 沙盒环境
- 跨发行版支持
- 官方商店

#### 2. Flatpak
```bash
# 构建Flatpak包
cd desk
npm run build:flatpak

# 提交到Flathub
flatpak-builder --repo=repo --subject="AI Platform 1.0.0" build com.aiplatform.desktop.json
flatpak build-bundle repo ai-platform-desktop.flatpak com.aiplatform.desktop
```

#### 3. AppImage
```bash
# 构建AppImage
cd desk
npm run build:appimage

# 生成便携版
chmod +x AI智能体平台.AppImage
./AI智能体平台.AppImage
```

#### 4. 发行版包管理器
```bash
# DEB包（Debian/Ubuntu）
npm run build:deb

# RPM包（RedHat/Fedora）
npm run build:rpm

# AUR包（Arch Linux）
# 在PKGBUILD中配置
```

**安装命令:**
```bash
# Snap
sudo snap install ai-platform-desktop

# Flatpak
flatpak install flathub com.aiplatform.desktop

# AppImage
chmod +x AI智能体平台.AppImage && ./AI智能体平台.AppImage

# DEB
sudo dpkg -i ai-platform-desktop_1.0.0_amd64.deb

# RPM
sudo rpm -i ai-platform-desktop-1.0.0-1.x86_64.rpm
```

## 🌐 Web应用分发

### PWA部署
```bash
# 构建生产版本
cd frontend
npm run build

# 部署到静态托管
# Netlify, Vercel, GitHub Pages等
```

**功能:**
- 离线支持
- 桌面安装
- 自动更新
- 推送通知

### 传统Web部署
- CDN分发
- 多区域部署
- 负载均衡
- SSL/TLS加密

## 🔄 自动更新机制

### 桌面应用更新
```typescript
// Electron自动更新
import { updateService } from './services/updateService';

// 检查更新
await updateService.checkForUpdates();

// 下载更新
await updateService.downloadUpdate();

// 安装更新
updateService.quitAndInstall();
```

**特点:**
- 增量更新
- 后台下载
- 用户通知
- 回滚支持

### Web应用更新
```typescript
// PWA更新检测
import { usePWAUpdate } from '@/services/updateService';

const { isUpdateAvailable, installUpdate } = usePWAUpdate();

// 安装更新
if (isUpdateAvailable) {
  installUpdate();
}
```

## 🚀 CI/CD集成

### GitHub Actions工作流

#### 桌面应用构建
```yaml
name: Desktop Application Build and Release

on:
  push:
    tags: ['v*']
  pull_request:
    branches: [main]

jobs:
  build-desktop:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Build desktop app
        run: |
          cd desk
          npm ci
          npm run build:all
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: desktop-${{ matrix.os }}
          path: desk/dist-electron/
```

#### 多平台发布
```yaml
  release:
    needs: build-desktop
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    
    steps:
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: dist-electron/*
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Deploy to Windows Store
        run: npm run deploy:windows-store
        env:
          MS_STORE_TENANT_ID: ${{ secrets.MS_STORE_TENANT_ID }}
          MS_STORE_CLIENT_ID: ${{ secrets.MS_STORE_CLIENT_ID }}
      
      - name: Deploy to Mac App Store
        run: npm run deploy:mas
        env:
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
```

### Web应用部署
```yaml
  deploy-web:
    runs-on: ubuntu-latest
    
    steps:
      - name: Build web app
        run: |
          cd frontend
          npm ci
          npm run build
      
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2
        with:
          publish-dir: frontend/dist
          production-branch: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions"
          enable-pull-request-comment: true
          enable-commit-comment: true
          overwrites-pull-request-comment: true
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## 📊 分发渠道对比

| 渠道 | 平台 | 更新方式 | 审核要求 | 收费 | 用户覆盖 |
|------|------|----------|----------|------|----------|
| GitHub Releases | 全平台 | 手动/自动 | 无 | 免费 | 开发者 |
| Windows Store | Windows | 自动 | 严格 | 99$/年 | 大众用户 |
| Mac App Store | macOS | 自动 | 严格 | 99$/年 | 大众用户 |
| Snap Store | Linux | 自动 | 中等 | 免费 | Ubuntu用户 |
| Flathub | Linux | 自动 | 中等 | 免费 | Linux用户 |
| Web PWA | Web | 自动 | 无 | 域名费用 | 所有用户 |

## 🔧 环境配置

### 环境变量
```bash
# 通用配置
export GITHUB_TOKEN=your_github_token
export APP_VERSION=1.0.0

# Windows Store
export MS_STORE_TENANT_ID=tenant_id
export MS_STORE_CLIENT_ID=client_id
export MS_STORE_CLIENT_SECRET=client_secret
export MS_STORE_SELLER_ID=seller_id
export MS_STORE_PRODUCT_ID=product_id

# Mac App Store
export APPLE_TEAM_ID=team_id
export APPLE_ID=apple_id
export APPLE_ID_PASSWORD=app_specific_password
export MAS_CERTIFICATE_PATH=/path/to/cert.p12
export MAS_CERTIFICATE_PASSWORD=cert_password

# Snap Store
export SNAPCRAFT_STORE_CREDENTIALS=credentials.json
```

### 代码签名证书
```bash
# Windows证书
export CSC_LINK=/path/to/windows.p12
export CSC_KEY_PASSWORD=certificate_password

# macOS证书
export CSC_LINK=/path/to/macos.p12
export CSC_KEY_PASSWORD=certificate_password
```

## 📈 发布流程

### 版本发布流程
1. **开发阶段**
   - 功能开发
   - 测试验证
   - 文档更新

2. **构建阶段**
   - 多平台构建
   - 代码签名
   - 质量检查

3. **发布阶段**
   - 创建Release
   - 上传到各个商店
   - 更新文档

4. **监控阶段**
   - 下载统计
   - 错误监控
   - 用户反馈

### 分阶段发布
1. **Alpha测试** - 内部测试
2. **Beta测试** - 公开测试
3. **RC版本** - 发布候选
4. **正式发布** - 稳定版本

## 🔍 质量保证

### 自动化测试
```bash
# 单元测试
npm test

# 集成测试
npm run test:integration

# E2E测试
npm run test:e2e

# 性能测试
npm run test:performance
```

### 安全扫描
```bash
# 依赖漏洞扫描
npm audit --audit-level=moderate

# 代码安全扫描
sonar-scanner

# 恶意软件扫描
# Windows Defender
# macOS Notary
# Linux scanners
```

## 📋 检查清单

### 发布前检查
- [ ] 版本号更新
- [ ] 更新日志完善
- [ ] 代码签名有效
- [ ] 安装包测试
- [ ] 更新功能测试
- [ ] 兼容性测试
- [ ] 文档更新
- [ ] 发布说明准备

### 商店发布检查
- [ ] 应用信息完整
- [ ] 截图准备
- [ ] 隐私政策
- [ ] 用户协议
- [ ] 分级信息
- [ ] 联系方式
- [ ] 支持链接

## 📞 支持与维护

### 用户支持
- 官方文档
- 视频教程
- 社区论坛
- 在线客服
- 邮件支持

### 监控指标
- 下载量统计
- 用户活跃度
- 崩溃率
- 性能指标
- 用户反馈

### 错误追踪
- Sentry集成
- 崩溃报告
- 日志收集
- 性能监控

## 🔮 未来规划

### 新平台支持
- Chrome OS
- WebOS
- 移动端应用

### 高级功能
- 企业版分发
- 私有云部署
- 白标解决方案
- API集成

### 自动化改进
- 自动化测试流水线
- 智能发布系统
- 预测性维护
- 自动回滚机制

---

**更多信息:**
- 项目官网: https://aiplatform.com
- GitHub仓库: https://github.com/your-username/ai-platform
- 问题反馈: https://github.com/your-username/ai-platform/issues
- 技术支持: support@aiplatform.com