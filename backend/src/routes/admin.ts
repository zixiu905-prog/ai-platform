import express, { Request, Response } from "express";
import { prisma } from "@/config/database";
import { body, query, validationResult } from "express-validator";
import { Role } from "@prisma/client";
import { authenticate, authorize } from "@/middleware/auth";
import { createLogger } from "@/utils/logger";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();
const log = createLogger("admin");

/**
 * 安全序列化错误对象为可记录的格式
 * @param error - 未知类型的错误对象
 * @returns 序列化后的错误对象，包含结构化信息
 */
const serializeError = (error: unknown): Record<string, any> => {
  // 处理标准Error对象
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      // 包含可能的额外属性，如Prisma错误代码等
      ...(error as any),
    };
  }

  // 处理普通对象
  if (typeof error === "object" && error !== null) {
    return error as Record<string, any>;
  }

  // 处理原始类型
  return {
    value: error,
    type: typeof error,
  };
};

// 管理员认证中间件
const adminAuth = [authenticate, authorize(["ADMIN", "SUPER_ADMIN"])];

// 获取系统概览数据
router.get("/dashboard", adminAuth, async (_req: Request, res: Response) => {
  try {
    const [
      userStats,
      paidUserStats,
      subscriptionStats,
      paymentStats,
      aiUsageStats,
      systemHealth,
    ] = await Promise.all([
      // 用户统计
      prisma.users.aggregate({
        _count: { id: true },
        where: {
          isActive: true,
        },
      }),
      // 付费用户统计
      prisma.users.aggregate({
        _count: { id: true },
        where: {
          isPaid: true,
          isActive: true,
        },
      }),
      // 订阅统计
      prisma.subscriptions.groupBy({
        by: ["planType"],
        _count: { id: true },
        where: {
          isActive: true,
        },
      }),
      // 支付统计（本月）
      prisma.payments.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: new Date(new Date().setDate(1)), // 本月第一天
          },
        },
      }),
      // AI使用统计
      prisma.ai_models.aggregate({
        _sum: { totalTokens: true },
        where: {
          isActive: true,
        },
      }),
      // 系统健康检查
      prisma.system_configs.findFirst({
        where: {
          key: "system_health",
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: userStats._count.id || 0,
          paid: paidUserStats._count.id || 0,
          free: (userStats._count.id || 0) - (paidUserStats._count.id || 0),
        },
        subscriptions: subscriptionStats,
        payments: {
          monthlyRevenue: paymentStats._sum.amount || 0,
          monthlyTransactions: paymentStats._count.id || 0,
        },
        aiUsage: { totalTokens: Number(aiUsageStats._sum.totalTokens || 0) },
        systemHealth: systemHealth?.value || {},
      },
    });
  } catch (error) {
    const serializedError = serializeError(error);
    log.error("获取管理仪表板数据失败:", serializedError);
    res.status(500).json({
      error: "获取数据失败",
      timestamp: new Date().toISOString(),
      // 在开发环境中包含更多错误信息
      ...(process.env.NODE_ENV === "development" && {
        details: serializedError.message || "未知错误",
      }),
    });
  }
});

