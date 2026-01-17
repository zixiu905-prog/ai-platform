import { existsSync, statSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs';
import { platform, homedir } from 'os';
import { join, dirname, basename } from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PathLockInfo {
  softwareName: string;
  originalPath: string;
  currentPath: string;
  isLocked: boolean;
  lockType: 'readonly' | 'hidden' | 'protected' | 'registry' | 'full';
  createdAt: Date;
  lastVerified?: Date;
  verificationStatus: 'valid' | 'modified' | 'missing' | 'corrupted';
  checksum?: string;
}

export interface LockOperationResult {
  success: boolean;
  message: string;
  error?: string;
  previousState?: PathLockInfo;
  newState?: PathLockInfo;
}

export interface VerificationResult {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
  pathChanges: Array<{
    path: string;
    status: 'added' | 'removed' | 'modified';
    timestamp: Date;
  }>;
}

export class PathLockService {
  private platform: NodeJS.Platform;
  private locksPath: string;
  private backupPath: string;
  private locks: Map<string, PathLockInfo> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.platform = platform();
    this.initializePaths();
    this.loadLocks();
  }

  /**
   * 初始化路径
   */
  private initializePaths(): void {
    const configDir = join(process.cwd(), 'config');
    const locksDir = join(configDir, 'locks');
    const backupDir = join(configDir, 'backups');

    [configDir, locksDir, backupDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });

    this.locksPath = join(locksDir, 'path-locks.json');
    this.backupPath = join(backupDir, 'path-backups.json');
  }

  /**
   * 加载锁配置
   */
  private loadLocks(): void {
    try {
      if (existsSync(this.locksPath)) {
        const locksData = JSON.parse(readFileSync(this.locksPath, 'utf-8'));
        Object.entries(locksData).forEach(([key, lock]) => {
          const lockInfo = lock as PathLockInfo;
          lockInfo.createdAt = new Date(lockInfo.createdAt);
          if (lockInfo.lastVerified) {
            lockInfo.lastVerified = new Date(lockInfo.lastVerified);
          }
          this.locks.set(key, lockInfo);
        });
      }
    } catch (error) {
      console.warn('加载路径锁配置失败:', error);
    }
  }

  /**
   * 保存锁配置
   */
  private saveLocks(): void {
    try {
      const locksData: Record<string, PathLockInfo> = {};
      this.locks.forEach((lock, key) => {
        locksData[key] = lock;
      });
      writeFileSync(this.locksPath, JSON.stringify(locksData, null, 2));
    } catch (error) {
      console.error('保存路径锁配置失败:', error);
    }
  }

  /**
   * 锁定软件路径
   */
  async lockPath(
    softwareName: string, 
    path: string, 
    lockType: PathLockInfo['lockType'] = 'readonly'
  ): Promise<LockOperationResult> {
    try {
      // 验证路径是否存在
      if (!existsSync(path)) {
        return {
          success: false,
          message: '路径不存在，无法锁定'
        };
      }

      const key = this.generateLockKey(softwareName, path);
      const existingLock = this.locks.get(key);

      // 如果已经锁定，返回当前状态
      if (existingLock && existingLock.isLocked) {
        return {
          success: true,
          message: '路径已经锁定',
          newState: existingLock
        };
      }

      // 创建路径备份
      await this.createPathBackup(softwareName, path);

      // 计算路径校验和
      const checksum = await this.calculatePathChecksum(path);

      // 应用锁定
      await this.applyPathLock(path, lockType);

      const lockInfo: PathLockInfo = {
        softwareName,
        originalPath: path,
        currentPath: path,
        isLocked: true,
        lockType,
        createdAt: new Date(),
        lastVerified: new Date(),
        verificationStatus: 'valid',
        checksum
      };

      this.locks.set(key, lockInfo);
      this.saveLocks();

      // 启动监控
      this.startMonitoring(key, path, lockType);

      return {
        success: true,
        message: '路径锁定成功',
        newState: lockInfo
      };

    } catch (error) {
      return {
        success: false,
        message: '锁定失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 解锁软件路径
   */
  async unlockPath(softwareName: string, path: string): Promise<LockOperationResult> {
    try {
      const key = this.generateLockKey(softwareName, path);
      const lockInfo = this.locks.get(key);

      if (!lockInfo || !lockInfo.isLocked) {
        return {
          success: false,
          message: '路径未锁定'
        };
      }

      // 停止监控
      this.stopMonitoring(key);

      // 移除锁定
      await this.removePathLock(path, lockInfo.lockType);

      // 更新状态
      lockInfo.isLocked = false;
      lockInfo.lastVerified = new Date();
      lockInfo.verificationStatus = 'valid';

      this.locks.set(key, lockInfo);
      this.saveLocks();

      return {
        success: true,
        message: '路径解锁成功',
        previousState: { ...lockInfo, isLocked: true },
        newState: lockInfo
      };

    } catch (error) {
      return {
        success: false,
        message: '解锁失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 应用路径锁定
   */
  private async applyPathLock(path: string, lockType: PathLockInfo['lockType']): Promise<void> {
    switch (this.platform) {
      case 'win32':
        await this.applyWindowsLock(path, lockType);
        break;
      case 'darwin':
        await this.applyMacLock(path, lockType);
        break;
      case 'linux':
        await this.applyLinuxLock(path, lockType);
        break;
    }
  }

  /**
   * 应用Windows锁定
   */
  private async applyWindowsLock(path: string, lockType: PathLockInfo['lockType']): Promise<void> {
    const stats = statSync(path);
    
    if (stats.isFile()) {
      switch (lockType) {
        case 'readonly':
          // 设置文件为只读
          await execAsync(`attrib +R "${path}"`);
          break;
        case 'hidden':
          // 隐藏文件
          await execAsync(`attrib +H "${path}"`);
          break;
        case 'protected':
          // 只读 + 隐藏
          await execAsync(`attrib +R +H "${path}"`);
          break;
        case 'registry':
          // 注册表保护（需要管理员权限）
          await this.protectWithRegistry(path);
          break;
        case 'full':
          // 完全保护：只读 + 隐藏 + 系统文件
          await execAsync(`attrib +R +H +S "${path}"`);
          break;
      }
    } else if (stats.isDirectory()) {
      // 目录锁定
      switch (lockType) {
        case 'readonly':
          await this.setDirectoryReadonly(path, true);
          break;
        case 'hidden':
          await execAsync(`attrib +H "${path}"`);
          break;
        case 'protected':
          await this.setDirectoryReadonly(path, true);
          await execAsync(`attrib +H "${path}"`);
          break;
        case 'full':
          await this.setDirectoryReadonly(path, true);
          await execAsync(`attrib +H +S "${path}"`);
          break;
      }
    }
  }

  /**
   * 应用Mac锁定
   */
  private async applyMacLock(path: string, lockType: PathLockInfo['lockType']): Promise<void> {
    switch (lockType) {
      case 'readonly':
        // 设置为只读
        chmodSync(path, 0o444);
        break;
      case 'hidden':
        // 隐藏文件（添加.前缀）
        const hiddenPath = join(dirname(path), `.${basename(path)}`);
        await execAsync(`mv "${path}" "${hiddenPath}"`);
        break;
      case 'protected':
        // 只读 + 不可变标志
        chmodSync(path, 0o444);
        await execAsync(`chflags uchg "${path}"`);
        break;
      case 'full':
        // 完全保护
        chmodSync(path, 0o400);
        await execAsync(`chflags uchg,hidden "${path}"`);
        break;
    }
  }

  /**
   * 应用Linux锁定
   */
  private async applyLinuxLock(path: string, lockType: PathLockInfo['lockType']): Promise<void> {
    switch (lockType) {
      case 'readonly':
        chmodSync(path, 0o444);
        break;
      case 'hidden':
        const hiddenPath = join(dirname(path), `.${basename(path)}`);
        await execAsync(`mv "${path}" "${hiddenPath}"`);
        break;
      case 'protected':
        chmodSync(path, 0o444);
        await execAsync(`chattr +i "${path}"`);
        break;
      case 'full':
        chmodSync(path, 0o400);
        await execAsync(`chattr +i "${path}"`);
        break;
    }
  }

  /**
   * 移除路径锁定
   */
  private async removePathLock(path: string, lockType: PathLockInfo['lockType']): Promise<void> {
    switch (this.platform) {
      case 'win32':
        await this.removeWindowsLock(path, lockType);
        break;
      case 'darwin':
        await this.removeMacLock(path, lockType);
        break;
      case 'linux':
        await this.removeLinuxLock(path, lockType);
        break;
    }
  }

  /**
   * 移除Windows锁定
   */
  private async removeWindowsLock(path: string, lockType: PathLockInfo['lockType']): Promise<void> {
    const stats = statSync(path);
    
    if (stats.isFile()) {
      switch (lockType) {
        case 'readonly':
        case 'hidden':
        case 'protected':
        case 'full':
          // 移除所有属性
          await execAsync(`attrib -R -H -S "${path}"`);
          break;
      }
    } else if (stats.isDirectory()) {
      // 移除目录锁定
      await this.setDirectoryReadonly(path, false);
      await execAsync(`attrib -H -S "${path}"`);
    }
  }

  /**
   * 移除Mac锁定
   */
  private async removeMacLock(path: string, lockType: PathLockInfo['lockType']): Promise<void> {
    switch (lockType) {
      case 'readonly':
      case 'protected':
      case 'full':
        chmodSync(path, 0o644);
        await execAsync(`chflags nouchg "${path}"`);
        break;
      case 'hidden':
        // 恢复原始名称
        const hiddenPath = join(dirname(path), `.${basename(path)}`);
        const originalPath = join(dirname(path), basename(path).replace(/^\./, ''));
        if (existsSync(hiddenPath)) {
          await execAsync(`mv "${hiddenPath}" "${originalPath}"`);
        }
        break;
    }
  }

  /**
   * 移除Linux锁定
   */
  private async removeLinuxLock(path: string, lockType: PathLockInfo['lockType']): Promise<void> {
    switch (lockType) {
      case 'readonly':
      case 'protected':
      case 'full':
        chmodSync(path, 0o644);
        await execAsync(`chattr -i "${path}"`);
        break;
      case 'hidden':
        const hiddenPath = join(dirname(path), `.${basename(path)}`);
        const originalPath = join(dirname(path), basename(path).replace(/^\./, ''));
        if (existsSync(hiddenPath)) {
          await execAsync(`mv "${hiddenPath}" "${originalPath}"`);
        }
        break;
    }
  }

  /**
   * 设置目录为只读
   */
  private async setDirectoryReadonly(dirPath: string, readonly: boolean): Promise<void> {
    try {
      const mode = readonly ? '555' : '755';
      await execAsync(`chmod -R ${mode} "${dirPath}"`);
    } catch (error) {
      console.warn('设置目录权限失败:', error);
    }
  }

  /**
   * 用注册表保护路径
   */
  private async protectWithRegistry(path: string): Promise<void> {
    try {
      // 创建注册表项来保护路径
      const regCommand = `reg add "HKLM\\SOFTWARE\\AiPlatform\\PathLocks\\${Buffer.from(path).toString('base64')}" /v "Protected" /t REG_DWORD /d 1 /f`;
      await execAsync(regCommand);
    } catch (error) {
      console.warn('注册表保护失败:', error);
    }
  }

  /**
   * 计算路径校验和
   */
  private async calculatePathChecksum(path: string): Promise<string> {
    try {
      if (this.platform === 'win32') {
        const { stdout } = await execAsync(`certutil -hashfile "${path}" SHA256`);
        return stdout.split('\n')[1].trim();
      } else {
        const { stdout } = await execAsync(`shasum -a 256 "${path}"`);
        return stdout.split(' ')[0];
      }
    } catch (error) {
      console.warn('计算校验和失败:', error);
      return '';
    }
  }

  /**
   * 创建路径备份
   */
  private async createPathBackup(softwareName: string, path: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${softwareName}_${timestamp}`;
      
      // 这里可以实现实际的备份逻辑
      console.log(`创建路径备份: ${path} -> ${backupName}`);
    } catch (error) {
      console.warn('创建备份失败:', error);
    }
  }

  /**
   * 生成锁键
   */
  private generateLockKey(softwareName: string, path: string): string {
    return `${softwareName}:${path}`;
  }

  /**
   * 启动监控
   */
  private startMonitoring(key: string, path: string, lockType: PathLockInfo['lockType']): void {
    // 每30秒检查一次路径完整性
    const interval = setInterval(async () => {
      await this.verifyPathIntegrity(key, path, lockType);
    }, 30000);

    this.monitoringIntervals.set(key, interval);
  }

  /**
   * 停止监控
   */
  private stopMonitoring(key: string): void {
    const interval = this.monitoringIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(key);
    }
  }

  /**
   * 验证路径完整性
   */
  private async verifyPathIntegrity(
    key: string, 
    path: string, 
    lockType: PathLockInfo['lockType']
  ): Promise<void> {
    try {
      const lockInfo = this.locks.get(key);
      if (!lockInfo) return;

      let isValid = true;
      let status: PathLockInfo['verificationStatus'] = 'valid';

      // 检查路径是否存在
      if (!existsSync(path)) {
        isValid = false;
        status = 'missing';
      } else {
        // 检查校验和
        if (lockInfo.checksum) {
          const currentChecksum = await this.calculatePathChecksum(path);
          if (currentChecksum !== lockInfo.checksum) {
            isValid = false;
            status = 'modified';
          }
        }

        // 检查锁定状态
        const isLockValid = await this.verifyLockStatus(path, lockType);
        if (!isLockValid) {
          isValid = false;
          status = 'corrupted';
        }
      }

      // 更新锁信息
      lockInfo.lastVerified = new Date();
      if (!isValid) {
        lockInfo.verificationStatus = status;
        this.locks.set(key, lockInfo);
        this.saveLocks();

        // 发送通知
        this.notifyIntegrityViolation(lockInfo, status);
      }

    } catch (error) {
      console.warn(`验证路径完整性失败 ${key}:`, error);
    }
  }

  /**
   * 验证锁定状态
   */
  private async verifyLockStatus(path: string, lockType: PathLockInfo['lockType']): Promise<boolean> {
    try {
      const stats = statSync(path);
      
      switch (this.platform) {
        case 'win32':
          return await this.verifyWindowsLock(path, lockType);
        case 'darwin':
          return await this.verifyMacLock(path, lockType);
        case 'linux':
          return await this.verifyLinuxLock(path, lockType);
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * 验证Windows锁定
   */
  private async verifyWindowsLock(path: string, lockType: PathLockInfo['lockType']): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`attrib "${path}"`);
      const attributes = stdout.trim();

      switch (lockType) {
        case 'readonly':
          return attributes.includes('R');
        case 'hidden':
          return attributes.includes('H');
        case 'protected':
          return attributes.includes('R') && attributes.includes('H');
        case 'full':
          return attributes.includes('R') && attributes.includes('H') && attributes.includes('S');
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * 验证Mac锁定
   */
  private async verifyMacLock(path: string, lockType: PathLockInfo['lockType']): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`ls -lo "${path}"`);
      const flags = stdout.split(' ')[4];

      switch (lockType) {
        case 'readonly':
          return (statSync(path).mode & 0o777) === 0o444;
        case 'protected':
          return flags.includes('uchg');
        case 'full':
          return (statSync(path).mode & 0o777) === 0o400 && flags.includes('uchg');
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * 验证Linux锁定
   */
  private async verifyLinuxLock(path: string, lockType: PathLockInfo['lockType']): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`lsattr "${path}"`);
      const attributes = stdout.split(' ')[0];

      switch (lockType) {
        case 'readonly':
          return (statSync(path).mode & 0o777) === 0o444;
        case 'protected':
        case 'full':
          return attributes.includes('i');
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * 通知完整性违规
   */
  private notifyIntegrityViolation(lockInfo: PathLockInfo, status: PathLockInfo['verificationStatus']): void {
    const message = `路径完整性违规: ${lockInfo.softwareName} - ${status}`;
    console.warn(message);
    
    // 这里可以发送通知给主窗口
    // mainWindow.webContents.send('path-lock-violation', { lockInfo, status });
  }

  /**
   * 获取所有锁信息
   */
  getAllLocks(): PathLockInfo[] {
    return Array.from(this.locks.values());
  }

  /**
   * 获取特定软件的锁信息
   */
  getLocksBySoftware(softwareName: string): PathLockInfo[] {
    return Array.from(this.locks.values()).filter(lock => 
      lock.softwareName === softwareName
    );
  }

  /**
   * 验证所有锁
   */
  async verifyAllLocks(): Promise<VerificationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const pathChanges: Array<{ path: string; status: 'added' | 'removed' | 'modified'; timestamp: Date; }> = [];

    for (const [key, lockInfo] of this.locks) {
      if (lockInfo.isLocked) {
        try {
          await this.verifyPathIntegrity(key, lockInfo.currentPath, lockInfo.lockType);
          
          if (lockInfo.verificationStatus !== 'valid') {
            issues.push(`${lockInfo.softwareName}: ${lockInfo.verificationStatus}`);
            recommendations.push(`重新锁定 ${lockInfo.softwareName} 的路径`);
          }
        } catch (error) {
          issues.push(`${lockInfo.softwareName}: 验证失败`);
          recommendations.push(`检查 ${lockInfo.softwareName} 的路径状态`);
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
      pathChanges
    };
  }

  /**
   * 清理所有锁
   */
  async clearAllLocks(): Promise<void> {
    for (const [key, lockInfo] of this.locks) {
      if (lockInfo.isLocked) {
        this.stopMonitoring(key);
        await this.removePathLock(lockInfo.currentPath, lockInfo.lockType);
      }
    }

    this.locks.clear();
    this.saveLocks();
  }

  /**
   * 导出锁配置
   */
  exportLocks(): string {
    const locksData: Record<string, PathLockInfo> = {};
    this.locks.forEach((lock, key) => {
      locksData[key] = lock;
    });
    return JSON.stringify(locksData, null, 2);
  }

  /**
   * 导入锁配置
   */
  async importLocks(locksData: string): Promise<void> {
    try {
      const locks = JSON.parse(locksData) as Record<string, PathLockInfo>;
      
      for (const [key, lockInfo] of Object.entries(locks)) {
        // 如果路径仍然存在，重新应用锁定
        if (existsSync(lockInfo.currentPath)) {
          await this.lockPath(lockInfo.softwareName, lockInfo.currentPath, lockInfo.lockType);
        }
      }
    } catch (error) {
      throw new Error(`导入锁配置失败: ${error}`);
    }
  }
}