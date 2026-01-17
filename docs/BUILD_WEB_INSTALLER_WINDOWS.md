# Windows环境构建Web Installer完整指南

## 概述

在Windows环境下构建真正的Web Installer（3MB版本），需要准备构建环境并执行构建命令。

## 系统要求

### 硬件要求
- **操作系统**: Windows 10 或 Windows 11 (64位)
- **CPU**: x64架构
- **内存**: 至少8GB RAM
- **存储**: 至少10GB可用空间
- **网络**: 稳定互联网连接（用于下载依赖）

### 软件要求

#### 1. Node.js 和 npm
```bash
# 下载并安装 Node.js 20.x
# 官网: https://nodejs.org/

# 验证安装
node --version  # 应显示 v20.x.x
npm --version   # 应显示 10.x.x
```

#### 2. Git（用于克隆代码）
```bash
# 下载并安装 Git for Windows
# 官网: https://git-scm.com/download/win

git --version  # 验证安装
```

#### 3. NSIS（必需）
```bash
# 下载 NSIS 3.x
# 官网: https://nsis.sourceforge.io/Download

# 安装时勾选：
# ✓ 添加到系统PATH
# ✓ 安装所有插件

# 验证安装
makensis /VERSION  # 应显示版本号
```

#### 4. Windows SDK（可选，用于高级功能）
- 如果需要代码签名，需要安装Windows SDK
- 下载地址: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/

## 构建步骤

### 第一步：准备代码

#### 方式A：从GitHub克隆（推荐）
```bash
# 打开 Git Bash 或 PowerShell
git clone https://github.com/your-username/ai-design.git
cd ai-design
```

#### 方式B：直接复制文件
将Linux服务器上的 `/home/ai design` 目录复制到Windows本地，例如：
```
C:\projects\ai-design\
```

### 第二步：安装依赖

```bash
# 进入项目目录
cd C:\projects\ai-design

# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ..\frontend
npm install

# 安装桌面应用依赖
cd ..\desk
npm install
```

### 第三步：配置环境变量

创建 `.env` 文件（在 `desk` 目录下）：
```env
# API配置
API_URL=https://www.aidesign.ltd/api

# 版本号
VERSION=1.0.0

# 下载URL（Web Installer用）
DOWNLOAD_URL=https://www.aidesign.ltd/releases/v1.0.0/AI智能体平台-1.0.0-win-x64.7z
```

### 第四步：修改NSIS脚本（重要）

编辑 `desk\build-resources\web-installer.nsh`：

```nsis
!macro customInit
  ; 配置下载URL - 必须指向实际的7z文件
  StrCpy $DownloadURL "https://www.aidesign.ltd/releases/v1.0.0/ai-platform-desktop-1.0.0-x64.nsis.7z"
!macroend
```

**注意**：确保URL指向正确的7z文件。7z文件需要提前上传到服务器。

### 第五步：构建前端和主进程

```bash
# 在 desk 目录下执行

# 构建前端
cd ..\frontend
npm run build

# 将构建结果复制到desk资源目录
xcopy /E /I /Y dist\* ..\desk\resources\

# 返回desk目录
cd ..\desk

# 构建主进程
npm run build:main
```

### 第六步：构建Web Installer

```bash
# 在 desk 目录下执行

# 方式一：构建Web Installer（推荐）
npm run build:web-installer

# 方式二：构建完整的Web包（包含Web Installer和Full Installer）
npm run build:web-full

# 构建完成后，检查输出
dir dist-web\*.exe
```

### 第七步：验证构建结果

构建成功后，`desk\dist-web\` 目录下应该有以下文件：

```
dist-web/
├── AI智能体平台-Setup-Web-1.0.0.exe      (约 3-5 MB) ← Web Installer
├── AI智能体平台-1.0.0-win-x64.nsis.7z    (约 150-200 MB) ← 完整包
└── builder-effective-config.yaml
```

**验证文件大小**：
```bash
# Web Installer 应该只有几MB
dir dist-web\AI智能体平台-Setup-Web-1.0.0.exe

