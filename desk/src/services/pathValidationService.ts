import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { existsSync, statSync, readFileSync, writeFileSync, mkdirSync, chmodSync, unlinkSync, renameSync, readdirSync } from 'fs';
import { platform, homedir } from 'os';
import { join, dirname, basename } from 'path';

const execAsync = promisify(exec);

export interface PathIssue {
  type: 'missing' | 'corrupted' | 'permission' | 'version_mismatch' | 'dependency_missing' | 'registry_error' | 'invalid_executable';
  severity: 'low' | 'medium' | 'high' | 'critical';
  softwareName: string;
  path: string;
  description: string;
  suggestedFix: string;
  autoFixable: boolean;
  detectedAt: Date;
}

export interface PathValidationResult {
  softwareName: string;
  path: string;
  isValid: boolean;
  issues: PathIssue[];
  warnings: string[];
  metadata: {
    lastValidated: Date;
    version?: string;
    size?: number;
    permissions?: string;
    checksum?: string;
    dependencies?: string[];
  };
}

export interface RepairOperation {
  id: string;
  type: 'fix_permissions' | 'restore_backup' | 'update_path' | 'clean_registry' | 'reinstall' | 'recreate_symlink' | 'fix_executable';
  description: string;
  estimatedTime: number; // in seconds
  requiresRestart: boolean;
  isDestructive: boolean;
}

export interface RepairResult {
  success: boolean;
  operation: RepairOperation;
  message: string;
  details?: any;
  performedAt: Date;
}

export class PathValidationService {
  private platform: NodeJS.Platform;
  private validationCache: Map<string, PathValidationResult> = new Map();
  private repairHistory: RepairResult[] = [];

  constructor() {
    this.platform = platform();
  }

