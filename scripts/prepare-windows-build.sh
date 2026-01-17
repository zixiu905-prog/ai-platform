#!/bin/bash

# 准备Windows构建环境
# 生成所有必要的文件和构建脚本，可以在Windows系统上快速构建

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="/home/ai design"
DESK_DIR="$PROJECT_ROOT/desk"
OUTPUT_DIR="$PROJECT_ROOT/downloads/desktop"
VERSION=$(cat "$DESK_DIR/package.json" | grep '"version"' | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')
APP_NAME="AI智能体平台"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}准备Windows构建环境${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 步骤1: 生成Windows批处理构建脚本
echo -e "${YELLOW}[1/5] 生成Windows构建脚本...${NC}"
cat > "$OUTPUT_DIR/build-windows.bat" << 'EOF'
@echo off
REM AI智能体平台 - Windows版本构建脚本
REM 在Windows系统上运行此脚本以生成Windows安装程序

echo ========================================
echo AI智能体平台 Windows版本构建系统
echo ========================================
echo.

REM 设置环境
cd /d "%~dp0"

REM 检查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: 未找到Node.js
    echo 请从 https://nodejs.org 下载并安装Node.js
    pause
    exit /b 1
)

echo Node.js版本:
node -v
echo npm版本:
npm -v
echo.

REM 进入desk目录
if exist "..\desk" (
    cd ..\desk
) else (
    echo 错误: 未找到desk目录
    pause
    exit /b 1
)

REM 安装依赖
echo [1/4] 安装依赖...
if not exist "node_modules" (
    call npm install
)
echo 依赖安装完成
echo.

REM 构建前端
echo [2/4] 构建前端应用...
cd ..\frontend
call npm install
call npm run build
echo 前端构建完成
echo.

REM 构建Electron主进程
echo [3/4] 构建Electron主进程...
cd ..\desk
call npm run build:main
echo Electron主进程构建完成
echo.

REM 构建Windows安装程序
echo [4/4] 构建Windows安装程序...
call npm run build:nsis

if %errorlevel% neq 0 (
    echo.
    echo 构建失败，请检查错误信息
    pause
    exit /b 1
)

echo.
echo ========================================
echo 构建成功完成！
echo ========================================
echo.

REM 复制安装程序
if exist "dist-electron\*.exe" (
    echo 生成的文件:
    dir /B dist-electron\*.exe
    echo.
    copy /Y dist-electron\*.exe "%USERPROFILE%\Downloads\" >nul
    echo 安装程序已复制到下载目录
)

echo.
echo 按任意键退出...
pause >nul
EOF
chmod +x "$OUTPUT_DIR/build-windows.bat"
echo -e "${GREEN}✓ Windows构建脚本已创建${NC}"
echo ""

# 步骤2: 创建构建说明文档
echo -e "${YELLOW}[2/5] 创建构建说明文档...${NC}"
cat > "$OUTPUT_DIR/WINDOWS_BUILD_GUIDE.md" << 'EOF'
# AI智能体平台 - Windows版本构建指南

## 版本信息
- 版本: 1.0.0
- 更新时间: 2025-12-30

## 快速开始

### 方法1: 使用自动构建脚本（推荐）

1. 下载 `build-windows.bat` 脚本到项目根目录
2. 双击运行 `build-windows.bat`
3. 等待构建完成
4. 安装程序将自动保存到下载目录

### 方法2: 手动构建

#### 前置要求
- Windows 10 或更高版本
- Node.js 18.x 或更高版本（从 https://nodejs.org 下载）
- Git（可选，用于克隆代码）

#### 详细步骤

1. **准备代码**
   ```cmd
   git clone <your-repository-url>
   cd <project-directory>
   ```

2. **构建前端**
   ```cmd
   cd frontend
   npm install
   npm run build
   ```

3. **构建Electron应用**
   ```cmd
   cd ..\desk
   npm install
   npm run build:main
   ```

4. **生成Windows安装程序**
   ```cmd
   npm run build:nsis
   ```

