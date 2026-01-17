// 兼容性导入 - 保持向后兼容
import { prisma } from '../config/database';
import express from 'express';
import { authenticate, requireSubscription } from '../middleware/auth';
import { logger } from '../utils/logger';
import { UnifiedWorkflowService } from '../services/unifiedWorkflowService';

const router = express.Router();

const n8nService = new UnifiedWorkflowService();

router.use(authenticate);

/**
 * @route POST /api/n8n-workflows
 * @desc 创建N8N风格工作流
 * @access Private
 */
router.post('/', requireSubscription('basic'), async (req, res) => {
  try {
    const userId = req.user?.id;
    const workflowData = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const workflow = await n8nService.createWorkflow(userId, workflowData);

    res.status(201).json({
      success: true,
      message: 'N8N工作流创建成功',
      data: workflow
    });
  } catch (error) {
    logger.error('创建N8N工作流失败:', error);
    res.status(500).json({
      success: false,
      message: '创建N8N工作流失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/n8n-workflows/:id/execute
 * @desc 执行N8N工作流
 * @access Private
 */
router.post('/:id/execute', requireSubscription('basic'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { mode = 'manual', startNode, data, retryOf } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const executionResult = await n8nService.executeWorkflow(
      id,
      userId,
      { mode, startNode, data, retryOf }
    );

    res.json({
      success: true,
      message: '工作流执行已启动',
      data: executionResult
    });
  } catch (error) {
    logger.error('执行N8N工作流失败:', error);
    res.status(500).json({
      success: false,
      message: '执行N8N工作流失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/n8n-workflows/:id/clone
 * @desc 克隆工作流
 * @access Private
 */
router.post('/:id/clone', requireSubscription('basic'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { newName } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const clonedWorkflow = await n8nService.cloneWorkflow(id, userId, newName);

    res.status(201).json({
      success: true,
      message: '工作流克隆成功',
      data: clonedWorkflow
    });
  } catch (error) {
    logger.error('克隆工作流失败:', error);
    res.status(500).json({
      success: false,
      message: '克隆工作流失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/n8n-workflows/:id/export
 * @desc 导出工作流
 * @access Private
 */
router.get('/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const exportData = await n8nService.exportWorkflow(id);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="workflow-${id}.json"`);

    res.json(exportData);
  } catch (error) {
    logger.error('导出工作流失败:', error);
    res.status(500).json({
      success: false,
      message: '导出工作流失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/n8n-workflows/import
 * @desc 导入工作流
 * @access Private
 */
router.post('/import', requireSubscription('basic'), async (req, res) => {
  try {
    const userId = req.user?.id;
    const exportData = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const importedWorkflow = await n8nService.importWorkflow(userId, exportData);

    res.status(201).json({
      success: true,
      message: '工作流导入成功',
      data: importedWorkflow
    });
  } catch (error) {
    logger.error('导入工作流失败:', error);
    res.status(500).json({
      success: false,
      message: '导入工作流失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/n8n-workflows/:id/nodes/:nodeId/webhooks
 * @desc 创建Webhook触发器
 * @access Private
 */
router.post('/:id/nodes/:nodeId/webhooks', requireSubscription('basic'), async (req, res) => {
  try {
    const { id, nodeId } = req.params;
    const userId = req.user?.id;
    const webhookOptions = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 验证用户是否有该工作流的权限
    const workflow = await prisma.workflows.findFirst({
      where: {
        id,
        authorId: userId
      }
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: '工作流不存在'
      });
    }

    const webhookConfig = {
      workflowId: id,
      nodeId,
      ...webhookOptions
    };
    const { webhookUrl, webhookId } = await n8nService.createWebhookTrigger(
      id,
      webhookConfig
    );

    res.json({
      success: true,
      message: 'Webhook触发器创建成功',
      data: { webhookUrl, webhookId }
    });
  } catch (error) {
    logger.error('创建Webhook触发器失败:', error);
    res.status(500).json({
      success: false,
      message: '创建Webhook触发器失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/n8n-workflows/:id/nodes/:nodeId/schedules
 * @desc 创建定时触发器
 * @access Private
 */
router.post('/:id/nodes/:nodeId/schedules', requireSubscription('basic'), async (req, res) => {
  try {
    const { id, nodeId } = req.params;
    const userId = req.user?.id;
    const scheduleConfig = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 验证用户是否有该工作流的权限
    const workflow = await prisma.workflows.findFirst({
      where: {
        id,
        authorId: userId
      }
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: '工作流不存在'
      });
    }

    const scheduleTriggerConfig = {
      workflowId: id,
      nodeId,
      ...scheduleConfig
    };
    const { scheduleId } = await n8nService.createScheduleTrigger(
      id,
      scheduleTriggerConfig
    );

    res.json({
      success: true,
      message: '定时触发器创建成功',
      data: { scheduleId }
    });
  } catch (error) {
    logger.error('创建定时触发器失败:', error);
    res.status(500).json({
      success: false,
      message: '创建定时触发器失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/n8n-workflows/:id/statistics
 * @desc 获取工作流执行统计
 * @access Private
 */
router.get('/:id/statistics', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const statistics = await n8nService.getPerformanceMetrics(id, 30);

    res.json({
      success: true,
      message: '获取工作流统计成功',
      data: statistics
    });
  } catch (error) {
    logger.error('获取工作流统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取工作流统计失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/n8n-workflows/templates
 * @desc 获取N8N工作流模板
 * @access Private
 */
router.get('/templates', async (req, res) => {
  try {
    const { category } = req.query;

    const templates = [
      {
        id: 'http-api-integration',
        name: 'HTTP API集成',
        description: '通过HTTP API连接外部服务',
        category: 'integration',
        difficulty: 'beginner',
        tags: ['api', 'http', 'integration'],
        nodes: [
          {
            id: 'webhook',
            type: 'webhook',
            position: { x: 100, y: 100 },
            config: {
              title: 'Webhook接收器',
              httpMethod: 'POST',
              path: '/webhook'
            }
          },
          {
            id: 'http_request',
            type: 'http_request',
            position: { x: 300, y: 100 },
            config: {
              title: 'HTTP请求',
              method: 'POST',
              url: 'https://api.example.com/webhook',
              headers: { 'Content-Type': 'application/json' }
            }
          },
          {
            id: 'response',
            type: 'webhook_response',
            position: { x: 500, y: 100 },
            config: {
              title: '返回响应',
              statusCode: 200,
              response: { success: true }
            }
          }
        ],
        edges: [
          { from: 'webhook', to: 'http_request' },
          { from: 'http_request', to: 'response' }
        ]
      },
      {
        id: 'data-processing-pipeline',
        name: '数据处理管道',
        description: '自动化数据处理和转换',
        category: 'data',
        difficulty: 'intermediate',
        tags: ['data', 'processing', 'transformation'],
        nodes: [
          {
            id: 'start',
            type: 'start',
            position: { x: 100, y: 100 },
            config: { title: '开始' }
          },
          {
            id: 'database_query',
            type: 'database_query',
            position: { x: 300, y: 100 },
            config: {
              title: '查询数据库',
              query: 'SELECT * FROM users WHERE active = true'
            }
          },
          {
            id: 'transform',
            type: 'transform',
            position: { x: 500, y: 100 },
            config: {
              title: '数据转换',
              mapping: {
                'id': 'user_id',
                'name': 'full_name',
                'email': 'email_address'
              }
            }
          },
          {
            id: 'split',
            type: 'split',
            position: { x: 700, y: 100 },
            config: {
              title: '分割处理',
              batchSize: 100
            }
          },
          {
            id: 'end',
            type: 'end',
            position: { x: 900, y: 100 },
            config: { title: '结束' }
          }
        ],
        edges: [
          { from: 'start', to: 'database_query' },
          { from: 'database_query', to: 'transform' },
          { from: 'transform', to: 'split' },
          { from: 'split', to: 'end' }
        ]
      },
      {
        id: 'ai-design-workflow',
        name: 'AI设计工作流',
        description: '结合AI技术的设计自动化流程',
        category: 'ai',
        difficulty: 'advanced',
        tags: ['ai', 'design', 'automation'],
        nodes: [
          {
            id: 'start',
            type: 'start',
            position: { x: 100, y: 100 },
            config: { title: '开始' }
          },
          {
            id: 'ai_prompt',
            type: 'ai_processing',
            position: { x: 300, y: 100 },
            config: {
              title: 'AI生成设计概念',
              model: 'gpt-4',
              prompt: '生成一个现代化的网页设计方案',
              inputVariable: 'design_requirements'
            }
          },
          {
            id: 'photoshop',
            type: 'operation',
            position: { x: 500, y: 100 },
            config: {
              title: 'Photoshop处理',
              softwareId: 'photoshop',
              action: 'createDesign',
              parameters: { format: 'PSD', resolution: '1920x1080' }
            }
          },
          {
            id: 'validation',
            type: 'validation',
            position: { x: 700, y: 100 },
            config: {
              title: '质量验证',
              rules: [
                { field: 'resolution', type: 'number', min: 1920, required: true },
                { field: 'format', type: 'string', value: 'PSD', required: true }
              ]
            }
          },
          {
            id: 'end',
            type: 'end',
            position: { x: 900, y: 100 },
            config: { title: '完成' }
          }
        ],
        edges: [
          { from: 'start', to: 'ai_prompt' },
          { from: 'ai_prompt', to: 'photoshop' },
          { from: 'photoshop', to: 'validation' },
          { from: 'validation', to: 'end' }
        ]
      }
    ];

    let filteredTemplates = templates;
    if (category) {
      filteredTemplates = templates.filter(t => t.category === category);
    }

    res.json({
      success: true,
      message: '获取N8N工作流模板成功',
      data: filteredTemplates
    });
  } catch (error) {
    logger.error('获取N8N工作流模板失败:', error);
    res.status(500).json({
      success: false,
      message: '获取N8N工作流模板失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/n8n-workflows/node-types
 * @desc 获取支持的节点类型
 * @access Private
 */
router.get('/node-types', async (req, res) => {
  try {
    const nodeTypes = [
      {
        type: 'webhook',
        displayName: 'Webhook',
        description: '接收HTTP请求触发工作流',
        group: 'trigger',
        version: 1,
        defaults: {
          name: 'Webhook',
          type: 'webhook',
          position: [100, 100],
          parameters: {
            httpMethod: 'POST',
            path: '',
            authentication: 'none'
          }
        },
        inputs: [],
        outputs: ['main']
      },
      {
        type: 'http_request',
        displayName: 'HTTP Request',
        description: '发送HTTP请求到外部API',
        group: 'transform',
        version: 1,
        defaults: {
          name: 'HTTP Request',
          type: 'http_request',
          position: [300, 100],
          parameters: {
            method: 'GET',
            url: '',
            headers: {},
            body: {}
          }
        },
        inputs: ['main'],
        outputs: ['main']
      },
      {
        type: 'schedule',
        displayName: 'Schedule Trigger',
        description: '定时触发工作流执行',
        group: 'trigger',
        version: 1,
        defaults: {
          name: 'Schedule',
          type: 'schedule',
          position: [100, 100],
          parameters: {
            cronExpression: '0 9 * * *',
            timezone: 'Asia/Shanghai'
          }
        },
        inputs: [],
        outputs: ['main']
      },
      {
        type: 'operation',
        displayName: 'Software Operation',
        description: '执行设计软件操作',
        group: 'action',
        version: 1,
        defaults: {
          name: 'Operation',
          type: 'operation',
          position: [300, 100],
          parameters: {
            softwareId: '',
            action: '',
            parameters: {}
          }
        },
        inputs: ['main'],
        outputs: ['main']
      },
      {
        type: 'ai_processing',
        displayName: 'AI Processing',
        description: '使用AI模型处理数据',
        group: 'transform',
        version: 1,
        defaults: {
          name: 'AI Processing',
          type: 'ai_processing',
          position: [300, 100],
          parameters: {
            model: 'gpt-4',
            prompt: '',
            input: ''
          }
        },
        inputs: ['main'],
        outputs: ['main']
      },
      {
        type: 'transform',
        displayName: 'Transform Data',
        description: '转换和处理数据结构',
        group: 'transform',
        version: 1,
        defaults: {
          name: 'Transform',
          type: 'transform',
          position: [300, 100],
          parameters: {
            mapping: {},
            filters: []
          }
        },
        inputs: ['main'],
        outputs: ['main']
      },
      {
        type: 'condition',
        displayName: 'IF/ELSE Condition',
        description: '基于条件分支执行',
        group: 'transform',
        version: 1,
        defaults: {
          name: 'Condition',
          type: 'condition',
          position: [300, 100],
          parameters: {
            condition: '',
            truePath: '',
            falsePath: ''
          }
        },
        inputs: ['main'],
        outputs: ['main', 'error']
      },
      {
        type: 'email',
        displayName: 'Send Email',
        description: '发送电子邮件通知',
        group: 'communication',
        version: 1,
        defaults: {
          name: 'Email',
          type: 'email',
          position: [500, 100],
          parameters: {
            to: '',
            subject: '',
            body: '',
            attachments: []
          }
        },
        inputs: ['main'],
        outputs: ['main']
      }
    ];

    res.json({
      success: true,
      message: '获取节点类型成功',
      data: nodeTypes
    });
  } catch (error) {
    logger.error('获取节点类型失败:', error);
    res.status(500).json({
      success: false,
      message: '获取节点类型失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 监听N8N服务事件
n8nService.on('workflowCompleted', (executionResult: any) => {
  logger.info(`N8N工作流完成: ${executionResult.executionId}`);
});

n8nService.on('webhookCreated', (webhookInfo: any) => {
  logger.info(`Webhook创建: ${webhookInfo.path}`);
});

n8nService.on('scheduleCreated', (scheduleInfo: any) => {
  logger.info(`定时任务创建: ${scheduleInfo.cronExpression}`);
});

export default router;
