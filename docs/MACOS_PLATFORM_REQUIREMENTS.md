# macOS构建平台要求

## 重要声明

**macOS版本必须在macOS系统上构建，无法在当前Linux主机上直接构建。**

## 平台限制原因

### 1. Apple生态系统限制
- **macOS SDK依赖**: 需要macOS专有开发工具和框架
- **Xcode工具链**: codesign、productbuild等仅支持macOS
- **DMG格式**: macOS专有磁盘映像格式
- **系统框架**: 依赖macOS系统库和框架

### 2. 安全要求
- **代码签名**: 需要Apple Developer证书和codesign工具
- **Notarization**: 苹果公证流程必须在macOS上执行
- **Hardened Runtime**: macOS安全特性

### 3. 技术依赖
- **Node.js原生模块**: 某些模块需要macOS编译
- **Electron框架**: macOS构建需要macOS特定组件
- **打包工具**: electron-builder macOS功能需要macOS环境

## 解决方案对比

### 方案1: GitHub Actions ⭐⭐⭐⭐⭐

**优点:**
- ✅ 免费 (2000分钟/月)
- ✅ 自动化CI/CD
- ✅ 官方macOS runner
- ✅ 支持代码签名
- ✅ 自动Notarization

**缺点:**
- ❌ 需要GitHub账号
- ❌ 需要配置Secrets

**成本**: $0 (在免费额度内)

**实施步骤:**

1. 创建 `.github/workflows/build-mac.yml`
```yaml
name: Build macOS

on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build:mac-dmg
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
      - uses: actions/upload-artifact@v3
        with:
          name: macos-installers
          path: desk/dist-mac/*.dmg
```

2. 配置GitHub Secrets:
   - `APPLE_ID`: your-apple-id@example.com
   - `APPLE_ID_PASSWORD`: app-specific-password
   - `TEAM_ID`: XXXXXXXXXX
   - `API_KEY_BASE64`: Base64 encoded API key

### 方案2: 云macOS服务器 ⭐⭐⭐⭐

**提供商:**
- MacStadium (企业级)
- AWS EC2 Mac instances
- MacinCloud (开发级)
- Scaleway Mac mini M1

**优点:**
- ✅ 真实macOS环境
- ✅ 24/7可用
- ✅ 可以远程访问
- ✅ 适合CI/CD

**缺点:**
- ❌ 月费成本
- ❌ 需要管理服务器

**成本:** $50-200/月

### 方案3: 本地Mac设备 ⭐⭐⭐⭐

**推荐配置:**
- Mac mini M2 (8GB): $599
- Mac mini M2 (16GB): $799
- Mac Studio (M2 Max): $1999

**优点:**
- ✅ 完全控制
- ✅ 无月费
- ✅ 适合开发和测试
- ✅ 可以离线使用

**缺点:**
- ❌ 初始成本高
- ❌ 需要物理空间
- ❌ 需要维护

**成本:** $599-2000 (一次性)

### 方案4: 虚拟机 (不推荐) ⭐

**问题:**
- ❌ 违反Apple许可协议
- ❌ 性能极差
- ❌ 不稳定
- ❌ 无法代码签名
- ❌ 无法Notarization

**法律风险**: 高

## 推荐方案

### 对于当前项目：GitHub Actions

**理由:**
1. **零成本启动**: 利用免费额度
2. **完全自动化**: 无需手动干预
3. **最佳实践**: 行业标准方案
4. **可扩展**: 可以轻松添加其他平台

**实施计划:**

#### Phase 1: 准备 (2026-01-11)
1. 注册Apple Developer Account
2. 生成Developer ID证书
3. 创建App Store Connect API Key
4. 配置GitHub Secrets

#### Phase 2: 测试 (2026-01-12)
1. 创建测试GitHub workflow
2. 构建测试版本
3. 验证代码签名
4. 测试Notarization

#### Phase 3: 生产 (2026-01-14)
1. 构建发布版本
2. 上传到服务器
3. 更新下载页面
4. 用户测试

#### Phase 4: 发布 (2026-01-15)
1. 正式发布macOS版本
2. 更新所有文档
3. 通知用户

## 时间计划

### 最快路径 (使用GitHub Actions)

```
2026-01-10 (今天)
├── 注册Apple Developer Account
├── 准备GitHub Secrets
└── 创建workflow文件

2026-01-11
├── 测试构建流程
├── 验证签名
└── 测试Notarization

2026-01-12
├── 完整构建测试
└── 上传测试版本

2026-01-13
├── 用户测试
└── 修复问题

2026-01-14
├── 生产环境构建
└── 准备发布

2026-01-15
├── 正式发布
└── 更新下载页面
```

## 成本对比

| 方案 | 初始成本 | 月成本 | 总成本(1年) | 推荐指数 |
|------|---------|--------|-------------|----------|
| GitHub Actions | $0 | $0 | $0 | ⭐⭐⭐⭐⭐ |
| MacStadium | $0 | $99 | $1188 | ⭐⭐⭐ |
| AWS EC2 Mac | $0 | $800+ | $9600+ | ⭐⭐ |
| Mac mini M2 | $599 | $5 | $659 | ⭐⭐⭐⭐ |
| MacinCloud | $0 | $30 | $360 | ⭐⭐⭐ |

## 结论

**无法在当前Linux主机上直接构建和发布macOS版本。**

**建议采用GitHub Actions方案:**
- 零成本
- 自动化
- 行业标准
- 最快路径

如有需要，我可以立即为您创建GitHub Actions workflow配置文件。
