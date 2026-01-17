import { writeFile, readFile, mkdir } from 'fs';
import { join, dirname, basename } from 'path';
import { app } from 'electron';
import { promisify } from 'util';
import axios from 'axios';
import { EventEmitter } from 'events';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const mkdirAsync = promisify(mkdir);

export interface ImageGenerationConfig {
  model: string;
  prompt: string;
  size?: '1K' | '2K' | '4K';
  responseFormat?: 'url' | 'base64';
  sequentialGeneration?: 'disabled' | 'enabled';
  stream?: boolean;
  watermark?: boolean;
  negativePrompt?: string;
  style?: string;
  seed?: number;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  inputImage?: string; // base64 or URL for img2img
  enhancements?: Record<string, any>; // enhancement settings
}

export interface GenerationTask {
  id: string;
  config: ImageGenerationConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: ImageGenerationResult;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedTime?: number;
  priority: 'low' | 'normal' | 'high';
}

export interface ImageGenerationResult {
  url?: string;
  base64?: string;
  metadata: {
    model: string;
    prompt: string;
    size: string;
    generationTime: number;
    seed?: number;
    steps?: number;
    cfgScale?: number;
    sampler?: string;
    timestamp: Date;
    cost?: number;
  };
  thumbnail?: string;
  variations?: string[]; // 变体图片URLs
}

export interface ImageGenerationHistory {
  id: string;
  task: GenerationTask;
  savedTo: string[];
  tags: string[];
  rating?: number;
  notes?: string;
  favorited: boolean;
}

