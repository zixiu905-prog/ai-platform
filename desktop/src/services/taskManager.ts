/**
 * 桌面端任务管理器
 * 负责任务的暂停、继续、状态管理和进度跟踪
 */

export interface Task {
  id: string;
  name: string;
  type: 'design' | 'generation' | 'analysis' | 'workflow';
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  endTime?: Date;
  software?: string;
  description?: string;
  steps?: TaskStep[];
  currentStep?: number;
}

export interface TaskStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  details?: any;
}

export class TaskManager {
  private static instance: TaskManager;
  private tasks: Map<string, Task> = new Map();
  private eventListeners: Map<string, Set<Function>> = new Map();
  private isPaused: boolean = false;
  private activeTaskId?: string;

  private constructor() {}

  static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }
    return TaskManager.instance;
  }

  /**
   * 创建新任务
   */
  createTask(taskData: Omit<Task, 'id' | 'status' | 'progress' | 'startTime' | 'steps' | 'currentStep'>): Task {
    const task: Task = {
      ...taskData,
      id: this.generateTaskId(),
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      steps: taskData.steps || [],
      currentStep: taskData.steps ? 0 : undefined
    };

    this.tasks.set(task.id, task);
    this.emit('task-created', task);
    this.emit('tasks-updated', Array.from(this.tasks.values()));
    
    logger.info(`任务创建成功: ${task.name} (${task.id})`);
    return task;
  }

  /**
   * 开始执行任务
   */
  async startTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.error(`任务不存在: ${taskId}`);
      return false;
    }

    if (task.status === 'running') {
      logger.warn(`任务已在运行中: ${taskId}`);
      return true;
    }

    if (task.status === 'paused') {
      return this.resumeTask(taskId);
    }

    try {
      task.status = 'running';
      task.startTime = new Date();
      this.activeTaskId = taskId;
      
      this.emit('task-started', task);
      this.emit('tasks-updated', Array.from(this.tasks.values()));
      
      logger.info(`任务开始执行: ${task.name} (${task.id})`);
      
      // 模拟任务执行过程
      await this.executeTaskSteps(task);
      
      return true;
    } catch (error) {
      logger.error(`任务启动失败: ${taskId}`, error);
      task.status = 'failed';
      this.emit('task-failed', task);
      this.emit('tasks-updated', Array.from(this.tasks.values()));
      return false;
    }
  }

  /**
   * 暂停任务
   */
  pauseTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.error(`任务不存在: ${taskId}`);
      return false;
    }

    if (task.status !== 'running') {
      logger.warn(`任务不在运行状态，无法暂停: ${taskId} (当前状态: ${task.status})`);
      return false;
    }

    // 发送暂停指令给云端
    this.sendPauseCommand(taskId);
    
    task.status = 'paused';
    this.isPaused = true;
    
    // 暂停当前步骤
    if (task.currentStep !== undefined && task.steps) {
      const currentStep = task.steps[task.currentStep];
      if (currentStep) {
        currentStep.status = 'paused';
      }
    }

    this.emit('task-paused', task);
    this.emit('tasks-updated', Array.from(this.tasks.values()));
    
    logger.info(`任务已暂停: ${task.name} (${taskId})`);
    return true;
  }

  /**
   * 继续任务
   */
  async resumeTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.error(`任务不存在: ${taskId}`);
      return false;
    }

    if (task.status !== 'paused') {
      logger.warn(`任务不在暂停状态，无法继续: ${taskId} (当前状态: ${task.status})`);
      return false;
    }

    try {
      // 发送继续指令给云端
      this.sendResumeCommand(taskId);
      
      task.status = 'running';
      this.isPaused = false;
      this.activeTaskId = taskId;
      
      // 恢复当前步骤
      if (task.currentStep !== undefined && task.steps) {
        const currentStep = task.steps[task.currentStep];
        if (currentStep) {
          currentStep.status = 'running';
        }
      }

      this.emit('task-resumed', task);
      this.emit('tasks-updated', Array.from(this.tasks.values()));
      
      logger.info(`任务已恢复: ${task.name} (${taskId})`);
      
      // 继续执行任务步骤
      await this.continueTaskSteps(task);
      
      return true;
    } catch (error) {
      logger.error(`任务恢复失败: ${taskId}`, error);
      task.status = 'failed';
      this.emit('task-failed', task);
      this.emit('tasks-updated', Array.from(this.tasks.values()));
      return false;
    }
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.error(`任务不存在: ${taskId}`);
      return false;
    }

    if (task.status === 'completed') {
      logger.warn(`任务已完成，无法取消: ${taskId}`);
      return false;
    }

    // 发送取消指令给云端
    this.sendCancelCommand(taskId);
    
    task.status = 'failed';
    task.endTime = new Date();
    
    if (this.activeTaskId === taskId) {
      this.activeTaskId = undefined;
    }

    this.emit('task-cancelled', task);
    this.emit('tasks-updated', Array.from(this.tasks.values()));
    
    logger.info(`任务已取消: ${task.name} (${taskId})`);
    return true;
  }

  /**
   * 更新任务进度
   */
  updateTaskProgress(taskId: string, progress: number, details?: any): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.error(`任务不存在: ${taskId}`);
      return false;
    }

    const oldProgress = task.progress;
    task.progress = Math.max(0, Math.min(100, progress));
    
    // 更新当前步骤进度
    if (task.currentStep !== undefined && task.steps) {
      const currentStep = task.steps[task.currentStep];
      if (currentStep) {
        currentStep.progress = task.progress;
        if (details) {
          currentStep.details = details;
        }
      }
    }

    // 检查是否有进度变化
    if (Math.abs(task.progress - oldProgress) > 0.1) {
      this.emit('task-progress-updated', task, details);
      this.emit('tasks-updated', Array.from(this.tasks.values()));
    }

    return true;
  }

  /**
   * 获取任务信息
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取活动任务
   */
  getActiveTask(): Task | undefined {
    return this.activeTaskId ? this.tasks.get(this.activeTaskId) : undefined;
  }

  /**
   * 获取任务统计
   */
  getTaskStats(): {
    total: number;
    pending: number;
    running: number;
    paused: number;
    completed: number;
    failed: number;
  } {
    const tasks = Array.from(this.tasks.values());
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      paused: tasks.filter(t => t.status === 'paused').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length
    };
  }

  /**
   * 事件监听
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * 移除事件监听
   */
  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          logger.error(`事件监听器执行错误 (${event}):`, error);
        }
      });
    }
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 执行任务步骤
   */
  private async executeTaskSteps(task: Task): Promise<void> {
    if (!task.steps || task.steps.length === 0) {
      task.status = 'completed';
      task.endTime = new Date();
      this.emit('task-completed', task);
      this.emit('tasks-updated', Array.from(this.tasks.values()));
      return;
    }

    for (let i = 0; i < task.steps.length; i++) {
      if (task.status !== 'running') {
        break; // 任务被暂停或取消
      }

      const step = task.steps[i];
      task.currentStep = i;
      step.status = 'running';
      step.startTime = new Date();

      this.emit('step-started', task, step);
      
      try {
        // 模拟步骤执行
        await this.executeStep(step);
        
        step.status = 'completed';
        step.endTime = new Date();
        step.progress = 100;
        
        this.emit('step-completed', task, step);
        
        // 更新任务整体进度
        const overallProgress = ((i + 1) / task.steps.length) * 100;
        this.updateTaskProgress(task.id, overallProgress, { 
          completedStep: step.name,
          stepIndex: i + 1,
          totalSteps: task.steps.length
        });
        
      } catch (error) {
        step.status = 'failed';
        step.endTime = new Date();
        this.emit('step-failed', task, step, error);
        throw error;
      }
    }

    if (task.status === 'running') {
      task.status = 'completed';
      task.endTime = new Date();
      task.progress = 100;
      this.activeTaskId = undefined;
      
      this.emit('task-completed', task);
      this.emit('tasks-updated', Array.from(this.tasks.values()));
    }
  }

  /**
   * 继续任务步骤
   */
  private async continueTaskSteps(task: Task): Promise<void> {
    if (!task.steps || task.currentStep === undefined) {
      return;
    }

    // 从当前步骤继续执行
    for (let i = task.currentStep; i < task.steps.length; i++) {
      if (task.status !== 'running') {
        break;
      }

      const step = task.steps[i];
      
      // 如果步骤已完成，跳过
      if (step.status === 'completed') {
        continue;
      }

      step.status = 'running';
      step.startTime = new Date();

      this.emit('step-started', task, step);
      
      try {
        await this.executeStep(step);
        
        step.status = 'completed';
        step.endTime = new Date();
        step.progress = 100;
        
        this.emit('step-completed', task, step);
        
        const overallProgress = ((i + 1) / task.steps.length) * 100;
        this.updateTaskProgress(task.id, overallProgress, { 
          completedStep: step.name,
          stepIndex: i + 1,
          totalSteps: task.steps.length
        });
        
      } catch (error) {
        step.status = 'failed';
        step.endTime = new Date();
        this.emit('step-failed', task, step, error);
        throw error;
      }
    }
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(step: TaskStep): Promise<void> {
    // 模拟步骤执行时间
    const duration = Math.random() * 3000 + 2000; // 2-5秒
    const steps = Math.ceil(duration / 100);
    
    for (let i = 0; i <= steps; i++) {
      if (this.isPaused) {
        // 等待恢复
        while (this.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      step.progress = (i / steps) * 100;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * 发送暂停指令给云端
   */
  private sendPauseCommand(taskId: string): void {
    if (window.electronAPI?.cloud) {
      window.electronAPI.cloud.sendCommand('PAUSE_TASK', { taskId });
    }
  }

  /**
   * 发送继续指令给云端
   */
  private sendResumeCommand(taskId: string): void {
    if (window.electronAPI?.cloud) {
      window.electronAPI.cloud.sendCommand('RESUME_TASK', { taskId });
    }
  }

  /**
   * 发送取消指令给云端
   */
  private sendCancelCommand(taskId: string): void {
    if (window.electronAPI?.cloud) {
      window.electronAPI.cloud.sendCommand('CANCEL_TASK', { taskId });
    }
  }
}

// 全局实例
export const taskManager = TaskManager.getInstance();

// 简单的日志系统
const logger = {
  info: (message: string, data?: any) => console.log(`[TaskManager] ${message}`, data || ''),
  warn: (message: string, data?: any) => console.warn(`[TaskManager] ${message}`, data || ''),
  error: (message: string, data?: any) => console.error(`[TaskManager] ${message}`, data || '')
};