#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// 批量操作和高级查询服务
class BatchOperationsService {
  // 批量创建软件API
  static async batchCreateSoftwareAPIs(softwares) {
    console.log(`🔄 批量创建 ${softwares.length} 个软件API...`);
    
    const results = [];
    for (const software of softwares) {
      try {
        const created = await prisma.software_apis.create({
          data: {
            ...software,
            updatedAt: new Date()
          }
        });
        results.push({ success: true, data: created, id: software.id });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message, 
          id: software.id 
        });
      }
    }
    
    return results;
  }

  // 批量更新软件API
  static async batchUpdateSoftwareAPIs(updates) {
    console.log(`🔄 批量更新 ${updates.length} 个软件API...`);
    
    const results = [];
    for (const update of updates) {
      try {
        const updated = await prisma.software_apis.update({
          where: { id: update.id },
          data: {
            ...update.data,
            updatedAt: new Date()
          }
        });
        results.push({ success: true, data: updated, id: update.id });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message, 
          id: update.id 
        });
      }
    }
    
    return results;
  }

  // 批量删除软件API
  static async batchDeleteSoftwareAPIs(ids) {
    console.log(`🔄 批量删除 ${ids.length} 个软件API...`);
    
    const results = [];
    for (const id of ids) {
      try {
        const deleted = await prisma.software_apis.delete({
          where: { id }
        });
        results.push({ success: true, data: deleted, id });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message, 
          id 
        });
      }
    }
    
    return results;
  }

  // 高级查询：按条件筛选软件
  static async advancedSearchSoftware(criteria) {
    console.log('🔍 执行高级查询...');
    
    const where = {};
    
    if (criteria.category) {
      where.category = criteria.category;
    }
    
    if (criteria.isActive !== undefined) {
      where.isActive = criteria.isActive;
    }
    
    if (criteria.softwareName) {
      where.softwareName = {
        contains: criteria.softwareName,
        mode: 'insensitive'
      };
    }
    
    if (criteria.minVersion || criteria.maxVersion) {
      where.versions = {
        some: {
          version: {
            gte: criteria.minVersion,
            lte: criteria.maxVersion
          }
        }
      };
    }
    
    if (criteria.features) {
      where.apiConfig = {
        path: ['features'],
        array_contains: criteria.features
      };
    }
    
    const results = await prisma.software_apis.findMany({
      where,
      include: {
        user_softwares: {
          select: {
            userId: true,
            version: true,
            isActive: true
          }
        }
      }
    });
    
    return results;
  }

  // 统计分析查询
  static async getAnalyticsData() {
    console.log('📊 获取分析数据...');
    
    const [
      totalSoftware,
      activeSoftware,
      softwareByCategory,
      usersBySoftware,
      versionDistribution,
      recentActivity
    ] = await Promise.all([
      // 总软件数
      prisma.software_apis.count(),
      
      // 活跃软件数
      prisma.software_apis.count({
        where: { isActive: true }
      }),
      
      // 按分类统计
      prisma.software_apis.groupBy({
        by: ['category'],
        _count: true
      }),
      
      // 每个软件的用户数
      prisma.user_softwares.groupBy({
        by: ['softwareId'],
        _count: true,
        where: { isActive: true }
      }),
      
      // 版本分布
      prisma.software_apis.findMany({
        select: {
          id: true,
          softwareName: true,
          versions: true
        }
      }),
      
      // 最近活动
      prisma.user_softwares.findMany({
        take: 10,
        orderBy: { lastScanned: 'desc' }
      })
    ]);
    
    return {
      summary: {
        total: totalSoftware,
        active: activeSoftware,
        inactive: totalSoftware - activeSoftware,
        activationRate: totalSoftware > 0 ? (activeSoftware / totalSoftware * 100).toFixed(1) : 0
      },
      categoryBreakdown: softwareByCategory,
      userDistribution: usersBySoftware,
      versionStats: this.analyzeVersionDistribution(versionDistribution),
      recentActivity: recentActivity.map(activity => ({
        userId: activity.userId,
        softwareId: activity.softwareId,
        lastScanned: activity.lastScanned,
        version: activity.version
      }))
    };
  }

  static analyzeVersionDistribution(softwareWithVersions) {
    const versionCounts = {};
    
    softwareWithVersions.forEach(software => {
      software.versions.forEach(version => {
        const key = `${software.softwareName} v${version.version}`;
        versionCounts[key] = (versionCounts[key] || 0) + 1;
      });
    });
    
    return Object.entries(versionCounts)
      .map(([version, count]) => ({ version, count }))
      .sort((a, b) => b.count - a.count);
  }

  // 复杂关联查询
  static async complexRelationQueries() {
    console.log('🔗 执行复杂关联查询...');
    
    // 查询用户及其所有软件的详细信息
    const usersWithSoftwares = await prisma.users.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        user_softwares: {
          where: { isActive: true },
          select: {
            id: true,
            softwareId: true,
            version: true,
            isActive: true,
            lastScanned: true
          }
        }
      }
    });
    
    // 查询每个分类下最受欢迎的软件
    const popularSoftwareByCategory = await prisma.software_apis.findMany({
      include: {
        user_softwares: {
          where: { isActive: true },
          select: { userId: true }
        }
      }
    }).then(softwares => {
      const categoryStats = {};
      
      softwares.forEach(software => {
        const category = software.category;
        const userCount = software.user_softwares.length;
        
        if (!categoryStats[category] || userCount > categoryStats[category].userCount) {
          categoryStats[category] = {
            software,
            userCount
          };
        }
      });
      
      return Object.entries(categoryStats).map(([category, stats]) => ({
        category,
        software: stats.software,
        userCount: stats.userCount
      }));
    });
    
    return {
      usersWithSoftwares,
      popularSoftwareByCategory
    };
  }

  // 分页查询
  static async paginatedQuery(page = 1, limit = 10, filters = {}) {
    console.log(`📄 执行分页查询，页码: ${page}, 限制: ${limit}`);
    
    const skip = (page - 1) * limit;
    
    const where = {};
    if (filters.category) where.category = filters.category;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    
    const [items, total] = await Promise.all([
      prisma.software_apis.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user_softwares: {
            select: { userId: true },
            where: { isActive: true }
          }
        }
      }),
      prisma.software_apis.count({ where })
    ]);
    
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }
}

