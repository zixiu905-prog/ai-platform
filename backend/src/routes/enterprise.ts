import { Router, Request, Response } from "express";
import { enterpriseService } from "@/services/enterpriseService";
import { authenticate, requireRole } from "@/middleware/auth";
import { logger } from "@/utils/logger";

const router = Router();

// SSO认证
router.post("/sso/auth/:providerId", async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;
    const { authCode } = req.body;

    if (!authCode) {
      return res.status(400).json({
        success: false,
        error: "缺少授权码",
      });
    }

    const result = await enterpriseService.authenticateSSO(
      providerId,
      authCode,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("SSO认证失败:", error);
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : "SSO认证失败",
    });
  }
});

// 获取SSO提供商列表
router.get("/sso/providers", async (req: Request, res: Response) => {
  try {
    const enterpriseId = (req as any).enterpriseId || 'default';
    const config = await enterpriseService.getConfig(enterpriseId);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: "企业配置不存在",
      });
    }
    const providers = config.ssoProviders.map((provider: any) => ({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      enabled: provider.enabled,
    }));

    res.json({
      success: true,
      data: providers,
    });
  } catch (error) {
    logger.error("获取SSO提供商失败:", error);
    res.status(500).json({
      success: false,
      error: "获取SSO提供商失败",
    });
  }
});

// 权限检查中间件
router.use((req: Request, res: Response, next) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "未认证",
    });
  }
  next();
});

// 检查权限
router.post("/check-permission", authenticate, async (req: Request, res: Response) => {
  try {
    const { permission, resource } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "未认证",
      });
    }

    const hasPermission = await enterpriseService.hasPermission(
      userId,
      permission,
    );

    res.json({
      success: true,
      data: { hasPermission },
    });
  } catch (error) {
    logger.error("权限检查失败:", error);
    res.status(500).json({
      success: false,
      error: "权限检查失败",
    });
  }
});

// 检查角色
router.post("/check-role", authenticate, async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "未认证",
      });
    }

    const hasRole = await enterpriseService.hasRole(userId, role);

    res.json({
      success: true,
      data: { hasRole },
    });
  } catch (error) {
    logger.error("角色检查失败:", error);
    res.status(500).json({
      success: false,
      error: "角色检查失败",
    });
  }
});

// 获取用户权限
router.get("/user-permissions", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "未认证",
      });
    }
    const user = await enterpriseService.getUser(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "用户不存在",
      });
    }

    res.json({
      success: true,
      data: {
        permissions: user.permissions,
        roles: user.roles,
      },
    });
  } catch (error) {
    logger.error("获取用户权限失败:", error);
    res.status(500).json({
      success: false,
      error: "获取用户权限失败",
    });
  }
});

// 用户管理
router.get(
  "/users",
  authenticate,
  requireRole(['SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const enterpriseId = (req as any).enterpriseId || (req.user as any)?.enterpriseId;
      if (!enterpriseId) {
        return res.status(400).json({
          success: false,
          error: "缺少企业ID",
        });
      }
      const users = await enterpriseService.getAllUsers(enterpriseId);

      // 移除敏感信息
      const safeUsers = users.map((user: any) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      res.json({
        success: true,
        data: safeUsers,
      });
    } catch (error) {
      logger.error("获取用户列表失败:", error);
      res.status(500).json({
        success: false,
        error: "获取用户列表失败",
      });
    }
  },
);

// 创建用户
router.post(
  "/users",
  authenticate,
  requireRole(['SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const userData = req.body;

      const result = await enterpriseService.createUser(userData);

      res.json({
        success: true,
        data: {
          id: result.user?.id,
          username: result.user?.username,
          email: result.user?.email,
          roles: result.user?.roles,
          isActive: result.user?.isActive,
          createdAt: result.user?.createdAt,
        },
      });
    } catch (error) {
      logger.error("创建用户失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "创建用户失败",
      });
    }
  },
);

// 更新用户
router.put(
  "/users/:userId",
  authenticate,
  requireRole(['SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const updates = req.body;

      const result = await enterpriseService.updateUser(userId, updates);

      res.json({
        success: true,
        data: {
          id: result.user?.id,
          username: result.user?.username,
          email: result.user?.email,
          roles: result.user?.roles,
          isActive: result.user?.isActive,
          updatedAt: result.user?.updatedAt,
        },
      });
    } catch (error) {
      logger.error("更新用户失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "更新用户失败",
      });
    }
  },
);

// 角色管理
router.get("/roles", authenticate, async (req: Request, res: Response) => {
  try {
    const roles = await enterpriseService.getAllRoles();

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    logger.error("获取角色列表失败:", error);
    res.status(500).json({
      success: false,
      error: "获取角色列表失败",
    });
  }
});

// 权限管理
router.get("/permissions", authenticate, async (req: Request, res: Response) => {
  try {
    const permissions = await enterpriseService.getAllPermissions();

    res.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    logger.error("获取权限列表失败:", error);
    res.status(500).json({
      success: false,
      error: "获取权限列表失败",
    });
  }
});

