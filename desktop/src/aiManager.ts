/**
 * AI功能管理器
 * 管理本地AI模型、语音识别、图像处理等功能
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as sharp from 'sharp';

const execAsync = promisify(exec);

export interface AIModel {
  id: string;
  name: string;
  type: 'whisper' | 'image' | 'text' | 'custom';
  version: string;
  size: number;
  path: string;
  isDownloaded: boolean;
  isLocal: boolean;
  description?: string;
}

export interface SpeechRecognitionOptions {
  language?: string;
  model?: string;
  enhance?: boolean;
  punctuation?: boolean;
  timestamps?: boolean;
}

export interface ImageProcessingOptions {
  format?: string;
  quality?: number;
  resize?: { width: number; height: number };
  enhance?: boolean;
}

export class AIManager {
  private static instance: AIManager;
  private models: Map<string, AIModel> = new Map();
  private modelPath: string;

  constructor() {
    this.modelPath = path.join((global as any).app?.getPath('userData') || './', 'models');
    this.ensureModelDirectory();
    this.initializeModels();
  }

  public static getInstance(): AIManager {
    if (!AIManager.instance) {
      AIManager.instance = new AIManager();
    }
    return AIManager.instance;
  }

  /**
   * 确保模型目录存在
   */
  private ensureModelDirectory(): void {
    if (!fs.existsSync(this.modelPath)) {
      fs.mkdirSync(this.modelPath, { recursive: true });
    }
  }

  /**
   * 初始化模型信息
   */
  private async initializeModels(): Promise<void> {
    // Whisper模型
    const whisperModels: AIModel[] = [
      {
        id: 'whisper-tiny',
        name: 'Whisper Tiny',
        type: 'whisper',
        version: '1.0',
        size: 39 * 1024 * 1024, // ~39MB
        path: path.join(this.modelPath, 'ggml-tiny.bin'),
        isDownloaded: false,
        isLocal: false,
        description: '最快的Whisper模型，精度较低'
      },
      {
        id: 'whisper-base',
        name: 'Whisper Base',
        type: 'whisper',
        version: '1.0',
        size: 74 * 1024 * 1024, // ~74MB
        path: path.join(this.modelPath, 'ggml-base.bin'),
        isDownloaded: false,
        isLocal: false,
        description: '平衡的速度和精度'
      },
      {
        id: 'whisper-small',
        name: 'Whisper Small',
        type: 'whisper',
        version: '1.0',
        size: 244 * 1024 * 1024, // ~244MB
        path: path.join(this.modelPath, 'ggml-small.bin'),
        isDownloaded: false,
        isLocal: false,
        description: '较高的精度，速度较慢'
      }
    ];

    // 检查模型是否已下载
    for (const model of whisperModels) {
      model.isDownloaded = fs.existsSync(model.path);
      this.models.set(model.id, model);
    }
  }

  /**
   * 列出所有模型
   */
  public listModels(): AIModel[] {
    return Array.from(this.models.values());
  }

  /**
   * 检查Whisper是否已安装
   */
  public async isWhisperInstalled(): Promise<{
    installed: boolean;
    command?: string;
    error?: string;
  }> {
    try {
      // 检查whisper.cpp
      try {
        await execAsync('which whisper');
        return { installed: true, command: 'whisper' };
      } catch {}

      // 检查Python whisper
      try {
        await execAsync('python -c "import whisper; print(\'whisper available\')"');
        return { installed: true, command: 'python -m whisper' };
      } catch {}

      return { installed: false, error: 'Whisper未安装' };
    } catch (error) {
      return { installed: false, error: error.message };
    }
  }

  /**
   * 语音识别
   */
  public async recognizeSpeech(
    audioData: ArrayBuffer, 
    options: SpeechRecognitionOptions = {}
  ): Promise<{
    success: boolean;
    text?: string;
    confidence?: number;
    duration?: number;
    error?: string;
  }> {
    try {
      const whisperStatus = await this.isWhisperInstalled();
      if (!whisperStatus.installed) {
        return { success: false, error: 'Whisper未安装，请先安装Whisper' };
      }

      // 保存音频到临时文件
      const tempDir = path.join((global as any).app?.getPath('userData') || './', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempAudioPath = path.join(tempDir, `speech_${Date.now()}.wav`);
      fs.writeFileSync(tempAudioPath, Buffer.from(audioData));

      try {
        const model = options.model || 'base';
        const language = options.language || 'auto';
        
        // 构建命令
        let command = '';
        if (whisperStatus.command?.includes('python')) {
          command = `python -m whisper "${tempAudioPath}" --model ${model} --language ${language} --output_format json`;
        } else {
          command = `whisper "${tempAudioPath}" --model ${model} --language ${language} --output_format json`;
        }

        const { stdout, stderr } = await execAsync(command);
        
        // 解析结果
        let result: any = {};
        try {
          result = JSON.parse(stdout);
        } catch {
          // 如果JSON解析失败，使用原始输出
          result = { text: stdout.trim() };
        }

        return {
          success: true,
          text: result.text || stdout.trim(),
          confidence: result.confidence || 0.9,
          duration: result.duration || 0
        };
      } finally {
        // 清理临时文件
        try {
          fs.unlinkSync(tempAudioPath);
        } catch {}
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 图像处理
   */
  public async processImage(
    imageData: ArrayBuffer, 
    options: ImageProcessingOptions = {}
  ): Promise<{
    success: boolean;
    data?: ArrayBuffer;
    metadata?: any;
    error?: string;
  }> {
    try {
      const buffer = Buffer.from(imageData);
      const sharpInstance = sharp.default || sharp;
      let image = (sharpInstance as any)(buffer);

      // 应用调整大小
      if (options.resize) {
        image = image.resize(options.resize.width, options.resize.height, {
          fit: 'cover',
          position: 'center'
        });
      }

      // 应用增强
      if (options.enhance) {
        image = image.sharpen().contrast(1.1);
      }

      // 设置输出格式
      const format = options.format || 'png';
      const quality = options.quality || 90;

      let processedBuffer: Buffer;
      if (format === 'jpg' || format === 'jpeg') {
        processedBuffer = await image.jpeg({ quality }).toBuffer();
      } else if (format === 'webp') {
        processedBuffer = await image.webp({ quality }).toBuffer();
      } else {
        processedBuffer = await image.png().toBuffer();
      }

      // 获取元数据
      const metadata = await (sharpInstance as any)(processedBuffer).metadata();

      return {
        success: true,
        data: processedBuffer.buffer.slice(processedBuffer.byteOffset, processedBuffer.byteOffset + processedBuffer.byteLength) as ArrayBuffer,
        metadata
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 调整图像大小
   */
  public async resizeImage(
    imageData: ArrayBuffer, 
    width: number, 
    height: number
  ): Promise<ArrayBuffer> {
    const result = await this.processImage(imageData, {
      resize: { width, height }
    });

    if (result.success && result.data) {
      return result.data;
    }
    
    throw new Error(result.error || '图像调整失败');
  }

  /**
   * 下载模型
   */
  public async downloadModel(modelId: string): Promise<{
    success: boolean;
    error?: string;
    progress?: number;
  }> {
    try {
      const model = this.models.get(modelId);
      if (!model) {
        return { success: false, error: '模型不存在' };
      }

      if (model.isDownloaded) {
        return { success: true, error: '模型已下载' };
      }

      // TODO: 实现实际的模型下载逻辑
      // 这里可以使用fetch或axios下载模型文件
      // 并提供进度回调

      // 模拟下载过程
      console.log(`开始下载模型: ${model.name}`);
      
      // 创建一个简单的下载模拟
      const modelUrl = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${modelId.split('-')[1]}.bin`;
      
      // 实际实现中应该使用fetch下载
      console.log(`下载地址: ${modelUrl}`);

      return { success: false, error: '模型下载功能尚未实现' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 删除模型
   */
  public deleteModel(modelId: string): { success: boolean; error?: string } {
    try {
      const model = this.models.get(modelId);
      if (!model) {
        return { success: false, error: '模型不存在' };
      }

      if (model.isDownloaded) {
        fs.unlinkSync(model.path);
        model.isDownloaded = false;
        this.models.set(modelId, model);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取模型路径
   */
  public getModelPath(modelId: string): string | null {
    const model = this.models.get(modelId);
    return model?.path || null;
  }

  /**
   * 检查模型是否可用
   */
  public isModelAvailable(modelId: string): boolean {
    const model = this.models.get(modelId);
    return model?.isDownloaded || false;
  }

  /**
   * 获取模型统计信息
   */
  public getModelStats(): {
    total: number;
    downloaded: number;
    totalSize: number;
    downloadedSize: number;
  } {
    const models = Array.from(this.models.values());
    const downloadedModels = models.filter(m => m.isDownloaded);
    
    return {
      total: models.length,
      downloaded: downloadedModels.length,
      totalSize: models.reduce((sum, m) => sum + m.size, 0),
      downloadedSize: downloadedModels.reduce((sum, m) => sum + m.size, 0)
    };
  }
}

// 导出单例实例
export const aiManager = AIManager.getInstance();