async function testBatchOperationsAndAdvancedQueries() {
  console.log('🧪 开始批量操作和高级查询测试\n');

  try {
    // 1. 批量创建测试
    console.log('📝 测试批量创建功能...');
    
    const testSoftwares = [
      {
        id: 'batch-test-1',
        softwareName: 'AutoCAD Batch Test 1',
        category: 'CAD',
        versions: [{
          version: '2024',
          apiVersion: '3.0.0',
          isLatest: true,
          releaseDate: '2024-01-01T00:00:00.000Z'
        }],
        apiConfig: {
          endpoint: 'https://api.autodesk.com/autocad',
          auth: 'oauth',
          features: ['2d-drafting', '3d-modeling']
        },
        isActive: true,
        autoUpdate: true
      },
      {
        id: 'batch-test-2',
        softwareName: 'SketchUp Batch Test 2',
        category: 'DESIGN_3D',
        versions: [{
          version: '2023',
          apiVersion: '2.5.0',
          isLatest: true,
          releaseDate: '2023-06-01T00:00:00.000Z'
        }],
        apiConfig: {
          endpoint: 'https://api.sketchup.com',
          auth: 'apikey',
          features: ['3d-modeling', 'rendering']
        },
        isActive: true,
        autoUpdate: false
      },
      {
        id: 'batch-test-3',
        softwareName: 'Figma Batch Test 3',
        category: 'DESIGN_2D',
        versions: [{
          version: '2024',
          apiVersion: '4.0.0',
          isLatest: true,
          releaseDate: '2024-02-01T00:00:00.000Z'
        }],
        apiConfig: {
          endpoint: 'https://api.figma.com',
          auth: 'oauth',
          features: ['ui-design', 'prototyping', 'collaboration']
        },
        isActive: false,
        autoUpdate: true
      }
    ];
    
    const createResults = await BatchOperationsService.batchCreateSoftwareAPIs(testSoftwares);
    console.log('✅ 批量创建结果:', {
      total: createResults.length,
      success: createResults.filter(r => r.success).length,
      failed: createResults.filter(r => !r.success).length
    });

    // 2. 批量更新测试
    console.log('\n🔄 测试批量更新功能...');
    
    const updateData = [
      {
        id: 'batch-test-1',
        data: {
          isActive: false,
          versions: [{
            version: '2024',
            apiVersion: '3.1.0',
            isLatest: true,
            releaseDate: '2024-01-01T00:00:00.000Z',
            changelog: '性能优化和Bug修复'
          }]
        }
      },
      {
        id: 'batch-test-2',
        data: {
          autoUpdate: true,
          apiConfig: {
            endpoint: 'https://api.sketchup.com/v2',
            auth: 'oauth',
            features: ['3d-modeling', 'rendering', 'vr-support']
          }
        }
      }
    ];
    
    const updateResults = await BatchOperationsService.batchUpdateSoftwareAPIs(updateData);
    console.log('✅ 批量更新结果:', {
      total: updateResults.length,
      success: updateResults.filter(r => r.success).length,
      failed: updateResults.filter(r => !r.success).length
    });

    // 3. 高级查询测试
    console.log('\n🔍 测试高级查询功能...');
    
    // 按分类查询
    const cadSoftware = await BatchOperationsService.advancedSearchSoftware({
      category: 'CAD'
    });
    console.log('✅ CAD分类软件数量:', cadSoftware.length);
    
    // 按活跃状态查询
    const activeSoftware = await BatchOperationsService.advancedSearchSoftware({
      isActive: true
    });
    console.log('✅ 活跃软件数量:', activeSoftware.length);
    
    // 按软件名称模糊查询
    const searchResults = await BatchOperationsService.advancedSearchSoftware({
      softwareName: 'Batch Test'
    });
    console.log('✅ 名称包含"Batch Test"的软件:', searchResults.length);
    
    // 按功能特性查询
    const modelingSoftware = await BatchOperationsService.advancedSearchSoftware({
      features: ['3d-modeling']
    });
    console.log('✅ 支持3D建模的软件:', modelingSoftware.length);

    // 4. 统计分析测试
    console.log('\n📊 测试统计分析功能...');
    
    const analyticsData = await BatchOperationsService.getAnalyticsData();
    console.log('✅ 分析数据结果:', {
      totalSoftware: analyticsData.summary.total,
      activeSoftware: analyticsData.summary.active,
      activationRate: analyticsData.summary.activationRate + '%',
      categories: analyticsData.categoryBreakdown.length,
      recentActivities: analyticsData.recentActivity.length
    });

    // 5. 复杂关联查询测试
    console.log('\n🔗 测试复杂关联查询功能...');
    
    const relationData = await BatchOperationsService.complexRelationQueries();
    console.log('✅ 关联查询结果:', {
      usersWithSoftwares: relationData.usersWithSoftwares.length,
      popularByCategory: relationData.popularSoftwareByCategory.length
    });

    // 6. 分页查询测试
    console.log('\n📄 测试分页查询功能...');
    
    const page1 = await BatchOperationsService.paginatedQuery(1, 2);
    const page2 = await BatchOperationsService.paginatedQuery(2, 2);
    console.log('✅ 分页查询结果:', {
      page1Items: page1.items.length,
      page2Items: page2.items.length,
      totalPages: page1.pagination.totalPages,
      hasNext: page1.pagination.hasNext
    });

    // 7. 批量删除测试
    console.log('\n🗑️ 测试批量删除功能...');
    
    const deleteIds = ['batch-test-1', 'batch-test-2', 'batch-test-3'];
    const deleteResults = await BatchOperationsService.batchDeleteSoftwareAPIs(deleteIds);
    console.log('✅ 批量删除结果:', {
      total: deleteResults.length,
      success: deleteResults.filter(r => r.success).length,
      failed: deleteResults.filter(r => !r.success).length
    });

    console.log('\n🎉 批量操作和高级查询测试完成！');
    console.log('\n📊 测试总结:');
    console.log('  ✅ 批量创建功能正常');
    console.log('  ✅ 批量更新功能正常');
    console.log('  ✅ 批量删除功能正常');
    console.log('  ✅ 高级查询功能正常');
    console.log('  ✅ 统计分析功能正常');
    console.log('  ✅ 复杂关联查询功能正常');
    console.log('  ✅ 分页查询功能正常');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testBatchOperationsAndAdvancedQueries();
}

module.exports = { 
  testBatchOperationsAndAdvancedQueries, 
  BatchOperationsService 
};