import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { platform, homedir, arch } from 'os';
import { join, dirname, basename } from 'path';

// 动态导入 winreg（仅 Windows 安装版使用）
let Registry: any = null;
if (platform() === 'win32') {
  try {
    // @ts-ignore
    const winregModule = require('winreg');
    Registry = winregModule.Registry;
  } catch (error) {
    console.warn('winreg 模块未安装，将禁用注册表搜索功能');
  }
}

const execAsync = promisify(exec);

export interface PathSearchResult {
  softwareName: string;
  detectedPaths: string[];
  confidence: number;
  source: 'registry' | 'environment' | 'filesystem' | 'package_manager' | 'shortcut';
  metadata?: {
    version?: string;
    publisher?: string;
    installDate?: string;
    size?: number;
  };
}

export interface EnvironmentVariable {
  name: string;
  value: string;
  description?: string;
}

export class IntelligentPathSearchService {
  private platform: NodeJS.Platform;
  private cache: Map<string, PathSearchResult[]> = new Map();
  private environmentCache: EnvironmentVariable[] = [];

  constructor() {
    this.platform = platform();
    this.initializeEnvironmentCache();
  }

  /**
   * 初始化环境变量缓存
   */
  private initializeEnvironmentCache(): void {
    this.environmentCache = Object.entries(process.env).map(([name, value]) => ({
      name,
      value: value || '',
      description: this.getEnvironmentVariableDescription(name)
    }));
  }

  /**
   * 获取环境变量描述
   */
  private getEnvironmentVariableDescription(name: string): string {
    const descriptions: Record<string, string> = {
      'PATH': '可执行文件搜索路径',
      'PROGRAMFILES': '程序文件目录',
      'PROGRAMFILES(X86)': 'x86程序文件目录',
      'PROGRAMDATA': '程序数据目录',
      'USERPROFILE': '用户配置文件目录',
      'APPDATA': '应用程序数据目录',
      'LOCALAPPDATA': '本地应用程序数据目录',
      'HOME': '用户主目录',
      'OPT': '可选软件目录',
      'USR_LOCAL_BIN': '本地用户二进制文件目录'
    };
    return descriptions[name] || '';
  }

  /**
   * 执行智能路径搜索
   */
  async performIntelligentSearch(softwareName?: string): Promise<PathSearchResult[]> {
    const cacheKey = softwareName || 'all';
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const results: PathSearchResult[] = [];

    // 1. Windows注册表搜索
    if (this.platform === 'win32') {
      const registryResults = await this.searchRegistryIntelligently(softwareName);
      results.push(...registryResults);
    }

    // 2. 环境变量搜索
    const envResults = await this.searchEnvironmentVariables(softwareName);
    results.push(...envResults);

    // 3. 包管理器搜索
    const packageResults = await this.searchPackageManagers(softwareName);
    results.push(...packageResults);

    // 4. 快捷方式搜索（Windows）或符号链接搜索（Linux/macOS）
    const shortcutResults = await this.searchShortcutsAndSymlinks(softwareName);
    results.push(...shortcutResults);

    // 5. 用户配置目录搜索
    const configResults = await this.searchUserConfigDirectories(softwareName);
    results.push(...configResults);

    // 缓存结果
    this.cache.set(cacheKey, results);

    return results;
  }

