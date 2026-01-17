import { logger } from '../utils/logger';
import { prisma } from '../config/database';

export class SoftwareApiManagementService {
  async getAllApis(): Promise<any[]> {
    try {
      const apis = await prisma.software_apis.findMany({
        where: { isActive: true },
      });
      return apis;
    } catch (error) {
      logger.error('获取API列表失败:', error);
      return [];
    }
  }

  async detectSoftwareVersion(softwareId: string, userId?: string): Promise<any> {
    try {
      const software = await prisma.software_apis.findUnique({
        where: { id: softwareId },
      });

      if (!software) {
        throw new Error('软件不存在');
      }

      const versions = software.versions as any[];
      const latestVersion = versions && Array.isArray(versions) ? versions[0] : null;

      return {
        softwareId: software.id,
        name: software.softwareName,
        version: latestVersion?.version || 'unknown',
        releaseDate: latestVersion?.releaseDate,
        isLatest: true
      };
    } catch (error) {
      logger.error('检测软件版本失败:', error);
      throw error;
    }
  }

  async getSoftwareVersions(softwareId: string): Promise<any[]> {
    try {
      const software = await prisma.software_apis.findUnique({
        where: { id: softwareId },
      });
      const versions = software?.versions as any[] || [];
      return versions;
    } catch (error) {
      logger.error('获取软件版本失败:', error);
      return [];
    }
  }

  async getApiSpec(softwareId: string, version?: string): Promise<any> {
    try {
      const software = await prisma.software_apis.findUnique({
        where: { id: softwareId },
      });
      return software;
    } catch (error) {
      logger.error('获取API规范失败:', error);
      return null;
    }
  }

  async getSupportedSoftware(): Promise<any[]> {
    try {
      const software = await prisma.software_apis.findMany({
        where: { isActive: true },
        orderBy: { softwareName: 'asc' }
      });
      return software;
    } catch (error) {
      logger.error('获取支持的软件失败:', error);
      return [];
    }
  }
}

export const softwareApiManagementService = new SoftwareApiManagementService();
