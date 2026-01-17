# AI智能体平台 - Windows版本构建指南

## 当前环境说明

⚠️ **重要提示**：当前运行环境为 Linux 系统，无法直接构建 Windows 版本安装程序。

## 构建方案对比

### 方案一：GitHub Actions 自动构建（推荐）⭐

**优点：**
- ✅ 完全免费
- ✅ 无需Windows环境
- ✅ 构建稳定可靠
- ✅ 支持自动发布
- ✅ 可同时构建多平台版本

**操作步骤：**

1. **创建 GitHub 仓库**
   ```bash
   # 如果还没有Git仓库
   git init
   git add .
   git commit -m "Initial commit"

   # 在GitHub创建仓库后
   git remote add origin https://github.com/你的用户名/ai-platform.git
   git push -u origin main
   ```

2. **启用 GitHub Actions**
   - 访问：`https://github.com/你的用户名/ai-platform/actions`
   - 点击 "I understand my workflows, go ahead and enable them"
   - 项目中已配置 `.github/workflows/build-desktop.yml`

3. **手动触发构建**
   - 访问：`https://github.com/你的用户名/ai-platform/actions`
   - 选择 "Build Desktop Applications" workflow
   - 点击 "Run workflow" 按钮
   - 选择平台：windows / linux / mac / all
   - 点击 "Run workflow"

4. **下载构建产物**
   - 等待构建完成（约5-10分钟）
   - 进入构建任务详情
   - 点击 "Artifacts" 部分
   - 下载 `windows-installer` artifact
   - 解压后即可获得安装程序

**工作流配置文件位置：** `.github/workflows/build-desktop.yml`

---

### 方案二：Windows本地构建

**系统要求：**
- Windows 10 或 Windows 11（64位）
- Node.js 18+ （推荐 18.x LTS）
- Git
- 至少 4GB 可用磁盘空间

**操作步骤：**

1. **准备开发环境**
   ```bash
   # 安装 Node.js
   # 访问 https://nodejs.org/ 下载并安装 LTS 版本

   # 验证安装
   node --version  # 应显示 v18.x.x 或更高
   npm --version   # 应显示 9.x.x 或更高
   ```

2. **获取项目代码**
   ```bash
   # 克隆项目（如果已有项目可跳过）
   cd D:\projects
   git clone <你的仓库地址> ai-platform
   cd ai-platform

   # 或者直接在当前项目目录操作
   cd "D:\path\to\ai design"
   ```

3. **运行构建脚本**
   ```bash
   # 方法一：双击运行批处理文件（最简单）
   双击运行: downloads\desktop\build-windows-installer.bat

   # 方法二：命令行手动执行
   # 1. 安装前端依赖
   cd frontend
   npm install

   # 2. 构建前端
   npm run build

   # 3. 安装桌面端依赖
   cd ..\desk
   npm install

   # 4. 构建桌面端主进程
   npm run build:main

   # 5. 构建Windows安装程序
   npm run build:nsis
   ```

4. **查找构建产物**
   - 安装包位置：`desk\dist-electron\AI智能体平台 Setup 1.0.0.exe`
   - 文件大小：约 300-400 MB
   - 校验和文件：`*.exe.md5` 和 `*.exe.sha256`

---

## 构建产物说明

### Windows 安装程序

**支持的安装格式：**
- **NSIS 安装程序**（推荐）：`AI智能体平台 Setup 1.0.0.exe`
  - 支持自定义安装目录
  - 自动创建桌面快捷方式
  - 自动创建开始菜单快捷方式
  - 支持卸载程序

- **便携版**：`AI智能体平台-1.0.0-win-portable.exe`
  - 无需安装，直接运行
  - 适合临时使用或U盘携带

- **Windows Store 包**：`AI智能体平台-1.0.0.appx`
  - 可提交到 Microsoft Store
  - 支持自动更新

### 安装程序特性

✅ **安装选项：**
- 可选择安装目录（默认：`C:\Program Files\AI智能体平台`）
- 自动创建桌面快捷方式
- 自动创建开始菜单快捷方式
- 关联文件类型（如 .ai, .project 等）

✅ **卸载功能：**
- 完全清理程序文件
- 可选择保留用户配置
- 自动清理注册表项

