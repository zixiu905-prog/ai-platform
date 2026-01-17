import { message } from 'antd';
import type { MultiModalData } from '../components/MultiModalInput';
import type { ImageItem } from '../components/ImageUploader';
import type { AudioItem } from '../components/AudioRecorder';
import type { DocumentItem } from '../components/DocumentUploader';

export interface ProcessedInput {
  id: string;
  type: 'text' | 'image' | 'audio' | 'document' | 'mixed';
  data: MultiModalData;
  processedContent?: {
    text?: string;
    images?: ProcessedImage[];
    audio?: ProcessedAudio;
    documents?: ProcessedDocument[];
  };
  metadata: InputMetadata;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  timestamp: number;
}

export interface ProcessedImage {
  id: string;
  url: string;
  name: string;
  size: number;
  format: string;
  dimensions?: { width: number; height: number };
  extractedText?: string;
  features?: ImageFeatures;
  thumbnails?: {
    small: string;
    medium: string;
    large: string;
  };
}

export interface ProcessedAudio {
  id: string;
  url: string;
  name: string;
  size: number;
  format: string;
  duration: number;
  sampleRate?: number;
  channels?: number;
  transcribedText?: string;
  features?: AudioFeatures;
  waveform?: number[];
}

export interface ProcessedDocument {
  id: string;
  url: string;
  name: string;
  size: number;
  format: string;
  pages?: number;
  extractedText?: string;
  metadata?: DocumentMetadata;
  structure?: DocumentStructure;
}

export interface ImageFeatures {
  dominantColors: string[];
  objects?: string[];
  faces?: number;
  tags?: string[];
  categories?: string[];
  description?: string;
  confidence?: number;
}

export interface AudioFeatures {
  speechRatio: number;
  silenceRatio: number;
  energy: number;
  zeroCrossingRate: number;
  spectralCentroid: number;
  spectralRolloff: number;
  mfcc?: number[];
  tempo?: number;
  key?: string;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  keywords?: string[];
  language?: string;
  pageCount?: number;
  wordCount?: number;
}

export interface DocumentStructure {
  headings?: { level: number; text: string }[];
  tables?: { headers: string[]; rows: string[][] }[];
  images?: { alt: string; position: number }[];
  links?: { text: string; url: string }[];
}

export interface InputMetadata {
  totalSize: number;
  itemCount: {
    text: number;
    images: number;
    audio: number;
    documents: number;
  };
  processingTime?: number;
  tokens?: number;
  language?: string;
  confidence?: number;
}

class MultiModalInputService {
  private processingQueue: ProcessedInput[] = [];
  private isProcessing = false;
  private listeners: ((input: ProcessedInput) => void)[] = [];

  /**
   * 添加事件监听器
   */
  addListener(listener: (input: ProcessedInput) => void) {
    this.listeners.push(listener);
  }

