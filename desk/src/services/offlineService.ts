import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import Store from 'electron-store';
import { EventEmitter } from 'events';

export interface OfflineCache {
  id: string;
  type: 'ai_response' | 'file' | 'model' | 'workflow' | 'project';
  content: any;
  timestamp: Date;
  size: number;
  tags?: string[];
  expiresAt?: Date;
}

export interface OfflineAIModel {
  id: string;
  name: string;
  type: 'llm' | 'image_generation' | 'speech' | 'translation';
  path: string;
  size: number;
  capabilities: string[];
  status: 'loaded' | 'unloaded' | 'loading';
  config?: Record<string, any>;
}

export class OfflineService extends EventEmitter {
  private store: Store;
  private cacheDir: string;
  private modelsDir: string;
  private maxCacheSize: number = 1024 * 1024 * 1024; // 1GB
  protected loadedModels: Map<string, OfflineAIModel> = new Map();
  protected isOnline: boolean = true; // 默认为在线状态

  constructor() {
    super();
    // 安全地检查 navigator 是否存在（仅在渲染进程中可用）
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      this.isOnline = navigator.onLine;
    }
    this.store = new Store({ name: 'offline-cache' });
    this.cacheDir = join(this.store.path, '..', 'cache');
    this.modelsDir = join(this.cacheDir, 'models');
    this.ensureDirectories();
  }

  /**
   * 确保目录存在
   */
  private ensureDirectories(): void {
    try {
      if (!existsSync(this.cacheDir)) {
        mkdirSync(this.cacheDir, { recursive: true });
      }
      if (!existsSync(this.modelsDir)) {
        mkdirSync(this.modelsDir, { recursive: true });
      }
    } catch (error) {
      console.error('❌ 创建离线缓存目录失败:', error);
    }
  }

  /**
   * 缓存数据
   */
  async cacheData(data: Omit<OfflineCache, 'timestamp' | 'size'>): Promise<boolean> {
    try {
      const cacheItem: OfflineCache = {
        ...data,
        timestamp: new Date(),
        size: JSON.stringify(data.content).length
      };

      // 检查缓存大小限制
      await this.enforceCacheSizeLimit();

      // 保存到存储
      this.store.set(`cache.${data.id}`, cacheItem);

      console.log(`✅ 数据已缓存: ${data.id}`);
      return true;
    } catch (error) {
      console.error('❌ 缓存数据失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存数据
   */
  getCachedData(id: string): OfflineCache | null {
    try {
      const cached = this.store.get(`cache.${id}`) as OfflineCache;
      
      if (!cached) {
        return null;
      }

      // 检查是否过期
      if (cached.expiresAt && new Date() > cached.expiresAt) {
        this.removeCachedData(id);
        return null;
      }

      return cached;
    } catch (error) {
      console.error('❌ 获取缓存数据失败:', error);
      return null;
    }
  }

  /**
   * 删除缓存数据
   */
  removeCachedData(id: string): boolean {
    try {
      this.store.delete(`cache.${id}`);
      console.log(`✅ 缓存数据已删除: ${id}`);
      return true;
    } catch (error) {
      console.error('❌ 删除缓存数据失败:', error);
      return false;
    }
  }

  /**
   * 清理过期缓存
   */
  async cleanExpiredCache(): Promise<number> {
    let cleanedCount = 0;
    
    try {
      const cacheKeys = this.store.get('cache_keys', []) as string[];
      const now = new Date();

      for (const key of cacheKeys) {
        const cached = this.store.get(`cache.${key}`) as OfflineCache;
        
        if (cached && cached.expiresAt && now > cached.expiresAt) {
          this.removeCachedData(key);
          cleanedCount++;
        }
      }

      console.log(`✅ 清理了 ${cleanedCount} 个过期缓存项`);
    } catch (error) {
      console.error('❌ 清理过期缓存失败:', error);
    }

    return cleanedCount;
  }

  /**
   * 强制执行缓存大小限制
   */
  private async enforceCacheSizeLimit(): Promise<void> {
    try {
      let totalSize = this.getTotalCacheSize();
      
      if (totalSize <= this.maxCacheSize) {
        return;
      }

      console.log(`⚠️ 缓存大小超限 (${totalSize} > ${this.maxCacheSize})，开始清理...`);

      // 获取所有缓存项并按时间排序
      const cacheItems = this.getAllCachedItems();
      cacheItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // 删除最旧的缓存项直到满足大小限制
      let deletedCount = 0;
      for (const item of cacheItems) {
        this.removeCachedData(item.id);
        totalSize -= item.size;
        deletedCount++;

        if (totalSize <= this.maxCacheSize * 0.8) { // 清理到80%限制
          break;
        }
      }

      console.log(`✅ 清理了 ${deletedCount} 个缓存项，释放了 ${this.maxCacheSize - totalSize} 字节`);
    } catch (error) {
      console.error('❌ 执行缓存大小限制失败:', error);
    }
  }

  /**
   * 获取总缓存大小
   */
  private getTotalCacheSize(): number {
    try {
      const cacheItems = this.getAllCachedItems();
      return cacheItems.reduce((total, item) => total + item.size, 0);
    } catch (error) {
      console.error('❌ 获取缓存大小失败:', error);
      return 0;
    }
  }

  /**
   * 获取所有缓存项
   */
  private getAllCachedItems(): OfflineCache[] {
    try {
      const items: OfflineCache[] = [];
      const cacheKeys = Object.keys(this.store.store).filter(key => key.startsWith('cache.'));

      for (const key of cacheKeys) {
        const cached = this.store.get(key) as OfflineCache;
        if (cached) {
          items.push(cached);
        }
      }

      return items;
    } catch (error) {
      console.error('❌ 获取所有缓存项失败:', error);
      return [];
    }
  }

  /**
   * 缓存AI响应
   */
  async cacheAIResponse(prompt: string, response: string, model: string): Promise<boolean> {
    const id = `ai_response_${Buffer.from(prompt + model).toString('base64').substring(0, 16)}`;
    
    return this.cacheData({
      id,
      type: 'ai_response',
      content: { prompt, response, model },
      tags: ['ai', 'response', model]
    });
  }

  /**
   * 获取缓存的AI响应
   */
  getCachedAIResponse(prompt: string, model: string): string | null {
    const id = `ai_response_${Buffer.from(prompt + model).toString('base64').substring(0, 16)}`;
    const cached = this.getCachedData(id);
    
    return cached ? cached.content.response : null;
  }

  /**
   * 安装离线AI模型
   */
  async installOfflineModel(model: OfflineAIModel): Promise<boolean> {
    try {
      const modelPath = join(this.modelsDir, model.id);
      
      // 这里应该实现模型文件的下载/复制逻辑
      // 为了示例，我们只创建模型配置
      const modelConfig = {
        ...model,
        path: modelPath,
        status: 'unloaded' as const,
        installedAt: new Date()
      };

      this.store.set(`models.${model.id}`, modelConfig);
      
      console.log(`✅ 离线模型已安装: ${model.name}`);
      return true;
    } catch (error) {
      console.error('❌ 安装离线模型失败:', error);
      return false;
    }
  }

  /**
   * 加载离线AI模型
   */
  async loadOfflineModel(modelId: string): Promise<boolean> {
    try {
      const modelConfig = this.store.get(`models.${modelId}`) as OfflineAIModel;
      
      if (!modelConfig) {
        throw new Error(`模型不存在: ${modelId}`);
      }

      if (this.loadedModels.has(modelId)) {
        console.log(`✅ 模型已加载: ${modelConfig.name}`);
        return true;
      }

      // 更新状态为加载中
      this.store.set(`models.${modelId}.status`, 'loading');

      // 模拟模型加载过程
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 更新状态为已加载
      const loadedModel = {
        ...modelConfig,
        status: 'loaded' as const
      };

      this.store.set(`models.${modelId}`, loadedModel);
      this.loadedModels.set(modelId, loadedModel);

      console.log(`✅ 模型已加载: ${modelConfig.name}`);
      return true;
    } catch (error) {
      console.error('❌ 加载离线模型失败:', error);
      
      // 更新状态为未加载
      this.store.set(`models.${modelId}.status`, 'unloaded');
      return false;
    }
  }

  /**
   * 卸载离线AI模型
   */
  async unloadOfflineModel(modelId: string): Promise<boolean> {
    try {
      const model = this.loadedModels.get(modelId);
      
      if (!model) {
        return true; // 模型未加载，直接返回成功
      }

      // 更新状态
      this.store.set(`models.${modelId}.status`, 'unloaded');
      this.loadedModels.delete(modelId);

      console.log(`✅ 模型已卸载: ${model.name}`);
      return true;
    } catch (error) {
      console.error('❌ 卸载离线模型失败:', error);
      return false;
    }
  }

  /**
   * 获取已安装的离线模型
   */
  getInstalledModels(): OfflineAIModel[] {
    try {
      const models: OfflineAIModel[] = [];
      const modelKeys = Object.keys(this.store.store).filter(key => key.startsWith('models.'));

      for (const key of modelKeys) {
        const model = this.store.get(key) as OfflineAIModel;
        if (model) {
          models.push(model);
        }
      }

      return models;
    } catch (error) {
      console.error('❌ 获取已安装模型失败:', error);
      return [];
    }
  }

  /**
   * 获取已加载的模型
   */
  getLoadedModels(): OfflineAIModel[] {
    return Array.from(this.loadedModels.values());
  }

  /**
   * 执行离线AI推理
   */
  async offlineInference(modelId: string, input: any): Promise<any> {
    try {
      const model = this.loadedModels.get(modelId);
      
      if (!model) {
        throw new Error(`模型未加载: ${modelId}`);
      }

      console.log(`🤖 开始离线推理: ${model.name}`);

      // 这里应该实现实际的推理逻辑
      // 为了示例，我们返回一个模拟响应
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = {
        model: model.name,
        input,
        output: `这是来自离线模型 ${model.name} 的模拟响应`,
        timestamp: new Date(),
        processingTime: Math.floor(Math.random() * 1000) + 500
      };

      console.log(`✅ 离线推理完成: ${model.name}`);
      return response;
    } catch (error) {
      console.error('❌ 离线推理失败:', error);
      throw error;
    }
  }

  /**
   * 检查离线功能可用性
   */
  checkOfflineAvailability(): {
    canUseAI: boolean;
    loadedModels: string[];
    cacheSize: number;
    lastSync: Date | null;
  } {
    const loadedModels = this.getLoadedModels();
    const cacheSize = this.getTotalCacheSize();
    const lastSync = this.store.get('last_sync') as Date | null;

    return {
      canUseAI: loadedModels.length > 0,
      loadedModels: loadedModels.map(m => m.name),
      cacheSize,
      lastSync
    };
  }

  /**
   * 同步数据到云端
   */
  async syncToCloud(): Promise<boolean> {
    try {
      console.log('☁️ 开始同步数据到云端...');
      
      // 这里应该实现实际的同步逻辑
      await new Promise(resolve => setTimeout(resolve, 2000));

      this.store.set('last_sync', new Date());
      
      console.log('✅ 数据同步完成');
      return true;
    } catch (error) {
      console.error('❌ 数据同步失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    totalItems: number;
    totalSize: number;
    byType: Record<string, number>;
    oldestItem: Date | null;
    newestItem: Date | null;
  } {
    const items = this.getAllCachedItems();
    const byType: Record<string, number> = {};

    for (const item of items) {
      byType[item.type] = (byType[item.type] || 0) + 1;
    }

    const timestamps = items.map(item => item.timestamp);
    const oldestItem = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : null;
    const newestItem = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : null;

    return {
      totalItems: items.length,
      totalSize: this.getTotalCacheSize(),
      byType,
      oldestItem,
      newestItem
    };
  }
}