✅ **自动更新：**
- 支持后台检查更新
- 支持静默下载更新
- 支持增量更新

---

## 部署到前端下载入口

### 方案一：手动部署

1. **获取安装程序**
   - 从 GitHub Actions 下载，或
   - 从本地构建目录复制

2. **放置到下载目录**
   ```bash
   # 复制文件到下载目录
   copy desk\dist-electron\AI智能体平台\ Setup\ 1.0.0.exe downloads\desktop\

   # 生成校验和
   certutil -hashfile downloads\desktop\AI智能体平台\ Setup\ 1.0.0.exe MD5
   certutil -hashfile downloads\desktop\AI智能体平台\ Setup\ 1.0.0.exe SHA256
   ```

3. **更新前端配置**
   编辑 `frontend/src/pages/DesktopDownloadPage.tsx`：
   ```typescript
   const WINDOWS_VERSION: DesktopAppVersion = {
     version: '1.0.0',
     platform: 'windows',
     arch: 'x64',
     filename: 'AI智能体平台 Setup 1.0.0.exe',
     filesize: 324677691,  // 实际文件大小
     downloadUrl: '/downloads/desktop/AI智能体平台 Setup 1.0.0.exe',
     releaseDate: '2026-01-02T12:42:00Z',
     md5: '实际的MD5值',
     sha256: '实际的SHA256值'
   };
   ```

4. **重新构建前端**
   ```bash
   cd frontend
   npm run build
   ```

5. **配置 Nginx（如果需要）**
   ```nginx
   location /downloads/desktop/ {
       alias /path/to/downloads/desktop/;
       autoindex off;
       add_header Content-Disposition "attachment";
   }
   ```

---

## 常见问题

### Q1: 为什么不能在 Linux 上构建 Windows 版本？

**A:** Electron 应用的构建过程需要使用目标平台的编译工具链。Windows 应用需要使用 Windows 特定的库和工具（如 NSIS 安装程序制作工具），这些无法在 Linux 环境中直接运行。

### Q2: GitHub Actions 构建需要多长时间？

**A:**
- Windows 构建：约 5-8 分钟
- Linux 构建：约 3-5 分钟
- macOS 构建：约 5-7 分钟

### Q3: 构建产物能保存多久？

**A:** GitHub Actions 产物默认保留 90 天。可在工作流配置中修改 `retention-days` 参数。

### Q4: 如何验证安装程序的完整性？

**A:** 使用提供的校验和文件：
```bash
# Windows PowerShell
certutil -hashfile "AI智能体平台 Setup 1.0.0.exe" MD5
certutil -hashfile "AI智能体平台 Setup 1.0.0.exe" SHA256

# Linux/Mac
md5sum AI智能体平台\ Setup\ 1.0.0.exe
sha256sum AI智能体平台\ Setup\ 1.0.0.exe
```

将计算出的校验和与提供的 MD5/SHA256 值对比，完全一致则文件完整。

### Q5: 安装程序需要管理员权限吗？

**A:** 推荐使用管理员权限安装。如果安装到用户目录（如 `C:\Users\用户名\AppData\Local`），可以使用普通用户权限。

### Q6: 如何自定义安装程序？

**A:** 编辑以下文件：
- NSIS 安装脚本：`desk/build/installer.nsh`
- 应用配置：`desk/package.json` 中的 `build` 配置
- 应用图标：`desk/build/icon.ico`（需要 256x256 ico 格式）

---

## 快速开始

### 立即使用 GitHub Actions 构建

1. 访问你的 GitHub 仓库
2. 进入 Actions 标签
3. 点击 "Build Desktop Applications"
4. 选择平台并运行
5. 下载构建产物

### Windows 本地快速构建

```bash
# 一键运行（推荐）
双击运行：downloads\desktop\build-windows-installer.bat

# 手动执行
cd frontend && npm install && npm run build
cd ..\desk && npm install && npm run build:main && npm run build:nsis
```

---

## 技术支持

如遇到问题，请检查：
1. Node.js 版本是否为 18+（推荐使用 LTS 版本）
2. npm 是否正常工作
3. 磁盘空间是否充足（至少 4GB）
4. 网络连接是否正常（下载依赖需要）

---

**最后更新时间：** 2026-01-02
**版本：** 1.0.0
