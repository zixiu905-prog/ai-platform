import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { platform, arch } from 'os';
// @ts-ignore
import { fetch } from 'node-fetch'; // 如果需要，可以安装node-fetch

const execAsync = promisify(exec);

export interface SoftwareVersion {
  current: string;
  latest?: string;
  releaseDate?: Date;
  downloadUrl?: string;
  changelog?: string;
  isUpdateAvailable: boolean;
  updateType: 'major' | 'minor' | 'patch' | 'none';
}

export interface UpdateNotification {
  softwareName: string;
  currentVersion: string;
  latestVersion: string;
  updateType: 'major' | 'minor' | 'patch' | 'none';
  releaseDate?: Date;
  downloadUrl?: string;
  changelog?: string;
  critical: boolean;
}

export interface UpdateCheckOptions {
  checkCriticalOnly?: boolean;
  includePrerelease?: boolean;
  timeout?: number;
}

export class SoftwareUpdateService {
  private platform: NodeJS.Platform;
  private cache: Map<string, SoftwareVersion> = new Map();
  private lastCheckTime: Map<string, Date> = new Map();
  private checkInterval: number = 24 * 60 * 60 * 1000; // 24小时
  private updateConfigPath: string;

  // 软件更新源配置
  private readonly updateSources: Record<string, UpdateSourceConfig> = {
    // Adobe系列
    photoshop: {
      name: 'Adobe Photoshop',
      checkCommand: this.checkAdobeUpdate.bind(this),
      apiEndpoint: 'https://helpx.adobe.com/photoshop/kb/ps-version-history.html',
      versionPattern: /Photoshop\s+(\d+\.\d+(\.\d+)?)/g
    },
    illustrator: {
      name: 'Adobe Illustrator',
      checkCommand: this.checkAdobeUpdate.bind(this),
      apiEndpoint: 'https://helpx.adobe.com/illustrator/kb/illustrator-version-history.html',
      versionPattern: /Illustrator\s+(\d+\.\d+(\.\d+)?)/g
    },
    // Blender
    blender: {
      name: 'Blender',
      checkCommand: this.checkBlenderUpdate.bind(this),
      apiEndpoint: 'https://download.blender.org/release/',
      versionPattern: /blender-(\d+\.\d+(\.\d+)?)/g
    },
    // VS Code
    vscode: {
      name: 'Visual Studio Code',
      checkCommand: this.checkVSCodeUpdate.bind(this),
      apiEndpoint: 'https://api.github.com/repos/microsoft/vscode/releases/latest',
      versionPattern: /"tag_name":\s*"(\d+\.\d+\.\d+)"/g
    },
    // Git
    git: {
      name: 'Git',
      checkCommand: this.checkGitUpdate.bind(this),
      apiEndpoint: 'https://api.github.com/repos/git/git/releases/latest',
      versionPattern: /"tag_name":\s*"v(\d+\.\d+(\.\d+)?)/g
    },
    // Node.js
    nodejs: {
      name: 'Node.js',
      checkCommand: this.checkNodeUpdate.bind(this),
      apiEndpoint: 'https://nodejs.org/dist/index.json',
      versionPattern: /"version":\s*"v(\d+\.\d+(\.\d+)?)/g
    },
    // 其他常用工具
    gimp: {
      name: 'GIMP',
      checkCommand: this.checkGimpUpdate.bind(this),
      apiEndpoint: 'https://www.gimp.org/',
      versionPattern: /GIMP\s+(\d+\.\d+(\.\d+)?)/g
    }
  };

  constructor() {
    this.platform = platform();
    this.updateConfigPath = join(process.cwd(), 'config', 'updates.json');
    this.loadUpdateConfig();
  }

  /**
   * 检查所有软件更新
   */
  async checkAllUpdates(options: UpdateCheckOptions = {}): Promise<UpdateNotification[]> {
    const notifications: UpdateNotification[] = [];
    const softwareList = Object.keys(this.updateSources);

    for (const softwareKey of softwareList) {
      try {
        const update = await this.checkSoftwareUpdate(softwareKey, options);
        if (update && update.isUpdateAvailable) {
          notifications.push({
            softwareName: this.updateSources[softwareKey].name,
            currentVersion: update.current,
            latestVersion: update.latest!,
            updateType: update.updateType,
            releaseDate: update.releaseDate,
            downloadUrl: update.downloadUrl,
            changelog: update.changelog,
            critical: this.isCriticalUpdate(softwareKey, update)
          });
        }
      } catch (error) {
        console.warn(`检查 ${softwareKey} 更新失败:`, error);
      }
    }

    return notifications.sort((a, b) => {
      // 关键更新优先
      if (a.critical && !b.critical) return -1;
      if (!a.critical && b.critical) return 1;
      
      // 按更新类型排序
      const typeOrder = { major: 0, minor: 1, patch: 2, none: 3 };
      return typeOrder[a.updateType] - typeOrder[b.updateType];
    });
  }

