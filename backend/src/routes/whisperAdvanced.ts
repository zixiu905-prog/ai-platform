import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { whisperAdvancedService } from '../services/whisperAdvancedService';
import { authenticate, authorize } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// 配置文件上传
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'audio');
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
      'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/flac'
    ];

    if (allowedTypes.includes(file.mimetype) ||
        path.extname(file.originalname).match(/\.(mp3|wav|ogg|webm|m4a|aac|flac)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的音频格式'));
    }
  }
});

// 语音识别 - 单个文件
router.post('/transcribe', authenticate, upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '未上传音频文件',
        timestamp: new Date().toISOString()
      });
    }
    const {
      model = 'base',
      language = 'zh',
      task = 'transcribe',
      temperature = 0.0,
      word_timestamps = true,
      vad_filter = true,
      output_format = 'json',
      device = 'auto',
      initial_prompt
    } = req.body;

    logger.info('开始Whisper语音识别', {
      file: req.file.filename,
      model,
      language,
      task
    });

    const result = await whisperAdvancedService.transcribe(req.file.path, {
      model,
      language,
      task,
      temperature: parseFloat(temperature),
      word_timestamps: word_timestamps === 'true',
      vad_filter: vad_filter === 'true',
      output_format,
      device,
      initial_prompt
    });

    // 清理上传的文件
    try {
      await fs.unlink(req.file.path);
    } catch (error) {
      logger.warn('清理上传文件失败:', error);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('语音识别失败:', error);

    // 清理上传的文件
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.warn('清理上传文件失败:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: '语音识别失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 语音识别 - 批量处理
router.post('/transcribe/batch', authenticate, upload.array('audio', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: '未上传音频文件',
        timestamp: new Date().toISOString()
      });
    }

    const {
      model = 'base',
      language = 'zh',
      task = 'transcribe',
      temperature = 0.0,
      word_timestamps = true,
      vad_filter = true
    } = req.body;

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await whisperAdvancedService.transcribe(file.path, {
          model,
          language,
          task,
          temperature: parseFloat(temperature),
          word_timestamps: word_timestamps === 'true',
          vad_filter: vad_filter === 'true'
        });
        results.push({
          filename: file.originalname,
          success: true,
          data: result
        });

        // 清理文件
        try {
          await fs.unlink(file.path);
        } catch (err) {
          logger.warn('清理文件失败:', err);
        }
      } catch (err) {
        errors.push({
          filename: file.originalname,
          error: err instanceof Error ? err.message : '未知错误'
        });
        // 清理失败文件
        try {
          await fs.unlink(file.path);
        } catch {
          // 忽略
        }
      }
    }

    res.json({
      success: true,
      data: {
        total: files.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      }
    });
  } catch (error) {
    logger.error('批量语音识别失败:', error);
    res.status(500).json({
      success: false,
      error: '批量语音识别失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 获取可用模型列表
router.get('/models', authenticate, async (req: Request, res: Response) => {
  try {
    const models = await whisperAdvancedService.getAvailableModels();

    res.json({
      success: true,
      data: models
    });
  } catch (error) {
    logger.error('获取模型列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取模型列表失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 获取模型状态
router.get('/models/status', authenticate, async (req: Request, res: Response) => {
  try {
    const { modelId } = req.query;
    const status = await whisperAdvancedService.getModelStatus((modelId as string) || 'default');

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('获取模型状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取模型状态失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 下载模型（需要管理员权限）
router.post('/models/download', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { model } = req.body;

    if (!model) {
      return res.status(400).json({
        success: false,
        error: '请指定要下载的模型'
      });
    }

    const result = await whisperAdvancedService.downloadModel(model);

    res.json({
      success: true,
      message: '模型下载已开始',
      data: result
    });
  } catch (error) {
    logger.error('下载模型失败:', error);
    res.status(500).json({
      success: false,
      error: '下载模型失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 删除模型（需要管理员权限）
router.delete('/models/:model', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { model } = req.params;

    await whisperAdvancedService.deleteModel(model);

    res.json({
      success: true,
      message: '模型删除成功'
    });
  } catch (error) {
    logger.error('删除模型失败:', error);
    res.status(500).json({
      success: false,
      error: '删除模型失败',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
