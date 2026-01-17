import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

export interface BackupConfig {
  backupDir: string;
  includeTables: string[];
  excludeTables?: string[];
  compress?: boolean;
  retentionDays?: number;
}

export interface BackupMetadata {
  id: string;
  filename: string;
  size: number;
  createdAt: Date;
  tables: string[];
  compressed: boolean;
}

export interface BackupStats {
  totalBackups: number;
  totalSize: number;
  latestBackup?: BackupMetadata;
  oldestBackup?: BackupMetadata;
}

export class BackupService {
  private prisma: PrismaClient;
  private config: BackupConfig;

  constructor(prisma?: PrismaClient, config?: Partial<BackupConfig>) {
    this.prisma = prisma || new PrismaClient();
    this.config = {
      backupDir: config?.backupDir || './backups',
      includeTables: config?.includeTables || [],
      excludeTables: config?.excludeTables || [],
      compress: config?.compress ?? true,
      retentionDays: config?.retentionDays || 30
    };
  }

  /**
   * 创建备份目录
   */
  private async ensureBackupDir(): Promise<void> {
    try {
      await fs.mkdir(this.config.backupDir, { recursive: true });
    } catch (error) {
      logger.error('创建备份目录失败:', error);
      throw new Error('创建备份目录失败');
    }
  }

