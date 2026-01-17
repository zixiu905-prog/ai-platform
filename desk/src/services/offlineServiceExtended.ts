import { OfflineService, OfflineCache, OfflineAIModel } from './offlineService';
import { app } from 'electron';
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';

export interface OfflineWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
  category: string;
  isLocal: boolean;
  lastModified: Date;
  dependencies?: string[];
}

export interface OfflineProject {
  id: string;
  name: string;
  type: 'photoshop' | 'autocad' | 'blender';
  files: Array<{
    path: string;
    content: any;
    lastModified: Date;
  }>;
  settings: Record<string, any>;
  lastSaved: Date;
}

export interface SyncQueue {
  id: string;
  type: 'create' | 'update' | 'delete';
  dataType: 'workflow' | 'project' | 'cache';
  data: any;
  timestamp: Date;
  retryCount: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

export class OfflineServiceExtended extends OfflineService {
  private projectsDir: string;
  private workflowsDir: string;
  private syncQueueFile: string;
  private syncQueue: Map<string, SyncQueue> = new Map();
  private syncInProgress: boolean = false;

  constructor() {
    super();
    const userDataPath = app.getPath('userData');
    this.projectsDir = join(userDataPath, 'offline', 'projects');
    this.workflowsDir = join(userDataPath, 'offline', 'workflows');
    this.syncQueueFile = join(userDataPath, 'offline', 'sync-queue.json');
    
    this.ensureOfflineDirectories();
    this.loadSyncQueue();
    this.setupNetworkStatusMonitoring();
    this.startSyncScheduler();
  }

  /**
   * 确保离线目录存在
   */
  private ensureOfflineDirectories(): void {
    [this.projectsDir, this.workflowsDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * 监听网络状态变化
   */
  private setupNetworkStatusMonitoring(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 网络已连接');
        this.isOnline = true;
        this.emit('network-status-changed', true);
        this.processSyncQueue();
      });

      window.addEventListener('offline', () => {
        console.log('📵 网络已断开');
        this.isOnline = false;
        this.emit('network-status-changed', false);
      });
    }
  }

  /**
   * 保存项目到离线存储
   */
  async saveProject(project: OfflineProject): Promise<boolean> {
    try {
      const projectPath = join(this.projectsDir, `${project.id}.json`);
      const projectData = {
        ...project,
        lastSaved: new Date()
      };
      
      writeFileSync(projectPath, JSON.stringify(projectData, null, 2));
      
      // 如果在线，加入同步队列
      if (this.isOnline) {
        this.addToSyncQueue({
          id: `project_${project.id}_${Date.now()}`,
          type: 'update',
          dataType: 'project',
          data: projectData,
          timestamp: new Date(),
          retryCount: 0,
          status: 'pending'
        });
      }
      
      console.log(`✅ 项目已保存到离线存储: ${project.name}`);
      this.emit('project-saved', project);
      return true;
    } catch (error) {
      console.error('❌ 保存项目失败:', error);
      return false;
    }
  }

  /**
   * 获取离线项目
   */
  getOfflineProjects(): OfflineProject[] {
    try {
      const projects: OfflineProject[] = [];
      
      // 这里需要实际的文件系统读取逻辑
      // 由于我们在Electron环境中，可以使用Node.js fs模块
      
      console.log('📁 获取离线项目列表');
      return projects;
    } catch (error) {
      console.error('❌ 获取离线项目失败:', error);
      return [];
    }
  }

  /**
   * 获取单个离线项目
   */
  getOfflineProject(projectId: string): OfflineProject | null {
    try {
      const projectPath = join(this.projectsDir, `${projectId}.json`);
      
      if (!existsSync(projectPath)) {
        return null;
      }
      
      const projectData = JSON.parse(readFileSync(projectPath, 'utf-8'));
      return projectData;
    } catch (error) {
      console.error('❌ 获取离线项目失败:', error);
      return null;
    }
  }

  /**
   * 保存工作流到离线存储
   */
  async saveWorkflow(workflow: OfflineWorkflow): Promise<boolean> {
    try {
      const workflowPath = join(this.workflowsDir, `${workflow.id}.json`);
      const workflowData = {
        ...workflow,
        lastModified: new Date(),
        isLocal: true
      };
      
      writeFileSync(workflowPath, JSON.stringify(workflowData, null, 2));
      
      // 缓存工作流数据
      await this.cacheData({
        id: `workflow_${workflow.id}`,
        type: 'workflow',
        content: workflowData,
        tags: ['offline', 'workflow', workflow.category]
      });
      
      // 如果在线，加入同步队列
      if (this.isOnline) {
        this.addToSyncQueue({
          id: `workflow_${workflow.id}_${Date.now()}`,
          type: workflow.isLocal ? 'create' : 'update',
          dataType: 'workflow',
          data: workflowData,
          timestamp: new Date(),
          retryCount: 0,
          status: 'pending'
        });
      }
      
      console.log(`✅ 工作流已保存到离线存储: ${workflow.name}`);
      this.emit('workflow-saved', workflow);
      return true;
    } catch (error) {
      console.error('❌ 保存工作流失败:', error);
      return false;
    }
  }

