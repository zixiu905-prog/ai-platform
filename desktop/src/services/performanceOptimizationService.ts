/**
 * 性能优化服务
 * 提供多模态输入界面的性能优化功能
 */

import { message } from 'antd';

interface PerformanceMetrics {
  componentRenderTime: number;
  inputProcessingTime: number;
  memoryUsage: number;
  networkLatency: number;
  userInteractions: number;
  errorCount: number;
}

interface OptimizationConfig {
  enableBatching: boolean;
  batchSize: number;
  enableCaching: boolean;
  cacheSize: number;
  enableLazyLoading: boolean;
  compressionLevel: number;
}

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
}

class PerformanceOptimizationService {
  private metrics: PerformanceMetrics = {
    componentRenderTime: 0,
    inputProcessingTime: 0,
    memoryUsage: 0,
    networkLatency: 0,
    userInteractions: 0,
    errorCount: 0
  };

  private config: OptimizationConfig = {
    enableBatching: true,
    batchSize: 10,
    enableCaching: true,
    cacheSize: 100,
    enableLazyLoading: true,
    compressionLevel: 6
  };

  private cache: Map<string, CacheEntry> = new Map();
  private batchQueue: any[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  /**
   * 初始化性能监控
   */
  initialize(config?: Partial<OptimizationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // 设置性能监控
    this.setupPerformanceMonitoring();
    
    // 设置内存监控
    this.setupMemoryMonitoring();
    
    // 设置用户交互监控
    this.setupUserInteractionMonitoring();

    console.log('性能优化服务已初始化', this.config);
  }

  /**
   * 设置性能监控
   */
  private setupPerformanceMonitoring() {
    // 监控组件渲染时间
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'measure') {
            this.metrics.componentRenderTime += entry.duration;
          }
        });
      });
      observer.observe({ entryTypes: ['measure'] });
    }

    // 定期清理性能指标
    setInterval(() => {
      this.cleanupMetrics();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 设置内存监控
   */
  private setupMemoryMonitoring() {
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize;
        
        // 内存使用过高时警告
        const usagePercentage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
        if (usagePercentage > 80) {
          this.warnHighMemoryUsage(usagePercentage);
        }
      }
    }, 10000); // 每10秒检查一次
  }

  /**
   * 设置用户交互监控
   */
  private setupUserInteractionMonitoring() {
    document.addEventListener('click', () => {
      this.metrics.userInteractions++;
    });

    document.addEventListener('keydown', () => {
      this.metrics.userInteractions++;
    });
  }

  /**
   * 警告高内存使用
   */
  private warnHighMemoryUsage(percentage: number) {
    console.warn(`内存使用过高: ${percentage.toFixed(2)}%`);
    message.warning(`内存使用过高，建议清理缓存 (${percentage.toFixed(1)}%)`);
    
    // 自动清理缓存
    if (percentage > 90) {
      this.clearCache();
    }
  }

  /**
   * 批处理函数
   */
  async batch<T>(items: T[], processor: (batch: T[]) => Promise<any>): Promise<any[]> {
    if (!this.config.enableBatching) {
      const results = [];
      for (const item of items) {
        const result = await processor([item]);
        results.push(result[0]);
      }
      return results;
    }

    return new Promise((resolve, reject) => {
      const batches = this.createBatches(items, this.config.batchSize);
      const results: any[] = [];
      let completedBatches = 0;

      const processBatch = async (batch: T[], index: number) => {
        try {
          const batchResults = await processor(batch);
          results[index] = batchResults;
          completedBatches++;

          if (completedBatches === batches.length) {
            resolve(results.flat());
          }
        } catch (error) {
          this.metrics.errorCount++;
          reject(error);
        }
      };

      batches.forEach((batch, index) => {
        setTimeout(() => processBatch(batch, index), index * 100); // 错开批处理时间
      });
    });
  }

  /**
   * 创建批次
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 缓存操作
   */
  setCache(key: string, data: any, ttl: number = 300000) { // 默认5分钟
    if (!this.config.enableCaching) return;

    // 检查缓存大小
    if (this.cache.size >= this.config.cacheSize) {
      this.evictOldestCache();
    }

    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    };

    this.cache.set(key, entry);
  }

  getCache(key: string): any | null {
    if (!this.config.enableCaching) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clearCache() {
    this.cache.clear();
    console.log('缓存已清理');
  }

  /**
   * 驱逐最旧的缓存
   */
  private evictOldestCache() {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 懒加载函数
   */
  lazyLoad<T>(loader: () => Promise<T>, dependencies: any[] = []): () => Promise<T> {
    let cachedPromise: Promise<T> | null = null;

    return async (): Promise<T> => {
      if (cachedPromise) {
        return cachedPromise;
      }

      if (!this.config.enableLazyLoading) {
        return loader();
      }

      cachedPromise = loader();
      return cachedPromise;
    };
  }

  /**
   * 防抖函数
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T {
    let timeoutId: NodeJS.Timeout | null = null;

    return ((...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    }) as T;
  }

  /**
   * 节流函数
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T {
    let lastCall = 0;

    return ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    }) as T;
  }

  /**
   * 性能测量
   */
  measure<T>(name: string, func: () => T): T {
    const startTime = performance.now();
    const result = func();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`${name} 耗时: ${duration.toFixed(2)}ms`);
    
    // 更新指标
    if (name.includes('input')) {
      this.metrics.inputProcessingTime += duration;
    }

    return result;
  }

  /**
   * 异步性能测量
   */
  async measureAsync<T>(name: string, func: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    const result = await func();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`${name} 耗时: ${duration.toFixed(2)}ms`);
    
    // 更新指标
    if (name.includes('input')) {
      this.metrics.inputProcessingTime += duration;
    }

    return result;
  }

  /**
   * 数据压缩
   */
  compress(data: string): string {
    if (!data || this.config.compressionLevel <= 0) {
      return data;
    }

    try {
      // 简单的字符串压缩（实际应用中可使用更高级的压缩算法）
      return btoa(encodeURIComponent(data));
    } catch (error) {
      console.warn('压缩失败:', error);
      return data;
    }
  }

  /**
   * 数据解压
   */
  decompress(compressedData: string): string {
    if (!compressedData || this.config.compressionLevel <= 0) {
      return compressedData;
    }

    try {
      // 简单的字符串解压
      return decodeURIComponent(atob(compressedData));
    } catch (error) {
      console.warn('解压失败:', error);
      return compressedData;
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 清理性能指标
   */
  private cleanupMetrics() {
    this.metrics = {
      componentRenderTime: 0,
      inputProcessingTime: 0,
      memoryUsage: this.metrics.memoryUsage, // 保留当前内存使用
      networkLatency: 0,
      userInteractions: 0,
      errorCount: 0
    };
  }

  /**
   * 生成性能报告
   */
  generateReport(): {
    timestamp: number;
    metrics: PerformanceMetrics;
    config: OptimizationConfig;
    recommendations: string[];
  } {
    const recommendations = this.generateRecommendations();
    
    return {
      timestamp: Date.now(),
      metrics: this.metrics,
      config: this.config,
      recommendations
    };
  }

  /**
   * 生成性能建议
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.componentRenderTime > 1000) {
      recommendations.push('组件渲染时间过长，建议优化组件结构');
    }

    if (this.metrics.inputProcessingTime > 5000) {
      recommendations.push('输入处理时间过长，建议优化处理逻辑');
    }

    if (this.metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('内存使用过高，建议清理缓存');
    }

    if (this.metrics.errorCount > 5) {
      recommendations.push('错误次数较多，建议检查错误处理逻辑');
    }

    if (this.metrics.userInteractions > 1000) {
      recommendations.push('用户交互频繁，建议优化交互体验');
    }

    if (recommendations.length === 0) {
      recommendations.push('性能良好，无需优化');
    }

    return recommendations;
  }

  /**
   * 优化图片
   */
  async optimizeImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('无法获取canvas上下文'));
          return;
        }

        // 计算合适的尺寸
        const maxSize = 1920;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // 绘制图片
        ctx.drawImage(img, 0, 0, width, height);

        // 压缩图片
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: file.type }));
          } else {
            reject(new Error('图片压缩失败'));
          }
        }, file.type, 0.8);
      };

      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 预加载资源
   */
  preloadResources(urls: string[]): Promise<void[]> {
    const promises = urls.map(url => {
      return new Promise<void>((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = url;
        link.as = url.includes('.css') ? 'style' : 
                  url.includes('.js') ? 'script' : 
                  /\.(png|jpg|jpeg|gif|webp)$/i.test(url) ? 'image' : 'fetch';
        
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`预加载失败: ${url}`));
        
        document.head.appendChild(link);
      });
    });

    return Promise.all(promises);
  }
}

// 导出单例实例
export const performanceOptimizationService = new PerformanceOptimizationService();
export default PerformanceOptimizationService;