  /**
   * 检查特定软件更新
   */
  async checkSoftwareUpdate(
    softwareKey: string, 
    options: UpdateCheckOptions = {}
  ): Promise<SoftwareVersion | null> {
    // 检查缓存
    const lastCheck = this.lastCheckTime.get(softwareKey);
    if (lastCheck && Date.now() - lastCheck.getTime() < this.checkInterval) {
      return this.cache.get(softwareKey) || null;
    }

    const sourceConfig = this.updateSources[softwareKey];
    if (!sourceConfig) {
      console.warn(`未知的软件: ${softwareKey}`);
      return null;
    }

    try {
      const versionInfo = await sourceConfig.checkCommand(softwareKey, options);
      
      // 更新缓存
      this.cache.set(softwareKey, versionInfo);
      this.lastCheckTime.set(softwareKey, new Date());
      
      return versionInfo;
    } catch (error) {
      console.error(`检查 ${softwareKey} 更新失败:`, error);
      return null;
    }
  }

  /**
   * 检查Adobe软件更新
   */
  private async checkAdobeUpdate(
    softwareKey: string, 
    options: UpdateCheckOptions
  ): Promise<SoftwareVersion> {
    // Adobe Creative Cloud通常通过Creative Cloud桌面应用管理更新
    // 这里实现基础版本检测
    const currentVersion = await this.getCurrentVersionFromExecutable(softwareKey);
    
    return {
      current: currentVersion,
      latest: await this.getLatestAdobeVersion(softwareKey),
      isUpdateAvailable: false, // 需要Creative Cloud API
      updateType: 'none'
    };
  }

  /**
   * 检查Blender更新
   */
  private async checkBlenderUpdate(
    softwareKey: string, 
    options: UpdateCheckOptions
  ): Promise<SoftwareVersion> {
    const currentVersion = await this.getCurrentVersionFromExecutable(softwareKey);
    
    try {
      const response = await fetch('https://download.blender.org/release/');
      const html = await response.text();
      
      const versionMatches = html.match(/blender-(\d+\.\d+(\.\d+)?)/g);
      if (versionMatches) {
        const versions = versionMatches
          .map(v => v.replace('blender-', ''))
          .sort(this.compareVersions);
        
        const latest = versions[versions.length - 1];
        const updateType = this.getUpdateType(currentVersion, latest);
        
        return {
          current: currentVersion,
          latest,
          isUpdateAvailable: updateType !== 'none',
          updateType,
          downloadUrl: `https://download.blender.org/release/Blender${latest.split('.')[0]}.${latest.split('.')[1]}/blender-${latest}-${this.platform === 'win32' ? 'windows' : this.platform === 'darwin' ? 'macos' : 'linux'}.tar.xz`
        };
      }
    } catch (error) {
      console.warn('获取Blender更新信息失败:', error);
    }

    return {
      current: currentVersion,
      isUpdateAvailable: false,
      updateType: 'none'
    };
  }

  /**
   * 检查VS Code更新
   */
  private async checkVSCodeUpdate(
    softwareKey: string, 
    options: UpdateCheckOptions
  ): Promise<SoftwareVersion> {
    const currentVersion = await this.getCurrentVersionFromExecutable(softwareKey);
    
    try {
      const response = await fetch('https://api.github.com/repos/microsoft/vscode/releases/latest');
      const release = await response.json();
      
      const latest = release.tag_name.replace('v', '');
      const updateType = this.getUpdateType(currentVersion, latest);
      
      return {
        current: currentVersion,
        latest,
        releaseDate: new Date(release.published_at),
        isUpdateAvailable: updateType !== 'none',
        updateType,
        downloadUrl: release.assets?.find((asset: any) =>
          asset.name.includes(this.platform === 'win32' ? 'win32' : this.platform === 'darwin' ? 'darwin' : 'linux')
        )?.browser_download_url,
        changelog: release.body
      };
    } catch (error) {
      console.warn('获取VS Code更新信息失败:', error);
    }

    return {
      current: currentVersion,
      isUpdateAvailable: false,
      updateType: 'none'
    };
  }

