import express, { Request, Response } from "express";
import { prisma } from "../config/database";
import { body, query, validationResult } from "express-validator";
import { authenticate, authorize } from "../middleware/auth";
import { logger } from "../utils/logger";
import PaymentReminderService from "../services/paymentReminderService";
import { randomUUID } from "crypto";

const router = express.Router();

// 管理员认证中间件
const adminAuth = [authenticate, authorize(["ADMIN", "SUPER_ADMIN"])];

/**
 * 获取所有功能开关状态
 */
router.get("/features", adminAuth, async (_req: Request, res: Response) => {
  try {
    const features = await prisma.system_feature.findMany({
      orderBy: { category: "asc" },
    });

    const groupedFeatures = features.reduce(
      (acc, feature) => {
        if (!acc[feature.category]) {
          acc[feature.category] = [];
        }

        acc[feature.category].push({
          id: feature.id,
          name: feature.name,
          key: feature.code,
          description: feature.description,
          enabled: feature.isEnabled,
          isPaidOnly: feature.isPaidOnly,
          requiresSubscription: feature.requiresSubscription,
          settings: feature.settings ? JSON.parse(feature.settings) : {},
        });
        return acc;
      },
      {} as Record<string, any[]>,
    );

    res.json({
      success: true,
      data: groupedFeatures,
    });
  } catch (error) {
    logger.error("获取功能开关失败:", error);
    res.status(500).json({
      success: false,
      message: "获取功能开关失败",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 更新功能开关状态
 */
router.put(
  "/features/:featureId/toggle",
  adminAuth,
  [body("enabled").isBoolean().withMessage("enabled 必须是布尔值")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "参数验证失败",
          errors: errors.array(),
        });
      }

      const { featureId } = req.params;
      const { enabled } = req.body;

      // 检查功能是否存在
      const feature = await prisma.system_feature.findUnique({
        where: {
          id: featureId,
        },
      });

      if (!feature) {
        return res.status(404).json({
          success: false,
          message: "功能不存在",
          timestamp: new Date().toISOString(),
        });
      }

      // 更新功能状态
      const updatedFeature = await prisma.system_feature.update({
        where: {
          id: featureId,
        },
        data: {
          isEnabled: enabled,
          updatedAt: new Date(),
        },
      });

      // 记录操作日志
      await prisma.admin_operation_log.create({
        data: {
          id: randomUUID(),
          adminId: req.user!.id,
          action: "TOGGLE_FEATURE",
          target: feature.code,
          details: { oldValue: { isEnabled: feature.isEnabled }, newValue: { isEnabled: enabled } },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          createdAt: new Date()
        },
      });

      logger.info(
        `管理员 ${req.user!.email} ${enabled ? "开启" : "关闭"}了功能: ${feature.name}`,
      );
      res.json({
        success: true,
        message: `功能已${enabled ? "开启" : "关闭"}`,
        data: {
          id: updatedFeature.id,
          name: updatedFeature.name,
          code: updatedFeature.code,
          isEnabled: updatedFeature.isEnabled,
        },
      });
    } catch (error) {
      logger.error("更新功能开关失败:", error);
      res.status(500).json({
        success: false,
        message: "更新功能开关失败",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 更新功能设置
 */
router.put(
  "/features/:featureId/settings",
  adminAuth,
  [body("settings").isObject().withMessage("settings 必须是对象")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "参数验证失败",
          errors: errors.array(),
        });
      }

      const { featureId } = req.params;
      const { settings } = req.body;

      // 检查功能是否存在
      const feature = await prisma.system_feature.findUnique({
        where: {
          id: featureId,
        },
      });

      if (!feature) {
        return res.status(404).json({
          success: false,
          message: "功能不存在",
          timestamp: new Date().toISOString(),
        });
      }

      // 验证设置格式
      const validatedSettings = validateFeatureSettings(feature.code, settings);
      if (!validatedSettings.valid) {
        return res.status(400).json({
          success: false,
          message: validatedSettings.message,
          timestamp: new Date().toISOString(),
        });
      }

      // 更新功能设置
      const updatedFeature = await prisma.system_feature.update({
        where: {
          id: featureId,
        },
        data: {
          settings: JSON.stringify(settings),
          updatedAt: new Date(),
        },
      });

      // 记录操作日志
      await prisma.admin_operation_log.create({
        data: {
          id: randomUUID(),
          adminId: req.user!.id,
          action: "UPDATE_FEATURE_SETTINGS",
          target: feature.code,
          details: { oldValue: feature.settings, newValue: JSON.stringify(settings) },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          createdAt: new Date()
        },
      });

      logger.info(`管理员 ${req.user!.email} 更新了功能设置: ${feature.name}`);
      res.json({
        success: true,
        message: "功能设置已更新",
        data: {
          id: updatedFeature.id,
          name: updatedFeature.name,
          code: updatedFeature.code,
          settings: JSON.parse(updatedFeature.settings as string || "{}"),
        },
      });
    } catch (error) {
      logger.error("更新功能设置失败:", error);
      res.status(500).json({
        success: false,
        message: "更新功能设置失败",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 获取付费功能配置
 */
router.get(
  "/paid-features",
  adminAuth,
  async (_req: Request, res: Response) => {
    try {
      const paidFeatures = await prisma.system_feature.findMany({
        where: {
          isPaidOnly: true,
        },
      });

      const result = paidFeatures.map((feature) => ({
        id: feature.id,
        name: feature.name,
        key: feature.code,
        description: feature.description,
        enabled: feature.isEnabled,
        requiresSubscription: feature.requiresSubscription,
        settings: feature.settings ? JSON.parse(feature.settings) : {},
      }));

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("获取付费功能配置失败:", error);
      res.status(500).json({
        success: false,
        message: "获取付费功能配置失败",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 更新付费功能状态
 */
router.put(
  "/paid-features/:featureId",
  adminAuth,
  [
    body("enabled").isBoolean().withMessage("enabled 必须是布尔值"),
    body("requiresSubscription")
      .optional()
      .isBoolean()
      .withMessage("requiresSubscription 必须是布尔值"),
    body("pricing").optional().isObject().withMessage("pricing 必须是对象"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "参数验证失败",
          errors: errors.array(),
        });
      }

      const { featureId } = req.params;
      const { enabled, requiresSubscription, pricing } = req.body;

      // 检查功能是否存在
      const feature = await prisma.system_feature.findUnique({
        where: {
          id: featureId,
        },
      });

      if (!feature) {
        return res.status(404).json({
          success: false,
          message: "功能不存在",
          timestamp: new Date().toISOString(),
        });
      }

      // 如果不是付费功能，不允许修改
      if (!feature.isPaidOnly) {
        return res.status(400).json({
          success: false,
          message: "只能修改付费功能的配置",
          timestamp: new Date().toISOString(),
        });
      }

      // 准备更新数据
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (enabled !== undefined) {
        updateData.isEnabled = enabled;
      }

      if (requiresSubscription !== undefined) {
        updateData.requiresSubscription = requiresSubscription;
      }

      if (pricing !== undefined) {
        updateData.pricing = JSON.stringify(pricing);
      }

      // 更新功能
      const updatedFeature = await prisma.system_feature.update({
        where: {
          id: featureId,
        },
        data: updateData,
      });

      // 记录操作日志
      await prisma.admin_operation_log.create({
        data: {
          id: randomUUID(),
          adminId: req.user!.id,
          action: "UPDATE_PAID_FEATURE",
          target: feature.code,
          details: { oldValue: { isEnabled: feature.isEnabled, requiresSubscription: feature.requiresSubscription }, newValue: updateData },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          createdAt: new Date()
        },
      });

      logger.info(`管理员 ${req.user!.email} 更新了付费功能: ${feature.name}`);
      res.json({
        success: true,
        message: "付费功能配置已更新",
        data: {
          id: updatedFeature.id,
          name: updatedFeature.name,
          code: updatedFeature.code,
          isEnabled: updatedFeature.isEnabled,
          requiresSubscription: updatedFeature.requiresSubscription,
        },
      });
    } catch (error) {
      logger.error("更新付费功能配置失败:", error);
      res.status(500).json({
        success: false,
        message: "更新付费功能配置失败",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 获取用户功能访问权限
 */
router.get(
  "/users/:userId/features",
  adminAuth,
  [
    query("status")
      .optional()
      .isIn(["active", "expired", "all"])
      .withMessage("status 参数无效"),
  ],
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { status = "all" } = req.query;

      // 检查用户是否存在
      const user = await prisma.users.findUnique({
        where: {
          id: userId,
        },
        include: {
          subscriptions: {
            where: {
              isActive: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "用户不存在",
          timestamp: new Date().toISOString(),
        });
      }

      // 构建查询条件
      const whereClause: any = {
        userId,
      };

      if (status !== "all") {
        if (status === "active") {
          whereClause.expiresAt = { gt: new Date() };
        } else if (status === "expired") {
          whereClause.expiresAt = { lt: new Date() };
        }
      }

      // 获取用户的功能访问权限
      const userFeatures = await prisma.user_feature_access.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
      });

      const result = userFeatures.map((access) => ({
        id: access.id,
        featureCode: access.featureCode,
        isEnabled: access.isEnabled,
        grantedAt: access.createdAt,
        expiresAt: access.expiresAt,
        status: access.expiresAt && access.expiresAt > new Date() ? "active" : "expired",
      }));

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            subscriptionLevel: user.subscriptions[0]?.planType || "FREE",
          },
          features: result,
        },
      });
    } catch (error) {
      logger.error("获取用户功能权限失败:", error);
      res.status(500).json({
        success: false,
        message: "获取用户功能权限失败",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 授予用户功能访问权限
 */
router.post(
  "/users/:userId/features/:featureId/grant",
  adminAuth,
  [
    body("accessType")
      .isIn(["TRIAL", "PAID", "COMP", "ADMIN_GRANT"])
      .withMessage("accessType 参数无效"),
    body("duration")
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage("duration 必须是 1-365 天"),
    body("reason").optional().isString().withMessage("reason 必须是字符串"),
    body("expiresAt").optional().isISO8601().withMessage("expiresAt 格式无效"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "参数验证失败",
          errors: errors.array(),
        });
      }

      const { userId, featureId } = req.params;
      const { accessType, duration, reason, expiresAt } = req.body;

      // 检查用户是否存在
      const user = await prisma.users.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "用户不存在",
          timestamp: new Date().toISOString(),
        });
      }

      // 检查功能是否存在
      const feature = await prisma.system_feature.findUnique({
        where: {
          id: featureId,
        },
      });

      if (!feature) {
        return res.status(404).json({
          success: false,
          message: "功能不存在",
          timestamp: new Date().toISOString(),
        });
      }

      // 检查用户是否已有该功能权限
      const existingAccess = await prisma.user_feature_access.findFirst({
        where: {
          userId,
          featureId,
          expiresAt: { gt: new Date() },
        },
      });

      if (existingAccess) {
        return res.status(400).json({
          success: false,
          message: "用户已拥有该功能的访问权限",
          timestamp: new Date().toISOString(),
        });
      }

      // 计算到期时间
      let finalExpiresAt: Date;
      if (expiresAt) {
        finalExpiresAt = new Date(expiresAt);
      } else if (duration) {
        finalExpiresAt = new Date();
        finalExpiresAt.setDate(finalExpiresAt.getDate() + duration);
      } else {
        finalExpiresAt = new Date();
        finalExpiresAt.setFullYear(finalExpiresAt.getFullYear() + 1); // 默认1年
      }

      // 创建功能访问权限
      const userFeatureAccess = await prisma.user_feature_access.create({
        data: {
          userId,
          featureId,
          accessType,
          createdAt: new Date(),
          expiresAt: finalExpiresAt,
          grantedBy: req.user!.id,
        },
      });

      // 记录操作日志
      await prisma.admin_operation_log.create({
        data: {
          id: randomUUID(),
          adminId: req.user!.id,
          action: "GRANT_FEATURE_ACCESS",
          target: `${user.email}:${feature.code}`,
          details: { oldValue: null,
          newValue: {
            accessType,
            expiresAt: finalExpiresAt,
            reason,
          } },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          createdAt: new Date()
        },
      });

      logger.info(
        `管理员 ${req.user!.email} 向用户 ${user.email} 授予了功能: ${feature.name}`,
      );
      res.json({
        success: true,
        message: "功能访问权限已授予",
        data: {
          id: userFeatureAccess.id,
          userId,
          featureCode: feature.code,
          featureName: feature.name,
          accessType,
          expiresAt: finalExpiresAt,
        },
      });
    } catch (error) {
      logger.error("授予功能访问权限失败:", error);
      res.status(500).json({
        success: false,
        message: "授予功能访问权限失败",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 撤销用户功能访问权限
 */
router.delete(
  "/users/:userId/features/:featureId/revoke",
  adminAuth,
  [body("reason").optional().isString().withMessage("reason 必须是字符串")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "参数验证失败",
          errors: errors.array(),
        });
      }

      const { userId, featureId } = req.params;
      const { reason } = req.body;

      // 检查用户是否存在
      const user = await prisma.users.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "用户不存在",
          timestamp: new Date().toISOString(),
        });
      }

      // 检查功能是否存在
      const feature = await prisma.system_feature.findUnique({
        where: {
          id: featureId,
        },
      });

      if (!feature) {
        return res.status(404).json({
          success: false,
          message: "功能不存在",
          timestamp: new Date().toISOString(),
        });
      }

      // 查找用户的访问权限
      const userFeatureAccess = await prisma.user_feature_access.findFirst({
        where: {
          userId,
          featureId,
        },
      });

      if (!userFeatureAccess) {
        return res.status(404).json({
          success: false,
          message: "用户没有该功能的访问权限",
          timestamp: new Date().toISOString(),
        });
      }

      // 立即撤销（设置过期时间为当前时间）
      const revokedAccess = await prisma.user_feature_access.update({
        where: {
          id: userFeatureAccess.id,
        },
        data: {
          expiresAt: new Date(),
          revokedBy: req.user!.id,
          revokedAt: new Date(),
        },
      });

      // 记录操作日志
      await prisma.admin_operation_log.create({
        data: {
          id: randomUUID(),
          adminId: req.user!.id,
          action: "REVOKE_FEATURE_ACCESS",
          target: `${user.email}:${feature.code}`,
          details: { oldValue: {
            accessType: userFeatureAccess.accessType,
            expiresAt: userFeatureAccess.expiresAt,
          },
          newValue: {
            revokedAt: new Date(),
            reason,
          } },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          createdAt: new Date()
        },
      });

      logger.info(
        `管理员 ${req.user!.email} 撤销了用户 ${user.email} 的功能: ${feature.name}`,
      );
      res.json({
        success: true,
        message: "功能访问权限已撤销",
        data: {
          userId,
          featureId,
          featureName: feature.name,
          revokedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error("撤销功能访问权限失败:", error);
      res.status(500).json({
        success: false,
        message: "撤销功能访问权限失败",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * 验证功能设置
 */
function validateFeatureSettings(
  featureKey: string,
  settings: any,
): { valid: boolean; message?: string } {
  try {
    switch (featureKey) {
      case "ai_chat": // AI聊天功能设置验证
        if (settings.maxMessagesPerDay !== undefined) {
          if (
            typeof settings.maxMessagesPerDay !== "number" ||
            settings.maxMessagesPerDay < 1
          ) {
            return {
              valid: false,
              message: "maxMessagesPerDay 必须是大于0的数字",
            };
          }
        }

        if (settings.maxTokensPerMessage !== undefined) {
          if (
            typeof settings.maxTokensPerMessage !== "number" ||
            settings.maxTokensPerMessage < 1
          ) {
            return {
              valid: false,
              message: "maxTokensPerMessage 必须是大于0的数字",
            };
          }
        }
        break;

      case "workflow": // 工作流功能设置验证
        if (settings.maxWorkflows !== undefined) {
          if (
            typeof settings.maxWorkflows !== "number" ||
            settings.maxWorkflows < 0
          ) {
            return { valid: false, message: "maxWorkflows 必须是非负数" };
          }
        }

        if (settings.maxNodesPerWorkflow !== undefined) {
          if (
            typeof settings.maxNodesPerWorkflow !== "number" ||
            settings.maxNodesPerWorkflow < 1
          ) {
            return {
              valid: false,
              message: "maxNodesPerWorkflow 必须是大于0的数字",
            };
          }
        }
        break;

      case "script_execution": // 脚本执行功能设置验证
        if (settings.maxScriptsPerDay !== undefined) {
          if (
            typeof settings.maxScriptsPerDay !== "number" ||
            settings.maxScriptsPerDay < 0
          ) {
            return { valid: false, message: "maxScriptsPerDay 必须是非负数" };
          }
        }

        if (settings.allowedLanguages !== undefined) {
          if (!Array.isArray(settings.allowedLanguages)) {
            return { valid: false, message: "allowedLanguages 必须是数组" };
          }
        }
        break;

      case "file_storage": // 文件存储功能设置验证
        if (settings.maxFileSize !== undefined) {
          if (
            typeof settings.maxFileSize !== "number" ||
            settings.maxFileSize < 1
          ) {
            return {
              valid: false,
              message: "maxFileSize 必须是大于0的数字（字节）",
            };
          }
        }

        if (settings.maxStorageSize !== undefined) {
          if (
            typeof settings.maxStorageSize !== "number" ||
            settings.maxStorageSize < 1
          ) {
            return {
              valid: false,
              message: "maxStorageSize 必须是大于0的数字（字节）",
            };
          }
        }
        break;

      case "export_import": // 导入导出功能设置验证
        if (settings.maxExportSize !== undefined) {
          if (
            typeof settings.maxExportSize !== "number" ||
            settings.maxExportSize < 1
          ) {
            return { valid: false, message: "maxExportSize 必须是大于0的数字" };
          }
        }
        break;

      default: // 对于未知功能，只验证基本结构
        if (typeof settings !== "object" || settings === null) {
          return { valid: false, message: "设置必须是对象" };
        }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, message: "设置验证失败" };
  }
}

export default router;
