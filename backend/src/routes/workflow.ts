import { prisma } from '../config/database';
import express from 'express';
import { authenticate, requireSubscription } from '../middleware/auth';
import { logger } from '../utils/logger';
import { UnifiedWorkflowService } from '../services/unifiedWorkflowService';
// import WORKFLOW_TEMPLATES from '../data/workflowTemplates';

const router = express.Router();

const workflowEngine = new UnifiedWorkflowService();

router.use(authenticate);

/**
 * @route GET /api/workflows
 * @desc 获取工作流列表
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { category, status } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const where: any = { authorId: userId };
    if (category) {
      where.category = category;
    }
    if (status) {
      where.status = status;
    }

    const workflows = await prisma.workflows.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      success: true,
      message: '获取工作流列表成功',
      data: workflows
    });
  } catch (error) {
    logger.error('获取工作流列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取工作流列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/workflows/templates
 * @desc 获取工作流模板列表
 * @access Private
 */
router.get('/templates', async (req, res) => {
  try {
    const { category } = req.query;

    // TODO: 模板功能暂未实现
    // let templates = Object.entries(WORKFLOW_TEMPLATES);

    const templateList: any[] = [];

    res.json({
      success: true,
      message: '获取工作流模板成功',
      data: templateList
    });
  } catch (error) {
    logger.error('获取工作流模板失败:', error);
    res.status(500).json({
      success: false,
      message: '获取工作流模板失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/workflows/:id
 * @desc 获取工作流详情
 * @access Private
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

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

    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    logger.error('获取工作流详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取工作流详情失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/workflows
 * @desc 创建工作流
 * @access Private
 */
router.post('/', requireSubscription('basic'), async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, description, category, definition, templateId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '工作流名称不能为空'
      });
    }

    let workflowData: any = {
      authorId: userId,
      name,
      description,
      category: category || 'custom',
      definition: JSON.stringify(definition),
      status: 'draft'
    };

    // TODO: 模板功能暂未实现
    // if (templateId && WORKFLOW_TEMPLATES[templateId]) {
    //   const template = WORKFLOW_TEMPLATES[templateId];
    //   workflowData = {
    //     ...workflowData,
    //     category: template.category,
    //     definition: JSON.stringify({
    //       nodes: template.nodes,
    //       edges: template.edges,
    //       variables: {}
    //     })
    //   };
    // }

    const workflow = await prisma.workflows.create({
      data: workflowData
    });

    res.json({
      success: true,
      message: '工作流创建成功',
      data: workflow
    });
  } catch (error) {
    logger.error('创建工作流失败:', error);
    res.status(500).json({
      success: false,
      message: '创建工作流失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route PUT /api/workflows/:id
 * @desc 更新工作流
 * @access Private
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { name, description, category, definition, status } = req.body;

    const workflow = await prisma.workflows.updateMany({
      where: {
        id,
        authorId: userId
      },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(definition && { definition: JSON.stringify(definition) }),
        ...(status && { status })
      }
    });

    if (workflow.count === 0) {
      return res.status(404).json({
        success: false,
        message: '工作流不存在'
      });
    }

    res.json({
      success: true,
      message: '工作流更新成功'
    });
  } catch (error) {
    logger.error('更新工作流失败:', error);
    res.status(500).json({
      success: false,
      message: '更新工作流失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route DELETE /api/workflows/:id
 * @desc 删除工作流
 * @access Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await prisma.workflows.deleteMany({
      where: {
        id,
        authorId: userId
      }
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: '工作流不存在'
      });
    }

    res.json({
      success: true,
      message: '工作流删除成功'
    });
  } catch (error) {
    logger.error('删除工作流失败:', error);
    res.status(500).json({
      success: false,
      message: '删除工作流失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/workflows/:id/execute
 * @desc 执行工作流
 * @access Private
 */
router.post('/:id/execute', requireSubscription('basic'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

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

    // 创建执行记录
    const execution = await prisma.task_executions.create({
      data: {
        id: `exec-${Date.now()}`,
        workflowId: id,
        userId,
        input: {},
        status: 'RUNNING',
        startedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // 异步执行工作流
    workflowEngine.executeWorkflow(id, userId)
      .then(result => {
        logger.info(`工作流执行完成: ${id}`, { userId, result });
      })
      .catch(err => {
        logger.error(`工作流执行失败: ${id}`, { userId, error: err });
      });

    res.json({
      success: true,
      message: '工作流执行已启动',
      data: {
        executionId: execution.id,
        status: execution.status
      }
    });
  } catch (error) {
    logger.error('执行工作流失败:', error);
    res.status(500).json({
      success: false,
      message: '执行工作流失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/workflows/:id/executions
 * @desc 获取工作流执行历史
 * @access Private
 */
router.get('/:id/executions', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { limit = 20, offset = 0 } = req.query;

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

    const [executions, total] = await Promise.all([
      prisma.task_executions.findMany({
        where: { workflowId: id },
        orderBy: { startedAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      }),
      prisma.task_executions.count({ where: { workflowId: id } })
    ]);

    res.json({
      success: true,
      data: {
        executions,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    logger.error('获取执行历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取执行历史失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/workflows/executions/:executionId
 * @desc 获取执行详情
 * @access Private
 */
router.get('/executions/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const userId = req.user?.id;

    const execution = await prisma.task_executions.findFirst({
      where: {
        id: executionId,
        userId
      }
    });

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: '执行记录不存在'
      });
    }

    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    logger.error('获取执行详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取执行详情失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