  /**
   * 检查Git更新
   */
  private async checkGitUpdate(
    softwareKey: string, 
    options: UpdateCheckOptions
  ): Promise<SoftwareVersion> {
    const currentVersion = await this.getCurrentVersionFromExecutable(softwareKey);
    
    try {
      const response = await fetch('https://api.github.com/repos/git/git/releases/latest');
      const release = await response.json();
      
      const latest = release.tag_name.replace('v', '');
      const updateType = this.getUpdateType(currentVersion, latest);
      
      return {
        current: currentVersion,
        latest,
        releaseDate: new Date(release.published_at),
        isUpdateAvailable: updateType !== 'none',
        updateType,
        downloadUrl: release.assets?.find((asset: any) =>
          asset.name.includes(this.platform === 'win32' ? 'win32' : this.platform === 'darwin' ? 'darwin' : 'linux')
        )?.browser_download_url,
        changelog: release.body
      };
    } catch (error) {
      console.warn('获取Git更新信息失败:', error);
    }

    return {
      current: currentVersion,
      isUpdateAvailable: false,
      updateType: 'none'
    };
  }

  /**
   * 检查Node.js更新
   */
  private async checkNodeUpdate(
    softwareKey: string, 
    options: UpdateCheckOptions
  ): Promise<SoftwareVersion> {
    const currentVersion = await this.getCurrentVersionFromExecutable(softwareKey);
    
    try {
      const response = await fetch('https://nodejs.org/dist/index.json');
      const releases = await response.json();
      
      const latestStable = releases
        .filter((release: any) => !release.version.includes('-'))
        .sort((a: any, b: any) => this.compareVersions(b.version.replace('v', ''), a.version.replace('v', '')))[0];
      
      const latest = latestStable.version.replace('v', '');
      const updateType = this.getUpdateType(currentVersion, latest);
      
      return {
        current: currentVersion,
        latest,
        releaseDate: new Date(latestStable.date),
        isUpdateAvailable: updateType !== 'none',
        updateType,
        downloadUrl: `https://nodejs.org/dist/v${latest}/node-v${latest}-${this.platform === 'win32' ? 'win' : this.platform}-${arch}.msi`
      };
    } catch (error) {
      console.warn('获取Node.js更新信息失败:', error);
    }

    return {
      current: currentVersion,
      isUpdateAvailable: false,
      updateType: 'none'
    };
  }

  /**
   * 检查GIMP更新
   */
  private async checkGimpUpdate(
    softwareKey: string, 
    options: UpdateCheckOptions
  ): Promise<SoftwareVersion> {
    const currentVersion = await this.getCurrentVersionFromExecutable(softwareKey);
    
    try {
      const response = await fetch('https://www.gimp.org/');
      const html = await response.text();
      
      const versionMatch = html.match(/GIMP\s+(\d+\.\d+(\.\d+)?)/);
      if (versionMatch) {
        const latest = versionMatch[1];
        const updateType = this.getUpdateType(currentVersion, latest);
        
        return {
          current: currentVersion,
          latest,
          isUpdateAvailable: updateType !== 'none',
          updateType,
          downloadUrl: 'https://www.gimp.org/downloads/'
        };
      }
    } catch (error) {
      console.warn('获取GIMP更新信息失败:', error);
    }

    return {
      current: currentVersion,
      isUpdateAvailable: false,
      updateType: 'none'
    };
  }

  /**
   * 从可执行文件获取当前版本
   */
  private async getCurrentVersionFromExecutable(softwareKey: string): Promise<string> {
    try {
      const execMap: Record<string, string> = {
        photoshop: this.platform === 'win32' ? 'Photoshop.exe' : 'Photoshop',
        illustrator: this.platform === 'win32' ? 'Illustrator.exe' : 'Illustrator',
        blender: this.platform === 'win32' ? 'blender.exe' : 'blender',
        vscode: this.platform === 'win32' ? 'Code.exe' : 'code',
        git: 'git',
        nodejs: this.platform === 'win32' ? 'node.exe' : 'node',
        gimp: this.platform === 'win32' ? 'gimp.exe' : 'gimp'
      };

      const executable = execMap[softwareKey];
      if (!executable) return '0.0.0';

      let command = '';
      if (softwareKey === 'blender') {
        command = `"${executable}" --version`;
      } else if (softwareKey === 'vscode') {
        command = `"${executable}" --version`;
      } else if (softwareKey === 'git') {
        command = 'git --version';
      } else if (softwareKey === 'nodejs') {
        command = 'node --version';
      } else {
        command = `"${executable}" --version`;
      }

      const { stdout } = await execAsync(command);
      const versionMatch = stdout.match(/(\d+\.\d+(\.\d+)?)/);
      return versionMatch ? versionMatch[1] : '0.0.0';
    } catch (error) {
      return '0.0.0';
    }
  }