  /**
   * 移除事件监听器
   */
  removeListener(listener: (input: ProcessedInput) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(input: ProcessedInput) {
    this.listeners.forEach(listener => listener(input));
  }

  /**
   * 处理多模态输入
   */
  async processInput(data: MultiModalData, options?: {
    enableImageAnalysis?: boolean;
    enableAudioTranscription?: boolean;
    enableDocumentExtraction?: boolean;
    customProcessors?: {
      image?: (file: File) => Promise<ProcessedImage>;
      audio?: (file: File) => Promise<ProcessedAudio>;
      document?: (file: File) => Promise<ProcessedDocument>;
    };
  }): Promise<ProcessedInput> {
    const inputId = `input_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // 创建处理对象
    const processedInput: ProcessedInput = {
      id: inputId,
      type: this.getInputType(data),
      data,
      metadata: {
        totalSize: this.calculateTotalSize(data),
        itemCount: {
          text: data.text ? 1 : 0,
          images: data.images?.length || 0,
          audio: data.audio ? 1 : 0,
          documents: data.documents?.length || 0
        }
      },
      status: 'pending',
      timestamp: data.timestamp
    };

    this.processingQueue.push(processedInput);
    this.notifyListeners(processedInput);

    try {
      // 更新状态为处理中
      processedInput.status = 'processing';
      this.notifyListeners(processedInput);

      // 处理各种类型的内容
      const processedContent = await this.processContent(data, options);
      
      // 更新处理后的内容
      processedInput.processedContent = processedContent;
      
      // 计算处理时间和元数据
      const endTime = Date.now();
      processedInput.metadata.processingTime = endTime - startTime;
      processedInput.metadata.tokens = this.estimateTokens(data, processedContent);
      processedInput.metadata.language = this.detectLanguage(data, processedContent);
      processedInput.metadata.confidence = this.calculateConfidence(data, processedContent);
      
      // 更新状态为完成
      processedInput.status = 'completed';
      this.notifyListeners(processedInput);

      return processedInput;
      
    } catch (error) {
      // 处理错误
      processedInput.status = 'error';
      processedInput.error = error instanceof Error ? error.message : 'Processing failed';
      this.notifyListeners(processedInput);
      
      message.error('输入处理失败: ' + processedInput.error);
      throw error;
    }
  }

  /**
   * 批量处理输入
   */
  async processBatch(inputs: MultiModalData[], options?: {
    enableImageAnalysis?: boolean;
    enableAudioTranscription?: boolean;
    enableDocumentExtraction?: boolean;
    maxConcurrent?: number;
  }): Promise<ProcessedInput[]> {
    const maxConcurrent = options?.maxConcurrent || 3;
    const results: ProcessedInput[] = [];
    
    for (let i = 0; i < inputs.length; i += maxConcurrent) {
      const batch = inputs.slice(i, i + maxConcurrent);
      const batchResults = await Promise.allSettled(
        batch.map(input => this.processInput(input, options))
      );
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Failed to process input ${i + index}:`, result.reason);
        }
      });
    }
    
    return results;
  }

  /**
   * 处理内容
   */
  private async processContent(
    data: MultiModalData, 
    options?: {
      enableImageAnalysis?: boolean;
      enableAudioTranscription?: boolean;
      enableDocumentExtraction?: boolean;
      customProcessors?: {
        image?: (file: File) => Promise<ProcessedImage>;
        audio?: (file: File) => Promise<ProcessedAudio>;
        document?: (file: File) => Promise<ProcessedDocument>;
      };
    }
  ) {
    const processedContent: any = {
      text: data.text
    };

    // 处理图片
    if (data.images && data.images.length > 0) {
      processedContent.images = await Promise.all(
        data.images.map(image => this.processImage(image, options))
      );
    }

    // 处理音频
    if (data.audio) {
      processedContent.audio = await this.processAudio(data.audio, options);
    }

    // 处理文档
    if (data.documents && data.documents.length > 0) {
      processedContent.documents = await Promise.all(
        data.documents.map(doc => this.processDocument(doc, options))
      );
    }

    return processedContent;
  }

  /**
   * 处理图片
   */
  private async processImage(
    file: File, 
    options?: {
      enableImageAnalysis?: boolean;
      customProcessors?: {
        image?: (file: File) => Promise<ProcessedImage>;
      };
    }
  ): Promise<ProcessedImage> {
    // 使用自定义处理器
    if (options?.customProcessors?.image) {
      return options.customProcessors.image(file);
    }

    // 默认处理
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const url = URL.createObjectURL(file);

    // 获取图片尺寸
    const dimensions = await this.getImageDimensions(file);

    const processedImage: ProcessedImage = {
      id: imageId,
      url,
      name: file.name,
      size: file.size,
      format: file.type.split('/')[1] || 'unknown',
      dimensions
    };

    // 图片分析（如果启用）
    if (options?.enableImageAnalysis) {
      processedImage.features = await this.analyzeImage(file);
      processedImage.extractedText = await this.extractTextFromImage(file);
    }

    // 生成缩略图
    processedImage.thumbnails = await this.generateThumbnails(file);

    return processedImage;
  }

  /**
   * 处理音频
   */
  private async processAudio(
    file: File,
    options?: {
      enableAudioTranscription?: boolean;
      customProcessors?: {
        audio?: (file: File) => Promise<ProcessedAudio>;
      };
    }
  ): Promise<ProcessedAudio> {
    // 使用自定义处理器
    if (options?.customProcessors?.audio) {
      return options.customProcessors.audio(file);
    }

    // 默认处理
    const audioId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const url = URL.createObjectURL(file);

    // 获取音频时长和元数据
    const audioMetadata = await this.getAudioMetadata(file);

    const processedAudio: ProcessedAudio = {
      id: audioId,
      url,
      name: file.name,
      size: file.size,
      format: file.type.split('/')[1] || 'unknown',
      ...audioMetadata
    };

    // 音频转录（如果启用）
    if (options?.enableAudioTranscription) {
      processedAudio.transcribedText = await this.transcribeAudio(file);
    }

    // 音频特征分析
    processedAudio.features = await this.analyzeAudio(file);
    processedAudio.waveform = await this.generateWaveform(file);

    return processedAudio;
  }

  /**
   * 处理文档
   */
  private async processDocument(
    file: File,
    options?: {
      enableDocumentExtraction?: boolean;
      customProcessors?: {
        document?: (file: File) => Promise<ProcessedDocument>;
      };
    }
  ): Promise<ProcessedDocument> {
    // 使用自定义处理器
    if (options?.customProcessors?.document) {
      return options.customProcessors.document(file);
    }

    // 默认处理
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const url = URL.createObjectURL(file);

    const processedDocument: ProcessedDocument = {
      id: docId,
      url,
      name: file.name,
      size: file.size,
      format: this.getDocumentFormat(file.type, file.name)
    };

    // 文档提取（如果启用）
    if (options?.enableDocumentExtraction) {
      const extractionResult = await this.extractDocumentContent(file);
      processedDocument.extractedText = extractionResult.text;
      processedDocument.metadata = extractionResult.metadata;
      processedDocument.structure = extractionResult.structure;
      processedDocument.pages = extractionResult.pages;
    }

    return processedDocument;
  }

  /**
   * 获取输入类型
   */
  private getInputType(data: MultiModalData): 'text' | 'image' | 'audio' | 'document' | 'mixed' {
    const hasText = !!data.text;
    const hasImages = data.images && data.images.length > 0;
    const hasAudio = !!data.audio;
    const hasDocuments = data.documents && data.documents.length > 0;

    const types = [hasText, hasImages, hasAudio, hasDocuments].filter(Boolean).length;
    
    if (types === 0) return 'mixed'; // 默认
    if (types === 1) {
      if (hasText) return 'text';
      if (hasImages) return 'image';
      if (hasAudio) return 'audio';
      if (hasDocuments) return 'document';
    }
    return 'mixed';
  }

  /**
   * 计算总大小
   */
  private calculateTotalSize(data: MultiModalData): number {
    let totalSize = 0;
    
    if (data.images) {
      totalSize += data.images.reduce((sum, img) => sum + img.size, 0);
    }
    
    if (data.audio) {
      totalSize += data.audio.size;
    }
    
    if (data.documents) {
      totalSize += data.documents.reduce((sum, doc) => sum + doc.size, 0);
    }
    
    return totalSize;
  }

  /**
   * 获取图片尺寸
   */
  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 获取音频元数据
   */
  private async getAudioMetadata(file: File): Promise<{
    duration: number;
    sampleRate?: number;
    channels?: number;
  }> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve({
          duration: audio.duration,
          // 注意：Web Audio API 可以获取更多信息，但这里简化处理
        });
        URL.revokeObjectURL(audio.src);
      });
      audio.src = URL.createObjectURL(file);
    });
  }

  /**
   * 获取文档格式
   */
  private getDocumentFormat(type: string, name: string): string {
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || name.endsWith('.doc')) return 'DOC';
    if (type.includes('word') || name.endsWith('.docx')) return 'DOCX';
    if (type.includes('sheet') || name.endsWith('.xls')) return 'XLS';
    if (type.includes('sheet') || name.endsWith('.xlsx')) return 'XLSX';
    if (type.includes('presentation') || name.endsWith('.ppt')) return 'PPT';
    if (type.includes('presentation') || name.endsWith('.pptx')) return 'PPTX';
    if (type.includes('text') || name.endsWith('.txt')) return 'TXT';
    if (type.includes('rtf')) return 'RTF';
    return 'Unknown';
  }

  /**
   * 估算tokens
   */
  private estimateTokens(data: MultiModalData, processedContent: any): number {
    let tokens = 0;
    
    // 文本tokens（简化估算：1 token ≈ 4 characters）
    if (data.text) {
      tokens += Math.ceil(data.text.length / 4);
    }
    
    // 图片tokens（简化估算：每张图片 = 1000 tokens）
    if (processedContent.images) {
      tokens += processedContent.images.length * 1000;
    }
    
    // 音频tokens（简化估算：每分钟音频 = 100 tokens）
    if (processedContent.audio) {
      tokens += Math.ceil(processedContent.audio.duration / 60) * 100;
    }
    
    // 文档tokens
    if (processedContent.documents) {
      processedContent.documents.forEach((doc: ProcessedDocument) => {
        if (doc.extractedText) {
          tokens += Math.ceil(doc.extractedText.length / 4);
        }
      });
    }
    
    return tokens;
  }

  /**
   * 检测语言
   */
  private detectLanguage(data: MultiModalData, processedContent: any): string {
    const text = data.text || '';
    const extractedTexts = [
      ...(processedContent.images || []).map((img: ProcessedImage) => img.extractedText || '').join(' '),
      processedContent.audio?.transcribedText || '',
      ...(processedContent.documents || []).map((doc: ProcessedDocument) => doc.extractedText || '').join(' ')
    ].join(' ');
    
    const allText = text + extractedTexts;
    
    // 简单的语言检测逻辑
    const chineseChars = (allText.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishChars = (allText.match(/[a-zA-Z]/g) || []).length;
    
    if (chineseChars > englishChars) return 'zh-CN';
    if (englishChars > 0) return 'en-US';
    return 'unknown';
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(data: MultiModalData, processedContent: any): number {
    let confidence = 0.5; // 基础置信度
    
    // 文本质量
    if (data.text) {
      confidence += 0.2;
    }
    
    // 图片分析质量
    if (processedContent.images) {
      const analyzedImages = processedContent.images.filter((img: ProcessedImage) => img.features);
      confidence += (analyzedImages.length / processedContent.images.length) * 0.2;
    }
    
    // 音频转录质量
    if (processedContent.audio?.transcribedText) {
      confidence += 0.1;
    }
    
    // 文档提取质量
    if (processedContent.documents) {
      const extractedDocs = processedContent.documents.filter((doc: ProcessedDocument) => doc.extractedText);
      confidence += (extractedDocs.length / processedContent.documents.length) * 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }

  // 以下是模拟的各种分析方法
  private async analyzeImage(file: File): Promise<ImageFeatures> {
    // 模拟图片分析
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      dominantColors: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
      objects: ['person', 'car', 'building'],
      faces: 1,
      tags: ['outdoor', 'urban', 'daylight'],
      categories: ['people', 'transportation', 'architecture'],
      description: 'A person standing near a car in front of a building',
      confidence: 0.87
    };
  }

  private async extractTextFromImage(file: File): Promise<string> {
    // 模拟OCR
    await new Promise(resolve => setTimeout(resolve, 2000));
    return '这是从图片中提取的文字内容\n包含多行文本\n可能包含数字123和符号';
  }

  private async generateThumbnails(file: File): Promise<{ small: string; medium: string; large: string }> {
    const url = URL.createObjectURL(file);
    return {
      small: url, // 实际应用中应该生成不同尺寸的缩略图
      medium: url,
      large: url
    };
  }

  private async transcribeAudio(file: File): Promise<string> {
    // 模拟语音转录
    await new Promise(resolve => setTimeout(resolve, 3000));
    return '这是从音频中转录的文字内容。包含了用户的语音输入，可能是设计需求、指令或其他相关信息。';
  }

  private async analyzeAudio(file: File): Promise<AudioFeatures> {
    // 模拟音频分析
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      speechRatio: 0.75,
      silenceRatio: 0.25,
      energy: 0.6,
      zeroCrossingRate: 0.08,
      spectralCentroid: 2000,
      spectralRolloff: 4000,
      tempo: 120,
      key: 'C'
    };
  }

  private async generateWaveform(file: File): Promise<number[]> {
    // 模拟波形生成
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 生成100个随机数据点作为波形
    return Array.from({ length: 100 }, () => Math.random());
  }

  private async extractDocumentContent(file: File): Promise<{
    text: string;
    metadata?: DocumentMetadata;
    structure?: DocumentStructure;
    pages?: number;
  }> {
    // 模拟文档提取
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    return {
      text: `这是从${file.name}中提取的文本内容。\n\n包含多个段落和章节。可能有标题、列表和表格等内容。\n\n详细信息需要通过专业的文档解析服务来获取。`,
      metadata: {
        title: file.name.replace(/\.[^/.]+$/, ''),
        author: 'AiDesign User',
        subject: 'Design Document',
        creator: 'Document Parser',
        pageCount: Math.floor(Math.random() * 20) + 1,
        wordCount: Math.floor(Math.random() * 5000) + 1000,
        keywords: ['design', 'document', 'aidesign'],
        creationDate: new Date().toISOString(),
        language: 'zh-CN'
      },
      structure: {
        headings: [
          { level: 1, text: '文档标题' },
          { level: 2, text: '章节一' },
          { level: 3, text: '子章节' }
        ],
        tables: [
          { headers: ['列1', '列2'], rows: [['数据1', '数据2']] }
        ],
        images: [
          { alt: '示例图片', position: 1 }
        ],
        links: [
          { text: '示例链接', url: 'https://example.com' }
        ]
      },
      pages: Math.floor(Math.random() * 20) + 1
    };
  }

  /**
   * 获取处理状态
   */
  getProcessingStatus(): {
    queue: ProcessedInput[];
    isProcessing: boolean;
    completed: number;
    failed: number;
  } {
    const completed = this.processingQueue.filter(item => item.status === 'completed').length;
    const failed = this.processingQueue.filter(item => item.status === 'error').length;
    
    return {
      queue: [...this.processingQueue],
      isProcessing: this.isProcessing,
      completed,
      failed
    };
  }

  /**
   * 清理队列
   */
  clearQueue(): void {
    this.processingQueue = [];
  }

  /**
   * 取消处理
   */
  cancelProcessing(inputId: string): boolean {
    const index = this.processingQueue.findIndex(item => item.id === inputId);
    if (index > -1 && this.processingQueue[index].status === 'pending') {
      this.processingQueue.splice(index, 1);
      return true;
    }
    return false;
  }
}

// 导出单例实例
export const multiModalInputService = new MultiModalInputService();
export default MultiModalInputService;

// 导出独立函数，便于直接调用
export async function processTextInput(text: string, options?: any) {
  const service = new MultiModalInputService();
  return service.processInput({ text, timestamp: Date.now() }, options);
}

export async function processImageInput(images: any[], options?: any) {
  const service = new MultiModalInputService();
  return service.processInput({ images, timestamp: Date.now() }, options);
}

export async function processAudioInput(audio: any, options?: any) {
  const service = new MultiModalInputService();
  return service.processInput({ audio, timestamp: Date.now() }, options);
}

export async function processDocumentInput(documents: any[], options?: any) {
  const service = new MultiModalInputService();
  return service.processInput({ documents, timestamp: Date.now() }, options);
}

export async function processBatchInput(data: any, options?: any) {
  const service = new MultiModalInputService();
  return service.processInput(data, options);
}