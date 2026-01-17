import express from 'express';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

router.use(authenticate);

// 软件下载路由
/**
 * @route GET /api/software/ownload/list
 * @desc 获取软件列表
 */
router.get('/list', async (req: express.Request, res: express.Response) => {
  try {
    const { popular, recommended, recent } = req.query;

    // 临时实现：返回模拟软件列表
    let softwareList = [];

    if (popular === 'true') {
      softwareList = [
        {
          id: 'photoshop',
          name: 'Adobe Photoshop',
          version: '2024',
          category: 'image',
          description: '专业图像编辑软件',
          downloads: 150000,
          rating: 4.8,
          size: '3.2GB'
        },
        {
          id: 'blender',
          name: 'Blender',
          version: '4.2',
          category: '3d',
          description: '开源3D建模软件',
          downloads: 89000,
          rating: 4.9,
          size: '800MB'
        },
        {
          id: 'autocad',
          name: 'AutoCAD',
          version: '2024',
          category: 'cad',
          description: '专业CAD设计软件',
          downloads: 125000,
          rating: 4.7,
          size: '2.8GB'
        }
      ];
    } else if (recommended === 'true') {
      softwareList = [
        {
          id: 'photoshop',
          name: 'Adobe Photoshop',
          version: '2024',
          category: 'image',
          description: '专业图像编辑软件',
          downloads: 150000,
          rating: 4.8,
          size: '3.2GB',
          recommended: true
        },
        {
          id: 'blender',
          name: 'Blender',
          version: '4.2',
          category: '3d',
          description: '开源3D建模软件',
          downloads: 89000,
          rating: 4.9,
          size: '800MB',
          recommended: true
        }
      ];
    } else if (recent === 'true') {
      softwareList = [
        {
          id: 'illustrator',
          name: 'Adobe Illustrator',
          version: '2024',
          category: 'vector',
          description: '矢量图形设计软件',
          downloads: 75000,
          rating: 4.6,
          size: '1.5GB',
          isNew: true
        },
        {
          id: 'after-effects',
          name: 'Adobe After Effects',
          version: '2024',
          category: 'video',
          description: '专业特效编辑软件',
          downloads: 45000,
          rating: 4.7,
          size: '2.1GB',
          isNew: true
        }
      ];
    } else {
      softwareList = [
        {
          id: 'photoshop',
          name: 'Adobe Photoshop',
          version: '2024',
          category: 'image',
          description: '专业图像编辑软件',
          downloads: 150000,
          rating: 4.8,
          size: '3.2GB'
        },
        {
          id: 'autocad',
          name: 'AutoCAD',
          version: '2024',
          category: 'cad',
          description: '专业CAD设计软件',
          downloads: 125000,
          rating: 4.7,
          size: '2.8GB'
        },
        {
          id: 'blender',
          name: 'Blender',
          version: '4.2',
          category: '3d',
          description: '开源3D建模软件',
          downloads: 89000,
          rating: 4.9,
          size: '800MB'
        },
        {
          id: 'premiere',
          name: 'Adobe Premiere Pro',
          version: '2024',
          category: 'video',
          description: '专业视频编辑软件',
          downloads: 92000,
          rating: 4.6,
          size: '2.5GB'
        }
      ];
    }

    res.json({
      success: true,
      data: softwareList,
      total: softwareList.length
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
 * @route GET /api/software/ownload/:id
 * @desc 获取软件详情
 */
router.get('/software/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    // 临时实现：返回模拟软件详情
    const software = {
      id,
      name: 'Adobe Photoshop',
      version: '2024',
      category: 'image',
      description: '专业图像编辑软件',
      downloads: 150000,
      rating: 4.8,
      size: '3.2GB',
      releaseDate: '2024-03-01',
      vendor: 'Adobe',
      requirements: {
        os: 'Windows 10/11, macOS 12+',
        ram: '16GB recommended',
        disk: '10GB free space'
      },
      features: ['图层管理', '滤镜效果', '批处理', 'AI增强', 'RAW支持']
    };

    res.json({
      success: true,
      data: software
    });
  } catch (error) {
    logger.error('获取软件详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取软件详情失败'
    });
  }
});

/**
 * @route POST /api/software/ownload/download
 * @desc 生成下载链接
 */
router.post('/download', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const { softwareId, versionId } = req.body;

    if (!softwareId || !versionId) {
      return res.status(400).json({
        success: false,
        message: 'Software ID and Version ID are required'
      });
    }

    // 生成临时下载链接
    const downloadLink = `https://downloads.example.com/${softwareId}/${versionId}`;
    const token = `token-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    res.json({
      success: true,
      data: {
        downloadLink,
        token,
        expiresIn: 3600 // 1小时有效期
      }
    });
  } catch (error) {
    logger.error('生成下载链接失败:', error);
    res.status(500).json({
      success: false,
      message: '生成下载链接失败'
    });
  }
});

/**
 * @route GET /api/software/ownload/verify/:token
 * @desc 验证下载令牌
 */
router.get('/verify/:token', async (req: express.Request, res: express.Response) => {
  try {
    const { token } = req.params;

    // 验证令牌
    const isValid = token.startsWith('token-') && token.split('-').length === 3;

    res.json({
      success: true,
      valid: isValid
    });
  } catch (error) {
    logger.error('验证下载令牌失败:', error);
    res.status(500).json({
      success: false,
      message: '验证下载令牌失败'
    });
  }
});

/**
 * @route GET /api/software/ownload/stats
 * @desc 获取下载统计（管理员）
 */
router.get('/stats', async (req: express.Request, res: express.Response) => {
  try {
    const { softwareId, versionId } = req.query;

    if (!softwareId || !versionId) {
      return res.status(400).json({
        success: false,
        message: 'Software ID and Version ID are required'
      });
    }

    // 临时实现：返回模拟统计
    const stats = {
      totalDownloads: 150000,
      monthlyDownloads: 12500,
      weeklyDownloads: 2800,
      todayDownloads: 420,
      osDistribution: {
        windows: 85000,
        macos: 45000,
        linux: 20000
      },
      versionDistribution: {
        '2024': 120000,
        '2023': 25000,
        '2022': 5000
      }
    };

    res.json({
      success: true,
      data: {
        softwareId,
        versionId,
        ...stats
      }
    });
  } catch (error) {
    logger.error('获取下载统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取下载统计失败'
    });
  }
});

export default router;
