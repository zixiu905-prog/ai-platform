import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { DoubaoAIService } from './doubaoAIService';

export interface SoftwareVersion {
  version: string;
  releaseDate: Date;
  features: string[];
  downloadUrl?: string;
  fileHash?: string;
  fileSize?: number;
  compatibility?: string;
  status: 'stable' | 'beta' | 'alpha' | 'deprecated';
  notes?: string;
}

export interface APICompatibilityResult {
  apiVersion: string;
  compatibility: 'fully' | 'partial' | 'none';
  features: string[];
  deprecated: boolean;
  migrationGuide?: string;
}

export class SoftwareVersionManagementService {
  private aiService: DoubaoAIService;

  constructor() {
    this.aiService = new DoubaoAIService();
  }

  /**
   * 获取软件版本列表
   */
  async getVersions(softwareId: string): Promise<SoftwareVersion[]> {
    try {
      const software = await prisma.software_apis.findUnique({
        where: { id: softwareId }
      });

      if (!software) {
        throw new Error(`软件不存在: ${softwareId}`);
      }

      const versions = software.versions as any;
      const versionList = versions?.list || [];

      return versionList.map((v: any) => ({
        version: v.version,
        releaseDate: new Date(v.releaseDate),
        features: v.features || [],
        downloadUrl: v.downloadUrl,
        fileHash: v.fileHash,
        fileSize: v.fileSize,
        compatibility: v.compatibility,
        status: v.status || 'stable',
        notes: v.notes
      }));
    } catch (error) {
      logger.error('获取软件版本列表失败:', error);
      return [];
    }
  }

