# 在Windows上构建桌面应用

## 环境要求
- Windows 10 或更高版本
- Node.js 18+ 
- Git
- PowerShell

## 构建步骤

### 1. 克隆项目
```powershell
git clone <repository-url>
cd aidesign
```

### 2. 安装依赖
```powershell
# 安装前端依赖
cd frontend
npm install

# 安装桌面端依赖
cd ../desk
npm install
```

### 3. 构建应用
```powershell
cd desk

# 构建前端
npm run build:renderer

# 构建Electron主进程
npm run build:main

# 构建Windows安装程序
npm run build:nsis

# 构建便携版（可选）
npm run build:portable
```

### 4. 输出文件
构建完成后，安装程序位于：
- `dist/AI智能体平台 Setup 1.0.0.exe` - NSIS安装程序
- `dist/AI智能体平台 1.0.0.exe` - 便携版

### 5. 上传到服务器
```powershell
# 使用scp上传到服务器
scp dist/*.exe user@server:/path/to/downloads/desktop/
```

## 代码签名（可选）
如果需要代码签名，设置以下环境变量：
```powershell
$env:CSC_LINK="path/to/certificate.p12"
$env:CSC_KEY_PASSWORD="your-password"
```

## 常见问题

### 1. 安装程序过大
- 检查`node_modules`大小
- 使用`npm ci --production`安装生产依赖

### 2. NSIS错误
- 确保安装了NSIS工具
- 检查`electron-builder.json`配置

### 3. 打包失败
- 清理`dist`和`node_modules/.cache`目录
- 重新构建：`npm run build`
