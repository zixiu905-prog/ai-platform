import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { logger } from '../utils/logger';

export interface CacheItem {
  key: string;
  data: any;
  timestamp: number;
  expiry?: number;
  size: number;
  version?: string;
  tags?: string[];
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: string;
  data: any;
  timestamp: number;
  retryCount: number;
  lastRetry?: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

export interface OfflineConfig {
  maxCacheSize: number; // MB
  maxCacheAge: number; // days
  autoSync: boolean;
  syncInterval: number; // minutes
  enableCompression: boolean;
  enableEncryption: boolean;
}

export class OfflineService extends EventEmitter {
  private cacheDir: string;
  private syncDir: string;
  private config: OfflineConfig;
  private cache: Map<string, CacheItem> = new Map();
  private syncQueue: SyncOperation[] = [];
  private isOnline: boolean = true;
  private syncTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    super();
    this.cacheDir = path.join(app.getPath('userData'), 'cache');
    this.syncDir = path.join(app.getPath('userData'), 'sync');
    
    this.config = {
      maxCacheSize: 500, // 500MB
      maxCacheAge: 30, // 30天
      autoSync: true,
      syncInterval: 5, // 5分钟
      enableCompression: true,
      enableEncryption: false
    };

    this.initialize();
  }

  /**
   * 初始化离线服务
   */
  private async initialize(): Promise<void> {
    try {
      // 创建必要的目录
      await fs.mkdir(this.cacheDir, { recursive: true });
      await fs.mkdir(this.syncDir, { recursive: true });

      // 加载配置
      await this.loadConfig();

      // 加载缓存
      await this.loadCache();

      // 加载同步队列
      await this.loadSyncQueue();

      // 设置网络状态监控
      this.setupNetworkMonitoring();

      // 启动定时任务
      this.startTimers();

      // 执行初始清理
      await this.cleanupExpiredItems();

      logger.info('离线服务初始化完成');
      this.emit('initialized');
    } catch (error) {
      logger.error('离线服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 缓存数据
   */
  async cache(key: string, data: any, options: {
    expiry?: number;
    version?: string;
    tags?: string[];
    compress?: boolean;
  } = {}): Promise<void> {
    try {
      const now = Date.now();
      const expiry = options.expiry ? now + options.expiry : undefined;
      const size = this.calculateSize(data);

      let processedData = data;
      if (options.compress !== false && this.config.enableCompression) {
        processedData = await this.compressData(data);
      }

      const cacheItem: CacheItem = {
        key,
        data: processedData,
        timestamp: now,
        expiry,
        size,
        version: options.version,
        tags: options.tags
      };

      // 检查缓存大小限制
      await this.enforceCacheSizeLimit(size);

      // 添加到内存缓存
      this.cache.set(key, cacheItem);

      // 保存到磁盘
      await this.saveCacheItem(cacheItem);

      logger.debug('数据已缓存', { key, size, expiry });
      this.emit('cached', { key, size });
    } catch (error) {
      logger.error('缓存数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取缓存数据
   */
  async get(key: string): Promise<any | null> {
    try {
      const cacheItem = this.cache.get(key);
      
      if (!cacheItem) {
        return null;
      }

      // 检查是否过期
      if (cacheItem.expiry && Date.now() > cacheItem.expiry) {
        await this.delete(key);
        return null;
      }

      // 解压缩数据
      let data = cacheItem.data;
      if (this.config.enableCompression) {
        try {
          data = await this.decompressData(data);
        } catch (error) {
          logger.warn('解压缩数据失败:', error);
        }
      }

      logger.debug('缓存数据已获取', { key });
      this.emit('cache-hit', { key });
      
      return data;
    } catch (error) {
      logger.error('获取缓存数据失败:', error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    try {
      this.cache.delete(key);
      
      const filePath = path.join(this.cacheDir, `${key}.cache`);
      await fs.unlink(filePath).catch(() => {}); // 忽略文件不存在的错误

      logger.debug('缓存已删除', { key });
      this.emit('cache-deleted', { key });
    } catch (error) {
      logger.error('删除缓存失败:', error);
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    try {
      this.cache.clear();
      
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.cache')) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }

      logger.info('所有缓存已清空');
      this.emit('cache-cleared');
    } catch (error) {
      logger.error('清空缓存失败:', error);
    }
  }

  /**
   * 添加同步操作
   */
  async addSyncOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<void> {
    try {
      const syncOp: SyncOperation = {
        ...operation,
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending'
      };

      this.syncQueue.push(syncOp);
      await this.saveSyncQueue();

      logger.debug('同步操作已添加', { id: syncOp.id, type: operation.type });
      this.emit('sync-operation-added', syncOp);

      // 如果在线且有自动同步，立即尝试同步
      if (this.isOnline && this.config.autoSync) {
        await this.processSyncQueue();
      }
    } catch (error) {
      logger.error('添加同步操作失败:', error);
    }
  }

  /**
   * 处理同步队列
   */
  async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    const pendingOps = this.syncQueue.filter(op => op.status === 'pending');
    
    for (const operation of pendingOps) {
      try {
        operation.status = 'syncing';
        await this.saveSyncQueue();
        
        this.emit('sync-operation-started', operation);

        // 这里应该调用实际的同步API
        await this.performSyncOperation(operation);

        operation.status = 'completed';
        this.emit('sync-operation-completed', operation);

      } catch (error) {
        operation.status = 'failed';
        operation.retryCount++;
        operation.lastRetry = Date.now();

        logger.error('同步操作失败:', { operationId: operation.id, error });
        this.emit('sync-operation-failed', { operation, error });

        // 如果重试次数过多，标记为失败
        if (operation.retryCount >= 3) {
          this.emit('sync-operation-permanent-failed', operation);
        }
      }

      await this.saveSyncQueue();
    }

    // 清理已完成的操作
    this.syncQueue = this.syncQueue.filter(op => op.status !== 'completed');
    await this.saveSyncQueue();
  }

  /**
   * 执行同步操作
   */
  private async performSyncOperation(operation: SyncOperation): Promise<void> {
    // 这里应该实现实际的同步逻辑
    // 模拟网络请求延迟
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // 模拟成功率
    if (Math.random() > 0.8) {
      throw new Error('模拟网络错误');
    }
  }

  /**
   * 获取离线统计信息
   */
  async getOfflineStats(): Promise<{
    cacheStats: {
      totalItems: number;
      totalSize: number;
      oldestItem?: number;
      newestItem?: number;
    };
    syncStats: {
      pendingOps: number;
      completedOps: number;
      failedOps: number;
    };
    config: OfflineConfig;
  }> {
    const cacheItems = Array.from(this.cache.values());
    const totalSize = cacheItems.reduce((sum, item) => sum + item.size, 0);
    const timestamps = cacheItems.map(item => item.timestamp);

    return {
      cacheStats: {
        totalItems: cacheItems.length,
        totalSize,
        oldestItem: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
        newestItem: timestamps.length > 0 ? Math.max(...timestamps) : undefined
      },
      syncStats: {
        pendingOps: this.syncQueue.filter(op => op.status === 'pending').length,
        completedOps: this.syncQueue.filter(op => op.status === 'completed').length,
        failedOps: this.syncQueue.filter(op => op.status === 'failed').length
      },
      config: this.config
    };
  }

  /**
   * 设置在线状态
   */
  setOnlineStatus(isOnline: boolean): void {
    if (this.isOnline !== isOnline) {
      this.isOnline = isOnline;
      logger.info(`网络状态变更: ${isOnline ? '在线' : '离线'}`);
      this.emit('online-status-changed', isOnline);

      // 如果恢复在线且启用自动同步，处理同步队列
      if (isOnline && this.config.autoSync) {
        setTimeout(() => this.processSyncQueue(), 1000);
      }
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(newConfig: Partial<OfflineConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();
    await this.enforceCacheSizeLimit();

    logger.info('离线配置已更新', this.config);
    this.emit('config-updated', this.config);
  }

  /**
   * 强制同步
   */
  async forceSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('当前离线，无法同步');
    }

    await this.processSyncQueue();
    logger.info('强制同步完成');
    this.emit('force-sync-completed');
  }

  /**
   * 导出离线数据
   */
  async exportData(): Promise<string> {
    const exportData = {
      cache: Object.fromEntries(this.cache),
      syncQueue: this.syncQueue,
      config: this.config,
      exportTime: new Date().toISOString()
    };

    const exportPath = path.join(app.getPath('downloads'), `aidesign-offline-export-${Date.now()}.json`);
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));

    logger.info('离线数据已导出', { path: exportPath });
    return exportPath;
  }

  /**
   * 导入离线数据
   */
  async importData(exportPath: string): Promise<void> {
    try {
      const importData = JSON.parse(await fs.readFile(exportPath, 'utf-8'));

      if (importData.cache) {
        this.cache = new Map(Object.entries(importData.cache));
        await this.saveAllCacheItems();
      }

      if (importData.syncQueue) {
        this.syncQueue = importData.syncQueue;
        await this.saveSyncQueue();
      }

      if (importData.config) {
        this.config = { ...this.config, ...importData.config };
        await this.saveConfig();
      }

      logger.info('离线数据导入完成', { path: exportPath });
      this.emit('data-imported', { path: exportPath });
    } catch (error) {
      logger.error('导入离线数据失败:', error);
      throw error;
    }
  }

  // 私有方法

  private async loadConfig(): Promise<void> {
    try {
      const configPath = path.join(this.cacheDir, 'config.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      this.config = { ...this.config, ...JSON.parse(configData) };
    } catch (error) {
      // 配置文件不存在，使用默认配置
      await this.saveConfig();
    }
  }

  private async saveConfig(): Promise<void> {
    const configPath = path.join(this.cacheDir, 'config.json');
    await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
  }

  private async loadCache(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.cache')) {
          const key = file.replace('.cache', '');
          const filePath = path.join(this.cacheDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const cacheItem: CacheItem = JSON.parse(data);
          
          this.cache.set(key, cacheItem);
        }
      }
      logger.debug(`已加载 ${this.cache.size} 个缓存项`);
    } catch (error) {
      logger.warn('加载缓存失败:', error);
    }
  }

  private async saveCacheItem(item: CacheItem): Promise<void> {
    const filePath = path.join(this.cacheDir, `${item.key}.cache`);
    await fs.writeFile(filePath, JSON.stringify(item, null, 2));
  }

  private async saveAllCacheItems(): Promise<void> {
    for (const item of this.cache.values()) {
      await this.saveCacheItem(item);
    }
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const queuePath = path.join(this.syncDir, 'queue.json');
      const queueData = await fs.readFile(queuePath, 'utf-8');
      this.syncQueue = JSON.parse(queueData);
    } catch (error) {
      // 队列文件不存在，创建空队列
      this.syncQueue = [];
      await this.saveSyncQueue();
    }
  }

  private async saveSyncQueue(): Promise<void> {
    const queuePath = path.join(this.syncDir, 'queue.json');
    await fs.writeFile(queuePath, JSON.stringify(this.syncQueue, null, 2));
  }

  private async enforceCacheSizeLimit(newItemSize: number = 0): Promise<void> {
    const currentSize = Array.from(this.cache.values()).reduce((sum, item) => sum + item.size, 0) + newItemSize;
    const maxSizeBytes = this.config.maxCacheSize * 1024 * 1024;

    if (currentSize <= maxSizeBytes) {
      return;
    }

    // 按时间戳排序，删除最旧的项目
    const sortedItems = Array.from(this.cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    let removedSize = 0;

    for (const [key, item] of sortedItems) {
      this.cache.delete(key);
      await fs.unlink(path.join(this.cacheDir, `${key}.cache`)).catch(() => {});
      removedSize += item.size;

      if (currentSize - removedSize <= maxSizeBytes * 0.8) {
        break;
      }
    }

    logger.info('缓存大小限制已强制执行', { removedSize });
  }

  private async cleanupExpiredItems(): Promise<void> {
    const now = Date.now();
    const maxAge = this.config.maxCacheAge * 24 * 60 * 60 * 1000; // 转换为毫秒
    let removedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      const isExpired = item.expiry ? now > item.expiry : false;
      const isOld = now - item.timestamp > maxAge;

      if (isExpired || isOld) {
        this.cache.delete(key);
        await fs.unlink(path.join(this.cacheDir, `${key}.cache`)).catch(() => {});
        removedCount++;
      }
    }

    logger.info('过期缓存项已清理', { count: removedCount });
  }

  private setupNetworkMonitoring(): void {
    // 这里应该实现真正的网络状态监控
    // 模拟网络状态变化
    setInterval(() => {
      const wasOnline = this.isOnline;
      this.isOnline = Math.random() > 0.1; // 90%概率在线
      
      if (wasOnline !== this.isOnline) {
        this.setOnlineStatus(this.isOnline);
      }
    }, 30000); // 每30秒检查一次
  }

  private startTimers(): void {
    // 同步定时器
    if (this.config.autoSync) {
      this.syncTimer = setInterval(() => {
        if (this.isOnline) {
          this.processSyncQueue();
        }
      }, this.config.syncInterval * 60 * 1000);
    }

    // 清理定时器
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredItems();
    }, 24 * 60 * 60 * 1000); // 每天清理一次
  }

  private calculateSize(data: any): number {
    return Buffer.byteLength(JSON.stringify(data), 'utf-8');
  }

  private async compressData(data: any): Promise<any> {
    // 这里应该实现真正的压缩算法
    // 暂时返回原数据
    return data;
  }

  private async decompressData(data: any): Promise<any> {
    // 这里应该实现真正的解压缩算法
    // 暂时返回原数据
    return data;
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.removeAllListeners();
  }
}

export const offlineService = new OfflineService();