export class ImageGenerationService extends EventEmitter {
  protected readonly apiUrl: string = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
  protected readonly apiKey: string;
  protected tempDir: string;
  protected outputDir: string;
  protected activeTasks: Map<string, GenerationTask> = new Map();
  protected taskQueue: GenerationTask[] = [];
  protected maxConcurrentTasks: number = 3;
  protected isProcessing: boolean = false;
  protected generationHistory: ImageGenerationHistory[] = [];
  protected rateLimiter: Map<string, number> = new Map(); // 每分钟请求限制
  protected supportedModels: Map<string, any> = new Map();

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
    this.tempDir = join(app.getPath('temp'), 'aidesign-image-generation');
    this.outputDir = join(app.getPath('userData'), 'generated-images');
    this.initializeDirectories();
    this.loadHistory();
    this.initializeSupportedModels();
  }

  private async initializeDirectories(): Promise<void> {
    try {
      await mkdirAsync(this.tempDir, { recursive: true });
      await mkdirAsync(this.outputDir, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize directories:', error);
    }
  }

  /**
   * 生成单张图片
   */
  public async generateImage(config: ImageGenerationConfig): Promise<GenerationTask> {
    // 检查速率限制
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please wait before generating more images.');
    }

    const task: GenerationTask = {
      id: this.generateTaskId(),
      config,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      priority: 'normal',
      estimatedTime: this.estimateGenerationTime(config)
    };

    this.activeTasks.set(task.id, task);
    this.taskQueue.push(task);
    this.emit('taskCreated', task);

    if (!this.isProcessing) {
      this.processQueue();
    }

    return task;
  }

  /**
   * 批量生成图片
   */
  public async generateBatch(configs: ImageGenerationConfig[]): Promise<GenerationTask[]> {
    const tasks: GenerationTask[] = [];

    for (const config of configs) {
      try {
        const task = await this.generateImage(config);
        tasks.push(task);
      } catch (error) {
        console.error('Failed to create task:', error);
      }
    }

    return tasks;
  }

  /**
   * 生成图片变体
   */
  public async generateVariations(
    baseImageUrl: string,
    count: number = 4,
    variations: Partial<ImageGenerationConfig> = {}
  ): Promise<GenerationTask[]> {
    const tasks: GenerationTask[] = [];

    for (let i = 0; i < count; i++) {
      const config: ImageGenerationConfig = {
        model: 'doubao-seedream-4-5-251128',
        prompt: 'Create a variation of the provided image',
        size: '2K',
        ...variations
      };

      const task = await this.generateImage(config);
      task.priority = 'low';
      tasks.push(task);
    }

    return tasks;
  }

  /**
   * 智能优化提示词
   */
  public async optimizePrompt(originalPrompt: string): Promise<{
    optimizedPrompt: string;
    suggestions: string[];
    improvements: string[];
  }> {
    try {
      // 这里可以调用AI模型来优化提示词
      // 简化实现，返回基于规则的优化
      const improvements = [];
      let optimizedPrompt = originalPrompt;

      // 检查提示词长度
      if (optimizedPrompt.length < 20) {
        improvements.push('提示词过短，建议添加更多细节描述');
        optimizedPrompt += ', high quality, detailed';
      }

      // 检查是否包含质量相关关键词
      if (!optimizedPrompt.includes('quality') && !optimizedPrompt.includes('detailed')) {
        improvements.push('建议添加质量描述词');
        optimizedPrompt += ', high quality';
      }

      // 检查是否包含风格描述
      if (!optimizedPrompt.includes('style') && !optimizedPrompt.includes('art')) {
        improvements.push('建议添加艺术风格描述');
      }

      const suggestions = [
        '添加光线描述: natural lighting, dramatic lighting',
        '添加构图描述: centered, close-up, wide angle',
        '添加情感描述: peaceful, energetic, mysterious'
      ];

      return {
        optimizedPrompt,
        suggestions,
        improvements
      };
    } catch (error) {
      return {
        optimizedPrompt: originalPrompt,
        suggestions: [],
        improvements: []
      };
    }
  }

  /**
   * 取消任务
   */
  public async cancelTask(taskId: string): Promise<boolean> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      return false;
    }

    if (task.status === 'pending') {
      // 从队列中移除
      const index = this.taskQueue.findIndex(t => t.id === taskId);
      if (index !== -1) {
        this.taskQueue.splice(index, 1);
      }
    }

    task.status = 'cancelled';
    this.emit('taskCancelled', task);
    return true;
  }

  /**
   * 获取任务状态
   */
  public getTask(taskId: string): GenerationTask | undefined {
    return this.activeTasks.get(taskId);
  }

  /**
   * 获取所有活动任务
   */
  public getActiveTasks(): GenerationTask[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * 获取历史记录
   */
  public getHistory(limit?: number): ImageGenerationHistory[] {
    if (limit) {
      return this.generationHistory.slice(-limit);
    }
    return [...this.generationHistory];
  }

  /**
   * 保存图片到本地
   */
  public async saveImage(taskId: string, filename?: string): Promise<string> {
    const task = this.activeTasks.get(taskId);
    if (!task || !task.result) {
      throw new Error('Task not found or not completed');
    }

    const savePath = join(
      this.outputDir,
      filename || `${taskId}_${Date.now()}.png`
    );

    if (task.result.base64) {
      const buffer = Buffer.from(task.result.base64, 'base64');
      await writeFileAsync(savePath, buffer);
    } else if (task.result.url) {
      const response = await axios.get(task.result.url, { responseType: 'arraybuffer' });
      await writeFileAsync(savePath, response.data);
    }

    // 更新历史记录
    const historyEntry = this.generationHistory.find(h => h.task.id === taskId);
    if (historyEntry) {
      historyEntry.savedTo.push(savePath);
    }

    this.emit('imageSaved', { taskId, savePath });
    return savePath;
  }

  /**
   * 删除历史记录
   */
  public async deleteHistory(historyId: string): Promise<boolean> {
    const index = this.generationHistory.findIndex(h => h.id === historyId);
    if (index === -1) {
      return false;
    }

    const history = this.generationHistory[index];
    
    // 删除本地文件
    for (const filePath of history.savedTo) {
      try {
        await require('fs').promises.unlink(filePath);
      } catch (error) {
        console.error('Failed to delete file:', filePath, error);
      }
    }

    this.generationHistory.splice(index, 1);
    this.saveHistory();
    this.emit('historyDeleted', historyId);
    return true;
  }

  /**
   * 收藏/取消收藏
   */
  public toggleFavorite(historyId: string): boolean {
    const history = this.generationHistory.find(h => h.id === historyId);
    if (!history) {
      return false;
    }

    history.favorited = !history.favorited;
    this.saveHistory();
    this.emit('favoriteToggled', { historyId, favorited: history.favorited });
    return true;
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    totalGenerated: number;
    thisMonth: number;
    thisWeek: number;
    totalCost: number;
    averageTime: number;
    successRate: number;
  } {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisWeek = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));

    const completedTasks = Array.from(this.activeTasks.values()).filter(t => t.status === 'completed');
    
    const stats = {
      totalGenerated: completedTasks.length,
      thisMonth: completedTasks.filter(t => t.completedAt && t.completedAt >= thisMonth).length,
      thisWeek: completedTasks.filter(t => t.completedAt && t.completedAt >= thisWeek).length,
      totalCost: completedTasks.reduce((sum, t) => sum + (t.result?.metadata.cost || 0), 0),
      averageTime: 0,
      successRate: 0
    };

    if (completedTasks.length > 0) {
      const totalTime = completedTasks.reduce((sum, t) => {
        if (t.startedAt && t.completedAt) {
          return sum + (t.completedAt.getTime() - t.startedAt.getTime());
        }
        return sum;
      }, 0);
      stats.averageTime = totalTime / completedTasks.length;
      stats.successRate = (completedTasks.length / Array.from(this.activeTasks.values()).length) * 100;
    }

    return stats;
  }

  // 私有方法

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      const currentTasks = this.getCurrentProcessingTasks();
      
      if (currentTasks.length >= this.maxConcurrentTasks) {
        break;
      }

      const task = this.taskQueue.shift();
      if (!task) {
        break;
      }

      this.processTask(task).catch(console.error);
      
      // 小延迟避免过快处理
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  private getCurrentProcessingTasks(): GenerationTask[] {
    return Array.from(this.activeTasks.values()).filter(t => 
      t.status === 'processing'
    );
  }

  private async processTask(task: GenerationTask): Promise<void> {
    try {
      task.status = 'processing';
      task.startedAt = new Date();
      task.progress = 0;
      this.emit('taskStarted', task);

      // 更新进度
      const progressInterval = setInterval(() => {
        if (task.status === 'processing' && task.progress < 90) {
          task.progress = Math.min(task.progress + 5, 90);
          this.emit('taskProgress', task);
        }
      }, 1000);

      const result = await this.callImageGenerationAPI(task.config);
      
      clearInterval(progressInterval);
      
      task.result = result;
      task.status = 'completed';
      task.completedAt = new Date();
      task.progress = 100;

      // 添加到历史记录
      const history: ImageGenerationHistory = {
        id: this.generateHistoryId(),
        task,
        savedTo: [],
        tags: this.extractTagsFromPrompt(task.config.prompt),
        favorited: false
      };

      this.generationHistory.push(history);
      this.saveHistory();

      this.emit('taskCompleted', task);

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = new Date();
      
      this.emit('taskFailed', task);
    }
  }

  private async callImageGenerationAPI(config: ImageGenerationConfig): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    const requestBody = {
      model: config.model,
      prompt: config.prompt,
      response_format: config.responseFormat || 'url',
      size: config.size || '2K',
      stream: config.stream || false,
      watermark: config.watermark !== false,
      ...(config.negativePrompt && { negative_prompt: config.negativePrompt }),
      ...(config.style && { style: config.style }),
      ...(config.seed && { seed: config.seed }),
      ...(config.steps && { steps: config.steps }),
      ...(config.cfgScale && { cfg_scale: config.cfgScale }),
      ...(config.sampler && { sampler: config.sampler })
    };

    try {
      const response = await axios.post(this.apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 120000 // 2分钟超时
      });

      const generationTime = Date.now() - startTime;
      const data = response.data;

      const result: ImageGenerationResult = {
        url: data.url,
        base64: data.base64,
        metadata: {
          model: config.model,
          prompt: config.prompt,
          size: config.size || '2K',
          generationTime,
          seed: config.seed,
          steps: config.steps,
          cfgScale: config.cfgScale,
          sampler: config.sampler,
          timestamp: new Date(),
          cost: this.calculateCost(config.size || '2K', generationTime)
        }
      };

      // 如果是URL，下载并生成缩略图
      if (result.url) {
        result.thumbnail = await this.generateThumbnail(result.url);
      }

      return result;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Image generation failed: ${message}`);
      }
      throw error;
    }
  }

  private async generateThumbnail(imageUrl: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      // 这里应该生成缩略图，简化实现返回原URL
      return imageUrl;
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      return '';
    }
  }

  private calculateCost(size: string, generationTime: number): number {
    // 简化的成本计算
    const sizeMultiplier = {
      '1K': 1.0,
      '2K': 2.0,
      '4K': 4.0
    }[size] || 1.0;

    const timeMultiplier = generationTime / 30000; // 基于30秒的基准时间
    return (sizeMultiplier * timeMultiplier * 0.1).toFixed(4) as any; // 假设基础费用0.1元
  }

  private estimateGenerationTime(config: ImageGenerationConfig): number {
    const baseTime = 30000; // 30秒基准时间
    const sizeMultiplier = {
      '1K': 0.8,
      '2K': 1.0,
      '4K': 1.5
    }[config.size || '2K'] || 1.0;

    const stepsMultiplier = (config.steps || 20) / 20;
    
    return Math.round(baseTime * sizeMultiplier * stepsMultiplier);
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1分钟窗口
    let requestsInWindow = 0;

    // 清理过期记录
    for (const [timestamp] of this.rateLimiter) {
      if (parseInt(timestamp) < windowStart) {
        this.rateLimiter.delete(timestamp);
      } else {
        requestsInWindow++;
      }
    }

    // 检查是否超过限制（假设每分钟20个请求）
    if (requestsInWindow >= 20) {
      return false;
    }

    // 记录当前请求
    this.rateLimiter.set(now.toString(), 1);
    return true;
  }

  private extractTagsFromPrompt(prompt: string): string[] {
    // 简单的关键词提取
    const keywords = prompt.toLowerCase()
      .split(/[\s,]+/)
      .filter(word => word.length > 2)
      .slice(0, 10);

    // 去重
    return Array.from(new Set(keywords));
  }

  private generateTaskId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private generateHistoryId(): string {
    return 'hist_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }

  private async loadHistory(): Promise<void> {
    try {
      const historyPath = join(this.outputDir, 'history.json');
      const data = await readFileAsync(historyPath, 'utf8');
      this.generationHistory = JSON.parse(data);
    } catch (error) {
      // 文件不存在或格式错误，初始化空数组
      this.generationHistory = [];
    }
  }

  private async saveHistory(): Promise<void> {
    try {
      const historyPath = join(this.outputDir, 'history.json');
      await writeFileAsync(historyPath, JSON.stringify(this.generationHistory, null, 2));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }

  protected initializeSupportedModels(): void {
    // 初始化支持的模型列表
    this.supportedModels.set('doubao-seedream-4-5-251128', {
      name: '豆包绘图模型',
      provider: 'doubao',
      maxResolution: '4K',
      supportsSeed: true,
      supportsSteps: true
    });
  }
}