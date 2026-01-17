import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// 确保上传目录存在
const ensureUploadDir = (dir: string) => {
  const fullPath = path.join(process.cwd(), 'uploads', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
};

// 文件类型验证
const fileFilters = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
  video: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'],
  document: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
  spreadsheet: ['xls', 'xlsx', 'csv', 'ods'],
  presentation: ['ppt', 'pptx', 'odp'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz'],
  script: ['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs'],
  font: ['ttf', 'otf', 'woff', 'woff2', 'eot'],
  model: ['obj', 'fbx', 'dae', '3ds', 'blend', 'max', 'c4d']
};

// 获取文件扩展名
const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

// 验证文件类型
const validateFileType = (filename: string, allowedTypes: string[]): boolean => {
  const ext = getFileExtension(filename);
  return allowedTypes.includes(ext);
};

// 生成安全的文件名
const generateSafeFilename = (originalName: string): string => {
  const ext = getFileExtension(originalName);
  const timestamp = Date.now();
  const uuid = uuidv4().substring(0, 8);
  return `${timestamp}_${uuid}.${ext}`;
};

// Multer存储配置
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const uploadType = req.body.type || 'general';
    const uploadDir = ensureUploadDir(uploadType);
    cb(null, uploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    const safeFilename = generateSafeFilename(file.originalname);
    cb(null, safeFilename);
  }
});

// Multer配置
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10 // 最多10个文件
  },
  fileFilter: (req, file, cb) => {
    const fileType = req.body.type || 'general';
    let allowedTypes: string[] = [];

    // 根据上传类型确定允许的文件类型
    switch (fileType) {
      case 'avatar':
        allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        break;
      case 'project':
        allowedTypes = [...fileFilters.image, ...fileFilters.video, ...fileFilters.document, ...fileFilters.archive];
        break;
      case 'script':
        allowedTypes = [...fileFilters.script, ...fileFilters.document];
        break;
      case 'model':
        allowedTypes = [...fileFilters.model, ...fileFilters.image];
        break;
      case 'font':
        allowedTypes = fileFilters.font;
        break;
      default:
        allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt'];
    }

    if (validateFileType(file.originalname, allowedTypes)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${getFileExtension(file.originalname)}`));
    }
  }
});

// 单文件上传
router.post('/single', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有文件被上传'
      });
    }
    const { type = 'general' } = req.body;
    const userId = (req as any).user?.id;

    // 计算文件大小（MB）
    const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
    const relativePath = `${type}/${req.file.filename}`;
    const fullPath = path.join('uploads', relativePath);

    // 保存文件记录到数据库
    const fileRecord = await prisma.documents.create({
      data: {
        userId,
        title: req.file.originalname,
        filePath: relativePath,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
      }
    });

    logger.info(`文件上传成功: ${req.file.originalname} (${fileSizeMB}MB)`, {
      userId,
      type,
      //projectId
    });

    res.json({
      success: true,
      message: '文件上传成功',
      data: {
        id: fileRecord.id,
        filePath: fileRecord.filePath,
        fileSize: fileRecord.fileSize,
        url: `/api/files/${fileRecord.id}`,
        uploadedAt: fileRecord.createdAt
      }
    });
  } catch (error) {
    logger.error('文件上传失败:', error);
    res.status(500).json({
      success: false,
      message: '文件上传失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 多文件上传
router.post('/multiple', authenticate, upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有文件被上传'
      });
    }
    const { type = 'general' } = req.body;
    const userId = (req as any).user?.id;

    // 批量保存文件记录
    const fileRecords = await Promise.all(
      files.map((file: any) =>
        prisma.documents.create({
          data: {
            userId,
            title: file.originalname,
            filePath: `${type}/${file.filename}`,
            fileSize: file.size,
            fileType: file.mimetype,
          }
        })
      )
    );

    logger.info(`批量文件上传成功: ${files.length}个文件`, {
      userId,
      type,
      //projectId
    });

    res.json({
      success: true,
      message: `${files.length}个文件上传成功`,
      data: fileRecords.map((file: any) => ({
        id: file.id,
        filePath: file.filePath,
        fileSize: file.fileSize,
        url: `/api/files/${file.id}`,
        uploadedAt: file.createdAt
      }))
    });
  } catch (error) {
    logger.error('批量文件上传失败:', error);
    res.status(500).json({
      success: false,
      message: '批量文件上传失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取文件列表
router.get('/list', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { type, limit = 50, offset = 0 } = req.query;

    const where: any = { userId };
    if (type) where.type = type;

    const [files, total] = await Promise.all([
      prisma.documents.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      }),
      prisma.documents.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        files,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    logger.error('获取文件列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取文件列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取文件详情
router.get('/:fileId', authenticate, async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user?.id;

    const file = await prisma.documents.findFirst({
      where: {
        id: fileId,
        userId
      }
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    res.json({
      success: true,
      data: file
    });
  } catch (error) {
    logger.error('获取文件详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取文件详情失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 下载文件
router.get('/:fileId/download', authenticate, async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user?.id;

    const file = await prisma.documents.findFirst({
      where: {
        id: fileId,
        userId
      }
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    const filePath = file.filePath ? path.join(process.cwd(), "uploads", file.filePath) : "";

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在于服务器'
      });
    }

    res.download(filePath, file.filePath ? path.basename(file.filePath) : file.id);
  } catch (error) {
    logger.error('下载文件失败:', error);
    res.status(500).json({
      success: false,
      message: '下载文件失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 删除文件
router.delete('/:fileId', authenticate, async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user?.id;

    const file = await prisma.documents.findFirst({
      where: {
        id: fileId,
        userId
      }
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    // 删除物理文件
    const filePath = file.filePath ? path.join(process.cwd(), "uploads", file.filePath) : "";
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 删除数据库记录
    await prisma.documents.delete({
      where: { id: fileId }
    });

    logger.info(`文件删除成功: ${file.filePath ? path.basename(file.filePath) : file.id}`, { userId });

    res.json({
      success: true,
      message: '文件删除成功'
    });
  } catch (error) {
    logger.error('删除文件失败:', error);
    res.status(500).json({
      success: false,
      message: '删除文件失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取文件统计
router.get('/stats/summary', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // TODO: documents 表没有 type 字段，简化统计实现
    const [totalFiles, totalSize] = await Promise.all([
      prisma.documents.count({ where: { userId } }),
      prisma.documents.aggregate({
        where: { userId },
        _sum: { fileSize: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalFiles,
        totalSize: totalSize._sum.fileSize || 0,
        filesByType: []
      }
    });
  } catch (error) {
    logger.error('获取文件统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取文件统计失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
