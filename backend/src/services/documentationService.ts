import { logger } from '../utils/logger';

export interface DocumentationCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  parentId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  children?: DocumentationCategory[];
}

export interface DocumentationArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  categoryId: string;
  userId: string;
  isPublished: boolean;
  sortOrder: number;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  category?: DocumentationCategory;
  author?: { id: string; name: string; email: string };
  tags?: string[];
}

export interface CreateCategoryData {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  parentId?: string;
}

export interface UpdateCategoryData {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  parentId?: string;
  isActive?: boolean;
}

export interface CreateArticleData {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  categoryId: string;
  userId: string;
  isPublished?: boolean;
  sortOrder?: number;
  tags?: string[];
}

export interface UpdateArticleData {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  categoryId?: string;
  isPublished?: boolean;
  sortOrder?: number;
  tags?: string[];
}

export interface DocumentationFilters {
  categoryId?: string;
  isPublished?: boolean;
  tags?: string[];
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'views' | 'sortOrder';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ModelDocumentation {
  provider: string;
  version: string;
  models: Array<{
    id: string;
    name: string;
    description: string;
    capabilities: string[];
    pricing?: { input: number; output: number };
    limits?: { maxTokens: number; contextWindow: number };
  }>;
  endpoints: {
    chat: string;
    embedding?: string;
  };
  lastUpdated: Date;
}

/**
 * 简化的文档服务
 * 原表（documentationCategory、documentationArticle、documentationArticleTag等）不存在
 * 改为内存实现或抛出错误
 */
export class DocumentationService {

  constructor() {
    logger.info('DocumentationService initialized (simplified version)');
  }

