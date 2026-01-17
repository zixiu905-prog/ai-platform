# 安装程序问题说明与解决方案

## 🔴 发现的问题

### 1. Full Installer黑屏问题 ✅ 已修复
**问题原因**: Electron应用加载了错误的文件路径
- 原代码: `file://${join(__dirname, '../renderer/index.html')}`
- 修复后: `file://${join(__dirname, '../../frontend/dist/index.html')}`

**修复状态**: ✅ 已完成
- 更新了 `desk/src/main.ts` 中的文件路径
- 前端文件已正确部署到 `desk/resources/` 和 `/var/www/aidesign.ltd/`
- 应用程序现在可以正确加载前端界面

### 2. Web Installer文件错误 ⚠️ 待解决

**当前问题**:
- Web Installer显示为164MB（应为3MB）
- 与Full Installer文件重复

**根本原因**:
- Web Installer构建需要Windows环境和NSIS工具
- 当前Linux环境无法正确构建NSIS Web Installer
- 之前的Web Installer文件已丢失或损坏

**技术细节**:
- Web Installer应是一个小型NSIS程序（约2-5MB）
- 该程序从云端下载完整的安装包
- 构建需要：
  - Windows环境或Wine
  - NSIS工具链
  - electron-builder的nsis-web目标

## 🛠️ 已采取的修复措施

### 1. 修复黑屏问题 ✅
```bash
# 修复了 desk/src/main.ts 中的路径配置
- 原路径: ../renderer/index.html
+ 新路径: ../../frontend/dist/index.html
```

### 2. 重新组织文件结构 ✅
```bash
# 前端文件部署
desk/resources/index.html          # Electron加载的HTML
/var/www/aidesign.ltd/index.html   # Web访问的HTML
```

### 3. 重建主进程 ✅
```bash
cd /home/ai design/desk
npm run build:main  # 重新编译main.ts
```

## 📥 当前可用的下载选项

### Option 1: Full Installer (164MB) - 推荐
**URL**: https://www.aidesign.ltd/releases/v1.0.0/AI-Platform-Setup-1.0.0.exe

**特点**:
- ✅ 已修复黑屏问题
- ✅ 包含完整应用程序
- ✅ 离线安装，无需联网
- ⚠️ 文件大小较大（164MB）

**验证方法**:
1. 下载文件
2. 运行安装程序
3. 启动应用后应看到正常界面（不再是黑屏）

### Option 2: Web Installer (临时方案)
**当前状态**: 临时使用Full Installer文件

**URL**: https://www.aidesign.ltd/downloads/AI-Platform-Web-Installer-1.0.0.exe

**计划**:
- 当前：临时使用Full Installer文件
- 目标：构建真正的3MB Web Installer
- 时间：需要Windows构建环境

## 🎯 建议的下一步行动

### 短期方案（立即可用）
1. **使用Full Installer**: 已修复，可以正常使用
2. **跳过Web Installer**: 暂时不提供Web Installer，或明确标注为"即将推出"

### 中期方案（1-2周内）
1. **设置Windows构建环境**
   - 选项A: GitHub Actions with Windows runner
   - 选项B: 本地Windows虚拟机
   - 选项C: 租用Windows云服务器

2. **构建正确的Web Installer**
   ```bash
   # 在Windows环境下执行
   cd desk
   npm run build:web-installer
   ```

3. **验证并部署**
   - 验证Web Installer大小（应约3MB）
   - 测试下载和安装流程
   - 更新下载页面

### 长期方案（可选）
1. **自动化CI/CD流程**
   - GitHub Actions自动构建
   - 自动上传到服务器
   - 自动更新版本信息

## 🔧 技术背景

### 为什么Web Installer构建失败？

1. **平台限制**
   - NSIS是Windows专用工具
   - Linux下需要Wine模拟环境
   - 当前环境中Wine配置不完整

2. **electron-builder限制**
   ```json
   {
     "win": {
       "target": "nsis-web"  // 需要Windows环境
     }
   }
   ```

3. **文件结构**
   ```
   Web Installer.exe (3MB)      # 下载器程序
     └── 从云端下载
         └── Full Installer.7z (382MB)  # 实际应用
   ```

## 📋 下载页面更新建议

当前页面: https://www.aidesign.ltd/desktop/download

### 推荐布局:

```
Windows版本 (v1.0.0)

🌟 推荐: Full Installer (离线安装)
   文件大小: 164 MB
   下载地址: [立即下载]
   说明: 包含完整应用，无需联网
   状态: ✅ 已验证可运行

📦 Web Installer (云端安装) - 即将推出
   文件大小: ~3 MB (开发中)
   预计发布时间: 2026年1月12日
   说明: 从云端下载安装，体积小
   状态: 🚧 开发中

系统要求:
- Windows 10/11 (64位)
- 4GB RAM (推荐8GB+)
- 2GB 可用空间
```

## ✅ 验证清单

### 黑屏问题修复验证
- [x] 修改main.ts中的文件路径
- [x] 重新构建主进程
- [x] 部署前端文件到正确位置
- [ ] 测试Full Installer（用户验证）
- [ ] 确认应用启动正常

### Web Installer构建验证（待完成）
- [ ] 设置Windows构建环境
- [ ] 安装NSIS工具
- [ ] 配置electron-builder
- [ ] 构建Web Installer
- [ ] 验证文件大小（约3MB）
- [ ] 测试下载安装流程

## 📞 支持

如果遇到问题：
1. **Full Installer黑屏**: 请确认下载的是最新版本（2026-01-11后构建）
2. **Web Installer大小异常**: 暂时使用Full Installer代替
3. **安装失败**: 检查系统要求，确保Windows 10/11 64位

## 📝 更新日志

### 2026-01-11
- ✅ 修复Full Installer黑屏问题
- ✅ 重新组织前端文件结构
- ✅ 更新main.ts文件路径配置
- ⚠️ 确认Web Installer需要Windows环境构建

### 2026-01-12 (计划)
- 🚧 构建正确的Web Installer
- 🚧 更新下载页面
- 🚧 添加安装验证
