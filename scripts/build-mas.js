#!/usr/bin/env node

/**
 * Mac App Store构建脚本
 * 用于生成符合Mac App Store要求的包
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const config = {
  appName: 'AI智能体平台',
  appId: 'com.aiplatform.desktop',
  teamId: process.env.APPLE_TEAM_ID,
  categoryId: 'public.app-category.developer-tools',
  appleId: process.env.APPLE_ID,
  appleIdPassword: process.env.APPLE_ID_PASSWORD,
  shortVersion: '1.0.0',
  version: '1.0.0'
};

class MacAppStoreBuilder {
  constructor() {
    this.validateEnvironment();
  }

  validateEnvironment() {
    if (!config.teamId) {
      console.error('❌ 缺少Apple Team ID');
      console.log('请设置环境变量: export APPLE_TEAM_ID=your_team_id');
      process.exit(1);
    }

    if (!config.appleId || !config.appleIdPassword) {
      console.error('❌ 缺少Apple ID凭据');
      console.log('请设置环境变量:');
      console.log('export APPLE_ID=your_apple_id');
      console.log('export APPLE_ID_PASSWORD=your_app_specific_password');
      process.exit(1);
    }
  }

  getVersion() {
    const packageJsonPath = path.join(process.cwd(), 'desk/package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    config.shortVersion = packageJson.version;
    config.version = packageJson.version.replace(/\./g, '');
    
    return { shortVersion: config.shortVersion, version: config.version };
  }

  async createAssets() {
    console.log('📦 创建Mac App Store资源文件...');
    
    const assetsDir = path.join(process.cwd(), 'build/assets/mas');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    // 创建应用图标要求的尺寸
    const iconSizes = [16, 32, 64, 128, 256, 512, 1024];
    
    for (const size of iconSizes) {
      const iconPath = path.join(assetsDir, `icon-${size}x${size}.png`);
      if (!fs.existsSync(iconPath)) {
        console.log(`⚠️  需要添加图标: ${iconPath} (${size}x${size})`);
      }
    }

    // 创建App Store图标
    const appStoreIconPath = path.join(assetsDir, 'app-store-icon-1024x1024.png');
    if (!fs.existsSync(appStoreIconPath)) {
      console.log(`⚠️  需要添加App Store图标: ${appStoreIconPath}`);
    }
  }

  async updateInfoPlist() {
    console.log('📝 更新Info.plist文件...');
    
    const versionInfo = this.getVersion();
    
    const infoPlistPath = path.join(process.cwd(), 'desk/dist-electron/mac/AI智能体平台.app/Contents/Info.plist');
    
    // 如果文件不存在，创建一个基础的Info.plist
    const infoPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>${config.appName}</string>
    <key>CFBundleExecutable</key>
    <string>AI智能体平台</string>
    <key>CFBundleIconFile</key>
    <string>icon.icns</string>
    <key>CFBundleIdentifier</key>
    <string>${config.appId}.mas</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>${config.appName}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>${versionInfo.shortVersion}</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleVersion</key>
    <string>${versionInfo.version}</string>
    <key>LSApplicationCategoryType</key>
    <string>${config.categoryId}</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSSupportsAutomaticGraphicsSwitching</key>
    <true/>
    <key>NSRequiresAquaSystemAppearance</key>
    <false/>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <false/>
        <key>NSExceptionDomains</key>
        <dict>
            <key>api.github.com</key>
            <dict>
                <key>NSExceptionAllowsInsecureHTTPLoads</key>
                <false/>
                <key>NSExceptionMinimumTLSVersion</key>
                <string>TLSv1.2</string>
            </dict>
        </dict>
    </dict>
    <key>NSDocumentsFolderUsageDescription</key>
    <string>访问文档文件夹以打开和保存项目文件</string>
    <key>NSDownloadsFolderUsageDescription</key>
    <string>访问下载文件夹以管理项目文件</string>
    <key>CFBundleDocumentTypes</key>
    <array>
        <dict>
            <key>CFBundleTypeExtensions</key>
            <array>
                <string>aiproj</string>
            </array>
            <key>CFBundleTypeName</key>
            <string>AI Platform Project</string>
            <key>CFBundleTypeRole</key>
            <string>Editor</string>
            <key>LSHandlerRank</key>
            <string>Owner</string>
        </dict>
    </array>
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLName</key>
            <string>com.aiplatform.url</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>aiproj</string>
            </array>
        </dict>
    </array>
</dict>
</plist>`;

    const infoPlistDir = path.dirname(infoPlistPath);
    if (!fs.existsSync(infoPlistDir)) {
      fs.mkdirSync(infoPlistDir, { recursive: true });
    }
    
    fs.writeFileSync(infoPlistPath, infoPlistContent);
    console.log('✅ Info.plist已更新');
  }

  async buildMAS() {
    console.log('🔨 构建Mac App Store包...');
    
    const deskDir = path.join(process.cwd(), 'desk');
    
    try {
      // 清理之前的构建
      const distDir = path.join(deskDir, 'dist-electron');
      if (fs.existsSync(distDir)) {
        fs.rmSync(distDir, { recursive: true, force: true });
      }

      // 设置环境变量
      process.env.CSC_LINK = process.env.MAS_CERTIFICATE_PATH || '';
      process.env.CSC_KEY_PASSWORD = process.env.MAS_CERTIFICATE_PASSWORD || '';

      // 构建应用
      console.log('📦 构建MAS应用...');
      execSync('npm run build:mas', { 
        cwd: deskDir,
        stdio: 'inherit'
      });

      console.log('✅ MAS应用构建完成');
      
      // 更新Info.plist
      await this.updateInfoPlist();

      // 签名应用
      await this.signApp();

    } catch (error) {
      console.error('❌ 构建失败:', error.message);
      throw error;
    }
  }

  async signApp() {
    console.log('🔐 签名应用...');
    
    try {
      const appPath = path.join(process.cwd(), 'desk/dist-electron/mac/AI智能体平台.app');
      
      if (!fs.existsSync(appPath)) {
        throw new Error('应用文件不存在');
      }

      // 使用codesign签名应用
      const signCommand = `codesign --force --deep --sign "Developer ID Application: ${config.teamId}" "${appPath}"`;
      
      console.log('🔑 应用代码签名...');
      execSync(signCommand, { stdio: 'inherit' });

      // 验证签名
      console.log('✅ 验证签名...');
      execSync(`codesign --verify --verbose "${appPath}"`, { stdio: 'inherit' });

      console.log('✅ 应用签名完成');

    } catch (error) {
      console.error('❌ 签名失败:', error.message);
      throw error;
    }
  }

  async createPackage() {
    console.log('📦 创建安装包...');
    
    try {
      const appPath = path.join(process.cwd(), 'desk/dist-electron/mac/AI智能体平台.app');
      const outputPath = path.join(process.cwd(), 'desk/dist-electron/');
      const packageName = `${config.appName}-${config.shortVersion}.pkg`;

      // 使用productbuild创建安装包
      const buildCommand = `productbuild --component "${appPath}" /Applications --sign "Developer ID Installer: ${config.teamId}" "${outputPath}/${packageName}"`;
      
      console.log('📦 创建PKG包...');
      execSync(buildCommand, { stdio: 'inherit' });

      // 公证包
      console.log('🔐 公证包...');
      await this.notarizePackage(`${outputPath}/${packageName}`);

      console.log(`✅ 安装包已创建: ${packageName}`);

    } catch (error) {
      console.error('❌ 创建包失败:', error.message);
      throw error;
    }
  }

  async notarizePackage(packagePath) {
    console.log('🔐 公证包...');
    
    try {
      // 上传包进行公证
      const uploadCommand = `xcrun altool --notarize-app --primary-bundle-id "${config.appId}" --username "${config.appleId}" --password "${config.appleIdPassword}" --file "${packagePath}"`;
      
      console.log('⬆️  上传包进行公证...');
      execSync(uploadCommand, { stdio: 'inherit' });

      console.log('✅ 包公证完成');

    } catch (error) {
      console.error('❌ 公证失败:', error.message);
      throw error;
    }
  }

  async createAppStoreListing() {
    console.log('📝 创建App Store列表信息...');
    
    const listing = {
      "appId": config.appId,
      "productName": config.appName,
      "category": "Developer Tools",
      "subcategory": "Programming",
      "description": {
        "short": "AI驱动的智能开发平台",
        "full": "AI智能体平台是一个功能强大的开发工具，集成了先进的AI技术，为开发者提供智能代码分析、自动推荐、实时协作等功能。无论是个人项目还是团队协作，都能显著提升开发效率和代码质量。",
        "keywords": ["AI", "开发", "平台", "智能", "代码分析", "推荐", "协作", "编程"],
        "whatsNew": "v1.0.0 - 初始发布版本，包含AI智能分析、实时协作等核心功能"
      },
      "features": [
        "🤖 AI智能代码分析",
        "🎯 智能推荐系统", 
        "👥 实时协作编辑",
        "💻 多平台支持",
        "🔄 自动更新机制",
        "☁️ 云端同步功能"
      ],
      "screenshots": [
        {
          "path": "screenshots/mac-desktop-1.png",
          "description": "主界面 - 项目管理",
          "displayOrder": 1,
          "device": "mac"
        },
        {
          "path": "screenshots/mac-desktop-2.png",
          "description": "AI助手界面", 
          "displayOrder": 2,
          "device": "mac"
        },
        {
          "path": "screenshots/mac-desktop-3.png",
          "description": "代码分析功能",
          "displayOrder": 3,
          "device": "mac"
        }
      ],
      "appIcon": "assets/app-store-icon-1024x1024.png",
      "copyright": "Copyright © 2024 AI Platform Team. All rights reserved.",
      "supportUrl": "https://aiplatform.com/support",
      "privacyPolicy": "https://aiplatform.com/privacy",
      "website": "https://aiplatform.com",
      "systemRequirements": {
        "minOSVersion": "10.15",
        "recommendedOSVersion": "12.0",
        "architecture": ["x86_64", "arm64"],
        "memory": "4GB RAM",
        "storage": "500MB",
        "graphics": "Integrated graphics or better"
      },
      "pricing": {
        "free": true,
        "trial": null,
        "inAppPurchases": [],
        "subscription": null
      },
      "localization": {
        "en-US": {
          "title": "AI Platform",
          "description": "AI-powered intelligent development platform for developers",
          "keywords": "AI, development, platform, intelligent, code analysis"
        },
        "zh-CN": {
          "title": "AI智能体平台",
          "description": "AI驱动的智能开发平台，专为开发者打造",
          "keywords": "AI, 开发, 平台, 智能, 代码分析"
        }
      },
      "appReviewInfo": {
        "reviewAccount": "review@aiplatform.com",
        "reviewNotes": "这是一个AI驱动的开发平台，包含代码分析、智能推荐和协作功能",
        "demoAccount": {
          "username": "demo",
          "password": "demo123"
        },
        "contactInfo": {
          "firstName": "Developer",
          "lastName": "Team",
          "email": "dev@aiplatform.com",
          "phone": "+86-xxx-xxxx-xxxx"
        }
      }
    };

    const listingPath = path.join(process.cwd(), 'scripts/mas-listing.json');
    fs.writeFileSync(listingPath, JSON.stringify(listing, null, 2));
    console.log(`✅ App Store列表信息已保存: ${listingPath}`);
  }

  async build() {
    console.log(`🚀 开始Mac App Store构建流程...`);
    
    try {
      await this.createAssets();
      await this.buildMAS();
      await this.createPackage();
      await this.createAppStoreListing();
      
      console.log('🎉 Mac App Store构建完成!');
      console.log('📦 输出目录: desk/dist-electron/');
      console.log('📝 列表信息: scripts/mas-listing.json');
      
      console.log('\n📋 下一步操作:');
      console.log('1. 添加真实的图标文件到 build/assets/mas/');
      console.log('2. 在App Store Connect中创建应用');
      console.log('3. 上传应用包到App Store Connect');
      console.log('4. 配置应用元数据和截图');
      console.log('5. 提交审核');
      
    } catch (error) {
      console.error('❌ 构建失败:', error.message);
      process.exit(1);
    }
  }
}

// 命令行接口
async function main() {
  const command = process.argv[2];
  const builder = new MacAppStoreBuilder();
  
  switch (command) {
    case 'build':
      await builder.build();
      break;
    case 'assets':
      await builder.createAssets();
      break;
    case 'sign':
      await builder.signApp();
      break;
    case 'package':
      await builder.createPackage();
      break;
    case 'listing':
      await builder.createAppStoreListing();
      break;
    default:
      console.log(`
用法: node scripts/build-mas.js <command>

命令:
  build     构建完整的Mac App Store包
  assets    创建必需的资源文件
  sign      签名应用
  package   创建安装包
  listing   创建App Store列表信息

环境变量:
  APPLE_TEAM_ID             Apple Developer Team ID
  APPLE_ID                  Apple ID
  APPLE_ID_PASSWORD         App-specific password
  MAS_CERTIFICATE_PATH       开发者证书路径
  MAS_CERTIFICATE_PASSWORD   证书密码

示例:
  node scripts/build-mas.js build
      `);
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MacAppStoreBuilder;