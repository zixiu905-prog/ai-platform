import express from 'express';
import { prisma } from '../config/database';
import { authenticate, requireSubscription } from '../middleware/auth';
import { logger } from '../utils/logger';
import PhotoshopAdapter from '../adapters/photoshopAdapter';
import PhotoshopAdvancedAdapter from '../adapters/photoshopAdvancedAdapter';

const router = express.Router();
router.use(authenticate);

// Photoshop适配器实例缓存
const photoshopInstances = new Map<string, PhotoshopAdapter>();
const photoshopAdvancedInstances = new Map<string, PhotoshopAdvancedAdapter>();

// 获取用户连接信息
async function getUserConnection(userId: string) {
  return await prisma.user_softwares.findFirst({
    where: {
      userId,
      softwareId: 'photoshop',
      isActive: true
    }
  });
}

// 从连接信息中解析API密钥和设置
function getConnectionMetadata(connection: any) {
  if (connection?.installPath) {
    try {
      return JSON.parse(connection.installPath);
    } catch {
      return { apiKey: '', settings: {} };
    }
  }
  return { apiKey: '', settings: {} };
}

// 获取或创建Photoshop适配器实例
function getPhotoshopInstance(userId: string): PhotoshopAdapter | null {
  return photoshopInstances.get(userId) || null;
}

function getPhotoshopAdvancedInstance(userId: string): PhotoshopAdvancedAdapter | null {
  return photoshopAdvancedInstances.get(userId) || null;

}

/**
 * @route GET /api/photoshop/status
 * @desc 获取Photoshop连接状态
 * @access Private
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const connection = await getUserConnection(userId);
    const instance = getPhotoshopInstance(userId);

    let status = 'disconnected';
    if (connection && instance) {
      try {
        const psStatus = await instance.getStatus();
        status = psStatus.isOnline ? 'online' : 'offline';
      } catch (error) {
        status = 'error';
      }
    }

    res.json({
      success: true,
      data: {
        connected: !!connection,
        status,
        version: connection?.version || 'unknown',
        lastScanned: connection?.lastScanned
      }
    });
  } catch (error) {
    logger.error('获取Photoshop状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取Photoshop状态失败'
    });
  }
});

/**
 * @route POST /api/photoshop/connect
 * @desc 连接Photoshop
 * @access Private
 */
router.post('/connect', requireSubscription('basic'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const { apiKey, settings } = req.body;

    // 创建Photoshop适配器实例
    const adapter = new PhotoshopAdapter({
      url: 'http://localhost:8080/photoshop',
      apiKey
    });

    const connected = await adapter.connect(apiKey, settings);
    if (!connected) {
      return res.status(400).json({
        success: false,
        message: 'Photoshop连接失败'
      });
    }

    // 保存连接信息（使用metadata存储apiKey和settings）
    await prisma.user_softwares.upsert({
      where: {
        userId_softwareId: {
          userId,
          softwareId: 'photoshop'
        }
      },
      update: {
        installPath: JSON.stringify({ apiKey, settings }),
        isActive: true,
        lastScanned: new Date()
      } as any,
      create: {
        userId,
        softwareId: 'photoshop',
        version: 'unknown',
        installPath: JSON.stringify({ apiKey, settings }),
        isActive: true,
        lastScanned: new Date()
      } as any
    });

    // 缓存实例
    photoshopInstances.set(userId, adapter);

    logger.info(`用户 ${userId} 连接Photoshop成功`);

    res.json({
      success: true,
      message: 'Photoshop连接成功'
    });
  } catch (error) {
    logger.error('连接Photoshop失败:', error);
    res.status(500).json({
      success: false,
      message: '连接Photoshop失败'
    });
  }
});

/**
 * @route POST /api/photoshop/disconnect
 * @desc 断开Photoshop连接
 * @access Private
 */
