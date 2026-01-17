import apiService, { APIResponse } from './apiService';
import { useElectronAPI } from '../contexts/ElectronAPIContext';

// 数据同步状态
export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  ERROR = 'error',
  OFFLINE = 'offline'
}

// 同步配置
interface SyncConfig {
  autoSync: boolean;
  syncInterval: number; // 分钟
  retryAttempts: number;
  conflictResolution: 'local' | 'remote' | 'manual';
}

// 同步记录
interface SyncRecord {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  synced: boolean;
  lastAttempt?: Date;
  error?: string;
}

// 冲突解决选项
interface ConflictResolution {
  localVersion: any;
  remoteVersion: any;
  conflictType: 'data' | 'timestamp' | 'deleted';
  resolution: 'local' | 'remote' | 'merge' | 'manual';
}

class SyncService {
  private config: SyncConfig;
  private syncStatus: SyncStatus = SyncStatus.IDLE;
  private syncTimer: NodeJS.Timeout | null = null;
  private syncQueue: SyncRecord[] = [];
  private electronAPI: any;

  constructor() {
    this.config = {
      autoSync: true,
      syncInterval: 5, // 5分钟
      retryAttempts: 3,
      conflictResolution: 'local'
    };

    this.loadConfig();
    this.initializeSync();
  }

  /**
   * 加载同步配置
   */
  private async loadConfig() {
    try {
      if (window.electronAPI && window.electronAPI.store) {
        const savedConfig = await window.electronAPI.store.get('sync.config');
        if (savedConfig) {
          this.config = { ...this.config, ...savedConfig };
        }
      }
    } catch (error) {
      console.error('加载同步配置失败:', error);
    }
  }

  /**
   * 保存同步配置
   */
  private async saveConfig() {
    try {
      if (window.electronAPI && window.electronAPI.store) {
        await window.electronAPI.store.set('sync.config', this.config);
      }
    } catch (error) {
      console.error('保存同步配置失败:', error);
    }
  }

  /**
   * 初始化同步
   */
  private initializeSync() {
    // 加载同步队列
    this.loadSyncQueue();

    // 启动自动同步
    if (this.config.autoSync && apiService.getConnectionStatus()) {
      this.startAutoSync();
    }

    // 监听网络状态变化
    window.addEventListener('online', () => {
      if (this.config.autoSync) {
        this.startAutoSync();
        this.syncPendingData();
      }
    });

    window.addEventListener('offline', () => {
      this.stopAutoSync();
      this.syncStatus = SyncStatus.OFFLINE;
    });
  }

  /**
   * 加载同步队列
   */
  private async loadSyncQueue() {
    try {
      if (window.electronAPI && window.electronAPI.store) {
        const queue = await window.electronAPI.store.get('sync.queue') || [];
        this.syncQueue = queue.map((record: any) => ({
          ...record,
          timestamp: new Date(record.timestamp),
          lastAttempt: record.lastAttempt ? new Date(record.lastAttempt) : undefined
        }));
      }
    } catch (error) {
      console.error('加载同步队列失败:', error);
    }
  }

  /**
   * 保存同步队列
   */
  private async saveSyncQueue() {
    try {
      if (window.electronAPI && window.electronAPI.store) {
        await window.electronAPI.store.set('sync.queue', this.syncQueue);
      }
    } catch (error) {
      console.error('保存同步队列失败:', error);
    }
  }

