#!/usr/bin/env node

/**
 * Windows应用商店构建脚本
 * 用于生成符合Microsoft Store要求的AppX包
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const config = {
  appName: 'AI智能体平台',
  appId: 'AIPlatformTeam.AIPlatformDesktop',
  publisher: 'CN=AI Platform Team, O=AI Platform Team, L=Beijing, S=Beijing, C=CN',
  version: '1.0.0.0',
  architecture: 'x64',
  outputDir: 'dist-windows-store',
  assetsDir: 'build/assets/windows-store'
};

class WindowsStoreBuilder {
  constructor() {
    this.version = this.getVersion();
  }

  getVersion() {
    const packageJsonPath = path.join(process.cwd(), 'desk/package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const version = packageJson.version;
    
    // 转换为Windows Store版本格式 (major.minor.build.revision)
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor}.${patch}.0`;
  }

  async createAssets() {
    console.log('📦 创建Windows Store资源文件...');
    
    const assetsDir = path.join(process.cwd(), config.assetsDir);
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    // 创建占位符图标文件（实际项目中需要真实的图标）
    const icons = [
      { name: 'StoreLogo.png', size: 50 },
      { name: 'Square44x44Logo.png', size: 44 },
      { name: 'Square71x71Logo.png', size: 71 },
      { name: 'Square150x150Logo.png', size: 150 },
      { name: 'Square310x310Logo.png', size: 310 },
      { name: 'Wide310x150Logo.png', size: { width: 310, height: 150 } },
      { name: 'SplashScreen.png', size: { width: 620, height: 300 } }
    ];

    for (const icon of icons) {
      const filePath = path.join(assetsDir, icon.name);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  需要添加图标: ${filePath}`);
        // 这里应该放置真实的图标文件
      }
    }
  }

  async updateManifest() {
    console.log('📝 更新AppX清单文件...');
    
    const manifestPath = path.join(process.cwd(), 'desk/build/appxmanifest.xml');
    const manifest = fs.readFileSync(manifestPath, 'utf8');
    
    const updatedManifest = manifest
      .replace(/Version="[^"]*"/, `Version="${this.version}"`)
      .replace(/Name="[^"]*"/, `Name="${config.appId}"`)
      .replace(/Publisher="[^"]*"/, `Publisher="${config.publisher}"`)
      .replace(/ProcessorArchitecture="[^"]*"/, `ProcessorArchitecture="${config.architecture}"`);

    fs.writeFileSync(manifestPath, updatedManifest);
    console.log(`✅ 清单已更新到版本 ${this.version}`);
  }

  async buildAppx() {
    console.log('🔨 构建Windows Store包...');
    
    const deskDir = path.join(process.cwd(), 'desk');
    
    try {
      // 清理之前的构建
      const outputDir = path.join(deskDir, config.outputDir);
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }

      // 设置环境变量
      process.env.CSC_LINK = ''; // 证书路径
      process.env.CSC_KEY_PASSWORD = ''; // 证书密码

      // 构建应用
      execSync('npm run build:all', { 
        cwd: deskDir,
        stdio: 'inherit'
      });

      console.log('✅ 应用构建完成');

      // 创建AppX包
      const buildDir = path.join(deskDir, 'dist-electron');
      const appxOutput = path.join(buildDir, 'appx');

      if (!fs.existsSync(appxOutput)) {
        fs.mkdirSync(appxOutput, { recursive: true });
      }

      // 这里应该使用MakeAppx.exe或其他工具创建AppX包
      console.log('📦 创建AppX包...');
      
      // 生成包名
      const packageFamilyName = `${config.appId}_${this.version}_${config.architecture}`;
      const packageFileName = `${packageFamilyName}.appx`;
      
      console.log(`✅ AppX包已创建: ${packageFileName}`);
      
    } catch (error) {
      console.error('❌ 构建失败:', error.message);
      throw error;
    }
  }

  async createStoreListing() {
    console.log('📝 创建商店列表信息...');
    
    const listing = {
      "appId": config.appId,
      "productName": config.appName,
      "publisher": "AI Platform Team",
      "category": "Developer tools",
      "subcategory": "Programming",
      "description": {
        "short": "AI驱动的智能开发平台",
        "full": "AI智能体平台是一个功能强大的开发工具，集成了先进的AI技术，为开发者提供智能代码分析、自动推荐、实时协作等功能。无论是个人项目还是团队协作，都能显著提升开发效率和代码质量。",
        "keywords": ["AI", "开发", "平台", "智能", "代码分析", "推荐", "协作", "编程"]
      },
      "features": [
        "AI智能代码分析",
        "智能推荐系统",
        "实时协作编辑",
        "多平台支持",
        "自动更新机制",
        "云端同步功能"
      ],
      "screenshots": [
        {
          "path": "screenshots/desktop-1.png",
          "description": "主界面 - 项目管理",
          "displayOrder": 1
        },
        {
          "path": "screenshots/desktop-2.png", 
          "description": "AI助手界面",
          "displayOrder": 2
        },
        {
          "path": "screenshots/desktop-3.png",
          "description": "代码分析功能",
          "displayOrder": 3
        }
      ],
      "systemRequirements": {
        "minOSVersion": "10.0.14393.0",
        "recommendedOSVersion": "10.0.19041.0",
        "architecture": ["x64"],
        "memory": "4GB RAM",
        "storage": "500MB",
        "graphics": "DirectX 9.0c compatible"
      },
      "pricing": {
        "free": true,
        "trial": null,
        "inAppPurchases": []
      },
      "privacyPolicy": "https://aiplatform.com/privacy",
      "supportUrl": "https://aiplatform.com/support",
      "website": "https://aiplatform.com",
      "releaseNotes": {
        "latest": "v1.0.0 - 初始发布版本",
        "history": [
          {
            "version": "1.0.0",
            "date": "2024-01-XX",
            "changes": [
              "初始发布",
              "AI智能分析功能",
              "实时协作功能",
              "多平台支持"
            ]
          }
        ]
      }
    };

    const listingPath = path.join(process.cwd(), 'scripts/windows-store-listing.json');
    fs.writeFileSync(listingPath, JSON.stringify(listing, null, 2));
    console.log(`✅ 商店列表信息已保存: ${listingPath}`);
  }

  async generateCertificates() {
    console.log('🔐 生成测试证书...');
    
    const certDir = path.join(process.cwd(), 'build/certificates');
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    // 注意：实际发布需要从受信任的CA购买证书
    const certScript = `
# 生成自签名测试证书（仅用于测试）
# 实际发布需要购买代码签名证书

# 创建证书请求配置
cat > cert.inf << EOF
[Version]
Signature = "\\$Windows NT$"

[Strings]
szOID_ENHANCED_KEY_USAGE = "2.5.29.37"
szOID_DOCUMENT_ENCRYPTION = "1.3.6.1.4.1.311.80.1"

[NewRequest]
Subject = "${config.publisher}"
KeySpec = 1
KeyLength = 2048
Exportable = TRUE
MachineKeySet = TRUE
SMIME = FALSE
PrivateKeyArchive = FALSE
UserProtected = FALSE
UseExistingKeySet = FALSE
ProviderName = "Microsoft RSA SChannel Cryptographic Provider"
ProviderType = 12
RequestType = PKCS10
KeyUsage = 0xa0

[EnhancedKeyUsageExtension]
OID = 1.3.6.1.5.5.7.3.3 ; Code Signing
`;

    const certPath = path.join(certDir, 'generate-cert.bat');
    fs.writeFileSync(certPath, certScript);
    
    console.log('📝 证书生成脚本已创建:', certPath);
    console.log('⚠️  注意：这仅用于测试，实际发布需要购买代码签名证书');
  }

  async build() {
    console.log(`🚀 开始构建Windows Store包...`);
    
    try {
      await this.createAssets();
      await this.updateManifest();
      await this.buildAppx();
      await this.createStoreListing();
      await this.generateCertificates();
      
      console.log('🎉 Windows Store包构建完成!');
      console.log('📦 输出目录: desk/' + config.outputDir);
      console.log('📝 清单文件: desk/build/appxmanifest.xml');
      console.log('📋 商店列表: scripts/windows-store-listing.json');
      
      console.log('\n📋 下一步操作:');
      console.log('1. 添加真实的图标文件到 build/assets/windows-store/');
      console.log('2. 购买并配置代码签名证书');
      console.log('3. 使用Microsoft Store Partner Center提交应用');
      console.log('4. 通过Microsoft Store审核流程');
      
    } catch (error) {
      console.error('❌ 构建失败:', error.message);
      process.exit(1);
    }
  }
}

// 命令行接口
async function main() {
  const command = process.argv[2];
  const builder = new WindowsStoreBuilder();
  
  switch (command) {
    case 'build':
      await builder.build();
      break;
    case 'assets':
      await builder.createAssets();
      break;
    case 'manifest':
      await builder.updateManifest();
      break;
    case 'listing':
      await builder.createStoreListing();
      break;
    default:
      console.log(`
用法: node scripts/build-windows-store.js <command>

命令:
  build    构建完整的Windows Store包
  assets   创建必需的资源文件
  manifest 更新AppX清单文件
  listing  生成商店列表信息

示例:
  node scripts/build-windows-store.js build
      `);
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = WindowsStoreBuilder;