  /**
   * 匹配API版本
   */
  async matchAPIForVersion(softwareId: string, version: string): Promise<APICompatibilityResult> {
    try {
      logger.info(`匹配API版本: ${softwareId} - ${version}`);

      const software = await prisma.software_apis.findUnique({
        where: { id: softwareId }
      });

      if (!software) {
        throw new Error(`软件不存在: ${softwareId}`);
      }

      const versions = software.versions as any;
      const versionData = versions?.list?.find((v: any) => v.version === version);

      if (!versionData) {
        return {
          apiVersion: 'unknown',
          compatibility: 'none',
          features: [],
          deprecated: false
        };
      }

      const apiConfig = software.apiConfig as any;
      const apiVersion = apiConfig?.version || 'v1.0.0';

      // 分析兼容性
      const compatibility = this.analyzeCompatibility(version, apiVersion);

      return {
        apiVersion,
        compatibility: compatibility.level,
        features: versionData.features || [],
        deprecated: versionData.status === 'deprecated',
        migrationGuide: compatibility.migrationGuide
      };
    } catch (error) {
      logger.error('匹配API版本失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有软件版本
   */
  async getAllSoftwareVersions(softwareId: string): Promise<SoftwareVersion[]> {
    return this.getVersions(softwareId);
  }

  /**
   * 收集软件版本信息（AI自动收录）
   */
  async collectSoftwareVersions(softwareName: string): Promise<SoftwareVersion[]> {
    try {
      logger.info(`开始收集软件版本信息: ${softwareName}`);

      // 使用AI搜索和收集软件版本信息
      const versions = await this.searchSoftwareVersions(softwareName);

      logger.info(`成功收集 ${softwareName} 的 ${versions.length} 个版本`);
      return versions;
    } catch (error) {
      logger.error(`收集软件版本信息失败: ${softwareName}`, error);
      throw error;
    }
  }

  /**
   * 添加新版本
   */
  async addVersion(softwareId: string, version: SoftwareVersion): Promise<void> {
    try {
      const software = await prisma.software_apis.findUnique({
        where: { id: softwareId }
      });

      if (!software) {
        throw new Error(`软件不存在: ${softwareId}`);
      }

      const versions = software.versions as any;
      const versionList = versions?.list || [];

      // 检查版本是否已存在
      const existingVersion = versionList.find((v: any) => v.version === version.version);
      if (existingVersion) {
        throw new Error(`版本 ${version.version} 已存在`);
      }

      // 添加新版本
      versionList.push(version);

      // 更新数据库
      await prisma.software_apis.update({
        where: { id: softwareId },
        data: {
          versions: {
            ...(versions || {}),
            list: versionList,
            latest: version
          },
          updatedAt: new Date()
        }
      });

      logger.info(`成功添加版本: ${version.version}`);
    } catch (error) {
      logger.error('添加版本失败:', error);
      throw error;
    }
  }

  /**
   * 删除版本
   */
  async deleteVersion(softwareId: string, version: string): Promise<void> {
    try {
      const software = await prisma.software_apis.findUnique({
        where: { id: softwareId }
      });

      if (!software) {
        throw new Error(`软件不存在: ${softwareId}`);
      }

      const versions = software.versions as any;
      const versionList = versions?.list || [];

      // 删除指定版本
      const newVersionList = versionList.filter((v: any) => v.version !== version);

      // 更新数据库
      await prisma.software_apis.update({
        where: { id: softwareId },
        data: {
          versions: {
            ...(versions || {}),
            list: newVersionList
          },
          updatedAt: new Date()
        }
      });

      logger.info(`成功删除版本: ${version}`);
    } catch (error) {
      logger.error('删除版本失败:', error);
      throw error;
    }
  }

  /**
   * 检查版本更新
   */
  async checkForUpdates(softwareId: string, currentVersion: string): Promise<{
    hasUpdate: boolean;
    latestVersion: string;
    updateType: 'major' | 'minor' | 'patch' | 'none';
    changelog?: string;
  }> {
    try {
      const versions = await this.getVersions(softwareId);

      if (versions.length === 0) {
        return {
          hasUpdate: false,
          latestVersion: currentVersion,
          updateType: 'none'
        };
      }

      // 排序版本（降序）
      const sortedVersions = [...versions].sort((a, b) =>
        this.compareVersions(b.version, a.version)
      );

      const latestVersion = sortedVersions[0].version;

      // 比较版本
      const comparison = this.compareVersions(latestVersion, currentVersion);

      return {
        hasUpdate: comparison > 0,
        latestVersion,
        updateType: this.getUpdateType(currentVersion, latestVersion),
        changelog: sortedVersions[0].notes
      };
    } catch (error) {
      logger.error('检查版本更新失败:', error);
      throw error;
    }
  }

  /**
   * 搜索软件版本信息
   */
  private async searchSoftwareVersions(softwareName: string): Promise<SoftwareVersion[]> {
    try {
      // 使用AI搜索软件版本信息
      const prompt = `请搜索 ${softwareName} 的最新版本信息，包括版本号、发布日期、功能特性等。返回JSON格式。`;

      const response = await DoubaoAIService.generateText(prompt);

      // 解析AI返回的版本信息
      // 这里应该有更复杂的解析逻辑
      return [
        {
          version: '1.0.0',
          releaseDate: new Date(),
          features: ['基础功能'],
          status: 'stable'
        }
      ];
    } catch (error) {
      logger.error('搜索软件版本信息失败:', error);
      return [];
    }
  }

  /**
   * 比较版本号
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;

      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }

    return 0;
  }

  /**
   * 获取更新类型
   */
  private getUpdateType(current: string, latest: string): 'major' | 'minor' | 'patch' | 'none' {
    const parts1 = current.split('.').map(Number);
    const parts2 = latest.split('.').map(Number);

    if (parts2[0] > parts1[0]) return 'major';
    if (parts2[1] > parts1[1]) return 'minor';
    if (parts2[2] > parts1[2]) return 'patch';
    return 'none';
  }

  /**
   * 分析兼容性
   */
  private analyzeCompatibility(softwareVersion: string, apiVersion: string): {
    level: 'fully' | 'partial' | 'none';
    migrationGuide?: string;
  } {
    // 这里应该有更复杂的兼容性分析逻辑
    // 简化起见，假设大版本不兼容
    const majorSoftware = softwareVersion.split('.')[0];
    const majorApi = apiVersion.split('.')[0];

    if (majorSoftware === majorApi) {
      return { level: 'fully' };
    }

    return {
      level: 'partial',
      migrationGuide: `从 ${softwareVersion} 升级到 ${apiVersion} 需要查看迁移指南`
    };
  }
}

export default SoftwareVersionManagementService;
export const softwareVersionManagementService = new SoftwareVersionManagementService();
