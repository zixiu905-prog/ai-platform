# AiDesign Windows 桌面应用 - 详细构建指南

## 📚 目录

1. [系统要求](#系统要求)
2. [环境准备](#环境准备)
3. [构建流程](#构建流程)
4. [详细步骤](#详细步骤)
5. [故障排查](#故障排查)
6. [常见问题](#常见问题)
7. [高级配置](#高级配置)

---

## 系统要求

### 硬件要求
- **CPU**: Intel i5 或同等性能处理器（推荐 i7 或更高）
- **内存**: 最少 8GB RAM（推荐 16GB 或更高）
- **硬盘**: 至少 10GB 可用空间
- **网络**: 稳定的互联网连接（用于下载依赖）

### 软件要求
- **操作系统**: Windows 10 或更高版本（64位）
- **Node.js**: v18.x 或更高版本
- **npm**: v9.x 或更高版本（随Node.js安装）
- **PowerShell**: Windows PowerShell 5.1 或更高

---

## 环境准备

### 1. 安装 Node.js

#### 步骤 1.1: 下载 Node.js

访问官方下载页面：
https://nodejs.org/

选择 **LTS 版本**（长期支持版本），如：
- v18.19.0 LTS
- v20.11.0 LTS

#### 步骤 1.2: 安装 Node.js

1. 下载 Windows 安装程序（.msi 文件）
2. 双击运行安装程序
3. 按照安装向导完成安装
4. 接受默认设置即可

#### 步骤 1.3: 验证安装

打开 PowerShell 或 命令提示符，运行：

```powershell
node -v
npm -v
```

预期输出示例：
```
v18.19.0
9.2.0
```

如果看到版本号，说明安装成功。

### 2. 配置 npm 镜像（可选，推荐）

为了加速依赖下载，建议配置国内镜像：

```powershell
# 配置淘宝镜像
npm config set registry https://registry.npmmirror.com

# 验证配置
npm config get registry
```

### 3. 配置 Electron 镜像（可选，推荐）

设置 Electron 相关的环境变量：

**方法一：临时设置（每次打开命令行需要重新设置）**
```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
```

**方法二：永久设置（推荐）**

在系统环境变量中添加：
- 变量名：`ELECTRON_MIRROR`
- 变量值：`https://npmmirror.com/mirrors/electron/`

- 变量名：`ELECTRON_BUILDER_BINARIES_MIRROR`
- 变量值：`https://npmmirror.com/mirrors/electron-builder-binaries/`

---

## 构建流程

### 构建方法概览

#### 方法一：一键构建（推荐新手）

双击 `build-windows.bat`，自动完成所有步骤。

**优点**：
- 无需手动操作
- 自动检查环境
- 自动安装依赖

**适用场景**：
- 首次构建
- 不熟悉命令行操作

#### 方法二：快速构建（推荐有经验用户）

双击 `build-quick.bat`，跳过依赖安装。

**优点**：
- 构建速度快
- 节省时间

**适用场景**：
- 已安装过依赖
- 代码修改后重新构建

#### 方法三：手动构建（推荐高级用户）

在命令行中逐步执行构建命令。

**优点**：
- 完全控制
- 易于调试

**适用场景**：
- 需要自定义构建流程
- 遇到构建错误需要排查

---

## 详细步骤

### 方法一：一键构建步骤

#### 步骤 1：解压构建工具包

1. 下载 `ai-platform-windows-build-kit-final.tar.gz`
2. 使用解压工具（如 7-Zip）解压
3. 解压后得到 `ai-platform-windows-build-kit-final` 文件夹

#### 步骤 2：运行构建脚本

1. 进入解压后的文件夹
2. 找到 `build-windows.bat` 文件
3. 右键 → 选择"以管理员身份运行"
4. 等待构建完成（可能需要 10-30 分钟）

#### 步骤 3：查看构建结果

构建完成后，安装包位于：
```
desk\dist\AiDesign-Setup-版本号.exe
```

#### 步骤 4：安装应用

1. 双击 `AiDesign-Setup-版本号.exe`
2. 按照安装向导完成安装
3. 启动应用

### 方法二：快速构建步骤

#### 步骤 1：检查依赖

确保之前已经运行过完整构建：
- 检查 `frontend/node_modules` 目录是否存在
- 检查 `desk/node_modules` 目录是否存在

#### 步骤 2：运行快速构建

1. 找到 `build-quick.bat`
2. 右键 → 选择"以管理员身份运行"
3. 等待构建完成（通常 5-10 分钟）

### 方法三：手动构建步骤

#### 步骤 1：安装前端依赖

```powershell
cd frontend
npm install
```

等待依赖安装完成（首次可能需要 5-10 分钟）。

#### 步骤 2：构建前端

```powershell
npm run build
```

构建成功后，会生成 `dist` 目录。

#### 步骤 3：安装 Electron 依赖

```powershell
cd ../desk
npm install
```

这可能需要较长时间（10-20 分钟），因为需要下载 Electron。

#### 步骤 4：构建 Windows 安装包

```powershell
npm run build:win
```

或

```powershell
npx electron-builder --win
```

构建完成后，安装包位于 `desk/dist` 目录。

---

## 故障排查

### 问题 1：Node.js 未安装

**错误信息**：
```
[错误] 未找到Node.js，请先安装Node.js
```

**解决方案**：
1. 访问 https://nodejs.org/
2. 下载并安装 LTS 版本
3. 重新打开命令行窗口
4. 运行 `node -v` 验证安装

### 问题 2：npm install 失败

**错误信息**：
```
npm ERR! code E404
npm ERR! 404 Not Found
```

**解决方案**：

1. 清除 npm 缓存：
```powershell
npm cache clean --force
```

2. 使用国内镜像：
```powershell
npm config set registry https://registry.npmmirror.com
```

3. 删除 `node_modules` 和 `package-lock.json`，重新安装：
```powershell
rm -r node_modules
rm package-lock.json
npm install
```

### 问题 3：Electron 下载失败

**错误信息**：
```
Error: Electron failed to install correctly
```

**解决方案**：

1. 设置 Electron 镜像（在 PowerShell 中）：
```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
```

2. 删除 `desk/node_modules/electron`，重新安装：
```powershell
rm -r node_modules/electron
npm install electron
```

3. 或手动下载 Electron：
   - 访问 https://github.com/electron/electron/releases
   - 下载对应版本的 electron.exe
   - 放置到正确目录

### 问题 4：构建时内存不足

**错误信息**：
```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed
```

**解决方案**：

增加 Node.js 内存限制：

```powershell
# Windows PowerShell
$env:NODE_OPTIONS="--max-old-space-size=4096"
```

或在 `package.json` 的构建脚本中添加：
```json
"scripts": {
  "build": "node --max-old-space-size=4096 node_modules/vite/bin/vite.js build"
}
```

### 问题 5：打包时签名错误

**错误信息**：
```
Error: Cannot find module 'win32-code-sign'
```

**解决方案**：

这是一个警告，不影响使用。如需签名，需：

1. 申请代码签名证书
2. 配置 `electron-builder.json`
3. 设置环境变量：
```powershell
$env:CSC_LINK="证书路径"
$env:CSC_KEY_PASSWORD="证书密码"
```

### 问题 6：杀毒软件拦截

**现象**：
- 构建过程中文件被删除
- 安装包被隔离

**解决方案**：

1. 临时关闭杀毒软件
2. 或将构建目录添加到白名单
3. 构建完成后恢复杀毒软件

### 问题 7：网络连接问题

**现象**：
- 依赖下载缓慢
- 下载中断

**解决方案**：

1. 使用稳定的网络连接
2. 配置国内镜像（见"环境准备"）
3. 使用代理（如果需要）：
```powershell
npm config set proxy http://proxy-server:port
npm config set https-proxy http://proxy-server:port
```

---

## 常见问题

### Q1: 构建需要多长时间？

**A**:
- 首次完整构建：15-30 分钟
- 快速构建（已安装依赖）：5-10 分钟
- 取决于网络速度和电脑性能

### Q2: 构建失败后怎么办？

**A**:
1. 查看错误信息
2. 参考本文档"故障排查"部分
3. 查看构建日志（如果有的话）
4. 尝试重新构建

### Q3: 可以在 Mac 或 Linux 上构建 Windows 版本吗？

**A**:
- 不能直接构建 Windows 版本
- 需要在 Windows 系统上构建
- 或使用 CI/CD 服务（如 GitHub Actions）

### Q4: 构建产物包含哪些文件？

**A**:
- `AiDesign-Setup-版本号.exe` - 主安装包
- `AiDesign-版本号-win.zip` - 压缩包（可选）
- `builder-effective-config.yaml` - 构建配置

### Q5: 如何自定义应用图标？

**A**:
1. 准备 256x256 的 PNG 或 ICO 图标
2. 放置到 `desk/build-resources/icon.png`
3. 在 `electron-builder.json` 中配置：
```json
{
  "win": {
    "icon": "build-resources/icon.png"
  }
}
```

### Q6: 如何修改应用名称和版本号？

**A**:
修改 `desk/package.json`：
```json
{
  "name": "AiDesign",
  "version": "1.0.0",
  "productName": "AI智能体平台"
}
```

### Q7: 如何进行代码调试？

**A**:
1. 开发模式运行：`npm run dev`
2. 打开浏览器开发者工具（F12）
3. 查看控制台输出和网络请求
4. 使用 VS Code 调试工具

---

## 高级配置

### 1. 自定义环境变量

在 `desk/.env` 文件中配置：

```bash
# API配置
API_URL=https://api.aidesign.ltd
API_PORT=3001

# WebSocket配置
WS_URL=wss://aidesign.ltd
WS_PORT=3001

# AI服务配置
ZHIPU_API_KEY=your_zhipu_key
DOUBAO_API_KEY=your_doubao_key

# 其他配置
NODE_ENV=production
LOG_LEVEL=info
```

### 2. 修改构建配置

编辑 `desk/electron-builder.json`：

```json
{
  "appId": "com.aidesign.desktop",
  "productName": "AiDesign",
  "directories": {
    "output": "dist",
    "buildResources": "build-resources"
  },
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ],
    "icon": "build-resources/icon.png"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
```

### 3. 添加自定义安装脚本

在 `desk/installer.nsh` 中创建 NSIS 脚本：

```nsh
; 自定义安装页面

; 显示欢迎页面
!insertmacro MUI_PAGE_WELCOME

; 显示许可协议
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"

; 自定义安装完成页面
!insertmacro MUI_PAGE_FINISH
```

### 4. 配置自动更新

在 `desk/src/main.ts` 中添加：

```typescript
import { autoUpdater } from 'electron-updater';

// 检查更新
autoUpdater.checkForUpdatesAndNotify();

// 监听更新事件
autoUpdater.on('update-available', () => {
  console.log('发现新版本');
});

autoUpdater.on('update-downloaded', () => {
  console.log('更新下载完成');
  autoUpdater.quitAndInstall();
});
```

---

## 技术支持

### 获取帮助

1. 查看本文档
2. 查看构建日志
3. 查看项目文档：`README.md`
4. 联系技术支持团队

### 反馈问题

如遇到未在本文档中列出的问题，请记录：
- 错误信息
- 操作步骤
- 系统环境（Windows 版本、Node.js 版本等）
- 构建日志

---

## 附录

### A. 命令速查

```powershell
# 安装依赖
npm install

# 构建前端
npm run build

# 启动开发服务器
npm run dev

# 构建 Windows 安装包
npm run build:win

# 清除缓存
npm cache clean --force
```

### B. 目录结构

```
ai-platform-windows-build-kit-final/
├── desk/                    # 桌面应用
│   ├── src/                # 源代码
│   ├── package.json        # 依赖配置
│   ├── electron-builder.json # 构建配置
│   └── build-resources/   # 构建资源
│       └── icon.png       # 应用图标
├── frontend/               # Web前端
│   ├── src/               # 源代码
│   ├── package.json       # 依赖配置
│   └── vite.config.js    # Vite配置
├── build-windows.bat       # 完整构建脚本
├── build-quick.bat        # 快速构建脚本
└── README.md             # 使用说明
```

### C. 相关链接

- Node.js: https://nodejs.org/
- Electron: https://www.electronjs.org/
- Electron Builder: https://www.electron.build/
- Vite: https://vitejs.dev/
- React: https://react.dev/

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-02
**适用版本**: AiDesign v1.0.0+
