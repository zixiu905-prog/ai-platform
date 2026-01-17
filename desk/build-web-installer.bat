@echo off
setlocal enabledelayedexpansion

echo ========================================
echo AI智能体平台 - Web Installer 构建脚本
echo ========================================
echo 构建时间: %DATE% %TIME%
echo.

REM 设置变量
set PROJECT_DIR=%CD%
set FRONTEND_DIR=%PROJECT_DIR%\..\frontend
set DESK_DIR=%PROJECT_DIR%
set OUTPUT_DIR=%DESK_DIR%\dist-web

REM 步骤计数
set STEP=0
set TOTAL_STEPS=7

:check_node
set /a STEP+=1
echo [%STEP%/%TOTAL_STEPS%] 检查 Node.js 环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] Node.js 未安装或不在PATH中
    echo [提示] 请从 https://nodejs.org/ 下载并安装 Node.js 20.x 或更高版本
    exit /b 1
)
echo [成功] Node.js 版本: 
node --version
echo.

:check_npm
set /a STEP+=1
echo [%STEP%/%TOTAL_STEPS%] 检查 npm 环境...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] npm 未安装
    exit /b 1
)
echo [成功] npm 版本: 
npm --version
echo.

:check_nsis
set /a STEP+=1
echo [%STEP%/%TOTAL_STEPS%] 检查 NSIS 环境...
makensis /VERSION >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] NSIS 未安装
    echo [提示] 请从 https://nsis.sourceforge.io/Download 下载并安装 NSIS
    echo [提示] 安装时请务必勾选 "Add NSIS to PATH" 选项
    exit /b 1
)
echo [成功] NSIS 版本: 
makensis /VERSION
echo.

:install_dependencies
set /a STEP+=1
echo [%STEP%/%TOTAL_STEPS%] 安装项目依赖...
if not exist "%DESK_DIR%\node_modules" (
    echo 安装 desk 依赖...
    cd "%DESK_DIR%"
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] desk 依赖安装失败
        exit /b 1
    )
) else (
    echo [成功] desk 依赖已安装，跳过
)

if not exist "%FRONTEND_DIR%\node_modules" (
    echo 安装 frontend 依赖...
    cd "%FRONTEND_DIR%"
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] frontend 依赖安装失败
        exit /b 1
    )
) else (
    echo [成功] frontend 依赖已安装，跳过
)
echo.

:build_frontend
set /a STEP+=1
echo [%STEP%/%TOTAL_STEPS%] 构建前端应用...
cd "%FRONTEND_DIR%"
echo 清理旧的构建文件...
if exist "dist" rmdir /s /q dist

echo 开始构建...
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 前端构建失败
    exit /b 1
)
echo [成功] 前端构建成功
echo.

:copy_resources
set /a STEP+=1
echo [%STEP%/%TOTAL_STEPS%] 复制资源文件...
if not exist "%DESK_DIR%\resources" mkdir "%DESK_DIR%\resources"

echo 复制前端构建文件到 resources 目录...
xcopy /E /I /Y "%FRONTEND_DIR%\dist\*" "%DESK_DIR%\resources\" >nul
if %errorlevel% neq 0 (
    echo [错误] 资源复制失败
    exit /b 1
)
echo [成功] 资源复制成功
echo.

:build_main_process
set /a STEP+=1
echo [%STEP%/%TOTAL_STEPS%] 构建Electron主进程...
cd "%DESK_DIR%"
echo 编译 TypeScript...
call npm run build:main
if %errorlevel% neq 0 (
    echo [错误] 主进程构建失败
    exit /b 1
)
echo [成功] 主进程构建成功
echo.

:build_web_installer
set /a STEP+=1
echo [%STEP%/%TOTAL_STEPS%] 构建Web Installer...
echo 清理旧的构建文件...
if exist "%OUTPUT_DIR%" rmdir /s /q "%OUTPUT_DIR%"

echo 运行 electron-builder...
call npm run build:web-installer
if %errorlevel% neq 0 (
    echo [错误] Web Installer 构建失败
    echo 查看日志: %OUTPUT_DIR%\builder-debug.yml
    exit /b 1
)
echo [成功] Web Installer 构建成功
echo.

:verify_output
echo 验证构建输出...
if exist "%OUTPUT_DIR%\AI智能体平台-Setup-Web-1.0.0.exe" (
    echo [成功] Web Installer 已生成
    for %%I in ("%OUTPUT_DIR%\AI智能体平台-Setup-Web-1.0.0.exe") do echo   大小: %%~zI bytes
) else (
    echo [错误] Web Installer 文件未找到
)

if exist "%OUTPUT_DIR%\AI智能体平台-1.0.0-win-x64.nsis.7z" (
    echo [成功] 完整安装包 已生成
    for %%I in ("%OUTPUT_DIR%\AI智能体平台-1.0.0-win-x64.nsis.7z") do echo   大小: %%~zI bytes
) else (
    echo [错误] 完整安装包文件未找到
)

echo.

:show_summary
echo ========================================
echo 构建完成！
echo ========================================
echo.
echo 输出文件位置:
echo   %OUTPUT_DIR%
echo.
echo 主要文件:
for %%I in ("%OUTPUT_DIR%\AI智能体平台-Setup-Web-1.0.0.exe") do (
    if exist "%%I" (
        echo   Web Installer: %%I 
        for %%S in ("%%I") do echo     大小: %%~zS bytes
    )
)
for %%I in ("%OUTPUT_DIR%\AI智能体平台-1.0.0-win-x64.nsis.7z") do (
    if exist "%%I" (
        echo   完整安装包: %%I
        for %%S in ("%%I") do echo     大小: %%~zS bytes
    )
)
echo.
echo 下一步:
echo 1. 测试安装程序是否正常工作
echo 2. 将文件上传到服务器
echo 3. 更新下载页面
echo.

endlocal
exit /b 0
