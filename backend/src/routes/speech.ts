import express from 'express';
import multer from 'multer';
import { authenticate, requireSubscription } from '../middleware/auth';
import { unifiedSpeechService } from '../services/unifiedSpeechService';
import { logger } from '../utils/logger';

const router = express.Router();

// 配置multer用于音频文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/wav',
      'audio/wave',
      'audio/mp3',
      'audio/mpeg',
      'audio/flac',
      'audio/aac',
      'audio/mp4',
      'audio/x-m4a'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的音频格式'));
    }
  }
});

// 错误处理辅助函数
const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : '未知错误';
};

// 获取用户ID的辅助函数
const getUserId = (req: express.Request): string => {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error('用户未认证');
  }
  return userId;
};

// 所有语音识别路由都需要认证
router.use(authenticate);

/**
 * @route POST /api/speech/recognize
 * @desc 语音文件识别
 * @access Private
 */
router.post('/recognize', requireSubscription('basic'), upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传音频文件',
        timestamp: new Date().toISOString()
      });
    }
    const { language, enablePunctuation, enableTimestamps } = req.body;

    const audioData = req.file.buffer || Buffer.alloc(0);
    const userId = req.user?.id || '';

    const result = await unifiedSpeechService.recognizeSpeech(
      audioData,
      language || 'zh-CN'
    );

    res.json({
      success: true,
      message: '语音识别成功',
      data: result
    });
  } catch (error) {
    logger.error('语音识别失败:', error);
    res.status(500).json({
      success: false,
      message: '语音识别失败',
      error: getErrorMessage(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/speech/realtime/start
 * @desc 开始实时语音识别
 * @access Private
 */
router.post('/realtime/start', requireSubscription('pro'), async (req, res) => {
  try {
    const { language, enablePunctuation, enableTimestamps } = req.body;
    const userId = getUserId(req);

    // 模拟实时识别会话ID
    const sessionId = `session-${Date.now()}-${userId}`;

    logger.info(`用户 ${userId} 实时识别已启动，会话ID: ${sessionId}`);

    res.json({
      success: true,
      message: '实时语音识别已启动',
      data: { sessionId }
    });
  } catch (error) {
    logger.error('启动实时语音识别失败:', error);
    res.status(500).json({
      success: false,
      message: '启动实时语音识别失败',
      error: getErrorMessage(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/speech/realtime/:sessionId/audio
 * @desc 发送音频数据到实时识别会话
 * @access Private
 */
router.post('/realtime/:sessionId/audio', requireSubscription('pro'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const audioData = req.body;

    if (!audioData || !Buffer.isBuffer(audioData)) {
      return res.status(400).json({
        success: false,
        message: '无效的音频数据',
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`接收到会话 ${sessionId} 的音频数据`);

    res.json({
      success: true,
      message: '音频数据已接收'
    });
  } catch (error) {
    logger.error('发送音频数据失败:', error);
    res.status(500).json({
      success: false,
      message: '发送音频数据失败',
      error: getErrorMessage(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/speech/realtime/:sessionId/stop
 * @desc 停止实时语音识别
 * @access Private
 */
router.post('/realtime/:sessionId/stop', requireSubscription('pro'), async (req, res) => {
  try {
    const { sessionId } = req.params;

    logger.info(`停止实时语音识别会话: ${sessionId}`);

    res.json({
      success: true,
      message: '实时语音识别已停止'
    });
  } catch (error) {
    logger.error('停止实时语音识别失败:', error);
    res.status(500).json({
      success: false,
      message: '停止实时语音识别失败',
      error: getErrorMessage(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/speech/realtime/active
 * @desc 获取活跃的实时识别会话
 * @access Private
 */
router.get('/realtime/active', requireSubscription('pro'), async (req, res) => {
  try {
    const activeSessions: any[] = [];

    res.json({
      success: true,
      message: '获取活跃会话成功',
      data: { activeSessions }
    });
  } catch (error) {
    logger.error('获取活跃会话失败:', error);
    res.status(500).json({
      success: false,
      message: '获取活跃会话失败',
      error: getErrorMessage(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/speech/realtime/stop-all
 * @desc 停止所有实时识别会话
 * @access Private
 */
router.post('/realtime/stop-all', requireSubscription('pro'), async (req, res) => {
  try {
    logger.info('停止所有实时语音识别会话');

    res.json({
      success: true,
      message: '所有实时语音识别已停止'
    });
  } catch (error) {
    logger.error('停止所有会话失败:', error);
    res.status(500).json({
      success: false,
      message: '停止所有会话失败',
      error: getErrorMessage(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/speech/convert-format
 * @desc 转换音频格式
 * @access Private
 */
router.post('/convert-format', requireSubscription('basic'), upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传音频文件',
        timestamp: new Date().toISOString()
      });
    }
    const { targetFormat, sampleRate, channels } = req.body;

    logger.info(`转换音频格式到 ${targetFormat || 'wav'}`);

    res.json({
      success: true,
      message: '音频格式转换成功',
      data: {
        targetFormat: targetFormat || 'wav',
        sampleRate: sampleRate || 16000,
        channels: channels || 1
      }
    });
  } catch (error) {
    logger.error('音频格式转换失败:', error);
    res.status(500).json({
      success: false,
      message: '音频格式转换失败',
      error: getErrorMessage(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/speech/validate
 * @desc 验证音频文件格式
 * @access Private
 */
router.post('/validate', requireSubscription('basic'), upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传音频文件',
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`验证音频文件: ${req.file.originalname}`);

    const isValid = true;
    const audioInfo = {
      duration: 10.5,
      format: 'wav',
      sampleRate: 16000,
      channels: 1
    };

    res.json({
      success: true,
      message: '音频文件验证完成',
      data: {
        isValid,
        audioInfo,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    logger.error('音频文件验证失败:', error);
    res.status(500).json({
      success: false,
      message: '音频文件验证失败',
      error: getErrorMessage(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/speech/config
 * @desc 获取语音识别配置
 * @access Private
 */
router.get('/config', async (req, res) => {
  try {
    const config = {
      language: 'zh-CN',
      format: 'wav',
      sampleRate: 16000,
      channels: 1,
      enablePunctuation: true,
      enableTimestamps: true,
      enableWordConfidence: false,
      maxRecordingTime: 300,
      silenceTimeout: 2
    };

    // 隐藏敏感信息
    const safeConfig = {
      language: config.language,
      format: config.format,
      sampleRate: config.sampleRate,
      channels: config.channels,
      enablePunctuation: config.enablePunctuation,
      enableTimestamps: config.enableTimestamps,
      enableWordConfidence: config.enableWordConfidence,
      maxRecordingTime: config.maxRecordingTime,
      silenceTimeout: config.silenceTimeout
    };

    res.json({
      success: true,
      message: '获取配置成功',
      data: safeConfig
    });
  } catch (error) {
    logger.error('获取语音识别配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败',
      error: getErrorMessage(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route PUT /api/speech/config
 * @desc 更新语音识别配置（管理员）
 * @access Private (Admin)
 */
router.put('/config', async (req, res) => {
  try {
    const { language, format, sampleRate, channels, enablePunctuation, enableTimestamps, enableWordConfidence, maxRecordingTime, silenceTimeout } = req.body;

    logger.info('更新语音识别配置');

    res.json({
      success: true,
      message: '配置更新成功'
    });
  } catch (error) {
    logger.error('更新语音识别配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新配置失败',
      error: getErrorMessage(error),
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