  /**
   * 启动自动同步
   */
  startAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      this.syncPendingData();
    }, this.config.syncInterval * 60 * 1000);

    console.log('🔄 自动同步已启动，间隔:', this.config.syncInterval, '分钟');
  }

  /**
   * 停止自动同步
   */
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    console.log('⏹️ 自动同步已停止');
  }

  /**
   * 添加同步记录
   */
  async addSyncRecord(
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    data: any
  ) {
    const record: SyncRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityType,
      entityId,
      operation,
      data: JSON.parse(JSON.stringify(data)), // 深拷贝
      timestamp: new Date(),
      synced: false
    };

    this.syncQueue.push(record);
    await this.saveSyncQueue();

    // 如果在线且自动同步开启，立即同步
    if (apiService.getConnectionStatus() && this.config.autoSync) {
      this.syncPendingData();
    }

    console.log(`📝 添加同步记录: ${entityType} ${operation} ${entityId}`);
    return record;
  }

  /**
   * 同步待处理数据
   */
  async syncPendingData(): Promise<boolean> {
    if (this.syncStatus === SyncStatus.SYNCING) {
      console.log('⏳ 同步正在进行中，跳过');
      return false;
    }

    const pendingRecords = this.syncQueue.filter(record => !record.synced);
    if (pendingRecords.length === 0) {
      console.log('✅ 没有待同步的数据');
      return true;
    }

    console.log(`🔄 开始同步 ${pendingRecords.length} 条记录`);
    this.syncStatus = SyncStatus.SYNCING;

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const record of pendingRecords) {
        try {
          await this.syncRecord(record);
          record.synced = true;
          record.lastAttempt = new Date();
          successCount++;
        } catch (error) {
          record.error = error instanceof Error ? error.message : 'Unknown error';
          record.lastAttempt = new Date();
          errorCount++;
          console.error(`❌ 同步记录失败: ${record.id}`, error);
        }
      }

      await this.saveSyncQueue();

      if (errorCount === 0) {
        this.syncStatus = SyncStatus.SUCCESS;
        console.log(`✅ 同步完成，成功: ${successCount}`);
        return true;
      } else {
        this.syncStatus = SyncStatus.ERROR;
        console.log(`⚠️ 同步部分完成，成功: ${successCount}, 失败: ${errorCount}`);
        return false;
      }
    } catch (error) {
      this.syncStatus = SyncStatus.ERROR;
      console.error('❌ 同步过程发生错误:', error);
      return false;
    }
  }

  /**
   * 同步单条记录
   */
  private async syncRecord(record: SyncRecord): Promise<void> {
    let response: APIResponse;

    switch (record.entityType) {
      case 'project':
        response = await this.syncProject(record);
        break;
      case 'user':
        response = await this.syncUser(record);
        break;
      case 'settings':
        response = await this.syncSettings(record);
        break;
      case 'workflow':
        response = await this.syncWorkflow(record);
        break;
      case 'script':
        response = await this.syncScript(record);
        break;
      default:
        throw new Error(`不支持的实体类型: ${record.entityType}`);
    }

    if (!response.success) {
      throw new Error(response.error || '同步失败');
    }
  }

  /**
   * 同步项目数据
   */
  private async syncProject(record: SyncRecord): Promise<APIResponse> {
    const { operation, data, entityId } = record;

    switch (operation) {
      case 'create':
        return apiService.post('/projects', data);
      case 'update':
        return apiService.put(`/projects/${entityId}`, data);
      case 'delete':
        return apiService.delete(`/projects/${entityId}`);
      default:
        throw new Error(`不支持的操作: ${operation}`);
    }
  }

  /**
   * 同步用户数据
   */
  private async syncUser(record: SyncRecord): Promise<APIResponse> {
    const { operation, data } = record;

    switch (operation) {
      case 'update':
        return apiService.put('/users/profile', data);
      default:
        throw new Error(`不支持的用户操作: ${operation}`);
    }
  }

  /**
   * 同步设置数据
   */
  private async syncSettings(record: SyncRecord): Promise<APIResponse> {
    const { operation, data } = record;

    switch (operation) {
      case 'update':
        return apiService.put('/users/settings', data);
      default:
        throw new Error(`不支持的设置操作: ${operation}`);
    }
  }

  /**
   * 同步工作流数据
   */
  private async syncWorkflow(record: SyncRecord): Promise<APIResponse> {
    const { operation, data, entityId } = record;

    switch (operation) {
      case 'create':
        return apiService.post('/workflows', data);
      case 'update':
        return apiService.put(`/workflows/${entityId}`, data);
      case 'delete':
        return apiService.delete(`/workflows/${entityId}`);
      default:
        throw new Error(`不支持的工作流操作: ${operation}`);
    }
  }

  /**
   * 同步脚本数据
   */
  private async syncScript(record: SyncRecord): Promise<APIResponse> {
    const { operation, data, entityId } = record;

    switch (operation) {
      case 'create':
        return apiService.post('/scripts', data);
      case 'update':
        return apiService.put(`/scripts/${entityId}`, data);
      case 'delete':
        return apiService.delete(`/scripts/${entityId}`);
      default:
        throw new Error(`不支持的脚本操作: ${operation}`);
    }
  }

  /**
   * 检测和解决冲突
   */
  async resolveConflicts(): Promise<ConflictResolution[]> {
    const conflicts: ConflictResolution[] = [];

    for (const record of this.syncQueue.filter(r => !r.synced)) {
      try {
        // 获取远程版本
        const response = await apiService.get(`/${record.entityType}s/${record.entityId}`);
        const remoteVersion = response.success ? response.data : null;

        if (remoteVersion && this.hasConflict(record.data, remoteVersion)) {
          conflicts.push({
            localVersion: record.data,
            remoteVersion,
            conflictType: this.detectConflictType(record, remoteVersion),
            resolution: this.config.conflictResolution
          });
        }
      } catch (error) {
        // 远程不存在，可能是新创建的记录，不算冲突
      }
    }

    return conflicts;
  }

  /**
   * 检查是否存在冲突
   */
  private hasConflict(localData: any, remoteData: any): boolean {
    const localTime = new Date(localData.updatedAt || localData.createdAt);
    const remoteTime = new Date(remoteData.updatedAt || remoteData.createdAt);

    return localTime.getTime() !== remoteTime.getTime();
  }

  /**
   * 检测冲突类型
   */
  private detectConflictType(record: SyncRecord, remoteData: any): ConflictResolution['conflictType'] {
    if (remoteData.deletedAt) {
      return 'deleted';
    }

    const localTime = new Date(record.data.updatedAt || record.data.createdAt);
    const remoteTime = new Date(remoteData.updatedAt || remoteData.createdAt);

    if (localTime.getTime() > remoteTime.getTime()) {
      return 'data';
    }

    return 'timestamp';
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  /**
   * 获取同步队列状态
   */
  getSyncQueueStatus(): {
    total: number;
    pending: number;
    synced: number;
    errors: number;
  } {
    const total = this.syncQueue.length;
    const synced = this.syncQueue.filter(r => r.synced).length;
    const errors = this.syncQueue.filter(r => !r.synced && r.error).length;
    const pending = total - synced - errors;

    return { total, pending, synced, errors };
  }

  /**
   * 设置同步配置
   */
  async setConfig(config: Partial<SyncConfig>) {
    this.config = { ...this.config, ...config };
    await this.saveConfig();

    // 重新启动自动同步
    if (this.config.autoSync && apiService.getConnectionStatus()) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  /**
   * 获取同步配置
   */
  getConfig(): SyncConfig {
    return { ...this.config };
  }

  /**
   * 清除已同步的记录
   */
  async clearSyncedRecords() {
    this.syncQueue = this.syncQueue.filter(record => !record.synced);
    await this.saveSyncQueue();
    console.log('🧹 清除已同步记录');
  }

  /**
   * 清空同步队列
   */
  async clearSyncQueue() {
    this.syncQueue = [];
    await this.saveSyncQueue();
    console.log('🗑️ 清空同步队列');
  }

  /**
   * 手动触发同步
   */
  async forceSync(): Promise<boolean> {
    return this.syncPendingData();
  }
}

// 创建全局同步服务实例
const syncService = new SyncService();

export default syncService;
export { SyncService };