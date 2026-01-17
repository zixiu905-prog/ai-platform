import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';
import { SoftwareIntegrationService } from '../services/softwareIntegrationService';
import { ScriptExecutor } from '../services/scriptExecutor';
import { logger } from '../utils/logger';
import { zhipuAIService } from '../services/zhipuAIService';
import { doubaoAIService } from '../services/doubaoAIService';

export interface AIDesignRequest {
  type: 'concept' | 'layout' | 'color_scheme' | 'typography' | 'mockup' | 'enhancement';
  input: {
    description?: string;
    referenceImages?: string[];
    requirements?: Record<string, any>;
    constraints?: Record<string, any>;
    style?: string;
    brandGuidelines?: any;
  };
  software?: 'photoshop' | 'illustrator' | 'blender' | 'autocad' | 'premiere' | 'figma';
  output?: {
    format?: string;
    dimensions?: { width: number; height: number };
    quality?: 'low' | 'medium' | 'high';
  };
}

export interface AIDesignResult {
  success: boolean;
  type: string;
  result: {
    concepts?: Array<{
      title: string;
      description: string;
      confidence: number;
      assets?: string[];
    }>;
    designs?: Array<{
      id: string;
      preview: string;
      sourceFile?: string;
      metadata: Record<string, any>;
    }>;
    suggestions?: string[];
    code?: string;
    parameters?: Record<string, any>;
  };
  execution: {
    model: string;
    processingTime: number;
    tokens?: {
      input: number;
      output: number;
      total: number;
    };
    cost?: number;
  };
  assets?: {
    images?: string[];
    files?: string[];
    scripts?: string[];
  };
  error?: string;
}

export class AIDesignIntegrationService {
  private prisma: PrismaClient;
  private softwareService: SoftwareIntegrationService;
  private scriptExecutor: ScriptExecutor;

  constructor() {
    this.prisma = prisma;
    this.softwareService = new SoftwareIntegrationService();
    this.scriptExecutor = new ScriptExecutor();
  }

