import express from 'express';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * @deprecated 此文件为旧版订阅服务，请使用 subscription2025.ts
 */
router.get('/plans', async (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
      message: '此接口已废弃，请使用 subscription2025'
    });
  } catch (error) {
    logger.error('获取订阅计划失败:', error);
    res.status(500).json({
      success: false,
      message: '获取计划失败',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/plans/:id', async (req, res) => {
  res.json({
    success: true,
    data: null,
    message: '此接口已废弃，请使用 subscription2025'
  });
});

router.post('/subscribe', async (req, res) => {
  res.json({
    success: true,
    message: '此接口已废弃，请使用 subscription2025'
  });
});

export default router;
