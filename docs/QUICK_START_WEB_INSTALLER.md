# Web Installer 快速构建指南

## 🚀 快速开始（5分钟）

### 前提条件

**必需**：
- Windows 10/11 64位系统
- Node.js 20.x 或更高版本
- NSIS 3.x（Nullsoft Scriptable Install System）

### 安装必备软件

#### 1. 安装 Node.js
访问 https://nodejs.org/ 下载并安装 Node.js 20.x LTS

验证安装：
```bash
node --version
npm --version
```

#### 2. 安装 NSIS
访问 https://nsis.sourceforge.io/Download 下载 NSIS

**重要**：安装时务必勾选 "Add NSIS to PATH"

验证安装：
```bash
makensis /VERSION
```

### 获取代码

从Linux服务器复制项目到Windows：
```bash
# 在Linux服务器上打包
cd /home/tar -czf ai-design.tar.gz ai\ design/

# 下载到Windows并解压
# 或使用Git克隆（如果有Git仓库）
```

### 一键构建

```bash
cd desk
build-web-installer.bat
```

构建完成后，输出文件在：`desk/dist-web/`

### 验证输出

检查文件大小：
- Web Installer: ~3-5MB
- 完整安装包: ~150-200MB

### 上传到服务器

```bash
# 使用SCP或FTP上传到服务器

# Web Installer (3MB) → 下载目录
scp dist-web/AI智能体平台-Setup-Web-1.0.0.exe user@server:/var/www/aidesign.ltd/downloads/

# 完整包 (170MB) → 发布目录
scp dist-web/AI智能体平台-1.0.0-win-x64.nsis.7z user@server:/var/www/aidesign.ltd/releases/v1.0.0/
```

### 更新下载页面

修改 `frontend/src/pages/DesktopDownloadPage.tsx`，添加Web Installer选项，然后重新构建前端。

---

## 📋 详细步骤

如需更详细的说明，请参考：`docs/BUILD_WEB_INSTALLER_WINDOWS.md`

## ❓ 常见问题

**Q: 构建失败？**
A: 检查NSIS是否正确安装并添加到PATH

**Q: Web Installer不是3MB？**
A: 确保 `electron-builder-web.json` 中的 `files` 为空数组 `[]`

**Q: 下载失败？**
A: 检查NSIS脚本中的下载URL是否正确指向7z文件

---

**技术支持**: 查看完整文档 `docs/WEB_INSTALLER_GUIDE.md`
