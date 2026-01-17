import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { existsSync, statSync, readFileSync, writeFileSync, mkdirSync, createReadStream, createWriteStream, chmodSync } from 'fs';
import { platform, homedir } from 'os';
import { join, dirname, basename, extname } from 'path';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

const execAsync = promisify(exec);

export interface BackupInfo {
  id: string;
  softwareName: string;
  originalPath: string;
  backupPath: string;
  createdAt: Date;
  size: number;
  compressedSize: number;
  version?: string;
  checksum: string;
  type: 'full' | 'incremental' | 'differential';
  includes: string[];
  metadata: {
    platform: string;
    arch: string;
    dependencies?: string[];
    registryKeys?: string[];
    permissions?: string;
  };
}

export interface RestoreResult {
  success: boolean;
  backupInfo: BackupInfo;
  restoredPath?: string;
  message: string;
  warnings: string[];
  errors: string[];
  performedAt: Date;
}

export interface BackupOptions {
  includeRegistry?: boolean;
  includeDependencies?: boolean;
  includeConfig?: boolean;
  compression?: 'none' | 'gzip' | 'zip';
  type?: 'full' | 'incremental' | 'differential';
  excludePatterns?: string[];
}

export interface RestoreOptions {
  validateChecksums?: boolean;
  backupCurrent?: boolean;
  overwriteExisting?: boolean;
  restoreRegistry?: boolean;
  preservePermissions?: boolean;
}

export class PathBackupService {
  private platform: NodeJS.Platform;
  private backupDir: string;
  private metadataPath: string;
  private backups: Map<string, BackupInfo> = new Map();
  private compressionMethods = {
    none: { ext: '.bak', compress: (stream: any) => stream },
    gzip: { ext: '.gz', compress: (stream: any) => stream.pipe(createGzip()) },
    zip: { ext: '.zip', compress: (stream: any) => stream } // 需要archiver库
  };

  constructor() {
    this.platform = platform();
    this.initializePaths();
    this.loadBackupMetadata();
  }

  /**
   * 初始化路径
   */
  private initializePaths(): void {
    const configDir = join(process.cwd(), 'config');
    const backupDir = join(configDir, 'backups');
    
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    this.backupDir = backupDir;
    this.metadataPath = join(backupDir, 'metadata.json');
  }

  /**
   * 加载备份元数据
   */
  private loadBackupMetadata(): void {
    try {
      if (existsSync(this.metadataPath)) {
        const metadata = JSON.parse(readFileSync(this.metadataPath, 'utf-8'));
        Object.entries(metadata).forEach(([id, backup]) => {
          const backupInfo = backup as BackupInfo;
          backupInfo.createdAt = new Date(backupInfo.createdAt);
          this.backups.set(id, backupInfo);
        });
      }
    } catch (error) {
      console.warn('加载备份元数据失败:', error);
    }
  }