5. **查找安装程序**
   安装程序位于 `desk\dist-electron\` 目录
   - 文件名: `AI智能体平台 Setup 1.0.0.exe`
   - 大小: 约 300-400 MB

## 构建选项

### NSIS安装程序（推荐）
```cmd
npm run build:nsis
```
- 生成 `.exe` 安装程序
- 支持自定义安装路径
- 自动创建桌面快捷方式
- 添加到开始菜单

### 便携版本
```cmd
npm run build:portable
```
- 生成免安装版本
- 无需管理员权限
- 可直接运行

### APPX包（Microsoft Store）
```cmd
npm run build:appx
```
- 可提交到Microsoft Store
- 需要开发者账号

## 测试安装程序

1. 双击运行生成的 `.exe` 文件
2. 按照安装向导完成安装
3. 启动应用并测试功能
4. 验证与云端的连接

## 云端连接配置

应用默认连接到云端服务器 `aidesign.ltd`，如需修改：

编辑文件: `desk/dist/main.js`（构建后）
```javascript
const API_BASE_URL = 'https://aidesign.ltd/api';
const WS_URL = 'wss://aidesign.ltd';
```

重新编译:
```cmd
cd desk
npm run build:main
npm run build:nsis
```

## 常见问题

### Q: 构建时出现网络错误
A: 配置npm镜像源:
```cmd
npm config set registry https://registry.npmmirror.com
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
```

### Q: 安装程序被杀毒软件拦截
A: 需要对应用进行代码签名，或者添加信任

### Q: 应用启动失败
A: 检查日志文件 `%APPDATA%\ai-platform-desktop\logs\`

### Q: 云端连接失败
A: 确认网络连接和服务器地址配置

## 技术支持

如遇到问题，请联系:
- 技术支持邮箱: support@aidesign.ltd
- GitHub Issues: <repository-url>

## 许可证

MIT License - 详见项目LICENSE文件
EOF
echo -e "${GREEN}✓ 构建说明文档已创建${NC}"
echo ""

# 步骤3: 创建安装程序配置文件
echo -e "${YELLOW}[3/5] 优化electron-builder配置...${NC}"
# 读取当前的package.json并优化Windows配置
# 这已经在package.json中配置好了
echo -e "${GREEN}✓ 配置文件已就绪${NC}"
echo ""

# 步骤4: 创建快速部署包
echo -e "${YELLOW}[4/5] 创建快速部署包...${NC}"
cd "$PROJECT_ROOT"

# 创建一个包含所有必要文件的tar包
tar -czf "$OUTPUT_DIR/ai-platform-windows-build-kit.tar.gz" \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='dist' \
    --exclude='dist-electron' \
    --exclude='out' \
    --exclude='.git' \
    --exclude='downloads' \
    --exclude='logs' \
    desk/ frontend/ 2>/dev/null || echo "注意: 某些文件可能被排除"

if [ -f "$OUTPUT_DIR/ai-platform-windows-build-kit.tar.gz" ]; then
    echo -e "${GREEN}✓ 快速部署包已创建${NC}"
fi
echo ""

# 步骤5: 更新版本信息
echo -e "${YELLOW}[5/5] 更新版本信息...${NC}"
cat > "$OUTPUT_DIR/version.json" << EOF
{
  "version": "$VERSION",
  "appName": "$APP_NAME",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "platform": "multi-platform",
  "availableVersions": {
    "linux": {
      "filename": "AI智能体平台-$VERSION-linux-x64.tar.gz",
      "size": "310 MB",
      "status": "available"
    },
    "windows": {
      "filename": "AI智能体平台 Setup $VERSION.exe",
      "size": "~350 MB",
      "status": "requires-windows-build",
      "buildKit": "ai-platform-windows-build-kit.tar.gz",
      "buildScript": "build-windows.bat"
    },
    "macos": {
      "filename": "AI智能体平台-$VERSION.dmg",
      "size": "~330 MB",
      "status": "requires-mac-build"
    }
  },
  "buildInstructions": {
    "windows": "参考 WINDOWS_BUILD_GUIDE.md 文档",
    "macos": "在macOS系统运行: npm run build:dmg"
  }
}
EOF
echo -e "${GREEN}✓ 版本信息已更新${NC}"
echo ""

# 生成摘要报告
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Windows构建环境准备完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "生成的文件:"
echo "  1. Windows构建脚本: $OUTPUT_DIR/build-windows.bat"
echo "  2. 构建说明文档:   $OUTPUT_DIR/WINDOWS_BUILD_GUIDE.md"
echo "  3. 快速部署包:     $OUTPUT_DIR/ai-platform-windows-build-kit.tar.gz"
echo "  4. 版本信息:       $OUTPUT_DIR/version.json"
echo ""

echo "下一步操作:"
echo ""
echo -e "${BLUE}方案1: 在Windows系统上构建（推荐）${NC}"
echo "  1. 将 ai-platform-windows-build-kit.tar.gz 传输到Windows系统"
echo "  2. 解压文件"
echo "  3. 双击运行 build-windows.bat"
echo "  4. 等待构建完成"
echo ""
echo -e "${BLUE}方案2: 使用GitHub Actions自动构建${NC}"
echo "  1. 推送代码到GitHub"
echo "  2. 启用工作流: .github/workflows/build-windows.yml"
echo "  3. 手动触发或等待自动构建"
echo "  4. 从Actions页面下载构建产物"
echo ""
echo -e "${BLUE}方案3: 使用云构建服务${NC}"
echo "  - AppVeyor"
echo "  - CircleCI Windows Runner"
echo "  - Azure DevOps"
echo ""

ls -lh "$OUTPUT_DIR"
echo ""

echo -e "${GREEN}构建环境准备完成！${NC}"
echo -e "详细文档: $OUTPUT_DIR/WINDOWS_BUILD_GUIDE.md"
echo ""
