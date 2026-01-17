import { Router, Request, Response } from "express";
import { logger } from "@/utils/logger";
import { backupService } from "@/services/backupService";
import { authenticate, authorize } from "@/middleware/auth";

const router = Router();

// 所有备份相关接口都需要认证
router.use(authenticate);

// 创建备份
router.post(
  "/create",
  authorize(["users.write"]),
  async (req: Request, res: Response) => {
    try {
      const { retentionDays, includeTables, excludeTables } = req.body;

      const config = {
        retentionDays: retentionDays || 7,
        includeTables: includeTables || [],
        excludeTables: excludeTables || []
      };
      const backup = await backupService.createBackup(config);

      res.json({
        success: true,
        data: backup,
        message: "备份任务已开始",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 获取备份列表
router.get(
  "/list",
  authorize(["users.read"]),
  async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 20 } = req.query;

      const backups = await backupService.getBackupList();

      // 分页处理
      const offset = (Number(page) - 1) * Number(limit);
      const paginatedBackups = backups.slice(offset, offset + Number(limit));

      res.json({
        success: true,
        data: {
          backups: paginatedBackups,
          total: backups.length,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(backups.length / Number(limit)),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 获取备份详情
router.get(
  "/:id",
  authorize(["users.read"]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const backups = await backupService.getBackupList();
      const backup = backups.find((b: any) => b.id === id);

      if (!backup) {
        return res.status(404).json({
          success: false,
          error: "备份记录不存在",
        });
      }
      res.json({
        success: true,
        data: backup,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 验证备份
router.post(
  "/:id/validate",
  authorize(["users.write"]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const isValid = await backupService.validateBackup(id);

      res.json({
        success: true,
        data: {
          backupId: id,
          isValid,
        },
        message: isValid ? "备份验证通过" : "备份验证失败",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 测试备份恢复
router.post(
  "/:id/test-restore",
  authorize(["users.write"]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // 启动测试恢复任务（异步）
      backupService
        .testBackupRestore(id)
        .then((result: any) => {
          console.log(`备份 ${id} 测试恢复${result ? "成功" : "失败"}`);
        })
        .catch((error: any) => {
          logger.error(`备份 ${id} 测试恢复失败:`, error);
        });

      res.json({
        success: true,
        message: "测试恢复任务已启动",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 恢复备份
router.post(
  "/:id/restore",
  authorize(["users.write"]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await backupService.restoreBackup(id);

      res.json({
        success: true,
        data: result,
        message: "备份恢复成功",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 删除备份
router.delete(
  "/:id",
  authorize(["users.write"]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await backupService.deleteBackup(id);

      res.json({
        success: true,
        message: "备份删除成功",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 导出备份
router.get(
  "/:id/export",
  authorize(["users.write"]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { exportPath = `/tmp/backup_${id}.sql` } = req.body || {};

      const backupData = await backupService.exportBackup(id, exportPath);

      res.json({
        success: true,
        data: backupData,
        message: "备份导出成功",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

// 导入备份
router.post(
  "/import",
  authorize(["users.write"]),
  async (req: Request, res: Response) => {
    try {
      const { backupData } = req.body;

      const result = await backupService.importBackup(backupData);

      res.json({
        success: true,
        data: result,
        message: "备份导入成功",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  },
);

export default router;