  /**
   * 保存备份元数据
   */
  private saveBackupMetadata(): void {
    try {
      const metadata: Record<string, BackupInfo> = {};
      this.backups.forEach((backup, id) => {
        metadata[id] = backup;
      });
      writeFileSync(this.metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('保存备份元数据失败:', error);
    }
  }

  /**
   * 创建备份
   */
  async createBackup(
    softwareName: string,
    path: string,
    options: BackupOptions = {}
  ): Promise<BackupInfo | null> {
    try {
      if (!existsSync(path)) {
        throw new Error('源路径不存在');
      }

      const stats = statSync(path);
      const backupId = this.generateBackupId(softwareName);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const compressionMethod = options.compression || 'gzip';
      const compression = this.compressionMethods[compressionMethod];
      
      const backupFileName = `${softwareName}_${timestamp}${compression.ext}`;
      const backupPath = join(this.backupDir, backupFileName);

      // 获取版本信息
      const version = await this.extractSoftwareVersion(softwareName, path);

      // 创建备份
      const backupSize = await this.performBackup(softwareName, path, backupPath, options);
      
      // 获取压缩后大小
      const compressedStats = statSync(backupPath);
      const compressedSize = compressedStats.size;

      // 计算校验和
      const checksum = await this.calculateChecksum(backupPath);

      const backupInfo: BackupInfo = {
        id: backupId,
        softwareName,
        originalPath: path,
        backupPath,
        createdAt: new Date(),
        size: backupSize,
        compressedSize,
        version,
        checksum,
        type: options.type || 'full',
        includes: await this.getBackupIncludes(path, options),
        metadata: {
          platform: this.platform,
          arch: process.arch,
          dependencies: options.includeDependencies ? await this.getDependencies(softwareName) : undefined,
          registryKeys: options.includeRegistry ? await this.getRegistryKeys(softwareName) : undefined,
          permissions: this.getFilePermissions(path)
        }
      };

      // 保存元数据
      this.backups.set(backupId, backupInfo);
      this.saveBackupMetadata();

      console.log(`✅ 备份创建成功: ${backupFileName}`);
      return backupInfo;

    } catch (error) {
      console.error(`❌ 创建备份失败 ${softwareName}:`, error);
      return null;
    }
  }

  /**
   * 执行备份
   */
  private async performBackup(
    softwareName: string,
    sourcePath: string,
    backupPath: string,
    options: BackupOptions
  ): Promise<number> {
    const stats = statSync(sourcePath);
    let totalSize = 0;

    if (stats.isFile()) {
      // 单文件备份
      totalSize = await this.backupFile(sourcePath, backupPath, options);
    } else if (stats.isDirectory()) {
      // 目录备份
      totalSize = await this.backupDirectory(sourcePath, backupPath, softwareName, options);
    }

    return totalSize;
  }

  /**
   * 备份文件
   */
  private async backupFile(
    sourceFile: string,
    backupFile: string,
    options: BackupOptions
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        const readStream = createReadStream(sourceFile);
        let writeStream: any = createWriteStream(backupFile);
        
        // 应用压缩
        const compression = this.compressionMethods[options.compression || 'gzip'];
        writeStream = compression.compress(writeStream);

        let size = 0;
        readStream.on('data', (chunk) => {
          size += chunk.length;
        });

        writeStream.on('finish', () => resolve(size));
        writeStream.on('error', reject);

        readStream.pipe(writeStream);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 备份目录
   */
  private async backupDirectory(
    sourceDir: string,
    backupPath: string,
    softwareName: string,
    options: BackupOptions
  ): Promise<number> {
    const compression = options.compression || 'gzip';
    
    if (compression === 'zip') {
      // 使用zip压缩（需要archiver库）
      return await this.backupDirectoryZip(sourceDir, backupPath, options);
    } else {
      // 使用tar + gzip（Unix）或7z（Windows）
      return await this.backupDirectoryTar(sourceDir, backupPath, options);
    }
  }

  /**
   * 使用tar备份目录
   */
  private async backupDirectoryTar(
    sourceDir: string,
    backupPath: string,
    options: BackupOptions
  ): Promise<number> {
    try {
      let command = '';
      
      if (this.platform === 'win32') {
        // Windows使用7z
        command = `7z a "${backupPath}" "${sourceDir}"`;
        if (options.excludePatterns) {
          options.excludePatterns.forEach(pattern => {
            command += ` -xr!${pattern}`;
          });
        }
      } else {
        // Unix使用tar
        command = `tar -czf "${backupPath}" -C "${dirname(sourceDir)}" "${basename(sourceDir)}"`;
        if (options.excludePatterns) {
          options.excludePatterns.forEach(pattern => {
            command += ` --exclude=${pattern}`;
          });
        }
      }

      await execAsync(command);
      
      // 获取备份大小
      const stats = statSync(backupPath);
      return stats.size;
      
    } catch (error) {
      throw new Error(`目录备份失败: ${error}`);
    }
  }

  /**
   * 使用zip备份目录（需要archiver库）
   */
  private async backupDirectoryZip(
    sourceDir: string,
    backupPath: string,
    options: BackupOptions
  ): Promise<number> {
    // 这里需要安装archiver库
    // 简化实现，使用系统命令
    return this.backupDirectoryTar(sourceDir, backupPath.replace('.zip', '.tar.gz'), options);
  }

  /**
   * 恢复备份
   */
  async restoreBackup(
    backupId: string,
    restorePath?: string,
    options: RestoreOptions = {}
  ): Promise<RestoreResult> {
    const backupInfo = this.backups.get(backupId);
    if (!backupInfo) {
      return {
        success: false,
        backupInfo: {} as BackupInfo,
        message: '备份不存在',
        warnings: [],
        errors: ['备份ID无效'],
        performedAt: new Date()
      };
    }

    const warnings: string[] = [];
    const errors: string[] = [];
    let finalRestorePath = restorePath || backupInfo.originalPath;

    try {
      // 验证备份文件完整性
      if (options.validateChecksums !== false) {
        const isValid = await this.validateBackupIntegrity(backupInfo);
        if (!isValid) {
          errors.push('备份文件校验和不匹配');
        }
      }

      // 备份当前状态（如果需要）
      if (options.backupCurrent && existsSync(finalRestorePath)) {
        await this.createBackup(
          backupInfo.softwareName + '_pre_restore',
          finalRestorePath,
          { type: 'incremental' }
        );
      }

      // 执行恢复
      await this.performRestore(backupInfo, finalRestorePath, options);

      // 恢复权限
      if (options.preservePermissions !== false && backupInfo.metadata.permissions) {
        await this.restorePermissions(finalRestorePath, backupInfo.metadata.permissions);
      }

      // 恢复注册表项
      if (options.restoreRegistry && backupInfo.metadata.registryKeys) {
        await this.restoreRegistry(backupInfo.metadata.registryKeys);
        warnings.push('注册表项已恢复，可能需要重启系统');
      }

      return {
        success: errors.length === 0,
        backupInfo,
        restoredPath: finalRestorePath,
        message: errors.length === 0 ? '恢复成功' : '恢复完成，但存在错误',
        warnings,
        errors,
        performedAt: new Date()
      };

    } catch (error) {
      return {
        success: false,
        backupInfo,
        message: `恢复失败: ${error instanceof Error ? error.message : '未知错误'}`,
        warnings,
        errors: [error instanceof Error ? error.message : '未知错误'],
        performedAt: new Date()
      };
    }
  }

  /**
   * 执行恢复
   */
  private async performRestore(
    backupInfo: BackupInfo,
    restorePath: string,
    options: RestoreOptions
  ): Promise<void> {
    const { backupPath, originalPath } = backupInfo;

    // 创建目标目录
    const targetDir = dirname(restorePath);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // 检测压缩类型
    const ext = extname(backupPath);
    
    if (ext === '.gz' || ext === '.tgz') {
      // gzip解压
      await this.extractTarGz(backupPath, restorePath, options);
    } else if (ext === '.zip') {
      // zip解压
      await this.extractZip(backupPath, restorePath, options);
    } else if (ext === '.bak') {
      // 直接复制
      await this.copyDirectory(backupPath, restorePath, options);
    } else {
      throw new Error(`不支持的备份格式: ${ext}`);
    }
  }

  /**
   * 解压tar.gz文件
   */
  private async extractTarGz(
    archivePath: string,
    extractPath: string,
    options: RestoreOptions
  ): Promise<void> {
    try {
      let command = '';
      
      if (this.platform === 'win32') {
        command = `7z x "${archivePath}" -o"${extractPath}"`;
        if (options.overwriteExisting) {
          command += ' -y';
        }
      } else {
        command = `tar -xzf "${archivePath}" -C "${extractPath}"`;
        if (options.overwriteExisting) {
          command += ' --overwrite';
        }
      }

      await execAsync(command);
    } catch (error) {
      throw new Error(`解压失败: ${error}`);
    }
  }

  /**
   * 解压zip文件
   */
  private async extractZip(
    archivePath: string,
    extractPath: string,
    options: RestoreOptions
  ): Promise<void> {
    try {
      let command = '';
      
      if (this.platform === 'win32') {
        command = `7z x "${archivePath}" -o"${extractPath}"`;
        if (options.overwriteExisting) {
          command += ' -y';
        }
      } else {
        command = `unzip "${archivePath}" -d "${extractPath}"`;
        if (options.overwriteExisting) {
          command += ' -o';
        }
      }

      await execAsync(command);
    } catch (error) {
      throw new Error(`解压失败: ${error}`);
    }
  }

  /**
   * 复制目录
   */
  private async copyDirectory(
    sourcePath: string,
    targetPath: string,
    options: RestoreOptions
  ): Promise<void> {
    try {
      let command = '';
      
      if (this.platform === 'win32') {
        command = `xcopy "${sourcePath}" "${targetPath}" /E /I`;
        if (options.overwriteExisting) {
          command += ' /Y';
        }
      } else {
        command = `cp -r "${sourcePath}" "${targetPath}"`;
        if (options.overwriteExisting) {
          command += ' --force';
        }
      }

      await execAsync(command);
    } catch (error) {
      throw new Error(`复制失败: ${error}`);
    }
  }

  /**
   * 验证备份完整性
   */
  private async validateBackupIntegrity(backupInfo: BackupInfo): Promise<boolean> {
    try {
      if (!existsSync(backupInfo.backupPath)) {
        return false;
      }

      // 验证文件大小
      const stats = statSync(backupInfo.backupPath);
      if (stats.size !== backupInfo.compressedSize) {
        return false;
      }

      // 验证校验和
      const currentChecksum = await this.calculateChecksum(backupInfo.backupPath);
      return currentChecksum === backupInfo.checksum;

    } catch (error) {
      console.warn('验证备份完整性失败:', error);
      return false;
    }
  }

  /**
   * 恢复权限
   */
  private async restorePermissions(path: string, permissions: string): Promise<void> {
    try {
      if (this.platform === 'win32') {
        // Windows权限恢复
        await execAsync(`icacls "${path}" /set "${permissions}"`);
      } else {
        // Unix权限恢复
        const mode = parseInt(permissions, 8);
        chmodSync(path, mode);
      }
    } catch (error) {
      console.warn('权限恢复失败:', error);
    }
  }

  /**
   * 恢复注册表
   */
  private async restoreRegistry(registryKeys: string[]): Promise<void> {
    if (this.platform !== 'win32') return;

    for (const key of registryKeys) {
      try {
        await execAsync(`reg import "${key}"`);
      } catch (error) {
        console.warn(`注册表恢复失败 ${key}:`, error);
      }
    }
  }

  /**
   * 获取所有备份
   */
  getAllBackups(): BackupInfo[] {
    return Array.from(this.backups.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 获取软件的备份
   */
  getBackupsBySoftware(softwareName: string): BackupInfo[] {
    return Array.from(this.backups.values())
      .filter(backup => backup.softwareName === softwareName)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 删除备份
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const backupInfo = this.backups.get(backupId);
      if (!backupInfo) {
        return false;
      }

      // 删除备份文件
      if (existsSync(backupInfo.backupPath)) {
        await execAsync(this.platform === 'win32' ? `del "${backupInfo.backupPath}"` : `rm "${backupInfo.backupPath}"`);
      }

      // 删除元数据
      this.backups.delete(backupId);
      this.saveBackupMetadata();

      return true;
    } catch (error) {
      console.error('删除备份失败:', error);
      return false;
    }
  }

  /**
   * 清理旧备份
   */
  async cleanupOldBackups(maxAge: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
    const oldBackups = Array.from(this.backups.entries())
      .filter(([_, backup]) => backup.createdAt < cutoffDate);

    let deletedCount = 0;
    for (const [backupId, _] of oldBackups) {
      if (await this.deleteBackup(backupId)) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * 导出备份
   */
  async exportBackup(backupId: string, exportPath: string): Promise<boolean> {
    try {
      const backupInfo = this.backups.get(backupId);
      if (!backupInfo) {
        return false;
      }

      // 复制备份文件到导出路径
      if (this.platform === 'win32') {
        await execAsync(`copy "${backupInfo.backupPath}" "${exportPath}"`);
      } else {
        await execAsync(`cp "${backupInfo.backupPath}" "${exportPath}"`);
      }

      // 导出元数据
      const metadataPath = exportPath.replace(/\.[^.]+$/, '_metadata.json');
      writeFileSync(metadataPath, JSON.stringify(backupInfo, null, 2));

      return true;
    } catch (error) {
      console.error('导出备份失败:', error);
      return false;
    }
  }

  /**
   * 获取备份统计
   */
  getBackupStats(): {
    totalBackups: number;
    totalSize: number;
    compressedSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
    softwareCount: number;
  } {
    const backups = Array.from(this.backups.values());
    
    return {
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, backup) => sum + backup.size, 0),
      compressedSize: backups.reduce((sum, backup) => sum + backup.compressedSize, 0),
      oldestBackup: backups.length > 0 ?
        new Date(Math.min(...backups.map(b => b.createdAt.getTime()))) : undefined,
      newestBackup: backups.length > 0 ? new Date(Math.max(...backups.map(b => b.createdAt.getTime()))) : undefined,
      softwareCount: new Set(backups.map(b => b.softwareName)).size
    };
  }

  /**
   * 辅助方法
   */
  private generateBackupId(softwareName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${softwareName}_${timestamp}_${random}`;
  }

  private async extractSoftwareVersion(softwareName: string, path: string): Promise<string | undefined> {
    try {
      let command = '';
      
      if (softwareName.toLowerCase().includes('blender')) {
        command = `"${path}" --version`;
      } else if (softwareName.toLowerCase().includes('git')) {
        command = 'git --version';
      } else if (softwareName.toLowerCase().includes('node')) {
        command = 'node --version';
      }

      if (command) {
        const { stdout } = await execAsync(command);
        const versionMatch = stdout.match(/(\d+\.\d+(\.\d+)?)/);
        return versionMatch ? versionMatch[1] : undefined;
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private async getBackupIncludes(path: string, options: BackupOptions): Promise<string[]> {
    try {
      const stats = statSync(path);
      if (stats.isFile()) {
        return [basename(path)];
      } else {
        const items = require('fs').readdirSync(path);
        let includes = items;
        
        if (options.excludePatterns) {
          includes = items.filter(item => 
            !options.excludePatterns!.some(pattern => item.includes(pattern))
          );
        }

        return includes;
      }
    } catch (error) {
      return [];
    }
  }

  private async getDependencies(softwareName: string): Promise<string[]> {
    // 简化实现：返回常见依赖
    const commonDeps: Record<string, string[]> = {
      'blender': ['Python', 'OpenGL'],
      'vscode': ['Node.js', 'Git'],
      'git': ['OpenSSL'],
      'node': ['npm', 'python']
    };

    return commonDeps[softwareName.toLowerCase()] || [];
  }

  private async getRegistryKeys(softwareName: string): Promise<string[]> {
    if (this.platform !== 'win32') return [];

    try {
      const { stdout } = await execAsync(`reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*" /s /f "${softwareName}"`);
      const matches = stdout.match(/HK_[^{]+\/([^}]+)/g);
      return matches ? matches.map(match => match.split('/')[1]) : [];
    } catch (error) {
      return [];
    }
  }

  private getFilePermissions(path: string): string {
    try {
      const stats = statSync(path);
      if (this.platform === 'win32') {
        return stats.mode.toString(8);
      } else {
        return (stats.mode & 0o777).toString(8);
      }
    } catch (error) {
      return '755';
    }
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    try {
      if (this.platform === 'win32') {
        const { stdout } = await execAsync(`certutil -hashfile "${filePath}" SHA256`);
        return stdout.split('\n')[1].trim();
      } else {
        const { stdout } = await execAsync(`shasum -a 256 "${filePath}"`);
        return stdout.split(' ')[0];
      }
    } catch (error) {
      return '';
    }
  }
}