import apiService, { APIResponse } from './apiService';

// 推荐类型
export enum RecommendationType {
  CODE_SUGGESTION = 'code_suggestion',
  PROJECT_TEMPLATE = 'project_template',
  WORKFLOW_RECOMMENDATION = 'workflow_recommendation',
  SCRIPT_RECOMMENDATION = 'script_recommendation',
  BEST_PRACTICE = 'best_practice',
  RESOURCE_SUGGESTION = 'resource_suggestion',
  LEARNING_PATH = 'learning_path'
}

// 推荐优先级
export enum RecommendationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// 推荐项接口
export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  content: any;
  priority: RecommendationPriority;
  relevanceScore: number;
  userId: string;
  context?: RecommendationContext;
  metadata?: any;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 推荐上下文
export interface RecommendationContext {
  currentProject?: string;
  currentFile?: string;
  currentWorkflow?: string;
  userActivity?: string[];
  recentActions?: Array<{
    type: string;
    timestamp: Date;
    data: any;
  }>;
  sessionDuration?: number;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  preferences?: any;
}

// 推荐反馈
export interface RecommendationFeedback {
  id: string;
  recommendationId: string;
  feedback: 'positive' | 'negative' | 'neutral';
  rating?: number;
  comment?: string;
  metadata?: any;
  createdAt: Date;
}

// 用户画像
export interface UserProfile {
  id: string;
  userId: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  interests: string[];
  preferences: {
    languages?: string[];
    frameworks?: string[];
    domains?: string[];
  };
  learningGoals: string[];
  lastUpdated: Date;
}

// 推荐统计
export interface RecommendationStats {
  total: number;
  viewed: number;
  accepted: number;
  viewRate: number;
  acceptanceRate: number;
  typeStats: Array<{
    type: string;
    count: number;
  }>;
  recentFeedback: RecommendationFeedback[];
  monthlyStats: any;
}

class FrontendRecommendationService {
  private static instance: FrontendRecommendationService;

  static getInstance(): FrontendRecommendationService {
    if (!FrontendRecommendationService.instance) {
      FrontendRecommendationService.instance = new FrontendRecommendationService();
    }
    return FrontendRecommendationService.instance;
  }

  /**
   * 获取推荐列表
   */
  async getRecommendations(params?: {
    type?: RecommendationType;
    limit?: number;
    context?: RecommendationContext;
  }): Promise<Recommendation[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.type) {
        queryParams.append('type', params.type);
      }
      
