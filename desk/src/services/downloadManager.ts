import { EventEmitter } from 'events';

export interface DownloadItem {
  id: string;
  url: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  downloadedSize: number;
  speed: number; // bytes per second
  progress: number; // 0-100
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  retryCount: number;
  maxRetries: number;
  error?: string;
  appId?: string;
  appName?: string;
  appVersion?: string;
}

export interface DownloadQueue {
  id: string;
  name: string;
  items: DownloadItem[];
  maxConcurrent: number;
  isPaused: boolean;
  priority: 'low' | 'normal' | 'high';
}

export class DownloadManager extends EventEmitter {
  private downloads: Map<string, DownloadItem> = new Map();
  private downloadQueues: Map<string, DownloadQueue> = new Map();
  private activeDownloads: Set<string> = new Set();
  private maxConcurrentDownloads = 3;
  private downloadPath: string;
  private updateInterval = 1000; // 1 second

  constructor(downloadPath: string) {
    super();
    this.downloadPath = downloadPath;
    this.startProgressTracking();
  }

  /**
   * 添加下载任务
   */
  async addDownload(options: {
    url: string;
    fileName: string;
    fileSize?: number;
    appId?: string;
    appName?: string;
    appVersion?: string;
    queueId?: string;
    priority?: 'low' | 'normal' | 'high';
  }): Promise<string> {
    const downloadId = this.generateId();
    
    const downloadItem: DownloadItem = {
      id: downloadId,
      url: options.url,
      fileName: options.fileName,
      filePath: this.getDownloadPath(options.fileName),
      fileSize: options.fileSize || 0,
      downloadedSize: 0,
      speed: 0,
      progress: 0,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      appId: options.appId,
      appName: options.appName,
      appVersion: options.appVersion
    };

    this.downloads.set(downloadId, downloadItem);
    this.emit('downloadAdded', downloadItem);

    // 如果有队列ID，添加到队列
    if (options.queueId) {
      this.addToQueue(options.queueId, downloadItem, options.priority);
    } else {
      // 直接开始下载
      this.startDownload(downloadId);
    }

    return downloadId;
  }

  /**
   * 开始下载
   */
  private async startDownload(downloadId: string): Promise<void> {
    const download = this.downloads.get(downloadId);
    if (!download) {
      throw new Error(`Download ${downloadId} not found`);
    }

    if (this.activeDownloads.size >= this.maxConcurrentDownloads) {
      // 等待其他下载完成
      this.once('downloadCompleted', () => {
        this.startDownload(downloadId);
      });
      return;
    }

    try {
      download.status = 'downloading';
      download.startTime = new Date();
      this.activeDownloads.add(downloadId);
      
      this.emit('downloadStarted', download);

      // 创建可写流
      const fs = await import('fs');
      const path = await import('path');
      
      // 确保目录存在
      const dir = path.dirname(download.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const fileStream = fs.createWriteStream(download.filePath);

      // 发起HTTP请求
      const response = await fetch(download.url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && !download.fileSize) {
        download.fileSize = parseInt(contentLength);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Unable to read response body');
      }

      let lastUpdateTime = Date.now();
      let lastDownloadedSize = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if ((download.status as any) === 'cancelled') {
          reader.cancel();
          break;
        }

        if ((download.status as any) === 'paused') {
          // 暂停时保存当前进度
          fileStream.close();
          this.activeDownloads.delete(downloadId);
          return;
        }

        // 写入数据
        fileStream.write(Buffer.from(value));
        download.downloadedSize += value.length;

        // 计算速度和进度
        const now = Date.now();
        const timeDiff = (now - lastUpdateTime) / 1000; // seconds
        
        if (timeDiff >= 1) {
          download.speed = (download.downloadedSize - lastDownloadedSize) / timeDiff;
          lastUpdateTime = now;
          lastDownloadedSize = download.downloadedSize;
        }

        if (download.fileSize > 0) {
          download.progress = (download.downloadedSize / download.fileSize) * 100;
        }

        this.emit('downloadProgress', download);
      }

      fileStream.end();

      if ((download.status as any) !== 'cancelled' && (download.status as any) !== 'paused') {
        download.status = 'completed';
        download.endTime = new Date();
        download.progress = 100;
        download.speed = 0;

        this.activeDownloads.delete(downloadId);
        this.emit('downloadCompleted', download);

        // 启动队列中的下一个下载
        this.processNextInQueue();
      }
    } catch (error) {
      download.status = 'failed';
      download.error = error.message;
      download.endTime = new Date();
      this.activeDownloads.delete(downloadId);
      
      this.emit('downloadFailed', download);

      // 重试逻辑
      if (download.retryCount < download.maxRetries) {
        download.retryCount++;
        download.status = 'pending';
        download.error = undefined;
        
        setTimeout(() => {
          this.startDownload(downloadId);
        }, 5000 * download.retryCount); // 递增重试延迟
      }
    }
  }

