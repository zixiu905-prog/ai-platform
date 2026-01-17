import { EventEmitter } from 'events';
import { StatusMessage } from './websocketClientService';

export interface TaskProgress {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  startTime: number;
  lastUpdate: number;
  estimatedDuration?: number;
  subSteps?: Array<{
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    message: string;
  }>;
}

export interface PerformanceMetrics {
  taskId: string;
  cpuUsage?: number;
  memoryUsage?: number;
  diskIO?: number;
  networkIO?: number;
  softwareResponse?: number;
}

export class StatusTrackingService extends EventEmitter {
  private taskProgress: Map<string, TaskProgress> = new Map();
  private performanceMetrics: Map<string, PerformanceMetrics[]> = new Map();
  private statusUpdateQueue: StatusMessage[] = [];
  private batchUpdateInterval: NodeJS.Timeout | null = null;
  private batchSize = 10;
  private batchTimeout = 1000; // 1秒

  constructor() {
    super();
    this.startBatchProcessor();
  }

  startTaskTracking(taskId: string, message: string = '任务开始', estimatedDuration?: number) {
    const progress: TaskProgress = {
      taskId,
      status: 'pending',
      progress: 0,
      message,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      estimatedDuration
    };

    this.taskProgress.set(taskId, progress);
    this.performanceMetrics.set(taskId, []);

    this.emit('task_started', { taskId, progress });
    this.logStatusUpdate(progress);
  }

  updateTaskProgress(
    taskId: string, 
    progress: number, 
    message: string, 
    status?: TaskProgress['status'],
    subSteps?: TaskProgress['subSteps']
  ) {
    const current = this.taskProgress.get(taskId);
    if (!current) {
      console.warn(`任务 ${taskId} 未找到，创建新的跟踪记录`);
      this.startTaskTracking(taskId, message);
      return;
    }

    current.progress = Math.min(100, Math.max(0, progress));
    current.message = message;
    current.lastUpdate = Date.now();
    
    if (status) {
      current.status = status;
    } else if (progress > 0 && progress < 100) {
      current.status = 'processing';
    } else if (progress >= 100) {
      current.status = 'completed';
    }

    if (subSteps) {
      current.subSteps = subSteps;
    }

    this.taskProgress.set(taskId, current);
    this.emit('progress_updated', { taskId, progress: current });
    this.logStatusUpdate(current);
  }

  addSubStep(taskId: string, stepName: string, stepMessage: string = '') {
    const current = this.taskProgress.get(taskId);
    if (!current) return;

    if (!current.subSteps) {
      current.subSteps = [];
    }

    const existingStep = current.subSteps.find(s => s.name === stepName);
    if (existingStep) {
      existingStep.message = stepMessage;
      existingStep.status = 'processing';
    } else {
      current.subSteps.push({
        name: stepName,
        status: 'pending',
        progress: 0,
        message: stepMessage
      });
    }

    this.taskProgress.set(taskId, current);
  }

  updateSubStepProgress(
    taskId: string, 
    stepName: string, 
    progress: number, 
    message: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed' = 'processing'
  ) {
    const current = this.taskProgress.get(taskId);
    if (!current || !current.subSteps) return;

    const step = current.subSteps.find(s => s.name === stepName);
    if (step) {
      step.progress = Math.min(100, Math.max(0, progress));
      step.message = message;
      step.status = status;

      // 计算总体进度
      const completedSteps = current.subSteps.filter(s => s.status === 'completed').length;
      const totalSteps = current.subSteps.length;
      const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

      current.progress = overallProgress;
      current.lastUpdate = Date.now();

      this.taskProgress.set(taskId, current);
      this.emit('step_updated', { taskId, stepName, step, overallProgress });
      this.logStatusUpdate(current);
    }
  }

  completeTask(taskId: string, message: string = '任务完成') {
    const current = this.taskProgress.get(taskId);
    if (!current) return;

    current.status = 'completed';
    current.progress = 100;
    current.message = message;
    current.lastUpdate = Date.now();

    if (current.subSteps) {
      current.subSteps.forEach(step => {
        if (step.status === 'processing' || step.status === 'pending') {
          step.status = 'completed';
          step.progress = 100;
        }
      });
    }

    this.taskProgress.set(taskId, current);
    this.emit('task_completed', { taskId, progress: current });
    this.logStatusUpdate(current);
  }

  failTask(taskId: string, errorMessage: string) {
    const current = this.taskProgress.get(taskId);
    if (!current) return;

    current.status = 'failed';
    current.message = `任务失败: ${errorMessage}`;
    current.lastUpdate = Date.now();

    this.taskProgress.set(taskId, current);
    this.emit('task_failed', { taskId, progress: current, error: errorMessage });
    this.logStatusUpdate(current);
  }

