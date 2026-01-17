import { ImageGenerationService, ImageGenerationConfig, GenerationTask, ImageGenerationResult } from './imageGenerationService';
import { EventEmitter } from 'events';
import axios from 'axios';
import { join } from 'path';

export interface AdvancedImageConfig extends ImageGenerationConfig {
  presetId?: string; // Style preset ID
  style?: 'photorealistic' | 'anime' | 'oil_painting' | 'watercolor' | 'cartoon' | 'cyberpunk';
  lighting?: 'soft' | 'dramatic' | 'studio' | 'natural';
  composition?: 'close_up' | 'wide_shot' | 'portrait' | 'landscape';
  colorScheme?: 'monochrome' | 'sepia' | 'vibrant' | 'pastel' | 'dramatic';
  quality?: 'draft' | 'standard' | 'high' | 'ultra';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:2';
  // Optional properties for img2img
  variationStrength?: number; // 0-1
  enableFacePreservation?: boolean;
  enableBackgroundRemoval?: boolean;
}

export interface ImageEnhancement {
  id: string;
  type: 'upscale' | 'denoise' | 'sharpen' | 'color_correct' | 'style_transfer';
  strength: number; // 0-1
  settings?: Record<string, any>;
}

export interface BatchGenerationConfig {
  baseConfig: AdvancedImageConfig;
  variations: number;
  inputImage?: string; // base64 or URL
  variationStrength?: number; // 0-1
  enableFacePreservation?: boolean;
  enableBackgroundRemoval?: boolean;
}

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  config: Partial<AdvancedImageConfig>;
  thumbnail?: string;
  category: 'professional' | 'artistic' | 'technical';
}

export class ImageGenerationServiceExtended extends ImageGenerationService {
  private stylePresets: Map<string, StylePreset> = new Map();
  private enhancementQueue: ImageEnhancement[] = [];
  private maxBatchSize: number = 10;

  constructor(apiKey: string) {
    super(apiKey);
    this.loadStylePresets();
    this.setupBatchProcessing();
  }

  /**
   * 初始化支持的模型配置
   */
  protected initializeSupportedModels(): void {
    super.initializeSupportedModels();
    this.supportedModels.set('dall-e-3', {
      name: 'DALL-E 3',
      capabilities: ['text_to_image', 'image_variation', 'edit'],
      maxResolution: '1024x1024',
      supportedStyles: ['photorealistic', 'artistic'],
      pricing: { standard: 0.04, hd: 0.08 }
    });

    this.supportedModels.set('stable-diffusion-xl', {
      name: 'Stable Diffusion XL',
      capabilities: ['text_to_image', 'img2img', 'controlnet'],
      maxResolution: '1024x1024',
      supportedStyles: ['photorealistic', 'anime', 'oil_painting', 'watercolor'],
      pricing: { standard: 0.02 }
    });

    this.supportedModels.set('midjourney-v6', {
      name: 'Midjourney V6',
      capabilities: ['text_to_image', 'upscale', 'variation'],
      maxResolution: '2048x2048',
      supportedStyles: ['photorealistic', 'artistic', 'cyberpunk', 'cartoon'],
      pricing: { standard: 0.03, fast: 0.06 }
    });
  }

  /**
   * 加载样式预设
   */
  private loadStylePresets(): void {
    const presets: StylePreset[] = [
      {
        id: 'professional-headshot',
        name: '专业头像',
        description: '适合简历和社交媒体的专业头像',
        category: 'professional',
        config: {
          style: 'photorealistic',
          lighting: 'studio',
          composition: 'portrait',
          quality: 'high',
          aspectRatio: '1:1',
          steps: 30,
          cfgScale: 7
        }
      },
      {
        id: 'product-photography',
        name: '产品摄影',
        description: '商业产品展示风格',
        category: 'professional',
        config: {
          style: 'photorealistic',
          lighting: 'studio',
          composition: 'close_up',
          quality: 'ultra',
          aspectRatio: '4:3'
        }
      },
      {
        id: 'anime-style',
        name: '动漫风格',
        description: '日本动漫艺术风格',
        category: 'artistic',
        config: {
          style: 'anime',
          colorScheme: 'vibrant',
          quality: 'high',
          aspectRatio: '9:16'
        }
      },
      {
        id: 'oil-painting',
        name: '油画风格',
        description: '经典油画艺术风格',
        category: 'artistic',
        config: {
          style: 'oil_painting',
          colorScheme: 'sepia',
          quality: 'high',
          steps: 40
        }
      },
      {
        id: 'cyberpunk-2077',
        name: '赛博朋克2077',
        description: '未来主义赛博朋克风格',
        category: 'artistic',
        config: {
          style: 'cyberpunk',
          colorScheme: 'dramatic',
          lighting: 'dramatic',
          quality: 'ultra'
        }
      }
    ];

    presets.forEach(preset => {
      this.stylePresets.set(preset.id, preset);
    });
  }

