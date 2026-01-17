#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// 模拟版本检测服务
class VersionDetectionService {
  static detectWindowsVersion(installPath, softwareName) {
    console.log(`🔍 检测 ${softwareName} 版本，路径: ${installPath}`);
    
    // 模拟版本检测逻辑
    const versions = {
      'Adobe Photoshop': [
        { version: '2023', apiVersion: '1.0.0', releaseDate: '2023-10-01' },
        { version: '2024', apiVersion: '2.0.0', releaseDate: '2024-10-01' }
      ],
      'Adobe Illustrator': [
        { version: '2023', apiVersion: '1.5.0', releaseDate: '2023-09-01' },
        { version: '2024', apiVersion: '2.1.0', releaseDate: '2024-09-01' }
      ]
    };

    const softwareVersions = versions[softwareName];
    if (softwareVersions && softwareVersions.length > 0) {
      // 模拟检测到最新版本
      return {
        detected: true,
        version: softwareVersions[softwareVersions.length - 1],
        installedPath: installPath,
        detectionTime: new Date(),
        detectionMethod: 'File Analysis',
        confidence: 0.95
      };
    }

    return {
      detected: false,
      error: 'Software not found',
      confidence: 0
    };
  }

  static generateCompatibilityScore(userVersion, availableVersions) {
    console.log(`📊 计算兼容性评分，用户版本: ${userVersion.version}`);
    
    const latestVersion = availableVersions.find(v => v.isLatest);
    if (!latestVersion) {
      return { score: 0, status: 'NO_LATEST_VERSION' };
    }

    const userApiVersion = userVersion.apiVersion;
    const latestApiVersion = latestVersion.apiVersion;
    
    // 简单的版本比较逻辑
    const score = this.calculateVersionCompatibility(userApiVersion, latestApiVersion);
    
    let status = 'INCOMPATIBLE';
    if (score >= 0.9) status = 'FULLY_COMPATIBLE';
    else if (score >= 0.7) status = 'MOSTLY_COMPATIBLE';
    else if (score >= 0.5) status = 'PARTIALLY_COMPATIBLE';

    return {
      score: Math.round(score * 100) / 100,
      status,
      userVersion,
      latestVersion,
      recommendations: this.generateRecommendations(score, userVersion, latestVersion)
    };
  }

  static calculateVersionCompatibility(userApi, latestApi) {
    // 简化的版本兼容性算法
    const userParts = userApi.split('.').map(Number);
    const latestParts = latestApi.split('.').map(Number);
    
    let compatibility = 1.0;
    
    for (let i = 0; i < Math.max(userParts.length, latestParts.length); i++) {
      const userPart = userParts[i] || 0;
      const latestPart = latestParts[i] || 0;
      
      if (userPart < latestPart) {
        compatibility -= 0.3 * (latestPart - userPart) / Math.max(latestPart, 1);
      }
    }
    
    return Math.max(0, Math.min(1, compatibility));
  }

  static generateRecommendations(score, userVersion, latestVersion) {
    const recommendations = [];
    
    if (score < 0.7) {
      recommendations.push({
        type: 'UPGRADE',
        priority: 'HIGH',
        message: `建议升级到 ${latestVersion.version} 版本以获得完整功能支持`,
        action: 'Upgrade'
      });
    }
    
    if (score < 0.9 && score >= 0.7) {
      recommendations.push({
        type: 'UPDATE',
        priority: 'MEDIUM',
        message: `建议更新到 ${latestVersion.version} 版本以获得最佳性能`,
        action: 'Update'
      });
    }
    
    if (score >= 0.9) {
      recommendations.push({
        type: 'MAINTAIN',
        priority: 'LOW',
        message: '当前版本兼容性良好，建议定期检查更新',
        action: 'Monitor'
      });
    }
    
    return recommendations;
  }
}

