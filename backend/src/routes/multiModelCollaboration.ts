import express, { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { multiModelCoordinatorService } from '../services/multiModelCoordinatorService';
import { authenticate, authorize } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// 管理员认证中间件
const adminAuth = [authenticate, authorize(['ADMIN', 'SUPER_ADMIN'])];

/**
 * 执行多模型协作任务
 */
router.post('/execute', adminAuth, [
  body('input').notEmpty().withMessage('输入内容不能为空'),
  body('options').optional().isObject().withMessage('选项必须是对象'),
  body('model').optional().isString().withMessage('模型名称必须是字符串')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (errors.isEmpty() === false) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { input, options, model } = req.body;

    const result = await multiModelCoordinatorService.executeCollaborationTask({
      input,
      options,
      model
    });

    const analysis = await multiModelCoordinatorService.analyzeTaskComplexity({ input, options });
    const strategy = await multiModelCoordinatorService.selectOptimalStrategy(analysis);

    res.json({
      success: true,
      data: {
        result,
        strategy: strategy.name,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('多模型协作任务执行失败:', error);
    res.status(500).json({
      success: false,
      error: '协作任务执行失败',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 获取协作统计信息
 */
router.get('/stats', adminAuth, async (req: Request, res: Response) => {
  try {
    const stats = await multiModelCoordinatorService.getCollaborationStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('获取协作统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计信息失败',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 获取可用策略列表
 */
router.get('/strategies', adminAuth, async (req: Request, res: Response) => {
  try {
    const strategies = await multiModelCoordinatorService.getAvailableStrategies();

    res.json({
      success: true,
      data: {
        strategies,
        count: strategies.length
      }
    });
  } catch (error) {
    logger.error('获取策略列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取策略列表失败',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 更新协作策略
 */
router.post('/strategies/update', adminAuth, [
  body('strategies').isArray().withMessage('策略必须是数组'),
  body('strategies.*.name').notEmpty().withMessage('策略名称不能为空'),
  body('strategies.*.primaryProvider').isIn(['zhipu', 'doubao']).withMessage('主要提供商必须是zhipu或doubao'),
  body('strategies.*.fallbackProvider').optional().isIn(['zhipu', 'doubao']).withMessage('备用提供商必须是zhipu或doubao')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (errors.isEmpty() === false) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { strategies } = req.body;

    await multiModelCoordinatorService.updateCollaborationStrategies(strategies);

    res.json({
      success: true,
      message: '协作策略更新成功',
      data: {
        updatedCount: strategies.length,
        strategies,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('更新协作策略失败:', error);
    res.status(500).json({
      success: false,
      error: '更新策略失败',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 模拟任务复杂度分析
 */
router.post('/analyze', adminAuth, [
  body('input').notEmpty().withMessage('输入内容不能为空'),
  body('options').optional().isObject().withMessage('选项必须是对象')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (errors.isEmpty() === false) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { input, options } = req.body;

    const analysis = await multiModelCoordinatorService.analyzeTaskComplexity({
      input,
      options
    });

    const strategy = await multiModelCoordinatorService.selectOptimalStrategy(analysis);

    const allStrategies = await multiModelCoordinatorService.getAvailableStrategies();

    res.json({
      success: true,
      data: {
        analysis,
        recommendedStrategy: strategy,
        allStrategies
      }
    });
  } catch (error) {
    logger.error('任务复杂度分析失败:', error);
    res.status(500).json({
      success: false,
      error: '分析失败',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
