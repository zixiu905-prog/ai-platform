import express from 'express';
import { prisma } from '../config/database';
import { authenticate, requireSubscription } from '../middleware/auth';
import { logger } from '../utils/logger';
import AutoCADAdapter from '../adapters/autocadAdapter';

const router = express.Router();
router.use(authenticate);

// AutoCAD适配器实例缓存
const autocadInstances = new Map<string, AutoCADAdapter>();

// 获取用户连接信息
async function getUserConnection(userId: string) {
  return await prisma.user_softwares.findFirst({
    where: {
      userId,
      softwareId: 'autocad'
    }
  });
}

// 获取或创建AutoCAD适配器实例
function getAutoCADInstance(userId: string): AutoCADAdapter | null {
  return autocadInstances.get(userId) || null;
}

/**
 * @route GET /api/autocad/status
 * @desc 获取AutoCAD连接状态
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
    const instance = getAutoCADInstance(userId);

    let status = 'disconnected';
    let version = null;
    if (connection && instance) {
      try {
        const acStatus = await instance.getStatus();
        status = acStatus.isOnline ? 'online' : 'offline';
        version = acStatus.version;
      } catch (error) {
        status = 'error';
      }
    }

    res.json({
      success: true,
      data: {
        connected: !!connection,
        status,
        version,
        lastScanned: new Date()
      }
    });
  } catch (error) {
    logger.error('获取AutoCAD状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取AutoCAD状态失败'
    });
  }
});

/**
 * @route POST /api/autocad/connect
 * @desc 连接AutoCAD
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

    // 创建AutoCAD适配器实例
    const adapter = new AutoCADAdapter();

    const connected = await adapter.connect(apiKey, settings);
    if (!connected) {
      return res.status(400).json({
        success: false,
        message: 'AutoCAD连接失败，请确保AutoCAD已安装并正在运行'
      });
    }

    // 保存连接信息
    await prisma.user_softwares.upsert({
      where: {
        userId_softwareId: {
          userId,
          softwareId: 'autocad'
        }
      },
      update: {
        version: settings?.version || 'latest'
      },
      create: {
        id: `auto-${userId}`,
        userId,
        softwareId: 'autocad',
        version: settings?.version || 'latest',
        updatedAt: new Date()
      }
    });

    // 缓存实例
    autocadInstances.set(userId, adapter);

    logger.info(`用户 ${userId} 连接AutoCAD成功`);

    res.json({
      success: true,
      message: 'AutoCAD连接成功'
    });
  } catch (error) {
    logger.error('连接AutoCAD失败:', error);
    res.status(500).json({
      success: false,
      message: '连接AutoCAD失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/autocad/disconnect
 * @desc 断开AutoCAD连接
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
    const instance = getAutoCADInstance(userId);
    if (instance) {
      await instance.disconnect();
      autocadInstances.delete(userId);
    }

    // 更新数据库
    await prisma.user_softwares.updateMany({
      where: {
        userId,
        softwareId: 'autocad'
      },
      data: {
        isActive: false
      }
    });

    logger.info(`用户 ${userId} 断开AutoCAD连接`);

    res.json({
      success: true,
      message: 'AutoCAD断开成功'
    });
  } catch (error) {
    logger.error('断开AutoCAD连接失败:', error);
    res.status(500).json({
      success: false,
      message: '断开AutoCAD连接失败'
    });
  }
});

/**
 * @route GET /api/autocad/drawing
 * @desc 获取当前图纸信息
 * @access Private
 */
