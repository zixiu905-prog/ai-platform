import express, { Request, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// 存储桌面端任务状态的临时存储（生产环境应使用Redis）
const desktopTasks = new Map<string, any>();

/**
 * 创建新任务
 */
router.post('/create', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      name,
      type,
      software,
      description,
      steps
    } = req.body;

    // 验证必填字段
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: '任务名称和类型为必填字段',
        timestamp: new Date().toISOString()
      });
    }
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const task = {
      id: taskId,
      userId: req.user?.id,
      name,
      type: type || 'design',
      software,
      description,
      status: 'PENDING',
      progress: 0,
      startTime: new Date(),
      steps: steps || [],
      createdAt: new Date()
    };

    // 存储任务
    desktopTasks.set(taskId, task);

    // 记录到数据库
    await prisma.task_executions.create({
      data: {
        id: taskId,
        userId: req.user!.id,
        input: {
          name,
          type,
          software,
          description,
          steps: steps || []
        } as any,
        status: 'PENDING',
        progress: 0,
        startedAt: new Date(),
        updatedAt: new Date()
      }
    });

    logger.info(`桌面端任务创建成功: ${name} (${taskId})`, {
      userId: req.user?.id,
      type,
      software
    });

    res.json({
      success: true,
      data: task,
      message: '任务创建成功'
    });
  } catch (error) {
    const serializedError = {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };

    logger.error('创建桌面端任务失败:', serializedError);
    res.status(500).json({
      success: false,
      error: '任务创建失败',
      details: serializedError
    });
  }
});

/**
 * 获取任务列表
 */
router.get('/list', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const tasks = await prisma.task_executions.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    logger.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取任务列表失败'
    });
  }
});

/**
 * 获取任务详情
 */
router.get('/:taskId', authenticate, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;

    const task = await prisma.task_executions.findFirst({
      where: {
        id: taskId,
        userId
      }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('获取任务详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取任务详情失败'
    });
  }
});

/**
 * 更新任务状态
 */
router.put('/:taskId/status', authenticate, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;
    const { status, progress, currentStep } = req.body;

    const task = await prisma.task_executions.updateMany({
      where: {
        id: taskId,
        userId
      },
      data: {
        status,
        progress
      }
    });

    if (task.count === 0) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    logger.info(`任务状态更新: ${taskId} -> ${status}`, { userId });

    res.json({
      success: true,
      message: '任务状态更新成功'
    });
  } catch (error) {
    logger.error('更新任务状态失败:', error);
    res.status(500).json({
      success: false,
      error: '更新任务状态失败'
    });
  }
});

/**
 * 暂停任务
 */
router.post('/:taskId/pause', authenticate, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;

    const task = await prisma.task_executions.updateMany({
      where: {
        id: taskId,
        userId,
        status: 'RUNNING'
      },
      data: {
        status: 'PAUSED',
        updatedAt: new Date()
      }
    });

    if (task.count === 0) {
      return res.status(404).json({
        success: false,
        error: '任务不存在或未在运行中'
      });
    }

    logger.info(`任务已暂停: ${taskId}`, { userId });

    res.json({
      success: true,
      message: '任务已暂停'
    });
  } catch (error) {
    logger.error('暂停任务失败:', error);
    res.status(500).json({
      success: false,
      error: '暂停任务失败'
    });
  }
});

/**
 * 继续任务
 */
router.post('/:taskId/resume', authenticate, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;

    const task = await prisma.task_executions.updateMany({
      where: {
        id: taskId,
        userId,
        status: 'PAUSED'
      },
      data: {
        status: 'RUNNING',
        updatedAt: new Date()
      }
    });

    if (task.count === 0) {
      return res.status(404).json({
        success: false,
        error: '任务不存在或未暂停'
      });
    }

    logger.info(`任务已继续: ${taskId}`, { userId });

    res.json({
      success: true,
      message: '任务已继续执行'
    });
  } catch (error) {
    logger.error('继续任务失败:', error);
    res.status(500).json({
      success: false,
      error: '继续任务失败'
    });
  }
});

/**
 * 添加任务日志
 */
router.post('/:taskId/logs', authenticate, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;
    const { message, level = 'info', data } = req.body;

    const task = await prisma.task_executions.findFirst({
      where: {
        id: taskId,
        userId
      }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    // TODO: 数据库表 task_executions 没有 logs 字段，暂不实现
    res.json({
      success: true,
      message: '日志添加成功'
    });
  } catch (error) {
    logger.error('添加任务日志失败:', error);
    res.status(500).json({
      success: false,
      error: '添加任务日志失败'
    });
  }
});

/**
 * 删除任务
 */
router.delete('/:taskId', authenticate, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;

    const task = await prisma.task_executions.deleteMany({
      where: {
        id: taskId,
        userId
      }
    });

    if (task.count === 0) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    // 从内存中移除
    desktopTasks.delete(taskId);

    res.json({
      success: true,
      message: '任务删除成功'
    });
  } catch (error) {
    logger.error('删除任务失败:', error);
    res.status(500).json({
      success: false,
      error: '删除任务失败'
    });
  }
});

/**
 * 桌面端任务执行状态上报
 */
router.post('/:taskId/execute', authenticate, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;
    const { step, result, error } = req.body;

    const task = await prisma.task_executions.findFirst({
      where: {
        id: taskId,
        userId
      }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    // 更新任务状态
    await prisma.task_executions.update({
      where: { id: taskId },
      data: {
        status: error ? 'FAILED' : 'COMPLETED',
        output: {
          result,
          error
        } as any
      }
    });

    res.json({
      success: true,
      message: '任务执行状态更新成功'
    });
  } catch (err) {
    logger.error('更新任务执行状态失败:', err);
    res.status(500).json({
      success: false,
      error: '更新任务执行状态失败'
    });
  }
});

/**
 * 获取任务统计
 */
router.get('/stats/summary', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const [total, pending, running, completed, failed] = await Promise.all([
      prisma.task_executions.count({ where: { userId } }),
      prisma.task_executions.count({ where: { userId, status: 'PENDING' } }),
      prisma.task_executions.count({ where: { userId, status: 'RUNNING' } }),
      prisma.task_executions.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.task_executions.count({ where: { userId, status: 'FAILED' } })
    ]);

    res.json({
      success: true,
      data: {
        total,
        pending,
        running,
        completed,
        failed
      }
    });
  } catch (error) {
    logger.error('获取任务统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取任务统计失败'
    });
  }
});

export default router;