router.post('/disconnect', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 断开适配器连接
    const instance = getPhotoshopInstance(userId);
    if (instance) {
      await instance.disconnect();
      photoshopInstances.delete(userId);
    }

    const advancedInstance = getPhotoshopAdvancedInstance(userId);
    if (advancedInstance) {
      await advancedInstance.disconnect();
      photoshopAdvancedInstances.delete(userId);
    }

    // 更新数据库
    await prisma.user_softwares.updateMany({
      where: {
        userId,
        softwareId: 'photoshop'
      },
      data: {
        isActive: false,
        lastScanned: new Date()
      }
    });

    logger.info(`用户 ${userId} 断开Photoshop连接`);

    res.json({
      success: true,
      message: 'Photoshop断开成功'
    });
  } catch (error) {
    logger.error('断开Photoshop连接失败:', error);
    res.status(500).json({
      success: false,
      message: '断开Photoshop连接失败'
    });
  }
});

/**
 * @route GET /api/photoshop/document
 * @desc 获取当前文档信息
 * @access Private
 */
router.get('/document', requireSubscription('basic'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const instance = getPhotoshopInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接Photoshop'
      });
    }

    const docInfo = await instance.getDocumentInfo();

    res.json({
      success: true,
      data: docInfo
    });
  } catch (error) {
    logger.error('获取文档信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取文档信息失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/photoshop/document
 * @desc 创建新文档
 * @access Private
 */
router.post('/document', requireSubscription('basic'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const instance = getPhotoshopInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接Photoshop'
      });
    }

    const docInfo = await instance.createDocument(req.body);

    res.json({
      success: true,
      message: '文档创建成功',
      data: docInfo
    });
  } catch (error) {
    logger.error('创建文档失败:', error);
    res.status(500).json({
      success: false,
      message: '创建文档失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/photoshop/resize
 * @desc 调整图像大小
 * @access Private
 */
router.post('/resize', requireSubscription('basic'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const instance = getPhotoshopInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接Photoshop'
      });
    }

    const { width, height, maintainAspect } = req.body;

    const result = await instance.resizeImage(width, height, maintainAspect);

    res.json({
      success: true,
      message: '图像调整成功',
      data: result
    });
  } catch (error) {
    logger.error('调整图像大小失败:', error);
    res.status(500).json({
      success: false,
      message: '调整图像大小失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/photoshop/layers
 * @desc 添加图层
 * @access Private
 */
router.post('/layers', requireSubscription('basic'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const instance = getPhotoshopInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接Photoshop'
      });
    }

    const { name, type } = req.body;

    const result = await instance.addLayer(name, type);

    res.json({
      success: true,
      message: '图层添加成功',
      data: result
    });
  } catch (error) {
    logger.error('添加图层失败:', error);
    res.status(500).json({
      success: false,
      message: '添加图层失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/photoshop/filter
 * @desc 应用滤镜
 * @access Private
 */
router.post('/filter', requireSubscription('pro'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const instance = getPhotoshopInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接Photoshop'
      });
    }

    const { filterName, parameters } = req.body;

    const result = await instance.applyFilter(filterName, parameters);

    res.json({
      success: true,
      message: '滤镜应用成功',
      data: result
    });
  } catch (error) {
    logger.error('应用滤镜失败:', error);
    res.status(500).json({
      success: false,
      message: '应用滤镜失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/photoshop/save
 * @desc 保存文档
 * @access Private
 */
router.post('/save', requireSubscription('basic'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const instance = getPhotoshopInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接Photoshop'
      });
    }

    const { format, quality, path } = req.body;

    const result = await instance.saveDocument(format, { quality, path });

    res.json({
      success: true,
      message: '文档保存成功',
      data: result
    });
  } catch (error) {
    logger.error('保存文档失败:', error);
    res.status(500).json({
      success: false,
      message: '保存文档失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route GET /api/photoshop/advanced/layers
 * @desc 获取所有图层信息（高级）
 * @access Private
 */
router.get('/advanced/layers', requireSubscription('pro'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    let instance = getPhotoshopAdvancedInstance(userId);
    if (!instance) {
      const connection = await getUserConnection(userId);
      instance = new PhotoshopAdvancedAdapter({
        url: 'http://localhost:8080/photoshop',
        apiKey: getConnectionMetadata(connection)?.apiKey
      });
      await instance.connect();
      photoshopAdvancedInstances.set(userId, instance);
    }

    const layers = await instance.getLayersInfo();

    res.json({
      success: true,
      data: layers
    });
  } catch (error) {
    logger.error('获取图层信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取图层信息失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route GET /api/photoshop/advanced/channels
 * @desc 获取通道信息（高级）
 * @access Private
 */
router.get('/advanced/channels', requireSubscription('pro'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    let instance = getPhotoshopAdvancedInstance(userId);
    if (!instance) {
      const connection = await getUserConnection(userId);
      instance = new PhotoshopAdvancedAdapter({
        url: 'http://localhost:8080/photoshop',
        apiKey: getConnectionMetadata(connection)?.apiKey
      });
      await instance.connect();
      photoshopAdvancedInstances.set(userId, instance);
    }

    const channels = await instance.getChannelInfo();

    res.json({
      success: true,
      data: channels
    });
  } catch (error) {
    logger.error('获取通道信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通道信息失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/photoshop/advanced/adjustment
 * @desc 应用高级调整（高级）
 * @access Private
 */
router.post('/advanced/adjustment', requireSubscription('pro'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    let instance = getPhotoshopAdvancedInstance(userId);
    if (!instance) {
      const connection = await getUserConnection(userId);
      instance = new PhotoshopAdvancedAdapter({
        url: 'http://localhost:8080/photoshop',
        apiKey: getConnectionMetadata(connection)?.apiKey
      });
      await instance.connect();
      photoshopAdvancedInstances.set(userId, instance);
    }

    const { type, parameters } = req.body;

    const result = await instance.applyAdvancedAdjustment(type, parameters);

    res.json({
      success: true,
      message: '高级调整应用成功',
      data: result
    });
  } catch (error) {
    logger.error('应用高级调整失败:', error);
    res.status(500).json({
      success: false,
      message: '应用高级调整失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/photoshop/advanced/selection
 * @desc 智能选择（高级）
 * @access Private
 */
router.post('/advanced/selection', requireSubscription('pro'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    let instance = getPhotoshopAdvancedInstance(userId);
    if (!instance) {
      const connection = await getUserConnection(userId);
      instance = new PhotoshopAdvancedAdapter({
        url: 'http://localhost:8080/photoshop',
        apiKey: getConnectionMetadata(connection)?.apiKey
      });
      await instance.connect();
      photoshopAdvancedInstances.set(userId, instance);
    }

    const { operation, parameters } = req.body;

    const result = await instance.performSmartSelection(operation, parameters);

    res.json({
      success: true,
      message: '智能选择成功',
      data: result
    });
  } catch (error) {
    logger.error('智能选择失败:', error);
    res.status(500).json({
      success: false,
      message: '智能选择失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/photoshop/advanced/smart-object
 * @desc 创建智能对象（高级）
 * @access Private
 */
router.post('/advanced/smart-object', requireSubscription('pro'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    let instance = getPhotoshopAdvancedInstance(userId);
    if (!instance) {
      const connection = await getUserConnection(userId);
      instance = new PhotoshopAdvancedAdapter({
        url: 'http://localhost:8080/photoshop',
        apiKey: getConnectionMetadata(connection)?.apiKey
      });
      await instance.connect();
      photoshopAdvancedInstances.set(userId, instance);
    }

    const result = await instance.createSmartObject(req.body);

    res.json({
      success: true,
      message: '智能对象创建成功',
      data: result
    });
  } catch (error) {
    logger.error('创建智能对象失败:', error);
    res.status(500).json({
      success: false,
      message: '创建智能对象失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
