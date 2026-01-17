import express from 'express';
import { authenticate, requireSubscription } from '../middleware/auth';
import { logger } from '../utils/logger';
import { UnifiedWorkflowService } from '../services/unifiedWorkflowService';

const router = express.Router();
const monitorService = new UnifiedWorkflowService();

router.use(authenticate);

/**
 * @route GET /api/workflow-monitoring/active
 * @desc 获取活跃的工作流监控
 * @access Private
 */
router.get('/active', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 获取用户的所有工作流
    const userWorkflows = await monitorService.getWorkflowsByAuthor(userId);
    
    // 获取活跃执行的工作流
    const activeMonitors = [];
    for (const workflow of userWorkflows) {
      const executions = await monitorService.getRecentExecutions(workflow.id, 10);
      const activeExecutions = executions.filter((e: any) => e.status === 'RUNNING');
      if (activeExecutions.length > 0) {
        activeMonitors.push({
          workflowId: workflow.id,
          workflowName: workflow.name,
          activeExecutions: activeExecutions.length,
          lastExecution: executions[0]
        });
      }
    }

    res.json({
      success: true,
      message: '获取活跃监控成功',
      data: activeMonitors
    });
  } catch (error) {
    logger.error('获取活跃监控失败:', error);
    res.status(500).json({
      success: false,
      message: '获取活跃监控失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/workflow-monitoring/status/:executionId
 * @desc 获取指定执行监控状态
 * @access Private
 */
router.get('/status/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const monitor = await monitorService.getExecutionStatus(executionId);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: '监控记录不存在'
      });
    }

    // 验证用户权限（需要获取工作流并检查authorId）
    const workflow = await monitorService.getWorkflowById(monitor.workflowId || '');
    if (!workflow || workflow.authorId !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权访问此监控记录'
      });
    }

    res.json({
      success: true,
      data: monitor
    });
  } catch (error) {
    logger.error('获取执行状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取执行状态失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/workflow-monitoring/alerts
 * @desc 创建监控告警
 * @access Private
 */
router.post('/alerts', requireSubscription('pro'), async (req, res) => {
  try {
    const userId = req.user?.id;
    const { workflowId, condition, threshold, notificationMethod } = req.body;

    const alert = await monitorService.createAlert(workflowId, {
      condition,
      threshold,
      notificationMethod
    });

    res.json({
      success: true,
      message: '创建告警成功',
      data: alert
    });
  } catch (error) {
    logger.error('创建告警失败:', error);
    res.status(500).json({
      success: false,
      message: '创建告警失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/workflow-monitoring/alerts
 * @desc 获取用户告警列表
 * @access Private
 */
router.get('/alerts', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }
    const { limit = 20, offset = 0 } = req.query;

    // 获取用户的所有工作流
    const userWorkflows = await monitorService.getWorkflowsByAuthor(userId);
    const alerts: any[] = [];

    // 遍历工作流获取告警
    for (const workflow of userWorkflows) {
      const workflowAlerts = await monitorService.getAlerts(workflow.id);
      alerts.push(...workflowAlerts);
    }

    const paginatedAlerts = alerts.slice(
      parseInt(offset as string),
      parseInt(offset as string) + parseInt(limit as string)
    );

    res.json({
      success: true,
      message: '获取告警列表成功',
      data: paginatedAlerts
    });
  } catch (error) {
    logger.error('获取告警列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取告警列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route DELETE /api/workflow-monitoring/alerts/:alertId
 * @desc 删除告警
 * @access Private
 */
router.delete('/alerts/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;

    const result = await monitorService.deleteAlert(alertId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: '告警不存在'
      });
    }

    res.json({
      success: true,
      message: '删除告警成功'
    });
  } catch (error) {
    logger.error('删除告警失败:', error);
    res.status(500).json({
      success: false,
      message: '删除告警失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/workflow-monitoring/statistics
 * @desc 获取监控统计信息
 * @access Private
 */
router.get('/statistics', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }
    const { timeRange = '24h' } = req.query;

    // 获取用户的所有工作流
    const userWorkflows = await monitorService.getWorkflowsByAuthor(userId);
    
    // 汇总所有工作流的统计
    let totalExecutions = 0;
    let successfulExecutions = 0;
    let failedExecutions = 0;
    let avgExecutionTime = 0;

    for (const workflow of userWorkflows) {
      const stats = await monitorService.getWorkflowStats(workflow.id);
      if (stats) {
        totalExecutions += stats.totalExecutions || 0;
        successfulExecutions += stats.successfulExecutions || 0;
        failedExecutions += stats.failedExecutions || 0;
        avgExecutionTime += stats.avgExecutionTime || 0;
      }
    }

    avgExecutionTime = userWorkflows.length > 0 ? avgExecutionTime / userWorkflows.length : 0;

    const statistics = {
      totalWorkflows: userWorkflows.length,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      avgExecutionTime,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions * 100).toFixed(2) : '0.00'
    };

    res.json({
      success: true,
      message: '获取统计信息成功',
      data: statistics
    });
  } catch (error) {
    logger.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
