import { logger } from '../utils/logger';
import { prisma } from '../config/database';

interface SoftwareInfo {
  name: string;
  version: string;
  os: string;
  path?: string;
}

interface CompatibilityRule {
  softwareName: string;
  versionRange: string;
  compatible: boolean;
  requiresUpdate?: boolean;
  notes?: string;
}

export class SoftwareCompatibilityService {
  private compatibilityRules: Map<string, CompatibilityRule[]> = new Map();
  private cachedResults: Map<string, any> = new Map();

  constructor() {
    this.loadCompatibilityRules();
  }

  /**
   * 加载兼容性规则
   */
  private loadCompatibilityRules() {
    // Adobe Photoshop
    this.compatibilityRules.set('Photoshop', [
      {
        softwareName: 'Photoshop',
        versionRange: '>=2021',
        compatible: true,
        notes: '完全支持所有功能'
      },
      {
        softwareName: 'Photoshop',
        versionRange: '>=2019 && <2021',
        compatible: true,
        requiresUpdate: true,
        notes: '建议升级到2021或更高版本以获得完整功能'
      },
      {
        softwareName: 'Photoshop',
        versionRange: '<2019',
        compatible: false,
        notes: '不支持的版本，请升级Photoshop'
      }
    ]);

    // AutoCAD
    this.compatibilityRules.set('AutoCAD', [
      {
        softwareName: 'AutoCAD',
        versionRange: '>=2022',
        compatible: true,
        notes: '完全支持COM接口'
      },
      {
        softwareName: 'AutoCAD',
        versionRange: '>=2020 && <2022',
        compatible: true,
        requiresUpdate: true,
        notes: '部分功能支持，建议升级'
      },
      {
        softwareName: 'AutoCAD',
        versionRange: '<2020',
        compatible: false,
        notes: '版本过旧，无法使用COM接口'
      }
    ]);

    // Blender
    this.compatibilityRules.set('Blender', [
      {
        softwareName: 'Blender',
        versionRange: '>=3.0',
        compatible: true,
        notes: '完全支持Python脚本接口'
      },
      {
        softwareName: 'Blender',
        versionRange: '>=2.9 && <3.0',
        compatible: true,
        requiresUpdate: true,
        notes: '建议升级到3.0+'
      },
      {
        softwareName: 'Blender',
        versionRange: '<2.9',
        compatible: false,
        notes: '不支持的版本'
      }
    ]);

    // Illustrator
    this.compatibilityRules.set('Illustrator', [
      {
        softwareName: 'Illustrator',
        versionRange: '>=2021',
        compatible: true
      },
      {
        softwareName: 'Illustrator',
        versionRange: '<2021',
        compatible: true,
        requiresUpdate: true
      }
    ]);

    // Premiere Pro
    this.compatibilityRules.set('Premiere', [
      {
        softwareName: 'Premiere',
        versionRange: '>=2022',
        compatible: true
      },
      {
        softwareName: 'Premiere',
        versionRange: '<2022',
        compatible: true,
        requiresUpdate: true
      }
    ]);

    logger.info('Compatibility rules loaded', {
      softwares: Array.from(this.compatibilityRules.keys())
    });
  }

  /**
   * 解析版本字符串为可比较的数字
   */
  private parseVersion(version: string): number {
    const parts = version.match(/(\d+)(\.\d+)?(\.\d+)?/);
    if (!parts) return 0;

    const major = parseInt(parts[1] || '0', 10);
    const minor = parseInt(parts[2]?.substring(1) || '0', 10);
    const patch = parseInt(parts[3]?.substring(1) || '0', 10);

    return major * 10000 + minor * 100 + patch;
  }

