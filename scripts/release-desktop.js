#!/usr/bin/env node

/**
 * 桌面应用发布脚本
 * 用于自动化发布流程，包括版本管理、构建和发布
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const config = {
  appName: 'AI智能体平台',
  packageName: 'ai-platform-desktop',
  githubRepo: 'your-username/ai-platform',
  platforms: ['win', 'mac', 'linux'],
  buildOutput: 'dist-electron'
};

class ReleaseManager {
  constructor() {
    this.version = this.getCurrentVersion();
    this.nextVersion = null;
  }

  getCurrentVersion() {
    const packageJsonPath = path.join(process.cwd(), 'desk/package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  }

  async createReleaseNotes(version) {
    const releaseNotes = `
# ${config.appName} v${version}

## 🎉 新功能
- 自动更新机制优化
- 多平台分发支持  
- 性能提升和稳定性改进

## 🔧 技术改进
- 升级Electron到最新版本
- 优化应用启动速度
- 增强安全性配置

## 🐛 问题修复
- 修复文件保存对话框问题
- 解决某些系统上的崩溃问题
- 改进内存使用效率

## 📦 支持平台
- Windows 10/11 (64位)
- macOS 10.15+ (Intel/Apple Silicon)
- Linux (Ubuntu 18.04+, CentOS 7+)

## 🔐 安全性
- 所有安装包均经过数字签名验证
- 自动更新采用HTTPS加密传输

---

**下载地址:** https://github.com/${config.githubRepo}/releases/v${version}
**问题反馈:** https://github.com/${config.githubRepo}/issues
`;

    return releaseNotes;
  }

  async bumpVersion(type = 'patch') {
    console.log(`🔄 正在更新版本号...`);
    
    // 更新package.json版本
    const packageJsonPath = path.join(process.cwd(), 'desk/package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const [major, minor, patch] = packageJson.version.split('.').map(Number);
    
    switch (type) {
      case 'major':
        this.nextVersion = `${major + 1}.0.0`;
        break;
      case 'minor':
        this.nextVersion = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
      default:
        this.nextVersion = `${major}.${minor}.${patch + 1}`;
        break;
    }
    
    packageJson.version = this.nextVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    console.log(`✅ 版本号已更新: ${packageJson.version} → ${this.nextVersion}`);
    return this.nextVersion;
  }

  async createGitTag(version) {
    console.log(`🏷️  创建Git标签 v${version}...`);
    
    try {
      execSync('git add desk/package.json', { stdio: 'inherit' });
      execSync(`git commit -m "chore: bump version to v${version}"`, { stdio: 'inherit' });
      execSync(`git tag v${version}`, { stdio: 'inherit' });
      
      console.log(`✅ Git标签创建成功: v${version}`);
    } catch (error) {
      console.error('❌ 创建Git标签失败:', error.message);
      throw error;
    }
  }

  async buildApplication() {
    console.log(`🔨 开始构建应用...`);
    
    const deskDir = path.join(process.cwd(), 'desk');
    
    try {
      // 构建前端
      console.log('构建前端...');
      process.chdir(path.join(process.cwd(), 'frontend'));
      execSync('npm run build', { stdio: 'inherit' });
      
      // 构建桌面应用
      console.log('构建桌面应用...');
      process.chdir(deskDir);
      execSync('npm run build:all', { stdio: 'inherit' });
      
      console.log('✅ 应用构建完成');
    } catch (error) {
      console.error('❌ 构建失败:', error.message);
      throw error;
    }
  }

  async createGitHubRelease(version) {
    console.log(`🚀 创建GitHub Release...`);
    
    const releaseNotes = await this.createReleaseNotes(version);
    
    try {
      const releaseCmd = `
        gh release create v${version} \\
        --title "${config.appName} v${version}" \\
        --notes "${releaseNotes}" \\
        --draft false \\
        --prerelease false \\
        dist-electron/*
      `;
      
      execSync(releaseCmd, { stdio: 'inherit', cwd: path.join(process.cwd(), 'desk') });
      
      console.log(`✅ GitHub Release创建成功: v${version}`);
    } catch (error) {
      console.error('❌ 创建GitHub Release失败:', error.message);
      throw error;
    }
  }

  async pushToGitHub() {
    console.log(`📤 推送到GitHub...`);
    
    try {
      execSync('git push origin main', { stdio: 'inherit' });
      execSync('git push origin --tags', { stdio: 'inherit' });
      
      console.log('✅ 推送成功');
    } catch (error) {
      console.error('❌ 推送失败:', error.message);
      throw error;
    }
  }

  async publishToNPM() {
    console.log(`📦 发布到NPM...`);
    
    try {
      process.chdir(path.join(process.cwd(), 'desk'));
      execSync('npm publish --access public', { stdio: 'inherit' });
      
      console.log('✅ NPM发布成功');
    } catch (error) {
      console.error('❌ NPM发布失败:', error.message);
      // NPM发布失败不应该阻止整个发布流程
      console.log('⚠️  继续发布流程...');
    }
  }

  async release(type = 'patch') {
    console.log(`🎯 开始发布流程 (${type}版本)...`);
    
    try {
      // 1. 更新版本号
      const newVersion = await this.bumpVersion(type);
      
      // 2. 创建Git标签
      await this.createGitTag(newVersion);
      
      // 3. 构建应用
      await this.buildApplication();
      
      // 4. 推送到GitHub
      await this.pushToGitHub();
      
      // 5. 创建GitHub Release
      await this.createGitHubRelease(newVersion);
      
      // 6. 可选：发布到NPM
      await this.publishToNPM();
      
      console.log(`🎉 发布完成! 版本: v${newVersion}`);
      console.log(`🔗 下载地址: https://github.com/${config.githubRepo}/releases/v${newVersion}`);
      
    } catch (error) {
      console.error('❌ 发布失败:', error.message);
      process.exit(1);
    }
  }

  async rollback() {
    console.log(`🔄 回滚到上一个版本...`);
    
    try {
      // 删除最新的Git标签
      const latestTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
      execSync(`git tag -d ${latestTag}`, { stdio: 'inherit' });
      
      // 重置package.json版本
      const packageJsonPath = path.join(process.cwd(), 'desk/package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const [major, minor, patch] = packageJson.version.split('.').map(Number);
      
      if (patch > 0) {
        packageJson.version = `${major}.${minor}.${patch - 1}`;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        
        execSync('git add desk/package.json', { stdio: 'inherit' });
        execSync(`git commit -m "chore: rollback version to v${packageJson.version}"`, { stdio: 'inherit' });
      }
      
      console.log(`✅ 回滚完成`);
      
    } catch (error) {
      console.error('❌ 回滚失败:', error.message);
      process.exit(1);
    }
  }
}

// 命令行接口
async function main() {
  const command = process.argv[2];
  const type = process.argv[3] || 'patch';
  
  const manager = new ReleaseManager();
  
  switch (command) {
    case 'release':
      await manager.release(type);
      break;
    case 'rollback':
      await manager.rollback();
      break;
    case 'version':
      console.log(`当前版本: v${manager.getCurrentVersion()}`);
      break;
    default:
      console.log(`
用法: node scripts/release-desktop.js <command> [type]

命令:
  release [patch|minor|major]  发布新版本 (默认: patch)
  rollback                     回滚到上一个版本
  version                      显示当前版本

示例:
  node scripts/release-desktop.js release patch
  node scripts/release-desktop.js release minor
  node scripts/release-desktop.js rollback
      `);
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ReleaseManager;