  async processDesignRequest(request: AIDesignRequest): Promise<AIDesignResult> {
    const startTime = Date.now();

    try {
      logger.info('开始AI设计集成:', { type: request.type, software: request.software });

      let result: AIDesignResult;

      switch (request.type) {
        case 'concept':
          result = await this.generateConcept(request);
          break;
        case 'layout':
          result = await this.generateLayout(request);
          break;
        case 'color_scheme':
          result = await this.generateColorScheme(request);
          break;
        case 'typography':
          result = await this.generateTypography(request);
          break;
        case 'mockup':
          result = await this.generateMockup(request);
          break;
        case 'enhancement':
          result = await this.enhanceDesign(request);
          break;
        default:
          throw new Error(`不支持的设计类型: ${request.type}`);
      }

      result.execution.processingTime = Date.now() - startTime;

      // 保存结果到数据库
      await this.saveDesignResult(result, request);

      return result;
    } catch (error) {
      logger.error('AI设计集成失败:', error);
      return {
        success: false,
        type: request.type,
        result: {},
        execution: {
          model: 'unknown',
          processingTime: Date.now() - startTime
        },
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  private async generateConcept(request: AIDesignRequest): Promise<AIDesignResult> {
    try {
      const prompt = `为以下需求生成设计概念:\n${request.input.description}\n\n请返回3个设计概念，每个包含标题、描述和置信度。`;
      const response = await zhipuAIService.generateText(prompt, {
        model: 'glm-4',
        max_tokens: 2000
      });

      // 解析AI响应
      const concepts = this.parseConcepts(response);

      return {
        success: true,
        type: 'concept',
        result: {
          concepts
        },
        execution: {
          model: 'glm-4',
          processingTime: 0
        }
      };
    } catch (error) {
      logger.error('生成设计概念失败:', error);
      throw error;
    }
  }

  private async generateLayout(request: AIDesignRequest): Promise<AIDesignResult> {
    try {
      const prompt = `为以下设计需求生成布局建议:\n${request.input.description}\n\n请提供详细的布局方案和坐标。`;

      const response = await zhipuAIService.generateText(prompt, {
        model: 'glm-4',
        max_tokens: 2000
      });

      return {
        success: true,
        type: 'layout',
        result: {
          suggestions: [response]
        },
        execution: {
          model: 'glm-4',
          processingTime: 0
        }
      };
    } catch (error) {
      logger.error('生成布局失败:', error);
      throw error;
    }
  }

  private async generateColorScheme(request: AIDesignRequest): Promise<AIDesignResult> {
    try {
      const prompt = `为以下设计需求生成配色方案:\n${request.input.description}\n\n请提供3个配色方案，每个包含主色、辅助色和强调色的十六进制代码。`;

      const response = await zhipuAIService.generateText(prompt, {
        model: 'glm-4',
        max_tokens: 1000
      });

      return {
        success: true,
        type: 'color_scheme',
        result: {
          suggestions: [response]
        },
        execution: {
          model: 'glm-4',
          processingTime: 0
        }
      };
    } catch (error) {
      logger.error('生成配色方案失败:', error);
      throw error;
    }
  }

  private async generateTypography(request: AIDesignRequest): Promise<AIDesignResult> {
    try {
      const prompt = `为以下设计需求推荐字体方案:\n${request.input.description}\n\n请推荐标题字体、正文字体和装饰字体。`;

      const response = await zhipuAIService.generateText(prompt, {
        model: 'glm-4',
        max_tokens: 1000
      });

      return {
        success: true,
        type: 'typography',
        result: {
          suggestions: [response]
        },
        execution: {
          model: 'glm-4',
          processingTime: 0
        }
      };
    } catch (error) {
      logger.error('生成字体方案失败:', error);
      throw error;
    }
  }

  private async generateMockup(request: AIDesignRequest): Promise<AIDesignResult> {
    try {
      // 生成mockup图像
      const imageUrl = await this.generateMockupImage(request);

      return {
        success: true,
        type: 'mockup',
        result: {
          designs: [{
            id: `mockup-${Date.now()}`,
            preview: imageUrl,
            metadata: {
              type: 'mockup',
              software: request.software || 'figma'
            }
          }]
        },
        execution: {
          model: 'dall-e-3',
          processingTime: 0
        }
      };
    } catch (error) {
      logger.error('生成mockup失败:', error);
      throw error;
    }
  }

  private async enhanceDesign(request: AIDesignRequest): Promise<AIDesignResult> {
    try {
      const prompt = `根据以下要求优化设计:\n${request.input.description}\n\n请提供优化建议和改进方案。`;

      const response = await zhipuAIService.generateText(prompt, {
        model: 'glm-4',
        max_tokens: 2000
      });

      // 如果指定了软件，生成对应的脚本
      let code: string | undefined;
      if (request.software) {
        code = await this.generateSoftwareScript(request.software, response);
      }

      return {
        success: true,
        type: 'enhancement',
        result: {
          suggestions: [response],
          code
        },
        execution: {
          model: 'glm-4',
          processingTime: 0
        }
      };
    } catch (error) {
      logger.error('优化设计失败:', error);
      throw error;
    }
  }

  private async generateMockupImage(request: AIDesignRequest): Promise<string> {
    // 使用豆包AI生成图像
    const prompt = `${request.input.description}. Professional design mockup, high quality, detailed.`;

    const { DoubaoAIService } = await import('../services/doubaoAIService');
    const result = await DoubaoAIService.generateImage({
      model: 'doubao-v1-pro',
      prompt,
      size: '1024x1024'
    });

    return result.data?.[0]?.url || '';
  }

  private async generateSoftwareScript(software: string, aiResponse: string): Promise<string> {
    const scripts: Record<string, string> = {
      photoshop: `
// Adobe Photoshop Script
var doc = app.activeDocument;
var layer = doc.artLayers.add();
layer.name = "AI Generated Design";
`,
      illustrator: `
// Adobe Illustrator Script
var doc = app.activeDocument;
var artLayer = doc.layers.add();
artLayer.name = "AI Generated Design";
`,
      blender: `
# Blender Python Script
import bpy
# Create new material based on AI design
bpy.ops.material.new()
`,
      autocad: `
; AutoCAD Lisp
(defun c:AIDesign ()
  (alert "AI Design Integration")
)
`,
      premiere: `
// Adobe Premiere Pro Script
var activeSequence = app.project.activeSequence;
if (activeSequence) {
  // Add AI-generated tracks
}
`,
      figma: `
// Figma Plugin Script
figma.currentPage.selection = figma.currentPage.children.map(node => ({
  ...node,
  name: "AI Enhanced"
}));
`
    };

    return scripts[software] || '// Unsupported software script';
  }

  private parseConcepts(text: string): Array<{
    title: string;
    description: string;
    confidence: number;
  }> {
    // 简化版的解析逻辑
    return [
      {
        title: '概念1',
        description: text.substring(0, 100),
        confidence: 0.9
      },
      {
        title: '概念2',
        description: text.substring(100, 200),
        confidence: 0.85
      },
      {
        title: '概念3',
        description: text.substring(200, 300),
        confidence: 0.8
      }
    ];
  }

  private async saveDesignResult(result: AIDesignResult, request: AIDesignRequest): Promise<void> {
    try {
      // aiDesign table not implemented
      logger.warn('saveDesignResult - aiDesign table not implemented in database');
    } catch (error) {
      logger.warn('保存设计结果失败:', error);
    }
  }

  async getDesignHistory(userId: string, limit = 20): Promise<AIDesignResult[]> {
    try {
      // aiDesign table not implemented
      logger.warn('getDesignHistory - aiDesign table not implemented in database');
      return [];
    } catch (error) {
      logger.error('获取设计历史失败:', error);
      return [];
    }
  }

  async executeDesignWorkflow(workflowId: string): Promise<AIDesignResult> {
    try {
      // 获取工作流配置
      const workflow = await this.prisma.workflows.findUnique({
        where: { id: workflowId }
      });

      if (!workflow) {
        throw new Error('工作流不存在');
      }

      // 解析工作流定义并执行
      const definition = {
        nodes: workflow.nodes,
        edges: workflow.edges,
        config: workflow.config
      };

      // 执行工作流
      const request: AIDesignRequest = {
        type: 'enhancement',
        input: {
          description: `执行工作流: ${workflow.name}`
        }
      };

      return await this.processDesignRequest(request);
    } catch (error) {
      logger.error('执行设计工作流失败:', error);
      throw error;
    }
  }
}

export default new AIDesignIntegrationService();
