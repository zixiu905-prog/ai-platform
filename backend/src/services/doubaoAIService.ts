import axios, { AxiosResponse } from 'axios';
import { logger } from '../utils/logger';

export interface DoubaoInput {
  role: string;
  content: Array<{
    type: 'input_text' | 'input_image';
    text?: string;
    image_url?: string;
  }>;
}

export interface DoubaoRequest {
  model: string;
  input: DoubaoInput[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface DoubaoResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  output: {
    content: string;
    role: string;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export interface ImageGenerationRequest {
  model: string;
  prompt: string;
  sequential_image_generation?: 'disabled' | 'enabled';
  response_format?: 'url' | 'b64_json';
  size?: '512x512' | '768x768' | '1024x1024' | '2K';
  stream?: boolean;
  watermark?: boolean;
}

export interface ImageGenerationResponse {
  id: string;
  object: string;
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

export class DoubaoAIService {
  private static readonly API_BASE = 'https://ark.cn-beijing.volces.com/api/v3';
  private static readonly API_KEY = '47ada820-238e-4d72-81bc-580bea836be4';

  // 可用模型列表
  private static readonly MODELS = {
    TEXT: {
      'doubao-seed-1-6-251015': {
        maxTokens: 8192,
        description: 'Doubao Seed 1.6 基础文本模型'
      },
      'doubao-pro-4k': {
        maxTokens: 4000,
        description: 'Doubao Pro 4K 快速响应模型'
      },
      'doubao-pro-32k': {
        maxTokens: 32768,
        description: 'Doubao Pro 32K 长文本模型'
      }
    },
    MULTIMODAL: {
      'doubao-vision': {
        maxTokens: 4096,
        description: 'Doubao Vision 视觉理解模型'
      }
    },
    EMBEDDING: {
      'doubao-embedding': {
        maxTokens: 2048,
        description: 'Doubao 文本向量化模型'
      }
    },
    IMAGE: {
      'doubao-seedream-4-5-251128': {
        maxTokens: 4096,
        description: 'Doubao SeedDream 4.5 图像生成模型'
      }
    }
  };

  /**
   * 文本生成
   */
  static async generateText(prompt: string, model: string = 'doubao-seed-1-6-251015'): Promise<DoubaoResponse> {
    try {
      const request: DoubaoRequest = {
        model,
        input: [{
          role: 'user',
          content: [{
            type: 'input_text',
            text: prompt
          }]
        }],
        temperature: 0.7,
        max_tokens: 4000,
        stream: false
      };

      const response = await this.makeRequest('/responses', request);
      logger.info(`豆包AI文本生成成功，模型: ${model}, Token使用: ${response.data.usage.total_tokens}`);

      return response.data;
    } catch (error) {
      logger.error('豆包AI文本生成失败:', error);
      throw error;
    }
  }

  /**
   * 多模态分析（图片+文字）
   */
  static async analyzeMultimodal(
    content: Array<{ type: 'input_text' | 'input_image'; content: string }>,
    model: string = 'doubao-seed-1-6-251015'
  ): Promise<DoubaoResponse> {
    try {
      const input: DoubaoInput[] = [{
        role: 'user',
        content: content.map(item => ({
          type: item.type as 'input_text' | 'input_image',
          ...(item.type === 'input_text' ? { text: item.content } : { image_url: item.content })
        }))
      }];

      const request: DoubaoRequest = {
        model,
        input,
        temperature: 0.3,
        max_tokens: 4000
      };

      const response = await this.makeRequest('/responses', request);
      logger.info(`豆包AI多模态分析成功，模型: ${model}, 输入类型: ${content.map(c => c.type).join(', ')}`);

      return response.data;
    } catch (error) {
      logger.error('豆包AI多模态分析失败:', error);
      throw error;
    }
  }

  /**
   * 生成结构化指令
   */
  static async generateStructuredCommand(
    userInput: string,
    context?: string,
    model: string = 'doubao-seed-1-6-251015'
  ): Promise<{
    command: string;
    parameters: any;
    software?: string;
    action?: string;
  }> {
    try {
      const prompt = `
你是一个AI助手，专门帮助用户完成设计软件的自动化任务。请根据用户输入生成结构化的执行指令。

用户输入: ${userInput}
${context ? `上下文: ${context}` : ''}

请返回JSON格式的结构化指令，包含以下字段：
- command: 执行的主要命令描述
- parameters: 命令参数对象
- software: 需要操作的设计软件（可选）
- action: 具体操作类型（可选）

示例格式：
{
  "command": "创建新文档并设置A4页面",
  "parameters": {
    "pageSize": "A4",
    "orientation": "portrait",
    "margin": "2cm"
  },
  "software": "illustrator",
  "action": "create_document"
}
`;

      const response = await this.generateText(prompt, model);

      try {
        // 尝试解析JSON
        const content = response.output.content;
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }

        // 如果没有代码块，尝试直接解析
        const cleanContent = content.replace(/^[^{]*({[^}]*})[^}]*$/, '$1');
        return JSON.parse(cleanContent);
      } catch (parseError) {
        logger.warn('豆包AI返回的结构化指令解析失败:', parseError);

        // 返回基础结构
        return {
          command: response.output.content,
          parameters: {},
          software: undefined,
          action: undefined
        };
      }
    } catch (error) {
      logger.error('豆包AI结构化指令生成失败:', error);
      throw error;
    }
  }

  /**
   * COM接口修复建议
   */
  static async fixInterface(
    softwareName: string,
    version: string,
    errorInfo: string,
    feedback?: string
  ): Promise<{
    problem: string;
    solution: string;
    code_snippet?: string;
    recommendations: string[];
  }> {
    try {
      const prompt = `
你是一个设计软件接口专家，专门解决COM接口相关问题。

软件信息：
- 软件名称: ${softwareName}
- 软件版本: ${version}
- 错误信息: ${errorInfo}
${feedback ? `- 用户反馈: ${feedback}` : ''}

请分析问题并提供修复方案，返回JSON格式：
{
  "problem": "问题分析",
  "solution": "解决方案描述",
  "code_snippet": "修复代码示例（可选）",
  "recommendations": ["建议1", "建议2", "建议3"]
}

请确保解决方案具体可执行，代码示例语法正确。
`;

      const response = await this.generateText(prompt, 'doubao-seed-1-6-251015');

      try {
        const content = response.output.content;
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }

        const cleanContent = content.replace(/^[^{]*({[^}]*})[^}]*$/, '$1');
        return JSON.parse(cleanContent);
      } catch (parseError) {
        logger.warn('豆包AI接口修复建议解析失败:', parseError);

        return {
          problem: errorInfo,
          solution: response.output.content,
          recommendations: ['请检查COM接口版本兼容性', '确认权限设置正确', '验证软件安装完整性']
        };
      }
    } catch (error) {
      logger.error('豆包AI接口修复失败:', error);
      throw error;
    }
  }