  /**
   * 检查版本是否在范围内
   */
  private checkVersionRange(version: string, range: string): boolean {
    const versionNum = this.parseVersion(version);

    // 简单的范围检查
    if (range.startsWith('>=')) {
      const minVersion = range.substring(2);
      const minNum = this.parseVersion(minVersion);
      return versionNum >= minNum;
    } else if (range.startsWith('<=')) {
      const maxVersion = range.substring(2);
      const maxNum = this.parseVersion(maxVersion);
      return versionNum <= maxNum;
    } else if (range.startsWith('<')) {
      const maxVersion = range.substring(1);
      const maxNum = this.parseVersion(maxVersion);
      return versionNum < maxNum;
    } else if (range.includes('&&')) {
      // 组合条件: >=2019 && <2021
      const conditions = range.split('&&').map(c => c.trim());
      return conditions.every(c => this.checkVersionRange(version, c));
    }

    return false;
  }

  /**
   * 检查软件兼容性
   */
  async checkCompatibility(softwareInfo: SoftwareInfo): Promise<any> {
    const cacheKey = `${softwareInfo.name}-${softwareInfo.version}-${softwareInfo.os}`;
    
    // 检查缓存
    if (this.cachedResults.has(cacheKey)) {
      return this.cachedResults.get(cacheKey);
    }

    try {
      const rules = this.compatibilityRules.get(softwareInfo.name) || [];

      for (const rule of rules) {
        if (this.checkVersionRange(softwareInfo.version, rule.versionRange)) {
          const result = {
            compatible: rule.compatible,
            softwareName: softwareInfo.name,
            version: softwareInfo.version,
            requiresUpdate: rule.requiresUpdate || false,
            notes: rule.notes,
            checkedAt: new Date().toISOString(),
            os: softwareInfo.os
          };

          // 缓存结果
          this.cachedResults.set(cacheKey, result);

          logger.info(`Compatibility check: ${softwareInfo.name} ${softwareInfo.version}`, result);

          return result;
        }
      }

      // 没有匹配的规则，返回默认结果
      const defaultResult = {
        compatible: true,
        softwareName: softwareInfo.name,
        version: softwareInfo.version,
        requiresUpdate: false,
        notes: '未知的软件版本，建议手动测试',
        checkedAt: new Date().toISOString(),
        os: softwareInfo.os
      };

      this.cachedResults.set(cacheKey, defaultResult);
      return defaultResult;

    } catch (error) {
      logger.error('Failed to check compatibility:', error);

      return {
        compatible: false,
        softwareName: softwareInfo.name,
        version: softwareInfo.version,
        error: '兼容性检查失败'
      };
    }
  }

  /**
   * 自动检测软件版本
   */
  async detectSoftwareVersion(softwarePath: string, softwareName: string): Promise<string | null> {
    try {
      // 这里应该调用桌面端的软件检测服务
      // 暂时返回模拟数据
      logger.info(`Detecting version for ${softwareName} at ${softwarePath}`);

      // 模拟版本检测结果
      const mockVersions: { [key: string]: string } = {
        'Photoshop': '2024.1',
        'AutoCAD': '2023.2',
        'Blender': '3.6.0',
        'Illustrator': '2024.0',
        'Premiere': '2024.1'
      };

      return mockVersions[softwareName] || 'Unknown';
    } catch (error) {
      logger.error('Failed to detect software version:', error);
      return null;
    }
  }

  /**
   * 批量检查软件兼容性
   */
  async batchCheckCompatibility(softwares: SoftwareInfo[]): Promise<any[]> {
    const results = await Promise.all(
      softwares.map(software => this.checkCompatibility(software))
    );

    logger.info(`Batch compatibility check completed: ${softwares.length} softwares`);

    return results;
  }

  /**
   * 获取软件推荐信息
   */
  async getSoftwareRecommendations(softwareName: string): Promise<any> {
    const rules = this.compatibilityRules.get(softwareName) || [];
    const latestCompatible = rules.find(r => r.compatible && !r.requiresUpdate);

    if (!latestCompatible) {
      return {
        recommended: false,
        message: '未找到兼容的版本信息'
      };
    }

    return {
      recommended: true,
      softwareName,
      notes: latestCompatible.notes,
      latestCompatibleVersion: latestCompatible.versionRange
    };
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cachedResults.clear();
    logger.info('Compatibility cache cleared');
  }
}

export const softwareCompatibilityService = new SoftwareCompatibilityService();
