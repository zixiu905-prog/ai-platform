# 安装验证指南

## 快速验证（3步）

### 第1步：下载并检查文件大小
```bash
# 下载
wget https://www.aidesign.ltd/downloads/AI-Platform-Complete-1.0.0.zip

# 检查文件大小（应为499MB）
ls -lh AI-Platform-Complete-1.0.0.zip

# ✅ 正确输出示例：
# -rw-r--r-- 1 user user 499M Jan 11 12:41 AI-Platform-Complete-1.0.0.zip
```

**如果文件大小不是499MB，请重新下载！**

### 第2步：解压并检查文件
```bash
# 解压
unzip AI-Platform-Complete-1.0.0.zip

# 进入目录
cd AI-Platform-Complete-1.0.0

# 检查关键文件
ls -lh AIPlatform.exe ffmpeg.dll resources/index.html

# ✅ 正确输出示例：
# -rw-r--r-- 1 user user 169M AIPlatform.exe
# -rw-r--r-- 1 user user 2.8M ffmpeg.dll
# -rw-r--r-- 1 user user 820  resources/index.html
```

**如果缺少任何文件，说明解压不完整！**

### 第3步：运行并检查日志
```bash
# Windows (命令行)
AIPlatform.exe > startup.log 2>&1

# 检查日志
type startup.log
```

或者双击运行，查看是否有错误弹窗。

---

## 详细故障排查

### 情况1：仍然黑屏

**检查1：验证index.html路径**
```bash
cat resources/index.html | grep "src="

# ✅ 应该显示：
# <script src="./assets/index-BWIcWl2k.js"></script>
# 而不是：
# <script src="/assets/index-BWIcWl2k.js"></script>
```

**检查2：验证assets文件夹**
```bash
ls resources/assets/ | head -5

# ✅ 应该显示多个.js文件
```

**检查3：检查控制台错误**
1. 运行AIPlatform.exe
2. 按 `F12` 或 `Ctrl+Shift+I` 打开开发者工具
3. 查看Console标签页的错误

**常见错误及解决**：

错误：`Failed to load resource: net::ERR_FILE_NOT_FOUND`
- 原因：路径错误
- 解决：确认resources/index.html中使用的是`./assets/`而不是`/assets/`

错误：`Cannot find module 'react'` 或 `Cannot find module 'react-dom'`
- 原因：app.asar文件损坏
- 解决：重新下载完整包

错误：`ffmpeg.dll not found`
- 原因：DLL文件缺失
- 解决：确认ffmpeg.dll存在于解压目录

### 情况2：窗口闪退

**检查依赖项**
```bash
# 检查所有DLL文件是否存在
ls *.dll

# 应该至少有：
# ffmpeg.dll
# libEGL.dll
# libGLESv2.dll
# d3dcompiler_47.dll
# vk_swiftshader.dll
# vulkan-1.dll
```

**检查系统要求**
- Windows 10 或 Windows 11 (64位)
- 至少 4GB RAM
- 支持DirectX 11或更高版本的显卡

### 情况3：无法下载文件

**检查网络连接**
```bash
# 测试连通性
curl -I https://www.aidesign.ltd/downloads/AI-Platform-Complete-1.0.0.zip

# ✅ 应该返回HTTP/2 200
```

**检查防火墙/代理**
- 如果使用公司网络，可能需要配置代理
- 暂时关闭防火墙测试（不推荐长期使用）

### 情况4：解压失败

**检查磁盘空间**
```bash
# Windows
dir

# 至少需要 2GB 可用空间
```

**使用7-Zip解压**
```bash
# 如果Windows自带解压失败，使用7-Zip:
7z x AI-Platform-Complete-1.0.0.zip
```

---

## 成功运行标志

如果看到以下界面，说明运行成功：

1. **启动窗口**：显示应用Logo和加载动画
2. **登录界面**：显示用户名/密码输入框
3. **主界面**：显示左侧菜单和右侧工作区

## 性能检查

如果运行成功但卡顿：

```bash
# 检查CPU占用
tasklist | findstr AIPlatform

# 正常应该 < 30% CPU

# 检查内存占用
tasklist /fi "imagename eq AIPlatform.exe" /fo table

# 正常应该 < 800MB RAM
```

## 如果仍然无法运行

请提供以下信息以便排查：

1. **操作系统版本**（Windows 10/11，32位/64位）
2. **错误截图**或**错误日志**
3. **解压后文件列表**：
```bash
ls -lh > file_list.txt
```
4. **index.html内容**：
```bash
cat resources/index.html > index_html.txt
```

将这些文件发送给技术支持。

## 替代方案

如果桌面版仍然无法运行，可以使用网页版：

**网址**: https://www.aidesign.ltd/

功能与桌面版相同，只是需要在浏览器中使用。

---

**最后更新**: 2026-01-11
**推荐版本**: AI-Platform-Complete-1.0.0.zip (499MB)