  /**
   * 暂停下载
   */
  pauseDownload(downloadId: string): void {
    const download = this.downloads.get(downloadId);
    if (download && download.status === 'downloading') {
      download.status = 'paused';
      this.emit('downloadPaused', download);
    }
  }

  /**
   * 恢复下载
   */
  async resumeDownload(downloadId: string): Promise<void> {
    const download = this.downloads.get(downloadId);
    if (download && download.status === 'paused') {
      // 检查已下载的部分
      const fs = await import('fs');
      if (fs.existsSync(download.filePath)) {
        const stats = fs.statSync(download.filePath);
        download.downloadedSize = stats.size;
      }
      
      this.startDownload(downloadId);
    }
  }

  /**
   * 取消下载
   */
  async cancelDownload(downloadId: string): Promise<void> {
    const download = this.downloads.get(downloadId);
    if (download) {
      download.status = 'cancelled';
      download.endTime = new Date();
      this.activeDownloads.delete(downloadId);

      // 删除部分下载的文件
      const fs = await import('fs');
      if (fs.existsSync(download.filePath)) {
        fs.unlinkSync(download.filePath);
      }

      this.emit('downloadCancelled', download);
    }
  }

  /**
   * 重试下载
   */
  async retryDownload(downloadId: string): Promise<void> {
    const download = this.downloads.get(downloadId);
    if (download && (download.status === 'failed' || download.status === 'cancelled')) {
      download.status = 'pending';
      download.error = undefined;
      download.retryCount = 0;
      
      this.startDownload(downloadId);
    }
  }

  /**
   * 获取下载信息
   */
  getDownload(downloadId: string): DownloadItem | undefined {
    return this.downloads.get(downloadId);
  }

  /**
   * 获取所有下载
   */
  getAllDownloads(): DownloadItem[] {
    return Array.from(this.downloads.values());
  }

  /**
   * 获取指定状态的下载
   */
  getDownloadsByStatus(status: DownloadItem['status']): DownloadItem[] {
    return this.getAllDownloads().filter(download => download.status === status);
  }

  /**
   * 获取下载统计
   */
  getDownloadStats(): {
    total: number;
    downloading: number;
    completed: number;
    failed: number;
    paused: number;
    totalSpeed: number;
    totalSize: number;
    downloadedSize: number;
  } {
    const downloads = this.getAllDownloads();
    
    return {
      total: downloads.length,
      downloading: downloads.filter(d => d.status === 'downloading').length,
      completed: downloads.filter(d => d.status === 'completed').length,
      failed: downloads.filter(d => d.status === 'failed').length,
      paused: downloads.filter(d => d.status === 'paused').length,
      totalSpeed: downloads.filter(d => d.status === 'downloading').reduce((sum, d) => sum + d.speed, 0),
      totalSize: downloads.reduce((sum, d) => sum + d.fileSize, 0),
      downloadedSize: downloads.reduce((sum, d) => sum + d.downloadedSize, 0)
    };
  }