router.get('/drawing', requireSubscription('basic'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const instance = getAutoCADInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接AutoCAD'
      });
    }

    const drawingInfo = await instance.execute('getDrawingInfo');

    res.json({
      success: true,
      data: drawingInfo
    });
  } catch (error) {
    logger.error('获取图纸信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取图纸信息失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/autocad/drawing
 * @desc 创建新图纸
 * @access Private
 */
router.post('/drawing', requireSubscription('basic'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const instance = getAutoCADInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接AutoCAD'
      });
    }

    const result = await instance.execute('createDrawing', req.body);

    res.json({
      success: true,
      message: '图纸创建成功',
      data: result
    });
  } catch (error) {
    logger.error('创建图纸失败:', error);
    res.status(500).json({
      success: false,
      message: '创建图纸失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/autocad/open
 * @desc 打开图纸
 * @access Private
 */
router.post('/open', requireSubscription('basic'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const instance = getAutoCADInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接AutoCAD'
      });
    }

    const { path } = req.body;

    const result = await instance.execute('openDrawing', { path });

    res.json({
      success: true,
      message: '图纸打开成功',
      data: result
    });
  } catch (error) {
    logger.error('打开图纸失败:', error);
    res.status(500).json({
      success: false,
      message: '打开图纸失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/autocad/save
 * @desc 保存图纸
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

    const instance = getAutoCADInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接AutoCAD'
      });
    }

    const { path, version } = req.body;

    const result = await instance.execute('saveDrawing', { path, version });

    res.json({
      success: true,
      message: '图纸保存成功',
      data: result
    });
  } catch (error) {
    logger.error('保存图纸失败:', error);
    res.status(500).json({
      success: false,
      message: '保存图纸失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route GET /api/autocad/layers
 * @desc 获取所有图层
 * @access Private
 */
router.get('/layers', requireSubscription('basic'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const instance = getAutoCADInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接AutoCAD'
      });
    }

    const layers = await instance.execute('getLayers');

    res.json({
      success: true,
      data: layers
    });
  } catch (error) {
    logger.error('获取图层失败:', error);
    res.status(500).json({
      success: false,
      message: '获取图层失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/autocad/layers
 * @desc 创建图层
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

    const instance = getAutoCADInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接AutoCAD'
      });
    }

    const { name, color, lineType } = req.body;

    const result = await instance.execute('createLayer', { name, color, lineType });

    res.json({
      success: true,
      message: '图层创建成功',
      data: result
    });
  } catch (error) {
    logger.error('创建图层失败:', error);
    res.status(500).json({
      success: false,
      message: '创建图层失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route GET /api/autocad/blocks
 * @desc 获取所有图块
 * @access Private
 */
router.get('/blocks', requireSubscription('basic'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const instance = getAutoCADInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接AutoCAD'
      });
    }

    const blocks = await instance.execute('getBlocks');

    res.json({
      success: true,
      data: blocks
    });
  } catch (error) {
    logger.error('获取图块失败:', error);
    res.status(500).json({
      success: false,
      message: '获取图块失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/autocad/blocks/insert
 * @desc 插入图块
 * @access Private
 */
router.post('/blocks/insert', requireSubscription('basic'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const instance = getAutoCADInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接AutoCAD'
      });
    }

    const { blockName, insertionPoint, scale, rotation } = req.body;

    const result = await instance.execute('insertBlock', {
      blockName,
      insertionPoint,
      scale,
      rotation
    });

    res.json({
      success: true,
      message: '图块插入成功',
      data: result
    });
  } catch (error) {
    logger.error('插入图块失败:', error);
    res.status(500).json({
      success: false,
      message: '插入图块失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/autocad/lisp
 * @desc 执行Lisp代码
 * @access Private
 */
router.post('/lisp', requireSubscription('pro'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const instance = getAutoCADInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接AutoCAD'
      });
    }

    const { lispCode } = req.body;

    const result = await instance.execute('executeLisp', { lispCode });

    res.json({
      success: true,
      message: 'Lisp代码执行成功',
      data: result
    });
  } catch (error) {
    logger.error('执行Lisp代码失败:', error);
    res.status(500).json({
      success: false,
      message: '执行Lisp代码失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/autocad/batch/convert
 * @desc 批量转换图纸格式
 * @access Private
 */
router.post('/batch/convert', requireSubscription('pro'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const instance = getAutoCADInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接AutoCAD'
      });
    }

    const { inputFolder, outputFolder, targetFormat, sourceFormat } = req.body;

    const result = await instance.execute('batchConvert', {
      inputFolder,
      outputFolder,
      targetFormat,
      sourceFormat
    });

    res.json({
      success: true,
      message: '批量转换完成',
      data: result
    });
  } catch (error) {
    logger.error('批量转换失败:', error);
    res.status(500).json({
      success: false,
      message: '批量转换失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/autocad/layers/cleanup
 * @desc 清理图层
 * @access Private
 */
router.post('/layers/cleanup', requireSubscription('pro'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const instance = getAutoCADInstance(userId);
    if (!instance) {
      return res.status(400).json({
        success: false,
        message: '请先连接AutoCAD'
      });
    }

    const result = await instance.execute('layerCleanup');

    res.json({
      success: true,
      message: '图层清理完成',
      data: result
    });
  } catch (error) {
    logger.error('图层清理失败:', error);
    res.status(500).json({
      success: false,
      message: '图层清理失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