# 7z文件应该是完整大小
dir dist-web\AI智能体平台-1.0.0-win-x64.nsis.7z
```

### 第八步：本地测试（可选）

```bash
# 运行Web Installer进行测试
dist-web\AI智能体平台-Setup-Web-1.0.0.exe
```

测试要点：
- ✓ 安装程序启动
- ✓ 显示下载进度
- ✓ 能正确下载7z文件
- ✓ 解压并安装成功
- ✓ 创建桌面快捷方式

## 上传到服务器

### 方式A：使用SCP（需要SSH密钥）

```bash
# 上传Web Installer（3MB）到下载目录
scp dist-web/AI智能体平台-Setup-Web-1.0.0.exe user@your-server:/var/www/aidesign.ltd/downloads/

# 上传7z文件到发布目录
scp dist-web/AI智能体平台-1.0.0-win-x64.nsis.7z user@your-server:/var/www/aidesign.ltd/releases/v1.0.0/
```

### 方式B：使用FTP/SFTP工具

使用FileZilla等工具上传：
- Web Installer → `/var/www/aidesign.ltd/downloads/`
- 7z文件 → `/var/www/aidesign.ltd/releases/v1.0.0/`

### 方式C：从服务器直接下载

如果Windows机器可以访问Linux服务器：
```bash
# 在Linux服务器上
scp /home/ai\ design/desk/dist-web/* user@windows-machine:C:/temp/
```

## 更新下载页面

上传完成后，需要更新前端下载页面以显示Web Installer选项。

编辑 `frontend/src/pages/DesktopDownloadPage.tsx`：

```typescript
const windowsVersions: DesktopAppVersion[] = [
  {
    version: '1.0.0',
    platform: 'windows',
    arch: 'x64',
    filename: 'AI智能体平台-Setup-Web-1.0.0.exe',
    filesize: 3 * 1024 * 1024, // 3MB
    downloadUrl: 'https://www.aidesign.ltd/downloads/AI智能体平台-Setup-Web-1.0.0.exe',
    releaseDate: '2026-01-11',
    md5: 'web-installer-md5-hash',
    sha256: 'web-installer-sha256-hash'
  },
  {
    version: '1.0.0',
    platform: 'windows',
    arch: 'x64',
    filename: 'AI智能体平台-1.0.0-win-x64.nsis.7z',
    filesize: 169 * 1024 * 1024, // 169MB
    downloadUrl: 'https://www.aidesign.ltd/releases/v1.0.0/AI智能体平台-1.0.0-win-x64.nsis.7z',
    releaseDate: '2026-01-11',
    md5: 'full-installer-md5-hash',
    sha256: 'full-installer-sha256-hash'
  }
];
```

然后重新构建前端并部署：
```bash
cd frontend
npm run build
cp -r dist/* /var/www/aidesign.ltd/
```

## 常见问题解决

### 问题1：NSIS未找到
```
Error: makensis not found
```

**解决**：
1. 安装NSIS
2. 将NSIS添加到系统PATH
3. 重启终端
4. 验证：`makensis /VERSION`

### 问题2：构建失败
```
Error: electron-builder not found
```

**解决**：
```bash
cd desk
npm install electron-builder --save-dev
```

### 问题3：下载URL配置错误
```
Web Installer无法下载完整包
```

**解决**：
1. 检查 `web-installer.nsh` 中的URL是否正确
2. 确保7z文件已上传到服务器
3. 验证URL可以在浏览器中访问

### 问题4：文件大小异常
```
Web Installer不是3MB而是100+MB
```

**解决**：
检查 `electron-builder-web.json` 中的 `files` 字段：
```json
"files": []  // 必须为空数组，不能包含任何文件
```

### 问题5：构建超时
```
构建过程卡住或超时
```

**解决**：
1. 检查网络连接
2. 清理npm缓存：`npm cache clean --force`
3. 删除 `node_modules` 重新安装
4. 增加超时时间：`npm config set fetch-timeout 60000`

## 优化建议

### 1. 启用压缩
在 `electron-builder-web.json` 中：
```json
{
  "nsisWeb": {
    "differentialPackage": true
  }
}
```

### 2. 使用CDN加速
将7z文件上传到CDN，修改下载URL：
```nsis
StrCpy $DownloadURL "https://cdn.your-domain.com/releases/v1.0.0/ai-platform-desktop-1.0.0-x64.nsis.7z"
```

### 3. 代码签名（推荐）
购买代码签名证书，在 `electron-builder-web.json` 中配置：
```json
{
  "win": {
    "sign": "./scripts/sign.js"
  }
}
```

### 4. 添加版本检测
在NSIS脚本中添加版本检查逻辑，确保下载最新版本。

## 完整构建脚本

创建 `build-web-installer.bat`：

```batch
@echo off
setlocal

echo ========================================
echo AI平台 Web Installer 构建脚本
echo ========================================
echo.

REM 检查Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装Node.js
    exit /b 1
)

echo ✅ Node.js 检查通过

REM 检查NSIS
makensis /VERSION >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ NSIS 未安装，请先安装NSIS
    exit /b 1
)

echo ✅ NSIS 检查通过

REM 安装依赖
echo.
echo 步骤1: 安装依赖...
cd desk
npm install
if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败
    exit /b 1
)

REM 构建前端
echo.
echo 步骤2: 构建前端...
cd ..\frontend
npm run build
if %errorlevel% neq 0 (
    echo ❌ 前端构建失败
    exit /b 1
)

REM 复制资源
echo.
echo 步骤3: 复制资源...
xcopy /E /I /Y dist\* ..\desk\resources\
if %errorlevel% neq 0 (
    echo ❌ 资源复制失败
    exit /b 1
)

REM 构建主进程和Web Installer
echo.
echo 步骤4: 构建Web Installer...
cd ..\desk
npm run build:web-installer
if %errorlevel% neq 0 (
    echo ❌ Web Installer 构建失败
    exit /b 1
)

echo.
echo ========================================
echo ✅ 构建完成！
echo ========================================
echo.
echo Web Installer: %CD%\dist-web\AI智能体平台-Setup-Web-1.0.0.exe
echo 完整包: %CD%\dist-web\AI智能体平台-1.0.0-win-x64.nsis.7z
echo.

endlocal
```

使用方法：
```batch
build-web-installer.bat
```

## 部署清单

构建和部署完成后，检查以下项目：

- [ ] Web Installer文件大小约为3-5MB
- [ ] 7z文件大小约为150-200MB
- [ ] 两个文件都已上传到服务器
- [ ] NSIS脚本中的下载URL正确
- [ ] 前端下载页面已更新
- [ ] 测试下载链接有效
- [ ] 测试Web Installer能正常工作
- [ ] 更新版本号和发布日期
- [ ] 生成并更新MD5/SHA256校验值

## 技术支持

### 相关文档
- `docs/WEB_INSTALLER_GUIDE.md` - 完整技术指南
- `docs/CLOUD_DEPLOYMENT_CHECKLIST.md` - 部署检查清单
- `WEB_INSTALLER_SUMMARY.md` - 项目总结

### 关键文件
- `desk/electron-builder-web.json` - Web Installer配置
- `desk/build-resources/web-installer.nsh` - NSIS安装脚本
- `frontend/src/pages/DesktopDownloadPage.tsx` - 下载页面

### 快速联系
构建过程中遇到问题，请查看构建日志：`desk/dist-web/builder-debug.yml`

---

**创建时间**: 2026-01-11
**版本**: 1.0.0
**适用平台**: Windows 10/11 (x64)