  /**
   * 智能注册表搜索
   */
  private async searchRegistryIntelligently(softwareName?: string): Promise<PathSearchResult[]> {
    if (this.platform !== 'win32' || !Registry) return [];

    const results: PathSearchResult[] = [];
    const registryHives = [
      { hive: Registry.HKLM, key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall' },
      { hive: Registry.HKLM, key: '\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall' },
      { hive: Registry.HKCU, key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall' }
    ];

    for (const { hive, key } of registryHives) {
      try {
        const registryResults = await this.searchRegistryHive(hive, key, softwareName);
        results.push(...registryResults);
      } catch (error) {
        console.warn(`注册表搜索失败: ${key}`, error);
      }
    }

    return results;
  }

  /**
   * 搜索特定注册表分支
   */
  private async searchRegistryHive(
    hive: number, 
    key: string, 
    softwareName?: string
  ): Promise<PathSearchResult[]> {
    return new Promise((resolve) => {
      const results: PathSearchResult[] = [];
      const registry = new Registry({ hive, key });

      registry.keys((err, items) => {
        if (err) {
          resolve([]);
          return;
        }

        const searchPromises = items?.map(item => 
          this.analyzeRegistryItem(hive, item.key, softwareName)
        ) || [];

        Promise.allSettled(searchPromises).then(itemResults => {
          itemResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
              results.push(result.value);
            }
          });
          resolve(results);
        });
      });
    });
  }

  /**
   * 分析注册表项
   */
  private async analyzeRegistryItem(
    hive: number, 
    itemKey: string, 
    softwareName?: string
  ): Promise<PathSearchResult | null> {
    return new Promise((resolve) => {
      const registry = new Registry({ hive, key: itemKey });
      
      registry.values((err, values) => {
        if (err) {
          resolve(null);
          return;
        }

        const displayName = values?.find(v => v.name === 'DisplayName')?.value as string;
        const installLocation = values?.find(v => v.name === 'InstallLocation')?.value as string;
        const publisher = values?.find(v => v.name === 'Publisher')?.value as string;
        const version = values?.find(v => v.name === 'DisplayVersion')?.value as string;
        const installDate = values?.find(v => v.name === 'InstallDate')?.value as string;

        if (!displayName || !installLocation) {
          resolve(null);
          return;
        }

        // 检查是否匹配搜索的软件名
        if (softwareName && !displayName.toLowerCase().includes(softwareName.toLowerCase())) {
          resolve(null);
          return;
        }

        const detectedPaths = [installLocation];

        // 查找可执行文件
        this.findExecutablesInPath(installLocation)
          .then(executables => {
            detectedPaths.push(...executables);
          })
          .catch(() => {
            // 忽略搜索错误
          });

        const result: PathSearchResult = {
          softwareName: displayName,
          detectedPaths: [...new Set(detectedPaths)],
          confidence: this.calculateRegistryConfidence(displayName, installLocation, publisher, version),
          source: 'registry',
          metadata: {
            version: version || undefined,
            publisher: publisher || undefined,
            installDate: installDate || undefined
          }
        };

        resolve(result);
      });
    });
  }

  /**
   * 搜索环境变量
   */
  private async searchEnvironmentVariables(softwareName?: string): Promise<PathSearchResult[]> {
    const results: PathSearchResult[] = [];
    
    // 搜索PATH环境变量中的可执行文件
    const pathEnv = process.env.PATH || '';
    const paths = pathEnv.split(this.platform === 'win32' ? ';' : ':');

    const searchPromises = paths.map(async (path) => {
      try {
        if (existsSync(path)) {
          const executables = await this.searchDirectoryForExecutables(path, softwareName);
          return executables;
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
      return [];
    });

    const pathResults = await Promise.all(searchPromises);
    const flatResults = pathResults.flat();

    // 按软件名称分组
    const groupedResults = this.groupExecutablesBySoftware(flatResults);

    for (const [appName, apps] of Object.entries(groupedResults)) {
      if (!softwareName || appName.toLowerCase().includes(softwareName.toLowerCase())) {
        results.push({
          softwareName: appName,
          detectedPaths: apps.map(app => app.path),
          confidence: Math.max(...apps.map(app => app.confidence)),
          source: 'environment'
        });
      }
    }

    return results;
  }

  /**
   * 搜索包管理器
   */
  private async searchPackageManagers(softwareName?: string): Promise<PathSearchResult[]> {
    const results: PathSearchResult[] = [];

    if (this.platform === 'linux') {
      // dpkg (Debian/Ubuntu)
      const dpkgResults = await this.searchDpkgPackages(softwareName);
      results.push(...dpkgResults);

      // rpm (RedHat/CentOS)
      const rpmResults = await this.searchRpmPackages(softwareName);
      results.push(...rpmResults);

      // snap packages
      const snapResults = await this.searchSnapPackages(softwareName);
      results.push(...snapResults);
    } else if (this.platform === 'darwin') {
      // Homebrew
      const brewResults = await this.searchHomebrewPackages(softwareName);
      results.push(...brewResults);

      // Mac App Store (通过mdfind)
      const appStoreResults = await this.searchAppStore(softwareName);
      results.push(...appStoreResults);
    } else if (this.platform === 'win32') {
      // Chocolatey
      const chocoResults = await this.searchChocolateyPackages(softwareName);
      results.push(...chocoResults);

      // Scoop
      const scoopResults = await this.searchScoopPackages(softwareName);
      results.push(...scoopResults);
    }

    return results;
  }

  /**
   * 搜索dpkg包
   */
  private async searchDpkgPackages(softwareName?: string): Promise<PathSearchResult[]> {
    const results: PathSearchResult[] = [];

    try {
      const { stdout } = await execAsync('dpkg -l | grep "^ii"');
      const packages = stdout.trim().split('\n');

      for (const pkg of packages) {
        const parts = pkg.split(/\s+/);
        if (parts.length >= 3) {
          const packageName = parts[1];
          const description = parts.slice(3).join(' ');

          if (!softwareName || 
              packageName.toLowerCase().includes(softwareName.toLowerCase()) ||
              description.toLowerCase().includes(softwareName.toLowerCase())) {

            try {
              const { stdout: files } = await execAsync(`dpkg -L ${packageName}`);
              const fileList = files.trim().split('\n');
              const executables = fileList.filter(file => 
                file.startsWith('/usr/bin/') || file.startsWith('/usr/local/bin/')
              );

              if (executables.length > 0) {
                results.push({
                  softwareName: packageName,
                  detectedPaths: executables,
                  confidence: 80,
                  source: 'package_manager'
                });
              }
            } catch (error) {
              // 忽略无法获取文件列表的包
            }
          }
        }
      }
    } catch (error) {
      console.warn('dpkg搜索失败:', error);
    }

    return results;
  }

  /**
   * 搜索Homebrew包
   */
  private async searchHomebrewPackages(softwareName?: string): Promise<PathSearchResult[]> {
    const results: PathSearchResult[] = [];

    try {
      const { stdout } = await execAsync('brew list --versions');
      const packages = stdout.trim().split('\n');

      for (const pkg of packages) {
        const parts = pkg.split(/\s+/);
        const packageName = parts[0];

        if (!softwareName || packageName.toLowerCase().includes(softwareName.toLowerCase())) {
          try {
            const { stdout: prefix } = await execAsync(`brew --prefix ${packageName}`);
            const installPath = prefix.trim();

            if (existsSync(installPath)) {
              const executables = await this.findExecutablesInPath(installPath);

              results.push({
                softwareName: packageName,
                detectedPaths: [installPath, ...executables],
                confidence: 85,
                source: 'package_manager',
                metadata: {
                  version: parts[1]
                }
              });
            }
          } catch (error) {
            // 忽略无法获取前缀的包
          }
        }
      }
    } catch (error) {
      console.warn('Homebrew搜索失败:', error);
    }

    return results;
  }

  /**
   * 搜索快捷方式和符号链接
   */
  private async searchShortcutsAndSymlinks(softwareName?: string): Promise<PathSearchResult[]> {
    const results: PathSearchResult[] = [];
    const searchPaths = this.getShortcutSearchPaths();

    for (const searchPath of searchPaths) {
      try {
        if (existsSync(searchPath)) {
          const shortcuts = await this.findShortcutsInDirectory(searchPath, softwareName);
          results.push(...shortcuts);
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    }

    return results;
  }

  /**
   * 获取快捷方式搜索路径
   */
  private getShortcutSearchPaths(): string[] {
    if (this.platform === 'win32') {
      const userProfile = process.env.USERPROFILE || '';
      const programData = process.env.PROGRAMDATA || '';
      return [
        `${userProfile}\\Desktop`,
        `${programData}\\Desktop`,
        `${userProfile}\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs`,
        `${programData}\\Microsoft\\Windows\\Start Menu\\Programs`
      ];
    } else if (this.platform === 'darwin') {
      return [
        `${homedir()}/Desktop`,
        '/Applications',
        `${homedir()}/Applications`
      ];
    } else {
      return [
        `${homedir()}/Desktop`,
        '/usr/share/applications',
        `${homedir()}/.local/share/applications`
      ];
    }
  }

  /**
   * 搜索用户配置目录
   */
  private async searchUserConfigDirectories(softwareName?: string): Promise<PathSearchResult[]> {
    const results: PathSearchResult[] = [];
    const configPaths = this.getUserConfigPaths();

    for (const configPath of configPaths) {
      try {
        if (existsSync(configPath)) {
          const configResults = await this.searchDirectoryForSoftwareConfig(configPath, softwareName);
          results.push(...configResults);
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    }

    return results;
  }

  /**
   * 获取用户配置路径
   */
  private getUserConfigPaths(): string[] {
    if (this.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || '';
      const appData = process.env.APPDATA || '';
      return [
        `${localAppData}`,
        `${appData}`
      ];
    } else if (this.platform === 'darwin') {
      return [
        `${homedir()}/Library/Application Support`,
        `${homedir()}/Library/Preferences`
      ];
    } else {
      return [
        `${homedir()}/.config`,
        `${homedir()}/.local/share`
      ];
    }
  }

  /**
   * 辅助方法
   */
  private async findExecutablesInPath(path: string): Promise<string[]> {
    const executables: string[] = [];
    
    try {
      if (!existsSync(path)) return executables;

      const items = require('fs').readdirSync(path);
      
      for (const item of items) {
        const fullPath = join(path, item);
        const stats = require('fs').statSync(fullPath);

        if (stats.isFile() && this.isExecutableFile(item, fullPath)) {
          executables.push(fullPath);
        }
      }
    } catch (error) {
      // 忽略错误
    }

    return executables;
  }

  private isExecutableFile(filename: string, fullPath: string): boolean {
    if (this.platform === 'win32') {
      return ['.exe', '.com', '.bat', '.cmd'].includes(require('path').extname(filename).toLowerCase());
    } else {
      try {
        const stats = require('fs').statSync(fullPath);
        return !!(stats.mode & 0o111); // 检查执行权限
      } catch {
        return false;
      }
    }
  }

  private async searchDirectoryForExecutables(path: string, softwareName?: string): Promise<Array<{path: string, baseDir: string, confidence: number}>> {
    const results: Array<{path: string, baseDir: string, confidence: number}> = [];
    
    try {
      const executables = await this.findExecutablesInPath(path);
      
      for (const exec of executables) {
        const filename = basename(exec);
        
        if (!softwareName || filename.toLowerCase().includes(softwareName.toLowerCase())) {
          results.push({
            path: exec,
            baseDir: path,
            confidence: this.calculateExecutableConfidence(filename, softwareName)
          });
        }
      }
    } catch (error) {
      // 忽略错误
    }

    return results;
  }

  private groupExecutablesBySoftware(executables: Array<{path: string, baseDir: string, confidence: number}>): Record<string, Array<{path: string, baseDir: string, confidence: number}>> {
    const grouped: Record<string, Array<{path: string, baseDir: string, confidence: number}>> = {};

    for (const exec of executables) {
      const filename = basename(exec.path);
      const appName = this.inferAppNameFromExecutable(filename);

      if (!grouped[appName]) {
        grouped[appName] = [];
      }
      grouped[appName].push(exec);
    }

    return grouped;
  }

  private inferAppNameFromExecutable(filename: string): string {
    // 移除扩展名
    const nameWithoutExt = this.platform === 'win32' 
      ? filename.replace(/\.[^.]+$/, '')
      : filename;

    // 清理常见的可执行文件名前缀和后缀
    const cleanedName = nameWithoutExt
      .replace(/^(run|start|launch|bin|exe)[-_]?/i, '')
      .replace(/[-_]?(run|start|launch|bin|exe)$/i, '')
      .replace(/[-_]?(\d+(\.\d+)*)(\.[^.]+)?$/, '');

    return cleanedName || nameWithoutExt;
  }

  private calculateRegistryConfidence(
    displayName: string, 
    installLocation: string, 
    publisher?: string, 
    version?: string
  ): number {
    let confidence = 50;

    if (publisher && this.isKnownPublisher(publisher)) {
      confidence += 20;
    }

    if (version && version !== 'unknown') {
      confidence += 15;
    }

    if (installLocation && existsSync(installLocation)) {
      confidence += 15;
    }

    return Math.min(confidence, 100);
  }

  private calculateExecutableConfidence(filename: string, softwareName?: string): number {
    let confidence = 50;

    if (softwareName) {
      if (filename.toLowerCase().includes(softwareName.toLowerCase())) {
        confidence += 30;
      }
    }

    if (this.isCommonExecutableName(filename)) {
      confidence += 20;
    }

    return Math.min(confidence, 100);
  }

  private isKnownPublisher(publisher: string): boolean {
    const knownPublishers = [
      'Adobe', 'Autodesk', 'Microsoft', 'Blender Foundation',
      'GIMP Team', 'Inkscape Team', 'Google', 'Mozilla',
      'JetBrains', 'Oracle', 'Apple'
    ];

    return knownPublishers.some(known => publisher.toLowerCase().includes(known.toLowerCase()));
  }

  private isCommonExecutableName(filename: string): boolean {
    const commonNames = [
      'code', 'blender', 'gimp', 'inkscape', 'krita',
      'firefox', 'chrome', 'chrome.exe', 'node', 'python',
      'java', 'git', 'docker', 'vscode'
    ];

    return commonNames.some(name => filename.toLowerCase().includes(name.toLowerCase()));
  }

  private async findShortcutsInDirectory(dirPath: string, softwareName?: string): Promise<PathSearchResult[]> {
    const results: PathSearchResult[] = [];

    try {
      const items = require('fs').readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stats = require('fs').statSync(fullPath);

        if (stats.isFile() || stats.isSymbolicLink()) {
          const target = this.resolveShortcut(fullPath);
          if (target && existsSync(target)) {
            if (!softwareName || item.toLowerCase().includes(softwareName.toLowerCase())) {
              results.push({
                softwareName: item.replace(/\.[^.]+$/, ''),
                detectedPaths: [target],
                confidence: 60,
                source: 'shortcut'
              });
            }
          }
        }
      }
    } catch (error) {
      // 忽略错误
    }

    return results;
  }

  private resolveShortcut(shortcutPath: string): string | null {
    try {
      if (this.platform === 'win32') {
        // Windows快捷方式解析需要特殊处理，这里简化实现
        return null; // 需要使用专门的库如windows-shortcuts
      } else {
        // 符号链接解析
        const stats = require('fs').lstatSync(shortcutPath);
        if (stats.isSymbolicLink()) {
          return require('fs').readlinkSync(shortcutPath);
        }
      }
    } catch (error) {
      // 忽略错误
    }

    return null;
  }

  private async searchDirectoryForSoftwareConfig(dirPath: string, softwareName?: string): Promise<PathSearchResult[]> {
    const results: PathSearchResult[] = [];

    try {
      const items = require('fs').readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stats = require('fs').statSync(fullPath);

        if (stats.isDirectory()) {
          if (!softwareName || item.toLowerCase().includes(softwareName.toLowerCase())) {
            results.push({
              softwareName: item,
              detectedPaths: [fullPath],
              confidence: 40,
              source: 'filesystem'
            });
          }
        }
      }
    } catch (error) {
      // 忽略错误
    }

    return results;
  }

  // 其他平台特定方法的空实现（占位符）
  private async searchRpmPackages(softwareName?: string): Promise<PathSearchResult[]> { return []; }
  private async searchSnapPackages(softwareName?: string): Promise<PathSearchResult[]> { return []; }
  private async searchAppStore(softwareName?: string): Promise<PathSearchResult[]> { return []; }
  private async searchChocolateyPackages(softwareName?: string): Promise<PathSearchResult[]> { return []; }
  private async searchScoopPackages(softwareName?: string): Promise<PathSearchResult[]> { return []; }
}