  /**
   * 脚本增效工具生成
   */
  static async enhanceScript(
    originalScript: string,
    softwareName: string,
    enhancementGoal: string
  ): Promise<{
    enhanced_script: string;
    improvements: string[];
    performance_gain: string;
  }> {
    try {
      const prompt = `
你是一个脚本优化专家，专门提升设计软件脚本的效率和功能。

原始脚本:
\`\`\`javascript
${originalScript}
\`\`\`

软件: ${softwareName}
优化目标: ${enhancementGoal}

请提供优化后的脚本和改进说明，返回JSON格式：
{
  "enhanced_script": "优化后的完整脚本代码",
  "improvements": ["改进1", "改进2", "改进3"],
  "performance_gain": "性能提升描述"
}

请确保：
1. 优化后脚本功能完整
2. 代码结构清晰
3. 添加错误处理
4. 提供详细改进说明
`;

      const response = await this.generateText(prompt, 'doubao-seed-1-6-251015');

      try {
        const content = response.output.content;
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }

        const cleanContent = content.replace(/^[^{]*({[^}]*})[^}]*$/, '$1');
        return JSON.parse(cleanContent);
      } catch (parseError) {
        logger.warn('豆包AI脚本增强解析失败:', parseError);

        return {
          enhanced_script: originalScript,
          improvements: ['添加错误处理', '优化循环效率', '增加注释说明'],
          performance_gain: '预期提升20-30%'
        };
      }
    } catch (error) {
      logger.error('豆包AI脚本增强失败:', error);
      throw error;
    }
  }

  /**
   * 获取可用模型列表
   */
  static getAvailableModels(): Array<{
    id: string;
    type: string;
    description: string;
    maxTokens?: number;
  }> {
    const models: any[] = [];

    Object.entries(this.MODELS).forEach(([category, categoryModels]) => {
      Object.entries(categoryModels).forEach(([id, info]: [string, any]) => {
        models.push({
          id,
          type: category.toLowerCase(),
          description: info.description,
          maxTokens: info.maxTokens
        });
      });
    });

    return models;
  }

  /**
   * 检查模型Token限制
   */
  static checkTokenLimit(model: string, inputTokens: number): boolean {
    const modelInfo = this.getModelInfo(model);
    if (!modelInfo) return false;

    return inputTokens <= modelInfo.maxTokens;
  }

  /**
   * 获取模型信息
   */
  static getModelInfo(model: string): any {
    for (const category of Object.values(this.MODELS)) {
      if (category[model as keyof typeof category]) {
        return category[model as keyof typeof category];
      }
    }
    return null;
  }

  /**
   * 图像生成
   */
  static async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    try {
      const response = await this.makeImageRequest('/images/generations', request);
      logger.info(`豆包AI图像生成成功，模型: ${request.model}, 提示词: ${request.prompt.substring(0, 50)}...`);

      return response.data;
    } catch (error) {
      logger.error('豆包AI图像生成失败:', error);
      throw error;
    }
  }

  /**
   * 批量图像生成
   */
  static async generateImages(
    prompts: string[],
    model: string = 'doubao-seedream-4-5-251128',
    options: Partial<ImageGenerationRequest> = {}
  ): Promise<ImageGenerationResponse[]> {
    try {
      const requests = prompts.map(prompt => ({
        model,
        prompt,
        ...options
      }));

      const responses = await Promise.all(
        requests.map(request => this.generateImage(request))
      );

      logger.info(`豆包AI批量图像生成完成，数量: ${prompts.length}`);
      return responses;
    } catch (error) {
      logger.error('豆包AI批量图像生成失败:', error);
      throw error;
    }
  }

  /**
   * AI辅助设计图像生成
   */
  static async generateDesignImage(
    designBrief: string,
    style: 'modern' | 'classic' | 'minimalist' | 'industrial' | 'artistic' = 'modern',
    format: string = '2K'
  ): Promise<ImageGenerationResponse> {
    try {
      const stylePrompts = {
        modern: '现代简约风格，线条流畅，色彩明亮，注重功能性和美感',
        classic: '经典设计风格，传统元素，优雅永恒，注重细节和工艺',
        minimalist: '极简主义风格，简洁纯粹，留白设计，突出核心元素',
        industrial: '工业风格，粗犷质感，金属元素，机械美学',
        artistic: '艺术创作风格，创意表达，色彩丰富，视觉冲击力强'
      };

      const prompt = `
设计主题：${designBrief}
风格要求：${stylePrompts[style]}
专业设计标准：高质量渲染，专业构图，色彩协调，细节精致，适合商业用途

请生成一张专业的${designBrief}设计图像，要求：
1. 符合${stylePrompts[style]}的设计理念
2. 具有视觉冲击力和艺术美感
3. 细节丰富，质感真实
4. 适合作为设计参考或展示用途
      `;

      return await this.generateImage({
        model: 'doubao-seedream-4-5-251128',
        prompt: prompt.trim(),
        response_format: 'url',
        size: format as any,
        watermark: true
      });
    } catch (error) {
      logger.error('豆包AI设计图像生成失败:', error);
      throw error;
    }
  }

  /**
   * 室内外设计图像生成
   */
  static async generateInteriorDesignImage(
    spaceType: 'living_room' | 'bedroom' | 'kitchen' | 'bathroom' | 'office' | 'garden',
    style: 'chinese' | 'european' | 'american' | 'japanese' | 'nordic' | 'industrial',
    requirements: string = '',
    format: string = '2K'
  ): Promise<ImageGenerationResponse> {
    try {
      const spaceTypes = {
        living_room: '客厅',
        bedroom: '卧室',
        kitchen: '厨房',
        bathroom: '浴室',
        office: '办公室',
        garden: '园林景观'
      };

      const styles = {
        chinese: '中式风格，传统元素，木质家具，古典装饰',
        european: '欧式风格，奢华典雅，大理石材质，精致雕刻',
        american: '美式风格，宽敞舒适，实用功能，自由氛围',
        japanese: '日式风格，禅意简约，原木材质，自然和谐',
        nordic: '北欧风格，简洁明亮，白色基调，自然光线',
        industrial: '工业风格，裸露结构，金属管道，复古元素'
      };

      const prompt = `
${spaceTypes[spaceType]}设计，${styles[style]}，${requirements ? `特殊要求：${requirements}` : ''}

专业室内设计要求：
1. 空间布局合理，功能区域明确
2. 色彩搭配协调，氛围营造恰当
3. 材质质感真实，光影效果自然
4. 家具配置合理，细节处理精致
5. 整体风格统一，符合设计美学

${style === 'chinese' ? '融入传统中式元素，如格栅、屏风、水墨画等装饰' : ''}
${style === 'european' ? '体现欧式奢华，使用水晶吊灯、大理石地面、精致壁炉等' : ''}
${style === 'american' ? '营造美式舒适感，使用布艺沙发、实木家具、壁炉装饰' : ''}
${style === 'japanese' ? '体现日式禅意，使用榻榻米、障子门、竹子装饰等' : ''}
${style === 'nordic' ? '打造北欧清新感，使用白色墙面、木质地板、简约家具' : ''}
${style === 'industrial' ? '展现工业质感，使用裸露砖墙、金属管道、复古灯具' : ''}
      `;

      return await this.generateImage({
        model: 'doubao-seedream-4-5-251128',
        prompt: prompt.trim(),
        response_format: 'url',
        size: format as any,
        watermark: true
      });
    } catch (error) {
      logger.error('豆包AI室内设计图像生成失败:', error);
      throw error;
    }
  }

  /**
   * 发送文本请求的HTTP方法
   */
  private static async makeRequest(endpoint: string, data: any): Promise<AxiosResponse> {
    const response = await axios.post(`${this.API_BASE}${endpoint}`, data, {
      headers: {
        'Authorization': `Bearer ${this.API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    return response;
  }

  /**
   * 发送图像生成请求的HTTP方法
   */
  private static async makeImageRequest(endpoint: string, data: any): Promise<AxiosResponse> {
    const response = await axios.post(`${this.API_BASE}${endpoint}`, data, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.API_KEY}`
      },
      timeout: 120000 // 图像生成需要更长时间
    });

    return response;
  }

  /**
   * 发送多模态请求（支持图像和文本）
   */
  static async sendMultimodalRequest(
    inputs: Array<{
      role: string;
      content: Array<{
        type: 'input_text' | 'input_image';
        text?: string;
        image_url?: string;
      }>;
    }>,
    model: string = 'doubao-seed-1-6-251015'
  ): Promise<DoubaoResponse> {
    try {
      const request: DoubaoRequest = {
        model,
        input: inputs,
        temperature: 0.7,
        max_tokens: 2000,
        stream: false
      };

      const response = await this.makeRequest('/responses', request);
      return response.data;
    } catch (error) {
      logger.error('豆包AI多模态请求失败:', error);
      throw error;
    }
  }

  /**
   * 验证APIKEY有效性
   */
  static async validateApiKey(): Promise<boolean> {
    try {
      const testInput: Array<{
        role: string;
        content: Array<{
          type: 'input_text' | 'input_image';
          text?: string;
          image_url?: string;
        }>;
      }> = [{
        role: 'user',
        content: [{
          type: 'input_text',
          text: '测试连接'
        }]
      }];

      const testResponse = await this.sendMultimodalRequest(testInput, 'doubao-seed-1-6-251015');
      return testResponse.output.content.length > 0;
    } catch (error) {
      logger.error('豆包AI APIKEY验证失败:', error);
      return false;
    }
  }

  /**
   * 获取豆包AI文档信息
   */
  static async fetchDocumentationInfo() {
    return {
      models: this.MODELS,
      capabilities: {
        textGeneration: ['doubao-seed-1-6-251015', 'doubao-pro-4k', 'doubao-pro-32k'],
        multimodal: ['doubao-vision'],
        imageGeneration: ['doubao-image-gen'],
        embedding: ['doubao-embedding']
      },
      documentation: {
        url: 'https://ark.cn-beijing.volces.com/api/v3',
        lastUpdated: new Date().toISOString(),
        version: 'v3'
      }
    };
  }

  /**
   * 计算Token使用成本
   */
}

export const doubaoAIService = new DoubaoAIService();