  /**
   * 高级图像生成
   */
  async generateAdvancedImage(config: AdvancedImageConfig): Promise<GenerationTask> {
    try {
      // 应用样式预设
      const enhancedConfig = this.applyStylePreset(config);
      
      // 验证配置
      this.validateAdvancedConfig(enhancedConfig);
      
      // 创建任务
      const task: GenerationTask = {
        id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        config: enhancedConfig,
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        priority: this.calculatePriority(enhancedConfig)
      };

      // 添加到队列
      this.activeTasks.set(task.id, task);
      
      // 开始处理
      if (!this.isProcessing) {
        this.processAdvancedQueue();
      }
      
      console.log(`🎨 高级图像生成任务创建: ${task.id}`);
      this.emit('task-created', task);
      
      return task;
    } catch (error) {
      console.error('高级图像生成失败:', error);
      throw error;
    }
  }

  /**
   * 批量生成
   */
  async generateAdvancedBatch(config: BatchGenerationConfig): Promise<GenerationTask[]> {
    try {
      if (config.variations > this.maxBatchSize) {
        throw new Error(`批量生成数量不能超过${this.maxBatchSize}`);
      }

      const tasks: GenerationTask[] = [];
      
      for (let i = 0; i < config.variations; i++) {
        const variationConfig: AdvancedImageConfig = {
          ...config.baseConfig,
          seed: config.baseConfig.seed ? config.baseConfig.seed + i : undefined,
          // 如果有输入图片，使用img2img模式
          ...(config.inputImage && { inputImage: config.inputImage })
        };

        const task = await this.generateAdvancedImage(variationConfig);
        tasks.push(task);
      }

      console.log(`🎨 批量图像生成: ${tasks.length}个任务`);
      this.emit('batch-task-created', { config, tasks });
      
      return tasks;
    } catch (error) {
      console.error('批量生成失败:', error);
      throw error;
    }
  }

