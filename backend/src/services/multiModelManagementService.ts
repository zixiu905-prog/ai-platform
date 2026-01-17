import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

export enum ModelStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  DEPRECATED = 'DEPRECATED'
}

export enum ModelType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  MULTIMODAL = 'multimodal'
}

export interface ModelConfig {
  id: string;
  name: string;
  type: ModelType;
  status: ModelStatus;
  version?: string;
  description?: string;
  provider?: string;
  endpoint?: string;
  apiKey?: string;
  maxTokens: number;
  maxContextLength?: number;
  supportedLanguages?: string[];
  pricing: {
    inputPrice: number;
    outputPrice: number;
    currency: string;
  };
  capabilities?: string[];
  performance?: {
    latency: number;
    accuracy: number;
  };
}

export interface ModelMetrics {
  modelId: string;
  totalRequests: number;
  totalTokens: number;
  avgLatency: number;
  successRate: number;
  errors: number;
  lastUsed: Date;
}

/**
 * 简化的多模型管理服务
 * ai_models 表字段有限，许多属性不存在
 */
export class MultiModelManagementService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * 获取所有模型
   */
  async getAllModels(includeInactive = false): Promise<ModelConfig[]> {
    try {
      const where = includeInactive ? {} : { isActive: true };
      const models = await this.prisma.ai_models.findMany({
        where,
        orderBy: { name: 'asc' }
      });

      return models.map(m => ({
        id: m.id,
        name: m.name,
        type: m.type as ModelType,
        status: m.isActive ? ModelStatus.ACTIVE : ModelStatus.INACTIVE,
        version: undefined,
        description: undefined,
        provider: undefined,
        endpoint: undefined,
        maxTokens: m.maxTokens,
        maxContextLength: undefined,
        supportedLanguages: undefined,
        pricing: {
          inputPrice: m.costPerToken,
          outputPrice: m.costPerToken,
          currency: 'USD'
        },
        capabilities: undefined,
        performance: undefined
      }));
    } catch (error) {
      logger.error('Failed to get all models:', error);
      return [];
    }
  }

  /**
   * 获取模型
   */
  async getModel(id: string): Promise<ModelConfig | null> {
    try {
      const model = await this.prisma.ai_models.findUnique({ where: { id } });

      if (!model) return null;

      return {
        id: model.id,
        name: model.name,
        type: model.type as ModelType,
        status: model.isActive ? ModelStatus.ACTIVE : ModelStatus.INACTIVE,
        version: undefined,
        description: undefined,
        provider: undefined,
        endpoint: undefined,
        maxTokens: model.maxTokens,
        maxContextLength: undefined,
        supportedLanguages: undefined,
        pricing: {
          inputPrice: model.costPerToken,
          outputPrice: model.costPerToken,
          currency: 'USD'
        },
        capabilities: undefined,
        performance: undefined
      };
    } catch (error) {
      logger.error('Failed to get model:', error);
      return null;
    }
  }

  /**
   * 创建模型
   */
  async createModel(config: Omit<ModelConfig, 'id' | 'performance'>): Promise<ModelConfig> {
    try {
      logger.warn('createModel - ai_models table has limited fields');
      throw new Error('模型表字段有限，无法创建完整模型');
    } catch (error) {
      logger.error('Failed to create model:', error);
      throw new Error(`Failed to create model: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新模型
   */
  async updateModel(id: string, config: Partial<ModelConfig>): Promise<ModelConfig> {
    try {
      const updateData: any = {};
      if (config.name) updateData.name = config.name;
      if (config.type) updateData.type = config.type as any;
      if (config.maxTokens) updateData.maxTokens = config.maxTokens;
      if (config.pricing) {
        updateData.costPerToken = config.pricing.inputPrice;
      }

      await this.prisma.ai_models.update({
        where: { id },
        data: updateData
      });

      logger.info(`Model updated: ${id}`);

      return await this.getModel(id) as ModelConfig;
    } catch (error) {
      logger.error('Failed to update model:', error);
      throw new Error(`Failed to update model: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 删除模型
   */
  async deleteModel(id: string): Promise<void> {
    try {
      await this.prisma.ai_models.delete({ where: { id } });
      logger.info(`Model deleted: ${id}`);
    } catch (error) {
      logger.error('Failed to delete model:', error);
      throw new Error(`Failed to delete model: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取模型指标
   */
  async getModelMetrics(id: string, period = '7d'): Promise<ModelMetrics> {
    try {
      logger.warn('getModelMetrics - usage_records table may not exist or lack required fields');
      return {
        modelId: id,
        totalRequests: 0,
        totalTokens: 0,
        avgLatency: 0,
        successRate: 0,
        errors: 0,
        lastUsed: new Date()
      };
    } catch (error) {
      logger.error('Failed to get model metrics:', error);
      return {
        modelId: id,
        totalRequests: 0,
        totalTokens: 0,
        avgLatency: 0,
        successRate: 0,
        errors: 0,
        lastUsed: new Date()
      };
    }
  }

  /**
   * 记录模型请求
   */
  async recordModelRequest(
    modelId: string,
    userId: string,
    operation: string,
    success: boolean,
    latency: number,
    tokens?: number,
    error?: string
  ): Promise<void> {
    try {
      logger.warn('recordModelRequest - usage_records table may not exist or lack required fields');
    } catch (error) {
      logger.error('Failed to record model request:', error);
    }
  }

  /**
   * 获取模型推荐
   */
  async getModelRecommendations(requirements: {
    type?: ModelType;
    minAccuracy?: number;
    maxLatency?: number;
    maxPrice?: number;
    languages?: string[];
  }): Promise<ModelConfig[]> {
    try {
      const models = await this.getAllModels();

      return models.filter(model => {
        if (requirements.type && model.type !== requirements.type) return false;
        if (requirements.maxPrice && model.pricing.inputPrice > requirements.maxPrice) return false;
        return true;
      }).sort((a, b) => {
        return a.pricing.inputPrice - b.pricing.inputPrice;
      });
    } catch (error) {
      logger.error('Failed to get model recommendations:', error);
      return [];
    }
  }

  /**
   * 切换模型状态
   */
  async toggleModelStatus(id: string, status: ModelStatus): Promise<void> {
    try {
      const isActive = status === ModelStatus.ACTIVE;
      await this.prisma.ai_models.update({
        where: { id },
        data: { isActive }
      });

      logger.info(`Model status changed: ${id} -> ${status}`);
    } catch (error) {
      logger.error('Failed to toggle model status:', error);
      throw new Error(`Failed to toggle model status: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
}

export const multiModelManagementService = new MultiModelManagementService();
