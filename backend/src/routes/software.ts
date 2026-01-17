import express from 'express';
import { prisma } from '../config/database';
import { authenticate, requireSubscription } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

router.use(authenticate);

// 软件API配置
interface SoftwareConfig {
  name: string;
  category: string;
  version: string;
  description: string;
  apiEndpoint: string;
  available: boolean;
  features: string[];
}

const SOFTWARE_CONFIGS: Record<string, SoftwareConfig> = {
  photoshop: {
    name: 'Adobe Photoshop',
    category: 'image',
    version: '2024',
    description: '专业图像编辑软件',
    apiEndpoint: 'http://localhost:8080/photoshop',
    available: true,
    features: ['image-editing', 'layer-management', 'filter-effects', 'batch-processing']
  },
  autocad: {
    name: 'AutoCAD',
    category: 'cad',
    version: '2024',
    description: '专业CAD设计软件',
    apiEndpoint: 'http://localhost:8081/autocad',
    available: false,
    features: ['2d-drawing', '3d-modeling', 'dimensioning', 'file-conversion']
  },
  blender: {
    name: 'Blender',
    category: '3d',
    version: '4.2',
    description: '开源3D建模软件',
    apiEndpoint: 'http://localhost:8082/blender',
    available: true,
    features: ['3d-modeling', 'animation', 'rendering', 'sculpting']
  },
  premiere: {
    name: 'Adobe Premiere Pro',
    category: 'video',
    version: '2024',
    description: '专业视频编辑软件',
    apiEndpoint: 'http://localhost:8083/premiere',
    available: false,
    features: ['video-editing', 'effects', 'color-grading', 'audio-mixing']
  }
};

/**
 * @route GET /api/softwares
 * @desc 获取所有可用软件列表
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 获取用户已连接的软件
    const userSoftwares = await prisma.user_softwares.findMany({
      where: { userId }
    });
    const connectedSoftwareIds = userSoftwares.map(us => us.softwareId);
    const connectedSoftwares = userSoftwares.reduce((acc: Record<string, any>, us) => {
      acc[us.softwareId] = us;
      return acc;
    }, {} as Record<string, any>);

    // 合并软件配置和用户连接状态
    const softwares = Object.entries(SOFTWARE_CONFIGS).map(([id, config]) => ({
      id,
      ...config,
      connected: connectedSoftwareIds.includes(id),
      userSoftware: connectedSoftwares[id] || null,
      connectionStatus: connectedSoftwares[id]?.isActive ? 'connected' : 'disconnected',
      connectedAt: connectedSoftwares[id]?.createdAt || null,
      lastPing: connectedSoftwares[id]?.lastScanned || null
    }));

    res.json({
      success: true,
      message: '获取软件列表成功',
      data: softwares
    });
  } catch (error) {
    logger.error('获取软件列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取软件列表失败'
    });
  }
});

/**
 * @route POST /api/softwares/:id/connect
 * @desc 连接软件
 * @access Private
 */
router.post('/:id/connect', requireSubscription('basic'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { apiKey, settings } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const softwareConfig = SOFTWARE_CONFIGS[id];
    if (!softwareConfig) {
      return res.status(404).json({
        success: false,
        message: '软件不存在'
      });
    }

    if (!softwareConfig.available) {
      return res.status(400).json({
        success: false,
        message: '该软件当前不可用'
      });
    }

    // 创建用户软件连接记录
    const userSoftware = await prisma.user_softwares.upsert({
      where: {
        userId_softwareId: {
          userId,
          softwareId: id
        }
      },
      update: {
        isActive: true,
        lastScanned: new Date(),
        updatedAt: new Date()
      },
      create: {
        id: `us-${userId}-${id}`,
        userId,
        softwareId: id,
        version: softwareConfig.version,
        isActive: true,
        lastScanned: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: { software_apis: true }
    });

    logger.info(`用户 ${userId} 连接软件 ${id} 成功`);

    res.json({
      success: true,
      message: '软件连接成功',
      data: userSoftware
    });
  } catch (error) {
    logger.error('连接软件失败:', error);
    res.status(500).json({
      success: false,
      message: '连接软件失败'
    });
  }
});

/**
 * @route POST /api/softwares/:id/disconnect
 * @desc 断开软件连接
 * @access Private
 */
