import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { randomUUID } from 'crypto';

export interface ScriptDefinition {
  id?: string;
  name: string;
  description?: string;
  code: string;
  language: string;
  category?: string;
  tags?: string[];
  version?: string;
}

export class ScriptService {
  /**
   * 获取脚本统计数
   */
  static async getScriptCount(): Promise<number> {
    try {
      const count = await prisma.scripts.count();
      return count;
    } catch (error) {
      logger.error('Failed to get script count:', error);
      return 0;
    }
  }

  /**
   * 创建脚本
   */
  async createScript(userId: string, scriptDefinition: ScriptDefinition): Promise<any> {
    try {
      const script = await prisma.scripts.create({
        data: {
          id: scriptDefinition.id || randomUUID(),
          name: scriptDefinition.name,
          description: scriptDefinition.description,
          content: scriptDefinition.code,
          category: scriptDefinition.category || 'general',
          parameters: scriptDefinition.tags ? { tags: scriptDefinition.tags } : undefined,
          version: scriptDefinition.version || '1.0.0',
          authorId: userId,
          softwareId: '', // scripts 需要 softwareId，暂时使用空字符串
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info(`Script created: ${script.id}`);
      return script;
    } catch (error) {
      logger.error('Failed to create script:', error);
      throw error;
    }
  }

  /**
   * 获取用户的脚本列表
   */
  async getUserScripts(userId: string, page = 1, limit = 20): Promise<any> {
    try {
      const [scripts, total] = await Promise.all([
        prisma.scripts.findMany({
          where: { authorId: userId },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.scripts.count({ where: { authorId: userId } })
      ]);

      return { scripts, total, page, limit };
    } catch (error) {
      logger.error('Failed to get user scripts:', error);
      throw error;
    }
  }

  /**
   * 删除脚本
   */
  async deleteScript(scriptId: string): Promise<void> {
    try {
      await prisma.scripts.delete({
        where: { id: scriptId }
      });
      logger.info(`Script deleted: ${scriptId}`);
    } catch (error) {
      logger.error('Failed to delete script:', error);
      throw error;
    }
  }

  /**
   * 获取脚本详情
   */
  async getScriptById(scriptId: string): Promise<any> {
    try {
      const script = await prisma.scripts.findUnique({
        where: { id: scriptId }
      });
      return script;
    } catch (error) {
      logger.error('Failed to get script by id:', error);
      throw error;
    }
  }
}

export default ScriptService;