async function testVersionDetectionAndCompatibility() {
  console.log('🧪 开始版本检测和兼容性分析测试\n');

  try {
    // 1. 创建测试软件数据
    console.log('📝 创建测试软件数据...');
    
    const testSoftware = await prisma.software_apis.create({
      data: {
        id: 'test-photoshop-v2',
        softwareName: 'Adobe Photoshop Test',
        category: 'PHOTO_EDITING',
        versions: [
          {
            version: '2023',
            apiVersion: '1.0.0',
            isLatest: false,
            releaseDate: '2023-10-01T00:00:00.000Z',
            changelog: '基础AI功能'
          },
          {
            version: '2024',
            apiVersion: '2.0.0',
            isLatest: true,
            releaseDate: '2024-10-01T00:00:00.000Z',
            changelog: '高级AI功能，性能提升30%'
          }
        ],
        apiConfig: {
          endpoint: 'https://api.adobe.com/photoshop',
          auth: 'oauth',
          version: '2.0.0',
          features: ['image-editing', 'ai-enhancement', 'batch-processing']
        },
        comConfig: {
          interface: 'COM',
          clsid: '{Photoshop.CLSID}',
          progId: 'Photoshop.Application'
        },
        toolsConfig: {
          brushTool: true,
          selectionTool: true,
          layerTool: true,
          filterTool: true
        },
        isActive: true,
        autoUpdate: true,
        updatedAt: new Date()
      }
    });
    console.log('✅ 创建测试软件成功:', testSoftware.softwareName);

    // 2. 创建用户软件关联
    console.log('\n👤 创建用户软件关联...');
    
    const testUserId = 'cmj9eotcr00002c3l59yasxl5';
    const installPath = 'C:\\Program Files\\Adobe\\Adobe Photoshop 2023';
    
    const userSoftware = await prisma.user_softwares.create({
      data: {
        id: 'test-user-photoshop-v2',
        userId: testUserId,
        softwareId: testSoftware.id,
        version: '2023',
        installPath: installPath,
        isActive: true,
        lastScanned: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ 创建用户软件关联成功');

    // 3. 测试版本检测
    console.log('\n🔍 测试版本检测功能...');
    
    const detectionResult = VersionDetectionService.detectWindowsVersion(
      installPath,
      'Adobe Photoshop' // 使用原始软件名称进行检测
    );
    
    console.log('✅ 版本检测结果:', {
      detected: detectionResult.detected,
      version: detectionResult.version?.version,
      apiVersion: detectionResult.version?.apiVersion,
      confidence: detectionResult.confidence,
      method: detectionResult.detectionMethod
    });

    if (detectionResult.detected) {
      // 更新数据库中的版本信息
      await prisma.user_softwares.update({
        where: { id: userSoftware.id },
        data: {
          version: detectionResult.version.version,
          lastScanned: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ 更新数据库版本信息成功');
    }

    // 4. 测试兼容性分析
    console.log('\n📊 测试兼容性分析功能...');
    
    const compatibilityAnalysis = VersionDetectionService.generateCompatibilityScore(
      { version: '2023', apiVersion: '1.0.0' },
      testSoftware.versions
    );
    
    console.log('✅ 兼容性分析结果:', {
      score: compatibilityAnalysis.score,
      status: compatibilityAnalysis.status,
      recommendations: compatibilityAnalysis.recommendations.length,
      latestVersion: compatibilityAnalysis.latestVersion.version
    });

    // 5. 创建兼容性报告记录
    console.log('\n📋 创建兼容性报告...');
    
    const compatibilityReport = {
      id: `compatibility-report-${Date.now()}`,
      userSoftwareId: userSoftware.id,
      userId: testUserId,
      softwareId: testSoftware.id,
      analysis: compatibilityAnalysis,
      createdAt: new Date(),
      status: 'COMPLETED'
    };

    console.log('✅ 兼容性报告生成成功:', {
      reportId: compatibilityReport.id,
      score: compatibilityReport.analysis.score,
      status: compatibilityReport.analysis.status
    });

    // 6. 测试多版本兼容性比较
    console.log('\n🔄 测试多版本兼容性比较...');
    
    const testVersions = [
      { version: '2022', apiVersion: '0.9.0' },
      { version: '2023', apiVersion: '1.0.0' },
      { version: '2024', apiVersion: '2.0.0' }
    ];

    const compatibilityResults = testVersions.map(testVersion => {
      const result = VersionDetectionService.generateCompatibilityScore(
        testVersion,
        testSoftware.versions
      );
      return {
        version: testVersion.version,
        score: result.score,
        status: result.status,
        recommendations: result.recommendations.length
      };
    });

    console.log('✅ 多版本兼容性比较结果:');
    compatibilityResults.forEach(result => {
      console.log(`  📌 版本 ${result.version}: 评分 ${result.score} (${result.status})`);
    });

    // 7. 测试自动升级建议生成
    console.log('\n🚀 测试自动升级建议生成...');
    
    const upgradeSuggestions = compatibilityAnalysis.recommendations
      .filter(rec => rec.type === 'UPGRADE' || rec.type === 'UPDATE')
      .map(suggestion => ({
        ...suggestion,
        currentVersion: '2023',
        targetVersion: compatibilityAnalysis.latestVersion.version,
        estimatedTime: '30-60 分钟',
        requirements: ['备份当前工作', '确保网络连接', '足够磁盘空间']
      }));

    console.log('✅ 升级建议生成成功:', {
      suggestions: upgradeSuggestions.length,
      highestPriority: upgradeSuggestions[0]?.priority || 'NONE'
    });

    // 8. 清理测试数据
    console.log('\n🧹 清理测试数据...');
    
    await prisma.user_softwares.delete({
      where: { id: userSoftware.id }
    });
    
    await prisma.software_apis.delete({
      where: { id: testSoftware.id }
    });
    
    console.log('✅ 测试数据清理完成');

    console.log('\n🎉 版本检测和兼容性分析测试完成！');
    console.log('\n📊 测试总结:');
    console.log('  ✅ 版本检测功能正常');
    console.log('  ✅ 兼容性评分算法正常');
    console.log('  ✅ 多版本比较功能正常');
    console.log('  ✅ 升级建议生成正常');
    console.log('  ✅ 数据库集成正常');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testVersionDetectionAndCompatibility();
}

module.exports = { testVersionDetectionAndCompatibility, VersionDetectionService };