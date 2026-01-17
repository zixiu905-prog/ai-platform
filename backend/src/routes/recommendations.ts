import express from 'express';
import { prisma } from '../config/database';
import { authenticate, requireSubscription } from '../middleware/auth';
import { recommendationService } from '../services/recommendationService';
import { logger } from '../utils/logger';

type RecommendationType = 'CONTENT' | 'USER' | 'SCRIPT' | 'TEMPLATE' | 'AI_MODEL';

const RecommendationTypes: RecommendationType[] = ['CONTENT', 'USER', 'SCRIPT', 'TEMPLATE', 'AI_MODEL'];

const router = express.Router();

// 错误处理辅助函数
const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : '未知错误';
};

// 安全获取用户ID的辅助函数
const getUserId = (req: express.Request): string => {
  const userId = (req as any).user?.id;
  if (!userId) {
    throw new Error('用户未认证');
  }
  return userId;
};

// 所有推荐路由都需要认证
router.use(authenticate);

/**
 * @route GET /api/recommendations
 * @desc 获取用户推荐
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      type,
      limit = 5,
      context
    } = req.query;

    const recommendations = await recommendationService.getRecommendations(
      userId,
      type as RecommendationType,
      Number(limit),
      context ? JSON.parse(context as string) : undefined
    );

    res.json({
      success: true,
      message: '获取推荐成功',
      data: {
        recommendations,
        total: recommendations.length
      }
    });
  } catch (error) {
    logger.error('获取推荐失败:', error);
    res.status(500).json({
      success: false,
      message: '获取推荐失败',
      error: getErrorMessage(error)
    });
  }
});

/**
 * @route GET /api/recommendations/types
 * @desc 获取推荐类型列表
 * @access Private
 */
router.get('/types', async (req, res) => {
  try {
    const types = RecommendationTypes;

    res.json({
      success: true,
      message: '获取推荐类型成功',
      data: { types }
    });
  } catch (error) {
    logger.error('获取推荐类型失败:', error);
    res.status(500).json({
      success: false,
      message: '获取推荐类型失败',
      error: getErrorMessage(error)
    });
  }
});

/**
 * @route POST /api/recommendations/feedback
 * @desc 提交推荐反馈
 * @access Private
 */
router.post('/feedback', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id, feedback, rating, comment } = req.body;

    if (!id || !feedback) {
      return res.status(400).json({
        success: false,
        message: '推荐ID和反馈类型不能为空'
      });
    }

    if (!['positive', 'negative', 'neutral'].includes(feedback)) {
      return res.status(400).json({
        success: false,
        message: '无效的反馈类型'
      });
    }

    await recommendationService.recordFeedback(
      userId,
      id,
      feedback as 'positive' | 'negative'
    );

    // 更新推荐记录
    await prisma.recommendations.updateMany({
      where: {
        userId,
        id
      },
      data: {
        isRead: feedback === 'positive'
      }
    } as any);

    res.json({
      success: true,
      message: '推荐反馈提交成功'
    });
  } catch (error) {
    logger.error('提交推荐反馈失败:', error);
    res.status(500).json({
      success: false,
      message: '提交推荐反馈失败',
      error: getErrorMessage(error)
    });
  }
});

/**
 * @route POST /api/recommendations/viewed
 * @desc 标记推荐为已查看
 * @access Private
 */
router.post('/viewed', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: '推荐ID列表必须是数组'
      });
    }

    await prisma.recommendations.updateMany({
      where: {
        userId,
        id: {
          in: ids
        },
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    res.json({
      success: true,
      message: '标记为已查看成功'
    });
  } catch (error) {
    logger.error('标记推荐已查看失败:', error);
    res.status(500).json({
      success: false,
      message: '标记推荐已查看失败',
      error: getErrorMessage(error)
    });
  }
});

/**
 * @route POST /api/recommendations/accept
 * @desc 接受推荐
 * @access Private
 */
router.post('/accept', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: '推荐ID不能为空'
      });
    }

    await prisma.recommendations.updateMany({
      where: {
        userId,
        id
      },
      data: {
        isRead: true
      }
    });

    res.json({
      success: true,
      message: '接受推荐成功'
    });
  } catch (error) {
    logger.error('接受推荐失败:', error);
    res.status(500).json({
      success: false,
      message: '接受推荐失败',
      error: getErrorMessage(error)
    });
  }
});

/**
 * @route POST /api/recommendations/activity
 * @desc 记录用户活动
 * @access Private
 */
router.post('/activity', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { action, target, targetType, metadata } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        message: '活动类型不能为空'
      });
    }

    await recommendationService.recordUserBehavior(
      userId,
      action,
      target || '',
      metadata
    );

    res.json({
      success: true,
      message: '用户活动记录成功'
    });
  } catch (error) {
    logger.error('记录用户活动失败:', error);
    res.status(500).json({
      success: false,
      message: '记录用户活动失败',
      error: getErrorMessage(error)
    });
  }
});

/**
 * @route GET /api/recommendations/history
 * @desc 获取推荐历史
 * @access Private
 */
router.get('/history', async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      page = 1,
      limit = 20,
      type,
      feedback,
      startDate,
      endDate
    } = req.query;

    const where: any = { userId };
    if (type) {
      where.type = type;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [recommendations, total] = await Promise.all([
      prisma.recommendations.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.recommendations.count({ where })
    ]);

    res.json({
      success: true,
      message: '获取推荐历史成功',
      data: {
        recommendations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error('获取推荐历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取推荐历史失败',
      error: getErrorMessage(error)
    });
  }
});

