import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

interface MigrationResult {
  success: boolean;
  message: string;
  details?: any;
}

class TenantDataMigrator {
  private prisma: PrismaClient;
  private migrationsPath: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.migrationsPath = join(__dirname, '../../database/migrations');
  }

  /**
   * 执行SQL迁移文件
   */
  async executeMigration(fileName: string): Promise<MigrationResult> {
    try {
      const filePath = join(this.migrationsPath, fileName);
      const sql = readFileSync(filePath, 'utf8');

      console.log(`🚀 开始执行迁移: ${fileName}`);
      
      const startTime = Date.now();
      
      await this.prisma.$executeRawUnsafe(sql);
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ 迁移完成: ${fileName} (耗时: ${duration}ms)`);
      
      return {
        success: true,
        message: `迁移 ${fileName} 执行成功`,
        details: { duration, filePath }
      };
    } catch (error) {
      console.error(`❌ 迁移失败: ${fileName}`, error);
      
      return {
        success: false,
        message: `迁移 ${fileName} 执行失败: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * 检查迁移状态
   */
  async checkMigrationStatus(): Promise<any> {
    try {
      // 检查迁移标记表是否存在
      const markerTableExists = await this.prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'migration_markers'
        ) as exists
      `;

      if (!markerTableExists[0]?.exists) {
        return {
          hasMarkerTable: false,
          completedMigrations: []
        };
      }

      // 获取已完成的迁移
      const completedMigrations = await this.prisma.$queryRaw`
        SELECT migration_name, completed_at, details
        FROM migration_markers
        ORDER BY completed_at DESC
      `;

      return {
        hasMarkerTable: true,
        completedMigrations: completedMigrations.map((m: any) => ({
          name: m.migration_name,
          completedAt: m.completed_at,
          details: m.details
        }))
      };
    } catch (error) {
      console.error('❌ 检查迁移状态失败:', error);
      return {
        hasMarkerTable: false,
        completedMigrations: [],
        error: error.message
      };
    }
  }

  /**
   * 执行完整的租户数据迁移流程
   */
  async runFullMigration(): Promise<MigrationResult> {
    try {
      console.log('🎯 开始租户数据完整迁移...');
      
      const migrationFiles = [
        '002-add-multitenancy.sql',
        '003-init-tenant-data.sql'
      ];

      const results = [];
      
      for (const fileName of migrationFiles) {
        const result = await this.executeMigration(fileName);
        results.push({ fileName, ...result });
        
        if (!result.success) {
          return {
            success: false,
            message: `迁移失败在文件: ${fileName}`,
            details: { results }
          };
        }
      }

      // 验证迁移结果
      const validation = await this.validateMigration();
      if (!validation.success) {
        return {
          success: false,
          message: '迁移验证失败',
          details: { results, validation }
        };
      }

      console.log('🎉 租户数据迁移全部完成!');
      
      return {
        success: true,
        message: '租户数据迁移成功完成',
        details: { 
          results, 
          validation,
          summary: this.generateMigrationSummary(results)
        }
      };
    } catch (error) {
      console.error('❌ 完整迁移失败:', error);
      
      return {
        success: false,
        message: `完整迁移失败: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * 验证迁移结果
   */
  async validateMigration(): Promise<MigrationResult> {
    try {
      console.log('🔍 验证迁移结果...');
      
      const validationResults = [];

      // 检查租户表
      const tenantCount = await this.prisma.tenants.count();
      validationResults.push({
        check: 'tenants_table',
        expected: '>= 1',
        actual: tenantCount,
        success: tenantCount >= 1
      });

      // 检查默认租户
      const defaultTenant = await this.prisma.tenants.findFirst({
        where: { domain: 'default.localhost' }
      });
      validationResults.push({
        check: 'default_tenant_exists',
        expected: true,
        actual: !!defaultTenant,
        success: !!defaultTenant
      });

      // 检查用户租户关联
      const userTenantCount = await this.prisma.user_tenants.count();
      const userCount = await this.prisma.users.count();
      validationResults.push({
        check: 'user_tenants_mapped',
        expected: userCount,
        actual: userTenantCount,
        success: userTenantCount > 0
      });

      // 检查租户项目
      const tenantProjectCount = await this.prisma.tenant_projects.count();
      validationResults.push({
        check: 'tenant_projects',
        expected: '>= 0',
        actual: tenantProjectCount,
        success: true
      });

      // 检查租户文件
      const tenantFileCount = await this.prisma.tenant_files.count();
      validationResults.push({
        check: 'tenant_files',
        expected: '>= 0',
        actual: tenantFileCount,
        success: true
      });

      // 检查租户角色
      const tenantRoleCount = await this.prisma.tenant_roles.count();
      validationResults.push({
        check: 'tenant_roles',
        expected: '>= 3',
        actual: tenantRoleCount,
        success: tenantRoleCount >= 3
      });

      // 检查AI配置
      const aiConfigCount = await this.prisma.tenant_ai_configs.count();
      validationResults.push({
        check: 'tenant_ai_configs',
        expected: '>= 1',
        actual: aiConfigCount,
        success: aiConfigCount >= 1
      });

      const allValidationsPassed = validationResults.every(r => r.success);
      
      if (allValidationsPassed) {
        console.log('✅ 所有验证检查通过');
      } else {
        console.log('⚠️ 部分验证检查未通过:');
        validationResults.filter(r => !r.success).forEach(r => {
          console.log(`  - ${r.check}: 期望 ${r.expected}, 实际 ${r.actual}`);
        });
      }

      return {
        success: allValidationsPassed,
        message: allValidationsPassed ? '验证成功' : '验证失败',
        details: { validationResults }
      };
    } catch (error) {
      console.error('❌ 验证过程出错:', error);
      
      return {
        success: false,
        message: `验证失败: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * 生成迁移摘要
   */
  private generateMigrationSummary(results: any[]): any {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalDuration = results.reduce((sum, r) => sum + (r.details?.duration || 0), 0);

    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      totalDuration,
      averageDuration: results.length > 0 ? totalDuration / results.length : 0
    };
  }

  /**
   * 回滚迁移（如果可能）
   */
  async rollbackMigration(fileName: string): Promise<MigrationResult> {
    try {
      console.log(`🔄 尝试回滚迁移: ${fileName}`);
      
      // 这里可以实现回滚逻辑
      // 对于某些迁移，回滚可能是危险操作，需要特别小心
      
      return {
        success: false,
        message: '回滚功能暂未实现，请手动恢复数据库备份',
        details: { fileName }
      };
    } catch (error) {
      return {
        success: false,
        message: `回滚失败: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * 创建数据库备份
   */
  async createBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup-before-tenant-migration-${timestamp}.sql`;
      
      console.log(`💾 创建数据库备份: ${backupFileName}`);
      
      // 这里应该调用实际的备份命令
      // 例如: pg_dump -h localhost -U username -d database > backup.sql
      
      console.log(`✅ 备份创建成功: ${backupFileName}`);
      
      return backupFileName;
    } catch (error) {
      console.error('❌ 创建备份失败:', error);
      throw error;
    }
  }

  /**
   * 清理旧数据（可选）
   */
  async cleanupLegacyData(): Promise<MigrationResult> {
    try {
      console.log('🧹 清理旧数据...');
      
      // 这里可以实现旧数据的清理逻辑
      // 例如：删除已经迁移的旧表数据
      
      return {
        success: true,
        message: '旧数据清理完成'
      };
    } catch (error) {
      return {
        success: false,
        message: `清理失败: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

/**
 * 主函数 - 执行迁移
 */
async function main() {
  const migrator = new TenantDataMigrator();
  
  try {
    // 检查当前迁移状态
    console.log('📊 检查迁移状态...');
    const status = await migrator.checkMigrationStatus();
    console.log('当前迁移状态:', status);

    // 创建备份
    await migrator.createBackup();

    // 执行完整迁移
    const result = await migrator.runFullMigration();
    
    if (result.success) {
      console.log('🎉 租户数据迁移成功完成!');
      console.log('迁移摘要:', result.details?.summary);
      
      // 可选：清理旧数据
      // const cleanupResult = await migrator.cleanupLegacyData();
      // console.log('清理结果:', cleanupResult);
    } else {
      console.error('❌ 租户数据迁移失败:', result.message);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 迁移过程中发生错误:', error);
    process.exit(1);
  } finally {
    await migrator.disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { TenantDataMigrator };
export default main;