// 用户管理
router.get(
  "/users",
  adminAuth,
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("search").optional().isString(),
    query("role").optional().isIn(["USER", "ADMIN", "SUPER_ADMIN"]),
    query("isActive").optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const search = req.query.search as string;
      const role = req.query.role as Role;
      const isActive =
        req.query.isActive === "true"
          ? true
          : req.query.isActive === "false"
            ? false
            : undefined;
      const where: any = {};
      if (search) {
        where.OR = [
          { email: { contains: search, mode: "insensitive" } },
          { username: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ];
      }
      if (role) where.role = role;
      if (isActive !== undefined) where.isActive = isActive;

      const [users, total] = await Promise.all([
        prisma.users.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            email: true,
            username: true,
            avatar: true,
            phone: true,
            role: true,
            isActive: true,
            isPaid: true,
            tokenBalance: true,
            lastLoginAt: true,
            createdAt: true,
            _count: {
              select: {
                conversations: true,
                payments: true,
                subscriptions: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.users.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      log.error("获取用户列表失败:", serializeError(error));
      res.status(500).json({ error: "获取用户列表失败" });
    }
  },
);

// 更新用户状态
router.patch(
  "/users/:userId/status",
  adminAuth,
  [
    body("isActive").isBoolean(),
    body("role").optional().isIn(["USER", "ADMIN", "SUPER_ADMIN"]),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { userId } = req.params;
      const { isActive, role } = req.body;

      const user = await prisma.users.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "用户不存在" });
      }

      const updateData: any = {};
      if (isActive !== undefined) updateData.isActive = isActive;
      if (role) updateData.role = role;

      const updatedUser = await prisma.users.update({
        where: {
          id: userId,
        },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      // 记录审计日志
      await prisma.audit_logs.create({
        data: {
          id: uuidv4(),
          userId: req.user?.id,
          action: "UPDATE_USER_STATUS",
          resource: "users",
          details: {
            targetUserId: userId,
            changes: updateData,
          },
        },
      });

      res.json({
        success: true,
        message: "用户状态更新成功",
        data: updatedUser,
      });
    } catch (error) {
      log.error("更新用户状态失败:", serializeError(error));
      res.status(500).json({ error: "更新用户状态失败" });
    }
  },
);

// 订阅管理
router.get(
  "/subscriptions",
  adminAuth,
  async (_req: Request, res: Response) => {
    try {
      const subscriptions = await prisma.subscriptions.findMany({
        include: {
          users: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      res.json({
        success: true,
        data: subscriptions,
      });
    } catch (error) {
      log.error("获取订阅列表失败:", serializeError(error));
      res.status(500).json({ error: "获取订阅列表失败" });
    }
  },
);

// AI模型管理
router.get("/ai-models", adminAuth, async (_req: Request, res: Response) => {
  try {
    const aiModels = await prisma.ai_models.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: aiModels,
    });
  } catch (error) {
    log.error("获取AI模型列表失败:", serializeError(error));
    res.status(500).json({ error: "获取AI模型列表失败" });
  }
});

// 更新AI模型配置
router.patch(
  "/ai-models/:modelId",
  adminAuth,
  [
    body("isActive").isBoolean(),
    body("maxTokens").optional().isInt({ min: 1 }),
    body("costPerToken").optional().isFloat({ min: 0 }),
    body("apiKey").optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { modelId } = req.params;
      const updateData = req.body;

      const aiModel = await prisma.ai_models.update({
        where: {
          id: modelId,
        },
        data: updateData,
      });

      res.json({
        success: true,
        message: "AI模型配置更新成功",
        data: aiModel,
      });
    } catch (error) {
      log.error("更新AI模型配置失败:", serializeError(error));
      res.status(500).json({ error: "更新AI模型配置失败" });
    }
  },
);

// 系统配置管理
router.get(
  "/system-configs",
  adminAuth,
  async (_req: Request, res: Response) => {
    try {
      const configs = await prisma.system_configs.findMany({
        orderBy: { category: "asc" },
      });

      // 按分类组织配置
      const groupedConfigs = configs.reduce((acc: any, config: any) => {
        if (!acc[config.category]) {
          acc[config.category] = [];
        }
        acc[config.category].push(config);
        return acc;
      }, {});

      res.json({
        success: true,
        data: groupedConfigs,
      });
    } catch (error) {
      log.error("获取系统配置失败:", serializeError(error));
      res.status(500).json({ error: "获取系统配置失败" });
    }
  },
);

// 更新系统配置
router.patch(
  "/system-configs/:configId",
  adminAuth,
  [body("value").notEmpty()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { configId } = req.params;
      const { value } = req.body;

      const config = await prisma.system_configs.update({
        where: {
          id: configId,
        },
        data: {
          value,
          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: "系统配置更新成功",
        data: config,
      });
    } catch (error) {
      log.error("更新系统配置失败:", serializeError(error));
      res.status(500).json({ error: "更新系统配置失败" });
    }
  },
);

// 审计日志
router.get(
  "/audit-logs",
  adminAuth,
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("action").optional().isString(),
    query("userId").optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const action = req.query.action as string;
      const userId = req.query.userId as string;

      const where: any = {};
      if (action) where.action = { contains: action, mode: "insensitive" };
      if (userId) where.userId = userId;

      const [logs, total] = await Promise.all([
        prisma.audit_logs.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.audit_logs.count({ where }),
      ]);

      // 手动关联用户信息
      const userIds = logs.map((log: any) => log.userId).filter(Boolean);
      const users =
        userIds.length > 0
          ? await prisma.users.findMany({
              where: {
                id: { in: userIds as string[] },
              },
              select: { id: true, email: true, username: true },
            })
          : [];

      // 创建用户映射
      const userMap = users.reduce(
        (acc: any, user: any) => {
          acc[user.id] = user;
          return acc;
        },
        {} as Record<string, (typeof users)[0]>,
      );

      // 合并用户信息到日志
      const logsWithUsers = logs.map((log: any) => ({
        ...log,
        users: log.userId ? userMap[log.userId] : null,
      }));

      res.json({
        success: true,
        data: {
          logs: logsWithUsers,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      log.error("获取审计日志失败:", serializeError(error));
      res.status(500).json({ error: "获取审计日志失败" });
    }
  },
);

// 财务报表
router.get(
  "/financial-report",
  adminAuth,
  [query("startDate").isISO8601(), query("endDate").isISO8601()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { startDate, endDate } = req.query;

      const [revenueData, paymentData, subscriptionData] = await Promise.all([
        // 收入统计
        prisma.payments.aggregate({
          _sum: { amount: true },
          _count: { id: true },
          where: {
            status: "COMPLETED",
            createdAt: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string),
            },
          },
        }),
        // 支付明细
        prisma.payments.findMany({
          where: {
            createdAt: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string),
            },
          },
          include: {
            users: {
              select: {
                id: true,
                email: true,
                username: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        // 订阅统计
        prisma.subscriptions.groupBy({
          by: ["planType"],
          _count: { id: true },
          _sum: { price: true },
          where: {
            isActive: true,
            createdAt: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string),
            },
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          revenue: revenueData,
          payments: paymentData,
          subscriptions: subscriptionData,
        },
      });
    } catch (error) {
      log.error("获取财务报表失败:", serializeError(error));
      res.status(500).json({ error: "获取财务报表失败" });
    }
  },
);

export default router;
