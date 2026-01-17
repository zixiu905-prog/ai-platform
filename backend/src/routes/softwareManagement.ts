import { Router, Request, Response } from 'express';
import { softwareIntegrationService } from '../services/softwareIntegrationService';
import { softwareDownloadService } from '../services/softwareDownloadService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 获取软件列表
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const softwareList = await softwareIntegrationService.getSoftwareList();
    res.json({ success: true, data: softwareList });
  } catch (error) {
    logger.error('获取软件列表失败:', error);
    res.status(500).json({ success: false, message: '获取软件列表失败' });
  }
});

/**
 * 获取软件下载URL
 */
router.get('/download-url/:softwareId', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;
    const result = await softwareDownloadService.getDownloadUrl(softwareId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('获取下载URL失败:', error);
    res.status(500).json({ success: false, message: '获取下载URL失败' });
  }
});

/**
 * 下载软件
 */
router.post('/download/:softwareId', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;

    // 设置流式响应
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await softwareDownloadService.downloadSoftware(softwareId, (progress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ status: 'complete', result })}\n\n`);
    res.end();
  } catch (error) {
    logger.error('下载软件失败:', error);
    res.status(500).json({ success: false, message: '下载软件失败' });
  }
});

/**
 * 集成软件
 */
router.post('/integrate/:softwareId', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;
    const result = await softwareIntegrationService.integrate(softwareId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('集成软件失败:', error);
    res.status(500).json({ success: false, message: '集成软件失败' });
  }
});

/**
 * 卸载软件
 */
router.delete('/uninstall/:softwareId', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;
    const result = await softwareIntegrationService.uninstall(softwareId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('卸载软件失败:', error);
    res.status(500).json({ success: false, message: '卸载软件失败' });
  }
});

/**
 * 检查软件更新
 */
router.get('/check-update/:softwareId', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;
    const result = await softwareIntegrationService.checkUpdate(softwareId);

    res.json(result);
  } catch (error) {
    logger.error('检查软件更新失败:', error);
    res.status(500).json({ success: false, message: '检查软件更新失败' });
  }
});

/**
 * 获取下载进度
 */
router.get('/download-progress/:softwareName', async (req: Request, res: Response) => {
  try {
    const { softwareName } = req.params;
    const progress = softwareDownloadService.getDownloadProgress(softwareName);

    if (progress) {
      res.json({ success: true, data: progress });
    } else {
      res.json({ success: true, data: null });
    }
  } catch (error) {
    logger.error('获取下载进度失败:', error);
    res.status(500).json({ success: false, message: '获取下载进度失败' });
  }
});

/**
 * 取消下载
 */
router.post('/cancel-download/:softwareName', async (req: Request, res: Response) => {
  try {
    const { softwareName } = req.params;
    const result = await softwareDownloadService.cancelDownload(softwareName);

    res.json(result);
  } catch (error) {
    logger.error('取消下载失败:', error);
    res.status(500).json({ success: false, message: '取消下载失败' });
  }
});

/**
 * 获取磁盘空间
 */
router.get('/disk-space', async (req: Request, res: Response) => {
  try {
    const result = await softwareDownloadService.getDiskSpace();
    res.json(result);
  } catch (error) {
    logger.error('获取磁盘空间失败:', error);
    res.status(500).json({ success: false, message: '获取磁盘空间失败' });
  }
});

export default router;