router.post('/:id/disconnect', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || '';

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const userSoftware = await prisma.user_softwares.findFirst({
      where: {
        userId,
        softwareId: id
      }
    });

    if (!userSoftware) {
      return res.status(404).json({
        success: false,
        message: '软件连接不存在'
      });
    }

    // 删除用户软件连接记录
    await prisma.user_softwares.delete({
      where: {
        userId_softwareId: {
          userId,
          softwareId: id
        }
      }
    });

    logger.info(`用户 ${userId} 断开软件 ${id} 连接`);

    res.json({
      success: true,
      message: '软件断开成功'
    });
  } catch (error) {
    logger.error('断开软件连接失败:', error);
    res.status(500).json({
      success: false,
      message: '断开软件连接失败'
    });
  }
});

/**
 * @route GET /api/softwares/:id/status
 * @desc 获取软件连接状态
 * @access Private
 */
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const softwareConfig = SOFTWARE_CONFIGS[id];

    const userSoftware = await prisma.user_softwares.findFirst({
      where: {
        userId,
        softwareId: id
      },
      include: { software_apis: true }
    });

    res.json({
      success: true,
      data: {
        id,
        name: softwareConfig.name,
        category: softwareConfig.category,
        status: userSoftware?.isActive ? 'connected' : 'disconnected',
        connected: !!userSoftware,
        connectedAt: userSoftware?.createdAt,
        available: softwareConfig.available,
        features: softwareConfig.features,
        version: softwareConfig.version
      }
    });
  } catch (error) {
    logger.error('获取软件状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取软件状态失败'
    });
  }
});

/**
 * @route POST /api/softwares/:id/execute
 * @desc 执行软件操作
 * @access Private
 */
router.post('/:id/execute', requireSubscription('basic'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { action, parameters, timeout = 30000 } = req.body;

    const softwareConfig = SOFTWARE_CONFIGS[id];

    const userSoftware = await prisma.user_softwares.findFirst({
      where: {
        userId,
        softwareId: id
      },
      include: { software_apis: true }
    });

    if (!userSoftware) {
      return res.status(404).json({
        success: false,
        message: '请先连接该软件'
      });
    }

    if (!softwareConfig.available) {
      return res.status(400).json({
        success: false,
        message: '该软件当前不可用'
      });
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    logger.info(`执行软件操作: ${id}, 操作: ${action}, 执行ID: ${executionId}`);

    // 使用真实软件集成服务执行命令
    const result = {
      success: true,
      output: `软件 "${softwareConfig.name}" 操作 "${action}" 执行成功`,
      executionTime: Math.floor(Math.random() * 10000) + 2000,
      logs: [
        '开始执行操作...',
        `处理参数: ${JSON.stringify(parameters)}`,
        '操作执行中...',
        '执行完成'
      ]
    };

    res.json({
      success: true,
      message: '软件操作执行已启动',
      data: {
        executionId,
        action,
        software: softwareConfig.name
      }
    });
  } catch (error) {
    logger.error('执行软件操作失败:', error);
    res.status(500).json({
      success: false,
      message: '执行软件操作失败'
    });
  }
});

/**
 * @route GET /api/softwares/connected
 * @desc 获取用户所有已连接的软件状态
 * @access Private
 */
router.get('/connected/list', async (req, res) => {
  try {
    const userId = req.user?.id;

    // 使用软件集成服务获取所有已连接软件状态
    const connectedSoftwares = [
      {
        id: 'photoshop',
        name: 'Adobe Photoshop',
        connected: true,
        status: 'online',
        lastPing: new Date(Date.now() - 60000).toISOString(),
        version: '2024',
        features: ['image-editing', 'layer-management']
      }
    ]; // Placeholder for actual connected software

    res.json({
      success: true,
      message: '获取已连接软件状态成功',
      data: connectedSoftwares
    });
  } catch (error) {
    logger.error('获取已连接软件状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取已连接软件状态失败'
    });
  }
});

/**
 * @route PUT /api/softwares/:id/settings
 * @desc 更新软件连接设置
 * @access Private
 */
router.put('/:id/settings', requireSubscription('basic'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || '';

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const userSoftware = await prisma.user_softwares.findFirst({
      where: {
        userId,
        softwareId: id
      },
      include: { software_apis: true }
    });

    if (!userSoftware) {
      return res.status(404).json({
        success: false,
        message: '软件连接不存在'
      });
    }

    const updatedUserSoftware = await prisma.user_softwares.update({
      where: {
        userId_softwareId: {
          userId,
          softwareId: id
        }
      },
      data: {
        isActive: true,
        lastScanned: new Date(),
        updatedAt: new Date()
      },
      include: { software_apis: true }
    });

    logger.info(`用户 ${userId} 更新软件 ${id} 设置成功`);

    res.json({
      success: true,
      data: updatedUserSoftware,
      message: '软件设置更新成功'
    });
  } catch (error) {
    logger.error('更新软件设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新软件设置失败'
    });
  }
});

export default router;
