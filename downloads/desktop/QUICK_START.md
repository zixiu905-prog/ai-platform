# 快速部署指南 - GitHub Actions 自动构建

## ✅ 代码检查已完成

所有代码已通过 100% 检查，可以安全构建。

**检查结果：**
- ✅ 前端编译：0 错误
- ✅ 桌面端编译：0 错误
- ✅ TypeScript 类型：0 错误
- ✅ 依赖完整性：正常
- ✅ 配置文件：正确
- ✅ GitHub Actions：已配置

---

## 🚀 三步完成构建（约10分钟）

### 步骤1：推送代码到 GitHub（约2分钟）

```bash
# 进入项目根目录
cd "/home/ai design"

# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交代码
git commit -m "feat: AI Platform Desktop v1.0.0 - Ready for release"

# 添加远程仓库（替换为你的 GitHub 仓库地址）
git remote add origin https://github.com/你的用户名/ai-platform.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

**提示：**
- 首次推送可能需要输入 GitHub 用户名和密码（或 Personal Access Token）
- 建议使用 `git config --global credential.helper store` 保存凭据

---

### 步骤2：触发 GitHub Actions 构建（约30秒）

**手动触发：**

1. 访问你的 GitHub 仓库 Actions 页面：
   ```
   https://github.com/你的用户名/ai-platform/actions
   ```

2. 找到 "Build Desktop Applications" workflow

3. 点击右侧的 "Run workflow" 按钮

4. 选择要构建的平台：
   - `all` - 同时构建 Windows 和 macOS（推荐）
   - `windows` - 仅构建 Windows
   - `mac` - 仅构建 macOS

5. 点击绿色的 "Run workflow" 按钮

**自动触发：**
- 也可以直接推送代码到 `main` 或 `master` 分支，会自动触发构建

---

### 步骤3：下载构建产物（约5-8分钟）

1. 等待构建完成（查看 Actions 页面的进度）

2. 构建完成后，进入构建任务详情页

3. 在页面底部找到 "Artifacts" 部分

4. 下载所需平台：
   - **windows-installer** - Windows 安装程序
   - **macos-dmg** - macOS 安装包

5. 解压下载的 zip 文件

**产物内容：**
- Windows：`AI智能体平台 Setup 1.0.0.exe` + 校验和文件
- macOS：`AI智能体平台-1.0.0.dmg` + 校验和文件

---

## 📦 部署到下载入口

### 1. 复制文件到下载目录

```bash
# Windows 安装程序
cp AI智能体平台\ Setup\ 1.0.0.exe "/home/ai design/downloads/desktop/"

# macOS 安装包
cp AI智能体平台-1.0.0.dmg "/home/ai design/downloads/desktop/"
```

### 2. 生成校验和

```bash
# Windows
cd "/home/ai design/downloads/desktop"
md5sum "AI智能体平台\ Setup\ 1.0.0.exe" > "AI智能体平台\ Setup\ 1.0.0.exe.md5"
sha256sum "AI智能体平台\ Setup\ 1.0.0.exe" > "AI智能体平台\ Setup\ 1.0.0.exe.sha256"

# macOS
md5sum AI智能体平台-1.0.0.dmg > AI智能体平台-1.0.0.dmg.md5
sha256sum AI智能体平台-1.0.0.dmg > AI智能体平台-1.0.0.dmg.sha256
```

### 3. 更新前端页面

编辑 `frontend/src/pages/DesktopDownloadPage.tsx`：

```typescript
// 添加 Windows 版本数据
const WINDOWS_VERSION: DesktopAppVersion = {
  version: '1.0.0',
  platform: 'windows',
  arch: 'x64',
  filename: 'AI智能体平台 Setup 1.0.0.exe',
  filesize: 324677691,  // 替换为实际文件大小
  downloadUrl: '/downloads/desktop/AI智能体平台 Setup 1.0.0.exe',
  releaseDate: '2026-01-02T13:00:00Z',
  md5: '实际的MD5值',
  sha256: '实际的SHA256值'
};

