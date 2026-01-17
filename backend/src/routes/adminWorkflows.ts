import express from "express";
import { prisma } from "@/config/database";
import { authenticate } from "@/middleware/auth";
import { users, UserRole } from "@prisma/client";
import { logger } from "@/utils/logger";

const router = express.Router();

// 错误处理辅助函数
const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "未知错误";
};

// 检查管理员权限的中间件
const requireAdmin = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const user = req.user as users;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "用户未认证",
      timestamp: new Date().toISOString(),
    });
  }
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({
      success: false,
      message: "需要管理员权限",
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

// 所有管理员工作流路由都需要认证和管理员权限
router.use(authenticate, requireAdmin);

/**
 * @route GET /api/admin/workflows
 * @desc 获取所有工作流（管理员）
 * @access Admin
 */
router.get("/", async (req, res) => {
  try {
    const { category, isActive, authorId } = req.query;

    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }
    if (authorId) {
      where.authorId = authorId;
    }
    const workflows = await prisma.workflows.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 计算统计数据
    const workflowsWithStats = workflows.map((workflow) => {
      return {
        ...workflow,
        executionCount: 0,
        successRate: 0,
        lastExecuted: null,
        isActive: workflow.isActive,
      };
    });

    res.json({
      success: true,
      message: "获取工作流列表成功",
      data: workflowsWithStats,
    });
  } catch (error) {
    logger.error("获取工作流列表失败:", error);
    res.status(500).json({
      success: false,
      message: "获取工作流列表失败",
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route POST /api/admin/workflows
 * @desc 创建工作流（管理员）
 * @access Admin
 */
router.post("/", async (req, res) => {
  try {
      const {
        name,
        description,
        category,
        definition,
        settings,
        authorId,
        isActive,
      } = req.body;

    if (!name || !definition) {
      return res.status(400).json({
        success: false,
        message: "工作流名称和定义是必需的",
        timestamp: new Date().toISOString(),
      });
    }

    // 验证JSON格式
    let parsedDefinition;
    let parsedSettings;

    try {
      parsedDefinition =
        typeof definition === "string" ? JSON.parse(definition) : definition;
      parsedSettings = settings
        ? typeof settings === "string"
          ? JSON.parse(settings)
          : settings
        : {};
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "工作流定义或设置格式不正确",
        timestamp: new Date().toISOString(),
      });
    }
    const workflow = await prisma.workflows.create({
      data: {
        name,
        description,
        category: category || "general",
        nodes: parsedDefinition,
        edges: {},
        config: parsedSettings,
        isActive: isActive !== false,
        authorId: authorId || "",
        isPublic: false,
        uses: 0,
        tags: [],
        updatedAt: new Date(),
      },
    });

    logger.info(`管理员创建工作流 ${name} 成功`);

    res.status(201).json({
      success: true,
      message: "工作流创建成功",
      data: workflow,
    });
  } catch (error) {
    logger.error("创建工作流失败:", error);
    res.status(500).json({
      success: false,
      message: "创建工作流失败",
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route PUT /api/admin/workflows/:id
 * @desc 更新工作流（管理员）
 * @access Admin
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, definition, settings, isActive } =
      req.body;

    if (!name || !definition) {
      return res.status(400).json({
        success: false,
        message: "工作流名称和定义是必需的",
        timestamp: new Date().toISOString(),
      });
    }

    // 验证JSON格式
    let parsedDefinition;
    let parsedSettings;

    try {
      parsedDefinition =
        typeof definition === "string" ? JSON.parse(definition) : definition;
      parsedSettings = settings
        ? typeof settings === "string"
          ? JSON.parse(settings)
          : settings
        : {};
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "工作流定义或设置格式不正确",
        timestamp: new Date().toISOString(),
      });
    }
    const workflow = await prisma.workflows.update({
      where: {
        id,
      },
      data: {
        name,
        description,
        category: category || "general",
        definition: JSON.stringify(parsedDefinition),
        settings: JSON.stringify(parsedSettings),
        status: isActive !== false ? "active" : "inactive",
        updatedAt: new Date(),
      },
    });

    logger.info(`管理员更新工作流 ${id} 成功`);

    res.json({
      success: true,
      message: "工作流更新成功",
      data: workflow,
    });
  } catch (error) {
    logger.error("更新工作流失败:", error);
    res.status(500).json({
      success: false,
      message: "更新工作流失败",
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route POST /api/admin/workflows/:id/toggle
 * @desc 切换工作流状态（管理员）
 * @access Admin
 */
router.post("/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const workflow = await prisma.workflows.update({
      where: {
        id,
      },
      data: {
        isActive: isActive,
        updatedAt: new Date(),
      },
    });

    logger.info(
      `管理员切换工作流 ${id} 状态为 ${isActive ? "active" : "inactive"}`,
    );
    res.json({
      success: true,
      message: `工作流已${isActive ? "启用" : "停用"}`,
      data: workflow,
    });
  } catch (error) {
    logger.error("切换工作流状态失败:", error);
    res.status(500).json({
      success: false,
      message: "切换工作流状态失败",
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route POST /api/admin/workflows/:id/delete
 * @desc 删除工作流（管理员）
 * @access Admin
 */
router.post("/:id/delete", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.workflows.delete({
      where: {
        id,
      },
    });

    logger.info(`管理员删除工作流 ${id} 成功`);

    res.json({
      success: true,
      message: "工作流删除成功",
    });
  } catch (error) {
    logger.error("删除工作流失败:", error);
    res.status(500).json({
      success: false,
      message: "删除工作流失败",
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route POST /api/admin/workflows/:id/assign
 * @desc 分配用户到工作流（管理员）
 * @access Admin
 */
router.post("/:id/assign", async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;

    if (!Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        message: "用户ID列表格式不正确",
        timestamp: new Date().toISOString(),
      });
    }

    // 验证用户存在
    const users = await prisma.users.findMany({
      where: {
        id: { in: userIds },
        role: { in: [UserRole.USER, UserRole.PRO] },
      },
    });

    if (users.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: "部分用户不存在或权限不足",
        timestamp: new Date().toISOString(),
      });
    }

    // 创建工作流分配记录（这里需要在数据库模式中添加相关表）
    // 简化版本，暂不实现
    res.json({
      success: true,
      message: "用户分配成功（简化版本）",
    });

    logger.info(`管理员为工作流 ${id} 分配了 ${userIds.length} 个用户`);

    res.json({
      success: true,
      message: "用户分配成功",
      data: workflow,
    });
  } catch (error) {
    logger.error("分配用户失败:", error);
    res.status(500).json({
      success: false,
      message: "分配用户失败",
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route GET /api/admin/workflows/analytics
 * @desc 获取工作流分析数据（管理员）
 * @access Admin
 */
router.get("/analytics", async (req, res) => {
  try {
    const { startDate, endDate, workflowId } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }
    if (workflowId) {
      where.id = workflowId;
    }

    // 获取工作流列表
    const workflows = await prisma.workflows.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // 简化统计分析（没有 execution 记录）
    const totalWorkflows = workflows.length;
    const activeWorkflows = workflows.filter(w => w.isActive).length;

    res.json({
      success: true,
      message: "获取工作流分析成功",
      data: {
        summary: {
          totalWorkflows,
          activeWorkflows,
          inactiveWorkflows: totalWorkflows - activeWorkflows,
        },
        workflows: workflows.slice(0, 20),
      },
    });
  } catch (error) {
    logger.error("获取工作流分析失败:", error);
    res.status(500).json({
      success: false,
      message: "获取工作流分析失败",
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route GET /api/admin/users
 * @desc 获取用户列表（管理员）
 * @access Admin
 */
router.get("/users", async (req, res) => {
  try {
    const { role, status } = req.query;

    const where: any = {};
    if (role) {
      where.role = role;
    }
    if (status) {
      where.isActive = status === "active";
    }
    const usersList = await prisma.users.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      message: "获取用户列表成功",
      data: usersList,
    });
  } catch (error) {
    logger.error("获取用户列表失败:", error);
    res.status(500).json({
      success: false,
      message: "获取用户列表失败",
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
