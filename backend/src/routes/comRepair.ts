import express from "express";
import multer from "multer";
import path from "path";
import { body, query, validationResult } from "express-validator";
import { authenticate, authorize } from "../middleware/auth";
import { ComRepairService } from "../services/comRepairService";
import { logger } from "../utils/logger";

const router = express.Router();
const comRepairService = new ComRepairService();

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/octet-stream",
      "application/x-msdownload",
      "application/xml",
      "application/javascript",
      "text/vbscript",
      "text/plain",
    ];
    const allowedExtensions = [
      ".patch",
      ".dll",
      ".exe",
      ".reg",
      ".config",
      ".js",
      ".vbs",
    ];

    const isValidType = allowedTypes.includes(file.mimetype);
    const isValidExtension = allowedExtensions.some((ext) =>
      file.originalname.toLowerCase().endsWith(ext),
    );

    if (isValidType && isValidExtension) {
      cb(null, true);
    } else {
      cb(new Error("不支持的文件类型"));
    }
  },
});

// 上传COM修复文件
router.post(
  "/upload",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      if (!req.file) {
        return res.status(400).json({ error: "请选择文件" });
      }
      const { softwareId, version, fileType = "patch", description } = req.body;

      if (!softwareId || !version) {
        return res.status(400).json({
          error: "软件ID和版本不能为空",
        });
      }
      const repairFile = await comRepairService.uploadRepairFile(
        (req as any).user.id,
        softwareId,
        {
          fileName: req.file.originalname,
          fileContent: req.file.buffer,
          fileType,
          description,
        },
      );

      res.json({
        success: true,
        message: "COM修复文件上传成功",
        data: repairFile,
      });
    } catch (error) {
      logger.error("上传COM修复文件失败:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "上传失败",
      });
    }
  },
);

// 自动生成COM修复文件
router.post(
  "/generate",
  authenticate,
  [
    body("softwareId").notEmpty().withMessage("软件ID不能为空"),
    body("version").notEmpty().withMessage("版本不能为空"),
    body("fileType")
      .optional()
      .isIn(["patch", "config", "script", "dll", "registry"]),
    body("description").optional().isString(),
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { softwareId, version, fileType = "patch", description } = req.body;

      const generatedFile = await comRepairService.generateRepairFile(
        (req as any).user.id,
        softwareId,
        { version, description }
      );

      res.json({
        success: true,
        message: "COM修复文件生成成功",
        data: generatedFile,
      });
    } catch (error) {
      logger.error("生成COM修复文件失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "生成失败",
      });
    }
  },
);

// 获取COM修复文件列表
router.get(
  "/list",
  authenticate,
  [
    query("softwareId").optional().isString(),
    query("version").optional().isString(),
    query("fileType")
      .optional()
      .isIn(["patch", "config", "script", "dll", "registry"]),
  ],
  async (req: any, res: any) => {
    try {
      const { softwareId, version, fileType } = req.query;

      const filters: any = {};
      if (softwareId) filters.softwareId = softwareId;
      if (version) filters.version = version;
      if (fileType) filters.fileType = fileType;

      const files = await comRepairService.getRepairFiles(filters);

      res.json({
        success: true,
        data: files,
      });
    } catch (error) {
      logger.error("获取COM修复文件列表失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "获取失败",
      });
    }
  },
);

// 获取COM修复文件详情
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const file = await comRepairService.getRepairFileById(id);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: "文件不存在",
      });
    }
    res.json({
      success: true,
      data: file,
    });
  } catch (error) {
    logger.error("获取COM修复文件详情失败:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "获取失败",
    });
  }
});

// 下载COM修复文件
router.get("/:id/download", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const downloadResult = await comRepairService.downloadRepairFile(id);

    if (!downloadResult) {
      return res.status(404).json({ error: "文件不存在" });
    }

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(downloadResult.fileName)}"`,
    );
    res.send(downloadResult.content);
  } catch (error) {
    logger.error("下载COM修复文件失败:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "下载失败",
    });
  }
});

// 应用COM修复文件
router.post(
  "/:id/apply",
  authenticate,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { targetPath } = req.body;

      const result = await comRepairService.applyRepairFile(id, targetPath);

      res.json({
        success: true,
        message: "COM修复文件应用成功",
        data: result,
      });
    } catch (error) {
      logger.error("应用COM修复文件失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "应用失败",
      });
    }
  },
);

// 删除COM修复文件
router.delete(
  "/:id",
  authenticate,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      await comRepairService.deleteRepairFile(id);

      res.json({
        success: true,
        message: "删除成功",
      });
    } catch (error) {
      logger.error("删除COM修复文件失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "删除失败",
      });
    }
  },
);

export default router;
