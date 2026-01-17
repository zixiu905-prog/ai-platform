import express from 'express';
import { authenticate, requireSubscription } from '../middleware/auth';
import SoftwareVersionManagementService from '../services/softwareVersionManagementService';
import { logger } from '../utils/logger';

const router = express.Router();
const versionService = new SoftwareVersionManagementService();

// 需要管理员权限
router.use(authenticate);
router.use(requireSubscription('ADMIN'));

/**
 * 收录软件版本
 */
router.post('/collect/:softwareName', async (req, res) => {
  try {
    const { softwareName } = req.params;

    if (!softwareName) {
      return res.status(400).json({ error: '软件名称不能为空' });
    }
    const versions = await versionService.collectSoftwareVersions(softwareName);

    res.json({
      success: true,
      data: versions,
      message: `成功收录 ${softwareName} 的版本信息`
    });

  } catch (error) {
    logger.error('收录软件版本失败:', error);
    res.status(500).json({
      error: '收录软件版本失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 桌面端检测版本后匹配API
 */
router.post('/match-api', async (req, res) => {
  try {
    const { softwareName, detectedVersion } = req.body;
    const userId = req.user!.id;

    if (!softwareName || !detectedVersion) {
      return res.status(400).json({
        error: '软件名称和检测版本不能为空'
      });
    }
    const apiMatch = await versionService.matchAPIForVersion(
      softwareName,
      detectedVersion
    );

    res.json({
      success: true,
      data: apiMatch,
      message: 'API匹配成功'
    });

  } catch (error) {
    logger.error('API匹配失败:', error);
    res.status(500).json({
      error: 'API匹配失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取所有软件版本
 */
router.get('/all/:softwareId', async (req, res) => {
  try {
    const { softwareId } = req.params;
    const versions = await versionService.getAllSoftwareVersions(softwareId);

    res.json({
      success: true,
      data: versions,
      count: versions.length
    });

  } catch (error) {
    logger.error('获取软件版本失败:', error);
    res.status(500).json({ error: '获取软件版本失败' });
  }
});

export default router;