// 审计日志
router.get(
  "/audit-logs",
  authenticate,
  requireRole(['SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const enterpriseId = (req as any).enterpriseId || (req.user as any)?.enterpriseId;
      if (!enterpriseId) {
        return res.status(400).json({
          success: false,
          error: "缺少企业ID",
        });
      }

      const filters = {
        userId: req.query.userId as string,
        action: req.query.category as string, // category映射到action
        startDate: req.query.startDate
          ? new Date(parseInt(req.query.startDate as string))
          : undefined,
        endDate: req.query.endDate
          ? new Date(parseInt(req.query.endDate as string))
          : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
      };

      const result = await enterpriseService.getAuditLogs(enterpriseId, filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("获取审计日志失败:", error);
      res.status(500).json({
        success: false,
        error: "获取审计日志失败",
      });
    }
  },
);

// 记录审计日志
router.post(
  "/audit-logs",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const user = userId ? await enterpriseService.getUser(userId) : null;
      const auditData = {
        userId,
        username: user?.name || user?.email,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        ...req.body,
      };

      await enterpriseService.logAudit(
        userId || 'anonymous',
        req.body.action || 'CUSTOM_ACTION',
        req.path,
        auditData
      );

      res.json({
        success: true,
        message: "审计日志已记录",
      });
    } catch (error) {
      logger.error("记录审计日志失败:", error);
      res.status(500).json({
        success: false,
        error: "记录审计日志失败",
      });
    }
  },
);

// 企业配置
router.get(
  "/config",
  authenticate,
  requireRole(['SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const enterpriseId = (req as any).enterpriseId || (req.user as any)?.enterpriseId;
      if (!enterpriseId) {
        return res.status(400).json({
          success: false,
          error: "缺少企业ID",
        });
      }
      const config = await enterpriseService.getConfig(enterpriseId);

      if (!config) {
        return res.status(404).json({
          success: false,
          error: "企业配置不存在",
        });
      }

      // 移除敏感配置信息
      const safeConfig = {
        ...config,
        ssoProviders: config.ssoProviders?.map((provider: any) => ({
          id: provider.id,
          name: provider.name,
          type: provider.type,
          enabled: provider.enabled,
          config: {
            issuer: provider.config.issuer,
            domain: provider.config.domain,
            attributeMapping: provider.config.attributeMapping,
            // 不返回敏感信息如 clientSecret, privateKey 等
          },
        })) || [],
      };

      res.json({
        success: true,
        data: safeConfig,
      });
    } catch (error) {
      logger.error("获取企业配置失败:", error);
      res.status(500).json({
        success: false,
        error: "获取企业配置失败",
      });
    }
  },
);

// 更新企业配置
router.put(
  "/config",
  authenticate,
  requireRole(['SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const enterpriseId = (req as any).enterpriseId || (req.user as any)?.enterpriseId;
      const updates = req.body;

      if (!enterpriseId) {
        return res.status(400).json({
          success: false,
          error: "缺少企业ID",
        });
      }

      const result = await enterpriseService.updateConfig(enterpriseId, updates);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error || '更新企业配置失败',
        });
      }

      res.json({
        success: true,
        message: '企业配置更新成功',
      });
    } catch (error) {
      logger.error("更新企业配置失败:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "更新企业配置失败",
      });
    }
  },
);

// 密码策略
router.get("/password-policy", authenticate, async (req: Request, res: Response) => {
  try {
    const enterpriseId = (req as any).enterpriseId || (req.user as any)?.enterpriseId;
    if (!enterpriseId) {
      return res.status(400).json({
        success: false,
        error: "缺少企业ID",
      });
    }
    const config = await enterpriseService.getConfig(enterpriseId);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: "企业配置不存在",
      });
    }

    res.json({
      success: true,
      data: config.passwordPolicy,
    });
  } catch (error) {
    logger.error("获取密码策略失败:", error);
    res.status(500).json({
      success: false,
      error: "获取密码策略失败",
    });
  }
});

// 会话策略
router.get("/session-policy", authenticate, async (req: Request, res: Response) => {
  try {
    const enterpriseId = (req as any).enterpriseId || (req.user as any)?.enterpriseId;
    if (!enterpriseId) {
      return res.status(400).json({
        success: false,
        error: "缺少企业ID",
      });
    }
    const config = await enterpriseService.getConfig(enterpriseId);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: "企业配置不存在",
      });
    }

    res.json({
      success: true,
      data: config.sessionPolicy || {},
    });
  } catch (error) {
    logger.error("获取会话策略失败:", error);
    res.status(500).json({
      success: false,
      error: "获取会话策略失败",
    });
  }
});

// 健康检查
router.get("/health", async (req: Request, res: Response) => {
  try {
    const enterpriseId = (req as any).enterpriseId || 'default';
    const config = await enterpriseService.getConfig(enterpriseId);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: "企业配置不存在",
      });
    }
    const users = await enterpriseService.getAllUsers(enterpriseId);
    const roles = await enterpriseService.getAllRoles();
    const permissions = await enterpriseService.getAllPermissions();
    const stats = {
      totalUsers: users.length,
      totalRoles: roles.length,
      totalPermissions: permissions.length,
      enabledSSOProviders: config.ssoProviders.filter((p: any) => p.enabled).length,
      auditRetention: config.auditRetention,
    };

    res.json({
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "Enterprise",
        version: "1.0.0",
        stats,
      },
    });
  } catch (error) {
    logger.error("企业服务健康检查失败:", error);
    res.status(500).json({
      success: false,
      error: "企业服务健康检查失败",
    });
  }
});

export default router;