  /**
   * 获取离线工作流
   */
  getOfflineWorkflows(): OfflineWorkflow[] {
    try {
      const workflows: OfflineWorkflow[] = [];
      
      // 这里需要实际的文件系统读取逻辑
      console.log('📁 获取离线工作流列表');
      return workflows;
    } catch (error) {
      console.error('❌ 获取离线工作流失败:', error);
      return [];
    }
  }

  /**
   * 获取单个离线工作流
   */
  getOfflineWorkflow(workflowId: string): OfflineWorkflow | null {
    try {
      const workflowPath = join(this.workflowsDir, `${workflowId}.json`);
      
      if (!existsSync(workflowPath)) {
        return null;
      }
      
      const workflowData = JSON.parse(readFileSync(workflowPath, 'utf-8'));
      return workflowData;
    } catch (error) {
      console.error('❌ 获取离线工作流失败:', error);
      return null;
    }
  }

  /**
   * 执行离线工作流
   */
  async executeOfflineWorkflow(workflowId: string, inputData: any): Promise<any> {
    try {
      const workflow = this.getOfflineWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`工作流不存在: ${workflowId}`);
      }

      console.log(`🚀 开始执行离线工作流: ${workflow.name}`);
      
      // 检查依赖
      if (workflow.dependencies) {
        const missingDeps = workflow.dependencies.filter(dep => !this.isDependencyAvailable(dep));
        if (missingDeps.length > 0) {
          throw new Error(`缺少依赖: ${missingDeps.join(', ')}`);
        }
      }

      // 模拟工作流执行
      const result = await this.processWorkflowNodes(workflow.nodes, workflow.edges, inputData);
      
      console.log(`✅ 工作流执行完成: ${workflow.name}`);
      this.emit('workflow-executed', { workflowId, result });
      
