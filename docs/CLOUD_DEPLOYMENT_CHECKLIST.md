# Web Installer 云端部署检查清单

## 准备阶段

### 1. 服务器准备
- [ ] 准备云服务器（推荐配置：2核4GB，带宽 10Mbps）
- [ ] 安装 Linux 系统（Ubuntu 20.04 或 CentOS 8）
- [ ] 配置 SSH 访问
- [ ] 设置防火墙规则
- [ ] 配置域名解析

### 2. 存储准备
- [ ] 创建存储目录：`/var/www/releases/ai-platform`
- [ ] 设置目录权限：`chown -R www-data:www-data /var/www/releases`
- [ ] 创建子目录结构：
  ```
  /var/www/releases/ai-platform/
  ├── latest/
  ├── v1.0.0/
  └── update/
  ```

### 3. 域名配置
- [ ] 购买域名（如：download.your-domain.com）
- [ ] 配置 DNS A 记录指向服务器 IP
- [ ] 配置 DNS CNAME 记录（可选，用于 CDN）

### 4. SSL 证书
- [ ] 申请 SSL 证书（推荐 Let's Encrypt）
- [ ] 安装 SSL 证书
- [ ] 配置自动续期

## 服务器配置

### Nginx 配置
- [ ] 安装 Nginx：`apt install nginx` 或 `yum install nginx`
- [ ] 创建配置文件：`/etc/nginx/sites-available/ai-platform-download`
- [ ] 配置 SSL
- [ ] 配置缓存策略
- [ ] 配置限速
- [ ] 启用配置：`ln -s /etc/nginx/sites-available/ai-platform-download /etc/nginx/sites-enabled/`
- [ ] 重启 Nginx：`systemctl restart nginx`

### CDN 配置（可选但推荐）
- [ ] 注册 CDN 服务（阿里云 / 腾讯云 / AWS CloudFront）
- [ ] 创建 CDN 加速域名
- [ ] 配置源站地址
- [ ] 配置缓存规则
- [ ] 配置 HTTPS
- [ ] 测试 CDN 加速效果

## 文件准备

### 1. 完整安装包
- [ ] 构建完整安装包：`npm run build:all`
- [ ] 计算文件 MD5/SHA256
- [ ] 测试安装包功能
- [ ] 上传到服务器：`/var/www/releases/ai-platform/v{VERSION}/`

### 2. Web Installer
- [ ] 构建Web Installer：`npm run build:web-full`
- [ ] 计算文件大小
- [ ] 测试下载和安装流程
- [ ] 上传到服务器：`/var/www/releases/ai-platform/latest/`

### 3. 压缩包（7z）
- [ ] 将完整应用打包为 7z 格式
- [ ] 使用最高压缩级别
- [ ] 计算文件大小
- [ ] 上传到服务器：`/var/www/releases/ai-platform/update/`

### 4. 版本信息文件
- [ ] 创建 `latest.json` 文件
- [ ] 包含版本号、文件名、大小、下载链接
- [ ] 测试 JSON 格式有效性
- [ ] 上传到服务器：`/var/www/releases/ai-platform/`

## 构建配置

### 1. 修改下载 URL
- [ ] 编辑 `build-resources/web-installer.nsh`
- [ ] 修改 `$DownloadURL` 变量
- [ ] 确认 URL 格式正确
- [ ] 测试 URL 可访问性

### 2. 修改 electron-builder 配置
- [ ] 编辑 `electron-builder-web.json`
- [ ] 配置 `publish` 字段
- [ ] 确认输出目录
- [ ] 设置应用 ID

### 3. 测试构建
- [ ] 清理旧的构建文件：`rm -rf dist dist-web`
- [ ] 执行构建命令：`npm run build:web-full`
- [ ] 验证输出文件存在
- [ ] 检查文件大小合理性

## 部署验证

### 1. 本地测试
- [ ] 在虚拟机中测试安装
- [ ] 测试下载进度显示
- [ ] 测试断网重连场景
- [ ] 测试安装路径选择
- [ ] 测试卸载功能

### 2. 网络测试
- [ ] 测试下载速度
- [ ] 测试不同网络环境（WiFi、4G、有线）
- [ ] 测试下载中断恢复
- [ ] 测试并发下载

### 3. URL 测试
- [ ] 测试 Web Installer URL：`curl -I {WEB_INSTALLER_URL}`
- [ ] 测试版本 API：`curl {VERSION_API_URL}`
- [ ] 测试文件可访问性
- [ ] 测试 HTTPS 重定向

## 文档更新

### 1. 版本说明
- [ ] 编写版本更新日志
- [ ] 列出新功能
- [ ] 列出修复的问题
- [ ] 说明已知限制

### 2. 安装指南
- [ ] 更新安装步骤
- [ ] 添加系统要求
- [ ] 更新常见问题
- [ ] 更新故障排除指南

