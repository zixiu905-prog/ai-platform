import express, { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { body, param, validationResult } from 'express-validator';
import { SoftwareApiManagementService } from '../services/softwareApiManagementService';

const router = express.Router();
const apiManagementService = new SoftwareApiManagementService();

// 所有路由都需要认证
router.use(authenticate);

/**
 * @route POST /api/software/detect
 * @desc 检测软件版本
 */
router.post('/detect/:softwareId', authorize(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;
    const userId = req.user?.id;

    const result = await apiManagementService.detectSoftwareVersion(softwareId, userId);

    res.json({
      success: true,
      data: result,
      message: '软件版本检测成功'
    });
  } catch (error) {
    logger.error('检测软件版本失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '检测失败',
      message: '软件版本检测失败'
    });
  }
});

/**
 * @route GET /api/software/supported
 * @desc 获取支持的软件列表
 */
router.get('/supported', authorize(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const software = await prisma.software_apis.findMany({
      where: { isActive: true },
      orderBy: { softwareName: 'asc' }
    });

    res.json({
      success: true,
      data: software,
      message: '获取支持的软件列表成功'
    });
  } catch (error) {
    logger.error('获取支持的软件列表失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取失败',
      message: '获取支持的软件列表失败'
    });
  }
});

/**
 * @route GET /api/software/:softwareId/versions
 * @desc 获取软件版本信息
 */
router.get('/versions/:softwareId', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;

    const versions: any[] = [];

    res.json({
      success: true,
      data: versions,
      message: '获取软件版本信息成功'
    });
  } catch (error) {
    logger.error('获取软件版本信息失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取失败',
      message: '获取软件版本信息失败'
    });
  }
});

/**
 * @route GET /api/software/api/:softwareId/:version?
 * @desc 获取软件API规范
 */
router.get('/api/:softwareId/:version?', async (req: Request, res: Response) => {
  try {
    const { softwareId, version } = req.params;

    const apiSpec = null;

    if (!apiSpec) {
      return res.status(404).json({
        success: false,
        message: '未找到API规范'
      });
    }

    res.json({
      success: true,
      data: apiSpec,
      message: '获取软件API规范成功'
    });
  } catch (error) {
    logger.error('获取软件API规范失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取失败',
      message: '获取软件API规范失败'
    });
  }
});

export default router;
