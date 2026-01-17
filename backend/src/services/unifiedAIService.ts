import { logger } from '../utils/logger';
import { ZhipuAIService } from './zhipuAIService';
import { DoubaoAIService } from './doubaoAIService';

export interface AIModel {
  name: string;
  provider: 'zhipu' | 'doubao';
  capabilities: string[];
  maxTokens: number;
  costPerToken: number;
}

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export class UnifiedAIService {
  private zhipuService: ZhipuAIService;
  private doubaoService: DoubaoAIService;
  private availableModels: Map<string, AIModel>;

  constructor() {
    this.zhipuService = new ZhipuAIService();
    this.doubaoService = new DoubaoAIService();
    this.availableModels = this.initializeModels();
  }

  /**
   * 初始化可用AI模型
   */
  private initializeModels(): Map<string, AIModel> {
    const models = new Map<string, AIModel>();

    // 智谱AI模型
    models.set('glm-4', {
      name: 'glm-4',
      provider: 'zhipu',
      capabilities: ['chat', 'function_calling', 'code_generation'],
      maxTokens: 8192,
      costPerToken: 0.0001
    });
    models.set('glm-4-flash', {
      name: 'glm-4-flash',
      provider: 'zhipu',
      capabilities: ['chat', 'fast_response'],
      maxTokens: 4096,
      costPerToken: 0.00005
    });

    // 豆包AI模型
    models.set('doubao-pro', {
      name: 'doubao-pro',
      provider: 'doubao',
      capabilities: ['chat', 'code_generation', 'reasoning'],
      maxTokens: 8192,
      costPerToken: 0.00008
    });

    return models;
  }

  /**
   * AI对话
   */
  async chat(messages: AIChatMessage[], options: AIChatOptions = {}): Promise<any> {
    try {
      const modelName = options.model || 'glm-4';
      const model = this.availableModels.get(modelName);

      if (!model) {
        throw new Error(`不支持的模型: ${modelName}`);
      }

      logger.info(`AI请求: ${modelName}`, { messageCount: messages.length });

      let response;
      if (model.provider === 'zhipu') {
        response = await this.zhipuService.generateText(JSON.stringify(messages), options);
      } else if (model.provider === 'doubao') {
        response = await DoubaoAIService.generateText(JSON.stringify(messages));
      } else {
        throw new Error(`不支持的AI提供商: ${model.provider}`);
      }

      return {
        message: response.content || response.text,
        tokens: response.tokens || 0,
        model: modelName,
        usage: response.usage
      };
    } catch (error) {
      logger.error('AI请求失败:', error);
      throw error;
    }
  }

  /**
   * 流式对话
   */
  async *chatStream(messages: AIChatMessage[], options: AIChatOptions = {}): AsyncGenerator<any> {
    const modelName = options.model || 'glm-4';
    const model = this.availableModels.get(modelName);

    if (!model) {
      throw new Error(`不支持的模型: ${modelName}`);
    }

    // 实现流式响应
    const fullResponse = await this.chat(messages, options);
    yield { type: 'message', content: fullResponse.message };
    yield { type: 'done', tokens: fullResponse.tokens };
  }

  /**
   * 获取可用模型列表
   */
  getAvailableModels(): AIModel[] {
    return Array.from(this.availableModels.values());
  }

  /**
   * 获取模型信息
   */
  getModelInfo(modelName: string): AIModel | undefined {
    return this.availableModels.get(modelName);
  }

  /**
   * 根据能力选择最佳模型
   */
  selectBestModel(capability: string): AIModel | undefined {
    const matchingModels = Array.from(this.availableModels.values())
      .filter(model => model.capabilities.includes(capability));

    // 选择最便宜的模型
    return matchingModels.sort((a, b) => a.costPerToken - b.costPerToken)[0];
  }

  /**
   * 批量处理请求
   */
  async batchChat(requests: Array<{ messages: AIChatMessage[], options?: AIChatOptions }>): Promise<any[]> {
    const results = await Promise.allSettled(
      requests.map(req => this.chat(req.messages, req.options))
    );

    return results.map((result, index) => ({
      index,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? (result.reason as Error).message : null
    }));
  }

  /**
   * 多模态输入处理
   */
  async processMultimodalInput(input: {
    text?: string;
    images?: Buffer[];
    audio?: Buffer;
    documents?: Buffer[];
  }, options: AIChatOptions = {}): Promise<any> {
    try {
      const messages: AIChatMessage[] = [];

      // 处理文本输入
      if (input.text) {
        messages.push({ role: 'user', content: input.text });
      }

      // 处理图像输入
      if (input.images && input.images.length > 0) {
        // 图像处理功能暂时跳过
        messages.push({
          role: 'user',
          content: `[包含 ${input.images.length} 张图像]`
        });
      }

      // 处理音频输入
      if (input.audio) {
        const { unifiedSpeechService } = await import('./unifiedSpeechService');
        const transcription = await unifiedSpeechService.recognizeSpeech(input.audio);
        messages.push({
          role: 'user',
          content: `语音识别结果: ${transcription.transcription}`
        });
      }

      // 处理文档输入
      if (input.documents && input.documents.length > 0) {
        // 文档处理功能暂时跳过
        messages.push({
          role: 'user',
          content: `[包含 ${input.documents.length} 个文档]`
        });
      }

      return await this.chat(messages, options);
    } catch (error) {
      logger.error('多模态输入处理失败:', error);
      throw error;
    }
  }
}

export const unifiedAIService = new UnifiedAIService();