### 3. API 文档
- [ ] 更新版本 API 文档
- [ ] 添加字段说明
- [ ] 提供示例响应
- [ ] 说明错误码

## 监控配置

### 1. 下载统计
- [ ] 配置访问日志
- [ ] 配置下载计数
- [ ] 配置错误日志
- [ ] 设置日志轮转

### 2. 性能监控
- [ ] 监控服务器负载
- [ ] 监控带宽使用
- [ ] 监控磁盘空间
- [ ] 设置告警阈值

### 3. 健康检查
- [ ] 配置健康检查端点
- [ ] 设置自动检测
- [ ] 配置告警通知
- [ ] 准备故障恢复方案

## 安全加固

### 1. 服务器安全
- [ ] 更新系统补丁
- [ ] 配置防火墙（ufw / iptables）
- [ ] 禁用 root 登录
- [ ] 配置 SSH 密钥认证
- [ ] 安装 fail2ban

### 2. 下载安全
- [ ] 强制 HTTPS
- [ ] 配置 CORS 策略
- [ ] 启用文件完整性校验
- [ ] 设置下载限速
- [ ] 配置 Referer 检查

### 3. 文件安全
- [ ] 对安装包进行数字签名
- [ ] 生成 SHA256 哈希
- [ ] 发布哈希值供验证
- [ ] 定期检查文件完整性

## 备份策略

### 1. 文件备份
- [ ] 备份所有安装包
- [ ] 备份版本信息文件
- [ ] 备份配置文件
- [ ] 存储到多个位置

### 2. 数据库备份（如有）
- [ ] 配置自动备份
- [ ] 测试备份恢复
- [ ] 保留多个备份版本
- [ ] 异地备份

### 3. 配置备份
- [ ] 备份 Nginx 配置
- [ ] 备份 SSL 证书
- [ ] 备份 DNS 配置
- [ ] 文档化备份流程

## 发布流程

### 1. 发布前检查
- [ ] 所有测试通过
- [ ] 代码审查完成
- [ ] 文档更新完成
- [ ] 备份当前版本
- [ ] 准备回滚方案

### 2. 发布执行
- [ ] 上传新版本文件
- [ ] 更新 latest.json
- [ ] 清除 CDN 缓存
- [ ] 验证新版本可访问
- [ ] 监控下载情况

### 3. 发布后
- [ ] 监控错误日志
- [ ] 收集用户反馈
- [ ] 记录发布日志
- [ ] 更新发布记录

## 回滚准备

### 1. 回滚脚本
- [ ] 编写一键回滚脚本
- [ ] 测试回滚流程
- [ ] 记录回滚步骤
- [ ] 准备回滚通知模板

### 2. 版本保留
- [ ] 保留至少 3 个历史版本
- [ ] 记录版本差异
- [ ] 准备降级指南
- [ ] 维护版本兼容性说明

## 通知与沟通

### 1. 用户通知
- [ ] 准备发布公告
- [ ] 更新网站下载页面
- [ ] 发送版本更新通知
- [ ] 准备 FAQ

### 2. 团队通知
- [ ] 通知开发团队
- [ ] 通知测试团队
- [ ] 通知运维团队
- [ ] 通知客服团队

## 持续优化

### 1. 性能优化
- [ ] 监控下载速度
- [ ] 优化 CDN 配置
- [ ] 压缩文件大小
- [ ] 减少请求次数

### 2. 用户体验优化
- [ ] 优化安装界面
- [ ] 提高下载成功率
- [ ] 减少安装时间
- [ ] 改进错误提示

### 3. 流程优化
- [ ] 自动化构建
- [ ] 自动化测试
- [ ] 自动化部署
- [ ] 自动化监控

## 应急响应

### 1. 事故响应
- [ ] 准备应急联系人
- [ ] 准备故障排查流程
- [ ] 准备快速修复方案
- [ ] 准备用户安抚方案

### 2. 数据恢复
- [ ] 准备数据恢复流程
- [ ] 测试恢复流程
- [ ] 记录恢复时间
- [ ] 分析事故原因

---

## 快速开始

如果需要快速部署，可以按以下顺序执行：

```bash
# 1. 构建安装包
cd /home/ai\ design/desk
npm run build:web-full

# 2. 查看构建结果
ls -lh dist-web/

# 3. 手动上传（替换为实际服务器信息）
scp dist-web/*.exe user@server:/var/www/releases/ai-platform/latest/

# 4. 测试下载
curl -I https://download.your-domain.com/releases/latest/AI智能体平台-Setup-Web-{VERSION}.exe
```

## 注意事项

1. **首次部署**：建议先在测试环境完整测试
2. **版本管理**：遵循语义化版本规范
3. **安全第一**：所有传输必须使用 HTTPS
4. **监控重要**：建立完善的监控和告警机制
5. **文档同步**：及时更新所有相关文档

## 联系方式

如遇到问题，请联系：
- 技术支持：support@your-domain.com
- 运维团队：ops@your-domain.com