      if (params?.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      
      if (params?.context) {
        queryParams.append('context', JSON.stringify(params.context));
      }

      const response: APIResponse<{ recommendations: Recommendation[] }> = await apiService.get(
        `/recommendations?${queryParams.toString()}`
      );

      if (response.success) {
        return response.data.recommendations.map(rec => ({
          ...rec,
          createdAt: new Date(rec.createdAt),
          updatedAt: new Date(rec.updatedAt),
          expiresAt: rec.expiresAt ? new Date(rec.expiresAt) : undefined
        }));
      }

      throw new Error(response.error || '获取推荐失败');
    } catch (error) {
      console.error('获取推荐失败:', error);
      throw error;
    }
  }

  /**
   * 获取推荐类型列表
   */
  async getRecommendationTypes(): Promise<RecommendationType[]> {
    try {
      const response: APIResponse<{ types: RecommendationType[] }> = await apiService.get('/recommendations/types');

      if (response.success) {
        return response.data.types;
      }

      throw new Error(response.error || '获取推荐类型失败');
    } catch (error) {
      console.error('获取推荐类型失败:', error);
      throw error;
    }
  }

  /**
   * 提交推荐反馈
   */
  async submitFeedback(params: {
    recommendationId: string;
    feedback: 'positive' | 'negative' | 'neutral';
    rating?: number;
    comment?: string;
  }): Promise<void> {
    try {
      const response: APIResponse = await apiService.post('/recommendations/feedback', params);

      if (!response.success) {
        throw new Error(response.error || '提交反馈失败');
      }
    } catch (error) {
      console.error('提交推荐反馈失败:', error);
      throw error;
    }
  }

  /**
   * 标记推荐为已查看
   */
  async markAsViewed(recommendationIds: string[]): Promise<void> {
    try {
      const response: APIResponse = await apiService.post('/recommendations/viewed', {
        recommendationIds
      });

      if (!response.success) {
        throw new Error(response.error || '标记已查看失败');
      }
    } catch (error) {
      console.error('标记推荐已查看失败:', error);
      throw error;
    }
  }

  /**
   * 接受推荐
   */
  async acceptRecommendation(recommendationId: string): Promise<void> {
    try {
      const response: APIResponse = await apiService.post('/recommendations/accept', {
        recommendationId
      });

      if (!response.success) {
        throw new Error(response.error || '接受推荐失败');
      }
    } catch (error) {
      console.error('接受推荐失败:', error);
      throw error;
    }
  }

  /**
   * 记录用户活动
   */
  async recordUserActivity(params: {
    action: string;
    target?: string;
    targetType?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      const response: APIResponse = await apiService.post('/recommendations/activity', params);

      if (!response.success) {
        throw new Error(response.error || '记录用户活动失败');
      }
    } catch (error) {
      console.error('记录用户活动失败:', error);
      throw error;
    }
  }

  /**
   * 获取推荐历史
   */
  async getRecommendationHistory(params?: {
    page?: number;
    limit?: number;
    type?: RecommendationType;
    feedback?: 'positive' | 'negative' | 'neutral';
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    recommendations: Recommendation[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page) {
        queryParams.append('page', params.page.toString());
      }
      
      if (params?.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      
      if (params?.type) {
        queryParams.append('type', params.type);
      }
      
      if (params?.feedback) {
        queryParams.append('feedback', params.feedback);
      }
      
      if (params?.startDate) {
        queryParams.append('startDate', params.startDate.toISOString());
      }
      
      if (params?.endDate) {
        queryParams.append('endDate', params.endDate.toISOString());
      }

      const response: APIResponse<{
        recommendations: Recommendation[];
        pagination: any;
      }> = await apiService.get(`/recommendations/history?${queryParams.toString()}`);

      if (response.success) {
        return {
          recommendations: response.data.recommendations.map(rec => ({
            ...rec,
            createdAt: new Date(rec.createdAt),
            updatedAt: new Date(rec.updatedAt)
          })),
          pagination: response.data.pagination
        };
      }

      throw new Error(response.error || '获取推荐历史失败');
    } catch (error) {
      console.error('获取推荐历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取推荐统计信息
   */
  async getRecommendationStats(): Promise<RecommendationStats> {
    try {
      const response: APIResponse<RecommendationStats> = await apiService.get('/recommendations/stats');

      if (response.success) {
        return response.data;
      }

      throw new Error(response.error || '获取推荐统计失败');
    } catch (error) {
      console.error('获取推荐统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户画像
   */
  async getUserProfile(): Promise<UserProfile> {
    try {
      const response: APIResponse<UserProfile> = await apiService.get('/recommendations/user-profile');

      if (response.success) {
        return {
          ...response.data,
          lastUpdated: new Date(response.data.lastUpdated)
        };
      }

      throw new Error(response.error || '获取用户画像失败');
    } catch (error) {
      console.error('获取用户画像失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户画像
   */
  async updateUserProfile(params: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const response: APIResponse<UserProfile> = await apiService.put('/recommendations/user-profile', params);

      if (response.success) {
        return {
          ...response.data,
          lastUpdated: new Date(response.data.lastUpdated)
        };
      }

      throw new Error(response.error || '更新用户画像失败');
    } catch (error) {
      console.error('更新用户画像失败:', error);
      throw error;
    }
  }

  /**
   * 刷新推荐缓存
   */
  async refreshRecommendations(context?: RecommendationContext): Promise<Recommendation[]> {
    try {
      // 记录刷新活动
      await this.recordUserActivity({
        action: 'refresh_recommendations',
        metadata: { context }
      });

      // 获取新的推荐
      return this.getRecommendations({ limit: 10, context });
    } catch (error) {
      console.error('刷新推荐失败:', error);
      throw error;
    }
  }

  /**
   * 获取推荐详情
   */
  async getRecommendationDetail(recommendationId: string): Promise<Recommendation | null> {
    try {
      // 先从历史记录中查找
      const historyResponse = await this.getRecommendationHistory({ limit: 100 });
      const recommendation = historyResponse.recommendations.find(rec => rec.id === recommendationId);

      if (recommendation) {
        return recommendation;
      }

      // 如果历史记录中没有，返回null
      return null;
    } catch (error) {
      console.error('获取推荐详情失败:', error);
      throw error;
    }
  }

  /**
   * 批量操作推荐
   */
  async batchRecommendations(operations: Array<{
    type: 'view' | 'accept' | 'feedback';
    recommendationId: string;
    data?: any;
  }>): Promise<void> {
    const promises = operations.map(operation => {
      switch (operation.type) {
        case 'view':
          return this.markAsViewed([operation.recommendationId]);
        case 'accept':
          return this.acceptRecommendation(operation.recommendationId);
        case 'feedback':
          return this.submitFeedback({
            recommendationId: operation.recommendationId,
            ...operation.data
          });
        default:
          return Promise.reject(new Error(`不支持的操作类型: ${operation.type}`));
      }
    });

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('批量操作推荐失败:', error);
      throw error;
    }
  }

  /**
   * 获取推荐趋势数据
   */
  async getRecommendationTrends(days: number = 30): Promise<{
    date: string;
    count: number;
    acceptance: number;
  }[]> {
    try {
      // 获取历史数据
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const historyResponse = await this.getRecommendationHistory({
        startDate,
        endDate
      });

      // 按日期分组统计
      const dailyStats = historyResponse.recommendations.reduce((acc, rec) => {
        const date = rec.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { count: 0, acceptance: 0 };
        }
        acc[date].count++;
        // 这里需要根据是否有反馈来计算acceptance，暂时简化处理
        return acc;
      }, {} as Record<string, { count: number; acceptance: number }>);

      // 转换为数组并排序
      return Object.entries(dailyStats)
        .map(([date, stats]) => ({
          date,
          count: stats.count,
          acceptance: stats.acceptance
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('获取推荐趋势数据失败:', error);
      throw error;
    }
  }

  /**
   * 导出推荐数据
   */
  async exportRecommendations(format: 'json' | 'csv' = 'json'): Promise<Blob> {
    try {
      const recommendations = await this.getRecommendationHistory({ limit: 1000 });

      if (format === 'json') {
        return new Blob([JSON.stringify(recommendations, null, 2)], {
          type: 'application/json'
        });
      } else {
        // CSV格式导出
        const csvHeaders = ['ID', '类型', '标题', '描述', '优先级', '相关性分数', '创建时间'];
        const csvRows = recommendations.recommendations.map(rec => [
          rec.id,
          rec.type,
          rec.title,
          rec.description,
          rec.priority,
          rec.relevanceScore.toString(),
          rec.createdAt.toISOString()
        ]);

        const csvContent = [csvHeaders, ...csvRows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');

        return new Blob([csvContent], {
          type: 'text/csv;charset=utf-8'
        });
      }
    } catch (error) {
      console.error('导出推荐数据失败:', error);
      throw error;
    }
  }
}

// 创建全局推荐服务实例
const recommendationService = FrontendRecommendationService.getInstance();

export default recommendationService;
export { FrontendRecommendationService };