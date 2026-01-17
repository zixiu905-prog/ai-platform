import { logger } from '../utils/logger';
import { prisma } from '../config/database';

export type RecommendationType = 'CONTENT' | 'USER' | 'SCRIPT' | 'TEMPLATE' | 'AI_MODEL';

export interface Recommendation {
  id: string;
  userId: string;
  type: RecommendationType;
  itemId: string;
  score: number;
  reason: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  expiresAt: Date;
}

export interface RecommendationConfig {
  enabled: boolean;
  algorithm: 'collaborative' | 'content' | 'hybrid';
  minScore: number;
  maxAgeHours: number;
  cacheEnabled: boolean;
}

export class RecommendationService {
  private config: RecommendationConfig;
  private cache: Map<string, Recommendation[]>;

  constructor() {
    this.config = {
      enabled: true,
      algorithm: 'hybrid',
      minScore: 0.5,
      maxAgeHours: 24,
      cacheEnabled: true
    };
    this.cache = new Map();
  }

  /**
   * 获取推荐
   */
  async getRecommendations(
    userId: string,
    type: RecommendationType,
    limit: number = 10,
    context?: Record<string, any>
  ): Promise<Recommendation[]> {
    try {
      if (!this.config.enabled) {
        return [];
      }

      logger.info(`获取推荐: ${userId} - ${type}`, { limit, context });

      // 检查缓存
      const cacheKey = `${userId}-${type}-${JSON.stringify(context)}`;
      if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
        const cachedRecommendations = this.cache.get(cacheKey)!;
        if (this.isCacheValid(cachedRecommendations)) {
          return cachedRecommendations.slice(0, limit);
        }
      }

      // 生成推荐
      let recommendations: Recommendation[];

      switch (this.config.algorithm) {
        case 'collaborative':
          recommendations = await this.collaborativeFiltering(userId, type, context);
          break;
        case 'content':
          recommendations = await this.contentBasedFiltering(userId, type, context);
          break;
        case 'hybrid':
          recommendations = await this.hybridFiltering(userId, type, context);
          break;
        default:
          recommendations = [];
      }

      // 过滤低分推荐
      recommendations = recommendations.filter(r => r.score >= this.config.minScore);

      // 排序并限制数量
      recommendations.sort((a, b) => b.score - a.score);
      recommendations = recommendations.slice(0, limit);

      // 缓存结果
      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, recommendations);
      }

      return recommendations;
    } catch (error) {
      logger.error('获取推荐失败:', error);
      return [];
    }
  }

  /**
   * 记录反馈
   */
  async recordFeedback(userId: string, recommendationId: string, feedback: 'positive' | 'negative'): Promise<void> {
    try {
      logger.info(`记录推荐反馈: ${userId}, ${recommendationId}, ${feedback}`);

      // 存储反馈到数据库
      await prisma.audit_logs.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          action: 'recommendation_feedback',
          resource: recommendationId,
          details: {
            feedback,
            timestamp: new Date().toISOString()
          },
          createdAt: new Date()
        }
      });

      // 更新推荐算法模型（简化版）
      this.updateUserPreference(userId, recommendationId, feedback);
    } catch (error) {
      logger.error('记录推荐反馈失败:', error);
    }
  }

  /**
   * 记录用户行为
   */
  async recordUserBehavior(
    userId: string,
    behaviorType: string,
    itemId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      logger.info(`记录用户行为: ${userId}, ${behaviorType}, ${itemId}`);

      // 存储行为到数据库
      await prisma.audit_logs.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          action: behaviorType,
          resource: itemId,
          details: metadata,
          createdAt: new Date()
        }
      });
    } catch (error) {
      logger.error('记录用户行为失败:', error);
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(config: Partial<RecommendationConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      logger.info('更新推荐配置:', this.config);

      // 清除缓存
      this.cache.clear();
    } catch (error) {
      logger.error('更新推荐配置失败:', error);
    }
  }

  /**
   * 获取配置
   */
  async getConfig(): Promise<RecommendationConfig> {
    return { ...this.config };
  }

  /**
   * 清理过期推荐
   */
  async cleanupExpiredRecommendations(): Promise<number> {
    try {
      let cleanedCount = 0;

      for (const [key, recommendations] of this.cache.entries()) {
        if (!this.isCacheValid(recommendations)) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }

      logger.info(`清理过期推荐: ${cleanedCount} 个`);
      return cleanedCount;
    } catch (error) {
      logger.error('清理过期推荐失败:', error);
      return 0;
    }
  }

  /**
   * 协同过滤
   */
  private async collaborativeFiltering(
    userId: string,
    type: RecommendationType,
    context?: Record<string, any>
  ): Promise<Recommendation[]> {
    try {
      // 获取相似用户
      const similarUsers = await this.findSimilarUsers(userId, 10);

      // 基于相似用户的行为生成推荐
      const recommendations: Recommendation[] = [];

      for (const similarUser of similarUsers) {
        const userItems = await this.getUserItems(similarUser.userId, type);

        for (const item of userItems) {
          const score = similarUser.similarity * (item.rating || 0.5);

          recommendations.push({
            id: crypto.randomUUID(),
            userId,
            type,
            itemId: item.id,
            score,
            reason: `与您相似的用户也喜欢`,
            metadata: { similarUser: similarUser.userId },
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + this.config.maxAgeHours * 60 * 60 * 1000)
          });
        }
      }

      return recommendations;
    } catch (error) {
      logger.error('协同过滤失败:', error);
      return [];
    }
  }

  /**
   * 基于内容的过滤
   */
  private async contentBasedFiltering(
    userId: string,
    type: RecommendationType,
    context?: Record<string, any>
  ): Promise<Recommendation[]> {
    try {
      // 获取用户历史偏好
      const userPreferences = await this.getUserPreferences(userId, type);

      // 基于内容特征匹配
      const recommendations: Recommendation[] = [];

      // 根据类型获取可推荐的内容
      const items = await this.getItemsByType(type);

      for (const item of items) {
        const score = this.calculateContentSimilarity(userPreferences, item);

        if (score > 0) {
          recommendations.push({
            id: crypto.randomUUID(),
            userId,
            type,
            itemId: item.id,
            score,
            reason: `基于您的兴趣偏好`,
            metadata: { contentFeatures: item.features },
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + this.config.maxAgeHours * 60 * 60 * 1000)
          });
        }
      }

      return recommendations;
    } catch (error) {
      logger.error('基于内容的过滤失败:', error);
      return [];
    }
  }

  /**
   * 混合过滤
   */
  private async hybridFiltering(
    userId: string,
    type: RecommendationType,
    context?: Record<string, any>
  ): Promise<Recommendation[]> {
    try {
      // 组合协同过滤和基于内容的过滤结果
      const collaborativeRecs = await this.collaborativeFiltering(userId, type, context);
      const contentRecs = await this.contentBasedFiltering(userId, type, context);

      // 合并并重新评分
      const combinedRecs = new Map<string, Recommendation>();

      // 加权组合：协同过滤 60%，内容过滤 40%
      for (const rec of collaborativeRecs) {
        rec.score = rec.score * 0.6;
        combinedRecs.set(rec.itemId, rec);
      }

      for (const rec of contentRecs) {
        const existing = combinedRecs.get(rec.itemId);
        if (existing) {
          existing.score += rec.score * 0.4;
        } else {
          rec.score = rec.score * 0.4;
          combinedRecs.set(rec.itemId, rec);
        }
      }

      return Array.from(combinedRecs.values());
    } catch (error) {
      logger.error('混合过滤失败:', error);
      return [];
    }
  }

  /**
   * 查找相似用户
   */
  private async findSimilarUsers(userId: string, limit: number): Promise<Array<{ userId: string; similarity: number }>> {
    // 简化实现：返回模拟数据
    return [
      { userId: 'user-1', similarity: 0.85 },
      { userId: 'user-2', similarity: 0.78 },
      { userId: 'user-3', similarity: 0.72 }
    ];
  }

  /**
   * 获取用户项目
   */
  private async getUserItems(userId: string, type: RecommendationType): Promise<Array<{ id: string; rating?: number }>> {
    // 简化实现
    return [];
  }

  /**
   * 获取用户偏好
   */
  private async getUserPreferences(userId: string, type: RecommendationType): Promise<Record<string, any>> {
    // 简化实现
    return {};
  }

  /**
   * 根据类型获取项目
   */
  private async getItemsByType(type: RecommendationType): Promise<Array<{ id: string; features: Record<string, any> }>> {
    // 简化实现
    return [];
  }

  /**
   * 计算内容相似度
   */
  private calculateContentSimilarity(userPreferences: Record<string, any>, item: { features: Record<string, any> }): number {
    // 简化实现
    return Math.random() * 0.5 + 0.5;
  }

  /**
   * 更新用户偏好
   */
  private updateUserPreference(userId: string, itemId: string, feedback: 'positive' | 'negative'): void {
    // 更新用户偏好数据
    logger.info(`更新用户偏好: ${userId} - ${itemId} - ${feedback}`);
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(recommendations: Recommendation[]): boolean {
    if (recommendations.length === 0) return false;

    const now = Date.now();
    const maxAge = this.config.maxAgeHours * 60 * 60 * 1000;

    return recommendations.every(rec => rec.expiresAt.getTime() - now < maxAge);
  }

  /**
   * 获取推荐统计
   */
  async getStatistics(userId?: string): Promise<{
    totalRecommendations: number;
    averageScore: number;
    typeDistribution: Record<string, number>;
  }> {
    try {
      // 简化实现
      return {
        totalRecommendations: 0,
        averageScore: 0,
        typeDistribution: {}
      };
    } catch (error) {
      logger.error('获取推荐统计失败:', error);
      return {
        totalRecommendations: 0,
        averageScore: 0,
        typeDistribution: {}
      };
    }
  }
}

export const recommendationService = new RecommendationService();
