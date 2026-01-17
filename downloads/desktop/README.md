# AI智能体平台 - 桌面端构建工具包

## 📋 当前状态

✅ **Linux 版本：** 已构建完成，可直接下载
⏸️ **Windows 版本：** 待构建（需 Windows 环境或 GitHub Actions）
⏸️ **macOS 版本：** 待构建（需 macOS 环境）

## 🚀 快速开始

### 选项 1：使用 GitHub Actions 自动构建（推荐）⭐

**这是最简单、最可靠的方式，完全免费！**

1. 将代码推送到 GitHub
2. 运行 Actions workflow（3次点击）
3. 5-8分钟后获得 Windows 安装程序
4. 部署到下载入口

详细步骤：查看 `BUILD_STATUS.md` 的"立即获得 Windows 版本"章节

---

### 选项 2：Windows 本地构建

1. 在 Windows 10/11 上打开项目
2. 双击运行：`build-windows-installer.bat`
3. 等待 5-10 分钟
4. 获得 Windows 安装程序

详细步骤：查看 `WINDOWS_BUILD_GUIDE_CN.md`

---

## 📦 可用文件

| 文件 | 用途 |
|------|------|
| `AI智能体平台-1.0.0-linux-x64.tar.gz` | **Linux 安装包（310MB）** ✅ 已可用 |
| `build-windows-installer.bat` | Windows 自动构建脚本 |
| `WINDOWS_BUILD_GUIDE_CN.md` | Windows 构建详细指南 |
| `BUILD_STATUS.md` | 完整构建状态报告 |

---

## ⚠️ 为什么当前环境无法构建 Windows 版本？

当前系统：**Linux x86_64**

Windows 版本构建需要：
- ❌ NSIS 安装程序制作工具（仅 Windows 可用）
- ❌ Windows 特定的编译工具链
- ❌ Wine（即使安装也有兼容性风险）

**推荐：** 使用 GitHub Actions 自动构建，无需 Windows 环境，免费且可靠。

---

## 📖 详细文档

- **Windows 构建完整指南：** `WINDOWS_BUILD_GUIDE_CN.md`
- **构建状态报告：** `BUILD_STATUS.md`
- **GitHub Actions 配置：** `.github/workflows/build-desktop.yml`

---

## 🎯 下一步操作

### 快速获得 Windows 版本（推荐）

1. **推送代码到 GitHub**
   ```bash
   cd "/home/ai design"
   git init
   git add .
   git commit -m "Add AI Platform Desktop"
   git remote add origin https://github.com/你的用户名/ai-platform.git
   git push -u origin main
   ```

2. **运行 GitHub Actions**
   - 访问：`https://github.com/你的用户名/ai-platform/actions`
   - 点击 "Build Desktop Applications"
   - 选择平台：`windows`
   - 点击 "Run workflow"

3. **下载安装程序**
   - 等待 5-8 分钟
   - 下载 `windows-installer` artifact
   - 获得安装程序

4. **部署到下载入口**
   - 复制到 `downloads/desktop/`
   - 更新前端 `DesktopDownloadPage.tsx`
   - 重新构建前端

---

## 💡 提示

- ⏱️ GitHub Actions 构建约需 5-8 分钟
- 🆓 GitHub Actions 对公开仓库免费
- 💾 构建产物自动保存 30 天
- 🔒 构建过程在云端执行，安全可靠

---

**版本：** 1.0.0
**更新时间：** 2026-01-02