  /**
   * 清理已完成的下载记录
   */
  cleanupCompletedDownloads(olderThanDays = 7): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    for (const [id, download] of this.downloads) {
      if (
        (download.status === 'completed' || download.status === 'failed') &&
        download.endTime &&
        download.endTime < cutoffDate
      ) {
        this.downloads.delete(id);
        this.emit('downloadRemoved', download);
      }
    }
  }

  /**
   * 创建下载队列
   */
  createQueue(options: {
    name: string;
    maxConcurrent?: number;
    priority?: 'low' | 'normal' | 'high';
  }): string {
    const queueId = this.generateId();
    const queue: DownloadQueue = {
      id: queueId,
      name: options.name,
      items: [],
      maxConcurrent: options.maxConcurrent || 1,
      isPaused: false,
      priority: options.priority || 'normal'
    };
    
    this.downloadQueues.set(queueId, queue);
    return queueId;
  }

  /**
   * 添加到队列
   */
  private addToQueue(queueId: string, download: DownloadItem, priority?: 'low' | 'normal' | 'high'): void {
    const queue = this.downloadQueues.get(queueId);
    if (!queue) {
      return;
    }

    queue.items.push(download);
    queue.items.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const aPriority = priority || 'normal';
      const bPriority = 'normal';
      return priorityOrder[bPriority] - priorityOrder[aPriority];
    });

    this.processNextInQueue();
  }

  /**
   * 处理队列中的下一个下载
   */
  private processNextInQueue(): void {
    for (const queue of this.downloadQueues.values()) {
      if (queue.isPaused) {
        continue;
      }

      const activeInQueue = queue.items.filter(item => 
        item.status === 'downloading' || item.status === 'pending'
      ).length;

      if (activeInQueue >= queue.maxConcurrent) {
        continue;
      }

      const nextDownload = queue.items.find(item => item.status === 'pending');
      if (nextDownload) {
        this.startDownload(nextDownload.id);
      }
    }
  }

  /**
   * 暂停队列
   */
  pauseQueue(queueId: string): void {
    const queue = this.downloadQueues.get(queueId);
    if (queue) {
      queue.isPaused = true;
      queue.items.forEach(item => {
        if (item.status === 'downloading') {
          this.pauseDownload(item.id);
        }
      });
    }
  }

  /**
   * 恢复队列
   */
  resumeQueue(queueId: string): void {
    const queue = this.downloadQueues.get(queueId);
    if (queue) {
      queue.isPaused = false;
      queue.items.forEach(item => {
        if (item.status === 'paused') {
          this.resumeDownload(item.id);
        }
      });
      this.processNextInQueue();
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取下载路径
   */
  private getDownloadPath(fileName: string): string {
    const path = require('path');
    return path.join(this.downloadPath, fileName);
  }

  /**
   * 启动进度跟踪
   */
  private startProgressTracking(): void {
    setInterval(() => {
      const downloads = this.getAllDownloads().filter(d => d.status === 'downloading');
      downloads.forEach(download => {
        // 更新速度等实时数据
        this.emit('downloadProgress', download);
      });
    }, this.updateInterval);
  }

  /**
   * 设置最大并发下载数
   */
  setMaxConcurrentDownloads(max: number): void {
    this.maxConcurrentDownloads = Math.max(1, max);
  }

  /**
   * 设置下载路径
   */
  setDownloadPath(path: string): void {
    this.downloadPath = path;
  }

  /**
   * 导出下载列表
   */
  exportDownloads(): string {
    const downloads = this.getAllDownloads();
    return JSON.stringify(downloads, null, 2);
  }

  /**
   * 导入下载列表
   */
  importDownloads(data: string): void {
    try {
      const downloads: DownloadItem[] = JSON.parse(data);
      downloads.forEach(download => {
        if (download.status === 'completed' || download.status === 'failed') {
          // 只导入未完成的下载
          return;
        }
        this.downloads.set(download.id, download);
      });
    } catch (error) {
      console.error('Failed to import downloads:', error);
    }
  }
}

// 创建全局下载管理器实例
export const downloadManager = new DownloadManager(require('os').tmpdir());

// 类型声明
declare global {
  namespace NodeJS {
    interface Global {
      downloadManager: DownloadManager;
    }
  }
}

if (typeof global !== 'undefined') {
  global.downloadManager = downloadManager;
}