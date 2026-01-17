#!/usr/bin/env node

/**
 * Linux多平台分发构建脚本
 * 支持Snap、Flatpak、AppImage等多种格式
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const config = {
  appName: 'AI智能体平台',
  appId: 'com.aiplatform.desktop',
  version: '1.0.0',
  architectures: ['x64'],
  formats: ['snap', 'flatpak', 'appimage', 'deb', 'rpm', 'tar.gz']
};

class LinuxStoreBuilder {
  constructor() {
    this.version = this.getVersion();
  }

  getVersion() {
    const packageJsonPath = path.join(process.cwd(), 'desk/package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  }

  async checkDependencies() {
    console.log('🔍 检查构建依赖...');
    
    const requiredTools = [
      { name: 'snapcraft', check: 'snapcraft --version', install: 'sudo snap install snapcraft --classic' },
      { name: 'flatpak-builder', check: 'flatpak-builder --version', install: 'sudo apt install flatpak-builder' },
      { name: 'appimagetool', check: 'appimagetool --version', install: 'wget https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage && chmod +x appimagetool-x86_64.AppImage' },
      { name: 'dpkg', check: 'dpkg --version', install: 'sudo apt install dpkg-dev' },
      { name: 'rpmbuild', check: 'rpmbuild --version', install: 'sudo apt install rpm' }
    ];

    const missing = [];
    
    for (const tool of requiredTools) {
      try {
        execSync(tool.check, { stdio: 'pipe' });
        console.log(`✅ ${tool.name} 已安装`);
      } catch (error) {
        console.log(`❌ ${tool.name} 未安装`);
        console.log(`   安装命令: ${tool.install}`);
        missing.push(tool);
      }
    }

    if (missing.length > 0) {
      console.log('\n⚠️  请安装缺失的工具后重试');
      return false;
    }

    return true;
  }

  async buildSnap() {
    console.log('📦 构建Snap包...');
    
    const deskDir = path.join(process.cwd(), 'desk');
    
    try {
      // 确保snapcraft.yaml存在
      const snapcraftPath = path.join(deskDir, 'snap/snapcraft.yaml');
      if (!fs.existsSync(snapcraftPath)) {
        throw new Error('snapcraft.yaml 文件不存在');
      }

      // 构建应用
      process.chdir(deskDir);
      execSync('npm run build:renderer', { stdio: 'inherit' });
      execSync('npm run build:main', { stdio: 'inherit' });

      // 构建Snap包
      console.log('🔨 使用snapcraft构建...');
      execSync('snapcraft --target-arch=amd64', { stdio: 'inherit' });

      // 检查输出
      const snapFiles = fs.readdirSync('.').filter(file => file.endsWith('.snap'));
      if (snapFiles.length === 0) {
        throw new Error('Snap包构建失败');
      }

      console.log(`✅ Snap包构建成功: ${snapFiles[0]}`);
      
      // 移动到输出目录
      const outputDir = path.join(deskDir, 'dist-electron');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.renameSync(snapFiles[0], path.join(outputDir, snapFiles[0]));

    } catch (error) {
      console.error('❌ Snap构建失败:', error.message);
      throw error;
    }
  }

  async buildFlatpak() {
    console.log('📦 构建Flatpak包...');
    
    try {
      // 设置Flatpak仓库
      console.log('🔧 设置Flatpak仓库...');
      execSync('flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo', { stdio: 'inherit' });
      execSync('flatpak install flathub org.freedesktop.Platform//22.08 org.freedesktop.Sdk//22.08', { stdio: 'inherit' });

      const flatpakDir = path.join(process.cwd(), 'desk/flatpak');
      const buildDir = path.join(flatpakDir, 'build');
      
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
      }

      // 构建Flatpak
      console.log('🔨 使用flatpak-builder构建...');
      const buildCommand = `flatpak-builder --force-clean --repo=repo --subject="AI Platform Desktop ${this.version}" build com.aiplatform.desktop.json`;
      
      execSync(buildCommand, { 
        cwd: flatpakDir,
        stdio: 'inherit'
      });

      // 生成bundle
      console.log('📦 生成Flatpak bundle...');
      const bundleCommand = `flatpak build-bundle repo ai-platform-desktop.flatpak com.aiplatform.desktop`;
      
      execSync(bundleCommand, {
        cwd: flatpakDir,
        stdio: 'inherit'
      });

      // 检查输出
      const bundlePath = path.join(flatpakDir, 'ai-platform-desktop.flatpak');
      if (!fs.existsSync(bundlePath)) {
        throw new Error('Flatpak bundle构建失败');
      }

      // 移动到输出目录
      const outputDir = path.join(process.cwd(), 'desk/dist-electron');
      fs.copyFileSync(bundlePath, path.join(outputDir, 'ai-platform-desktop.flatpak'));

      console.log('✅ Flatpak包构建成功');

    } catch (error) {
      console.error('❌ Flatpak构建失败:', error.message);
      throw error;
    }
  }

  async buildAppImage() {
    console.log('📦 构建AppImage...');
    
    const deskDir = path.join(process.cwd(), 'desk');
    
    try {
      // 构建基础应用
      process.chdir(deskDir);
      execSync('npm run build:renderer', { stdio: 'inherit' });
      execSync('npm run build:main', { stdio: 'inherit' });
      
      // 使用electron-builder构建AppImage
      execSync('electron-builder --linux appimage --x64', { stdio: 'inherit' });

      // 检查输出
      const appImageFiles = fs.readdirSync('dist-electron').filter(file => file.endsWith('.AppImage'));
      if (appImageFiles.length === 0) {
        throw new Error('AppImage构建失败');
      }

      console.log(`✅ AppImage构建成功: ${appImageFiles[0]}`);

    } catch (error) {
      console.error('❌ AppImage构建失败:', error.message);
      throw error;
    }
  }

  async buildDEB() {
    console.log('📦 构建DEB包...');
    
    const deskDir = path.join(process.cwd(), 'desk');
    
    try {
      // 构建基础应用
      process.chdir(deskDir);
      execSync('npm run build:renderer', { stdio: 'inherit' });
      execSync('npm run build:main', { stdio: 'inherit' });
      
      // 使用electron-builder构建DEB
      execSync('electron-builder --linux deb --x64', { stdio: 'inherit' });

      // 检查输出
      const debFiles = fs.readdirSync('dist-electron').filter(file => file.endsWith('.deb'));
      if (debFiles.length === 0) {
        throw new Error('DEB包构建失败');
      }

      console.log(`✅ DEB包构建成功: ${debFiles[0]}`);

    } catch (error) {
      console.error('❌ DEB构建失败:', error.message);
      throw error;
    }
  }

  async buildRPM() {
    console.log('📦 构建RPM包...');
    
    const deskDir = path.join(process.cwd(), 'desk');
    
    try {
      // 构建基础应用
      process.chdir(deskDir);
      execSync('npm run build:renderer', { stdio: 'inherit' });
      execSync('npm run build:main', { stdio: 'inherit' });
      
      // 使用electron-builder构建RPM
      execSync('electron-builder --linux rpm --x64', { stdio: 'inherit' });

      // 检查输出
      const rpmFiles = fs.readdirSync('dist-electron').filter(file => file.endsWith('.rpm'));
      if (rpmFiles.length === 0) {
        throw new Error('RPM包构建失败');
      }

      console.log(`✅ RPM包构建成功: ${rpmFiles[0]}`);

    } catch (error) {
      console.error('❌ RPM构建失败:', error.message);
      throw error;
    }
  }

  async createRepositoryListing() {
    console.log('📝 创建仓库列表信息...');
    
    const listing = {
      "snap": {
        "name": "ai-platform-desktop",
        "channel": "stable",
        "publisher": "ai-platform-team",
        "store": "https://snapcraft.io/ai-platform-desktop",
        "installCommand": "sudo snap install ai-platform-desktop",
        "notes": "自动更新，支持所有主流Linux发行版"
      },
      "flatpak": {
        "id": "com.aiplatform.desktop",
        "repository": "flathub",
        "installCommand": "flatpak install flathub com.aiplatform.desktop",
        "store": "https://flathub.org/apps/com.aiplatform.desktop",
        "notes": "沙盒环境，安全性高"
      },
      "appimage": {
        "name": "AI智能体平台.AppImage",
        "installCommand": "chmod +x AI智能体平台.AppImage && ./AI智能体平台.AppImage",
        "notes": "便携版，无需安装直接运行"
      },
      "deb": {
        "name": "ai-platform-desktop_1.0.0_amd64.deb",
        "installCommand": "sudo dpkg -i ai-platform-desktop_1.0.0_amd64.deb",
        "supportedDistros": ["Ubuntu", "Debian", "Mint", "Pop!_OS"],
        "notes": "适用于Debian系发行版"
      },
      "rpm": {
        "name": "ai-platform-desktop-1.0.0-1.x86_64.rpm",
        "installCommand": "sudo rpm -i ai-platform-desktop-1.0.0-1.x86_64.rpm",
        "supportedDistros": ["Fedora", "CentOS", "RHEL", "OpenSUSE"],
        "notes": "适用于RedHat系发行版"
      },
      "aur": {
        "name": "ai-platform-desktop-bin",
        "repository": "https://aur.archlinux.org/packages/ai-platform-desktop-bin",
        "installCommand": "yay -S ai-platform-desktop-bin",
        "supportedDistros": ["Arch Linux", "Manjaro"],
        "notes": "适用于Arch系发行版"
      }
    };

    const listingPath = path.join(process.cwd(), 'scripts/linux-store-listing.json');
    fs.writeFileSync(listingPath, JSON.stringify(listing, null, 2));
    console.log(`✅ Linux商店列表信息已保存: ${listingPath}`);
  }

  async buildAll() {
    console.log(`🚀 开始Linux多平台构建...`);
    
    // 检查依赖
    const depsOk = await this.checkDependencies();
    if (!depsOk) {
      console.log('❌ 依赖检查失败，请安装缺失的工具');
      process.exit(1);
    }

    const formats = process.argv.slice(2);
    const buildFormats = formats.length > 0 ? formats : config.formats;

    try {
      for (const format of buildFormats) {
        console.log(`\n📦 构建 ${format} 格式...`);
        
        switch (format) {
          case 'snap':
            await this.buildSnap();
            break;
          case 'flatpak':
            await this.buildFlatpak();
            break;
          case 'appimage':
            await this.buildAppImage();
            break;
          case 'deb':
            await this.buildDEB();
            break;
          case 'rpm':
            await this.buildRPM();
            break;
          default:
            console.log(`⚠️  不支持的格式: ${format}`);
        }
      }

      await this.createRepositoryListing();

      console.log('\n🎉 Linux多平台构建完成!');
      console.log('📦 输出目录: desk/dist-electron/');
      console.log('📋 列表信息: scripts/linux-store-listing.json');

      console.log('\n📋 安装命令:');
      console.log('Snap:    sudo snap install ai-platform-desktop');
      console.log('Flatpak:  flatpak install flathub com.aiplatform.desktop');
      console.log('AppImage:  chmod +x *.AppImage && ./AI智能体平台.AppImage');
      console.log('DEB:      sudo dpkg -i *.deb');
      console.log('RPM:      sudo rpm -i *.rpm');

    } catch (error) {
      console.error('❌ 构建失败:', error.message);
      process.exit(1);
    }
  }
}

// 命令行接口
async function main() {
  const command = process.argv[2];
  const builder = new LinuxStoreBuilder();
  
  switch (command) {
    case 'build':
      await builder.buildAll();
      break;
    case 'snap':
      await builder.buildSnap();
      break;
    case 'flatpak':
      await builder.buildFlatpak();
      break;
    case 'appimage':
      await builder.buildAppImage();
      break;
    case 'deb':
      await builder.buildDEB();
      break;
    case 'rpm':
      await builder.buildRPM();
      break;
    case 'check':
      await builder.checkDependencies();
      break;
    default:
      console.log(`
用法: node scripts/build-linux-stores.js <command> [formats]

命令:
  build     构建所有格式 (可指定格式)
  snap      构建Snap包
  flatpak   构建Flatpak包
  appimage   构建AppImage
  deb       构建DEB包
  rpm       构建RPM包
  check     检查构建依赖

格式:
  snap, flatpak, appimage, deb, rpm, aur

示例:
  node scripts/build-linux-stores.js build
  node scripts/build-linux-stores.js build snap flatpak
  node scripts/build-linux-stores.js check

依赖工具:
  - snapcraft (用于Snap包构建)
  - flatpak-builder (用于Flatpak包构建)
  - appimagetool (用于AppImage构建)
  - dpkg (用于DEB包构建)
  - rpmbuild (用于RPM包构建)
      `);
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = LinuxStoreBuilder;