  /**
   * 创建数据库备份
   */
  async createBackup(options?: { includeTables?: string[]; excludeTables?: string[] }): Promise<BackupMetadata> {
    try {
      await this.ensureBackupDir();

      const tablesToBackup = options?.includeTables || this.config.includeTables;
      const excludeTables = options?.excludeTables || this.config.excludeTables;

      const backupId = `backup-${Date.now()}`;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${backupId}-${timestamp}.json`;
      const filepath = path.join(this.config.backupDir, filename);

      const backupData: any = {
        id: backupId,
        timestamp: new Date().toISOString(),
        tables: {}
      };

      // 获取所有表名
      const allTables = await this.getAllTables();
      const tables = tablesToBackup.length > 0 ? tablesToBackup : allTables;

      for (const table of tables) {
        if (excludeTables?.includes(table)) continue;
        try {
          const data = await this.prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`);
          backupData.tables[table] = data;
          logger.info(`备份表 ${table}: ${Array.isArray(data) ? data.length : 0} 条记录`);
        } catch (error) {
          logger.warn(`备份表 ${table} 失败:`, error);
        }
      }

      // 写入备份文件
      const content = JSON.stringify(backupData, null, 2);
      await fs.writeFile(filepath, content, 'utf-8');

      const stats = await fs.stat(filepath);

      const metadata: BackupMetadata = {
        id: backupId,
        filename,
        size: stats.size,
        createdAt: new Date(),
        tables: Object.keys(backupData.tables),
        compressed: false
      };

      // 保存元数据
      await this.saveMetadata(metadata);

      logger.info(`备份创建成功: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      return metadata;
    } catch (error) {
      logger.error('创建备份失败:', error);
      throw new Error(`创建备份失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 恢复备份
   */
  async restoreBackup(backupId: string): Promise<{ success: boolean; message: string; restoredTables?: string[] }> {
    try {
      const metadata = await this.getMetadata(backupId);
      if (!metadata) {
        return { success: false, message: '备份不存在' };
      }

      const filepath = path.join(this.config.backupDir, metadata.filename);
      const content = await fs.readFile(filepath, 'utf-8');
      const backupData = JSON.parse(content);

      const restoredTables: string[] = [];

      for (const [tableName, data] of Object.entries(backupData.tables || {})) {
        try {
          // 删除现有数据
          await this.prisma.$queryRawUnsafe(`DELETE FROM "${tableName}"`);

          // 插入备份数据
          if (Array.isArray(data) && data.length > 0) {
            const columns = Object.keys(data[0]);
            for (const row of data as any[]) {
              const values = columns.map(col => {
                const val = row[col];
                if (val === null) return 'NULL';
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                if (val instanceof Date) return `'${val.toISOString()}'`;
                return val;
              });
              await this.prisma.$queryRawUnsafe(`INSERT INTO "${tableName}" (${columns.join(', ')}) VALUES (${values.join(', ')})`);
            }
          }
          restoredTables.push(tableName);
          logger.info(`恢复表 ${tableName} 成功`);
        } catch (error) {
          logger.error(`恢复表 ${tableName} 失败:`, error);
        }
      }

      logger.info(`备份恢复完成，共恢复 ${restoredTables.length} 个表`);

      return { success: true, message: '备份恢复成功', restoredTables };
    } catch (error) {
      logger.error('恢复备份失败:', error);
      return { success: false, message: `恢复备份失败: ${error instanceof Error ? error.message : '未知错误'}` };
    }
  }

  /**
   * 删除备份
   */
  async deleteBackup(backupId: string): Promise<{ success: boolean; message: string }> {
    try {
      const metadata = await this.getMetadata(backupId);
      if (!metadata) {
        return { success: false, message: '备份不存在' };
      }

      const filepath = path.join(this.config.backupDir, metadata.filename);
      await fs.unlink(filepath);

      await this.deleteMetadata(backupId);

      logger.info(`删除备份成功: ${metadata.filename}`);

      return { success: true, message: '删除备份成功' };
    } catch (error) {
      logger.error('删除备份失败:', error);
      return { success: false, message: '删除备份失败' };
    }
  }

  /**
   * 获取备份列表
   */
  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const metadataPath = path.join(this.config.backupDir, 'metadata.json');
      const content = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(content);
      return Object.values(metadata);
    } catch (error) {
      // 如果元数据文件不存在，从备份文件中扫描
      return await this.scanBackups();
    }
  }

  /**
   * 获取备份统计
   */
  async getStats(): Promise<BackupStats> {
    const backups = await this.listBackups();
    const sortedBackups = backups.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return {
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
      latestBackup: backups.length > 0 ? sortedBackups[sortedBackups.length - 1] : undefined,
      oldestBackup: backups.length > 0 ? sortedBackups[0] : undefined
    };
  }

  /**
   * 清理过期备份
   */
  async cleanupOldBackups(): Promise<{ deleted: number; message: string }> {
    try {
      const backups = await this.listBackups();
      const now = Date.now();
      const retentionMs = this.config.retentionDays! * 24 * 60 * 60 * 1000;

      const expiredBackups = backups.filter(b => now - b.createdAt.getTime() > retentionMs);
      let deletedCount = 0;

      for (const backup of expiredBackups) {
        const result = await this.deleteBackup(backup.id);
        if (result.success) {
          deletedCount++;
        }
      }

      logger.info(`清理过期备份完成，删除 ${deletedCount} 个备份`);

      return { deleted: deletedCount, message: `清理完成，删除了 ${deletedCount} 个过期备份` };
    } catch (error) {
      logger.error('清理过期备份失败:', error);
      return { deleted: 0, message: '清理失败' };
    }
  }

  /**
   * 获取所有表名
   */
  private async getAllTables(): Promise<string[]> {
    try {
      const tables = await this.prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      `;
      return tables.map(t => t.table_name);
    } catch (error) {
      logger.error('获取表列表失败:', error);
      return [];
    }
  }

  /**
   * 保存元数据
   */
  private async saveMetadata(metadata: BackupMetadata): Promise<void> {
    const metadataPath = path.join(this.config.backupDir, 'metadata.json');
    let allMetadata: Record<string, BackupMetadata> = {};

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      allMetadata = JSON.parse(content);
    } catch (error) {
      // 文件不存在，忽略
    }

    allMetadata[metadata.id] = metadata;
    await fs.writeFile(metadataPath, JSON.stringify(allMetadata, null, 2), 'utf-8');
  }

  /**
   * 获取元数据
   */
  private async getMetadata(backupId: string): Promise<BackupMetadata | null> {
    const backups = await this.listBackups();
    return backups.find(b => b.id === backupId) || null;
  }

  /**
   * 删除元数据
   */
  private async deleteMetadata(backupId: string): Promise<void> {
    const metadataPath = path.join(this.config.backupDir, 'metadata.json');
    let allMetadata: Record<string, BackupMetadata> = {};

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      allMetadata = JSON.parse(content);
      delete allMetadata[backupId];
      await fs.writeFile(metadataPath, JSON.stringify(allMetadata, null, 2), 'utf-8');
    } catch (error) {
      logger.error('删除元数据失败:', error);
    }
  }

  /**
   * 扫描备份文件
   */
  private async scanBackups(): Promise<BackupMetadata[]> {
    try {
      const files = await fs.readdir(this.config.backupDir);
      const backups: BackupMetadata[] = [];

      for (const file of files) {
        if (file.startsWith('backup-') && file.endsWith('.json') && file !== 'metadata.json') {
          const filepath = path.join(this.config.backupDir, file);
          const stats = await fs.stat(filepath);
          const match = file.match(/backup-([\d]+)-([\d-]+)\.json/);
          if (match) {
            backups.push({
              id: match[1],
              filename: file,
              size: stats.size,
              createdAt: stats.mtime,
              tables: [],
              compressed: file.endsWith('.json.gz')
            });
          }
        }
      }

      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      logger.error('扫描备份文件失败:', error);
      return [];
    }
  }

  /**
   * 获取备份列表 (别名方法，与listBackups功能相同)
   */
  async getBackupList(): Promise<BackupMetadata[]> {
    return await this.listBackups();
  }

  /**
   * 验证备份
   */
  async validateBackup(id: string): Promise<{
    valid: boolean;
    metadata?: BackupMetadata;
    issues: string[];
  }> {
    try {
      const backup = await this.getMetadata(id);

      if (!backup) {
        return {
          valid: false,
          issues: ['备份不存在']
        };
      }

      const issues: string[] = [];

      // 检查备份文件
      const backupPath = path.join(this.config.backupDir, backup.filename);

      if (!(await this.fileExists(backupPath))) {
        issues.push('备份文件不存在');
      } else {
        const stats = await fs.stat(backupPath);
        if (stats.size === 0) {
          issues.push('备份文件为空');
        }
      }

      // 检查备份年龄
      const backupAge = Date.now() - new Date(backup.createdAt).getTime();
      const maxAge = (this.config.retentionDays || 30) * 24 * 60 * 60 * 1000;

      if (backupAge > maxAge) {
        issues.push('备份已过期');
      }

      return {
        valid: issues.length === 0,
        metadata: backup,
        issues
      };
    } catch (error) {
      logger.error(`验证备份失败 ${id}`, error);
      throw error;
    }
  }

  /**
   * 测试备份恢复
   */
  async testBackupRestore(id: string): Promise<{
    success: boolean;
    message: string;
    tables?: string[];
  }> {
    try {
      const backup = await this.getMetadata(id);

      if (!backup) {
        return {
          success: false,
          message: '备份不存在'
        };
      }

      // 验证备份
      const validation = await this.validateBackup(id);
      if (!validation.valid) {
        return {
          success: false,
          message: `备份验证失败: ${validation.issues.join(', ')}`
        };
      }

      // 读取备份内容
      const backupPath = path.join(this.config.backupDir, backup.filename);
      const content = await fs.readFile(backupPath, 'utf-8');
      const backupData = JSON.parse(content);

      // 验证数据结构
      if (!backupData.tables || !Array.isArray(Object.keys(backupData.tables || {}))) {
        return {
          success: false,
          message: '备份数据结构无效'
        };
      }

      const tables = Object.keys(backupData.tables || {});

      return {
        success: true,
        message: `备份测试成功。包含 ${tables.length} 个表。`,
        tables
      };
    } catch (error) {
      logger.error(`测试备份恢复失败 ${id}`, error);
      return {
        success: false,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 导出备份
   */
  async exportBackup(id: string, exportPath: string): Promise<string> {
    try {
      const backup = await this.getMetadata(id);

      if (!backup) {
        throw new Error('备份不存在');
      }

      // 确保导出目录存在
      const exportDir = path.dirname(exportPath);
      await fs.mkdir(exportDir, { recursive: true });

      // 复制备份文件
      const sourcePath = path.join(this.config.backupDir, backup.filename);
      await fs.copyFile(sourcePath, exportPath);

      logger.info(`备份 ${id} 导出成功: ${exportPath}`);

      return exportPath;
    } catch (error) {
      logger.error(`导出备份失败 ${id}`, error);
      throw error;
    }
  }

  /**
   * 导入备份
   */
  async importBackup(filePath: string): Promise<BackupMetadata> {
    try {
      // 检查文件是否存在
      if (!(await this.fileExists(filePath))) {
        throw new Error('导入文件不存在');
      }

      // 确保备份目录存在
      await this.ensureBackupDir();

      // 读取备份文件
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const backupData = JSON.parse(content);

      // 创建新的元数据
      const backupId = `backup-${Date.now()}`;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${backupId}-${timestamp}.json`;

      // 复制备份文件
      const targetPath = path.join(this.config.backupDir, filename);
      await fs.copyFile(filePath, targetPath);

      // 创建元数据
      const metadata: BackupMetadata = {
        id: backupId,
        filename,
        size: stats.size,
        createdAt: new Date(),
        tables: Object.keys(backupData.tables || {}),
        compressed: filename.endsWith('.gz')
      };

      // 保存元数据
      await this.saveMetadata(metadata);

      logger.info(`备份导入成功: ${filePath}`);

      return metadata;
    } catch (error) {
      logger.error(`导入备份失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export const backupService = new BackupService();