  /**
   * 获取最新Adobe版本（简化实现）
   */
  private async getLatestAdobeVersion(softwareKey: string): Promise<string> {
    // 实际实现需要Adobe Creative Cloud API
    // 这里返回一个模拟版本
    return '2024.0.0';
  }

  /**
   * 获取更新类型
   */
  private getUpdateType(current: string, latest: string): SoftwareVersion['updateType'] {
    const comparison = this.compareVersions(current, latest);
    if (comparison < 0) {
      const currentParts = current.split('.').map(Number);
      const latestParts = latest.split('.').map(Number);
      
      if (latestParts[0] > currentParts[0]) return 'major';
      if (latestParts[1] > currentParts[1]) return 'minor';
      if (latestParts[2] > currentParts[2]) return 'patch';
    }
    return 'none';
  }

  /**
   * 比较版本号
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }
    
    return 0;
  }

  /**
   * 判断是否为关键更新
   */
  private isCriticalUpdate(softwareKey: string, versionInfo: SoftwareVersion): boolean {
    // 安全更新通常是关键更新
    const securitySensitiveSoftware = ['git', 'nodejs', 'vscode'];
    
    if (securitySensitiveSoftware.includes(softwareKey) && versionInfo.updateType === 'patch') {
      return true;
    }
    
    // 主版本更新通常也很重要
    return versionInfo.updateType === 'major';
  }

  /**
   * 下载更新
   */
  async downloadUpdate(softwareKey: string, downloadUrl: string, savePath: string): Promise<boolean> {
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      require('fs').writeFileSync(savePath, Buffer.from(buffer));
      
      return true;
    } catch (error) {
      console.error(`下载 ${softwareKey} 更新失败:`, error);
      return false;
    }
  }

  /**
   * 安装更新
   */
  async installUpdate(softwareKey: string, installerPath: string): Promise<boolean> {
    try {
      let command = '';
      
      if (this.platform === 'win32') {
        command = `"${installerPath}" /S`;
      } else if (this.platform === 'darwin') {
        command = `open "${installerPath}"`;
      } else {
        command = `sudo dpkg -i "${installerPath}"`;
      }

      await execAsync(command);
      return true;
    } catch (error) {
      console.error(`安装 ${softwareKey} 更新失败:`, error);
      return false;
    }
  }

  /**
   * 设置检查间隔
   */
  setCheckInterval(interval: number): void {
    this.checkInterval = interval;
    this.saveUpdateConfig();
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.lastCheckTime.clear();
  }

  /**
   * 获取更新统计
   */
  getUpdateStats(): {
    totalSoftware: number;
    outdatedSoftware: number;
    criticalUpdates: number;
    lastCheckTime?: Date;
  } {
    const totalSoftware = Object.keys(this.updateSources).length;
    const outdatedSoftware = Array.from(this.cache.values()).filter(v => v.isUpdateAvailable).length;
    const criticalUpdates = Array.from(this.cache.entries()).filter(([key, version]) => 
      version.isUpdateAvailable && this.isCriticalUpdate(key, version)
    ).length;
    
    const lastCheckTime = Array.from(this.lastCheckTime.values())
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      totalSoftware,
      outdatedSoftware,
      criticalUpdates,
      lastCheckTime
    };
  }

  /**
   * 加载更新配置
   */
  private loadUpdateConfig(): void {
    try {
      if (existsSync(this.updateConfigPath)) {
        const config = JSON.parse(readFileSync(this.updateConfigPath, 'utf-8'));
        if (config.checkInterval) {
          this.checkInterval = config.checkInterval;
        }
      }
    } catch (error) {
      console.warn('加载更新配置失败:', error);
    }
  }

  /**
   * 保存更新配置
   */
  private saveUpdateConfig(): void {
    try {
      const configDir = dirname(this.updateConfigPath);
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }

      const config = {
        checkInterval: this.checkInterval,
        lastUpdated: new Date().toISOString()
      };

      writeFileSync(this.updateConfigPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.warn('保存更新配置失败:', error);
    }
  }
}

// 更新源配置接口
interface UpdateSourceConfig {
  name: string;
  checkCommand: (softwareKey: string, options: UpdateCheckOptions) => Promise<SoftwareVersion>;
  apiEndpoint?: string;
  versionPattern?: RegExp;
}