  /**
   * 获取所有分类
   */
  async getCategories(includeInactive = false): Promise<DocumentationCategory[]> {
    try {
      logger.warn('getCategories - documentationCategory tables not implemented');
      return [];
    } catch (error) {
      logger.error('获取分类失败:', error);
      throw new Error(`获取分类失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 创建分类
   */
  async createCategory(data: CreateCategoryData): Promise<DocumentationCategory> {
    try {
      logger.warn('createCategory - documentationCategory tables not implemented');
      throw new Error('文档分类表未实现');
    } catch (error) {
      logger.error('创建分类失败:', error);
      throw new Error(`创建分类失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新分类
   */
  async updateCategory(id: string, data: UpdateCategoryData): Promise<DocumentationCategory> {
    try {
      logger.warn('updateCategory - documentationCategory tables not implemented');
      throw new Error('文档分类表未实现');
    } catch (error) {
      logger.error('更新分类失败:', error);
      throw new Error(`更新分类失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 删除分类
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      logger.warn('deleteCategory - documentationCategory tables not implemented');
      throw new Error('文档分类表未实现');
    } catch (error) {
      logger.error('删除分类失败:', error);
      throw new Error(`删除分类失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取文章列表
   */
  async getArticles(filters: DocumentationFilters = {}): Promise<{ articles: DocumentationArticle[]; total: number }> {
    try {
      logger.warn('getArticles - documentationArticle tables not implemented');
      return { articles: [], total: 0 };
    } catch (error) {
      logger.error('获取文章列表失败:', error);
      throw new Error(`获取文章列表失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取文章详情
   */
  async getArticleById(id: string, incrementViews = true): Promise<DocumentationArticle | null> {
    try {
      logger.warn('getArticleById - documentationArticle tables not implemented');
      return null;
    } catch (error) {
      logger.error('获取文章详情失败:', error);
      return null;
    }
  }

  /**
   * 通过 slug 获取文章
   */
  async getArticleBySlug(slug: string, incrementViews = true): Promise<DocumentationArticle | null> {
    try {
      logger.warn('getArticleBySlug - documentationArticle tables not implemented');
      return null;
    } catch (error) {
      logger.error('获取文章详情失败:', error);
      return null;
    }
  }

  /**
   * 创建文章
   */
  async createArticle(data: CreateArticleData): Promise<DocumentationArticle> {
    try {
      logger.warn('createArticle - documentationArticle tables not implemented');
      throw new Error('文档文章表未实现');
    } catch (error) {
      logger.error('创建文章失败:', error);
      throw new Error(`创建文章失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新文章
   */
  async updateArticle(id: string, data: UpdateArticleData): Promise<DocumentationArticle> {
    try {
      logger.warn('updateArticle - documentationArticle tables not implemented');
      throw new Error('文档文章表未实现');
    } catch (error) {
      logger.error('更新文章失败:', error);
      throw new Error(`更新文章失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 删除文章
   */
  async deleteArticle(id: string): Promise<void> {
    try {
      logger.warn('deleteArticle - documentationArticle tables not implemented');
      throw new Error('文档文章表未实现');
    } catch (error) {
      logger.error('删除文章失败:', error);
      throw new Error(`删除文章失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 搜索文档
   */
  async search(query: string, filters: Omit<DocumentationFilters, 'search'> = {}): Promise<DocumentationArticle[]> {
    try {
      const result = await this.getArticles({ ...filters, search: query, limit: 50 });
      return result.articles;
    } catch (error) {
      logger.error('搜索文档失败:', error);
      throw new Error(`搜索文档失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取热门文章
   */
  async getPopularArticles(limit = 10): Promise<DocumentationArticle[]> {
    try {
      const result = await this.getArticles({ isPublished: true, sortBy: 'views', sortOrder: 'desc', limit });
      return result.articles;
    } catch (error) {
      logger.error('获取热门文章失败:', error);
      return [];
    }
  }

  /**
   * 获取最近更新
   */
  async getRecentUpdates(limit = 10): Promise<DocumentationArticle[]> {
    try {
      const result = await this.getArticles({ isPublished: true, sortBy: 'updatedAt', sortOrder: 'desc', limit });
      return result.articles;
    } catch (error) {
      logger.error('获取最近更新失败:', error);
      return [];
    }
  }

  /**
   * 获取缓存的文档
   */
  static async getCachedDocumentation(provider: string): Promise<ModelDocumentation | null> {
    try {
      logger.warn('getCachedDocumentation - documentationCache table not implemented');
      return null;
    } catch (error) {
      logger.error(`获取缓存文档失败 (${provider}):`, error);
      return null;
    }
  }

  /**
   * 获取智谱AI文档
   */
  static async fetchZhipuDocumentation(): Promise<ModelDocumentation | null> {
    try {
      const doc: ModelDocumentation = {
        provider: 'zhipu',
        version: '1.0.0',
        models: [
          {
            id: 'glm-4',
            name: 'GLM-4',
            description: '智谱AI最新一代语言模型',
            capabilities: ['text-generation', 'code-generation', 'reasoning'],
            pricing: { input: 0.01, output: 0.02 },
            limits: { maxTokens: 128000, contextWindow: 128000 }
          }
        ],
        endpoints: {
          chat: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
          embedding: 'https://open.bigmodel.cn/api/paas/v4/embeddings'
        },
        lastUpdated: new Date()
      };
      return doc;
    } catch (error) {
      logger.error('获取智谱AI文档失败:', error);
      return null;
    }
  }

  /**
   * 获取豆包AI文档
   */
  static async fetchDoubaoDocumentation(): Promise<ModelDocumentation | null> {
    try {
      const doc: ModelDocumentation = {
        provider: 'doubao',
        version: '1.0.0',
        models: [
          {
            id: 'doubao-pro',
            name: 'Doubao Pro',
            description: '字节跳动豆包AI模型',
            capabilities: ['text-generation', 'code-generation', 'reasoning'],
            pricing: { input: 0.008, output: 0.015 },
            limits: { maxTokens: 100000, contextWindow: 100000 }
          }
        ],
        endpoints: {
          chat: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
          embedding: 'https://ark.cn-beijing.volces.com/api/v3/embeddings'
        },
        lastUpdated: new Date()
      };
      return doc;
    } catch (error) {
      logger.error('获取豆包AI文档失败:', error);
      return null;
    }
  }

  /**
   * 获取所有AI模型的文档
   */
  static async fetchAllDocumentation(): Promise<ModelDocumentation[]> {
    try {
      const docs: ModelDocumentation[] = [];
      const zhipuDoc = await this.fetchZhipuDocumentation();
      const doubaoDoc = await this.fetchDoubaoDocumentation();
      if (zhipuDoc) docs.push(zhipuDoc);
      if (doubaoDoc) docs.push(doubaoDoc);
      return docs;
    } catch (error) {
      logger.error('获取所有文档失败:', error);
      return [];
    }
  }

  /**
   * 更新模型配置
   */
  static async updateModelConfigurations(configs: Record<string, any>): Promise<void> {
    try {
      logger.warn('updateModelConfigurations - modelConfiguration table not implemented');
      throw new Error('模型配置表未实现');
    } catch (error) {
      logger.error('更新模型配置失败:', error);
      throw error;
    }
  }
}

export const documentationService = new DocumentationService();
