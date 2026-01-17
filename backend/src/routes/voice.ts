import express from 'express';
import { prisma } from '../config/database';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import { unifiedSpeechService } from '../services/unifiedSpeechService';

const router = express.Router();

// 配置音频文件上传
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'audio');
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `audio-${uniqueSuffix}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/m4a', 'audio/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的音频格式'));
    }
  },
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

// 开始语音录制
router.post('/start-recording', authenticate, async (req, res) => {
  try {
    const { language = 'zh-CN', model = 'whisper-1' } = req.body;

    // 生成录音会话ID
    const sessionId = `recording-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // TODO: 数据库表 voiceRecordings 不存在，暂不实现持久化
    logger.info(`语音录制开始: sessionId=${sessionId}, userId=${req.user!.id}`);

    res.json({
      success: true,
      data: {
        sessionId,
        language,
        model,
        maxDuration: 300, // 5分钟最大录制时长
        supportedFormats: ['wav', 'mp3', 'ogg', 'm4a', 'webm']
      }
    });
  } catch (error) {
    logger.error('开始语音录制失败:', error);
    res.status(500).json({
      success: false,
      message: '开始录制失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 上传语音文件
router.post('/upload', authenticate, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传音频文件'
      });
    }

    const { language = 'zh-CN', enablePunctuation = true } = req.body;

    // 进行语音识别
    const result = await unifiedSpeechService.recognizeSpeech(
      await fs.readFile(req.file.path),
      language
    );

    res.json({
      success: true,
      data: {
        sessionId: `upload-${Date.now()}`,
        transcription: result.transcription,
        duration: req.body.duration || 0,
        language
      }
    });
  } catch (error) {
    logger.error('上传语音文件失败:', error);
    res.status(500).json({
      success: false,
      message: '上传失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取转录结果
router.get('/transcription/:recordingId', authenticate, async (req, res) => {
  try {
    const { recordingId } = req.params;
    const userId = req.user!.id;

    // TODO: 数据库表 voiceRecordings 不存在，返回模拟数据
    res.json({
      success: true,
      data: {
        id: recordingId,
        sessionId: `session-${recordingId}`,
        transcription: '模拟转录结果',
        status: 'COMPLETED',
        duration: 10.5,
        language: 'zh-CN',
        createdAt: new Date()
      }
    });
  } catch (error) {
    logger.error('获取转录结果失败:', error);
    res.status(500).json({
      success: false,
      message: '获取转录结果失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取录音列表
router.get('/recordings', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { limit = 20, offset = 0 } = req.query;

    // TODO: 数据库表 voiceRecordings 不存在，返回模拟数据
    res.json({
      success: true,
      data: {
        recordings: [],
        total: 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    logger.error('获取录音列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取录音列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 删除录音
router.delete('/recording/:recordingId', authenticate, async (req, res) => {
  try {
    const { recordingId } = req.params;
    const userId = req.user!.id;

    // TODO: 数据库表 voiceRecordings 不存在，返回成功响应
    res.json({
      success: true,
      message: '录音删除成功'
    });
  } catch (error) {
    logger.error('删除录音失败:', error);
    res.status(500).json({
      success: false,
      message: '删除录音失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取语音使用统计
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    // TODO: 数据库表 voiceRecordings 不存在，返回模拟数据
    res.json({
      success: true,
      data: {
        totalRecordings: 0,
        totalDuration: 0,
        recordingsByStatus: {}
      }
    });
  } catch (error) {
    logger.error('获取语音统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取语音统计失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
