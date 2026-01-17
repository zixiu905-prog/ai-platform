import express from 'express';
import { paymentReminderScheduler } from '../services/paymentReminderScheduler';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * POST /api/payment-reminder-scheduler/start
 * 启动定时任务
 */
router.post('/start', async (req: express.Request, res: express.Response) => {
  try {
    paymentReminderScheduler.start();

    res.json({
      success: true,
      message: 'Payment reminder scheduler started successfully',
      data: paymentReminderScheduler.getStatus()
    });
  } catch (error) {
    logger.error('Failed to start payment reminder scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start payment reminder scheduler',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/payment-reminder-scheduler/stop
 * 停止定时任务
 */
router.post('/stop', async (req: express.Request, res: express.Response) => {
  try {
    paymentReminderScheduler.stop();

    res.json({
      success: true,
      message: 'Payment reminder scheduler stopped successfully',
      data: paymentReminderScheduler.getStatus()
    });
  } catch (error) {
    logger.error('Failed to stop payment reminder scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop payment reminder scheduler',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/payment-reminder-scheduler/execute
 * 手动执行任务
 */
router.post('/execute', async (req: express.Request, res: express.Response) => {
  try {
    const result = await paymentReminderScheduler.executeNow();

    res.json({
      success: true,
      message: 'Payment reminder task executed manually',
      data: result
    });
  } catch (error) {
    logger.error('Failed to execute payment reminder task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute payment reminder task',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/payment-reminder-scheduler/status
 * 获取任务状态
 */
router.get('/status', async (req: express.Request, res: express.Response) => {
  try {
    const status = paymentReminderScheduler.getStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get scheduler status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduler status',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/payment-reminder-scheduler/settings
 * 更新定时任务设置
 */
router.put('/settings', async (req: express.Request, res: express.Response) => {
  try {
    const { enabled, threshold, schedule } = req.body;

    // 验证cron表达式
    if (schedule && !isValidCron(schedule)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cron schedule format',
        timestamp: new Date().toISOString()
      });
    }

    await paymentReminderScheduler.updateSettings({
      enabled,
      threshold,
      schedule
    });

    res.json({
      success: true,
      message: 'Payment reminder scheduler settings updated successfully',
      data: paymentReminderScheduler.getStatus()
    });
  } catch (error) {
    logger.error('Failed to update scheduler settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update scheduler settings',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/payment-reminder-scheduler/statistics
 * 获取统计信息
 */
router.get('/statistics', async (req: express.Request, res: express.Response) => {
  try {
    const statistics = await paymentReminderScheduler.getStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Failed to get statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/payment-reminder-scheduler/history
 * 获取任务执行历史
 */
router.get('/history', async (req: express.Request, res: express.Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const history = await paymentReminderScheduler.getExecutionHistory(limit);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Failed to get execution history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get execution history',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 验证cron表达式
 */
function isValidCron(cronExpression: string): boolean {
  // 基本的cron表达式验证
  // 格式: * * * * * (分 时 日 月 周)
  const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|(\*\/[0-9]+)) (\*|([0-9]|1[0-9]|2[0-3])|(\*\/[0-9]+)) (\*|([1-9]|[12][0-9]|3[0-1])|(\*\/[0-9]+)) (\*|([1-9]|1[0-2])|(\*\/[0-9]+)) (\*|([0-6])|(\*\/[0-9]+))$/;
  return cronRegex.test(cronExpression);
}

export default router;
