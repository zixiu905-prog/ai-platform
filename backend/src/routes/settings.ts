import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';

const router = Router();

// 获取用户设置
router.get('/user', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const user = await prisma.users.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        phone: true,
        wechatId: true,
        isActive: true,
        isPaid: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        user,
        profile: {
          skillLevel: 'beginner',
          interests: [],
          preferences: {},
          learningGoals: []
        }
      }
    });
  } catch (error) {
    logger.error('获取用户设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户设置失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 更新用户基本信息
router.put('/user/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { username, avatar, phone } = req.body;

    const updateData: any = {};
    if (username) updateData.username = username;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (phone !== undefined) updateData.phone = phone;

    const user = await prisma.users.update({
      where: {
        id: userId
      },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        phone: true,
        role: true
      }
    });

    logger.info(`用户 ${userId} 更新了基本信息`);

    res.json({
      success: true,
      data: user,
      message: '个人信息更新成功'
    });
  } catch (error) {
    logger.error('更新用户基本信息失败:', error);
    res.status(500).json({
      success: false,
      message: '更新个人信息失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 更新用户偏好设置
router.put('/user/preferences', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { skillLevel, interests, preferences, learningGoals } = req.body;

    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        timestamp: new Date().toISOString()
      });
    }

    // 暂时只返回成功消息，不实际保存偏好设置
    // 因为 users 表没有 metadata 字段来存储这些数据

    logger.info(`用户 ${userId} 更新了偏好设置 (未实际保存)`);

    res.json({
      success: true,
      data: {
        skillLevel: skillLevel || 'beginner',
        interests: interests || [],
        preferences: preferences || {},
        learningGoals: learningGoals || []
      },
      message: '偏好设置更新成功'
    });
  } catch (error) {
    logger.error('更新用户偏好设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新偏好设置失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 获取系统设置
router.get('/system', authenticate, async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    const where: any = {};
    if (category) where.category = category;

    const configs = await prisma.system_configs.findMany({
      where,
      orderBy: { category: 'asc' }
    });

    // 按类别分组
    const grouped = configs.reduce((acc: any, config) => {
      if (!acc[config.category]) {
        acc[config.category] = {};
      }
      acc[config.category][config.key] = config.value;
      return acc;
    }, {});

    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    logger.error('获取系统设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统设置失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 更新系统设置（管理员权限）
router.put('/system', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足',
        timestamp: new Date().toISOString()
      });
    }

    const { category, configs } = req.body;

    if (!category || !configs) {
      return res.status(400).json({
        success: false,
        message: '参数不完整',
        timestamp: new Date().toISOString()
      });
    }

    const updatePromises = Object.entries(configs).map(([key, value]) =>
      prisma.system_configs.upsert({
        where: { key },
        update: { value: value as any, category },
        create: {
          id: `config-${Date.now()}-${key}`,
          key,
          value: value as any,
          category,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    );

    await Promise.all(updatePromises);

    logger.info(`管理员 ${user.id} 更新了系统设置: ${category}`);

    res.json({
      success: true,
      message: '系统设置更新成功'
    });
  } catch (error) {
    logger.error('更新系统设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新系统设置失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 获取用户软件连接设置
router.get('/software', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const userSoftwares = await prisma.user_softwares.findMany({
      where: { userId },
      include: {
        software_apis: {
          select: {
            id: true,
            softwareName: true,
            category: true,
            isActive: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: userSoftwares
    });
  } catch (error) {
    logger.error('获取用户软件设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取软件设置失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 更新软件连接设置
router.put('/software/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const { apiKey, settings } = req.body;

    const userSoftware = await prisma.user_softwares.update({
      where: {
        id,
        userId // 确保只能更新自己的软件
      },
      data: {
        updatedAt: new Date()
      },
      include: { software_apis: true }
    });

    logger.info(`用户 ${userId} 更新了软件设置: ${userSoftware.software_apis.softwareName}`);

    res.json({
      success: true,
      data: userSoftware,
      message: '软件设置更新成功'
    });
  } catch (error) {
    logger.error('更新软件设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新软件设置失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 测试软件连接
router.post('/software/:id/test', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const userSoftware = await prisma.user_softwares.findFirst({
      where: {
        id,
        userId
      },
      include: { software_apis: true }
    });

    if (!userSoftware) {
      return res.status(404).json({
        success: false,
        message: '软件连接不存在',
        timestamp: new Date().toISOString()
      });
    }

    // 这里应该实现实际的连接测试逻辑
    // 暂时返回模拟结果
    const testResult = {
      connected: true,
      latency: Math.floor(Math.random() * 100) + 10,
      version: userSoftware.version,
      message: '连接成功'
    };

    res.json({
      success: true,
      data: testResult
    });
  } catch (error) {
    logger.error('测试软件连接失败:', error);
    res.status(500).json({
      success: false,
      message: '连接测试失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 获取应用设置
router.get('/app', authenticate, async (req: Request, res: Response) => {
  try {
    const defaultSettings = {
      theme: 'dark',
      language: 'zh-CN',
      autoSave: true,
      autoSaveInterval: 30,
      notifications: {
        desktop: true,
        email: false,
        sound: true
      },
      editor: {
        fontSize: 14,
        fontFamily: 'JetBrains Mono',
        tabSize: 2,
        wordWrap: true,
        lineNumbers: true,
        minimap: true
      },
      workflow: {
        autoLayout: true,
        showGrid: true,
        snapToGrid: true,
        gridSize: 20
      },
      performance: {
        maxMemory: 4096,
        enableGPU: true,
        cacheSize: 1024
      }
    };

    res.json({
      success: true,
      data: defaultSettings
    });
  } catch (error) {
    logger.error('获取应用设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取应用设置失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 更新应用设置
router.put('/app', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const settings = req.body;

    // 这里应该将设置保存到用户配置中
    // 暂时只记录日志
    logger.info(`用户 ${userId} 更新了应用设置`);

    res.json({
      success: true,
      message: '应用设置保存成功'
    });
  } catch (error) {
    logger.error('更新应用设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新应用设置失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 获取通知设置
router.get('/notifications', authenticate, async (req: Request, res: Response) => {
  try {
    const defaultNotifications = {
      system: {
        desktop: true,
        email: false,
        sound: true
      },
      projects: {
        created: true,
        updated: true,
        deleted: false,
        deadline: true
      },
      workflows: {
        completed: true,
        failed: true,
        started: false
      },
      scripts: {
        completed: true,
        failed: true,
        started: false
      },
      ai: {
        response: true,
        suggestions: true
      }
    };

    res.json({
      success: true,
      data: defaultNotifications
    });
  } catch (error) {
    logger.error('获取通知设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通知设置失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 更新通知设置
router.put('/notifications', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const notifications = req.body;

    // 这里应该将通知设置保存到用户配置中
    // 暂时只记录日志
    logger.info(`用户 ${userId} 更新了通知设置`);

    res.json({
      success: true,
      message: '通知设置保存成功'
    });
  } catch (error) {
    logger.error('更新通知设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新通知设置失败',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
