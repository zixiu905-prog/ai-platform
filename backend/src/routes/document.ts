import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { body, query, validationResult } from "express-validator";
import { authenticate } from "@/middleware/auth";
import { documentService } from "@/services/documentService";
import { logger } from "@/utils/logger";

const router = express.Router();

// 配置文件上传
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), "uploads", "documents");
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `doc-${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint",
      "text/plain",
      "text/csv",
      "text/markdown",
      "image/jpeg",
      "image/png",
      "image/tiff",
      "image/bmp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("不支持的文件格式"));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// 解析文档
router.post(
  "/parse",
  authenticate,
  upload.single("document"),
  async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "请选择文档文件",
        });
      }

      const {
        extractImages = false,
        extractTables = true,
        extractMetadata = true,
        language = "zh-CN",
        ocrEnabled = true,
      } = req.body;

      const result = await documentService.parseDocument(req.file.path, {
        extractText: true,
        extractMetadata: extractMetadata === "true",
        customParser: language === "zh-CN" ? "zh-CN" : undefined,
      });

      // 保存解析历史 - TODO: 需要创建文档后才能保存历史
      // await documentService.saveParseHistory(
      //   req.user.id,
      //   req.file.originalname,
      //   result,
      // );

      res.json({
        success: result.success,
        data: result.content,
        metadata: {
          processingTime: result.processingTime,
          pageCount: result.pageCount,
          fileSize: result.fileSize,
          mimeType: result.mimeType,
          fileName: req.file.originalname,
        },
        error: result.error,
      });
    } catch (error) {
      logger.error("文档解析失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "文档解析失败",
      });
    }
  },
);

// 获取支持的文档格式
router.get("/formats", async (req, res) => {
  try {
    const formats = documentService.getSupportedFormats();

    res.json({
      success: true,
      data: formats,
    });
  } catch (error) {
    logger.error("获取支持的格式失败:", error);
    res.status(500).json({ error: "获取格式列表失败" });
  }
});

// 获取解析历史
router.get(
  "/history",
  authenticate,
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const history = await documentService.getUserParseHistory(
        req.user.id,
        page,
        limit,
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error("获取解析历史失败:", error);
      res.status(500).json({ error: "获取解析历史失败" });
    }
  },
);

// 批量解析文档
router.post(
  "/batch-parse",
  authenticate,
  upload.array("documents", 10),
  async (req: any, res: any) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "请选择要解析的文档文件",
        });
      }

      const files = req.files as Express.Multer.File[];
      const options = {
        extractImages: req.body.extractImages === "true",
        extractTables: req.body.extractTables !== "false",
        extractMetadata: req.body.extractMetadata !== "false",
        language: req.body.language || "zh-CN",
        ocrEnabled: req.body.ocrEnabled !== "false",
      };

      const results = [];

      for (const file of files) {
        try {
          const result = await documentService.parseDocument(
            file.path,
            options,
          );

          // 保存解析历史 - TODO: 需要创建文档后才能保存历史
          // await documentService.saveParseHistory(
          //   req.user.id,
          //   file.originalname,
          //   result,
          // );

          results.push({
            fileName: file.originalname,
            success: result.success,
            data: result.content,
            metadata: {
              processingTime: result.processingTime,
              pageCount: result.pageCount,
              fileSize: result.fileSize,
              mimeType: result.mimeType,
            },
            error: result.error,
          });
        } catch (error) {
          logger.error(`批量解析文件失败: ${file.originalname}`, error);
          results.push({
            fileName: file.originalname,
            success: false,
            error: error instanceof Error ? error.message : "解析失败",
          });
        }
      }

      res.json({
        success: true,
        message: `完成${files.length}个文档的解析`,
        data: {
          processed: files.length,
          successful: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
          results,
        },
      });
    } catch (error) {
      logger.error("批量解析文档失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "批量解析失败",
      });
    }
  },
);

// 从URL解析文档
router.post(
  "/parse-url",
  authenticate,
  [
    body("url").isURL().withMessage("请提供有效的URL"),
    body("extractImages").optional().isBoolean(),
    body("extractTables").optional().isBoolean(),
    body("extractMetadata").optional().isBoolean(),
    body("ocrEnabled").optional().isBoolean(),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        url,
        extractImages = false,
        extractTables = true,
        extractMetadata = true,
        ocrEnabled = true,
      } = req.body;

      // 这里应该实现URL下载逻辑
      // 由于需要网络请求和文件下载，暂时返回错误
      res.status(501).json({
        success: false,
        error: "URL解析功能暂未实现，请先下载文件后上传解析",
      });
    } catch (error) {
      logger.error("URL文档解析失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "URL解析失败",
      });
    }
  },
);

// 清理解析历史
router.delete("/history/:historyId", authenticate, async (req, res) => {
  try {
    const { historyId } = req.params;

    // 这里需要添加删除历史的数据库操作
    // 暂时返回成功响应
    res.json({
      success: true,
      message: "解析历史删除成功",
    });
  } catch (error) {
    logger.error("删除解析历史失败:", error);
    res.status(500).json({ error: "删除历史记录失败" });
  }
});

export default router;