// 添加 macOS 版本数据
const MAC_VERSION: DesktopAppVersion = {
  version: '1.0.0',
  platform: 'mac',
  arch: 'x64',
  filename: 'AI智能体平台-1.0.0.dmg',
  filesize: 280000000,  // 替换为实际文件大小
  downloadUrl: '/downloads/desktop/AI智能体平台-1.0.0.dmg',
  releaseDate: '2026-01-02T13:00:00Z',
  md5: '实际的MD5值',
  sha256: '实际的SHA256值'
};
```

### 4. 更新渲染函数

```typescript
const renderWindowsContent = () => {
  const isDownloading = downloading === WINDOWS_VERSION.filename;

  return (
    <Card className="version-card">
      <div className="version-header">
        <Space size="large">
          <div className="version-platform">
            <WindowsOutlined className="platform-icon windows" />
            <Text strong>WINDOWS</Text>
            <Tag color="green">x64</Tag>
          </div>
          <div className="version-size">
            <Text type="secondary">{formatFileSize(WINDOWS_VERSION.filesize)}</Text>
          </div>
        </Space>
      </div>

      <Divider />

      <Descriptions column={1} size="small" className="version-details">
        <Descriptions.Item label="文件名">{WINDOWS_VERSION.filename}</Descriptions.Item>
        <Descriptions.Item label="MD5">
          <Text code copyable>{WINDOWS_VERSION.md5}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="SHA256">
          <Text code copyable>{WINDOWS_VERSION.sha256}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="发布时间">
          {new Date(WINDOWS_VERSION.releaseDate).toLocaleString('zh-CN')}
        </Descriptions.Item>
      </Descriptions>

      <Button
        type="primary"
        size="large"
        block
        icon={<DownloadOutlined />}
        loading={isDownloading}
        onClick={() => handleDownload(WINDOWS_VERSION)}
        className="download-button"
      >
        {isDownloading ? '下载中...' : '立即下载'}
      </Button>
    </Card>
  );
};

const renderMacContent = () => {
  const isDownloading = downloading === MAC_VERSION.filename;

  return (
    <Card className="version-card">
      <div className="version-header">
        <Space size="large">
          <div className="version-platform">
            <AppleOutlined className="platform-icon mac" />
            <Text strong>macOS</Text>
            <Tag color="purple">x64 & ARM64</Tag>
          </div>
          <div className="version-size">
            <Text type="secondary">{formatFileSize(MAC_VERSION.filesize)}</Text>
          </div>
        </Space>
      </div>

      <Divider />

      <Descriptions column={1} size="small" className="version-details">
        <Descriptions.Item label="文件名">{MAC_VERSION.filename}</Descriptions.Item>
        <Descriptions.Item label="MD5">
          <Text code copyable>{MAC_VERSION.md5}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="SHA256">
          <Text code copyable>{MAC_VERSION.sha256}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="发布时间">
          {new Date(MAC_VERSION.releaseDate).toLocaleString('zh-CN')}
        </Descriptions.Item>
      </Descriptions>

      <Button
        type="primary"
        size="large"
        block
        icon={<DownloadOutlined />}
        loading={isDownloading}
        onClick={() => handleDownload(MAC_VERSION)}
        className="download-button"
      >
        {isDownloading ? '下载中...' : '立即下载'}
      </Button>
    </Card>
  );
};
```

### 5. 重新构建前端

```bash
cd "/home/ai design/frontend"
npm run build
```

---

## ⏱️ 时间预估

| 步骤 | 时间 |
|------|------|
| 推送代码到 GitHub | 1-2 分钟 |
| 触发 GitHub Actions | 30 秒 |
| 等待 Windows 构建 | 5-8 分钟 |
| 等待 macOS 构建 | 5-7 分钟 |
| 下载构建产物 | 1-2 分钟 |
| 部署到下载目录 | 1 分钟 |
| 更新前端页面 | 2-3 分钟 |
| **总计** | **约 15-25 分钟** |

---

## ✅ 完成检查清单

构建完成后，请确认以下内容：

- [ ] GitHub Actions 构建成功
- [ ] 下载了 Windows 安装程序
- [ ] 下载了 macOS 安装包
- [ ] 安装程序复制到 `downloads/desktop/`
- [ ] 生成了 MD5 和 SHA256 校验和
- [ ] 更新了前端页面（添加 Windows 和 macOS 版本信息）
- [ ] 重新构建了前端
- [ ] 测试了 Windows 下载链接
- [ ] 测试了 macOS 下载链接

---

## 🔧 故障排除

### 问题：推送失败，提示认证错误
**解决：**
```bash
# 生成 Personal Access Token
# 访问：https://github.com/settings/tokens
# 创建 token，选择 "repo" 权限

# 使用 token 推送
git push https://YOUR_TOKEN@github.com/你的用户名/ai-platform.git
```

### 问题：GitHub Actions 构建失败
**解决：**
1. 查看 Actions 日志，找到具体错误
2. 检查 `.github/workflows/build-desktop.yml` 配置
3. 确保所有依赖在 `package.json` 中正确配置

### 问题：下载的安装程序无法运行
**解决：**
1. 验证校验和是否正确
2. Windows：右键 → 属性 → 解除锁定
3. macOS：系统偏好设置 → 安全性与隐私 → 允许

---

## 📞 获取帮助

如遇到问题，请参考：
- **完整检查报告：** `CODE_CHECK_REPORT.md`
- **Windows 构建指南：** `WINDOWS_BUILD_GUIDE_CN.md`
- **GitHub Actions 文档：** https://docs.github.com/en/actions

---

**版本：** 1.0.0
**最后更新：** 2026-01-02
**状态：** ✅ 代码检查通过，可以安全构建
