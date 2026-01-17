@echo off
REM ========================================
REM AI智能体平台 - Windows安装程序构建脚本
REM ========================================
REM
REM 使用说明:
REM 1. 确保已安装 Node.js 18+ 和 Git
REM 2. 双击运行此脚本
REM 3. 等待构建完成（约5-10分钟）
REM 4. 安装包将输出到 dist-electron 目录
REM
REM ========================================

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   AI智能体平台 Windows安装程序构建工具
echo ========================================
echo.

REM 检查Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查npm
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 npm
    pause
    exit /b 1
)

REM 显示版本信息
echo [信息] Node.js 版本:
node --version
echo.
echo [信息] npm 版本:
npm --version
echo.

REM 进入项目根目录
cd /d "%~dp0..\..\.."
echo [信息] 工作目录: %CD%
echo.

REM 清理旧的构建
echo [步骤 1/5] 清理旧的构建...
if exist "desk\dist" rmdir /s /q "desk\dist"
if exist "desk\dist-electron" rmdir /s /q "desk\dist-electron"
if exist "frontend\dist" rmdir /s /q "frontend\dist"
echo [完成] 清理完成
echo.

REM 安装前端依赖
echo [步骤 2/5] 安装前端依赖...
cd frontend
call npm install
if %ERRORLEVEL% neq 0 (
    echo [错误] 前端依赖安装失败
    pause
    exit /b 1
)
echo [完成] 前端依赖安装完成
echo.

REM 构建前端
echo [步骤 3/5] 构建前端...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [错误] 前端构建失败
    pause
    exit /b 1
)
echo [完成] 前端构建完成
echo.

REM 安装桌面端依赖
echo [步骤 4/5] 安装桌面端依赖...
cd ..\desk
call npm install
if %ERRORLEVEL% neq 0 (
    echo [错误] 桌面端依赖安装失败
    pause
    exit /b 1
)
echo [完成] 桌面端依赖安装完成
echo.

REM 构建桌面端主进程
echo [步骤 5/5] 构建桌面端主进程...
call npm run build:main
if %ERRORLEVEL% neq 0 (
    echo [错误] 桌面端主进程构建失败
    pause
    exit /b 1
)
echo [完成] 桌面端主进程构建完成
echo.

REM 构建Windows安装程序
echo [步骤 6/6] 构建Windows安装程序...
echo [信息] 这可能需要几分钟时间，请耐心等待...
call npm run build:nsis
if %ERRORLEVEL% neq 0 (
    echo [错误] Windows安装程序构建失败
    pause
    exit /b 1
)
echo [完成] Windows安装程序构建完成
echo.

REM 生成校验和
echo [信息] 生成文件校验和...
cd dist-electron
for %%f in (*.exe) do (
    certutil -hashfile "%%f" MD5 > "%%f.md5"
    certutil -hashfile "%%f" SHA256 > "%%f.sha256"
    echo.
    echo 文件: %%f
    echo 大小: %%~zf 字节
)

echo.
echo ========================================
echo   构建完成！
echo ========================================
echo.
echo 安装包位置:
dir /B *.exe 2>nul
echo.
echo 安装包完整路径:
cd dist-electron && for %%i in (*.exe) do echo %CD%\%%i && cd ..
echo.
echo ========================================
echo.

REM 询问是否打开输出目录
set /p OPEN_DIR="是否打开输出目录？(Y/N): "
if /i "%OPEN_DIR%"=="Y" (
    explorer dist-electron
)

echo.
echo 按任意键退出...
pause >nul
