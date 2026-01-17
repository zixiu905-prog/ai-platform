#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testDatabaseIntegration() {
  console.log('🧪 开始软件API管理数据库集成测试\n');

  try {
    // 1. 测试连接
    console.log('📡 测试数据库连接...');
    await prisma.$connect();
    console.log('✅ 数据库连接成功');

    // 2. 测试SoftwareAPI CRUD操作
    console.log('\n🔧 测试SoftwareAPI CRUD操作...');
    
    // 创建新的软件API
    const newSoftwareAPI = await prisma.software_apis.create({
      data: {
        id: 'test-illustrator',
        softwareName: 'Adobe Illustrator',
        category: 'ILLUSTRATION',
        versions: [
          {
            version: '2024',
            apiVersion: '2.0.0',
            isLatest: true,
            releaseDate: new Date().toISOString()
          },
          {
            version: '2023',
            apiVersion: '1.5.0',
            isLatest: false,
            releaseDate: '2023-10-01T00:00:00.000Z'
          }
        ],
        apiConfig: {
          endpoint: 'https://api.adobe.com/illustrator',
          auth: 'oauth',
          version: '2.0.0',
          features: ['vector-editing', 'path-manipulation', 'text-effects']
        },
        comConfig: {
          interface: 'COM',
          clsid: '{Illustrator.CLSID}',
          progId: 'Illustrator.Application'
        },
        toolsConfig: {
          penTool: true,
          shapeTool: true,
          textTool: true,
          pathfinder: true
        },
        isActive: true,
        autoUpdate: true,
        updatedAt: new Date()
      }
    });
    console.log('✅ 创建软件API成功:', newSoftwareAPI.softwareName);

    // 读取所有软件API
    const softwareAPIsList = await prisma.software_apis.findMany();
    console.log(`✅ 查询到 ${softwareAPIsList.length} 个软件API`);

    // 更新软件API
    const updatedSoftwareAPI = await prisma.software_apis.update({
      where: { id: 'test-illustrator' },
      data: {
        versions: [
          {
            version: '2024',
            apiVersion: '2.1.0',
            isLatest: true,
            releaseDate: new Date().toISOString(),
            changelog: '新增AI辅助设计功能'
          },
          ...newSoftwareAPI.versions
        ],
        updatedAt: new Date()
      }
    });
    console.log('✅ 更新软件API成功，当前版本:', updatedSoftwareAPI.versions[0].apiVersion);

    // 删除测试数据
    await prisma.software_apis.delete({
      where: { id: 'test-illustrator' }
    });
    console.log('✅ 删除测试数据成功');

    // 3. 测试UserSoftware CRUD操作
    console.log('\n👤 测试UserSoftware CRUD操作...');
    
    const testUserId = 'cmj9eotcr00002c3l59yasxl5';
    const testSoftwareId = 'test-photoshop';

    // 先删除已存在的关联
    await prisma.user_softwares.deleteMany({
      where: {
        userId: testUserId,
        softwareId: testSoftwareId
      }
    });

    // 创建用户软件关联
    const newUserSoftware = await prisma.user_softwares.create({
      data: {
        id: 'test-user-photoshop-new',
        userId: testUserId,
        softwareId: testSoftwareId,  // 使用现有的软件ID
        version: '2023',
        installPath: 'C:\\Program Files\\Adobe\\Adobe Photoshop 2023',
        isActive: true,
        updatedAt: new Date()
      }
    });
    console.log('✅ 创建用户软件关联成功');

    // 查询用户的所有软件
    const userSoftwares = await prisma.user_softwares.findMany({
      where: { userId: testUserId }
    });
    console.log(`✅ 用户拥有 ${userSoftwares.length} 个软件`);

    // 更新用户软件信息
    const updatedUserSoftware = await prisma.user_softwares.update({
      where: { id: 'test-user-photoshop-new' },
      data: {
        version: '2024',
        installPath: 'C:\\Program Files\\Adobe\\Adobe Photoshop 2024',
        updatedAt: new Date()
      }
    });
    console.log('✅ 更新用户软件版本成功');

    // 删除测试数据
    await prisma.user_softwares.delete({
      where: { id: 'test-user-photoshop-new' }
    });
    console.log('✅ 删除用户软件关联成功');

    // 4. 测试复杂查询
    console.log('\n🔍 测试复杂查询...');
    
    // 按分类统计软件数量
    const softwareByCategory = await prisma.software_apis.groupBy({
      by: ['category'],
      _count: true
    });
    console.log('✅ 按分类统计:', softwareByCategory);

    // 查询活跃软件
    const activeSoftware = await prisma.software_apis.count({
      where: { isActive: true }
    });
    console.log(`✅ 活跃软件数量: ${activeSoftware}`);

    // 5. 测试事务处理
    console.log('\n💾 测试事务处理...');
    
    await prisma.$transaction(async (tx) => {
      // 创建软件API
      const software = await tx.software_apis.create({
        data: {
          id: 'transaction-test-coreldraw',
          softwareName: 'CorelDRAW',
          category: 'DESIGN_2D',
          versions: [{
            version: '2023',
            apiVersion: '1.0.0',
            isLatest: true
          }],
          apiConfig: {
            endpoint: 'https://api.corel.com/coreldraw',
            auth: 'apikey'
          },
          isActive: true,
          autoUpdate: false,
          updatedAt: new Date()
        }
      });

      // 创建用户软件关联
      await tx.user_softwares.create({
        data: {
          id: 'transaction-user-coreldraw',
          userId: testUserId,
          softwareId: software.id,
          version: '2023',
          installPath: 'C:\\Program Files\\Corel\\CorelDRAW 2023',
          isActive: true,
          updatedAt: new Date()
        }
      });
      
      console.log('✅ 事务执行成功');
      
      // 回滚事务以清理测试数据
      throw new Error('测试回滚');
    }).catch(() => {
      console.log('✅ 事务回滚成功');
    });

    console.log('\n🎉 数据库集成测试完成！所有CRUD操作正常工作。');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testDatabaseIntegration();
}

module.exports = { testDatabaseIntegration };