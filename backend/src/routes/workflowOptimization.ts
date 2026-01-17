import express from 'express';
import { authenticate, requireSubscription } from '../middleware/auth';
import { UnifiedWorkflowService } from '../services/unifiedWorkflowService';
import { logger } from '../utils/logger';

const router = express.Router();
const optimizationService = new UnifiedWorkflowService();

// 所有工作流优化路由都需要认证
router.use(authenticate);
router.use(requireSubscription('basic'));

/**
 * 自动组合工作流
 */
router.post('/auto-compose', async (req, res) => {
  try {
    const { requirement, availableScripts, preferredAI } = req.body;
    const userId = req.user!.id;

    if (!requirement) {
      return res.status(400).json({ error: '需求描述不能为空' });
    }

    const workflow = await optimizationService.autoComposeWorkflow(
      requirement,
      userId,
      { availableScripts, preferredAI }
    );

    res.json({
      success: true,
      data: workflow,
      message: '工作流自动组合成功'
    });
  } catch (error) {
    logger.error('自动组合工作流失败:', error);
    res.status(500).json({
      error: '工作流自动组合失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取工作流优化建议
 */
router.get('/suggestions/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const userId = req.user!.id;

    // 验证工作流所有权
    const workflow = await optimizationService.getWorkflowById(workflowId);
    if (!workflow || workflow.authorId !== userId) {
      return res.status(403).json({ error: '无权访问此工作流' });
    }

    const suggestions = await optimizationService.getOptimizationSuggestions(workflowId);

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    logger.error('获取优化建议失败:', error);
    res.status(500).json({ error: '获取优化建议失败' });
  }
});

/**
 * 智能推荐工作流
 */
router.post('/recommendations', async (req, res) => {
  try {
    const { userRequirement } = req.body;
    const userId = req.user!.id;

    if (!userRequirement) {
      return res.status(400).json({ error: '需求描述不能为空' });
    }

    const recommendations = await optimizationService.recommendWorkflows(
      userId,
      userRequirement
    );

    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length
    });
  } catch (error) {
    logger.error('获取工作流推荐失败:', error);
    res.status(500).json({ error: '获取推荐失败' });
  }
});

/**
 * 保存工作流执行结果并优化
 */
router.post('/save-execution/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { executionResult, tokenUsage, executionTime } = req.body;
    const userId = req.user!.id;

    await optimizationService.autoSaveAndOptimizeWorkflow(
      workflowId,
      userId,
      { result: executionResult, tokenUsage, executionTime }
    );

    res.json({
      success: true,
      message: '执行结果已保存并优化'
    });
  } catch (error) {
    logger.error('保存执行结果失败:', error);
    res.status(500).json({ error: '保存执行结果失败' });
  }
});

export default router;