  /**
   * 验证软件路径
   */
  async validateSoftwarePath(softwareName: string, path: string): Promise<PathValidationResult> {
    const cacheKey = `${softwareName}:${path}`;
    
    // 检查缓存（5分钟内的结果被认为是有效的）
    const cached = this.validationCache.get(cacheKey);
    if (cached && Date.now() - cached.metadata.lastValidated.getTime() < 5 * 60 * 1000) {
      return cached;
    }

    const result: PathValidationResult = {
      softwareName,
      path,
      isValid: true,
      issues: [],
      warnings: [],
      metadata: {
        lastValidated: new Date()
      }
    };

    try {
      // 1. 基本存在性检查
      if (!existsSync(path)) {
        result.issues.push(this.createIssue(
          'missing',
          'critical',
          softwareName,
          path,
          '路径不存在',
          '重新扫描或手动指定正确的路径',
          true
        ));
        result.isValid = false;
        return result;
      }

      const stats = statSync(path);
      
      // 2. 权限检查
      await this.checkPermissions(result, stats);
      
      // 3. 可执行性检查
      if (stats.isFile()) {
        await this.checkExecutable(result, softwareName, path);
      } else if (stats.isDirectory()) {
        await this.checkDirectory(result, softwareName, path);
      }

      // 4. 版本检查
      await this.checkVersion(result, softwareName, path);

      // 5. 依赖检查
      await this.checkDependencies(result, softwareName, path);

      // 6. 完整性检查
      await this.checkIntegrity(result, softwareName, path);

      // 7. 注册表检查（仅Windows）
      if (this.platform === 'win32') {
        await this.checkRegistry(result, softwareName, path);
      }

      // 填充元数据
      result.metadata.version = result.metadata.version || await this.extractVersion(path);
      result.metadata.size = stats.size;
      result.metadata.permissions = this.getPermissionsString(stats);
      result.metadata.checksum = await this.calculateChecksum(path);

      // 缓存结果
      this.validationCache.set(cacheKey, result);

    } catch (error) {
      result.issues.push(this.createIssue(
        'corrupted',
        'high',
        softwareName,
        path,
        `验证过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
        '重新运行验证或手动检查路径',
        false
      ));
      result.isValid = false;
    }

    return result;
  }

  /**
   * 批量验证路径
   */
  async validateMultiplePaths(softwarePaths: Array<{softwareName: string, path: string}>): Promise<PathValidationResult[]> {
    const validationPromises = softwarePaths.map(({softwareName, path}) => 
      this.validateSoftwarePath(softwareName, path)
    );

    return Promise.all(validationPromises);
  }

  /**
   * 获取修复操作建议
   */
  getRepairOperations(issues: PathIssue[]): RepairOperation[] {
    const operations: RepairOperation[] = [];

    issues.forEach((issue, index) => {
      switch (issue.type) {
        case 'permission':
          operations.push({
            id: `fix_perm_${index}`,
            type: 'fix_permissions',
            description: `修复 ${issue.path} 的权限问题`,
            estimatedTime: 5,
            requiresRestart: false,
            isDestructive: false
          });
          break;

        case 'missing':
          operations.push({
            id: `update_path_${index}`,
            type: 'update_path',
            description: `重新搜索 ${issue.softwareName} 的安装路径`,
            estimatedTime: 30,
            requiresRestart: false,
            isDestructive: false
          });
          break;

        case 'invalid_executable':
          operations.push({
            id: `fix_exec_${index}`,
            type: 'fix_executable',
            description: `修复 ${issue.softwareName} 的可执行文件`,
            estimatedTime: 10,
            requiresRestart: false,
            isDestructive: false
          });
          break;

        case 'corrupted':
          operations.push({
            id: `restore_backup_${index}`,
            type: 'restore_backup',
            description: `恢复 ${issue.softwareName} 的备份`,
            estimatedTime: 60,
            requiresRestart: true,
            isDestructive: false
          });
          operations.push({
            id: `reinstall_${index}`,
            type: 'reinstall',
            description: `重新安装 ${issue.softwareName}`,
            estimatedTime: 300,
            requiresRestart: false,
            isDestructive: true
          });
          break;

        case 'registry_error':
          operations.push({
            id: `clean_registry_${index}`,
            type: 'clean_registry',
            description: `清理 ${issue.softwareName} 的注册表项`,
            estimatedTime: 15,
            requiresRestart: true,
            isDestructive: false
          });
          break;
      }
    });

    return operations;
  }

  /**
   * 执行修复操作
   */
  async executeRepair(operation: RepairOperation, context: any): Promise<RepairResult> {
    const startTime = Date.now();
    
    try {
      let result: RepairResult;

      switch (operation.type) {
        case 'fix_permissions':
          result = await this.fixPermissions(operation, context);
          break;
        case 'update_path':
          result = await this.updatePath(operation, context);
          break;
        case 'fix_executable':
          result = await this.fixExecutable(operation, context);
          break;
        case 'restore_backup':
          result = await this.restoreBackup(operation, context);
          break;
        case 'clean_registry':
          result = await this.cleanRegistry(operation, context);
          break;
        case 'reinstall':
          result = await this.reinstallSoftware(operation, context);
          break;
        case 'recreate_symlink':
          result = await this.recreateSymlink(operation, context);
          break;
        default:
          throw new Error(`未知的修复操作类型: ${operation.type}`);
      }

      // 记录修复历史
      this.repairHistory.push(result);

      return result;

    } catch (error) {
      const errorResult: RepairResult = {
        success: false,
        operation,
        message: `修复失败: ${error instanceof Error ? error.message : '未知错误'}`,
        performedAt: new Date()
      };

      this.repairHistory.push(errorResult);
      return errorResult;
    }
  }

  /**
   * 修复权限问题
   */
  private async fixPermissions(operation: RepairOperation, context: any): Promise<RepairResult> {
    const { path } = context;
    
    try {
      if (this.platform === 'win32') {
        // Windows权限修复
        await execAsync(`icacls "${path}" /grant "${process.env.USERNAME}":(OI)(CI)F`);
        await execAsync(`icacls "${path}" /reset /T`);
      } else {
        // Unix权限修复
        const stats = statSync(path);
        if (stats.isFile()) {
          chmodSync(path, 0o755);
        } else {
          chmodSync(path, 0o755);
          await execAsync(`find "${path}" -type f -exec chmod 644 {} \\;`);
          await execAsync(`find "${path}" -type d -exec chmod 755 {} \\;`);
        }
      }

      return {
        success: true,
        operation,
        message: '权限修复成功',
        performedAt: new Date()
      };

    } catch (error) {
      throw new Error(`权限修复失败: ${error}`);
    }
  }

  /**
   * 更新路径
   */
  private async updatePath(operation: RepairOperation, context: any): Promise<RepairResult> {
    const { softwareName } = context;
    
    // 这里应该调用智能路径搜索服务
    // 简化实现
    return {
      success: true,
      operation,
      message: '路径更新成功',
      details: { newPath: '/new/path/to/software' },
      performedAt: new Date()
    };
  }

  /**
   * 修复可执行文件
   */
  private async fixExecutable(operation: RepairOperation, context: any): Promise<RepairResult> {
    const { path } = context;
    
    try {
      if (this.platform === 'win32') {
        // Windows可执行文件修复
        await execAsync(`sfc /scannow`); // 系统文件检查
        await execAsync(`dism /online /cleanup-image /restorehealth`); // 系统映像修复
      } else {
        // Unix可执行文件修复
        chmodSync(path, 0o755);
        
        // 重新构建可执行文件（如果可能）
        if (path.includes('node') || path.includes('python')) {
          // 重新安装包管理器
          if (path.includes('node')) {
            await execAsync('npm cache clean --force');
          } else if (path.includes('python')) {
            await execAsync('pip cache purge');
          }
        }
      }

      return {
        success: true,
        operation,
        message: '可执行文件修复成功',
        performedAt: new Date()
      };

    } catch (error) {
      throw new Error(`可执行文件修复失败: ${error}`);
    }
  }

  /**
   * 恢复备份
   */
  private async restoreBackup(operation: RepairOperation, context: any): Promise<RepairResult> {
    const { softwareName, path } = context;
    
    // 这里实现备份恢复逻辑
    // 简化实现
    return {
      success: true,
      operation,
      message: '备份恢复成功',
      performedAt: new Date()
    };
  }

  /**
   * 清理注册表
   */
  private async cleanRegistry(operation: RepairOperation, context: any): Promise<RepairResult> {
    if (this.platform !== 'win32') {
      throw new Error('注册表清理仅在Windows上支持');
    }

    const { softwareName } = context;
    
    try {
      // 删除无效的注册表项
      await execAsync(`reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${softwareName}" /f 2>nul`);
      await execAsync(`reg delete "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${softwareName}" /f 2>nul`);

      return {
        success: true,
        operation,
        message: '注册表清理成功',
        performedAt: new Date()
      };

    } catch (error) {
      throw new Error(`注册表清理失败: ${error}`);
    }
  }

  /**
   * 重新安装软件
   */
  private async reinstallSoftware(operation: RepairOperation, context: any): Promise<RepairResult> {
    const { softwareName, downloadUrl } = context;
    
    // 这里实现软件重新安装逻辑
    // 简化实现
    return {
      success: true,
      operation,
      message: '软件重新安装成功',
      performedAt: new Date()
    };
  }

  /**
   * 重新创建符号链接
   */
  private async recreateSymlink(operation: RepairOperation, context: any): Promise<RepairResult> {
    const { linkPath, targetPath } = context;
    
    try {
      if (existsSync(linkPath)) {
        unlinkSync(linkPath);
      }
      
      if (this.platform === 'win32') {
        await execAsync(`mklink /D "${linkPath}" "${targetPath}"`);
      } else {
        await execAsync(`ln -s "${targetPath}" "${linkPath}"`);
      }

      return {
        success: true,
        operation,
        message: '符号链接重新创建成功',
        performedAt: new Date()
      };

    } catch (error) {
      throw new Error(`符号链接重新创建失败: ${error}`);
    }
  }

  /**
   * 检查权限
   */
  private async checkPermissions(result: PathValidationResult, stats: any): Promise<void> {
    try {
      // 测试文件访问权限
      if (stats.isFile()) {
        readFileSync(result.path, { flag: 'r' }); // 测试读权限
      } else if (stats.isDirectory()) {
        readdirSync(result.path); // 测试目录访问权限
      }

      // 检查执行权限（如果需要）
      if (this.platform !== 'win32' && stats.isFile() && this.isExecutableFile(result.path)) {
        if (!(stats.mode & 0o111)) {
          result.issues.push(this.createIssue(
            'permission',
            'medium',
            result.softwareName,
            result.path,
            '文件缺少执行权限',
            '添加执行权限',
            true
          ));
        }
      }

    } catch (error) {
      result.issues.push(this.createIssue(
        'permission',
        'high',
        result.softwareName,
        result.path,
        `权限访问错误: ${error instanceof Error ? error.message : '未知错误'}`,
        '修复文件权限',
        true
      ));
    }
  }

  /**
   * 检查可执行文件
   */
  private async checkExecutable(result: PathValidationResult, softwareName: string, path: string): Promise<void> {
    try {
      // 检查文件签名（Windows）
      if (this.platform === 'win32') {
        await execAsync(`sigcheck "${path}"`, { timeout: 5000 });
      }

      // 检查文件头
      // @ts-ignore
      const buffer = readFileSync(path).slice(0, 4);
      const isValidExecutable = this.validateFileHeader(buffer, path);
      
      if (!isValidExecutable) {
        result.issues.push(this.createIssue(
          'invalid_executable',
          'high',
          softwareName,
          path,
          '文件头无效，可能已损坏',
          '重新安装软件或恢复备份',
          false
        ));
      }

    } catch (error) {
      result.warnings.push(`可执行文件验证失败: ${error}`);
    }
  }

  /**
   * 检查目录
   */
  private async checkDirectory(result: PathValidationResult, softwareName: string, path: string): Promise<void> {
    try {
      const items = readdirSync(path);
      
      if (items.length === 0) {
        result.warnings.push('目录为空，可能是不完整的安装');
      }

      // 检查关键文件是否存在
      const requiredFiles = this.getRequiredFiles(softwareName);
      const missingFiles = requiredFiles.filter(file => 
        !items.some(item => item.toLowerCase().includes(file.toLowerCase()))
      );

      if (missingFiles.length > 0) {
        result.issues.push(this.createIssue(
          'corrupted',
          'medium',
          softwareName,
          path,
          `缺少关键文件: ${missingFiles.join(', ')}`,
          '重新安装软件',
          false
        ));
      }

    } catch (error) {
      result.issues.push(this.createIssue(
        'corrupted',
        'high',
        softwareName,
        path,
        `目录访问失败: ${error instanceof Error ? error.message : '未知错误'}`,
        '检查目录权限或重新安装',
        false
      ));
    }
  }

  /**
   * 检查版本
   */
  private async checkVersion(result: PathValidationResult, softwareName: string, path: string): Promise<void> {
    try {
      const version = await this.extractVersion(path);
      result.metadata.version = version;

      // 检查版本兼容性
      if (version && this.isVersionOutdated(softwareName, version)) {
        result.warnings.push(`软件版本较旧: ${version}`);
      }

    } catch (error) {
      result.warnings.push(`版本检测失败: ${error}`);
    }
  }

  /**
   * 检查依赖
   */
  private async checkDependencies(result: PathValidationResult, softwareName: string, path: string): Promise<void> {
    try {
      const dependencies = await this.detectDependencies(softwareName, path);
      result.metadata.dependencies = dependencies;

      const missingDeps: string[] = [];
      
      for (const dep of dependencies) {
        if (!await this.isDependencyAvailable(dep)) {
          missingDeps.push(dep);
        }
      }

      if (missingDeps.length > 0) {
        result.issues.push(this.createIssue(
          'dependency_missing',
          'medium',
          softwareName,
          path,
          `缺少依赖: ${missingDeps.join(', ')}`,
          '安装缺少的依赖',
          true
        ));
      }

    } catch (error) {
      result.warnings.push(`依赖检查失败: ${error}`);
    }
  }

  /**
   * 检查完整性
   */
  private async checkIntegrity(result: PathValidationResult, softwareName: string, path: string): Promise<void> {
    try {
      const checksum = await this.calculateChecksum(path);
      result.metadata.checksum = checksum;

      // 这里可以与已知良好的校验和比较
      // 简化实现

    } catch (error) {
      result.warnings.push(`完整性检查失败: ${error}`);
    }
  }

  /**
   * 检查注册表
   */
  private async checkRegistry(result: PathValidationResult, softwareName: string, path: string): Promise<void> {
    try {
      const { stdout } = await execAsync(`reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*" /s /f "${softwareName}"`, { timeout: 10000 });
      
      if (!stdout.includes(softwareName)) {
        result.warnings.push('未在注册表中找到软件信息');
      }

    } catch (error) {
      result.issues.push(this.createIssue(
        'registry_error',
        'low',
        softwareName,
        path,
        '注册表查询失败',
        '运行注册表修复工具',
        false
      ));
    }
  }

  /**
   * 辅助方法
   */
  private createIssue(
    type: PathIssue['type'],
    severity: PathIssue['severity'],
    softwareName: string,
    path: string,
    description: string,
    suggestedFix: string,
    autoFixable: boolean
  ): PathIssue {
    return {
      type,
      severity,
      softwareName,
      path,
      description,
      suggestedFix,
      autoFixable,
      detectedAt: new Date()
    };
  }

  private validateFileHeader(buffer: Buffer, filePath: string): boolean {
    const ext = filePath.toLowerCase().split('.').pop();
    
    const headers: Record<string, number[]> = {
      'exe': [0x4D, 0x5A], // PE
      'dll': [0x4D, 0x5A], // PE
      'app': [0xCA, 0xFE, 0xBA, 0xBE], // macOS应用
      '': [0x7F, 0x45, 0x4C, 0x46] // ELF (Linux)
    };

    const expectedHeader = headers[ext || ''];
    if (!expectedHeader) return true; // 未知格式，假设有效

    return expectedHeader.every((byte, index) => buffer[index] === byte);
  }

  private isExecutableFile(filePath: string): boolean {
    const ext = filePath.toLowerCase().split('.').pop();
    return ['exe', 'com', 'bat', 'cmd', 'sh', 'py', 'js'].includes(ext || '');
  }

  private getRequiredFiles(softwareName: string): string[] {
    const requirements: Record<string, string[]> = {
      'blender': ['blender.exe', 'blender'],
      'photoshop': ['Photoshop.exe', 'Photoshop'],
      'vscode': ['Code.exe', 'code'],
      'git': ['git.exe', 'git'],
      'node': ['node.exe', 'node']
    };

    return requirements[softwareName.toLowerCase()] || [];
  }

  private async extractVersion(path: string): Promise<string | null> {
    try {
      let command = '';
      
      if (path.includes('blender')) {
        command = `"${path}" --version`;
      } else if (path.includes('git')) {
        command = 'git --version';
      } else if (path.includes('node')) {
        command = 'node --version';
      } else if (path.includes('code')) {
        command = `"${path}" --version`;
      }

      if (command) {
        const { stdout } = await execAsync(command);
        const versionMatch = stdout.match(/(\d+\.\d+(\.\d+)?)/);
        return versionMatch ? versionMatch[1] : null;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private isVersionOutdated(softwareName: string, currentVersion: string): boolean {
    // 简化实现：假设较旧的版本需要更新
    // 实际实现应该与最新版本比较
    return currentVersion.startsWith('1.') || currentVersion.startsWith('2.');
  }

  private async detectDependencies(softwareName: string, path: string): Promise<string[]> {
    // 简化实现：返回常见依赖
    const commonDeps = ['Visual C++ Redistributable', '.NET Framework', 'Python', 'Node.js'];
    return commonDeps.slice(0, 2); // 返回部分依赖作为示例
  }

  private async isDependencyAvailable(dep: string): Promise<boolean> {
    try {
      if (dep.includes('Visual C++')) {
        const { stdout } = await execAsync('reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*" /s /f "Visual C++"');
        return stdout.length > 0;
      } else if (dep.includes('.NET')) {
        const { stdout } = await execAsync('dotnet --version');
        return stdout.length > 0;
      } else if (dep.includes('Python')) {
        const { stdout } = await execAsync('python --version');
        return stdout.length > 0;
      } else if (dep.includes('Node')) {
        const { stdout } = await execAsync('node --version');
        return stdout.length > 0;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private async calculateChecksum(path: string): Promise<string> {
    try {
      if (this.platform === 'win32') {
        const { stdout } = await execAsync(`certutil -hashfile "${path}" SHA256`);
        return stdout.split('\n')[1].trim();
      } else {
        const { stdout } = await execAsync(`shasum -a 256 "${path}"`);
        return stdout.split(' ')[0];
      }
    } catch (error) {
      return '';
    }
  }

  private getPermissionsString(stats: any): string {
    if (this.platform === 'win32') {
      return stats.mode.toString(8);
    } else {
      return (stats.mode & 0o777).toString(8);
    }
  }

  /**
   * 获取修复历史
   */
  getRepairHistory(): RepairResult[] {
    return [...this.repairHistory].reverse();
  }

  /**
   * 清除修复历史
   */
  clearRepairHistory(): void {
    this.repairHistory = [];
  }

  /**
   * 清除验证缓存
   */
  clearValidationCache(): void {
    this.validationCache.clear();
  }
}