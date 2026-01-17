import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { zhipuAIService } from '../services/zhipuAIService';
import { logger } from '../utils/logger';

export interface ImageGenerationOptions {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance_scale?: number;
  seed?: number;
  style?: string;
  model?: 'dall-e-3' | 'midjourney' | 'stable-diffusion' | 'doubao-image';
  quality?: 'standard' | 'hd';
  n?: number;
}

export interface ImageGenerationResult {
  id: string;
  url: string;
  revised_prompt?: string;
  model: string;
  created: number;
  metadata: {
    width: number;
    height: number;
    steps: number;
    guidance_scale: number;
    seed: number;
    style: string;
  };
  processing_time: number;
  cost_tokens?: number;
}

export interface SpeechSynthesisOptions {
  text: string;
  voice?: string;
  model?: string;
  speed?: number;
  pitch?: number;
  format?: 'mp3' | 'wav' | 'ogg';
  language?: string;
  provider?: 'openai' | 'zhipu' | 'doubao' | 'azure';
}

export interface SpeechSynthesisResult {
  id: string;
  audio_url: string;
  audio_path: string;
  duration: number;
  model: string;
  voice: string;
  language: string;
  created: number;
}

export interface VideoGenerationOptions {
  prompt: string;
  duration?: number;
  fps?: number;
  resolution?: string;
  model?: 'sora' | 'runway' | 'pika';
  style?: string;
  seed?: number;
}

export interface VideoGenerationResult {
  id: string;
  video_url: string;
  video_path: string;
  duration: number;
  fps: number;
  resolution: string;
  model: string;
  created: number;
  processing_time: number;
}

export interface MultiModalProcessingOptions {
  image?: string;
  text?: string;
  audio?: string;
  task: 'image-description' | 'image-editing' | 'audio-transcription' | 'multimodal-understanding';
  model?: string;
}

export interface MultiModalProcessingResult {
  id: string;
  task: string;
  result: any;
  model: string;
  created: number;
  processing_time: number;
}

class AdvancedAIService {
  private apiKey: string;
  private apiBase: string;
  private outputDir: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    this.outputDir = path.join(process.cwd(), 'uploads', 'generated');
    this.ensureOutputDir();
  }

  private async ensureOutputDir(): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      logger.warn('创建输出目录失败:', error);
    }
  }

  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      logger.info('生成图片:', { prompt: options.prompt, model: options.model });

      // 使用智谱AI生成图片
      const result = await zhipuAIService.generateImage(options.prompt, {
        width: options.width || 1024,
        height: options.height || 1024,
        model: options.model || 'dall-e-3'
      });

      const processingTime = Date.now() - startTime;

      return {
        id: uuidv4(),
        url: result.url,
        revised_prompt: result.revised_prompt,
        model: options.model || 'dall-e-3',
        created: Date.now(),
        metadata: {
          width: options.width || 1024,
          height: options.height || 1024,
          steps: options.steps || 50,
          guidance_scale: options.guidance_scale || 7.5,
          seed: options.seed || Math.floor(Math.random() * 1000000),
          style: options.style || 'default'
        },
        processing_time: processingTime,
        cost_tokens: result.cost_tokens
      };
    } catch (error) {
      logger.error('生成图片失败:', error);
      throw new Error(`图片生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async synthesizeSpeech(options: SpeechSynthesisOptions): Promise<SpeechSynthesisResult> {
    const startTime = Date.now();

    try {
      logger.info('合成语音:', { text: options.text.substring(0, 50), provider: options.provider });

      // 使用智谱AI合成语音
      const result = await zhipuAIService.synthesizeSpeech(options.text, {
        voice: options.voice || 'zh-female-1',
        speed: options.speed || 1.0,
        format: options.format || 'mp3'
      });

      const processingTime = Date.now() - startTime;

      return {
        id: uuidv4(),
        audio_url: result.url,
        audio_path: result.path || '',
        duration: result.duration || 0,
        model: options.model || 'tts-1',
        voice: options.voice || 'zh-female-1',
        language: options.language || 'zh-CN',
        created: Date.now()
      };
    } catch (error) {
      logger.error('合成语音失败:', error);
      throw new Error(`语音合成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async processMultiModal(options: MultiModalProcessingOptions): Promise<MultiModalProcessingResult> {
    const startTime = Date.now();

    try {
      logger.info('多模态处理:', { task: options.task });

      let result: any;

      switch (options.task) {
        case 'image-description':
          result = await zhipuAIService.analyzeImage(options.image || '', options.text || '');
          break;
        case 'audio-transcription':
          result = await zhipuAIService.transcribeAudio(options.audio || '');
          break;
        case 'multimodal-understanding':
          result = await zhipuAIService.processMultiModal([
            options.image,
            options.text,
            options.audio
          ].filter(Boolean));
          break;
        default:
          throw new Error(`不支持的任务类型: ${options.task}`);
      }

      const processingTime = Date.now() - startTime;

      return {
        id: uuidv4(),
        task: options.task,
        result,
        model: options.model || 'glm-4v-plus',
        created: Date.now(),
        processing_time: processingTime
      };
    } catch (error) {
      logger.error('多模态处理失败:', error);
      throw new Error(`多模态处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async generateVideo(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
    const startTime = Date.now();

    try {
      logger.info('生成视频:', { prompt: options.prompt.substring(0, 50) });

      // 使用智谱AI生成视频
      const result = await zhipuAIService.generateVideo(options.prompt, {
        duration: options.duration || 5,
        resolution: options.resolution || '1080p'
      });

      const processingTime = Date.now() - startTime;

      return {
        id: uuidv4(),
        video_url: result.url,
        video_path: result.path || '',
        duration: options.duration || 5,
        fps: options.fps || 30,
        resolution: options.resolution || '1080p',
        model: options.model || 'sora',
        created: Date.now(),
        processing_time: processingTime
      };
    } catch (error) {
      logger.error('生成视频失败:', error);
      throw new Error(`视频生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async batchGenerateImages(optionsList: ImageGenerationOptions[]): Promise<ImageGenerationResult[]> {
    const results: ImageGenerationResult[] = [];

    for (const options of optionsList) {
      try {
        const result = await this.generateImage(options);
        results.push(result);
      } catch (error) {
        logger.error('批量生成图片失败:', error);
        results.push({
          id: uuidv4(),
          url: '',
          model: options.model || 'dall-e-3',
          created: Date.now(),
          metadata: {
            width: options.width || 1024,
            height: options.height || 1024,
            steps: options.steps || 50,
            guidance_scale: options.guidance_scale || 7.5,
            seed: options.seed || Math.floor(Math.random() * 1000000),
            style: options.style || 'default'
          },
          processing_time: 0
        });
      }
    }

    return results;
  }
}

export default new AdvancedAIService();