  /**
   * 图像增强
   */
  async enhanceImage(imageUrl: string, enhancements: ImageEnhancement[]): Promise<GenerationTask> {
    try {
      const enhancementConfig: AdvancedImageConfig = {
        prompt: '', // Enhance image without prompt
        inputImage: imageUrl,
        model: 'stable-diffusion-xl',
        style: 'photorealistic',
        quality: 'high'
      };

      // 应用增强设置
      const combinedSettings = enhancements.reduce((acc, enh) => ({
        ...acc,
        [enh.type]: {
          strength: enh.strength,
          ...enh.settings
        }
      }), {});

      const task: GenerationTask = {
        id: `enhance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        config: {
          ...enhancementConfig,
          enhancements: combinedSettings
        },
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        priority: 'high'
      };

      this.activeTasks.set(task.id, task);
      this.enhancementQueue.push(...enhancements);
      
      if (!this.isProcessing) {
        this.processAdvancedQueue();
      }
      
      console.log(`🔧 图像增强任务创建: ${task.id}`);
      this.emit('enhancement-task-created', task);
      
      return task;
    } catch (error) {
      console.error('图像增强失败:', error);
      throw error;
    }
  }

  /**
   * 应用样式预设
   */
  private applyStylePreset(config: AdvancedImageConfig): AdvancedImageConfig {
    // 如果config中有presetId，应用预设配置
    if (config.presetId && this.stylePresets.has(config.presetId)) {
      const preset = this.stylePresets.get(config.presetId);
      return {
        ...config,
        ...preset.config
      };
    }
    return config;
  }

  /**
   * 验证高级配置
   */
  private validateAdvancedConfig(config: AdvancedImageConfig): void {
    if (!config.prompt || config.prompt.trim().length === 0) {
      throw new Error('提示词不能为空');
    }

    if (config.prompt.length > 1000) {
      throw new Error('提示词过长，最多1000字符');
    }

    if (config.steps && (config.steps < 1 || config.steps > 100)) {
      throw new Error('步数必须在1-100之间');
    }

    if (config.cfgScale && (config.cfgScale < 1 || config.cfgScale > 20)) {
      throw new Error('CFG Scale必须在1-20之间');
    }

    // 验证模型支持的功能
    const model = this.supportedModels.get(config.model);
    if (!model) {
      throw new Error(`不支持的模型: ${config.model}`);
    }

    if (config.style && !model.supportedStyles.includes(config.style)) {
      throw new Error(`模型${config.model}不支持风格: ${config.style}`);
    }
  }

  /**
   * 计算任务优先级
   */
  private calculatePriority(config: AdvancedImageConfig): 'low' | 'normal' | 'high' {
    let score = 0;
    
    // 高质量设置提高优先级
    if (config.quality === 'ultra') score += 3;
    else if (config.quality === 'high') score += 2;
    else if (config.quality === 'standard') score += 1;
    
    // 复杂提示词提高优先级
    if (config.prompt.length > 500) score += 2;
    else if (config.prompt.length > 100) score += 1;
    
    // 输入图片提高优先级
    if (config.inputImage) score += 2;
    
    // 高分辨率提高优先级
    if (config.size === '4K') score += 2;
    else if (config.size === '2K') score += 1;
    
    if (score >= 5) return 'high';
    if (score >= 3) return 'normal';
    return 'low';
  }

  /**
   * 处理高级队列
   */
  private async processAdvancedQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('🔄 开始处理高级图像生成队列');

    try {
      // 获取待处理任务
      const pendingTasks = Array.from(this.activeTasks.values())
        .filter(task => task.status === 'pending')
        .sort((a, b) => {
          // 优先级排序
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

      // 处理任务
      const processingTasks = pendingTasks.slice(0, this.maxConcurrentTasks);
      
      for (const task of processingTasks) {
        try {
          await this.processAdvancedTask(task);
        } catch (error) {
          console.error(`任务处理失败 ${task.id}:`, error);
          task.status = 'failed';
          task.error = error.message;
          task.completedAt = new Date();
          this.emit('task-failed', task);
        }
      }

      // 继续处理剩余任务
      const remainingTasks = Array.from(this.activeTasks.values())
        .filter(task => task.status === 'pending');
      
      if (remainingTasks.length > 0) {
        setTimeout(() => this.processAdvancedQueue(), 1000);
      } else {
        this.isProcessing = false;
        console.log('✅ 高级图像生成队列处理完成');
      }
      
    } catch (error) {
      console.error('队列处理失败:', error);
      this.isProcessing = false;
    }
  }

  /**
   * 处理高级任务
   */
  private async processAdvancedTask(task: GenerationTask): Promise<void> {
    task.status = 'processing';
    task.startedAt = new Date();
    this.emit('task-started', task);

    try {
      let result: ImageGenerationResult;

      if ((task.config as AdvancedImageConfig).inputImage) {
        // img2img 或 图像编辑
        result = await this.processImageToImage(task);
      } else {
        // text to image
        result = await this.processAdvancedTextToImage(task.config as AdvancedImageConfig);
      }

      task.status = 'completed';
      task.result = result;
      task.completedAt = new Date();
      task.progress = 100;
      
      this.emit('task-completed', task);
      
    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = new Date();
      
      this.emit('task-failed', task);
      throw error;
    }
  }

  /**
   * 高级文本到图像处理
   */
  private async processAdvancedTextToImage(config: AdvancedImageConfig): Promise<ImageGenerationResult> {
    const startTime = Date.now();
    const requestBody = {
      model: config.model,
      prompt: config.prompt,
      negative_prompt: config.negativePrompt,
      size: this.mapSize(config.size),
      quality: config.quality,
      steps: config.steps || 30,
      cfg_scale: config.cfgScale || 7,
      style: config.style,
      lighting: config.lighting,
      composition: config.composition,
      color_scheme: config.colorScheme,
      aspect_ratio: config.aspectRatio,
      response_format: config.responseFormat || 'url',
      watermark: config.watermark || false
    };

    const response = await axios.post(this.apiUrl, requestBody, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 180000 // 3分钟超时
    });

    const generationTime = Date.now() - startTime;
    
    return {
      url: response.data.image_url,
      metadata: {
        model: config.model,
        prompt: config.prompt,
        size: config.size,
        generationTime,
        seed: response.data.seed,
        steps: config.steps,
        cfgScale: config.cfgScale,
        sampler: config.sampler,
        timestamp: new Date(),
        cost: this.calculateAdvancedCost(config.model, config.quality)
      }
    };
  }

  /**
   * 图像到图像处理
   */
  private async processImageToImage(task: GenerationTask): Promise<ImageGenerationResult> {
    const config = task.config as AdvancedImageConfig;
    const requestBody = {
      model: config.model,
      input_image: config.inputImage,
      prompt: config.prompt,
      negative_prompt: config.negativePrompt,
      size: this.mapSize(config.size),
      strength: config.variationStrength || 0.7,
      quality: config.quality,
      steps: config.steps || 20,
      cfg_scale: config.cfgScale || 7,
      response_format: config.responseFormat || 'url',
      face_preservation: config.enableFacePreservation || false,
      background_removal: config.enableBackgroundRemoval || false
    };

    const response = await axios.post(`${this.apiUrl}/edit`, requestBody, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 180000
    });

    const generationTime = Date.now() - task.startedAt.getTime();

    return {
      url: response.data.image_url,
      base64: response.data.base64,
      metadata: {
        model: config.model,
        prompt: config.prompt,
        size: config.size,
        generationTime,
        timestamp: new Date(),
        cost: this.calculateAdvancedCost(config.model, config.quality),
        steps: config.steps || 20,
        cfgScale: config.cfgScale || 7
      }
    };
  }

  /**
   * 映射尺寸
   */
  private mapSize(size?: string): string {
    const sizeMap = {
      '1K': '1024x1024',
      '2K': '1536x1536',
      '4K': '2048x2048'
    };
    return sizeMap[size as keyof typeof sizeMap] || '1024x1024';
  }

  /**
   * 计算费用
   */
  private calculateAdvancedCost(model: string, quality?: string): number {
    const modelInfo = this.supportedModels.get(model);
    if (!modelInfo) return 0;
    
    const qualityMultiplier = quality === 'ultra' ? 2 : quality === 'hd' ? 1.5 : 1;
    return modelInfo.pricing.standard * qualityMultiplier;
  }

  /**
   * 获取支持的样式预设
   */
  getStylePresets(category?: 'professional' | 'artistic' | 'technical'): StylePreset[] {
    const presets = Array.from(this.stylePresets.values());
    if (category) {
      return presets.filter(preset => preset.category === category);
    }
    return presets;
  }

  /**
   * 获取预设详情
   */
  getStylePreset(presetId: string): StylePreset | undefined {
    return this.stylePresets.get(presetId);
  }

  /**
   * 创建自定义预设
   */
  createCustomPreset(preset: Omit<StylePreset, 'id'>): string {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const customPreset: StylePreset = {
      ...preset,
      id
    };
    
    this.stylePresets.set(id, customPreset);
    this.saveCustomPresets();
    
    return id;
  }

  /**
   * 保存自定义预设
   */
  private saveCustomPresets(): void {
    const customPresets = Array.from(this.stylePresets.values())
      .filter(preset => preset.id.startsWith('custom_'));
    
    // 这里应该保存到本地存储
    console.log(`保存${customPresets.length}个自定义预设`);
  }

  /**
   * 获取增强选项
   */
  getEnhancementOptions(): Array<{
    type: string;
    name: string;
    description: string;
    maxStrength: number;
  }> {
    return [
      {
        type: 'upscale',
        name: '图像放大',
        description: '提升图像分辨率',
        maxStrength: 1
      },
      {
        type: 'denoise',
        name: '降噪',
        description: '去除图像噪点',
        maxStrength: 1
      },
      {
        type: 'sharpen',
        name: '锐化',
        description: '增强图像清晰度',
        maxStrength: 1
      },
      {
        type: 'color_correct',
        name: '色彩校正',
        description: '自动调整色彩平衡',
        maxStrength: 1
      },
      {
        type: 'style_transfer',
        name: '风格迁移',
        description: '将一种风格应用到图像',
        maxStrength: 1
      }
    ];
  }

  /**
   * 设置批量处理
   */
  private setupBatchProcessing(): void {
    // 定期检查批量任务
    setInterval(() => {
      const batchTasks = Array.from(this.activeTasks.values())
        .filter(task => task.status === 'pending' && task.priority === 'high');
      
      if (batchTasks.length > 0) {
        console.log(`发现${batchTasks.length}个高优先级批量任务`);
      }
    }, 5000);
  }

  /**
   * 获取模型信息
   */
  getModelInfo(modelId: string): any {
    return this.supportedModels.get(modelId);
  }

  /**
   * 获取所有支持的模型
   */
  getSupportedModels(): Array<{
    id: string;
    name: string;
    capabilities: string[];
    maxResolution: string;
    supportedStyles: string[];
    pricing: Record<string, number>;
  }> {
    return Array.from(this.supportedModels.entries()).map(([id, info]) => ({
      id,
      ...info
    }));
  }
}