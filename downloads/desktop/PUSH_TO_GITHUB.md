# 推送到 GitHub 并触发构建

**仓库地址：** https://github.com/zixiu905-prog/aidesign2.git
**状态：** ✅ Git 仓库已初始化，代码已提交，远程仓库已配置

---

## 🚀 推送步骤（选择以下任一方式）

### 方式一：使用 Personal Access Token（推荐）

#### 1. 生成 Personal Access Token

1. 访问：https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 填写信息：
   - Note: `AI Platform Desktop Build`
   - Expiration: 选择过期时间（推荐 90 days 或 No expiration）
   - Select scopes: 勾选 `repo`（Full control of private repositories）
4. 点击 "Generate token"
5. **重要：** 复制生成的 token（只显示一次！）

#### 2. 使用 Token 推送

```bash
cd "/home/ai design"

# 移除旧的远程地址
git remote remove origin

# 添加带 token 的远程地址（将 YOUR_TOKEN 替换为实际 token）
git remote add origin https://YOUR_TOKEN@github.com/zixiu905-prog/aidesign2.git

# 推送
git push -u origin main
```

**示例：**
```bash
# 假设 token 是 ghp_xxxxxxxxxxxxxxxx
git remote add origin https://ghp_xxxxxxxxxxxxxxx@github.com/zixiu905-prog/aidesign2.git
git push -u origin main
```

---

### 方式二：使用 SSH 密钥（如果已配置）

如果您已经配置了 SSH 密钥：

```bash
cd "/home/ai design"

# 改用 SSH 地址
git remote set-url origin git@github.com:zixiu905-prog/aidesign2.git

# 推送
git push -u origin main
```

---

### 方式三：使用 GitHub CLI（如果已安装）

```bash
cd "/home/ai design"

# 登录
gh auth login

# 推送并创建仓库
gh repo create aidesign2 --public --source=. --remote=origin
```

---

## 📊 推送后自动触发

推送成功后，GitHub Actions 将**自动触发**构建：

### 构建内容

| 平台 | 任务 | 预计时间 |
|------|------|----------|
| **Windows** | NSIS 安装程序 (.exe) | 5-8 分钟 |
| **macOS** | DMG 镜像 (.dmg) | 5-7 分钟 |

### 构建步骤

1. ✅ Checkout 代码
2. ✅ 安装 Node.js 18
3. ✅ 安装依赖（npm ci）
4. ✅ 构建前端（npm run build）
5. ✅ 构建 Electron 主进程（npm run build:main）
6. ✅ 构建安装程序（electron-builder）
7. ✅ 生成校验和（MD5, SHA256）
8. ✅ 上传到 Artifacts

---

## 📥 查看构建进度

推送成功后，访问：

```
https://github.com/zixiu905-prog/aidesign2/actions
```

查找构建任务：`Build Desktop Applications`

点击构建任务查看实时进度和日志。

---

## 📦 下载构建产物

构建完成后（约 5-8 分钟），在构建任务页面的底部找到 "Artifacts" 部分：

### 下载项目

- **windows-installer** - Windows 安装程序
- **macos-dmg** - macOS 安装包

点击下载按钮，获得 zip 文件，解压后得到安装程序。

### 产物内容

**Windows Artifact：**
```
windows-installer.zip
└── AI智能体平台 Setup 1.0.0.exe
└── AI智能体平台 Setup 1.0.0.exe.md5
└── AI智能体平台 Setup 1.0.0.exe.sha256
```

**macOS Artifact：**
```
macos-dmg.zip
└── AI智能体平台-1.0.0.dmg
└── AI智能体平台-1.0.0.dmg.md5
└── AI智能体平台-1.0.0.dmg.sha256
```

---

## ✅ 推送成功检查清单

推送成功后，请确认：

- [ ] 命令行显示 "Writing objects: 100% (1504/1504)"
- [ ] 命令行显示 "To https://github.com/zixiu905-prog/aidesign2.git"
- [ ] 命令行显示 "Branch 'main' set up to track remote branch 'main' from 'origin'"
- [ ] GitHub 仓库地址显示所有文件
- [ ] GitHub Actions 页面显示新的构建任务

---

## 🔧 故障排除

### 问题：推送时提示 "Authentication failed"

**解决：**
1. 检查 token 是否正确
2. 确保 token 有 `repo` 权限
3. 重新生成 token（旧的 token 可能已过期）

### 问题：推送时提示 "Repository not found"

**解决：**
1. 确认仓库名称正确：`aidesign2`
2. 确认用户名正确：`zixiu905-prog`
3. 访问仓库地址确认仓库已创建：
   ```
   https://github.com/zixiu905-prog/aidesign2
   ```

### 问题：推送时提示 "Permission denied"

**解决：**
1. 确认 token 有 `repo` 权限
2. 如果是私有仓库，确保有写入权限
3. 重新生成 token 并选择 `repo` scope

### 问题：GitHub Actions 构建失败

**解决：**
1. 访问 Actions 页面查看错误日志
2. 检查 `.github/workflows/build-desktop.yml` 配置
3. 确保所有依赖在 `package.json` 中

---

## 📞 推送命令速查

### Personal Access Token 方式

```bash
cd "/home/ai design"
git remote remove origin
git remote add origin https://YOUR_TOKEN@github.com/zixiu905-prog/aidesign2.git
git push -u origin main
```

### SSH 方式

```bash
cd "/home/ai design"
git remote set-url origin git@github.com:zixiu905-prog/aidesign2.git
git push -u origin main
```

---

## 🎯 完成后的下一步

### 1. 下载安装程序

等待 5-8 分钟构建完成后：
1. 访问：`https://github.com/zixiu905-prog/aidesign2/actions`
2. 进入最新的构建任务
3. 下载 `windows-installer` 和 `macos-dmg`
4. 解压 zip 文件

### 2. 部署到下载目录

```bash
# 复制安装程序
cp "AI智能体平台 Setup 1.0.0.exe" "/home/ai design/downloads/desktop/"
cp "AI智能体平台-1.0.0.dmg" "/home/ai design/downloads/desktop/"

# 生成校验和
cd "/home/ai design/downloads/desktop"
md5sum "AI智能体平台 Setup 1.0.0.exe" > "AI智能体平台 Setup 1.0.0.exe.md5"
sha256sum "AI智能体平台 Setup 1.0.0.exe" > "AI智能体平台 Setup 1.0.0.exe.sha256"
md5sum "AI智能体平台-1.0.0.dmg" > "AI智能体平台-1.0.0.dmg.md5"
sha256sum "AI智能体平台-1.0.0.dmg" > "AI智能体平台-1.0.0.dmg.sha256"
```

### 3. 更新前端页面

编辑 `frontend/src/pages/DesktopDownloadPage.tsx`，添加实际的版本信息。

### 4. 重新构建前端

```bash
cd "/home/ai design/frontend"
npm run build
```

---

## 📞 支持

- **GitHub Actions 状态：** https://github.com/zixiu905-prog/aidesign2/actions
- **仓库地址：** https://github.com/zixiu905-prog/aidesign2
- **快速开始指南：** `downloads/desktop/QUICK_START.md`
- **代码检查报告：** `downloads/desktop/CODE_CHECK_REPORT.md`

---

**准备好了吗？立即使用 Personal Access Token 推送代码！**

推送成功后，GitHub Actions 将自动开始构建 Windows 和 macOS 版本（约 5-8 分钟）。