  cancelTask(taskId: string, reason: string = '用户取消') {
    const current = this.taskProgress.get(taskId);
    if (!current) return;

    current.status = 'cancelled';
    current.message = `任务已取消: ${reason}`;
    current.lastUpdate = Date.now();

    this.taskProgress.set(taskId, current);
    this.emit('task_cancelled', { taskId, progress: current, reason });
    this.logStatusUpdate(current);
  }

  recordPerformanceMetrics(taskId: string, metrics: Partial<PerformanceMetrics>) {
    const currentMetrics = this.performanceMetrics.get(taskId) || [];
    const fullMetrics: PerformanceMetrics = {
      taskId,
      cpuUsage: 0,
      memoryUsage: 0,
      diskIO: 0,
      networkIO: 0,
      softwareResponse: 0,
      ...metrics
    };

    currentMetrics.push(fullMetrics);
    this.performanceMetrics.set(taskId, currentMetrics);

    // 保持最近的50条记录
    if (currentMetrics.length > 50) {
      this.performanceMetrics.set(taskId, currentMetrics.slice(-50));
    }

    this.emit('performance_metrics', { taskId, metrics: fullMetrics });
  }

  getTaskProgress(taskId: string): TaskProgress | undefined {
    return this.taskProgress.get(taskId);
  }

  getAllProgress(): Map<string, TaskProgress> {
    return new Map(this.taskProgress);
  }

  getActiveTasks(): string[] {
    const activeTasks: string[] = [];
    
    for (const [taskId, progress] of this.taskProgress) {
      if (progress.status === 'pending' || progress.status === 'processing') {
        activeTasks.push(taskId);
      }
    }
    
    return activeTasks;
  }

  getPerformanceMetrics(taskId: string): PerformanceMetrics[] {
    return this.performanceMetrics.get(taskId) || [];
  }

  getEstimatedTimeRemaining(taskId: string): number | null {
    const progress = this.taskProgress.get(taskId);
    if (!progress || !progress.estimatedDuration || progress.progress === 0) {
      return null;
    }

    const elapsed = Date.now() - progress.startTime;
    const estimatedTotal = (elapsed / progress.progress) * 100;
    return Math.max(0, estimatedTotal - elapsed);
  }

  private logStatusUpdate(progress: TaskProgress) {
    const statusMessage: StatusMessage = {
      taskId: progress.taskId,
      status: progress.status,
      progress: progress.progress,
      message: progress.message,
      timestamp: progress.lastUpdate
    };

    if (progress.subSteps) {
      statusMessage.result = { subSteps: progress.subSteps };
    }

    // 添加到批量更新队列
    this.statusUpdateQueue.push(statusMessage);

    // 如果队列达到批量大小或是关键状态变更，立即发送
    if (this.statusUpdateQueue.length >= this.batchSize || 
        progress.status === 'completed' || 
        progress.status === 'failed' || 
        progress.status === 'cancelled') {
      this.flushStatusUpdates();
    }
  }

  private startBatchProcessor() {
    this.batchUpdateInterval = setInterval(() => {
      if (this.statusUpdateQueue.length > 0) {
        this.flushStatusUpdates();
      }
    }, this.batchTimeout);
  }

  private flushStatusUpdates() {
    if (this.statusUpdateQueue.length === 0) return;

    const updates = [...this.statusUpdateQueue];
    this.statusUpdateQueue = [];

    this.emit('status_updates_batch', updates);
    updates.forEach(update => {
      this.emit('status_update', update);
    });
  }

  generateProgressReport(taskId: string): any {
    const progress = this.taskProgress.get(taskId);
    const metrics = this.performanceMetrics.get(taskId) || [];

    if (!progress) {
      return null;
    }

    const duration = Date.now() - progress.startTime;
    const avgCpuUsage = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + (m.cpuUsage || 0), 0) / metrics.length 
      : 0;
    
    const avgMemoryUsage = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0) / metrics.length 
      : 0;

    return {
      taskId,
      status: progress.status,
      progress: progress.progress,
      message: progress.message,
      startTime: progress.startTime,
      lastUpdate: progress.lastUpdate,
      duration,
      estimatedTimeRemaining: this.getEstimatedTimeRemaining(taskId),
      subSteps: progress.subSteps,
      performanceMetrics: {
        averageCpuUsage: avgCpuUsage.toFixed(2),
        averageMemoryUsage: avgMemoryUsage.toFixed(2),
        totalSamples: metrics.length
      }
    };
  }

  cleanup() {
    if (this.batchUpdateInterval) {
      clearInterval(this.batchUpdateInterval);
      this.batchUpdateInterval = null;
    }
    
    this.flushStatusUpdates();
    this.taskProgress.clear();
    this.performanceMetrics.clear();
    this.statusUpdateQueue = [];
  }
}

// 单例模式
export const statusTrackingService = new StatusTrackingService();