/**
 * @route GET /api/recommendations/stats
 * @desc 获取推荐统计信息
 * @access Private
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = getUserId(req);

    const [
      totalRecommendations,
      viewedRecommendations,
      acceptedRecommendations,
      recentFeedback
    ] = await Promise.all([
      prisma.recommendations.count({
        where: { userId }
      }),
      prisma.recommendations.count({
        where: {
          userId,
          isRead: true
        }
      }),
      prisma.recommendations.count({
        where: {
          userId,
          isRead: true
        }
      }),
      prisma.recommendations.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // 按类型统计
    const typeStats = await prisma.recommendations.groupBy({
      by: ['type'],
      where: { userId },
      _count: { type: true }
    });

    // 按月份统计
    const monthlyStats = await prisma.recommendations.groupBy({
      by: ['createdAt'],
      where: {
        userId,
        createdAt: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
        }
      },
      _count: { createdAt: true }
    });

    res.json({
      success: true,
      message: '获取推荐统计成功',
      data: {
        total: totalRecommendations,
        viewed: viewedRecommendations,
        accepted: acceptedRecommendations,
        viewRate: totalRecommendations > 0 ? (viewedRecommendations / totalRecommendations) * 100 : 0,
        acceptanceRate: viewedRecommendations > 0 ? (acceptedRecommendations / viewedRecommendations) * 100 : 0,
        typeStats: typeStats.map((stat: any) => ({
          type: stat.type,
          count: stat._count.type
        })),
        recentFeedback,
        monthlyStats
      }
    });
  } catch (error) {
    logger.error('获取推荐统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取推荐统计失败',
      error: getErrorMessage(error)
    });
  }
});

/**
 * @route PUT /api/recommendations/config
 * @desc 更新推荐配置
 * @access Private (仅管理员)
 */
router.put('/config', requireSubscription('admin'), async (req, res) => {
  try {
    const config = req.body;

    recommendationService.updateConfig(config);

    res.json({
      success: true,
      message: '推荐配置更新成功',
      data: recommendationService.getConfig()
    });
  } catch (error) {
    logger.error('更新推荐配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新推荐配置失败',
      error: getErrorMessage(error)
    });
  }
});

/**
 * @route GET /api/recommendations/config
 * @desc 获取推荐配置
 * @access Private (仅管理员)
 */
router.get('/config', requireSubscription('admin'), async (req, res) => {
  try {
    const config = recommendationService.getConfig();

    res.json({
      success: true,
      message: '获取推荐配置成功',
      data: config
    });
  } catch (error) {
    logger.error('获取推荐配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取推荐配置失败',
      error: getErrorMessage(error)
    });
  }
});

/**
 * @route POST /api/recommendations/cleanup
 * @desc 清理过期推荐
 * @access Private (仅管理员)
 */
router.post('/cleanup', requireSubscription('admin'), async (req, res) => {
  try {
    await recommendationService.cleanupExpiredRecommendations();

    res.json({
      success: true,
      message: '清理过期推荐成功'
    });
  } catch (error) {
    logger.error('清理过期推荐失败:', error);
    res.status(500).json({
      success: false,
      message: '清理过期推荐失败',
      error: getErrorMessage(error)
    });
  }
});

/**
 * @route GET /api/recommendations/user-profile
 * @desc 获取用户画像
 * @access Private
 * 注释掉，因为userProfile表不存在
 */
// router.get('/user-profile', async (req, res) => {
//   try {
//     const userId = getUserId(req);

//     let profile = await prisma.userProfile.findUnique({
//       where: { userId }
//     });

//     if (!profile) {
//       // 创建默认用户画像
//       profile = await prisma.userProfile.create({
//         data: {
//           userId,
//           skillLevel: 'beginner',
//           interests: [],
//           preferences: {},
//           learningGoals: []
//         }
//       });
//     }

//     res.json({
//       success: true,
//       message: '获取用户画像成功',
//       data: profile
//     });
//   } catch (error) {
//     logger.error('获取用户画像失败:', error);
//     res.status(500).json({
//       success: false,
//       message: '获取用户画像失败',
//       error: getErrorMessage(error)
//     });
//   }
// });

/**
 * @route PUT /api/recommendations/user-profile
 * @desc 更新用户画像
 * @access Private
 * 注释掉，因为userProfile表不存在
 */
// router.put('/user-profile', async (req, res) => {
//   try {
//     const userId = getUserId(req);
//     const { skillLevel, interests, preferences, learningGoals } = req.body;

//     const profile = await prisma.userProfile.upsert({
//       where: { userId },
//       update: {
//         skillLevel,
//         interests,
//         preferences,
//         learningGoals,
//         lastUpdated: new Date()
//       },
//       create: {
//         userId,
//         skillLevel: skillLevel || 'beginner',
//         interests: interests || [],
//         preferences: preferences || {},
//         learningGoals: learningGoals || []
//       }
//     });

//     // 清空推荐服务缓存以重新生成画像
//     (recommendationService as any).clearCache();

//     res.json({
//       success: true,
//       message: '更新用户画像成功',
//       data: profile
//     });
//   } catch (error) {
//     logger.error('更新用户画像失败:', error);
//     res.status(500).json({
//       success: false,
//       message: '更新用户画像失败',
//       error: getErrorMessage(error)
//     });
//   }
// });

export default router;