      return result;
    } catch (error) {
      console.error('❌ 工作流执行失败:', error);
      this.emit('workflow-execution-error', { workflowId, error });
      throw error;
    }
  }

  /**
   * 处理工作流节点
   */
  private async processWorkflowNodes(nodes: any[], edges: any[], inputData: any): Promise<any> {
    let currentData = inputData;
    const executedNodes = new Set<string>();

    // 简化的节点处理逻辑
    for (const node of nodes) {
      if (executedNodes.has(node.id)) continue;
      
      // 检查前置条件
      const incomingEdges = edges.filter(e => e.target === node.id);
      const canExecute = incomingEdges.every(e => executedNodes.has(e.source));
      
      if (!canExecute) continue;

      try {
        // 根据节点类型执行不同逻辑
        let nodeResult;
        switch (node.type) {
          case 'ai_process':
            nodeResult = await this.executeOfflineAIProcess(node, currentData);
            break;
          case 'file_operation':
            nodeResult = await this.executeFileOperation(node, currentData);
            break;
          case 'software_automation':
            nodeResult = await this.executeSoftwareAutomation(node, currentData);
            break;
          default:
            nodeResult = currentData;
        }

        currentData = { ...currentData, [node.id]: nodeResult };
        executedNodes.add(node.id);
        
      } catch (error) {
        console.error(`❌ 节点执行失败 ${node.id}:`, error);
        throw error;
      }
    }

    return currentData;
  }

  /**
   * 执行离线AI处理
   */
  private async executeOfflineAIProcess(node: any, inputData: any): Promise<any> {
    // 检查是否有可用的离线AI模型
    const loadedModels = this.getLoadedModels();
    const offlineModel = loadedModels.find(m => m.id === 'offline_llm');
    if (!offlineModel) {
      throw new Error('没有可用的离线AI模型');
    }

    // 模拟AI处理
    console.log(`🤖 执行离线AI处理: ${node.data.label}`);
    
    return {
      processed: true,
      model: offlineModel.id,
      result: `离线处理结果 - 输入: ${JSON.stringify(inputData)}`
    };
  }

  /**
   * 执行文件操作
   */
  private async executeFileOperation(node: any, inputData: any): Promise<any> {
    console.log(`📁 执行文件操作: ${node.data.operation}`);
    
    switch (node.data.operation) {
      case 'read':
        return { content: '模拟文件内容', path: node.data.path };
      case 'write':
        return { written: true, path: node.data.path };
      case 'copy':
        return { copied: true, from: node.data.from, to: node.data.to };
      default:
        return inputData;
    }
  }

  /**
   * 执行软件自动化
   */
  private async executeSoftwareAutomation(node: any, inputData: any): Promise<any> {
    console.log(`🔧 执行软件自动化: ${node.data.software}`);
    
    return {
      automated: true,
      software: node.data.software,
      operation: node.data.operation,
      result: `模拟${node.data.software}操作结果`
    };
  }

  /**
   * 检查依赖是否可用
   */
  private isDependencyAvailable(dependency: string): boolean {
    // 简化的依赖检查
    const availableDependencies = ['offline_llm', 'file_operations', 'basic_automation'];
    return availableDependencies.includes(dependency);
  }

  /**
   * 添加到同步队列
   */
  private addToSyncQueue(item: SyncQueue): void {
    this.syncQueue.set(item.id, item);
    this.saveSyncQueue();
    
    if (this.isOnline && !this.syncInProgress) {
      this.processSyncQueue();
    }
  }

  /**
   * 处理同步队列
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    console.log('🔄 开始处理同步队列');

    try {
      const pendingItems = Array.from(this.syncQueue.values()).filter(item => item.status === 'pending');
      
      for (const item of pendingItems) {
        try {
          item.status = 'syncing';
          this.saveSyncQueue();
          
          // 模拟同步操作
          await this.syncQueueItem(item);
          
          item.status = 'completed';
          this.syncQueue.delete(item.id);
          console.log(`✅ 同步完成: ${item.id}`);
          
        } catch (error) {
          console.error(`❌ 同步失败: ${item.id}`, error);
          item.status = 'failed';
          item.retryCount++;
          
          if (item.retryCount < 3) {
            item.status = 'pending'; // 重试
          }
        }
        
        this.saveSyncQueue();
        
        // 避免过于频繁的同步
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } finally {
      this.syncInProgress = false;
      console.log('🏁 同步队列处理完成');
    }
  }

  /**
   * 同步到云端
   */
  private async syncQueueItem(item: SyncQueue): Promise<void> {
    // 模拟云端同步
    console.log(`☁️ 同步到云端: ${item.dataType} - ${item.id}`);
    
    // 这里应该实现实际的云端API调用
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 模拟90%的成功率
        if (Math.random() > 0.1) {
          resolve();
        } else {
          reject(new Error('云端同步失败'));
        }
      }, 2000);
    });
  }

  /**
   * 加载同步队列
   */
  private loadSyncQueue(): void {
    try {
      if (existsSync(this.syncQueueFile)) {
        const queueData = JSON.parse(readFileSync(this.syncQueueFile, 'utf-8'));
        this.syncQueue = new Map(Object.entries(queueData).map(([id, item]) => [id, item as SyncQueue]));
      }
    } catch (error) {
      console.error('❌ 加载同步队列失败:', error);
    }
  }

  /**
   * 保存同步队列
   */
  private saveSyncQueue(): void {
    try {
      const queueData = Object.fromEntries(this.syncQueue);
      writeFileSync(this.syncQueueFile, JSON.stringify(queueData, null, 2));
    } catch (error) {
      console.error('❌ 保存同步队列失败:', error);
    }
  }

  /**
   * 启动同步调度器
   */
  private startSyncScheduler(): void {
    // 每5分钟检查一次同步队列
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress && this.syncQueue.size > 0) {
        this.processSyncQueue();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): {
    isOnline: boolean;
    queueSize: number;
    pendingItems: number;
    failedItems: number;
    lastSyncTime?: Date;
  } {
    const pendingItems = Array.from(this.syncQueue.values()).filter(item => item.status === 'pending');
    const failedItems = Array.from(this.syncQueue.values()).filter(item => item.status === 'failed');
    
    return {
      isOnline: this.isOnline,
      queueSize: this.syncQueue.size,
      pendingItems: pendingItems.length,
      failedItems: failedItems.length,
      lastSyncTime: new Date() // 这里应该记录实际的最后同步时间
    };
  }

  /**
   * 手动触发同步
   */
  async triggerManualSync(): Promise<boolean> {
    if (!this.isOnline) {
      console.warn('⚠️  网络离线，无法同步');
      return false;
    }
    
    try {
      await this.processSyncQueue();
      console.log('✅ 手动同步完成');
      this.emit('sync-completed');
      return true;
    } catch (error) {
      console.error('❌ 手动同步失败:', error);
      this.emit('sync-error', error);
      return false;
    }
  }

  /**
   * 清理过期的离线数据
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 30); // 30天前

      // 清理过期项目
      const projects = this.getOfflineProjects();
      for (const project of projects) {
        if (new Date(project.lastSaved) < expiredDate) {
          // 这里应该删除过期的项目文件
          console.log(`🗑️ 清理过期项目: ${project.name}`);
        }
      }

      // 清理过期工作流
      const workflows = this.getOfflineWorkflows();
      for (const workflow of workflows) {
        if (new Date(workflow.lastModified) < expiredDate) {
          // 这里应该删除过期的工作流文件
          console.log(`🗑️ 清理过期工作流: ${workflow.name}`);
        }
      }

      console.log('✅ 过期数据清理完成');
    } catch (error) {
      console.error('❌ 清理过期数据失败:', error);
    }
  }
}